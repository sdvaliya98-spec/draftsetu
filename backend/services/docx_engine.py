"""
DOCX Template Engine — Canonical Document Generation Service
============================================================
Architecture: DOCX Template → Variable Fill (docxtpl/Jinja2) → Output DOCX → [Word COM / LibreOffice → PDF]

PDF Engine Priority:
  1. Microsoft Word COM via docx2pdf (Windows — perfect Gujarati font fidelity)
  2. LibreOffice headless subprocess (cross-platform fallback)

This module is the SINGLE source of truth for document rendering.
NO HTML rendering. NO browser printing. NO CSS layout approximations.
"""

import os
import re
import uuid
import time
import shutil
import logging
import zipfile
import subprocess
import threading
from typing import Optional
from pathlib import Path

from docx import Document
from docx.oxml import OxmlElement
from docxtpl import DocxTemplate
from backend.core.config import settings

logger = logging.getLogger("backend.docx_engine")

from docx.text.paragraph import Paragraph
from docx.table import Table

# Concurrency protection: limit simultaneous heavy renders
RENDER_LOCK = threading.Semaphore(3)

# Fast memoization cache for DOCX variable extraction: (file_path, mtime) -> dict
_DOCX_VAR_CACHE = {}


# ─── JINJA2 / DOCXTPL XML NORMALIZATION ──────────────────────────────────────

def normalize_jinja_xml(src_xml: str) -> str:
    """
    Normalizes DOCX XML for robust Jinja2 / docxtpl parsing across all Word XML parts.
    1. Consolidates split runs within Jinja tag delimiters {{...}}, {%...%}, {#...#}.
    2. Normalizes non-breaking spaces (\\xa0, &#160;, &nbsp;) to standard ASCII spaces within tags.
    3. Normalizes smart quotes (“,”,‘,’) to ASCII (\" and ') within tags.
    4. Normalizes whitespace and prefix variations:
       - {% p if ... %} -> {%p if ... %}
       - {%pif ... %} -> {%p if ... %}
       - {%pendif%} -> {%p endif %}
       - {%pendfor%} -> {%p endfor %}
       - same for tr, tc, r
    5. Upgrades standalone control tags inside a paragraph that lack 'p' (e.g. {% if ... %})
       so docxtpl properly strips paragraph wrappers and avoids empty paragraphs or syntax errors.
    """
    if not src_xml:
        return src_xml

    # Step 1: Strip XML tags and spaces that break delimiters: {<tags>{, {<tags>%, %<tags>}, }<tags>}
    src_xml = re.sub(
        r"(?<=\{)(?:<[^>]*>|\s)+(?=[\{%\#])|(?<=[\%\}\#])(?:<[^>]*>|\s)+(?=\})",
        "",
        src_xml,
        flags=re.DOTALL
    )

    # Step 2: Consolidate text runs inside Jinja tags {{...}}, {%...%}, {#...#}
    def consolidate_tag_runs(match):
        tag_text = match.group(0)
        stripped = re.sub(r"</w:t>.*?(?:<w:t>|<w:t [^>]*>)", "", tag_text, flags=re.DOTALL)
        return stripped

    src_xml = re.sub(
        r"{%(?:(?!%}).)*%}|{#(?:(?!#}).)*#}|{{(?:(?!}}).)*}}",
        consolidate_tag_runs,
        src_xml,
        flags=re.DOTALL
    )

    # Step 3: Inside all Jinja tags, clean smart quotes, nbsp, entities, and prefix spacing
    def clean_tag_contents(m):
        content = m.group(0)
        content = content.replace("\xa0", " ").replace("&#160;", " ").replace("&nbsp;", " ")
        content = (
            content
            .replace("“", '"')
            .replace("”", '"')
            .replace("‘", "'")
            .replace("’", "'")
            .replace("&#8216;", "'")
            .replace("&#8217;", "'")
            .replace("&#8220;", '"')
            .replace("&#8221;", '"')
            .replace("&ldquo;", '"')
            .replace("&rdquo;", '"')
            .replace("&lsquo;", "'")
            .replace("&rsquo;", "'")
        )
        # Normalize spacing for docxtpl tags: p, tr, tc, r
        content = re.sub(r"^(\{[%{])\s*(p|tr|tc|r)\s+", r"\1\2 ", content)
        # Handle cases with no space after prefix: {%pif ... %} -> {%p if ... %}
        content = re.sub(
            r"^(\{[%{])\s*(p|tr|tc|r)(if|elif|else|endif|for|endfor)\b",
            r"\1\2 \3 ",
            content
        )
        # Handle standalone {%pendif%} or {%pendfor%} with trailing %}:
        content = re.sub(
            r"^(\{[%{])\s*(p|tr|tc|r)(endif|endfor)\s*(%\}|\}\})",
            r"\1\2 \3 \4",
            content
        )
        # Ensure clean closing spacing: {% endif%} -> {% endif %}
        content = re.sub(r"([^\s%])%\}$", r"\1 %}", content)
        content = re.sub(r"([^\s\}])\}\}$", r"\1 }}", content)
        return content

    src_xml = re.sub(
        r"\{[%{](?:(?![%\}]\}).)*[%\}]\}",
        clean_tag_contents,
        src_xml,
        flags=re.DOTALL
    )

    return src_xml


def repair_docx_openxml_integrity(docx_doc) -> int:
    """
    Repairs OpenXML schema violations in a python-docx Document object.

    ECMA-376 / ISO/IEC 29500 mandates that:
    1. Every table cell (<w:tc>) MUST contain at least one block-level element
       (typically a paragraph <w:p> or table <w:tbl>). When docxtpl / Jinja tags
       (e.g., {%p for ... %} or {%p if ... %}) expand to empty, docxtpl removes
       all paragraphs from the cell, leaving only <w:tcPr>.
       Microsoft Word strictly enforces this rule and will refuse to open the
       file, reporting: "The file appears to be corrupted".
    2. Table rows (<w:tr>) must contain at least one cell (<w:tc>).
    3. Tables (<w:tbl>) must contain at least one row (<w:tr>).
    4. Headers (<w:hdr>) and footers (<w:ftr>) must contain at least one block-level element (<w:p>).

    This function traverses document body, headers, and footers to ensure schema compliance,
    preventing Word COM and LibreOffice corruption errors.
    """
    if not docx_doc or not hasattr(docx_doc, "_element"):
        return 0

    elements_to_check = [docx_doc._element]
    if hasattr(docx_doc, "sections"):
        for s in docx_doc.sections:
            for part in (
                getattr(s, "header", None),
                getattr(s, "footer", None),
                getattr(s, "first_page_header", None),
                getattr(s, "first_page_footer", None),
                getattr(s, "even_page_header", None),
                getattr(s, "even_page_footer", None),
            ):
                if part is not None and hasattr(part, "_element"):
                    elements_to_check.append(part._element)

    repaired_cells = 0
    for el in elements_to_check:
        try:
            # 1. Prune empty rows that have no cells
            for tr in el.xpath(".//w:tr"):
                if not tr.xpath("./w:tc"):
                    parent = tr.getparent()
                    if parent is not None:
                        parent.remove(tr)

            # 2. Prune empty tables that have no rows
            for tbl in el.xpath(".//w:tbl"):
                if not tbl.xpath("./w:tr"):
                    parent = tbl.getparent()
                    if parent is not None:
                        parent.remove(tbl)

            # 3. Ensure all table cells have at least one block-level element (w:p or w:tbl)
            for tc in el.xpath(".//w:tc"):
                if not tc.xpath("./w:p | ./w:tbl"):
                    tc.append(OxmlElement("w:p"))
                    repaired_cells += 1

            # 4. Ensure header/footer has at least one paragraph
            tag = el.tag.split("}")[-1] if "}" in el.tag else el.tag
            if tag in ("hdr", "ftr") and not el.xpath("./w:p | ./w:tbl"):
                el.append(OxmlElement("w:p"))
        except Exception as e:
            logger.warning(f"Error checking OpenXML schema element: {e}")

    if repaired_cells > 0:
        logger.info(f"🛡️ Repaired {repaired_cells} empty table cell(s) for OpenXML schema compliance.")

    return repaired_cells


class DraftSetuDocxTemplate(DocxTemplate):
    """
    Subclass of DocxTemplate with XML preprocessing for robust paragraph-level
    and run-split Jinja tag rendering across body, headers, footers, and footnotes,
    and OpenXML schema integrity repair on save.
    """
    def patch_xml(self, src_xml):
        src_xml = normalize_jinja_xml(src_xml)
        return super().patch_xml(src_xml)

    def pre_processing(self):
        super().pre_processing()
        if hasattr(self, "docx") and self.docx is not None:
            repair_docx_openxml_integrity(self.docx)


