import pytest
import os
import re
from docx import Document
from backend.services.docx_engine import (
    render_docx_template,
    extract_variables_from_docx,
)

def strip_markers(text: str) -> str:
    cleaned = re.sub(r'\[\[\[VAR_START:[^\]]+\]\]\]', '', text)
    cleaned = re.sub(r'\[\[\[VAR_MISSING:[^\]]+\]\]\]', '', cleaned)
    cleaned = re.sub(r'\[\[\[VAR_END\]\]\]', '', cleaned)
    return cleaned

def create_docx_with_paragraphs(paragraphs_list):
    os.makedirs("tests/temp", exist_ok=True)
    temp_path = os.path.join("tests/temp", f"sync_test_{os.urandom(4).hex()}.docx")
    doc = Document()
    for p in paragraphs_list:
        doc.add_paragraph(p)
    doc.save(temp_path)
    return temp_path

def get_temp_out():
    os.makedirs("tests/temp", exist_ok=True)
    return os.path.join("tests/temp", f"sync_out_{os.urandom(4).hex()}.docx")

def test_empty_vendors_zero_rows_all_occurrences():
    """Requirement 1: Zero vendor rows in every VENDORS occurrence, no Sample Name/Relation."""
    tpl_text = [
        "Header Notice",
        "{%p for vendor in VENDORS %}",
        "The Vendor: {{ vendor.name }} {{ vendor.relation }}",
        "{%p endfor %}",
        "Middle Body Clause",
        "{%p for vendor in VENDORS %}",
        "Signature: {{ vendor.name }} - {{ vendor.relation }}",
        "{%p endfor %}",
    ]
    tmpl_path = create_docx_with_paragraphs(tpl_text)
    out_path = get_temp_out()
    try:
        render_docx_template(tmpl_path, {"VENDORS": []}, out_path, preview=True)
        doc = Document(out_path)
        full_text = "\n".join(p.text for p in doc.paragraphs)
        assert "The Vendor:" not in full_text
        assert "Signature:" not in full_text
        assert "Sample Name" not in full_text
        assert "Sample Relation" not in full_text
        assert "Header Notice" in full_text
        assert "Middle Body Clause" in full_text
    finally:
        for f in [tmpl_path, out_path]:
            if os.path.exists(f): os.remove(f)

def test_one_vendor_propagates_to_all_occurrences():
    """Requirement 2: One Vendor appears in all VENDORS occurrences identically."""
    tpl_text = [
        "{%p for vendor in VENDORS %}",
        "The Vendor: {{ vendor.name }} {{ vendor.relation }} aged {{ vendor.age }}",
        "{%p endfor %}",
        "Terms and Conditions",
        "{%p for vendor in VENDORS %}",
        "Sign: {{ vendor.name }} ({{ vendor.relation }})",
        "{%p endfor %}",
    ]
    tmpl_path = create_docx_with_paragraphs(tpl_text)
    out_path = get_temp_out()
    try:
        data = {
            "VENDORS": [
                {"name": "Ramesh Patel", "relation": "S/o XYZ", "age": "45"}
            ]
        }
        render_docx_template(tmpl_path, data, out_path, preview=True)
        doc = Document(out_path)
        full_text = "\n".join(p.text for p in doc.paragraphs)
        clean_text = strip_markers(full_text)
        assert "The Vendor: Ramesh Patel S/o XYZ aged 45" in clean_text
        assert "Sign: Ramesh Patel (S/o XYZ)" in clean_text
        assert clean_text.count("Ramesh Patel") == 2
        assert clean_text.count("S/o XYZ") == 2
        assert "Sample Name" not in clean_text
    finally:
        for f in [tmpl_path, out_path]:
            if os.path.exists(f): os.remove(f)

