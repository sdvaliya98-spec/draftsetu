from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import json
import os
import re
from typing import List

from backend import models, database
from backend.core.config import settings
from backend.core.constants import DEMO_DATASET_DIR
import logging

logger = logging.getLogger("backend.demo_datasets")

router = APIRouter(prefix="/demo-datasets", tags=["demo-datasets"])

DEMO_DIR = str(DEMO_DATASET_DIR)


def _is_safe_dataset_id(dataset_id: str) -> tuple[bool, str]:
    """
    Validate a dataset_id for filesystem safety while allowing Unicode (Gujarati) names.

    Allowed:
      - Unicode letters (Lo, Lu, Ll, Lt, Lm)         — Gujarati base letters, Latin, etc.
      - Unicode marks (Mn, Mc, Me)                    — Gujarati virama (્), vowel signs (ી, ો, etc.)
      - Unicode digits / numbers (Nd, Nl, No)
      - Connector punctuation (Pc)                     — underscore _ is Pc
      - ASCII hyphen -

    Blocked (traversal / injection vectors):
      - Path separators: / or \\ anywhere in the string
      - Parent-directory traversal tokens: .. anywhere
      - Null bytes or ASCII control characters (codepoint < 0x20)
      - Absolute path prefixes (Windows drive letter C:, Unix leading /)
      - Any character not matching the allowed Unicode categories above

    Returns: (is_valid: bool, reason: str)
    """
    import unicodedata

    ALLOWED_CATEGORIES = {
        "Lu", "Ll", "Lt", "Lm", "Lo",   # Letters
        "Mn", "Mc", "Me",                # Combining / modifier marks (virama, vowel signs)
        "Nd", "Nl", "No",                # Numbers
        "Pc",                            # Connector punctuation (underscore)
    }

    if not dataset_id:
        return False, "dataset_id is empty"

    # Block null bytes and ASCII control characters
    if any(ord(c) < 0x20 for c in dataset_id):
        return False, "contains null/control characters"

    # Block any form of path separator
    if "/" in dataset_id or "\\" in dataset_id:
        return False, "contains path separator characters (/ or \\)"

    # Block parent-directory traversal token (..)
    if ".." in dataset_id:
        return False, "contains parent-directory traversal token (..)"

    # Block Windows absolute paths (e.g. C:, D:)
    if re.match(r"^[A-Za-z]:", dataset_id):
        return False, "resembles an absolute Windows path"

    # Block Unix absolute paths (leading /) — already caught by separator check, explicit for clarity
    if dataset_id.startswith("/"):
        return False, "resembles an absolute Unix path"

    # Character-level Unicode category check:
    # Allow letters, combining marks, digits, connector punctuation (underscore), and hyphen.
    for ch in dataset_id:
        if ch == "-":
            continue  # hyphen is always allowed
        cat = unicodedata.category(ch)
        if cat not in ALLOWED_CATEGORIES:
            return False, (
                f"contains disallowed character U+{ord(ch):04X} "
                f"(category {cat!r}) — only letters, combining marks, "
                f"digits, underscores, and hyphens are permitted"
            )

    return True, "ok"


@router.get("/", response_model=List[dict])
def get_demo_datasets():
    """
    Returns a list of available demo datasets, auto-discovered from the demo_datasets directory.
    Falls back to a static list if the directory cannot be read.
    """
    abs_demo_dir = os.path.abspath(DEMO_DIR)

    datasets = []
    try:
        if os.path.isdir(abs_demo_dir):
            for fname in sorted(os.listdir(abs_demo_dir)):
                if fname.endswith(".json"):
                    dataset_id = fname[:-5]  # strip .json
                    valid, _ = _is_safe_dataset_id(dataset_id)
                    if valid:
                        datasets.append({"id": dataset_id, "name": dataset_id})
            logger.info(f"[demo-datasets] Auto-discovered {len(datasets)} datasets from {abs_demo_dir}")
        else:
            logger.warning(f"[demo-datasets] Demo directory not found: {abs_demo_dir}")
    except Exception as e:
        logger.error(f"[demo-datasets] Error scanning demo directory: {e}")

    # Fallback to static list if directory scan returned nothing
    if not datasets:
        datasets = [
            {"id": "sale_deed_demo", "name": "વેચાણ દસ્તાવેજ Demo"},
            {"id": "varasai_demo",   "name": "વારસાઈ Demo"},
            {"id": "pedhinamu_demo", "name": "પેઢીનામું Demo"},
        ]
        logger.warning("[demo-datasets] Using static fallback dataset list.")

    return datasets