# ─── VARIABLE EXTRACTION ────────────────────────────────────────────────────

def extract_variables_from_docx(file_path: str) -> dict:
    """
    Extracts all variables and Jinja2 loops from a .docx file preserving exact document order.
    Scans headers, body paragraphs & tables in true XML order, and footers.
    Supports repeater block tags: {% for x in X %} and {% endfor %} with scoped loop tracking.
    Returns a dictionary containing "groups", "single_variables", and "order".
    """
    if not file_path or not os.path.exists(file_path):
        logger.error(f"❌ File not found: {file_path}")
        return {"groups": {}, "single_variables": [], "order": []}

    try:
        mtime = os.path.getmtime(file_path)
        cache_key = (file_path, mtime)
        if cache_key in _DOCX_VAR_CACHE:
            return _DOCX_VAR_CACHE[cache_key]
    except Exception:
        cache_key = None

    loop_pattern = re.compile(r'{%\s*(?:tr|tc|p)?\s*for\s+([a-zA-Z0-9_\u0A80-\u0AFF]+)\s+in\s+([a-zA-Z0-9_\u0A80-\u0AFF]+)\s*%}')
    endfor_pattern = re.compile(r'{%\s*(?:tr|tc|p)?\s*endfor\s*%}')
    if_pattern = re.compile(r'{%\s*(?:tr|tc|p)?\s*if\s+([^%]+)%}')
    elif_pattern = re.compile(r'{%\s*(?:tr|tc|p)?\s*elif\s+([^%]+)%}')
    else_pattern = re.compile(r'{%\s*(?:tr|tc|p)?\s*else\s*%}')
    endif_pattern = re.compile(r'{%\s*(?:tr|tc|p)?\s*endif\s*%}')
    var_pattern = re.compile(r'\{\{([^}]+)\}\}')

    all_texts: list[str] = []

    logger.info(f"🔍 EXTRACTING VARIABLES: {os.path.basename(file_path)}")

    def scan_text(text: str):
        if text:
            all_texts.append(text)

    def scan_paragraph(p):
        scan_text(p.text)

    def scan_table(table):
        for row in table.rows:
            for cell in row.cells:
                for child in cell._tc:
                    if child.tag.endswith('p'):
                        p = Paragraph(child, table)
                        scan_paragraph(p)
                    elif child.tag.endswith('tbl'):
                        nested = Table(child, table)
                        scan_table(nested)

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
        # Match VAR == 'VAL' or VAR != 'VAL' (with optional quotes)
        m = re.match(r'^\s*([a-zA-Z0-9_\u0A80-\u0AFF]+)\s*(==|!=)\s*["\']?([^"\']+)["\']?\s*$', cond_clean)
        if m:
            return {"field": m.group(1), "op": m.group(2), "value": m.group(3).strip('"\' ')}
        # Match 'VAL' == VAR or 'VAL' != VAR (with optional quotes)
        m = re.match(r'^\s*["\']?([^"\']+)["\']?\s*(==|!=)\s*([a-zA-Z0-9_\u0A80-\u0AFF]+)\s*$', cond_clean)
        if m:
            return {"field": m.group(3), "op": m.group(2), "value": m.group(1).strip('"\' ')}
        # Match single boolean var: e.g. IS_ACTIVE
        m = re.match(r'^\s*([a-zA-Z0-9_\u0A80-\u0AFF]+)\s*$', cond_clean)
        if m and m.group(1) not in {'True', 'False', 'None', 'and', 'or', 'not'}:
            return {"field": m.group(1), "op": "==", "value": "True"}
        return {"raw": cond_clean}

    try:
        import jinja2
        import jinja2.meta

        doc = Document(file_path)
        logger.info(f"✅ Opened DOCX: {len(doc.paragraphs)} paragraphs, {len(doc.tables)} tables")

        # 1. Scan headers
        for section in doc.sections:
            try:
                for p in section.header.paragraphs:
                    scan_paragraph(p)
                for t in section.header.tables:
                    scan_table(t)
            except Exception as e:
                logger.debug(f"Header scan skip: {e}")

        # 2. Scan main body in true XML document order
        for child in doc.element.body:
            if child.tag.endswith('p'):
                p = Paragraph(child, doc)
                scan_paragraph(p)
            elif child.tag.endswith('tbl'):
                t = Table(child, doc)
                scan_table(t)

        # 3. Scan footers
        for section in doc.sections:
            try:
                for p in section.footer.paragraphs:
                    scan_paragraph(p)
                for t in section.footer.tables:
                    scan_table(t)
            except Exception as e:
                logger.debug(f"Footer scan skip: {e}")

        # Pass 1: Collect all detected loop groups in order of appearance (deduplicated)
        detected_groups = []
        detected_groups_set = set()
        for text in all_texts:
            for m in loop_pattern.finditer(text):
                group = m.group(2).strip()
                if group not in detected_groups_set:
                    detected_groups_set.add(group)
                    detected_groups.append(group)
                    logger.info(f"[LOOP DETECTED] {group}")

        # Pass 2: Sequential document scan with active loop stack and conditional if stack
        groups = {g: [] for g in detected_groups}
        groups_seen = {g: set() for g in detected_groups}
        single_variables = []
        single_variables_set = set()
        order = []
        order_set = set()

        loop_stack = []  # list of (iterator_name, group_name)
        all_seen_iterators = {}  # iterator -> list of groups (for fallback)
        if_stack = []  # list of parsed condition dicts
        unconditional_seen = set()  # items seen outside any condition
        conditions = {}  # name -> condition dict

        for text in all_texts:
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

                        # Find active group from innermost loop stack
                        target_group = None
                        for it, grp in reversed(loop_stack):
                            if it == prefix:
                                target_group = grp
                                break

                        if not target_group and prefix in all_seen_iterators:
                            # Fallback to last group seen with this iterator
                            target_group = all_seen_iterators[prefix][-1]

                        if target_group and target_group in groups:
                            # Union of fields across all loop occurrences, preserving first-seen order
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

        # Pass 3: Extract conditional options for variables used in comparisons (e.g. {%p if VENDOR_TYPE == "INDIVIDUAL" %})
        detected_options = {}
        for text in all_texts:
            for m in if_pattern.finditer(text):
                cond = m.group(1).strip()
                cond_clean = (
                    cond.replace('\u201c', '"')
                    .replace('\u201d', '"')
                    .replace('\u2018', "'")
                    .replace('\u2019', "'")
                    .replace('\xa0', ' ')
                )
                eq_matches = re.findall(
                    r'([a-zA-Z_0-9\u0A80-\u0AFF]+)\s*==\s*["\']([^"\']+)["\']|["\']([^"\']+)["\']\s*==\s*([a-zA-Z_0-9\u0A80-\u0AFF]+)',
                    cond_clean
                )
                for m_eq in eq_matches:
                    v_name = m_eq[0] or m_eq[3]
                    opt_val = m_eq[1] or m_eq[2]
                    if v_name and opt_val and v_name not in {'if', 'elif', 'else', 'endif', 'and', 'or', 'not', 'in', 'is'}:
                        if v_name not in detected_options:
                            detected_options[v_name] = []
                        if opt_val not in detected_options[v_name]:
                            detected_options[v_name].append(opt_val)

        result = {
            "groups": groups,
            "single_variables": single_variables,
            "order": order,
            "options": detected_options,
            "conditions": conditions
        }

        if cache_key:
            _DOCX_VAR_CACHE[cache_key] = result

        logger.info(f"[EXTRACT] Found loop groups: {list(result['groups'].keys())}, single variables: {len(result['single_variables'])}, order: {result['order']}")
        return result

    except Exception as e:
        logger.critical(f"🔥 EXTRACTION FATAL: {e}", exc_info=True)
        return {"groups": {}, "single_variables": [], "order": []}


# ─── DOCX RENDERING ─────────────────────────────────────────────────────────

def _flatten_heirs(heirs_list: list) -> list:
    """Recursively flatten heirs that may contain nested 'children' arrays.
    Each heir dict is expected to have an optional 'index' field representing its hierarchical position.
    The function returns a flat list of heir dictionaries preserving the original index hierarchy (e.g., parent 1 -> child 1.1).
    """
    flat = []
    def _walk(item, parent_index=None, local_idx=1):
        if parent_index:
            combined = f"{parent_index}.{local_idx}"
        else:
            combined = str(local_idx)
        # Copy without children
        flat_item = {k: v for k, v in item.items() if k != 'children'}
        flat_item['index'] = combined
        flat.append(flat_item)
        children = item.get('children')
        if isinstance(children, list):
            for i, child in enumerate(children, start=1):
                _walk(child, combined, i)
    for i, heir in enumerate(heirs_list, start=1):
        _walk(heir, parent_index=None, local_idx=i)
    return flat

