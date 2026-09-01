from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Request
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import os
import uuid
import re
import shutil
import logging
import traceback
from datetime import datetime

from backend import models, database
from backend.services.template_service import template_service, TemplateService
from backend.core.config import settings
from backend.routers.auth import get_admin_user
from backend.services.auth_service import get_current_user
from pydantic import BaseModel

# Configure logging
logger = logging.getLogger("backend.templates")

router = APIRouter(prefix="/templates", tags=["templates"])

# --- Schemas ---

class TemplateBase(BaseModel):
    name: str
    category: Optional[str] = "General"
    header: Optional[str] = ""
    content: Optional[str] = ""
    content2: Optional[str] = ""
    footer: Optional[str] = ""
    fields_json: Optional[str] = "{}"
    field_order_json: Optional[str] = "[]"
    is_active: Optional[bool] = True
    file_path: Optional[str] = None
    menu_item_id: Optional[int] = None
    document_identity_field: Optional[str] = None
    document_secondary_field: Optional[str] = None
    identity_field: Optional[str] = None
    secondary_field: Optional[str] = None
    credit_cost: Optional[int] = 10

class TemplateCreate(TemplateBase):
    pass

class TemplateUpdate(TemplateBase):
    name: Optional[str] = None
    category: Optional[str] = None
    header: Optional[str] = None
    content: Optional[str] = None
    content2: Optional[str] = None
    footer: Optional[str] = None
    fields_json: Optional[str] = None
    field_order_json: Optional[str] = None
    is_active: Optional[bool] = None
    file_path: Optional[str] = None
    menu_item_id: Optional[int] = None
    document_identity_field: Optional[str] = None
    document_secondary_field: Optional[str] = None
    identity_field: Optional[str] = None
    secondary_field: Optional[str] = None
    credit_cost: Optional[int] = None

# --- Routes ---

