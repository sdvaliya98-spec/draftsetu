import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, r'd:\new')
from backend import database, models
from sqlalchemy.orm import Session

def apply_mapping():
    db = database.SessionLocal()
    try:
        print("=== APPLYING PHASE 1: DATABASE, MENU & CATEGORY MAPPING UPDATES ===")

        # 1. Update / Create Menu Items
        # Check existing menu items
        menu_items = {m.id: m for m in db.query(models.MenuItem).all()}

        # Menu #7: Sale Deed -> target active tpl_997fd57d
        if 7 in menu_items:
            menu_items[7].template_id = "tpl_997fd57d"
            menu_items[7].type = "template"
            menu_items[7].url = "#"
            print("Updated Menu #7 -> template_id='tpl_997fd57d'")

        # Menu #8: Paper Notice -> target active tpl_adff5672
        if 8 in menu_items:
            menu_items[8].template_id = "tpl_adff5672"
            menu_items[8].type = "template"
            menu_items[8].url = "#"
            print("Updated Menu #8 -> template_id='tpl_adff5672'")

        # Menu #9: Affidavit -> target active tpl_ecd0bc4a
        if 9 in menu_items:
            menu_items[9].template_id = "tpl_ecd0bc4a"
            menu_items[9].type = "template"
            menu_items[9].url = "#"
            print("Updated Menu #9 -> template_id='tpl_ecd0bc4a'")

        # Menu #10: Release Deed -> target active tpl_737760b1
        if 10 in menu_items:
            menu_items[10].template_id = "tpl_737760b1"
            menu_items[10].type = "template"
            menu_items[10].url = "#"
            print("Updated Menu #10 -> template_id='tpl_737760b1'")

        # Menu #12: Hak Kami (Relinquishment) -> strictly static page
        if 12 in menu_items:
            menu_items[12].type = "page"
            menu_items[12].template_id = None
            menu_items[12].url = "page:relinquishment"
            print("Restored Menu #12 -> type='page', url='page:relinquishment'")

        # Create/ensure Pedhinamu Menu Item (ID 16 or new ID)
        pedhinamu_menu = db.query(models.MenuItem).filter(
            models.MenuItem.label.like("%પેઢીનામું%") | models.MenuItem.label.like("%Pedhinamu%")
        ).first()
        if not pedhinamu_menu:
            pedhinamu_menu = models.MenuItem(
                id=16, # explicit ID 16 to fulfill existing references
                label="વારસાઈ / પેઢીનામું (Pedhinamu)",
                type="template",
                template_id="tpl_60cbf655",
                parent_id=2, # DOCUMENT SERVICES
                order_index=5,
                is_active=True,
                icon="👥",
                url="#"
            )
            db.add(pedhinamu_menu)
            db.flush()
            print(f"Created Pedhinamu Menu Item -> ID {pedhinamu_menu.id}")
        else:
            pedhinamu_menu.template_id = "tpl_60cbf655"
            pedhinamu_menu.type = "template"
            pedhinamu_menu.parent_id = 2
            pedhinamu_menu.is_active = True
            print(f"Updated existing Pedhinamu Menu Item -> ID {pedhinamu_menu.id}")

        # Create/ensure Will Menu Item
        will_menu = db.query(models.MenuItem).filter(
            models.MenuItem.label.like("%વસીયત%") | models.MenuItem.label.like("%Will%")
        ).first()
        if not will_menu:
            will_menu = models.MenuItem(
                label="વીલ / વસીયતનામું (Will)",
                type="template",
                template_id="tpl_85507d16",
                parent_id=2, # DOCUMENT SERVICES
                order_index=6,
                is_active=True,
                icon="📜",
                url="#"
            )
            db.add(will_menu)
            db.flush()
            print(f"Created Will Menu Item -> ID {will_menu.id}")
        else:
            will_menu.template_id = "tpl_85507d16"
            will_menu.type = "template"
            will_menu.parent_id = 2
            will_menu.is_active = True
            print(f"Updated existing Will Menu Item -> ID {will_menu.id}")

        # 2. Update DB Templates Categories and menu_item_id foreign keys
        all_templates = db.query(models.DBTemplate).all()

        sale_deed_ids = {
            "tpl_997fd57d", "tpl_8df0793d", "user_tpl_1779160854840", "user_tpl_1779459321872",
            "user_tpl_1779041240586", "user_tpl_1779077713080", "tpl_a5db4381", "user_tpl_1779111765236",
            "user_tpl_1779113710096", "user_tpl_1779247839477", "user_tpl_1779606761609", "tpl_4df5f1f0",
            "user_tpl_1779606965909"
        }
        paper_notice_ids = {
            "tpl_adff5672", "user_tpl_1779041103408", "user_tpl_1779070487907", "user_tpl_1779071810248", "tpl_dc8964e8"
        }
        affidavit_ids = {
            "tpl_ecd0bc4a", "user_tpl_1779333804732"
        }
        relinquishment_ids = {
            "tpl_737760b1", "user_tpl_1779967908487", "tpl_b2f5157c", "user_tpl_1780026105190", "tpl_d9d8efce"
        }
        heirship_ids = {
            "tpl_60cbf655", "user_tpl_1779631229507", "user_tpl_1779889860660", "tpl_c96d2f90", "user_tpl_1779891026070"
        }
        test_dummy_ids = {
            "tpl_bf87e2fa", "tpl_a613e109", "tpl_5e3b3786", "tpl_ad493d8e", "tpl_b5549612", "tpl_abf9c8a5",
            "tpl_3728ecf5", "tpl_d68ba225", "tpl_8189cff7", "tpl_50477b83", "tpl_e47193e3", "tpl_fecb9f97",
            "tpl_96e0bd7e", "tpl_24fe2fb3", "tpl_809514e3", "tpl_1a1c71b9", "user_tpl_1779606989656", "user_tpl_1779958510219"
        }

        for t in all_templates:
            tid = t.template_id

            # Category Assignment
            if tid == "tpl_85507d16":
                t.category = "Will / Vasiyat"
                t.menu_item_id = will_menu.id
            elif tid == "tpl_bcfa246e":
                t.category = "Gift Deed"
                t.menu_item_id = None
            elif tid == "user_tpl_1779436712758":
                t.category = "Power of Attorney"
                t.menu_item_id = None
            elif tid in sale_deed_ids:
                t.category = "Sale Deed"
                if tid in {"tpl_997fd57d", "tpl_8df0793d", "user_tpl_1779160854840", "user_tpl_1779459321872"}:
                    t.menu_item_id = 7
                else:
                    t.menu_item_id = None
            elif tid in paper_notice_ids:
                t.category = "Paper Notice"
                if tid in {"tpl_adff5672", "user_tpl_1779041103408"}:
                    t.menu_item_id = 8
                else:
                    t.menu_item_id = None
            elif tid in affidavit_ids:
                t.category = "Affidavit"
                t.menu_item_id = 9
            elif tid in relinquishment_ids:
                t.category = "Relinquishment"
                if tid == "tpl_737760b1":
                    t.menu_item_id = 10
                else:
                    t.menu_item_id = None
            elif tid in heirship_ids:
                t.category = "Heirship / Pedhinamu"
                t.menu_item_id = pedhinamu_menu.id
            elif tid in test_dummy_ids:
                t.category = "Test / Dummy"
                t.menu_item_id = None
            else:
                t.category = "General"
                t.menu_item_id = None

        db.commit()
        print("✅ PHASE 1 MAPPING APPLIED SUCCESSFULLY")

    except Exception as e:
        db.rollback()
        print(f"❌ Error applying mapping: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    apply_mapping()