def _normalize_context(data: dict) -> dict:
    """
    Converts flat/nested data dict to docxtpl-compatible context.
    Handles nested repeaters and recursive lists/dicts.
    Ensures all primitive values are formatted strings (no None values),
    and automatically formats ISO date strings (YYYY-MM-DD) to Indian format (DD/MM/YYYY).
    """
    from backend.utils.date_utils import formatDateForDocument

    def normalize_val(val):
        if val is None:
            return ""
        if isinstance(val, list):
            normalized_list = []
            for i, item in enumerate(val):
                norm_item = normalize_val(item)
                if isinstance(norm_item, dict):
                    if "index" not in norm_item or not str(norm_item.get("index") or "").strip():
                        norm_item["index"] = str(i + 1)
                normalized_list.append(norm_item)
            return normalized_list
        if isinstance(val, dict):
            return {fk: normalize_val(fv) for fk, fv in val.items()}
        # Primitive value
        return formatDateForDocument(str(val))

    # Perform recursive normalization
    normalized = normalize_val(data)

    if isinstance(normalized, dict):
        # 1. Resolve LAND_RECORDS multi-applicant ownership mapping against APPLICANTS
        applicant_keys = ['applicants', 'applicant', 'declarants', 'declarant']
        applicants_list = []
        for ak in applicant_keys:
            for k, v in normalized.items():
                if k.lower() == ak and isinstance(v, list):
                    applicants_list = v
                    break
            if applicants_list:
                break

        # Build applicant lookup mapping
        applicant_map = {}
        for i, app in enumerate(applicants_list):
            if isinstance(app, dict):
                app_name = str(app.get("name") or app.get("applicant_name") or "").strip()
                app_idx = str(app.get("index") or "").strip()
                if app_idx:
                    applicant_map[app_idx] = app_name
                    try:
                        applicant_map[int(app_idx)] = app_name
                    except ValueError:
                        pass
                # Also index by 1-based position
                applicant_map[i + 1] = app_name
                applicant_map[str(i + 1)] = app_name

        land_keys = ['land_records', 'land_details', 'land']
        for lk in land_keys:
            for k, records in normalized.items():
                if k.lower() == lk and isinstance(records, list):
                    for record in records:
                        if isinstance(record, dict):
                            indices = record.get("owner_applicant_indices")
                            other_names = record.get("owner_other_names")

                            has_indices_field = "owner_applicant_indices" in record or indices is not None
                            has_others_field = "owner_other_names" in record or other_names is not None

                            combined_names = []
                            seen_names_lower = set()

                            # 1. Resolve selected applicant names in order
                            if indices is not None and isinstance(indices, list) and len(indices) > 0:
                                for idx in indices:
                                    name = ""
                                    if idx in applicant_map and applicant_map[idx]:
                                        name = applicant_map[idx]
                                    elif str(idx).strip() in applicant_map and applicant_map[str(idx).strip()]:
                                        name = applicant_map[str(idx).strip()]

                                    if name and name.lower() not in seen_names_lower:
                                        combined_names.append(name)
                                        seen_names_lower.add(name.lower())

                            # 2. Append manually entered other occupant names in order
                            if other_names is not None and isinstance(other_names, list) and len(other_names) > 0:
                                for oname in other_names:
                                    if isinstance(oname, str):
                                        trimmed = oname.strip()
                                        if trimmed and trimmed.lower() not in seen_names_lower:
                                            combined_names.append(trimmed)
                                            seen_names_lower.add(trimmed.lower())

                            if combined_names:
                                record["owner_names"] = combined_names
                                record["owner_name"] = ", ".join(combined_names)
                            elif has_indices_field or has_others_field:
                                existing = str(record.get("owner_name") or "").strip()
                                record["owner_names"] = [existing] if existing else []
                                record["owner_name"] = existing
                            else:
                                existing = str(record.get("owner_name") or "").strip()
                                record["owner_names"] = [existing] if existing else []
                                record["owner_name"] = existing

        # Flatten hierarchical lists (like HEIRS, family_members, etc.) if present
        heir_keys = ['heirs', 'family_members', 'members', 'heir_tree']
        for k, v in list(normalized.items()):
            if k.lower() in heir_keys and isinstance(v, list) and len(v) > 0:
                if any(isinstance(item, dict) and 'children' in item for item in v):
                    try:
                        flattened = _flatten_heirs(v)
                        normalized[k] = flattened
                        logger.info(f"[{k} FLATTEN] Flattened hierarchical list '{k}', count: {len(flattened)}")
                        import json
                        logger.info(f"[{k} FLATTENED RESULT]: {json.dumps(flattened, indent=2)}")
                    except Exception as e:
                        logger.error(f"Failed to flatten hierarchical list '{k}': {e}")
        return normalized
    return {}


class PreviewVar(str):
    """
    Subclass of str that preserves pure string semantics for Jinja expressions and comparisons,
    while carrying the variable path for preview marker injection during finalization.
    """
    def __new__(cls, val, path=''):
        obj = str.__new__(cls, str(val) if val is not None else '')
        obj.var_path = path
        return obj


def _wrap_preview_context(data, prefix=''):
    """
    Recursively wraps leaf values in PreviewVar preserving field paths.
    Supports dictionaries, lists (repeaters), and scalar values.
    """
    if data is None:
        return PreviewVar('', prefix)
    if isinstance(data, dict):
        return {k: _wrap_preview_context(v, f"{prefix}.{k}" if prefix else k) for k, v in data.items()}
    if isinstance(data, list):
        return [_wrap_preview_context(item, f"{prefix}.{i}" if prefix else str(i)) for i, item in enumerate(data)]
    return PreviewVar(str(data), prefix)


def _create_preview_jinja_env():
    """
    Creates a Jinja2 environment with a custom finalize hook for live preview rendering.
    Conditions, loops, and comparisons evaluate on pure values without marker contamination.
    Markers [[[VAR_START:path]]]...[[[VAR_END]]] are attached exclusively upon output formatting.
    """
    import jinja2

    def preview_finalize(val):
        if isinstance(val, jinja2.Undefined):
            name = getattr(val, '_undefined_name', '') or ''
            return f"[[[VAR_START:{name}]]][[[VAR_MISSING:{name}]]][[[VAR_END]]]"
        if isinstance(val, PreviewVar):
            if str(val).strip() == '':
                return f"[[[VAR_START:{val.var_path}]]][[[VAR_MISSING:{val.var_path}]]][[[VAR_END]]]"
            return f"[[[VAR_START:{val.var_path}]]]{str(val)}[[[VAR_END]]]"
        return val

    return jinja2.Environment(finalize=preview_finalize, autoescape=False)


def _evaluate_condition(cond, context: dict, options: dict = None) -> bool:
    if not cond:
        return True
    if isinstance(cond, list):
        return all(_evaluate_condition(c, context, options) for c in cond)
    if not isinstance(cond, dict):
        return True

    field = cond.get("field") or cond.get("var") or cond.get("variable")
    op = cond.get("op") or cond.get("operator") or "=="
    target_val = cond.get("value") if cond.get("value") is not None else cond.get("val", "")

    if not field and cond.get("raw"):
        raw_c = str(cond["raw"]).strip("() ")
        m = re.match(r'^\s*([a-zA-Z0-9_\u0A80-\u0AFF]+)\s*(==|!=)\s*["\']?([^"\']+)["\']?\s*$', raw_c)
        if m:
            field = m.group(1)
            op = m.group(2)
            target_val = m.group(3)

    if not field:
        return True

    # Case-insensitive field lookup in context
    current_val = context.get(field)
    if current_val is None:
        for k, v in context.items():
            if k.lower() == field.lower():
                current_val = v
                break

    # If still not found or blank, check detected options for default (first option)
    if (current_val is None or str(current_val).strip() == "") and options and isinstance(options, dict):
        opts = options.get(field) or options.get(field.upper()) or options.get(field.lower())
        if opts and isinstance(opts, list) and len(opts) > 0:
            current_val = opts[0]

    def _clean(v):
        if v is None:
            return ""
        s = str(v).strip()
        if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
            s = s[1:-1].strip()
        return s.lower()

    c_cur = _clean(current_val)
    c_tgt = _clean(target_val)

    if c_tgt in {"true", "false"}:
        is_truthy = bool(current_val) and str(current_val).strip() != "" and str(current_val).strip().lower() not in {"false", "0", "none"}
        expected_truthy = (c_tgt == "true")
        if op == "==":
            return is_truthy == expected_truthy
        elif op == "!=":
            return is_truthy != expected_truthy

    if op == "==":
        return c_cur == c_tgt
    elif op == "!=":
        return c_cur != c_tgt
    return True