def test_two_vendors_ordering_across_all_occurrences():
    """Requirement 3: Two vendors appear in all occurrences with exact same ordering."""
    tpl_text = [
        "{%p for vendor in VENDORS %}",
        "Occ1: {{ vendor.index }}. {{ vendor.name }} - {{ vendor.relation }}",
        "{%p endfor %}",
        "{%p for vendor in VENDORS %}",
        "Occ2: {{ vendor.index }}. {{ vendor.name }} Signature",
        "{%p endfor %}",
    ]
    tmpl_path = create_docx_with_paragraphs(tpl_text)
    out_path = get_temp_out()
    try:
        data = {
            "VENDORS": [
                {"name": "Ramesh Patel", "relation": "S/o XYZ"},
                {"name": "Suresh Patel", "relation": "S/o ABC"}
            ]
        }
        render_docx_template(tmpl_path, data, out_path, preview=True)
        doc = Document(out_path)
        full_text = "\n".join(p.text for p in doc.paragraphs)
        clean_text = strip_markers(full_text)
        assert clean_text.count("Ramesh Patel") == 2
        assert clean_text.count("Suresh Patel") == 2
        # Verify ordering in Occ1
        occ1_ramesh = clean_text.find("Occ1: 1. Ramesh Patel")
        occ1_suresh = clean_text.find("Occ1: 2. Suresh Patel")
        assert 0 <= occ1_ramesh < occ1_suresh
        # Verify ordering in Occ2
        occ2_ramesh = clean_text.find("Occ2: 1. Ramesh Patel")
        occ2_suresh = clean_text.find("Occ2: 2. Suresh Patel")
        assert occ1_suresh < occ2_ramesh < occ2_suresh
    finally:
        for f in [tmpl_path, out_path]:
            if os.path.exists(f): os.remove(f)

def test_delete_one_vendor_updates_all_occurrences():
    """Requirement 4: Deleting vendor 2 immediately updates all occurrences."""
    tpl_text = [
        "{%p for vendor in VENDORS %}",
        "V: {{ vendor.name }}",
        "{%p endfor %}",
        "{%p for vendor in VENDORS %}",
        "Sign: {{ vendor.name }}",
        "{%p endfor %}",
    ]
    tmpl_path = create_docx_with_paragraphs(tpl_text)
    out_path = get_temp_out()
    try:
        # After user deletes Suresh Patel:
        data = {
            "VENDORS": [
                {"name": "Ramesh Patel", "relation": "S/o XYZ"}
            ]
        }
        render_docx_template(tmpl_path, data, out_path, preview=True)
        doc = Document(out_path)
        clean_text = strip_markers("\n".join(p.text for p in doc.paragraphs))
        assert "Suresh Patel" not in clean_text
        assert clean_text.count("Ramesh Patel") == 2
    finally:
        for f in [tmpl_path, out_path]:
            if os.path.exists(f): os.remove(f)

def test_delete_final_vendor_clears_all_occurrences():
    """Requirement 5: Deleting final vendor leaves all occurrences empty without sample fallback."""
    tpl_text = [
        "{%p for vendor in VENDORS %}",
        "V: {{ vendor.name }}",
        "{%p endfor %}",
        "{%p for vendor in VENDORS %}",
        "Sign: {{ vendor.name }}",
        "{%p endfor %}",
    ]
    tmpl_path = create_docx_with_paragraphs(tpl_text)
    out_path = get_temp_out()
    try:
        # All vendors deleted:
        data = {"VENDORS": []}
        render_docx_template(tmpl_path, data, out_path, preview=True)
        doc = Document(out_path)
        clean_text = strip_markers("\n".join(p.text for p in doc.paragraphs))
        assert "V:" not in clean_text
        assert "Sign:" not in clean_text
        assert "Sample Name" not in clean_text
        assert "Sample Relation" not in clean_text
    finally:
        for f in [tmpl_path, out_path]:
            if os.path.exists(f): os.remove(f)

