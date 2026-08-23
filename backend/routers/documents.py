"""
Document Generation Router
===========================
Architecture: DOCX Template Engine — NO HTML rendering.

POST /api/documents/generate
  → Validates template
  → Calls docx_engine.render_docx_template()
  → Optionally converts to PDF via LibreOffice
  → Returns FileResponse (docx or pdf)

POST /api/documents/draft          — Save data draft (no generation)
PUT  /api/documents/{tracking_id}  — Update draft
GET  /api/documents/               — List user documents
GET  /api/documents/{tracking_id}  — Get single document
GET  /api/documents/{tracking_id}/download — Download generated file
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from typing import Optional
import json
import uuid
import os
import tempfile
import threading
import time
import random
import shutil
from datetime import datetime, timezone

from backend import models, database
from backend.routers.auth import get_current_user
from pydantic import BaseModel

active_render_jobs = set()
active_render_lock = threading.Lock()
from backend.services.docx_engine import (
    render_docx_template,
    convert_docx_to_pdf,
    libreoffice_available,
    LIBREOFFICE_PATH,
    LIBREOFFICE_AVAILABLE,
    DOCX2PDF_AVAILABLE,
    PDF_ENGINE_AVAILABLE,
)
from backend.services.template_service import template_service
from backend.core.config import settings
import logging

logger = logging.getLogger("backend.documents")

router = APIRouter(prefix="/documents", tags=["documents"])


# ─── Schemas ─────────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    template_id: str
    data: dict
    format: str = "docx"   # "docx" or "pdf"
    tracking_id: Optional[str] = None  # Optional: associate with saved draft


class PreviewRequest(BaseModel):
    template_id: str
    data: dict


# ─── Generate Endpoint (Core Engine) ─────────────────────────────────────────

def cleanup_temp_file(path: str):
    try:
        if os.path.exists(path):
            logger.info(f"🧹 CLEANING TEMP FILES: {path}")
            os.remove(path)
    except Exception as e:
        logger.error(f"Failed to delete temp file {path}: {e}")


def _safe_remove(path: str, retries: int = 5, delay: float = 0.5) -> bool:
    """
    Delete a file with retry-backoff to handle Windows file lock latency
    (e.g. Word COM holds an exclusive lock briefly after Quit() returns).
    Returns True if deleted, False if all retries failed.
    """
    for attempt in range(retries):
        try:
            if not os.path.exists(path):
                return True  # Already gone
            os.remove(path)
            return True
        except PermissionError:
            if attempt < retries - 1:
                logger.debug(f"[safe_remove] File locked, retry {attempt + 1}/{retries}: {path}")
                time.sleep(delay * (attempt + 1))  # 0.5s, 1.0s, 1.5s ...
            else:
                logger.warning(f"[safe_remove] Could not delete after {retries} attempts: {path}")
                return False
        except Exception as e:
            logger.warning(f"[safe_remove] Unexpected error deleting {path}: {e}")
            return False
    return False


def validate_generation_data(db_template: models.DBTemplate, data: dict):
    """
    Validate that all required fields in the template are present and not blank.
    If a template has no required metadata (required key is missing/not false),
    treat all variables as required=true (backward compatibility).
    """
    try:
        fields_config = json.loads(db_template.fields_json) if db_template.fields_json else {}
    except Exception:
        fields_config = {}

    try:
        variables = json.loads(db_template.field_order_json) if db_template.field_order_json else []
    except Exception:
        variables = []

    input_vars = []
    groups = {}
    if isinstance(variables, dict):
        input_vars = variables.get("single_variables", [])
        groups = variables.get("groups", {})
    elif isinstance(variables, list):
        current_group = None
        for v in variables:
            if v.startswith('#'):
                current_group = v[1:]
                groups[current_group] = []
            elif v.startswith('/'):
                current_group = None
            else:
                if current_group:
                    groups[current_group].append(v)
                else:
                    input_vars.append(v)

    if not input_vars and not groups:
        input_vars = list(fields_config.keys())

    # Validate single variables
    for var in input_vars:
        field_cfg = fields_config.get(var, {})
        is_required = field_cfg.get("required") != False
        if is_required:
            val = data.get(var)
            if val is None or str(val).strip() == "":
                raise HTTPException(
                    status_code=400,
                    detail=f"Required field '{var}' is missing or blank."
                )

    # Validate loop group variables
    for group_name, group_fields in groups.items():
        group_data = data.get(group_name)
        if group_data and isinstance(group_data, list):
            for idx, row in enumerate(group_data):
                for var in group_fields:
                    field_cfg = fields_config.get(var, {})
                    is_required = field_cfg.get("required") != False
                    if is_required:
                        val = row.get(var)
                        if val is None or str(val).strip() == "":
                            raise HTTPException(
                                status_code=400,
                                detail=f"Required field '{var}' in list '{group_name}' at row {idx + 1} is missing or blank."
                            )


@router.post("/generate")
async def generate_document(
    req: GenerateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Core document generation endpoint.
    Renders a DOCX template with user-supplied variable data.
    Optionally converts to PDF using LibreOffice.

    This endpoint does NOT use HTML rendering. The DOCX template IS the layout.
    """
    logger.info(
        f"📄 GENERATE REQUEST: template={req.template_id}, format={req.format}, "
        f"user={current_user.username}, vars={list(req.data.keys())}"
    )
    # AUDIT LOGGING
    for audit_key in ['HEIRS', 'MEMBERS', 'FAMILY_MEMBERS', 'family_members']:
        if audit_key in req.data:
            logger.info(f"AUDIT RAW DATA [{audit_key}]: {json.dumps(req.data[audit_key], indent=2)}")

    # 0. Cache check for finalized document
    if req.tracking_id:
        doc = db.query(models.DocumentSubmission).filter(
            models.DocumentSubmission.tracking_id == req.tracking_id
        ).first()
        if doc and doc.is_locked:
            if req.format.lower() == "pdf" and doc.final_pdf_path and os.path.exists(doc.final_pdf_path):
                logger.info(f"✨ PDF Cache HIT for {req.tracking_id} in /generate")
                return FileResponse(
                    path=doc.final_pdf_path,
                    filename=f"{req.tracking_id}.pdf",
                    media_type="application/pdf",
                    headers={"X-Tracking-ID": req.tracking_id}
                )
            elif req.format.lower() == "docx" and doc.final_docx_path and os.path.exists(doc.final_docx_path):
                logger.info(f"✨ DOCX Cache HIT for {req.tracking_id} in /generate")
                return FileResponse(
                    path=doc.final_docx_path,
                    filename=f"{req.tracking_id}.docx",
                    media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    headers={"X-Tracking-ID": req.tracking_id}
                )

    # 1. Fetch template
    db_template = db.query(models.DBTemplate).filter(
        models.DBTemplate.template_id == req.template_id,
        models.DBTemplate.is_active == True
    ).first()

    if not db_template:
        raise HTTPException(status_code=404, detail=f"Template '{req.template_id}' not found")

    if not db_template.file_path:
        raise HTTPException(
            status_code=422,
            detail="This template has no DOCX file attached. "
                   "Please upload a .docx template file in the Admin Panel."
        )

    # 1.5 Validate fields against template requirements
    validate_generation_data(db_template, req.data)

    # 2. Resolve template file path
    template_path = template_service.get_full_path(db_template.file_path)
    if not template_path or not os.path.exists(template_path):
        raise HTTPException(
            status_code=404,
            detail=f"Template file not found on disk: {db_template.file_path}"
        )

    # 3. Prepare output paths in temp_renders workspace with unique filenames
    gen_id = req.tracking_id or f"GEN-{uuid.uuid4().hex[:8].upper()}"
    temp_renders_dir = settings.TEMP_RENDERS_DIR
    os.makedirs(temp_renders_dir, exist_ok=True)
    
    safe_suffix = f"{int(time.time())}_{uuid.uuid4().hex[:6]}"
    unique_name = f"{gen_id}_{safe_suffix}"
    docx_output = os.path.join(temp_renders_dir, f"{unique_name}.docx")

    # 4. Render DOCX
    try:
        rendered_path = render_docx_template(
            template_path=template_path,
            data=req.data,
            output_path=docx_output,
            tracking_id=gen_id,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Render failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Document rendering failed: {str(e)}"
        )

    # 5. PDF conversion (optional)
    if req.format.lower() == "pdf":
        if not libreoffice_available():
            logger.warning("PDF requested but no engine installed")
            background_tasks.add_task(cleanup_temp_file, rendered_path)
            raise HTTPException(
                status_code=503,
                detail=(
                    "PDF export engine not installed. "
                    "Please install Microsoft Word or LibreOffice on the server."
                )
            )

        try:
            pdf_path = convert_docx_to_pdf(rendered_path, temp_renders_dir)
        except RuntimeError as pdf_err:
            background_tasks.add_task(cleanup_temp_file, rendered_path)
            raise HTTPException(
                status_code=500,
                detail=f"PDF conversion failed: {pdf_err}"
            )

        if not pdf_path or not os.path.exists(pdf_path):
            background_tasks.add_task(cleanup_temp_file, rendered_path)
            raise HTTPException(
                status_code=500,
                detail="PDF conversion failed — output file not found. Please try downloading as DOCX."
            )

        safe_name = f"{db_template.name.replace(' ', '_')}_{gen_id}.pdf"
        logger.info(f"✅ Serving PDF: {safe_name}")
        background_tasks.add_task(cleanup_temp_file, rendered_path)
        background_tasks.add_task(cleanup_temp_file, pdf_path)
        
        # Log Document Generated & PDF Downloaded
        from backend.services.activity_service import log_activity
        log_activity(db, current_user.username, "Document Generated", "template", req.template_id)
        log_activity(db, current_user.username, "PDF Downloaded", "template", req.template_id)

        return FileResponse(
            path=pdf_path,
            filename=safe_name,
            media_type="application/pdf",
            headers={"X-Tracking-ID": gen_id}
        )

    # 6. Serve DOCX
    safe_name = f"{db_template.name.replace(' ', '_')}_{gen_id}.docx"
    logger.info(f"✅ Serving DOCX: {safe_name}")
    background_tasks.add_task(cleanup_temp_file, rendered_path)

    # Log Document Generated & DOCX Downloaded
    from backend.services.activity_service import log_activity
    log_activity(db, current_user.username, "Document Generated", "template", req.template_id)
    log_activity(db, current_user.username, "DOCX Downloaded", "template", req.template_id)

    return FileResponse(
        path=rendered_path,
        filename=safe_name,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"X-Tracking-ID": gen_id}
    )