def _apply_conditional_visibility(context: dict, template_path: str):
    """
    Ensures render context strictly respects conditional visibility extracted from the DOCX template.
    1. If a scalar variable is guarded by a condition that evaluates to False, it is set to ''.
    2. Identifies party-representative collection pairs (e.g. VENDORS <-> VENDOR_REPRESENTATIVES,
       PURCHASERS <-> PURCHASER_REPRESENTATIVES) sharing a type discriminator (e.g. VENDOR_TYPE, PURCHASER_TYPE):
       - If ENTITY mode is active: the active party collection is the representative collection.
         The representative collection is kept as-is, and the base party collection (used in unguarded
         signature loops) is aliased to the representative collection.
       - If INDIVIDUAL mode is active: the base party collection retains individual rows, and the representative
         collection is deactivated to [].
    3. Any other conditional collection whose condition evaluates to False is deactivated to [].
    """
    if not template_path or not os.path.exists(template_path) or not isinstance(context, dict):
        return

    try:
        extracted = extract_variables_from_docx(template_path)
        conditions = extracted.get("conditions", {})
        if not conditions:
            return

        groups = set(extracted.get("groups", {}).keys())
        options = extracted.get("options", {})

        scalar_exclusions = (
            "_name", "_pan", "_address", "_type", "_aadhaar", "_share",
            "_age", "_relation", "_mobile", "_email", "_phone", "_date",
            "_amount", "_no", "_number", "_details", "_desc", "_status"
        )

        def is_repeater_collection(name: str) -> bool:
            if not name:
                return False
            nl = name.lower()
            if any(nl.endswith(ex) or "_entity_" in nl for ex in scalar_exclusions):
                return False
            return name in groups or nl.endswith("s") or "representative" in nl or "rep" in nl

        # Detect party pairs: e.g. (VENDORS, VENDOR_REPRESENTATIVES), (PURCHASERS, PURCHASER_REPRESENTATIVES)
        party_pairs = []
        handled_groups = set()
        for g_rep in groups:
            if not is_repeater_collection(g_rep):
                continue
            c_rep = conditions.get(g_rep)
            if not c_rep:
                continue
            field = c_rep.get("field")
            if any(s in g_rep.lower() for s in ["representative", "representatives", "rep", "reps", "agent", "agents"]):
                for g_base in groups:
                    if g_base == g_rep or not is_repeater_collection(g_base):
                        continue
                    g_base_lower = g_base.lower()
                    if any(s in g_base_lower for s in ["representative", "representatives", "rep", "reps", "agent", "agents"]):
                        continue
                    c_base = conditions.get(g_base)
                    if c_base and c_base.get("field") == field:
                        party_pairs.append((g_base, g_rep, field, c_base, c_rep))
                        handled_groups.add(g_base.lower())
                        handled_groups.add(g_rep.lower())

        def _deduplicate_repeater_list(items: list) -> list:
            """
            Deduplicates a list of repeater rows while preserving order and normalizing 1-based index.
            Two rows are considered duplicates if all their user-visible content fields match,
            or if they are identical dict objects.
            """
            if not isinstance(items, list) or len(items) <= 1:
                return list(items) if isinstance(items, list) else []

            unique_items = []
            seen_signatures = set()

            for i, item in enumerate(items):
                if not isinstance(item, dict):
                    if item not in seen_signatures:
                        seen_signatures.add(item)
                        unique_items.append(item)
                    continue

                sig_parts = []
                for k in sorted(item.keys()):
                    if k.lower() in ('index', '_index', 'id'):
                        continue
                    v = str(item.get(k) or '').strip().lower()
                    if v:
                        sig_parts.append((k.lower(), v))

                sig = tuple(sig_parts) if sig_parts else (f"__empty_row_{i}__",)
                if sig_parts and sig in seen_signatures:
                    continue

                if sig_parts:
                    seen_signatures.add(sig)

                clean_item = dict(item)
                clean_item['index'] = str(len(unique_items) + 1)
                unique_items.append(clean_item)

            return unique_items

        # 1. Resolve party pairs dynamically based on active party mode
        for g_base, g_rep, field, c_base, c_rep in party_pairs:
            is_rep_active = _evaluate_condition(c_rep, context, options)
            is_base_active = _evaluate_condition(c_base, context, options)

            # Match all case variations of base and rep keys in context
            base_keys = [k for k in context.keys() if k.lower() == g_base.lower()]
            if not base_keys:
                base_keys = [g_base]
            rep_keys = [k for k in context.keys() if k.lower() == g_rep.lower()]
            if not rep_keys:
                rep_keys = [g_rep]

            if is_rep_active:
                # Entity mode: active party collection for both main section and signature loops is the representatives
                raw_rep_data = None
                for rk in rep_keys:
                    val = context.get(rk)
                    if isinstance(val, list) and len(val) > 0:
                        raw_rep_data = val
                        break
                if raw_rep_data is None:
                    raw_rep_data = context.get(rep_keys[0]) or []

                rep_data = _deduplicate_repeater_list(list(raw_rep_data))
                for rk in rep_keys:
                    context[rk] = rep_data
                for bk in base_keys:
                    context[bk] = rep_data
            elif is_base_active:
                # Individual mode: active party collection is the individual parties
                raw_base_data = None
                for bk in base_keys:
                    val = context.get(bk)
                    if isinstance(val, list) and len(val) > 0:
                        raw_base_data = val
                        break
                if raw_base_data is None:
                    raw_base_data = context.get(base_keys[0]) or []

                base_data = _deduplicate_repeater_list(list(raw_base_data))
                for bk in base_keys:
                    context[bk] = base_data
                for rk in rep_keys:
                    context[rk] = []
            else:
                for bk in base_keys:
                    context[bk] = []
                for rk in rep_keys:
                    context[rk] = []

        # 2. Handle remaining items
        for item_name, cond in conditions.items():
            if item_name.lower() in handled_groups:
                continue

            if not _evaluate_condition(cond, context, options):
                # Condition is inactive: clear this item from render context
                matching_keys = [k for k in context.keys() if k.lower() == item_name.lower()]
                if not matching_keys:
                    matching_keys = [item_name]

                is_group = item_name in groups or any(isinstance(context.get(mk), list) for mk in matching_keys)
                for mk in matching_keys:
                    if is_group:
                        context[mk] = []
                    else:
                        context[mk] = ""

        # 3. Defense-in-depth: Ensure explicit scalar fields (e.g. *_name, *_pan, *_address, *_type, etc.) never hold a list or dict
        for k, v in list(context.items()):
            if isinstance(v, (list, dict)):
                kl = k.lower()
                if any(kl.endswith(ex) or "_entity_" in kl for ex in scalar_exclusions):
                    context[k] = ""
    except Exception as e:
        logger.warning(f"Error applying conditional visibility to context: {e}")