def test_vendor_type_individual_vs_entity_visibility():
    """Requirement 6 & 7: VENDOR_TYPE INDIVIDUAL vs ENTITY conditional rendering."""
    tpl_text = [
        "{%p if VENDOR_TYPE == 'INDIVIDUAL' %}",
        "{%p for vendor in VENDORS %}",
        "Individual Vendor: {{ vendor.name }}",
        "{%p endfor %}",
        "{%p endif %}",
        "{%p if VENDOR_TYPE == 'ENTITY' %}",
        "Entity Name: {{ VENDOR_ENTITY_NAME }}",
        "{%p for rep in VENDOR_REPRESENTATIVES %}",
        "Representative: {{ rep.name }}",
        "{%p endfor %}",
        "{%p endif %}",
    ]
    tmpl_path = create_docx_with_paragraphs(tpl_text)
    out_path1 = get_temp_out()
    out_path2 = get_temp_out()
    try:
        # Case 1: INDIVIDUAL
        data_ind = {
            "VENDOR_TYPE": "INDIVIDUAL",
            "VENDORS": [{"name": "Ramesh Patel"}],
            "VENDOR_ENTITY_NAME": "ABC Realty Pvt Ltd",
            "VENDOR_REPRESENTATIVES": [{"name": "Director Dinesh"}]
        }
        render_docx_template(tmpl_path, data_ind, out_path1, preview=True)
        text_ind = strip_markers("\n".join(p.text for p in Document(out_path1).paragraphs))
        assert "Individual Vendor: Ramesh Patel" in text_ind
        assert "Entity Name:" not in text_ind
        assert "Representative:" not in text_ind

        # Case 2: ENTITY
        data_ent = {
            "VENDOR_TYPE": "ENTITY",
            "VENDORS": [{"name": "Ramesh Patel"}],
            "VENDOR_ENTITY_NAME": "ABC Realty Pvt Ltd",
            "VENDOR_REPRESENTATIVES": [{"name": "Director Dinesh"}]
        }
        render_docx_template(tmpl_path, data_ent, out_path2, preview=True)
        text_ent = strip_markers("\n".join(p.text for p in Document(out_path2).paragraphs))
        assert "Individual Vendor:" not in text_ent
        assert "Entity Name: ABC Realty Pvt Ltd" in text_ent
        assert "Representative: Director Dinesh" in text_ent
    finally:
        for f in [tmpl_path, out_path1, out_path2]:
            if os.path.exists(f): os.remove(f)

def test_vendor_representatives_separate_collection():
    """Requirement 8: VENDOR_REPRESENTATIVES remains separate from VENDORS."""
    tpl_text = [
        "{%p for vendor in VENDORS %}",
        "Vendor: {{ vendor.name }}",
        "{%p endfor %}",
        "{%p for rep in VENDOR_REPRESENTATIVES %}",
        "Representative: {{ rep.name }}",
        "{%p endfor %}",
    ]
    tmpl_path = create_docx_with_paragraphs(tpl_text)
    out_path = get_temp_out()
    try:
        data = {
            "VENDORS": [{"name": "Vendor A"}],
            "VENDOR_REPRESENTATIVES": [{"name": "Rep B"}]
        }
        render_docx_template(tmpl_path, data, out_path, preview=True)
        doc = Document(out_path)
        text = strip_markers("\n".join(p.text for p in doc.paragraphs))
        assert "Vendor: Vendor A" in text
        assert "Representative: Rep B" in text
        assert text.count("Vendor A") == 1
        assert text.count("Rep B") == 1
    finally:
        for f in [tmpl_path, out_path]:
            if os.path.exists(f): os.remove(f)

def test_purchasers_repeated_loop_occurrences():
    """Requirement 9: PURCHASERS repeated loop occurrences use one array."""
    tpl_text = [
        "{%p for p in PURCHASERS %}",
        "Purchaser Clause: {{ p.name }} ({{ p.pan }})",
        "{%p endfor %}",
        "Middle text",
        "{%p for p in PURCHASERS %}",
        "Purchaser Signature: {{ p.name }}",
        "{%p endfor %}",
    ]
    tmpl_path = create_docx_with_paragraphs(tpl_text)
    out_path = get_temp_out()
    try:
        data = {
            "PURCHASERS": [
                {"name": "Anil Shah", "pan": "ABCDE1234F"},
                {"name": "Sunil Shah", "pan": "XYZPK5678M"}
            ]
        }
        render_docx_template(tmpl_path, data, out_path, preview=True)
        doc = Document(out_path)
        text = strip_markers("\n".join(p.text for p in doc.paragraphs))
        assert text.count("Anil Shah") == 2
        assert text.count("Sunil Shah") == 2
        assert text.count("ABCDE1234F") == 1
    finally:
        for f in [tmpl_path, out_path]:
            if os.path.exists(f): os.remove(f)

