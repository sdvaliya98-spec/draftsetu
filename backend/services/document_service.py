"""
document_service.py — Backward-Compatible Shim
================================================
The canonical document rendering logic now lives in:
  backend/services/docx_engine.py

This file re-exports the functions for any code that still imports from here.
Do NOT add new rendering logic here — use docx_engine.py instead.
"""

from backend.services.docx_engine import (
    extract_variables_from_docx,
    render_docx_template,
    convert_docx_to_pdf,
    libreoffice_available,
)
import os
import uuid
import logging
from backend.core.config import settings

logger = logging.getLogger("backend.document_service")


def merge_document_data(template_path: str, data: dict, tracking_id: str, output_dir: str = None) -> str:
    """
    Backward-compatible wrapper around render_docx_template().
    Called by legacy code paths (e.g., document lock on PUT endpoint).
    """
    if output_dir is None:
        output_dir = settings.OUTPUT_DIR
    os.makedirs(output_dir, exist_ok=True)

    output_filename = f"{tracking_id}_document.docx"
    output_path = os.path.join(output_dir, output_filename)

    return render_docx_template(
        template_path=template_path,
        data=data,
        output_path=output_path,
        tracking_id=tracking_id,
    )