@router.get("/", response_model=List[dict])
def get_templates(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    """Fetch all active templates from the database with pagination."""
    try:
        tpls = db.query(models.DBTemplate).filter(models.DBTemplate.is_active == True).order_by(models.DBTemplate.created_at.desc()).offset(skip).limit(limit).all()
        # Convert to dict for response consistency
        result = []
        for t in tpls:
            fields = json.loads(t.fields_json) if t.fields_json else {}
            field_order = json.loads(t.field_order_json) if t.field_order_json else []
            variables = field_order if field_order else list(fields.keys())
            
            # Parse field_order_json for metadata keys
            fo = json.loads(t.field_order_json) if t.field_order_json else {}
            identity_field = None
            secondary_field = None
            if isinstance(fo, dict):
                identity_field = fo.get("identity_field") or fo.get("document_identity_field")
                secondary_field = fo.get("secondary_field") or fo.get("document_secondary_field")
            if not identity_field and hasattr(t, "document_identity_field"):
                identity_field = t.document_identity_field
            if not secondary_field and hasattr(t, "document_secondary_field"):
                secondary_field = t.document_secondary_field

            result.append({
                "id": t.id,
                "template_id": t.template_id,
                "name": t.name,
                "category": t.category,
                "header": t.header,
                "content": t.content,
                "content2": t.content2,
                "footer": t.footer,
                "fields": fields,
                "fieldOrder": field_order if field_order else variables,
                "variables": variables,
                "is_active": t.is_active,
                "status": t.status,
                "file_path": t.file_path,
                "menu_item_id": t.menu_item_id,
                "document_identity_field": identity_field,
                "document_secondary_field": secondary_field,
                "identity_field": identity_field,
                "secondary_field": secondary_field,
                "credit_cost": t.credit_cost,
                "created_at": t.created_at,
                "updated_at": t.updated_at
            })
        return result
    except Exception as e:
        logger.error(f"Error fetching templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/archived", response_model=List[dict])
def get_archived_templates(db: Session = Depends(database.get_db), admin: models.User = Depends(get_admin_user)):
    """Fetch all archived templates from the database. Admin only."""
    try:
        tpls = db.query(models.DBTemplate).filter(models.DBTemplate.status == "ARCHIVED").order_by(models.DBTemplate.created_at.desc()).all()
        result = []
        for t in tpls:
            fields = json.loads(t.fields_json) if t.fields_json else {}
            field_order = json.loads(t.field_order_json) if t.field_order_json else []
            variables = field_order if field_order else list(fields.keys())

            # Parse field_order_json for metadata keys
            fo = json.loads(t.field_order_json) if t.field_order_json else {}
            identity_field = None
            secondary_field = None
            if isinstance(fo, dict):
                identity_field = fo.get("identity_field") or fo.get("document_identity_field")
                secondary_field = fo.get("secondary_field") or fo.get("document_secondary_field")
            if not identity_field and hasattr(t, "document_identity_field"):
                identity_field = t.document_identity_field
            if not secondary_field and hasattr(t, "document_secondary_field"):
                secondary_field = t.document_secondary_field

            result.append({
                "id": t.id,
                "template_id": t.template_id,
                "name": t.name,
                "category": t.category,
                "header": t.header,
                "content": t.content,
                "content2": t.content2,
                "footer": t.footer,
                "fields": fields,
                "fieldOrder": field_order if field_order else variables,
                "variables": variables,
                "is_active": t.is_active,
                "status": t.status,
                "file_path": t.file_path,
                "menu_item_id": t.menu_item_id,
                "document_identity_field": identity_field,
                "document_secondary_field": secondary_field,
                "identity_field": identity_field,
                "secondary_field": secondary_field,
                "credit_cost": t.credit_cost,
                "created_at": t.created_at,
                "updated_at": t.updated_at
            })
        return result
    except Exception as e:
        logger.error(f"Error fetching archived templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{template_id}/archive")
def archive_template(
    template_id: str,
    db: Session = Depends(database.get_db),
    admin: models.User = Depends(get_admin_user)
):
    """Archive a template by setting status to ARCHIVED and is_active to False. Admin only."""
    db_tpl = db.query(models.DBTemplate).filter(models.DBTemplate.template_id == template_id).first()
    if not db_tpl:
        raise HTTPException(status_code=404, detail="Template not found")

    # Safety Check: Prevent archiving if template has active locked document generation running.
    # Find all DocumentSubmissions where is_locked is True and pdf_generation_in_progress is True
    # and data_json contains our template_id.
    active_gens = db.query(models.DocumentSubmission).filter(
        models.DocumentSubmission.is_locked == True,
        models.DocumentSubmission.pdf_generation_in_progress == True
    ).all()
    
    for doc in active_gens:
        if doc.data_json:
            try:
                data = json.loads(doc.data_json)
                if data.get("template_id") == template_id:
                    raise HTTPException(
                        status_code=400,
                        detail="Cannot archive template: an active document generation is running for this template."
                    )
            except HTTPException:
                raise
            except Exception:
                continue

    try:
        db_tpl.is_active = False
        db_tpl.status = "ARCHIVED"
        db_tpl.updated_at = datetime.utcnow()
        db.commit()
        
        # Log to activity logs
        from backend.services.activity_service import log_activity
        log_activity(db, admin.username, "Template Archived", "template", template_id, template_name=db_tpl.name)
        
        logger.info(f"[TEMPLATE ARCHIVED] Admin [{admin.username}] archived template {db_tpl.name} ({template_id})")
        return {"success": True, "message": "Template archived successfully"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error archiving template: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{template_id}/restore")
def restore_template(
    template_id: str,
    db: Session = Depends(database.get_db),
    admin: models.User = Depends(get_admin_user)
):
    """Restore an archived template by setting status to ACTIVE and is_active to True. Admin only."""
    db_tpl = db.query(models.DBTemplate).filter(models.DBTemplate.template_id == template_id).first()
    if not db_tpl:
        raise HTTPException(status_code=404, detail="Template not found")

    try:
        db_tpl.is_active = True
        db_tpl.status = "ACTIVE"
        db_tpl.updated_at = datetime.utcnow()
        db.commit()
        
        # Log to activity logs
        from backend.services.activity_service import log_activity
        log_activity(db, admin.username, "Template Restored", "template", template_id, template_name=db_tpl.name)
        
        logger.info(f"[TEMPLATE RESTORED] Admin [{admin.username}] restored template {db_tpl.name} ({template_id})")
        return {"success": True, "message": "Template restored successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error restoring template: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{template_id}")
def delete_template_permanently(
    template_id: str,
    db: Session = Depends(database.get_db),
    admin: models.User = Depends(get_admin_user)
):
    """
    Permanently delete a template from the database. Admin only.
    Checks for dependent records (e.g. generated document submissions).
    If documents reference this template, prevent deletion with a clear safety warning.
    """
    from sqlalchemy import func
    db_tpl = db.query(models.DBTemplate).filter(models.DBTemplate.template_id == template_id).first()
    if not db_tpl:
        raise HTTPException(status_code=404, detail="Template not found")

    # 1. Dependency check: Document Submissions referencing this template_id
    if db.bind.dialect.name == 'postgresql':
        json_template_id = func.jsonb_extract_path_text(models.DocumentSubmission.data_json, 'template_id')
    else:
        json_template_id = func.json_extract(models.DocumentSubmission.data_json, '$.template_id')

    resolved_template_id = func.coalesce(
        func.nullif(models.DocumentSubmission.template_id, ''),
        json_template_id
    )

    doc_count = db.query(models.DocumentSubmission).filter(
        (models.DocumentSubmission.template_id == template_id) |
        (resolved_template_id == template_id)
    ).count()

    if doc_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot permanently delete template '{db_tpl.name}': {doc_count} document submission(s) exist that reference this template. You can archive the template instead to prevent new documents from being generated while preserving existing document history."
        )

    try:
        tpl_name = db_tpl.name
        tpl_file_path = db_tpl.file_path
        
        # 2. Unbind any MenuItem referencing this template
        menu_items = db.query(models.MenuItem).filter(models.MenuItem.template_id == template_id).all()
        for m in menu_items:
            m.template_id = None

        # 3. Clean up physical file if not used by any other template
        if tpl_file_path:
            other_using = db.query(models.DBTemplate).filter(
                models.DBTemplate.file_path == tpl_file_path,
                models.DBTemplate.template_id != template_id
            ).first()
            if not other_using:
                full_path = template_service.get_full_path(tpl_file_path)
                if full_path and os.path.exists(full_path):
                    try:
                        os.remove(full_path)
                    except OSError:
                        pass

        # 4. Delete the template from DB
        db.delete(db_tpl)
        db.commit()

        # 5. Log Activity
        from backend.services.activity_service import log_activity
        log_activity(db, admin.username, "Template Permanently Deleted", "template", template_id, template_name=tpl_name)

        logger.info(f"[TEMPLATE PERMANENTLY DELETED] Admin [{admin.username}] permanently deleted template {tpl_name} ({template_id})")
        return {"success": True, "message": f"Template '{tpl_name}' was permanently deleted."}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error permanently deleting template {template_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete template: {str(e)}")

@router.get("/{template_id}/sample-docx")
@router.get("/{template_id}/sample-preview")
def get_sample_docx(template_id: str, db: Session = Depends(database.get_db)):
    """
    Public endpoint to get a safe sample DOCX rendered with generic demo/placeholder data.
    Does NOT require authentication or expose any user data.
    """
    tpl = db.query(models.DBTemplate).filter(
        (models.DBTemplate.template_id == template_id) | (models.DBTemplate.id == template_id)
    ).first()
    if not tpl or not tpl.is_active:
        raise HTTPException(status_code=404, detail="Template not found or inactive")

    if not tpl.file_path:
        raise HTTPException(status_code=422, detail="No DOCX file attached to template")

    full_tpl_path = template_service.get_full_path(tpl.file_path)
    if not full_tpl_path or not os.path.exists(full_tpl_path):
        raise HTTPException(status_code=404, detail="Template DOCX file not found on disk")

    from backend.routers.demo_datasets import _generate_mock_data_for_template
    sample_data = _generate_mock_data_for_template(tpl.fields_json, tpl.field_order_json)

    temp_renders_dir = settings.TEMP_RENDERS_DIR
    os.makedirs(temp_renders_dir, exist_ok=True)
    sample_filename = f"sample_{tpl.template_id}_{uuid.uuid4().hex[:6]}.docx"
    output_path = os.path.join(temp_renders_dir, sample_filename)

    try:
        from backend.services.docx_engine import render_docx_template
        render_docx_template(
            template_path=full_tpl_path,
            data=sample_data,
            output_path=output_path,
            tracking_id="SAMPLE-PREVIEW"
        )
    except Exception as e:
        logger.error(f"Sample DOCX render error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate sample preview: {str(e)}")

    return FileResponse(
        path=output_path,
        filename=f"Sample_{tpl.name or 'Document'}.docx",
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )

@router.get("/{template_id}")
def get_template(template_id: str, db: Session = Depends(database.get_db)):
    """Get a single template by its unique template_id."""
    tpl = db.query(models.DBTemplate).filter(models.DBTemplate.template_id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    
    fields = json.loads(tpl.fields_json) if tpl.fields_json else {}
    field_order = json.loads(tpl.field_order_json) if tpl.field_order_json else []
    variables = field_order if isinstance(field_order, list) and field_order else list(fields.keys())
    
    # Parse field_order_json for metadata keys
    fo = json.loads(tpl.field_order_json) if tpl.field_order_json else {}
    identity_field = None
    secondary_field = None
    if isinstance(fo, dict):
        identity_field = fo.get("identity_field") or fo.get("document_identity_field")
        secondary_field = fo.get("secondary_field") or fo.get("document_secondary_field")
    if not identity_field and hasattr(tpl, "document_identity_field"):
        identity_field = tpl.document_identity_field
    if not secondary_field and hasattr(tpl, "document_secondary_field"):
        secondary_field = tpl.document_secondary_field

    return {
        "id": tpl.id,
        "template_id": tpl.template_id,
        "name": tpl.name,
        "category": tpl.category,
        "header": tpl.header,
        "content": tpl.content,
        "content2": tpl.content2,
        "footer": tpl.footer,
        "fields": fields,
        "fieldOrder": field_order if field_order else variables,
        "variables": variables,
        "is_active": tpl.is_active,
        "status": tpl.status,
        "file_path": tpl.file_path,
        "menu_item_id": tpl.menu_item_id,
        "document_identity_field": identity_field,
        "document_secondary_field": secondary_field,
        "identity_field": identity_field,
        "secondary_field": secondary_field,
        "credit_cost": tpl.credit_cost
    }

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_template(tpl: TemplateCreate, db: Session = Depends(database.get_db), admin: models.User = Depends(get_admin_user)):
    """Create a new template record in the database."""
    # Backend idempotency check: check if a template with the same file_path already exists
    if tpl.file_path:
        existing_tpl = db.query(models.DBTemplate).filter(
            models.DBTemplate.file_path == tpl.file_path
        ).first()
        if existing_tpl:
            logger.warning(f"Duplicate template creation prevented. Template with file_path '{tpl.file_path}' already exists.")
            return existing_tpl

    try:
        # Promote file from temp storage if it exists there
        if tpl.file_path:
            # Enforce basename isolation to prevent traversal during file promotion
            safe_filename = os.path.basename(tpl.file_path)
            temp_path = os.path.join(settings.TEMP_RENDERS_DIR, safe_filename)
            if os.path.exists(temp_path):
                dest_path = os.path.join(settings.TEMPLATE_STORAGE, safe_filename)
                shutil.move(temp_path, dest_path)
                logger.info(f"Promoted template file {safe_filename} from temp to permanent storage.")

        fo_str = tpl.field_order_json
        try:
            fo = json.loads(fo_str) if fo_str else {}
        except Exception:
            fo = {}
        
        if not isinstance(fo, dict):
            fo = {"single_variables": fo, "groups": {}}
        
        if tpl.identity_field:
            fo["identity_field"] = tpl.identity_field
        if tpl.secondary_field:
            fo["secondary_field"] = tpl.secondary_field
            
        field_order_json_merged = json.dumps(fo)

        new_id = f"tpl_{uuid.uuid4().hex[:8]}"
        db_tpl = models.DBTemplate(
            template_id=new_id,
            name=tpl.name,
            category=tpl.category,
            header=tpl.header,
            content=tpl.content,
            content2=tpl.content2,
            footer=tpl.footer,
            fields_json=tpl.fields_json,
            field_order_json=field_order_json_merged,
            is_active=tpl.is_active,
            file_path=tpl.file_path,
            menu_item_id=tpl.menu_item_id,
            document_identity_field=fo.get("identity_field"),
            document_secondary_field=fo.get("secondary_field"),
            credit_cost=tpl.credit_cost if tpl.credit_cost is not None else 10
        )
        db.add(db_tpl)
        db.commit()
        db.refresh(db_tpl)
        logger.info(f"[TEMPLATE SAVED] 🛡️ ADMIN [{admin.username}] CREATED template: {tpl.name} ({new_id})")
        return db_tpl
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating template: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create template: {str(e)}"
        )

@router.put("/{template_id}")
def update_template(template_id: str, tpl: TemplateUpdate, db: Session = Depends(database.get_db), admin: models.User = Depends(get_admin_user)):
    """Update an existing template's configuration or content."""
    db_tpl = db.query(models.DBTemplate).filter(models.DBTemplate.template_id == template_id).first()
    if not db_tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    
    try:
        update_data = tpl.model_dump(exclude_unset=True)
        # Check if file_path is updated and needs promotion
        if "file_path" in update_data and update_data["file_path"]:
            file_path = update_data["file_path"]
            # Enforce basename isolation to prevent traversal during file promotion
            safe_filename = os.path.basename(file_path)
            temp_path = os.path.join(settings.TEMP_RENDERS_DIR, safe_filename)
            if os.path.exists(temp_path):
                dest_path = os.path.join(settings.TEMPLATE_STORAGE, safe_filename)
                shutil.move(temp_path, dest_path)
                logger.info(f"Promoted template file {safe_filename} from temp to permanent storage for template {template_id}.")
                
                # Delete old template file physically from storage
                old_file_path = db_tpl.file_path
                if old_file_path and old_file_path != file_path:
                    old_full_path = os.path.join(settings.TEMPLATE_STORAGE, old_file_path)
                    if os.path.exists(old_full_path):
                        try:
                            os.remove(old_full_path)
                            logger.info(f"Deleted old file physically from storage: {old_full_path}")
                        except Exception as delete_err:
                            logger.error(f"Error deleting old file {old_full_path}: {delete_err}")

        fo_str = update_data.get("field_order_json") or db_tpl.field_order_json
        try:
            fo = json.loads(fo_str) if fo_str else {}
        except Exception:
            fo = {}
            
        if not isinstance(fo, dict):
            fo = {"single_variables": fo, "groups": {}}
            
        if "identity_field" in update_data:
            fo["identity_field"] = update_data["identity_field"]
        if "secondary_field" in update_data:
            fo["secondary_field"] = update_data["secondary_field"]
            
        update_data["field_order_json"] = json.dumps(fo)
        update_data["document_identity_field"] = fo.get("identity_field")
        update_data["document_secondary_field"] = fo.get("secondary_field")

        # Pop non-column elements
        update_data.pop("identity_field", None)
        update_data.pop("secondary_field", None)

        for key, value in update_data.items():
            setattr(db_tpl, key, value)
        
        db_tpl.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_tpl)
        logger.info(f"[TEMPLATE SAVED] 🛡️ ADMIN [{admin.username}] UPDATED template: {db_tpl.name} ({template_id})")
        return db_tpl
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating template: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update template: {str(e)}"
        )