def test_plots_repeated_loop_occurrences():
    """Requirement 10: PLOTS repeated loop occurrences use one array."""
    tpl_text = [
        "{%p for plot in PLOTS %}",
        "Plot Schedule: No {{ plot.number }} Area {{ plot.area }}",
        "{%p endfor %}",
        "{%p for plot in PLOTS %}",
        "Boundary Plot: No {{ plot.number }}",
        "{%p endfor %}",
    ]
    tmpl_path = create_docx_with_paragraphs(tpl_text)
    out_path = get_temp_out()
    try:
        data = {
            "PLOTS": [
                {"number": "101", "area": "500 sq.ft"},
                {"number": "102", "area": "600 sq.ft"}
            ]
        }
        render_docx_template(tmpl_path, data, out_path, preview=True)
        doc = Document(out_path)
        text = strip_markers("\n".join(p.text for p in doc.paragraphs))
        assert text.count("No 101") == 2
        assert text.count("No 102") == 2
    finally:
        for f in [tmpl_path, out_path]:
            if os.path.exists(f): os.remove(f)

def test_payments_repeated_loop_occurrences():
    """Requirement 11: PAYMENTS repeated loop occurrences use one array."""
    tpl_text = [
        "{%p for pay in PAYMENTS %}",
        "Payment Table: Rs. {{ pay.amount }} via {{ pay.mode }}",
        "{%p endfor %}",
        "{%p for pay in PAYMENTS %}",
        "Receipt: Rs. {{ pay.amount }}",
        "{%p endfor %}",
    ]
    tmpl_path = create_docx_with_paragraphs(tpl_text)
    out_path = get_temp_out()
    try:
        data = {
            "PAYMENTS": [
                {"amount": "50,000", "mode": "Cheque"},
                {"amount": "25,000", "mode": "NEFT"}
            ]
        }
        render_docx_template(tmpl_path, data, out_path, preview=True)
        doc = Document(out_path)
        text = strip_markers("\n".join(p.text for p in doc.paragraphs))
        assert text.count("50,000") == 2
        assert text.count("25,000") == 2
    finally:
        for f in [tmpl_path, out_path]:
            if os.path.exists(f): os.remove(f)

def test_land_records_multi_applicant_mapping():
    """Requirement 12: Existing LAND_RECORDS multi-applicant occupant mapping remains intact."""
    tpl_text = [
        "{%p for lr in LAND_RECORDS %}",
        "Survey {{ lr.survey_no }} Owners: {{ lr.owner_name }}",
        "{%p endfor %}",
    ]
    tmpl_path = create_docx_with_paragraphs(tpl_text)
    out_path = get_temp_out()
    try:
        data = {
            "APPLICANTS": [
                {"name": "Ghanshyam Patel"},
                {"name": "Vitthal Solanki"}
            ],
            "LAND_RECORDS": [
                {
                    "survey_no": "123",
                    "owner_applicant_indices": [1, 2],
                    "owner_other_names": ["External Co-owner"]
                }
            ]
        }
        render_docx_template(tmpl_path, data, out_path, preview=True)
        doc = Document(out_path)
        text = strip_markers("\n".join(p.text for p in doc.paragraphs))
        assert "Survey 123 Owners: Ghanshyam Patel, Vitthal Solanki, External Co-owner" in text
    finally:
        for f in [tmpl_path, out_path]:
            if os.path.exists(f): os.remove(f)
