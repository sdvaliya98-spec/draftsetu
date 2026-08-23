from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from backend import models, database
from backend.routers.auth import get_admin_user
from pydantic import BaseModel

router = APIRouter(prefix="/pages", tags=["pages"])

class PageSchema(BaseModel):
    title: str
    slug: str
    content: str
    is_active: bool = True

@router.get("/")
def get_pages(db: Session = Depends(database.get_db)):
    pages = db.query(models.StaticPage).order_by(models.StaticPage.id).all()
    return pages

@router.get("/{slug}")
def get_page(slug: str, db: Session = Depends(database.get_db)):
    page = db.query(models.StaticPage).filter(models.StaticPage.slug == slug).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return page

@router.post("/", status_code=201)
def create_page(page: PageSchema, db: Session = Depends(database.get_db), admin: models.User = Depends(get_admin_user)):
    existing = db.query(models.StaticPage).filter(models.StaticPage.slug == page.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")
    new_page = models.StaticPage(**page.model_dump())
    db.add(new_page)
    db.commit()
    db.refresh(new_page)
    return new_page

@router.put("/{slug}")
def update_page(slug: str, page: PageSchema, db: Session = Depends(database.get_db), admin: models.User = Depends(get_admin_user)):
    db_page = db.query(models.StaticPage).filter(models.StaticPage.slug == slug).first()
    if not db_page:
        raise HTTPException(status_code=404, detail="Page not found")
    for k, v in page.model_dump().items():
        setattr(db_page, k, v)
    db_page.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Updated"}

@router.delete("/{slug}")
def delete_page(slug: str, db: Session = Depends(database.get_db), admin: models.User = Depends(get_admin_user)):
    db_page = db.query(models.StaticPage).filter(models.StaticPage.slug == slug).first()
    if not db_page:
        raise HTTPException(status_code=404, detail="Page not found")
    db.delete(db_page)
    db.commit()
    return {"message": "Deleted"}