@router.delete("/{template_id}")
def delete_template(template_id: str, db: Session = Depends(database.get_db), admin: models.User = Depends(get_admin_user)):
    """Soft-delete a template by setting is_active to False."""
    db_tpl = db.query(models.DBTemplate).filter(models.DBTemplate.template_id == template_id).first()
    if not db_tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    
    try:
        db_tpl.is_active = False
        db.commit()
        logger.info(f"Deactivated template: {template_id}")
        return {"success": True, "message": "Template deleted"}
    except Exception as e:
        logger.error(f"Error deleting template: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/upload-test")
def upload_test():
    """
    Public connectivity test for the upload endpoint.
    Call this to verify the backend is reachable before attempting file upload.
    """
    storage_ok = os.path.exists(template_service.storage_dir)
    return {
        "status": "ok",
        "storage_dir": template_service.storage_dir,
        "storage_exists": storage_ok,
        "message": "Upload endpoint is reachable. POST a .docx file to /api/templates/upload-docx"
    }


async def get_admin_template_upload(request: Request, db: Session = Depends(database.get_db)):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        logger.warning("Unauthorized template upload attempt: Missing or invalid token")
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = auth_header.split(" ")[1]
    try:
        from backend.services.auth_service import SECRET_KEY, ALGORITHM
        import jwt
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
    except Exception as e:
        logger.warning(f"Unauthorized template upload attempt: Token validation failed - {e}")
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    if not username:
        logger.warning("Unauthorized template upload attempt: Invalid token payload")
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        logger.warning("Unauthorized template upload attempt: User not found")
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    if not user.is_active:
        logger.warning(f"Unauthorized template upload attempt: User '{username}' is disabled")
        raise HTTPException(status_code=403, detail="Account is disabled")

    if not user.is_admin:
        logger.warning(f"Unauthorized template upload attempt: User '{username}' is not an admin")
        raise HTTPException(status_code=403, detail="Admin access required")
        
    return user

