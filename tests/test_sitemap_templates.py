import pytest
from backend import main, database, models
from backend.utils.slug import get_template_slug

def test_get_template_slug_deterministic():
    # Test stability and independence
    slug1 = get_template_slug("વેચાણ ખેતીની જમીનનો દસ્તાવેજ", "tpl_997fd57d")
    slug2 = get_template_slug("વેચાણ ખેતીની જમીનનો દસ્તાવેજ", "tpl_997fd57d")
    assert slug1 == slug2
    assert slug1 == "vechan-khetini-jaminno-dastavej-997fd57d"
    
    # Test duplicate title with different ID
    slug_dup = get_template_slug("વેચાણ ખેતીની જમીનનો દસ્તાવેજ", "tpl_825d4845")
    assert slug_dup == "vechan-khetini-jaminno-dastavej-825d4845"
    assert slug1 != slug_dup

def test_sitemap_generation_includes_active_templates():
    db = database.SessionLocal()
    try:
        resp = main.get_sitemap_xml(db)
        assert resp.status_code == 200
        xml_content = resp.body.decode('utf-8')
        
        assert "https://draftsetu.in/" in xml_content
        assert "https://draftsetu.in/privacy-policy" in xml_content
        assert "https://draftsetu.in/terms-of-service" in xml_content
        assert "https://draftsetu.in/templates/vechan-khetini-jaminno-dastavej-997fd57d" in xml_content
        assert "https://draftsetu.in/templates/vechan-banakhat-kabja-sathe-1ee12a63" in xml_content
        assert "https://draftsetu.in/templates/hakk-release-no-lekh-737760b1" in xml_content
        assert "https://draftsetu.in/non-agricultural" in xml_content
        assert "https://draftsetu.in/page:non-agricultural" not in xml_content
    finally:
        db.close()

def test_robots_txt_rules():
    resp = main.get_robots_txt()
    assert resp.status_code == 200
    content = resp.body.decode('utf-8')
    assert "Allow: /non-agricultural" in content
    assert "Allow: /terms-of-service" in content
    assert "Sitemap: https://draftsetu.in/sitemap.xml" in content