@router.post("/preview-pdf")
async def create_preview_pdf(
    req: PreviewRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Renders a temporary DOCX with the requested preview data,
    converts it to a temporary PDF, and returns a JSON response
    with download URL. The preview file is completely stateless and temporary.
    """
    logger.info(f"🔍 PDF PREVIEW REQUEST: template={req.template_id}, user={current_user.username}")

    # 1. Fetch template
    db_template = db.query(models.DBTemplate).filter(
        models.DBTemplate.template_id == req.template_id,
        models.DBTemplate.is_active == True
    ).first()

    if not db_template:
        raise HTTPException(status_code=404, detail=f"Template '{req.template_id}' not found")

    if not db_template.file_path:
        raise HTTPException(
            status_code=422,
            detail="This template has no DOCX file attached. Please upload a .docx template file."
        )

    # 2. Resolve template path
    template_path = template_service.get_full_path(db_template.file_path)
    if not template_path or not os.path.exists(template_path):
        raise HTTPException(
            status_code=404,
            detail=f"Template file not found on disk: {db_template.file_path}"
        )

    # 3. Create temp_previews dir if missing
    os.makedirs(settings.TEMP_PREVIEWS_DIR, exist_ok=True)

    # 4. Trigger old preview file cleanup as background task
    from backend.utils.maintenance import cleanup_temp_previews
    background_tasks.add_task(cleanup_temp_previews, False)

    # 5. Render DOCX temporarily
    preview_uuid = uuid.uuid4().hex
    temp_docx = os.path.normpath(os.path.join(settings.TEMP_PREVIEWS_DIR, f"preview_{preview_uuid}.docx"))

    try:
        rendered_path = render_docx_template(
            template_path=template_path,
            data=req.data,
            output_path=temp_docx,
            tracking_id=f"PREV-{preview_uuid[:8].upper()}"
        )
    except Exception as e:
        logger.error(f"❌ Preview DOCX render failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Preview document rendering failed: {str(e)}"
        )

    # 6. Convert to PDF
    if not libreoffice_available():
        if os.path.exists(temp_docx):
            os.remove(temp_docx)
        raise HTTPException(
            status_code=503,
            detail="PDF export engine not installed. Please install Microsoft Word or LibreOffice on the server."
        )

    try:
        pdf_path = convert_docx_to_pdf(rendered_path, settings.TEMP_PREVIEWS_DIR)
    except Exception as pdf_err:
        _safe_remove(temp_docx)  # retry-aware: Word may still hold the lock
        logger.error(f"❌ Preview PDF conversion failed: {pdf_err}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Preview PDF conversion failed: {pdf_err}"
        )

    # Clean up the temporary DOCX immediately (with retry for Word COM file lock)
    _safe_remove(temp_docx)

    if not pdf_path or not os.path.exists(pdf_path):
        raise HTTPException(
            status_code=500,
            detail="Preview PDF conversion failed — output file not found."
        )

    filename = os.path.basename(pdf_path)
    url = f"/api/documents/preview-pdf?filename={filename}"

    logger.info(f"✅ Preview PDF ready: {filename}")
    return {
        "success": True,
        "filename": filename,
        "url": url
    }


@router.get("/preview-pdf")
def get_preview_pdf(
    filename: str,
    current_user: models.User = Depends(get_current_user)
):
    """
    Serves a temporary preview PDF file. Hardened to prevent path traversal.
    """
    import re
    if not re.match(r"^preview_[a-fA-F0-9]+\.pdf$", filename):
        raise HTTPException(status_code=400, detail="Invalid preview filename format")

    pdf_path = os.path.join(settings.TEMP_PREVIEWS_DIR, filename)
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="Preview PDF file not found or expired")

    return FileResponse(
        path=pdf_path,
        filename=filename,
        media_type="application/pdf"
    )


@router.get("/libreoffice-status")
def get_libreoffice_status():
    engine_name = None
    if DOCX2PDF_AVAILABLE:
        engine_name = "Microsoft Word"
    elif LIBREOFFICE_AVAILABLE:
        engine_name = "LibreOffice"

    return {
        "available": PDF_ENGINE_AVAILABLE,
        "engine": engine_name,
        "libreoffice": LIBREOFFICE_AVAILABLE,
        "word": DOCX2PDF_AVAILABLE
    }


# ─── Draft Management ─────────────────────────────────────────────────────────

def resolve_field_value(data: dict, path: str):
    """
    Resolves a dot-separated path (e.g. 'BUYERS.0.name' or 'TESTATOR_NAME') against a data dict.
    Supports dictionary keys (case-insensitive) and list/array indices.
    """
    if not path or not data:
        return None
    
    parts = path.split('.')
    current = data
    for part in parts:
        if isinstance(current, dict):
            # Check direct match
            if part in current:
                current = current[part]
            else:
                # Case-insensitive check
                matched = False
                for k, v in current.items():
                    if k.lower() == part.lower():
                        current = v
                        matched = True
                        break
                if not matched:
                    return None
        elif isinstance(current, list):
            try:
                idx = int(part)
                if 0 <= idx < len(current):
                    current = current[idx]
                else:
                    return None
            except ValueError:
                return None
        else:
            return None
    return current


def resolve_document_identity(data_json: dict, db_template: Optional[models.DBTemplate]) -> str:
    """
    Resolves primary document identity based on template config, falling back to priority fields if unconfigured.
    """
    # 1. Configured check
    identity_path = None
    if db_template:
        try:
            fo = json.loads(db_template.field_order_json) if db_template.field_order_json else {}
        except Exception:
            fo = {}
        if isinstance(fo, dict):
            identity_path = fo.get("identity_field") or fo.get("document_identity_field")
        if not identity_path and hasattr(db_template, "document_identity_field"):
            identity_path = db_template.document_identity_field

    if identity_path:
        val = resolve_field_value(data_json, identity_path)
        if val is not None and str(val).strip() != "":
            return str(val).strip()
        return "-"

    # 2. Backward compatibility fallbacks
    fallback_paths = [
        "APPLICANT_NAME",
        "TESTATOR_NAME",
        "DECEASED_PERSON_NAME",
        "BUYER_NAME",
        "BUYERS.0.name"
    ]
    for path in fallback_paths:
        val = resolve_field_value(data_json, path)
        if val is not None and str(val).strip() != "":
            return str(val).strip()

    return "-"


def resolve_document_secondary(data_json: dict, db_template: Optional[models.DBTemplate]) -> str:
    """
    Resolves secondary document field based on template config, falling back to priority fields if unconfigured.
    """
    # 1. Configured check
    secondary_path = None
    if db_template:
        try:
            fo = json.loads(db_template.field_order_json) if db_template.field_order_json else {}
        except Exception:
            fo = {}
        if isinstance(fo, dict):
            secondary_path = fo.get("secondary_field") or fo.get("document_secondary_field")
        if not secondary_path and hasattr(db_template, "document_secondary_field"):
            secondary_path = db_template.document_secondary_field

    if secondary_path:
        val = resolve_field_value(data_json, secondary_path)
        if val is not None and str(val).strip() != "":
            return str(val).strip()
        return "-"

    # 2. Backward compatibility fallbacks
    fallback_paths = [
        "VILLAGE_NAME",
        "TESTATOR_VILLAGE",
        "SURVEY_NO",
        "ACCOUNT_NO"
    ]
    for path in fallback_paths:
        val = resolve_field_value(data_json, path)
        if val is not None and str(val).strip() != "":
            return str(val).strip()

    return "-"


def serialize_document(doc: models.DocumentSubmission, db: Session) -> dict:
    """
    Serializes a DocumentSubmission instance, dynamically resolving:
    - template_name
    - document_identity (Identity Value)
    - document_secondary (Secondary Value)
    - has_secondary (boolean representation)
    - document_name (for backward compatibility: resolved identity value or template name fallback)
    """
    data = {
        "id": doc.id,
        "tracking_id": doc.tracking_id,
        "survey_no": doc.survey_no,
        "buyer_name": doc.buyer_name,
        "amount": doc.amount,
        "data_json": doc.data_json,
        "is_locked": doc.is_locked,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
        "updated_at": doc.updated_at.isoformat() if doc.updated_at else None,
        "file_path": doc.file_path,
        "final_pdf_path": doc.final_pdf_path,
        "final_docx_path": doc.final_docx_path,
        "pdf_ready": doc.pdf_ready,
        "pdf_generation_in_progress": doc.pdf_generation_in_progress,
        "user_id": doc.user_id,
    }

    # Extract template_id
    template_id = getattr(doc, "template_id", None)
    if not template_id:
        try:
            parsed_json = json.loads(doc.data_json) if doc.data_json else {}
            if isinstance(parsed_json, dict):
                template_id = parsed_json.get("template_id")
        except Exception:
            pass

    data["template_id"] = template_id or "—"

    # Query template details
    db_template = None
    if template_id:
        db_template = db.query(models.DBTemplate).filter(
            models.DBTemplate.template_id == template_id
        ).first()

    # Resolve template_name
    template_name = "Unknown Template"
    if db_template and db_template.name:
        template_name = db_template.name
    elif template_id:
        fallback_map = {
            "sale_deed_simple": "વેચાણ દસ્તાવેજ (Sale Deed)",
            "varasai_pedhinamu": "વારસાઈ આંબો / પેઢીનામું (Pedhinamu)"
        }
        template_name = fallback_map.get(template_id, template_id)

    data["template_name"] = template_name

    # Parse data_json
    doc_data = {}
    try:
        doc_data = json.loads(doc.data_json) if doc.data_json else {}
    except Exception:
        pass

    # Resolve identity and secondary fields via generic resolvers
    identity_val = resolve_document_identity(doc_data, db_template)
    secondary_val = resolve_document_secondary(doc_data, db_template)

    # has_secondary is True if resolved value is non-empty and not "-"
    has_secondary = secondary_val != "-" and secondary_val != ""

    data["document_identity"] = identity_val
    data["document_secondary"] = secondary_val
    data["has_secondary"] = has_secondary

    # Maintain backward compatibility with document_name
    data["document_name"] = identity_val if identity_val != "-" else template_name

    return data


@router.get("/")
def get_user_documents(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Fetch all documents belonging to the current user.
    All roles (including admin) see only their own documents here.
    Admins can see all users' documents via GET /api/admin/documents.
    """
    docs = db.query(models.DocumentSubmission).filter(
        models.DocumentSubmission.user_id == current_user.id
    ).order_by(models.DocumentSubmission.created_at.desc()).all()
    return [serialize_document(d, db) for d in docs]


@router.get("/{tracking_id}")
def get_document(
    tracking_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Retrieve a specific document by tracking ID."""
    doc = db.query(models.DocumentSubmission).filter(
        models.DocumentSubmission.tracking_id == tracking_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not current_user.is_admin and doc.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return serialize_document(doc, db)


@router.post("/draft")
async def create_draft(
    request: Request,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Save a document draft (data only — no generation)."""
    body = await request.json()
    
    # Limit check: count total documents for this user
    count = db.query(models.DocumentSubmission).filter(
        models.DocumentSubmission.user_id == current_user.id
    ).count()
    if count >= 10:
        raise HTTPException(
            status_code=400,
            detail="Maximum 10 saved documents allowed. Please delete old documents before saving new ones."
        )

    tracking_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"

    new_doc = models.DocumentSubmission(
        tracking_id=tracking_id,
        user_id=current_user.id,
        is_locked=False,
        survey_no=body.get("survey_no"),
        buyer_name=body.get("buyer_name"),
        amount=body.get("amount"),
        template_id=body.get("template_id"),
        document_name=body.get("document_name"),
        data_json=json.dumps(body),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    
    # Log Draft Saved activity
    from backend.services.activity_service import log_activity
    log_activity(db, current_user.username, "Draft Saved", "document", tracking_id)

    logger.info(f"📝 Draft saved: {tracking_id} by {current_user.username}")
    return serialize_document(new_doc, db)


def start_background_pdf_generation(tracking_id: str, body: dict):
    with active_render_lock:
        if tracking_id in active_render_jobs:
            logger.warning("Already rendering")
            return False
        active_render_jobs.add(tracking_id)

    def run_generation():
        logger.info(f"⏳ [Background Thread] Starting PDF generation for {tracking_id}")
        db = database.SessionLocal()
        temp_docx_path = None
        temp_pdf_path = None
        try:
            db_doc = db.query(models.DocumentSubmission).filter(
                models.DocumentSubmission.tracking_id == tracking_id
            ).first()
            if not db_doc:
                logger.error(f"❌ [Background Thread] Document {tracking_id} not found in DB.")
                return

            template_id = body.get("template_id")
            if not template_id:
                raise Exception("Template ID missing in body.")
                
            db_template = db.query(models.DBTemplate).filter(
                models.DBTemplate.template_id == template_id
            ).first()
            if not db_template or not db_template.file_path:
                raise Exception("Template not found or has no base DOCX file.")
                
            template_path = template_service.get_full_path(db_template.file_path)
            if not os.path.exists(template_path):
                raise Exception("Base template DOCX file missing on disk.")
                
            if not libreoffice_available():
                raise Exception("PDF export engine not installed (LibreOffice or Word COM).")
                
            # Create isolated temp filenames
            safe_suffix = f"{int(time.time())}_{uuid.uuid4().hex[:6]}"
            unique_name = f"{tracking_id}_{safe_suffix}"
            
            temp_renders_dir = settings.TEMP_RENDERS_DIR
            os.makedirs(temp_renders_dir, exist_ok=True)
            
            temp_docx_path = os.path.normpath(os.path.join(temp_renders_dir, f"{unique_name}.docx"))
            
            logger.info("📄 RENDERING TEMP DOCX")
            rendered_temp_docx = render_docx_template(
                template_path=template_path,
                data=body,
                output_path=temp_docx_path,
                tracking_id=tracking_id,
            )
            
            logger.info(f"⏳ [Background Thread] Converting temp DOCX to PDF for {tracking_id}")
            temp_pdf_path = convert_docx_to_pdf(rendered_temp_docx, temp_renders_dir)
            
            # Destination paths in outputs/
            os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
            final_docx_path = os.path.normpath(os.path.join(settings.OUTPUT_DIR, f"{unique_name}.docx"))
            final_pdf_path = os.path.normpath(os.path.join(settings.OUTPUT_DIR, f"{unique_name}.pdf"))
            
            # Copy to outputs
            shutil.copy2(rendered_temp_docx, final_docx_path)
            shutil.copy2(temp_pdf_path, final_pdf_path)
            
            logger.info(f"✅ [Background Thread] Copied files to outputs: {final_docx_path}, {final_pdf_path}")
            
            # Clean up old final files if they exist
            old_docx_path = db_doc.final_docx_path
            old_pdf_path = db_doc.final_pdf_path
            if old_docx_path and os.path.exists(old_docx_path):
                try:
                    os.remove(old_docx_path)
                    logger.info(f"🗑️ Removed old final DOCX: {old_docx_path}")
                except Exception as e:
                    logger.warning(f"Could not remove old final docx {old_docx_path}: {e}")
                    
            if old_pdf_path and os.path.exists(old_pdf_path):
                try:
                    os.remove(old_pdf_path)
                    logger.info(f"🗑️ Removed old final PDF: {old_pdf_path}")
                except Exception as e:
                    logger.warning(f"Could not remove old final pdf {old_pdf_path}: {e}")
            
            # Update paths and status with database lock retry mechanism
            max_retries = 3
            for attempt in range(max_retries + 1):
                try:
                    current_doc = db.query(models.DocumentSubmission).filter(
                        models.DocumentSubmission.tracking_id == tracking_id
                    ).first()
                    if not current_doc:
                        logger.error(f"❌ [Background Thread] Document {tracking_id} not found in DB.")
                        return
                    current_doc.final_docx_path = final_docx_path
                    current_doc.final_pdf_path = final_pdf_path
                    current_doc.pdf_ready = True
                    current_doc.pdf_generation_in_progress = False
                    db.commit()
                    logger.info(f"✅ [Background Thread] PDF generated and cached for {tracking_id}")
                    break
                except Exception as e:
                    err_msg = str(e).lower()
                    is_locked = "locked" in err_msg or "timeout" in err_msg
                    if is_locked and attempt < max_retries:
                        logger.warning("🔒 DATABASE LOCK DETECTED")
                        logger.info(f"♻️ RETRYING DATABASE OPERATION (Attempt {attempt + 1}/{max_retries})")
                        db.rollback()
                        time.sleep(0.5)
                    else:
                        db.rollback()
                        raise
        except Exception as e:
            logger.error(f"❌ [Background Thread] Final Lock PDF generation failed for {tracking_id}: {e}", exc_info=True)
            max_retries = 3
            for attempt in range(max_retries + 1):
                try:
                    current_doc = db.query(models.DocumentSubmission).filter(
                        models.DocumentSubmission.tracking_id == tracking_id
                    ).first()
                    if current_doc:
                        current_doc.pdf_ready = False
                        current_doc.pdf_generation_in_progress = False
                        db.commit()
                    break
                except Exception as db_err:
                    err_msg = str(db_err).lower()
                    is_locked = "locked" in err_msg or "timeout" in err_msg
                    if is_locked and attempt < max_retries:
                        logger.warning("🔒 DATABASE LOCK DETECTED")
                        logger.info(f"♻️ RETRYING DATABASE OPERATION (Attempt {attempt + 1}/{max_retries})")
                        db.rollback()
                        time.sleep(0.5)
                    else:
                        db.rollback()
                        logger.error(f"❌ Failed to update error state in DB: {db_err}")
                        break
        finally:
            # Clean up temporary files
            if temp_docx_path and os.path.exists(temp_docx_path):
                cleanup_temp_file(temp_docx_path)
            if temp_pdf_path and os.path.exists(temp_pdf_path):
                cleanup_temp_file(temp_pdf_path)
                
            with active_render_lock:
                active_render_jobs.discard(tracking_id)
            db.close()

    thread = threading.Thread(target=run_generation)
    thread.daemon = True
    thread.start()
    return True


@router.put("/{tracking_id}")
async def update_document(
    tracking_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update a document draft."""
    body = await request.json()
    is_final = body.get("is_final", False)

    max_retries = 3
    for attempt in range(max_retries + 1):
        try:
            db_doc = db.query(models.DocumentSubmission).filter(
                models.DocumentSubmission.tracking_id == tracking_id
            ).first()
            if not db_doc:
                raise HTTPException(status_code=404, detail="Document not found")
            if not current_user.is_admin and db_doc.user_id != current_user.id:
                raise HTTPException(status_code=403, detail="Not authorized")
            if db_doc.is_locked:
                raise HTTPException(status_code=403, detail="Finalized documents cannot be edited")

            # Limit check: count other documents for this user
            other_docs_count = db.query(models.DocumentSubmission).filter(
                models.DocumentSubmission.user_id == current_user.id,
                models.DocumentSubmission.tracking_id != tracking_id
            ).count()
            if other_docs_count >= 10:
                raise HTTPException(
                    status_code=400,
                    detail="Maximum 10 saved documents allowed. Please delete old documents before saving new ones."
                )

            if "survey_no" in body: db_doc.survey_no = body["survey_no"]
            if "buyer_name" in body: db_doc.buyer_name = body["buyer_name"]
            if "amount" in body: db_doc.amount = body["amount"]
            if "template_id" in body: db_doc.template_id = body["template_id"]
            if "document_name" in body: db_doc.document_name = body["document_name"]

            # Check if we are locking/finalizing the document
            if is_final:
                with active_render_lock:
                    if tracking_id in active_render_jobs:
                        raise HTTPException(
                            status_code=409,
                            detail="PDF generation is already in progress for this document."
                        )
                # Validation before finalize
                template_id = body.get("template_id")
                if not template_id:
                    try:
                        existing_data = json.loads(db_doc.data_json) if db_doc.data_json else {}
                        template_id = existing_data.get("template_id")
                    except Exception:
                        pass
                if template_id:
                    db_template = db.query(models.DBTemplate).filter(
                        models.DBTemplate.template_id == template_id
                    ).first()
                    if db_template:
                        validate_generation_data(db_template, body)
                
                db_doc.is_locked = True
                db_doc.pdf_ready = False
                db_doc.pdf_generation_in_progress = True

                if settings.WALLET_ENABLED:
                    cost = db_template.credit_cost if (db_template and db_template.credit_cost is not None) else settings.DEFAULT_CREDIT_COST
                    from backend.services.wallet_service import WalletService
                    WalletService.deduct_credits(
                        db=db,
                        user_id=current_user.id,
                        cost=cost,
                        template_id=template_id or "unknown",
                        tracking_id=tracking_id
                    )
            else:
                if "is_final" in body: db_doc.is_locked = body["is_final"]

            db_doc.data_json = json.dumps(body)
            db_doc.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(db_doc)
            break
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            err_msg = str(e).lower()
            is_locked = "locked" in err_msg or "timeout" in err_msg
            if is_locked and attempt < max_retries:
                logger.warning("🔒 DATABASE LOCK DETECTED")
                logger.info(f"♻️ RETRYING DATABASE OPERATION (Attempt {attempt + 1}/{max_retries})")
                db.rollback()
                time.sleep(0.5)
            else:
                db.rollback()
                raise

    if is_final:
        start_background_pdf_generation(tracking_id, body)
        # Log Document Generated activity
        from backend.services.activity_service import log_activity
        log_activity(db, current_user.username, "Document Generated", "document", tracking_id)
    else:
        # Log Draft Saved activity
        from backend.services.activity_service import log_activity
        log_activity(db, current_user.username, "Draft Saved", "document", tracking_id)

    return serialize_document(db_doc, db)


@router.get("/{tracking_id}/download")
def download_document(
    tracking_id: str,
    format: str = "pdf",
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Download a finalized PDF or DOCX document."""
    doc = db.query(models.DocumentSubmission).filter(
        models.DocumentSubmission.tracking_id == tracking_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not current_user.is_admin and doc.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if not doc.is_locked:
        raise HTTPException(status_code=400, detail="Cannot download a draft. Document must be finalized.")

    if settings.WALLET_ENABLED:
        tx_exists = db.query(models.WalletTransaction).filter(
            models.WalletTransaction.user_id == doc.user_id,
            models.WalletTransaction.type == "DEBIT",
            models.WalletTransaction.source == "DOCUMENT",
            models.WalletTransaction.remarks.like(f"%{tracking_id}%")
        ).first()
        if not tx_exists:
            raise HTTPException(status_code=403, detail="Download access denied: No transaction ledger record found for this document.")

    from backend.services.activity_service import log_activity

    # Fallback regeneration if database paths exist but physical files are missing
    docx_missing = bool(doc.final_docx_path) and not os.path.exists(doc.final_docx_path)
    pdf_missing = bool(doc.final_pdf_path) and not os.path.exists(doc.final_pdf_path)

    if docx_missing or pdf_missing:
        logger.info(f"🔄 Physical file missing on disk for finalized document {tracking_id}. Triggering automatic regeneration fallback.")
        try:
            body = json.loads(doc.data_json)
        except Exception as e:
            logger.error(f"Failed to parse data_json for document {tracking_id}: {e}")
            raise HTTPException(
                status_code=422,
                detail="Invalid document data structure. Cannot regenerate document."
            )

        template_id = body.get("template_id")
        if not template_id:
            raise HTTPException(
                status_code=422,
                detail="Template ID missing in document data."
            )

        db_template = db.query(models.DBTemplate).filter(
            models.DBTemplate.template_id == template_id
        ).first()

        if not db_template or not db_template.file_path:
            raise HTTPException(
                status_code=404,
                detail="Template not found or has no base DOCX file."
            )

        template_path = template_service.get_full_path(db_template.file_path)
        if not os.path.exists(template_path):
            raise HTTPException(
                status_code=404,
                detail="Base template DOCX file missing on disk."
            )

        if not libreoffice_available():
            raise HTTPException(
                status_code=503,
                detail="PDF export engine not installed. Please contact administrator."
            )

        safe_suffix = f"{int(time.time())}_{uuid.uuid4().hex[:6]}"
        unique_name = f"{tracking_id}_{safe_suffix}"

        temp_renders_dir = settings.TEMP_RENDERS_DIR
        os.makedirs(temp_renders_dir, exist_ok=True)
        temp_docx_path = os.path.normpath(os.path.join(temp_renders_dir, f"{unique_name}.docx"))

        try:
            # Render DOCX
            rendered_temp_docx = render_docx_template(
                template_path=template_path,
                data=body,
                output_path=temp_docx_path,
                tracking_id=tracking_id,
            )

            # Convert to PDF
            temp_pdf_path = convert_docx_to_pdf(rendered_temp_docx, temp_renders_dir)

            # Save regenerated files back to outputs folder
            os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
            final_docx_path = os.path.normpath(os.path.join(settings.OUTPUT_DIR, f"{unique_name}.docx"))
            final_pdf_path = os.path.normpath(os.path.join(settings.OUTPUT_DIR, f"{unique_name}.pdf"))

            shutil.copy2(rendered_temp_docx, final_docx_path)
            shutil.copy2(temp_pdf_path, final_pdf_path)

            # Clean up old files if they exist
            old_docx = doc.final_docx_path
            old_pdf = doc.final_pdf_path
            if old_docx and os.path.exists(old_docx):
                try:
                    os.remove(old_docx)
                except Exception as e:
                    logger.warning(f"Could not remove old docx {old_docx}: {e}")
            if old_pdf and os.path.exists(old_pdf):
                try:
                    os.remove(old_pdf)
                except Exception as e:
                    logger.warning(f"Could not remove old pdf {old_pdf}: {e}")

            # Update database record
            doc.final_docx_path = final_docx_path
            doc.final_pdf_path = final_pdf_path
            doc.pdf_ready = True
            doc.pdf_generation_in_progress = False
            db.commit()
            db.refresh(doc)

            # Log "Document Regenerated" activity
            log_activity(db, current_user.username, "Document Regenerated", "document", tracking_id)
            logger.info(f"✨ Document {tracking_id} regenerated successfully.")

        except Exception as e:
            db.rollback()
            logger.error(f"❌ Document regeneration failed for {tracking_id}: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Document regeneration failed: {str(e)}"
            )
        finally:
            # Clean up temp files
            if temp_docx_path and os.path.exists(temp_docx_path):
                cleanup_temp_file(temp_docx_path)
            if 'temp_pdf_path' in locals() and temp_pdf_path and os.path.exists(temp_pdf_path):
                cleanup_temp_file(temp_pdf_path)

    if format.lower() == "docx":
        if doc.final_docx_path and os.path.exists(doc.final_docx_path):
            logger.info(f"✨ DOCX Cache HIT for {tracking_id} in /download: directly streaming {doc.final_docx_path}")
            log_activity(db, current_user.username, "DOCX Downloaded", "document", tracking_id)
            return FileResponse(
                path=doc.final_docx_path,
                filename=f"{tracking_id}.docx",
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            )
        else:
            logger.error(f"❌ DOCX Cache MISS for locked document {tracking_id} in /download.")
            raise HTTPException(
                status_code=404,
                detail="Finalized DOCX document not found on server."
            )

    # If we already have the generated PDF
    if doc.final_pdf_path and os.path.exists(doc.final_pdf_path):
        logger.info(f"✨ PDF Cache HIT for {tracking_id} in /download: directly streaming {doc.final_pdf_path}")
        log_activity(db, current_user.username, "PDF Downloaded", "document", tracking_id)

        return FileResponse(
            path=doc.final_pdf_path,
            filename=f"{tracking_id}.pdf",
            media_type="application/pdf"
        )
    
    logger.error(f"❌ PDF Cache MISS for locked document {tracking_id} in /download. Cache is missing!")
    raise HTTPException(
        status_code=404, 
        detail="Finalized PDF document not found on server. It must be generated during final lock."
    )


@router.delete("/{tracking_id}")
def delete_document(
    tracking_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete a document draft or finalized document and all associated files."""
    doc = db.query(models.DocumentSubmission).filter(
        models.DocumentSubmission.tracking_id == tracking_id
    ).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if not current_user.is_admin and doc.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Safely remove all associated files from disk
    paths_to_delete = []
    if doc.file_path:
        paths_to_delete.append(doc.file_path)
    if doc.final_pdf_path:
        paths_to_delete.append(doc.final_pdf_path)
    if doc.final_docx_path:
        paths_to_delete.append(doc.final_docx_path)
        
    # Also delete potential files named after tracking_id in settings.OUTPUT_DIR and temp_renders
    try:
        for folder in [settings.OUTPUT_DIR, settings.TEMP_RENDERS_DIR]:
            if os.path.exists(folder):
                for filename in os.listdir(folder):
                    if filename.startswith(tracking_id):
                        paths_to_delete.append(os.path.join(folder, filename))
    except Exception as e:
        logger.warning(f"Failed to scan folders for deleting files starting with {tracking_id}: {e}")

    for file_path in set(paths_to_delete):
        try:
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"🗑️ Deleted file from disk: {file_path}")
        except Exception as e:
            logger.warning(f"Failed to delete file {file_path} for document {tracking_id}: {e}")

    db.delete(doc)
    db.commit()
    
    logger.info(f"🗑️ Document deleted: {tracking_id} by {current_user.username}")
    return {"message": "Document deleted successfully", "tracking_id": tracking_id}


@router.post("/{tracking_id}/retry-pdf")
def retry_pdf_generation(
    tracking_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Manually retry failed background PDF generation for a finalized document."""
    max_retries = 3
    body = None

    for attempt in range(max_retries + 1):
        try:
            doc = db.query(models.DocumentSubmission).filter(
                models.DocumentSubmission.tracking_id == tracking_id
            ).first()
            if not doc:
                raise HTTPException(status_code=404, detail="Document not found")
            if not current_user.is_admin and doc.user_id != current_user.id:
                raise HTTPException(status_code=403, detail="Not authorized")
            if not doc.is_locked:
                raise HTTPException(status_code=400, detail="Cannot retry PDF generation on a draft document.")

            if settings.WALLET_ENABLED:
                tx_exists = db.query(models.WalletTransaction).filter(
                    models.WalletTransaction.user_id == doc.user_id,
                    models.WalletTransaction.type == "DEBIT",
                    models.WalletTransaction.source == "DOCUMENT",
                    models.WalletTransaction.remarks.like(f"%{tracking_id}%")
                ).first()
                if not tx_exists:
                    raise HTTPException(status_code=403, detail="Action denied: No transaction ledger record found for this document.")

            with active_render_lock:
                if tracking_id in active_render_jobs:
                    raise HTTPException(
                        status_code=409,
                        detail="PDF generation is already in progress for this document."
                    )

            doc.pdf_ready = False
            doc.pdf_generation_in_progress = True
            doc.updated_at = datetime.now(timezone.utc)
            db.commit()

            try:
                body = json.loads(doc.data_json)
            except Exception as e:
                logger.error(f"Failed to parse data_json for document {tracking_id}: {e}")
                for inner_attempt in range(max_retries + 1):
                    try:
                        inner_doc = db.query(models.DocumentSubmission).filter(
                            models.DocumentSubmission.tracking_id == tracking_id
                        ).first()
                        if inner_doc:
                            inner_doc.pdf_generation_in_progress = False
                            db.commit()
                        break
                    except Exception as inner_e:
                        err_msg = str(inner_e).lower()
                        is_locked = "locked" in err_msg or "timeout" in err_msg
                        if is_locked and inner_attempt < max_retries:
                            logger.warning("🔒 DATABASE LOCK DETECTED")
                            logger.info(f"♻️ RETRYING DATABASE OPERATION (Attempt {inner_attempt + 1}/{max_retries})")
                            db.rollback()
                            time.sleep(0.5)
                        else:
                            db.rollback()
                            raise
                raise HTTPException(status_code=422, detail="Invalid document data structure. Cannot regenerate PDF.")
            break
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            err_msg = str(e).lower()
            is_locked = "locked" in err_msg or "timeout" in err_msg
            if is_locked and attempt < max_retries:
                logger.warning("🔒 DATABASE LOCK DETECTED")
                logger.info(f"♻️ RETRYING DATABASE OPERATION (Attempt {attempt + 1}/{max_retries})")
                db.rollback()
                time.sleep(0.5)
            else:
                db.rollback()
                raise

    start_background_pdf_generation(tracking_id, body)
    return {"message": "PDF generation restarted", "tracking_id": tracking_id}


@router.post("/{tracking_id}/duplicate")
def duplicate_document(
    tracking_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Duplicate an existing document draft or finalized document into a new draft."""
    new_tracking_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
    max_retries = 3
    for attempt in range(max_retries + 1):
        try:
            doc = db.query(models.DocumentSubmission).filter(
                models.DocumentSubmission.tracking_id == tracking_id
            ).first()
            if not doc:
                raise HTTPException(status_code=404, detail="Document not found")
                
            if not current_user.is_admin and doc.user_id != current_user.id:
                raise HTTPException(status_code=403, detail="Not authorized")
                
            # Limit check: count total documents for this user
            count = db.query(models.DocumentSubmission).filter(
                models.DocumentSubmission.user_id == current_user.id
            ).count()
            if count >= 10:
                raise HTTPException(
                    status_code=400,
                    detail="Maximum document limit reached"
                )
                
            # Deep copy and isolate data_json
            try:
                data = json.loads(doc.data_json) if doc.data_json else {}
                system_keys = {
                    "tracking_id", "is_final", "is_locked", "pdf_ready", 
                    "pdf_generation_in_progress", "file_path", "final_pdf_path", 
                    "final_docx_path", "output_docx_path", "output_pdf_path", 
                    "cached_preview_path", "render_status", "background_thread_flags"
                }
                clean_data = {}
                for k, v in data.items():
                    if k == "template_id" or k not in system_keys:
                        clean_data[k] = v
                clean_data["tracking_id"] = new_tracking_id
                clean_data["is_final"] = False
                new_data_json = json.dumps(clean_data)
            except Exception as e:
                logger.error(f"Failed to parse and copy data_json: {e}")
                new_data_json = json.dumps({
                    "tracking_id": new_tracking_id,
                    "is_final": False
                })
                
            new_doc = models.DocumentSubmission(
                tracking_id=new_tracking_id,
                user_id=current_user.id,
                is_locked=False,
                survey_no=doc.survey_no,
                buyer_name=doc.buyer_name,
                amount=doc.amount,
                template_id=getattr(doc, "template_id", None),
                document_name=getattr(doc, "document_name", None),
                data_json=new_data_json,
                file_path=None,            # DO NOT COPY cached preview path
                final_pdf_path=None,       # DO NOT COPY output_pdf_path
                final_docx_path=None,      # DO NOT COPY output_docx_path
                pdf_ready=False,           # DO NOT COPY render status
                pdf_generation_in_progress=False,  # DO NOT COPY background thread flags
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            
            db.add(new_doc)
            db.commit()
            db.refresh(new_doc)
            
            logger.info(f"📄 Document duplicated: {tracking_id} -> {new_tracking_id} by {current_user.username}")
            return serialize_document(new_doc, db)
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            err_msg = str(e).lower()
            is_locked = "locked" in err_msg or "timeout" in err_msg
            if is_locked and attempt < max_retries:
                logger.warning("🔒 DATABASE LOCK DETECTED")
                logger.info(f"♻️ RETRYING DATABASE OPERATION (Attempt {attempt + 1}/{max_retries})")
                db.rollback()
                time.sleep(0.5)
            else:
                db.rollback()
                raise