@router.post("/upload-docx")
async def upload_docx(
    file: UploadFile = File(...),
    template_id: Optional[str] = None,
    db: Session = Depends(database.get_db),
    admin: models.User = Depends(get_admin_template_upload)
):
    """
    Uploads a DOCX template file, extracts {{variable}} placeholders,
    saves the file temporarily in settings.TEMP_RENDERS_DIR,
    and returns variables to the frontend.
    Does NOT create a DBTemplate record.
    Does NOT insert anything into templates table.
    """
    logger.info(f"[UPLOAD-DOCX] Received: filename={repr(file.filename)}, template_id={repr(template_id)}")

    # 1. Filename validation
    if not file.filename:
        logger.warning("[UPLOAD-DOCX] REJECTED: empty filename")
        return JSONResponse(status_code=400, content={
            "success": False, "error": "No filename provided",
            "details": "The uploaded file has no filename."
        })

    ext = os.path.splitext(file.filename)[1].lower()
    if ext != '.docx':
        logger.warning(f"[UPLOAD-DOCX] REJECTED: bad extension '{ext}'")
        return JSONResponse(status_code=400, content={
            "success": False, "error": f"Invalid file type: '{ext}'",
            "details": "Only .docx files are accepted as DOCX templates."
        })

    # 2. Read file content
    try:
        content = await file.read()
        logger.info(f"[UPLOAD-DOCX] Read {len(content)} bytes")
    except Exception as e:
        logger.error(f"[UPLOAD-DOCX] READ ERROR: {e}\n{traceback.format_exc()}")
        return JSONResponse(status_code=500, content={
            "success": False, "error": "Failed to read uploaded file", "details": str(e)
        })

    if len(content) == 0:
        logger.warning("[UPLOAD-DOCX] REJECTED: empty file (0 bytes)")
        return JSONResponse(status_code=400, content={
            "success": False, "error": "File is empty",
            "details": "The uploaded DOCX file has 0 bytes. Please upload a valid Word document."
        })

    MAX_SIZE = 10 * 1024 * 1024  # 10MB
    if len(content) > MAX_SIZE:
        logger.warning(f"[UPLOAD-DOCX] REJECTED: file too large ({len(content)} bytes)")
        return JSONResponse(status_code=400, content={
            "success": False, "error": "File too large",
            "details": f"Max size is 10MB. Got {len(content)/1024/1024:.2f}MB."
        })

    # 3. Save file to disk temporarily
    try:
        temp_service = TemplateService(storage_dir=settings.TEMP_RENDERS_DIR)
        saved_filename = temp_service.save_uploaded_file(content, file.filename)
        full_path = temp_service.get_full_path(saved_filename)
        logger.info(f"[UPLOAD-DOCX] Saved temporarily to: {full_path} (internal: {saved_filename})")
    except Exception as e:
        logger.error(f"[UPLOAD-DOCX] SAVE ERROR: {e}\n{traceback.format_exc()}")
        return JSONResponse(status_code=500, content={
            "success": False, "error": "File save failed", "details": str(e)
        })

    # 4. Extract variables from DOCX
    try:
        from backend.services.docx_engine import extract_variables_from_docx
        variables = extract_variables_from_docx(full_path)
        logger.info(f"[UPLOAD-DOCX] Extracted variables: {variables}")
    except Exception as e:
        logger.error(f"[UPLOAD-DOCX] EXTRACTION ERROR: {e}\n{traceback.format_exc()}")
        variables = {"groups": {}, "single_variables": []}
        logger.warning(f"[UPLOAD-DOCX] Returning with 0 variables due to extraction error")

    # 5. Database lookup (READ ONLY) to merge variables if template exists
    existing_fields = {}
    db_template = None

    if template_id and template_id != 'temp' and not template_id.startswith('user_tpl_'):
        logger.info(f"[DB READ] Looking up template_id={template_id}")
        db_template = db.query(models.DBTemplate).filter(models.DBTemplate.template_id == template_id).first()

    # Extract all variables (singles and group variables)
    all_vars = []
    if isinstance(variables, dict):
        all_vars.extend(variables.get("single_variables", []))
        for group_fields in variables.get("groups", {}).values():
            if isinstance(group_fields, list):
                all_vars.extend(group_fields)
    elif isinstance(variables, list):
        all_vars = [v for v in variables if not v.startswith('#') and not v.startswith('/')]

    # Deduplicate while preserving order
    seen = set()
    deduped_vars = []
    for var in all_vars:
        if var not in seen:
            seen.add(var)
            deduped_vars.append(var)

    if db_template:
        logger.info(f"[DB READ] Found existing template: {db_template.template_id}")
        if db_template.fields_json:
            try:
                existing_fields = json.loads(db_template.fields_json)
            except Exception as e:
                logger.warning(f"[DB READ] Error parsing existing fields_json: {e}")
        
        # Merge new variables and default required status
        for var in deduped_vars:
            if var not in existing_fields:
                existing_fields[var] = {
                    "label": var.replace("_", " ").title(),
                    "type": "text",
                    "required": True
                }
            elif "required" not in existing_fields[var]:
                existing_fields[var]["required"] = True
    else:
        # Build initial fields config with default required = True
        for var in deduped_vars:
            existing_fields[var] = {
                "label": var.replace("_", " ").title(),
                "type": "text",
                "required": True
            }

    return {
        "success": True,
        "template_id": template_id,
        "docx_attached": True,
        "variables": variables,
        "filename": file.filename,
        "file_path": saved_filename,
        "name": db_template.name if db_template else os.path.splitext(file.filename)[0].replace("_", " ").title(),
        "category": db_template.category if db_template else "General",
        "menu_item_id": db_template.menu_item_id if db_template else None,
        "fields": existing_fields,
        "fieldOrder": variables,
        "_source": "db" if db_template else "local",
        "message": f"Uploaded successfully. {len(variables)} variable(s) found."
    }