def render_docx_template(
    template_path: str,
    data: dict,
    output_path: str,
    tracking_id: Optional[str] = None,
    preview: bool = False,
) -> str:
    """
    Renders a DOCX template with user data using docxtpl (Jinja2 engine).

    Args:
        template_path: Absolute path to the .docx template file.
        data: Dictionary of variable values (can include lists for repeaters).
        output_path: Full path where the rendered .docx will be saved.
        tracking_id: Optional tracking ID for logging.
        preview: If True, evaluates Jinja logic with pure semantics while injecting preview markers into output.

    Returns:
        output_path if successful.

    Raises:
        FileNotFoundError if template is missing.
        Exception if docxtpl render fails.
    """
    tid = tracking_id or uuid.uuid4().hex[:8]
    start = time.perf_counter()

    logger.info(f"📄 DOCX RENDER START [{tid}]: template={os.path.basename(template_path)}, preview={preview}")

    if not os.path.exists(template_path):
        raise FileNotFoundError(f"Template not found: {template_path}")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with RENDER_LOCK:
        try:
            doc = DraftSetuDocxTemplate(template_path)
            context = _normalize_context(data)
            _apply_conditional_visibility(context, template_path)
            # Log final HEIRS array for debugging
            if 'HEIRS' in context:
                logger.info(f"[RENDER {tid}] Final HEIRS payload: {context['HEIRS']}")
            logger.info(f"[RENDER {tid}] Context keys: {list(context.keys())}")

            # Compatibility mapping for paragraph repeater (single textarea to universal paragraphs list)
            text_value = context.get("EXTRA_PARAGRAPHS_TEXT", "")
            if text_value and str(text_value).strip():
                # Normalize line endings to standard Unix \n
                normalized_text = str(text_value).replace("\r\n", "\n").replace("\r", "\n")
                paragraphs = [
                    {
                        "text": p.strip()
                    }
                    for p in re.split(r"\n\s*\n", normalized_text)
                    if p.strip()
                ]
                context["EXTRA_PARAGRAPHS"] = paragraphs
            elif "para.text" in context:
                para_value = context.get("para.text")
                if para_value and str(para_value).strip():
                    normalized_text = str(para_value).replace("\r\n", "\n").replace("\r", "\n")
                    paragraphs = [
                        {
                            "text": p.strip()
                        }
                        for p in re.split(r"\n\s*\n", normalized_text)
                        if p.strip()
                    ]
                    context["EXTRA_PARAGRAPHS"] = paragraphs
                else:
                    context["EXTRA_PARAGRAPHS"] = []
            elif "EXTRA_PARAGRAPHS" in context:
                # Keep and normalize pre-existing EXTRA_PARAGRAPHS
                existing_paras = context["EXTRA_PARAGRAPHS"]
                if isinstance(existing_paras, list):
                    normalized_paras = []
                    for item in existing_paras:
                        if isinstance(item, dict) and "text" in item:
                            text_val = item["text"]
                            if text_val is not None:
                                text_str = str(text_val).replace("\r\n", "\n").replace("\r", "\n")
                                item["text"] = text_str
                            normalized_paras.append(item)
                        elif isinstance(item, str):
                            normalized_paras.append({
                                "text": item.replace("\r\n", "\n").replace("\r", "\n")
                            })
                        else:
                            normalized_paras.append(item)
                    context["EXTRA_PARAGRAPHS"] = normalized_paras
            else:
                context["EXTRA_PARAGRAPHS"] = []

            context.setdefault("EXTRA_PARAGRAPHS", [])
            logger.info(
                f"EXTRA_PARAGRAPHS Generated Count: {len(context.get('EXTRA_PARAGRAPHS', []))}"
            )

            if preview:
                preview_context = _wrap_preview_context(context)
                jinja_env = _create_preview_jinja_env()
                doc.render(preview_context, jinja_env=jinja_env)
            else:
                doc.render(context)

            repair_docx_openxml_integrity(doc.docx)
            doc.save(output_path)

            duration = time.perf_counter() - start
            logger.info(f"✅ DOCX RENDER COMPLETE [{tid}]: {os.path.basename(output_path)} in {duration:.3f}s")
            return output_path

        except Exception as e:
            logger.error(f"❌ DOCX RENDER FAILED [{tid}]: {e}", exc_info=True)
            raise


# ─── PDF CONVERSION ──────────────────────────────────────────────────────────

def _find_libreoffice() -> Optional[str]:
    """
    Locate the LibreOffice soffice binary on Windows, Linux, and macOS.
    Strategy:
      1. Hard-coded common Windows install paths (C, D, E drives)
      2. Windows Registry HKLM lookup (catches non-standard installs)
      3. shutil.which() for PATH-based installs and Linux/Mac
    """
    candidates = [
        # Windows — standard 64-bit
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files\LibreOffice 7\program\soffice.exe",
        r"C:\Program Files\LibreOffice 6\program\soffice.exe",
        # Windows — 32-bit on 64-bit OS
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice 7\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice 6\program\soffice.exe",
        # Alternate drive installs
        r"D:\LibreOffice\program\soffice.exe",
        r"D:\Program Files\LibreOffice\program\soffice.exe",
        r"E:\LibreOffice\program\soffice.exe",
        # Linux
        "/usr/bin/soffice",
        "/usr/bin/libreoffice",
        "/usr/local/bin/soffice",
        "/usr/local/bin/libreoffice",
        "/snap/bin/libreoffice",
        # macOS
        "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    ]

    for path in candidates:
        if os.path.exists(path):
            logger.info(f"✅ [LIBREOFFICE] Found via candidate list: {path}")
            return path

    # Windows Registry lookup (catches non-standard install directories)
    try:
        import winreg
        for root_key in (winreg.HKEY_LOCAL_MACHINE, winreg.HKEY_CURRENT_USER):
            for sub in (
                r"SOFTWARE\LibreOffice\UNO\InstallPath",
                r"SOFTWARE\WOW6432Node\LibreOffice\UNO\InstallPath",
            ):
                try:
                    with winreg.OpenKey(root_key, sub) as k:
                        install_path, _ = winreg.QueryValueEx(k, "")
                        candidate = os.path.join(install_path, "soffice.exe")
                        if os.path.exists(candidate):
                            logger.info(f"✅ [LIBREOFFICE] Found via Windows Registry: {candidate}")
                            return candidate
                except FileNotFoundError:
                    pass
    except ImportError:
        pass  # Not on Windows — skip registry

    # Fall back to PATH / shutil.which
    for cmd in ("soffice", "libreoffice"):
        found = shutil.which(cmd)
        if found:
            logger.info(f"✅ [LIBREOFFICE] Found via shutil.which('{cmd}'): {found}")
            return found

    logger.info("ℹ️ [LIBREOFFICE] Not found — will use Microsoft Word (docx2pdf) if available.")
    return None


def _check_docx2pdf() -> bool:
    """
    Check whether docx2pdf (Microsoft Word COM automation) is available.
    Works on Windows when Microsoft Word is installed.
    Returns True only when Word COM dispatch succeeds.
    """
    if os.name != "nt":
        return False  # docx2pdf's Word COM path is Windows-only

    try:
        import docx2pdf  # noqa: F401
        import win32com.client
        import pythoncom
        logger.info("✅ [DOCX2PDF] Microsoft Word COM available — PDF engine ready.")
        return True
    except ImportError:
        logger.warning("⚠️ [DOCX2PDF] Package not installed. Run: pip install docx2pdf")
        return False
    except Exception as e:
        logger.warning(f"⚠️ [DOCX2PDF] Word COM check failed: {e}")
        return False


# ── Detect available PDF engines at module load ───────────────────────────────

import shutil

LIBREOFFICE_PATH = None
LIBREOFFICE_AVAILABLE = False

WINDOWS_LIBREOFFICE_PATHS = [
    r"C:\Program Files\LibreOffice\program\soffice.exe",
    r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
    r"D:\Program Files\LibreOffice\program\soffice.exe",
    r"D:\LibreOffice\program\soffice.exe",
]

for path in WINDOWS_LIBREOFFICE_PATHS:
    normalized = os.path.normpath(path)
    if os.path.isfile(normalized):
        LIBREOFFICE_PATH = normalized
        LIBREOFFICE_AVAILABLE = True
        break

if not LIBREOFFICE_AVAILABLE:
    LIBREOFFICE_PATH = _find_libreoffice()
    if LIBREOFFICE_PATH:
        LIBREOFFICE_PATH = os.path.normpath(LIBREOFFICE_PATH)
        LIBREOFFICE_AVAILABLE = os.path.isfile(LIBREOFFICE_PATH)

print("LIBREOFFICE AVAILABLE:", LIBREOFFICE_AVAILABLE)
print("LIBREOFFICE PATH:", LIBREOFFICE_PATH)

DOCX2PDF_AVAILABLE: bool = _check_docx2pdf()
PDF_ENGINE_AVAILABLE: bool = DOCX2PDF_AVAILABLE or LIBREOFFICE_AVAILABLE

def _safe_print(msg: str):
    try:
        print(msg)
    except UnicodeEncodeError:
        try:
            print(msg.encode('ascii', errors='backslashreplace').decode('ascii'))
        except Exception:
            pass

# Startup diagnostics — printed in the backend console/log on every restart
_safe_print(f"[PDF ENGINE] Microsoft Word (docx2pdf) : {'AVAILABLE' if DOCX2PDF_AVAILABLE else 'not found'}")
_safe_print(f"[PDF ENGINE] LibreOffice               : {LIBREOFFICE_PATH if LIBREOFFICE_AVAILABLE else 'not found'}")
_safe_print(f"[PDF ENGINE] PDF export                : {'ENABLED' if PDF_ENGINE_AVAILABLE else 'DISABLED'}")
logger.info(
    f"[PDF ENGINE] docx2pdf={DOCX2PDF_AVAILABLE} | "
    f"libreoffice={LIBREOFFICE_AVAILABLE} | "
    f"pdf_available={PDF_ENGINE_AVAILABLE}"
)


word_pdf_lock = threading.Lock()


def _safe_remove(path: str, retries: int = 5, delay: float = 0.5) -> bool:
    """
    Delete a file with retry-backoff to handle Windows file lock latency
    (e.g. Word COM holds an exclusive lock briefly after Quit() returns).
    Returns True if deleted, False if all retries failed.
    """
    for attempt in range(retries):
        try:
            if not os.path.exists(path):
                return True
            os.remove(path)
            return True
        except PermissionError:
            if attempt < retries - 1:
                time.sleep(delay * (attempt + 1))
            else:
                logger.warning(f"[_safe_remove] Could not delete after {retries} attempts: {path}")
                return False
        except Exception as e:
            logger.warning(f"[_safe_remove] Unexpected error deleting {path}: {e}")
            return False
    return False


def kill_zombie_winword():
    """
    Terminate orphan WINWORD.EXE processes older than 2 minutes using psutil.
    """
    try:
        import psutil
        current_time = time.time()
        for proc in psutil.process_iter(['pid', 'name', 'create_time']):
            try:
                if proc.info['name'] and proc.info['name'].upper() == 'WINWORD.EXE':
                    age_seconds = current_time - proc.info['create_time']
                    if age_seconds > 120:
                        logger.warning(f"Killing zombie WINWORD.EXE with PID {proc.info['pid']} (age: {age_seconds:.1f}s)")
                        proc.terminate()
                        try:
                            proc.wait(timeout=2)
                        except psutil.TimeoutExpired:
                            proc.kill()
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
    except Exception as e:
        logger.error(f"Failed to run zombie winword killer: {e}")


def repair_docx_openxml_integrity(doc: Document) -> int:
    """
    Repairs common ECMA-376 schema violations and XML inconsistencies in a python-docx Document:
    1. Table cells without paragraphs (ECMA-376 Part 1, §17.4.66 requires >= 1 <w:p> inside <w:tc>).
       Missing <w:p> causes Microsoft Word COM to abort with "The file appears to be corrupted."
    2. Strips XML 1.0 invalid control characters (\x00-\x08, \x0b-\x0c, \x0e-\x1f) from text nodes.
    3. Handles header/footer tables and paragraphs.

    Returns the count of repaired elements.
    """
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn
    import re

    repaired_count = 0
    INVALID_XML_CHARS_RE = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f\ufffe\uffff]')

    # 1. Clean document body paragraphs
    for p in doc.paragraphs:
        for r in p.runs:
            if r.text and INVALID_XML_CHARS_RE.search(r.text):
                r.text = INVALID_XML_CHARS_RE.sub('', r.text)
                repaired_count += 1

    # 2. Check and repair all tables in body
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                tc = cell._tc
                p_elements = tc.xpath('.//w:p')
                if not p_elements:
                    # Inject mandatory paragraph element into empty cell
                    new_p = OxmlElement('w:p')
                    tc.append(new_p)
                    repaired_count += 1
                else:
                    for p in cell.paragraphs:
                        for r in p.runs:
                            if r.text and INVALID_XML_CHARS_RE.search(r.text):
                                r.text = INVALID_XML_CHARS_RE.sub('', r.text)
                                repaired_count += 1

    # 3. Check and repair headers and footers across all sections
    for section in doc.sections:
        for hf_attr in (
            'header', 'footer',
            'first_page_header', 'first_page_footer',
            'even_page_header', 'even_page_footer'
        ):
            hf = getattr(section, hf_attr, None)
            if hf is not None:
                for p in hf.paragraphs:
                    for r in p.runs:
                        if r.text and INVALID_XML_CHARS_RE.search(r.text):
                            r.text = INVALID_XML_CHARS_RE.sub('', r.text)
                            repaired_count += 1
                for table in hf.tables:
                    for row in table.rows:
                        for cell in row.cells:
                            tc = cell._tc
                            p_elements = tc.xpath('.//w:p')
                            if not p_elements:
                                new_p = OxmlElement('w:p')
                                tc.append(new_p)
                                repaired_count += 1
                            else:
                                for p in cell.paragraphs:
                                    for r in p.runs:
                                        if r.text and INVALID_XML_CHARS_RE.search(r.text):
                                            r.text = INVALID_XML_CHARS_RE.sub('', r.text)
                                            repaired_count += 1

    return repaired_count


