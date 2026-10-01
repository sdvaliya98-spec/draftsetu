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
        if os.path.exists(filename):
            return os.path.normpath(os.path.abspath(filename))
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
            endfor_pattern = re.compile(r'{%\s*(?:tr|tc|p)?\s*endfor\s*%}')
            if_pattern = re.compile(r'{%\s*(?:tr|tc|p)?\s*if\s+([^%]+)%}')
            elif_pattern = re.compile(r'{%\s*(?:tr|tc|p)?\s*elif\s+([^%]+)%}')
            else_pattern = re.compile(r'{%\s*(?:tr|tc|p)?\s*else\s*%}')
            endif_pattern = re.compile(r'{%\s*(?:tr|tc|p)?\s*endif\s*%}')
            var_pattern = re.compile(r'\{\{([^}]+)\}\}')

            def _parse_condition(cond_raw: str) -> dict:
                if not cond_raw:
                    return {}
                cond_clean = (
                    cond_raw.replace('\u201c', '"')
                    .replace('\u201d', '"')
                    .replace('\u2018', "'")
                    .replace('\u2019', "'")
                    .replace('\xa0', ' ')
                    .strip()
                )
                cond_clean = cond_clean.strip('() ')
                m = re.match(r'^\s*([a-zA-Z0-9_\u0A80-\u0AFF]+)\s*(==|!=)\s*["\']?([^"\']+)["\']?\s*$', cond_clean)
                if m:
                    return {"field": m.group(1), "op": m.group(2), "value": m.group(3).strip('"\' ')}
                m = re.match(r'^\s*["\']?([^"\']+)["\']?\s*(==|!=)\s*([a-zA-Z0-9_\u0A80-\u0AFF]+)\s*$', cond_clean)
                if m:
                    return {"field": m.group(3), "op": m.group(2), "value": m.group(1).strip('"\' ')}
                m = re.match(r'^\s*([a-zA-Z0-9_\u0A80-\u0AFF]+)\s*$', cond_clean)
                if m and m.group(1) not in {'True', 'False', 'None', 'and', 'or', 'not'}:
                    return {"field": m.group(1), "op": "==", "value": "True"}
                return {"raw": cond_clean}

            detected_groups = []
            detected_groups_set = set()
            for m in loop_pattern.finditer(text):
                group = m.group(2).strip()
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

            loop_stack = []
            all_seen_iterators = {}
            if_stack = []
            unconditional_seen = set()
            conditions = {}

            items = []
            for m in loop_pattern.finditer(text):
                items.append((m.start(), 'loop_start', m.group(2).strip(), m.group(1).strip()))
            for m in endfor_pattern.finditer(text):
                items.append((m.start(), 'loop_end', None, None))
            for m in if_pattern.finditer(text):
                items.append((m.start(), 'if_start', m.group(1).strip(), None))
            for m in elif_pattern.finditer(text):
                items.append((m.start(), 'elif', m.group(1).strip(), None))
            for m in else_pattern.finditer(text):
                items.append((m.start(), 'else', None, None))
            for m in endif_pattern.finditer(text):
                items.append((m.start(), 'endif', None, None))
            for m in var_pattern.finditer(text):
                items.append((m.start(), 'var', m.group(1).strip(), None))

            items.sort(key=lambda x: x[0])

            for item in items:
                kind = item[1]
                if kind in ('if_start', 'elif'):
                    cond_raw = item[2]
                    cond_clean = (
                        cond_raw.replace('\u201c', '"')
                        .replace('\u201d', '"')
                        .replace('\u2018', "'")
                        .replace('\u2019', "'")
                        .replace('\xa0', ' ')
                    )
                    try:
                        ast = jinja2.Environment().parse(f'{{% if {cond_clean} %}}{{% endif %}}')
                        vars_in_cond = jinja2.meta.find_undeclared_variables(ast)
                    except Exception:
                        tokens = re.findall(r'[a-zA-Z0-9_\u0A80-\u0AFF]+', cond_clean)
                        vars_in_cond = [
                            tok for tok in tokens
                            if tok not in {'if', 'elif', 'else', 'endif', 'and', 'or', 'not', 'in', 'is', 'True', 'False', 'None'}
                        ]

                    for v in vars_in_cond:
                        if v not in detected_groups_set:
                            if v not in single_variables_set:
                                single_variables_set.add(v)
                                single_variables.append(v)
                            if v not in order_set:
                                order_set.add(v)
                                order.append(v)
                            unconditional_seen.add(v)

                    cond_obj = _parse_condition(cond_clean)
                    if kind == 'if_start':
                        if_stack.append(cond_obj)
                    else:
                        if if_stack:
                            if_stack[-1] = cond_obj
                        else:
                            if_stack.append(cond_obj)

                elif kind == 'else':
                    if if_stack:
                        prev = if_stack[-1]
                        if isinstance(prev, dict) and prev.get("op") == "==":
                            if_stack[-1] = {"field": prev["field"], "op": "!=", "value": prev["value"]}
                        else:
                            if_stack[-1] = {"raw": "else"}

                elif kind == 'endif':
                    if if_stack:
                        if_stack.pop()

                elif kind == 'loop_start':
                    group = item[2]
                    iterator = item[3]
                    loop_stack.append((iterator, group))
                    all_seen_iterators.setdefault(iterator, []).append(group)
                    if group not in order_set:
                        order_set.add(group)
                        order.append(group)

                    current_cond = if_stack[-1] if if_stack else None
                    if not current_cond:
                        unconditional_seen.add(group)
                    else:
                        if group not in conditions:
                            conditions[group] = current_cond

                elif kind == 'loop_end':
                    if loop_stack:
                        loop_stack.pop()

                elif kind == 'var':
                    var_content = item[2]
                    current_cond = if_stack[-1] if if_stack else None

                    if '.' in var_content:
                        parts = var_content.split('.', 1)
                        prefix = parts[0].strip()
                        field_name = parts[1].strip()

                        target_group = None
                        for it, grp in reversed(loop_stack):
                            if it == prefix:
                                target_group = grp
                                break

                        if not target_group and prefix in all_seen_iterators:
                            target_group = all_seen_iterators[prefix][-1]

                        if target_group and target_group in groups:
                            if field_name not in groups_seen[target_group]:
                                groups_seen[target_group].add(field_name)
                                groups[target_group].append(field_name)
                        else:
                            if var_content not in single_variables_set:
                                single_variables_set.add(var_content)
                                single_variables.append(var_content)
                            if var_content not in order_set:
                                order_set.add(var_content)
                                order.append(var_content)
                            if not current_cond:
                                unconditional_seen.add(var_content)
                            else:
                                if var_content not in unconditional_seen and var_content not in conditions:
                                    conditions[var_content] = current_cond
                    else:
                        is_iter = any(it == var_content for it, _ in loop_stack) or (var_content in all_seen_iterators)
                        if not is_iter:
                            if var_content not in single_variables_set:
                                single_variables_set.add(var_content)
                                single_variables.append(var_content)
                            if var_content not in order_set:
                                order_set.add(var_content)
                                order.append(var_content)
                            if not current_cond:
                                unconditional_seen.add(var_content)
                            else:
                                if var_content not in unconditional_seen and var_content not in conditions:
                                    conditions[var_content] = current_cond

            return {
                "groups": groups,
                "single_variables": single_variables,
                "order": order,
                "conditions": conditions
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