@router.post("/upload")
@router.post("/extract-variables")
async def extract_variables(file: UploadFile = File(...), admin: models.User = Depends(get_admin_user)):
    """
    Handles template file uploads and extracts {{variable}} placeholders with heavy hardening.
    Ensures that failures return safe JSON instead of crashing the server.
    """
    logger.info(f"📁 UPLOAD INITIATED: filename={file.filename}, user={admin.username}")
    
    try:
        if not file.filename or not file.filename.lower().endswith(('.docx', '.html', '.txt')):
            logger.warning(f"⚠️ REJECTED: Invalid file type {file.filename}")
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Invalid file type",
                    "details": "Only .docx, .html, and .txt are supported."
                }
            )
        
        # Simple size validation (e.g., 5MB limit)
        MAX_SIZE = 5 * 1024 * 1024
        try:
            content = await file.read()
            if len(content) > MAX_SIZE:
                logger.warning(f"⚠️ REJECTED: File too large ({len(content)} bytes)")
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "error": "File too large",
                        "details": f"Maximum size is 5MB. Got {len(content)/1024/1024:.1f}MB"
                    }
                )
        except Exception as read_err:
            logger.error(f"❌ READ FAILED: {str(read_err)}")
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "Could not read uploaded file", "details": str(read_err)}
            )

        try:
            file_path = template_service.save_uploaded_file(content, file.filename)
            logger.info(f"✅ FILE SAVED: {file_path}")
        except Exception as save_err:
            logger.error(f"❌ SAVE FAILED: {str(save_err)}")
            return JSONResponse(
                status_code=500,
                content={"success": False, "error": "File save failed", "details": str(save_err)}
            )
        
        variables = {"groups": {}, "single_variables": []}
        try:
            text_content = None
            if file.filename.lower().endswith('.docx'):
                # Use specialized DOCX extractor (which is now hardened)
                logger.info(f"⚙️ EXTRACTING DOCX: {file_path}")
                # We call the service which calls document_service.extract_variables_from_docx
                variables = template_service.extract_variables(file_path)
            else:
                # Simple regex extractor for text-based files
                logger.info(f"⚙️ EXTRACTING TEXT: {file_path}")
                text_content = content.decode('utf-8', errors='ignore')
                variables = template_service.extract_variables(file_path)
            
            total_vars = 0
            if isinstance(variables, dict):
                total_vars = len(variables.get("single_variables", [])) + sum(len(g) for g in variables.get("groups", {}).values())
            else:
                total_vars = len(variables)

            logger.info(f"[VARIABLES DETECTED] Found {total_vars} variables in {file.filename}")
            return {
                "success": True,
                "filename": file.filename,
                "variables": variables,
                "file_path": file_path,
                "content": text_content
            }
        except Exception as extract_err:
            logger.error(f"❌ EXTRACTION FAILED: {str(extract_err)}")
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "DOCX extraction failed", "details": str(extract_err)}
            )

    except Exception as e:
        logger.critical(f"🔥 UNEXPECTED UPLOAD ERROR: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Server error during upload",
                "details": str(e)
            }
        )