def _generate_mock_data_for_template(fields_json_str: str, field_order_json_str: str) -> dict:
    from datetime import datetime
    import json

    mock_data = {}
    
    def get_sample_value(field_name: str, field_type: str = "text") -> str:
        name_lower = field_name.lower()
        if "date" in name_lower or name_lower == "dob":
            return datetime.utcnow().strftime("%Y-%m-%d")
        elif "mobile" in name_lower or "phone" in name_lower:
            return "9876543210"
        elif "survey" in name_lower:
            return "123"
        elif "village" in name_lower:
            return "Sample Village"
        elif "name" in name_lower:
            return "Sample Name"
        elif "amount" in name_lower:
            if "word" in name_lower:
                return "Sample Amount in Words"
            return "100000"
        elif "address" in name_lower:
            return "Sample Address"
        elif "pan" in name_lower:
            return "ABCDE1234F"
        elif "aadhaar" in name_lower or "aadhar" in name_lower:
            return "123456789012"
        elif "email" in name_lower:
            return "sample@example.com"
        elif "age" in name_lower:
            return "45"
        elif field_type == "date":
            return datetime.utcnow().strftime("%Y-%m-%d")
        else:
            clean_name = field_name.replace("_", " ").title()
            return f"Sample {clean_name}"

    fields_config = {}
    if fields_json_str:
        try:
            fields_config = json.loads(fields_json_str)
        except Exception:
            pass

    groups = {}
    single_variables = []

    if field_order_json_str:
        try:
            order_data = json.loads(field_order_json_str)
            if isinstance(order_data, dict):
                groups = order_data.get("groups", {})
                single_variables = order_data.get("single_variables", [])
            elif isinstance(order_data, list):
                current_group_name = None
                for item in order_data:
                    if item.startswith("#"):
                        current_group_name = item[1:]
                        groups[current_group_name] = []
                    elif item.startswith("/"):
                        current_group_name = None
                    else:
                        if current_group_name:
                            groups[current_group_name].append(item)
                        else:
                            single_variables.append(item)
        except Exception:
            pass

    if not single_variables and not groups:
        for f_name, f_conf in fields_config.items():
            if isinstance(f_conf, dict) and f_conf.get("type") == "repeater":
                groups[f_name] = [sub.get("name") for sub in f_conf.get("fields", [])]
            else:
                single_variables.append(f_name)

    for var in single_variables:
        f_type = "text"
        if var in fields_config and isinstance(fields_config[var], dict):
            f_type = fields_config[var].get("type", "text")
        mock_data[var] = get_sample_value(var, f_type)

    # Heir-like group names that should have nested children for NestedRepeater
    heir_group_names = {'heirs', 'family_members', 'members', 'heir_tree'}

    for grp_name, grp_fields in groups.items():
        is_heir_group = grp_name.lower() in heir_group_names

        def _make_entry(fields_list, index_str):
            entry = {}
            for field in fields_list:
                if field == "index":
                    entry["index"] = index_str
                else:
                    f_type = "text"
                    if field in fields_config and isinstance(fields_config[field], dict):
                        f_type = fields_config[field].get("type", "text")
                    entry[field] = get_sample_value(field, f_type)
            if is_heir_group:
                entry["children"] = []
            return entry

        list_data = []
        if is_heir_group:
            # Generate a small nested tree: 1 root with 1 child who has 1 grandchild
            root = _make_entry(grp_fields, "1")
            child = _make_entry(grp_fields, "1.1")
            grandchild = _make_entry(grp_fields, "1.1.1")
            child["children"] = [grandchild]
            root["children"] = [child]
            list_data.append(root)
        else:
            for i in range(2):
                list_data.append(_make_entry(grp_fields, str(i + 1)))

        mock_data[grp_name] = list_data

    return mock_data


