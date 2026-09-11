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
            return {"groups": {}, "single_variables": [], "order": []}
            
        if file_path.endswith('.docx'):
            from backend.services.docx_engine import extract_variables_from_docx
            return extract_variables_from_docx(file_path)
        
        # Fallback for non-docx files (handled in router usually, but here for safety)
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
            
            import jinja2
            import jinja2.meta

            loop_pattern = re.compile(r'{%\s*(?:tr|tc|p)?\s*for\s+(\w+)\s+in\s+(\w+)\s*%}')
            var_pattern = re.compile(r'\{\{([^}]+)\}\}')
            if_pattern = re.compile(r'{%\s*(?:tr|tc|p)?\s*(?:if|elif)\s+([^%]+)%}')
            
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
            order = []
            order_set = set()

            items = []
            for m in loop_pattern.finditer(text):
                items.append((m.start(), 'loop', m.group(2).strip(), m.group(1).strip()))
            for m in var_pattern.finditer(text):
                items.append((m.start(), 'var', m.group(1).strip(), None))
            for m in if_pattern.finditer(text):
                cond = m.group(1).strip()
                try:
                    ast = jinja2.Environment().parse(f'{{% if {cond} %}}{{% endif %}}')
                    vars_in_cond = jinja2.meta.find_undeclared_variables(ast)
                    for v in vars_in_cond:
                        items.append((m.start(), 'if_var', v, None))
                except Exception:
                    tokens = re.findall(r'[a-zA-Z0-9_\u0A80-\u0AFF]+', cond)
                    for tok in tokens:
                        if tok not in {'if', 'elif', 'else', 'endif', 'and', 'or', 'not', 'in', 'is', 'True', 'False', 'None'}:
                            items.append((m.start(), 'if_var', tok, None))

            items.sort(key=lambda x: x[0])

            for item in items:
                kind = item[1]
                if kind == 'loop':
                    group = item[2]
                    if group not in order_set:
                        order_set.add(group)
                        order.append(group)
                elif kind == 'var':
                    var_content = item[2]
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
                            if var_content not in order_set:
                                order_set.add(var_content)
                                order.append(var_content)
                    else:
                        if var_content not in iterators:
                            if var_content not in single_variables_set:
                                single_variables_set.add(var_content)
                                single_variables.append(var_content)
                            if var_content not in order_set:
                                order_set.add(var_content)
                                order.append(var_content)
                elif kind == 'if_var':
                    var_name = item[2]
                    if var_name not in iterators and var_name not in detected_groups_set:
                        if var_name not in single_variables_set:
                            single_variables_set.add(var_name)
                            single_variables.append(var_name)
                        if var_name not in order_set:
                            order_set.add(var_name)
                            order.append(var_name)
                        
            return {
                "groups": groups,
                "single_variables": single_variables,
                "order": order
            }
        except Exception as e:
            logger.error(f"Error reading file for variables: {e}")
            return {"groups": {}, "single_variables": [], "order": []}


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