@router.post("/process")
def process_template(template_id: str, data: dict, db: Session = Depends(database.get_db)):
    """
    Placeholder for template processing/merging logic.
    Actual merging usually happens in document_service.
    """
    return {"success": True, "message": "Template metadata processed"}


@router.get("/{template_id}/download-docx")
def download_docx(template_id: str, db: Session = Depends(database.get_db)):
    """Download the original uploaded DOCX template."""
    tpl = db.query(models.DBTemplate).filter(models.DBTemplate.template_id == template_id).first()
    if not tpl or not tpl.is_active:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if not tpl.file_path:
        raise HTTPException(status_code=404, detail="No DOCX file associated with this template")
    
    file_path = template_service.get_full_path(tpl.file_path)
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Physical DOCX file not found in storage")
    
    filename = tpl.name
    if not filename.lower().endswith(".docx"):
        filename = f"{filename}.docx"
        
    return FileResponse(
        path=file_path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=filename
    )


@router.post("/{template_id}/replace-docx")
async def replace_docx(
    template_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    admin: models.User = Depends(get_admin_user)
):
    """
    Replace the DOCX file for an existing template.
    Physically deletes the old DOCX file from storage, saves the new one,
    re-extracts variables, updates fields/field_order, and detects if variables changed.
    """
    logger.info(f"[REPLACE-DOCX] Received replacement for template_id={template_id} from admin={admin.username}")

    # 1. Look up the existing template
    db_tpl = db.query(models.DBTemplate).filter(models.DBTemplate.template_id == template_id).first()
    if not db_tpl or not db_tpl.is_active:
        raise HTTPException(status_code=404, detail="Template not found")

    # 2. Filename and extension validation
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext != '.docx':
        raise HTTPException(status_code=400, detail="Only .docx files are accepted as template replacements")

    # 3. Read content and size check
    try:
        content = await file.read()
    except Exception as e:
        logger.error(f"[REPLACE-DOCX] Read error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    MAX_SIZE = 10 * 1024 * 1024  # 10MB
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail=f"File exceeds 10MB limit. Got {len(content)/1024/1024:.2f}MB")

    # 4. Save new file to disk
    try:
        new_saved_filename = template_service.save_uploaded_file(content, file.filename)
        new_full_path = template_service.get_full_path(new_saved_filename)
        logger.info(f"[REPLACE-DOCX] Saved new file to: {new_full_path}")
    except Exception as e:
        logger.error(f"[REPLACE-DOCX] Save error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # 5. Extract variables from the new DOCX
    try:
        from backend.services.docx_engine import extract_variables_from_docx
        new_variables = extract_variables_from_docx(new_full_path)
    except Exception as e:
        logger.error(f"[REPLACE-DOCX] Extraction error: {e}")
        # Clean up the saved file on failure to prevent orphaned files
        if os.path.exists(new_full_path):
            os.remove(new_full_path)
        raise HTTPException(status_code=400, detail=f"Failed to extract variables from the new file: {str(e)}")

    # 6. Check if variables changed
    variables_changed = False
    if db_tpl.field_order_json:
        try:
            old_variables = json.loads(db_tpl.field_order_json)
            if old_variables != new_variables:
                variables_changed = True
        except Exception as parse_err:
            logger.warning(f"[REPLACE-DOCX] Error parsing old field_order_json: {parse_err}")
            variables_changed = True
    else:
        variables_changed = True

    # 7. Delete the old DOCX file physically from storage
    old_file_path = db_tpl.file_path
    if old_file_path:
        old_full_path = template_service.get_full_path(old_file_path)
        if old_full_path and os.path.exists(old_full_path) and old_file_path != new_saved_filename:
            try:
                os.remove(old_full_path)
                logger.info(f"[REPLACE-DOCX] Deleted old file physically from storage: {old_full_path}")
            except Exception as delete_err:
                logger.error(f"[REPLACE-DOCX] Error deleting old file {old_full_path}: {delete_err}")

    # 8. Update database record
    existing_fields = {}
    if db_tpl.fields_json:
        try:
            existing_fields = json.loads(db_tpl.fields_json)
        except Exception as e:
            logger.warning(f"[REPLACE-DOCX] Error parsing existing fields_json: {e}")

    # Merge new variables and default to required=True
    all_new_vars = []
    if isinstance(new_variables, dict):
        all_new_vars.extend(new_variables.get("single_variables", []))
        for group_fields in new_variables.get("groups", {}).values():
            if isinstance(group_fields, list):
                all_new_vars.extend(group_fields)
    elif isinstance(new_variables, list):
        all_new_vars = [v for v in new_variables if not v.startswith('#') and not v.startswith('/')]

    seen_new = set()
    deduped_new_vars = []
    for var in all_new_vars:
        if var not in seen_new:
            seen_new.add(var)
            deduped_new_vars.append(var)

    for var in deduped_new_vars:
        if var not in existing_fields:
            existing_fields[var] = {
                "label": var.replace("_", " ").title(),
                "type": "text",
                "required": True
            }
        elif "required" not in existing_fields[var]:
            existing_fields[var]["required"] = True
            
    db_tpl.file_path = new_saved_filename
    db_tpl.field_order_json = json.dumps(new_variables)
    db_tpl.fields_json = json.dumps(existing_fields)
    db_tpl.updated_at = datetime.utcnow()

    try:
        db.commit()
        db.refresh(db_tpl)
        logger.info(f"[REPLACE-DOCX] Database updated successfully for template {template_id}")
    except Exception as db_err:
        db.rollback()
        logger.error(f"[REPLACE-DOCX] DB update error: {db_err}")
        raise HTTPException(status_code=500, detail=f"Database update failed: {str(db_err)}")

    # Return refreshed template data & whether variables changed
    fields = json.loads(db_tpl.fields_json) if db_tpl.fields_json else {}
    field_order = json.loads(db_tpl.field_order_json) if db_tpl.field_order_json else []
    variables_list = field_order if field_order else list(fields.keys())

    return {
        "success": True,
        "variables_changed": variables_changed,
        "template": {
            "id": db_tpl.id,
            "template_id": db_tpl.template_id,
            "name": db_tpl.name,
            "category": db_tpl.category,
            "header": db_tpl.header,
            "content": db_tpl.content,
            "content2": db_tpl.content2,
            "footer": db_tpl.footer,
            "fields": fields,
            "fieldOrder": field_order if field_order else variables_list,
            "variables": variables_list,
            "is_active": db_tpl.is_active,
            "status": db_tpl.status,
            "file_path": db_tpl.file_path,
            "menu_item_id": db_tpl.menu_item_id,
            "created_at": db_tpl.created_at,
            "updated_at": db_tpl.updated_at
        }
    }