def validate_docx_before_conversion(docx_path: str) -> dict:
    """
    Validates that a generated DOCX file is a structurally sound OpenXML package
    before sending it to LibreOffice or Microsoft Word COM.

    Checks:
      1. File existence and non-zero size.
      2. Valid ZIP archive structure.
      3. Broken XML, invalid relationships, corrupted media/parts.
      4. Invalid Unicode/control characters.
      5. Valid python-docx Document object and XML tree parsing.
      6. Malformed tables (e.g. empty <w:tc> without <w:p>).
      7. Unclosed template constructs.

    Returns a dict with diagnostic info:
      {"path": str, "exists": bool, "size": int, "is_zip": bool, "docx_valid": bool, "error": str/None}

    Raises ValueError with a descriptive message if the file is corrupt.
    """
    import zipfile
    from xml.etree import ElementTree as ET

    diag = {
        "path": docx_path,
        "exists": False,
        "size": 0,
        "is_zip": False,
        "docx_valid": False,
        "error": None
    }

    # 1. Existence check
    if not os.path.exists(docx_path):
        diag["error"] = f"Generated DOCX does not exist on disk: {docx_path}"
        logger.error(f"❌ [DOCX_VALIDATE] {diag['error']}")
        raise ValueError(f"Generated DOCX is invalid before PDF conversion: {diag['error']}")

    diag["exists"] = True
    diag["size"] = os.path.getsize(docx_path)

    # 2. Size check
    if diag["size"] == 0:
        diag["error"] = f"Generated DOCX file is empty (0 bytes): {docx_path}"
        logger.error(f"❌ [DOCX_VALIDATE] {diag['error']}")
        raise ValueError(f"Generated DOCX is invalid before PDF conversion: {diag['error']}")

    # 3. ZIP package check
    if not zipfile.is_zipfile(docx_path):
        diag["error"] = f"Generated DOCX is not a valid ZIP package: {docx_path}"
        logger.error(f"❌ [DOCX_VALIDATE] {diag['error']}")
        raise ValueError(f"Generated DOCX is invalid before PDF conversion: {diag['error']}")

    diag["is_zip"] = True

    # 4. Deep OpenXML package & relationship validation
    try:
        with zipfile.ZipFile(docx_path, 'r') as zf:
            file_list = zf.namelist()
            if "word/document.xml" not in file_list:
                diag["error"] = "DOCX ZIP archive missing critical 'word/document.xml' part"
                logger.error(f"❌ [DOCX_VALIDATE] {diag['error']}")
                raise ValueError(f"Generated DOCX is invalid before PDF conversion: {diag['error']}")

            # Validate XML syntax of all XML and rels parts
            for item in file_list:
                if item.endswith('.xml') or item.endswith('.rels'):
                    try:
                        part_data = zf.read(item)
                        ET.fromstring(part_data)
                    except Exception as xml_err:
                        diag["error"] = f"Malformed XML in DOCX part '{item}': {xml_err}"
                        logger.error(f"❌ [DOCX_VALIDATE] {diag['error']}")
                        raise ValueError(f"Generated DOCX is invalid before PDF conversion: {diag['error']}") from xml_err
    except ValueError:
        raise
    except Exception as zip_err:
        diag["error"] = f"Error reading DOCX ZIP archive contents: {zip_err}"
        logger.error(f"❌ [DOCX_VALIDATE] {diag['error']}")
        raise ValueError(f"Generated DOCX is invalid before PDF conversion: {diag['error']}") from zip_err

    # 5. python-docx document model validation and schema repair
    try:
        doc = Document(docx_path)
        _ = doc.element.body

        # Check for unclosed template constructs
        for p in doc.paragraphs:
            if "{{" in p.text and "}}" not in p.text:
                logger.warning(f"⚠️ [DOCX_VALIDATE] Unclosed template tag detected in paragraph: '{p.text[:60]}...'")

        # Repair any residual ECMA-376 schema inconsistencies (empty cells, invalid chars)
        fixed = repair_docx_openxml_integrity(doc)
        if fixed > 0:
            doc.save(docx_path)
            diag["size"] = os.path.getsize(docx_path)
            logger.info(f"🛡️ [DOCX_VALIDATE] Repaired {fixed} schema items in {os.path.basename(docx_path)}")

        diag["docx_valid"] = True
    except Exception as e:
        diag["error"] = f"python-docx Document parsing failed: {e}"
        logger.error(f"❌ [DOCX_VALIDATE] {diag['error']}")
        raise ValueError(f"Generated DOCX is invalid before PDF conversion: {diag['error']}") from e

    return diag