@router.get("/{dataset_id:path}")
def get_demo_dataset(dataset_id: str, db: Session = Depends(database.get_db)):
    """Loads and returns the specified demo dataset JSON, falling back to dynamic generation."""

    logger.info(f"[demo-datasets] Received dataset_id: {repr(dataset_id)}")

    # ── Step 1: Validate the dataset_id for traversal / injection ──────────
    is_valid, reason = _is_safe_dataset_id(dataset_id)
    if not is_valid:
        logger.warning(
            f"[demo-datasets] ⚠️ Rejected dataset_id={repr(dataset_id)} | reason: {reason}"
        )
        raise HTTPException(
            status_code=400,
            detail=f"Invalid dataset identifier: {reason}"
        )

    # ── Step 2: Build and bound-check the resolved file path ────────────────
    abs_demo_dir = os.path.abspath(DEMO_DIR)
    candidate_path = os.path.normpath(os.path.join(abs_demo_dir, f"{dataset_id}.json"))
    abs_candidate = os.path.abspath(candidate_path)

    logger.info(f"[demo-datasets] Resolved file path: {abs_candidate}")

    # Strict directory-boundary check (defence-in-depth after regex validation)
    if not abs_candidate.startswith(abs_demo_dir + os.sep) and abs_candidate != abs_demo_dir:
        logger.warning(
            f"[demo-datasets] ⚠️ Path boundary violation: {abs_candidate} "
            f"is outside {abs_demo_dir}"
        )
        raise HTTPException(status_code=400, detail="Path traversal attempt blocked")

    # ── Step 3: Check file existence or fall back to dynamic generation ─────
    if not os.path.isfile(abs_candidate):
        logger.info(f"[demo-datasets] File not found: {abs_candidate}. Attempting dynamic fallback.")
        
        # Determine the baseName (JS maps slug, name normalized, or template_id + '_demo')
        base_name = dataset_id[:-5] if dataset_id.endswith("_demo") else dataset_id
        
        db_tpl = None
        try:
            # Query active templates
            tpls = db.query(models.DBTemplate).filter(models.DBTemplate.is_active == True).all()
            for t in tpls:
                # Normalization matching FormPanel.jsx logic:
                # name.trim().toLowerCase().replace(/[\s-]+/g, '_')
                normalized_db_name = t.name.strip().lower()
                normalized_db_name = re.sub(r'[\s-]+', '_', normalized_db_name)
                
                if t.template_id == base_name or normalized_db_name == base_name:
                    db_tpl = t
                    break
        except Exception as db_err:
            logger.error(f"[demo-datasets] Database lookup error during fallback: {db_err}")

        if db_tpl:
            logger.info(f"[demo-datasets] Successfully resolved template: {db_tpl.name} ({db_tpl.template_id}) for dataset_id={dataset_id}")
            return _generate_mock_data_for_template(db_tpl.fields_json, db_tpl.field_order_json)
        
        # Scan the directory for close matches to help detect filename typos if fallback fails
        available = []
        try:
            if os.path.isdir(abs_demo_dir):
                available = [
                    f[:-5] for f in os.listdir(abs_demo_dir)
                    if f.endswith(".json")
                ]
        except Exception:
            pass

        if available:
            logger.warning(
                f"[demo-datasets] File and template not found. "
                f"Available datasets: {available}"
            )
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Demo dataset '{dataset_id}' not found. "
                    f"Available datasets: {', '.join(available)}"
                )
            )
        else:
            logger.warning(f"[demo-datasets] File and template not found and demo dir is empty or missing: {abs_candidate}")
            raise HTTPException(status_code=404, detail=f"Demo dataset '{dataset_id}' not found")

    # ── Step 4: Load and return the JSON ────────────────────────────────────
    try:
        with open(abs_candidate, "r", encoding="utf-8") as f:
            data = json.load(f)
        logger.info(f"[demo-datasets] Successfully loaded dataset: {dataset_id}")
        return data
    except json.JSONDecodeError as e:
        logger.error(f"[demo-datasets] JSON parse error in {abs_candidate}: {e}")
        raise HTTPException(status_code=500, detail=f"Demo dataset '{dataset_id}' contains invalid JSON: {e}")
    except Exception as e:
        logger.error(f"[demo-datasets] Unexpected error loading {abs_candidate}: {e}")
        raise HTTPException(status_code=500, detail="Failed to load demo dataset")
