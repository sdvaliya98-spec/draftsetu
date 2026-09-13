import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend import models, database
from backend.routers.auth import get_admin_user

client = TestClient(app)

def test_template_active_archive_restore_delete_lifecycle():
    """
    Regression Test for Template Vault Lifecycle:
    ACTIVE -> ARCHIVE -> RESTORE -> DELETE
    
    Verifies:
    1. Active template can be archived and is hidden from normal active templates.
    2. Archived template can be restored back to active use.
    3. Restored active template can be permanently deleted.
    4. DELETE response is successful (HTTP 200).
    5. GET /api/templates/ no longer contains that template.
    6. No stale menu binding remains referencing the deleted template.
    7. Unrelated templates remain intact and unaffected.
    """
    db = database.SessionLocal()
    try:
        # 0. Fixtures: Admin user and Control (unrelated) template
        admin = db.query(models.User).filter(models.User.username == "admin_lifecycle_test").first()
        if not admin:
            admin = models.User(
                username="admin_lifecycle_test",
                email="admin_lifecycle_test@example.com",
                password_hash="test",
                is_admin=True,
                is_active=True
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        app.dependency_overrides[get_admin_user] = lambda: admin

        # Create isolated menu category
        test_menu = models.MenuItem(
            label="Lifecycle Category",
            type="dropdown",
            order_index=888,
            is_active=True
        )
        db.add(test_menu)
        db.commit()
        db.refresh(test_menu)

        # Unrelated Control Template (must remain completely unchanged throughout)
        control_tpl = models.DBTemplate(
            template_id="tpl_unrelated_control_777",
            name="Unrelated Control Template",
            category="Control",
            is_active=True,
            status="ACTIVE"
        )
        db.add(control_tpl)
        db.commit()

        # Target Lifecycle Template
        target_tpl = models.DBTemplate(
            template_id="tpl_lifecycle_target_888",
            name="Lifecycle Target Template",
            category="Lifecycle",
            is_active=True,
            status="ACTIVE",
            menu_item_id=test_menu.id
        )
        db.add(target_tpl)
        db.commit()

        # Bind menu item to target template
        test_menu.template_id = "tpl_lifecycle_target_888"
        db.commit()

        # --- STEP 1: VERIFY ACTIVE INITIAL STATE ---
        res_initial = client.get("/api/templates/")
        assert res_initial.status_code == 200
        active_ids = [t["template_id"] for t in res_initial.json()]
        assert "tpl_lifecycle_target_888" in active_ids
        assert "tpl_unrelated_control_777" in active_ids

        # --- STEP 2: ACTIVE -> ARCHIVE ---
        archive_res = client.post("/api/templates/tpl_lifecycle_target_888/archive")
        assert archive_res.status_code == 200
        assert archive_res.json()["success"] is True

        # Verify hidden from active templates
        res_archived_check = client.get("/api/templates/")
        active_ids_after_archive = [t["template_id"] for t in res_archived_check.json()]
        assert "tpl_lifecycle_target_888" not in active_ids_after_archive
        assert "tpl_unrelated_control_777" in active_ids_after_archive

        # Verify present in admin archived list
        archived_list_res = client.get("/api/templates/archived")
        assert archived_list_res.status_code == 200
        archived_ids = [t["template_id"] for t in archived_list_res.json()]
        assert "tpl_lifecycle_target_888" in archived_ids

        # --- STEP 3: ARCHIVED -> RESTORE ---
        restore_res = client.post("/api/templates/tpl_lifecycle_target_888/restore")
        assert restore_res.status_code == 200
        assert restore_res.json()["success"] is True

        # Verify restored template is back in active templates
        res_restored_check = client.get("/api/templates/")
        active_ids_after_restore = [t["template_id"] for t in res_restored_check.json()]
        assert "tpl_lifecycle_target_888" in active_ids_after_restore
        assert "tpl_unrelated_control_777" in active_ids_after_restore

        # Re-attach menu binding to test deletion unbinding
        test_menu.template_id = "tpl_lifecycle_target_888"
        db.commit()

        # --- STEP 4: RESTORED ACTIVE -> DELETE ---
        delete_res = client.delete("/api/templates/tpl_lifecycle_target_888")
        assert delete_res.status_code == 200
        delete_body = delete_res.json()
        assert delete_body["success"] is True
        assert "permanently deleted" in delete_body["message"]

        # --- STEP 5: VERIFICATIONS ---
        # 1. Template no longer in active templates
        res_final_active = client.get("/api/templates/")
        final_active_ids = [t["template_id"] for t in res_final_active.json()]
        assert "tpl_lifecycle_target_888" not in final_active_ids

        # 2. Template no longer in archived templates
        res_final_archived = client.get("/api/templates/archived")
        final_archived_ids = [t["template_id"] for t in res_final_archived.json()]
        assert "tpl_lifecycle_target_888" not in final_archived_ids

        # 3. Database query confirms total removal
        db_check = db.query(models.DBTemplate).filter(models.DBTemplate.template_id == "tpl_lifecycle_target_888").first()
        assert db_check is None

        # 4. No stale menu binding remains
        db.refresh(test_menu)
        assert test_menu.template_id is None

        # 5. Unrelated control template remains intact and active
        db_control = db.query(models.DBTemplate).filter(models.DBTemplate.template_id == "tpl_unrelated_control_777").first()
        assert db_control is not None
        assert db_control.status == "ACTIVE"
        assert db_control.is_active is True
        assert "tpl_unrelated_control_777" in final_active_ids

        print("\n[SUCCESS] ACTIVE -> ARCHIVE -> RESTORE -> DELETE lifecycle regression test passed completely!")

    finally:
        app.dependency_overrides.clear()
        try:
            db.query(models.DBTemplate).filter(
                models.DBTemplate.template_id.in_(["tpl_lifecycle_target_888", "tpl_unrelated_control_777"])
            ).delete(synchronize_session=False)
            db.query(models.MenuItem).filter(models.MenuItem.label == "Lifecycle Category").delete(synchronize_session=False)
            db.commit()
        except Exception:
            db.rollback()
        db.close()

if __name__ == "__main__":
    test_template_active_archive_restore_delete_lifecycle()