def _convert_via_word(docx_path: str, output_dir: str, target_pdf_path: Optional[str] = None) -> tuple[str, int, str, str]:
    """
    Convert DOCX → PDF using Microsoft Word COM automation (Windows-only fallback).
    Requirements:
      - Uses isolated DispatchEx instead of reusing shared Word instance
      - Visible=False, DisplayAlerts=0
      - Documents.Open with ReadOnly=True
      - ExportAsFixedFormat (Format=17)
      - Explicit Document.Close(0) and Word.Quit(0)
      - pythoncom.CoUninitialize() and COM reference release
      - Strict WINWORD.EXE PID tracking to ensure zero orphan processes are leaked.

    Returns:
        tuple of (pdf_path, return_code, stdout, stderr)
    """
    import pythoncom
    import win32com.client
    import psutil

    if target_pdf_path:
        pdf_path = target_pdf_path
    else:
        base_name = os.path.splitext(os.path.basename(docx_path))[0]
        pdf_path = os.path.join(output_dir, f"{base_name}.pdf")

    abs_docx = str(Path(docx_path).resolve())
    abs_pdf  = str(Path(pdf_path).resolve())

    logger.info("💾 SAVING PDF")
    _safe_print(f"[WORD COM] {abs_docx} -> {abs_pdf}")

    start = time.perf_counter()

    if os.path.exists(abs_pdf):
        _safe_remove(abs_pdf)

    # Snapshot existing Word PIDs to track and clean up the exact process created
    before_pids = {p.pid for p in psutil.process_iter() if p.name().lower() == 'winword.exe'}

    pythoncom.CoInitialize()
    word = None
    doc = None
    spawned_pids = set()

    try:
        word = win32com.client.DispatchEx("Word.Application")
        word.Visible = False
        word.DisplayAlerts = 0  # wdAlertsNone = 0
        try:
            word.ScreenUpdating = False
            word.Options.PrintBackground = False
        except Exception:
            pass

        after_pids = {p.pid for p in psutil.process_iter() if p.name().lower() == 'winword.exe'}
        spawned_pids = after_pids - before_pids

        # Open with ReadOnly=True to avoid locking conflicts and ~$ lock files
        try:
            doc = word.Documents.Open(
                abs_docx,   # FileName
                False,      # ConfirmConversions
                True,       # ReadOnly = True
                False,      # AddToRecentFiles
            )
        except Exception as open_err:
            if "corrupted" in str(open_err).lower() or "-2146822496" in str(open_err):
                logger.warning(f"Word reported file corruption: {open_err}. Attempting OpenXML schema repair on {abs_docx}...")
                try:
                    repaired_doc = Document(abs_docx)
                    fixed = repair_docx_openxml_integrity(repaired_doc)
                    if fixed > 0:
                        repaired_doc.save(abs_docx)
                        doc = word.Documents.Open(abs_docx, False, True, False)
                    else:
                        raise open_err
                except Exception:
                    raise open_err
            else:
                raise open_err

        if doc is None:
            raise RuntimeError("Word.Documents.Open returned None — file may be locked or corrupted.")

        # Export using dedicated ExportAsFixedFormat API (wdExportFormatPDF = 17)
        try:
            doc.ExportAsFixedFormat(
                OutputFileName=abs_pdf,
                ExportFormat=17,
                OpenAfterExport=False,
                OptimizeFor=0,     # wdExportOptimizeForPrint = 0
                CreateBookmarks=1, # wdExportCreateHeadingBookmarks = 1
                DocStructureTags=True
            )
        except AttributeError:
            doc.SaveAs(abs_pdf, FileFormat=17)

    except Exception as e:
        logger.error(f"⚠️ WORD COM FAILED: {e}")
        raise RuntimeError(f"Microsoft Word PDF conversion failed: {e}") from e
    finally:
        if doc is not None:
            try:
                doc.Close(0)  # wdDoNotSaveChanges = 0
            except Exception:
                pass
            try:
                del doc
            except Exception:
                pass
            doc = None

        if word is not None:
            try:
                word.Quit(0)
            except Exception:
                pass
            try:
                del word
            except Exception:
                pass
            word = None

        time.sleep(0.1)
        import gc
        gc.collect()
        try:
            pythoncom.CoUninitialize()
        except Exception:
            pass

        # Terminate any spawned Word processes that failed to exit
        for pid in spawned_pids:
            if psutil.pid_exists(pid):
                try:
                    proc = psutil.Process(pid)
                    proc.terminate()
                    proc.wait(timeout=2)
                except Exception:
                    try:
                        proc.kill()
                    except Exception:
                        pass

    if not os.path.exists(pdf_path) or os.path.getsize(pdf_path) == 0:
        raise RuntimeError(
            f"Word COM conversion appeared to succeed but PDF not found or empty at: {pdf_path}"
        )

    duration = time.perf_counter() - start
    logger.info("✅ PDF READY")
    logger.info(f"[WORD COM] PDF created in {duration:.3f}s: {os.path.basename(pdf_path)}")
    return pdf_path, 0, f"Word COM ExportAsFixedFormat completed in {duration:.3f}s", ""


def _convert_via_libreoffice(docx_path: str, output_dir: str, timeout: int = 45) -> tuple[str, int, str, str]:
    """
    Convert DOCX → PDF using LibreOffice headless subprocess (primary converter).

    Returns:
        tuple of (pdf_path, return_code, stdout, stderr)
    """
    global LIBREOFFICE_PATH
    if LIBREOFFICE_PATH:
        LIBREOFFICE_PATH = os.path.normpath(LIBREOFFICE_PATH)

    if not LIBREOFFICE_PATH or not os.path.isfile(LIBREOFFICE_PATH):
        raise RuntimeError(
            f"LibreOffice executable not found or invalid: {LIBREOFFICE_PATH}"
        )

    out_dir = os.path.normpath(output_dir)
    docx_path = os.path.normpath(docx_path)

    # Isolated user profile directory to allow concurrent conversions
    user_profile_uuid = uuid.uuid4().hex
    if os.name == 'nt':
        temp_dir_raw = os.environ.get('TEMP', 'C:\\Temp')
        profile_disk_path = os.path.join(temp_dir_raw, f"libreoffice_user_{user_profile_uuid}")
        temp_dir_uri = temp_dir_raw.replace('\\', '/').lstrip('/')
        user_install_uri = f"file:///{temp_dir_uri}/libreoffice_user_{user_profile_uuid}"
    else:
        profile_disk_path = f"/tmp/libreoffice_user_{user_profile_uuid}"
        user_install_uri = f"file:///tmp/libreoffice_user_{user_profile_uuid}"

    command = [
        str(LIBREOFFICE_PATH),
        f"-env:UserInstallation={user_install_uri}",
        "--headless",
        "--convert-to",
        "pdf",
        "--outdir",
        str(out_dir),
        str(docx_path)
    ]

    try:
        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=timeout,
            shell=False
        )

        if result.returncode != 0:
            raise RuntimeError(
                f"LibreOffice PDF conversion failed (code {result.returncode}): {result.stderr or result.stdout}"
            )

        pdf_path = os.path.join(
            out_dir,
            Path(docx_path).stem + ".pdf"
        )

        if not os.path.exists(pdf_path) or os.path.getsize(pdf_path) == 0:
            raise RuntimeError(
                f"PDF file not generated or empty by LibreOffice: {pdf_path}"
            )

        return pdf_path, result.returncode, result.stdout, result.stderr
    finally:
        if os.path.exists(profile_disk_path):
            try:
                shutil.rmtree(profile_disk_path)
            except Exception as cleanup_err:
                logger.warning(f"Failed to clean up LibreOffice profile directory {profile_disk_path}: {cleanup_err}")


# ── Watermark Functionality ───────────────────────────────────────────────────

PREVIEW_WATERMARK_TEXT: str = "DRAFTSETU • PREVIEW COPY • NOT FOR OFFICIAL USE"


