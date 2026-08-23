import os
import re
import uuid
from typing import List, Dict
from docx import Document

from backend.core.config import settings
from backend.utils.maintenance import sanitize_filename

import logging

logger = logging.getLogger("backend.template_service")

class TemplateService:
    def __init__(self, storage_dir: str = None):
        self.storage_dir = storage_dir or settings.TEMPLATE_STORAGE
        os.makedirs(self.storage_dir, exist_ok=True)

    def get_full_path(self, filename: str) -> str:
        if not filename:
            return None
        # Enforce basename isolation to prevent directory traversal
        safe_filename = os.path.basename(filename)
        return os.path.normpath(os.path.join(self.storage_dir, safe_filename))

    def extract_variables(self, filename: str) -> dict:
        """Extracts variables and Jinja2 loops from a file using docx_engine/fallback."""
        file_path = self.get_full_path(filename)
        if not file_path or not os.path.exists(file_path):
            return {"groups": {}, "single_variables": []}
            
        if file_path.endswith('.docx'):
            from backend.services.document_service import extract_variables_from_docx
            return extract_variables_from_docx(file_path)
        
        # Fallback for non-docx files (handled in router usually, but here for safety)
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
            
            loop_pattern = re.compile(r'{%\s*for\s+(\w+)\s+in\s+(\w+)\s*%}')
            var_pattern = re.compile(r'\{\{([^}]+)\}\}')
            
            iterators = {}
            detected_groups = []
            detected_groups_set = set()
            for m in loop_pattern.finditer(text):
                iterator = m.group(1).strip()
                group = m.group(2).strip()
                iterators[iterator] = group
                if group not in detected_groups_set:
                    detected_groups_set.add(group)
                    detected_groups.append(group)
                    logger.info(f"[LOOP DETECTED] {group}")
                    
            groups = {g: [] for g in detected_groups}
            groups_seen = {g: set() for g in detected_groups}
            single_variables = []
            single_variables_set = set()
            
            for m in var_pattern.finditer(text):
                var_content = m.group(1).strip()
                if '.' in var_content:
                    parts = var_content.split('.', 1)
                    prefix = parts[0].strip()
                    field_name = parts[1].strip()
                    if prefix in iterators:
                        g = iterators[prefix]
                        if field_name not in groups_seen[g]:
                            groups_seen[g].add(field_name)
                            groups[g].append(field_name)
                    else:
                        if var_content not in single_variables_set:
                            single_variables_set.add(var_content)
                            single_variables.append(var_content)
                else:
                    if var_content not in iterators:
                        if var_content not in single_variables_set:
                            single_variables_set.add(var_content)
                            single_variables.append(var_content)
                        
            return {
                "groups": groups,
                "single_variables": single_variables
            }
        except Exception as e:
            logger.error(f"Error reading file for variables: {e}")
            return {"groups": {}, "single_variables": []}


    def save_uploaded_file(self, content: bytes, filename: str) -> str:
        """Saves file to storage and returns the new filename."""
        sanitized_original = sanitize_filename(filename)
        ext = os.path.splitext(sanitized_original)[1]
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(self.storage_dir, unique_filename)
        try:
            with open(file_path, "wb") as f:
                f.write(content)
            return unique_filename
        except Exception as e:
            logger.error(f"Error saving file: {e}")
            raise e

template_service = TemplateService()
