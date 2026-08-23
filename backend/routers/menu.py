from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from backend import models, database
from backend.routers.auth import get_admin_user
from pydantic import BaseModel

router = APIRouter(prefix="/menu", tags=["menu"])

class MenuItemBase(BaseModel):
    label: str
    url: Optional[str] = "#"
    icon: Optional[str] = "📄"
    parent_id: Optional[int] = None
    order_index: Optional[int] = 0
    is_active: Optional[bool] = True
    type: Optional[str] = "page"
    template_id: Optional[str] = None

class MenuItemCreate(MenuItemBase):
    pass

class MenuItemUpdate(MenuItemBase):
    pass

@router.get("/")
def get_menu(db: Session = Depends(database.get_db)):
    def build_tree(items, parent_id=None):
        return [
            {
                "id": i.id,
                "label": i.label,
                "url": i.url,
                "icon": i.icon,
                "type": i.type,
                "template_id": i.template_id,
                "children": build_tree(items, i.id)
            }
            for i in items if i.parent_id == parent_id
        ]
    items = db.query(models.MenuItem).filter(models.MenuItem.is_active == True).all()
    return build_tree(items)

@router.get("/all")
def get_menu_all(db: Session = Depends(database.get_db)):
    items = db.query(models.MenuItem).order_by(models.MenuItem.order_index).all()
    return items

def check_circular_parent(item_id: int, parent_id: Optional[int], db: Session) -> bool:
    curr_parent_id = parent_id
    visited = set()
    while curr_parent_id is not None:
        if curr_parent_id == item_id:
            return True
        if curr_parent_id in visited:
            break
        visited.add(curr_parent_id)
        parent_item = db.query(models.MenuItem).filter(models.MenuItem.id == curr_parent_id).first()
        if not parent_item:
            break
        curr_parent_id = parent_item.parent_id
    return False

@router.post("/", status_code=201)
def create_menu_item(item: MenuItemCreate, db: Session = Depends(database.get_db), admin: models.User = Depends(get_admin_user)):
    new_item = models.MenuItem(**item.model_dump())
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.put("/{item_id}")
def update_menu_item(item_id: int, item: MenuItemUpdate, db: Session = Depends(database.get_db), admin: models.User = Depends(get_admin_user)):
    db_item = db.query(models.MenuItem).filter(models.MenuItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
        
    if item.parent_id is not None:
        if item.parent_id == item_id or check_circular_parent(item_id, item.parent_id, db):
            raise HTTPException(status_code=400, detail="Circular parent reference detected")
            
    for k, v in item.model_dump().items():
        setattr(db_item, k, v)
    db.commit()
    return {"message": "Updated"}

@router.delete("/{item_id}")
def delete_menu_item(item_id: int, db: Session = Depends(database.get_db), admin: models.User = Depends(get_admin_user)):
    db_item = db.query(models.MenuItem).filter(models.MenuItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    db.delete(db_item)
    db.commit()
    return {"message": "Deleted"}