def add_watermark_to_pdf(
    input_pdf_path: str,
    output_pdf_path: Optional[str] = None,
    text: str = PREVIEW_WATERMARK_TEXT
) -> str:
    """
    Applies a clean vector watermark diagonally across the center of every page of a PDF.
    - Single clear watermark per page.
    - Rotated 45 degrees.
    - Light neutral gray color (~18% opacity).
    - Preserves 100% fidelity of underlying document content and Gujarati text.
    - Zero feather, line, stripe, or VML distortion artifacts.
    """
    import io
    from pypdf import PdfReader, PdfWriter
    from reportlab.pdfgen import canvas
    from reportlab.lib.colors import Color

    target_path = output_pdf_path or input_pdf_path
    temp_output_path = f"{target_path}.wm_tmp_{uuid.uuid4().hex[:6]}.pdf"

    try:
        reader = PdfReader(input_pdf_path)
        writer = PdfWriter()

        for page in reader.pages:
            page_width = float(page.mediabox.width)
            page_height = float(page.mediabox.height)

            # Generate vector watermark canvas for this page dimensions
            packet = io.BytesIO()
            c = canvas.Canvas(packet, pagesize=(page_width, page_height))
            c.saveState()

            # Neutral slate gray with ~18% opacity
            c.setFillColor(Color(0.40, 0.45, 0.52, alpha=0.18))
            c.setFont("Helvetica-Bold", 26)

            # Translate to page center and rotate 45 degrees
            c.translate(page_width / 2.0, page_height / 2.0)
            c.rotate(45)
            c.drawCentredString(0, 0, text)
            c.restoreState()
            c.save()

            packet.seek(0)
            watermark_pdf = PdfReader(packet)
            watermark_page = watermark_pdf.pages[0]

            new_page = writer.add_page(page)
            new_page.merge_page(watermark_page, over=True)

        with open(temp_output_path, "wb") as f_out:
            writer.write(f_out)

        # Replace target path safely
        if os.path.exists(target_path):
            _safe_remove(target_path)
        os.replace(temp_output_path, target_path)

        logger.info(f"✅ [WATERMARK] Embedded clean PDF watermark into: {os.path.basename(target_path)}")
        return target_path
    finally:
        if os.path.exists(temp_output_path):
            _safe_remove(temp_output_path)


def add_watermark_to_docx(
    docx_path: str,
    output_path: Optional[str] = None,
    text: str = PREVIEW_WATERMARK_TEXT
) -> str:
    """
    Backward-compatibility helper. For PDF previews, PDF-level watermarking is used.
    """
    target_path = output_path or docx_path
    if docx_path != target_path and not os.path.exists(target_path):
        import shutil
        shutil.copyfile(docx_path, target_path)
    return target_path


# ── Public API ────────────────────────────────────────────────────────────────

def convert_docx_to_pdf(
    docx_path: str,
    output_dir: Optional[str] = None,
    watermark: Optional[str] = None
) -> str:
    """
    Convert a rendered DOCX file to PDF using the best available engine:
      1. LibreOffice headless subprocess (primary converter)
         soffice --headless --convert-to pdf --outdir <output_dir> <input.docx>
      2. Microsoft Word COM (isolated DispatchEx fallback on Windows)

    Validates DOCX integrity before conversion and emits structured [PDF_CONVERSION] logs.

    Args:
        docx_path:   Absolute path to the .docx file to convert.
        output_dir:  Directory to write the PDF. Defaults to same dir as docx.
        watermark:   Optional watermark text to embed across every page of the PDF.

    Returns:
        Absolute path to the generated .pdf file.

    Raises:
        RuntimeError or ValueError if conversion fails or input DOCX is invalid.
    """
    # Step 1: Pre-conversion DOCX validation (checks ZIP, XML, tables, runs, control chars)
    diag = validate_docx_before_conversion(docx_path)

    out_dir = output_dir or os.path.dirname(docx_path)
    os.makedirs(out_dir, exist_ok=True)
    expected_pdf_path = os.path.join(out_dir, f"{Path(docx_path).stem}.pdf")

    pdf_result_path = None
    ret_code = -1
    ret_stdout = ""
    ret_stderr = ""
    converter_used = "None"

    # Step 2: Primary Engine — LibreOffice headless
    if LIBREOFFICE_AVAILABLE and LIBREOFFICE_PATH and os.path.isfile(LIBREOFFICE_PATH):
        converter_used = "LIBREOFFICE"
        logger.info("Converter selected: LIBREOFFICE")
        logger.info(f"🔄 [PDF_CONVERSION] Primary engine: LibreOffice headless ({LIBREOFFICE_PATH})")
        try:
            pdf_result_path, ret_code, ret_stdout, ret_stderr = _convert_via_libreoffice(
                docx_path, out_dir, timeout=45
            )
        except Exception as lo_err:
            ret_stderr = str(lo_err)
            logger.warning(f"⚠️ [PDF_CONVERSION] LibreOffice conversion failed: {lo_err}")
            pdf_result_path = None
    else:
        logger.info("LibreOffice unavailable — using Microsoft Word fallback")

    # Step 3: Fallback Engine — Microsoft Word COM (Windows only)
    if not pdf_result_path:
        if DOCX2PDF_AVAILABLE and os.name == 'nt':
            converter_used = "MICROSOFT_WORD_FALLBACK"
            logger.info("Converter selected: MICROSOFT_WORD_FALLBACK")
            logger.info(f"🔄 [PDF_CONVERSION] Converter: {converter_used}")
            with word_pdf_lock:
                for attempt in range(2):
                    try:
                        kill_zombie_winword()
                        pdf_result_path, ret_code, ret_stdout, ret_stderr = _convert_via_word(
                            docx_path, out_dir, target_pdf_path=expected_pdf_path
                        )
                        if pdf_result_path and os.path.exists(pdf_result_path):
                            break
                    except Exception as word_err:
                        ret_stderr = str(word_err)
                        logger.warning(f"Word COM attempt {attempt + 1} failed: {word_err}")
                        if attempt < 1:
                            time.sleep(1)
        else:
            err_msg = (
                "No PDF conversion engine available. "
                f"LibreOffice available: {LIBREOFFICE_AVAILABLE} (path: {LIBREOFFICE_PATH}). "
                f"Microsoft Word available: {DOCX2PDF_AVAILABLE} (OS: {os.name})."
            )
            logger.error(f"❌ [PDF_CONVERSION] {err_msg}")
            raise RuntimeError(err_msg)

    # Step 4: Ensure PDF is at the expected path
    if pdf_result_path and pdf_result_path != expected_pdf_path and os.path.exists(pdf_result_path):
        if os.path.exists(expected_pdf_path):
            _safe_remove(expected_pdf_path)
        try:
            os.replace(pdf_result_path, expected_pdf_path)
            pdf_result_path = expected_pdf_path
        except Exception as ren_err:
            logger.warning(f"Could not rename PDF to expected path: {ren_err}")

    # Step 5: Verify generated PDF exists and size > 0
    pdf_exists = bool(pdf_result_path and os.path.exists(pdf_result_path) and os.path.getsize(pdf_result_path) > 0)
    pdf_size = os.path.getsize(pdf_result_path) if pdf_exists else 0

    # Step 6: Detailed backend logging as required by specification
    conversion_log = (
        f"\n[PDF_CONVERSION]\n"
        f"DOCX path: {diag.get('path')}\n"
        f"DOCX exists: {diag.get('exists')}\n"
        f"DOCX size: {diag.get('size')} bytes\n"
        f"DOCX ZIP valid: {diag.get('is_zip')}\n"
        f"python-docx valid: {diag.get('docx_valid')}\n"
        f"Converter: {converter_used}\n"
        f"LibreOffice path: {LIBREOFFICE_PATH or 'None'}\n"
        f"Return code: {ret_code}\n"
        f"stdout: {ret_stdout.strip() if ret_stdout else 'None'}\n"
        f"stderr: {ret_stderr.strip() if ret_stderr else 'None'}\n"
        f"PDF exists: {pdf_exists}\n"
        f"PDF size: {pdf_size} bytes"
    )
    logger.info(conversion_log)
    _safe_print(conversion_log)

    if not pdf_exists:
        raise RuntimeError(
            f"PDF conversion failed via {converter_used}. "
            f"Exit code: {ret_code}, stderr: {ret_stderr or 'output PDF missing or empty'}"
        )

    # Step 7: Apply watermark if requested
    if watermark and pdf_result_path and os.path.exists(pdf_result_path):
        pdf_result_path = add_watermark_to_pdf(pdf_result_path, pdf_result_path, text=watermark)

    return pdf_result_path


def libreoffice_available() -> bool:
    """
    Returns True if ANY PDF engine is available (LibreOffice or Word COM).
    Named for backward compatibility — all callers work without changes.
    """
    return PDF_ENGINE_AVAILABLE

