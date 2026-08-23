from sqlalchemy import Boolean, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.database import Base, JSONText
import uuid


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    birth_date = Column(String, nullable=True)
    mobile_number = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    documents = relationship("DocumentSubmission", back_populates="user")
    wallet = relationship("Wallet", back_populates="user", uselist=False)


class DocumentSubmission(Base):
    __tablename__ = "document_submissions"

    id = Column(Integer, primary_key=True, index=True)
    tracking_id = Column(String, unique=True, index=True, default=lambda: f"DOC-{uuid.uuid4().hex[:8].upper()}")
    survey_no = Column(String, nullable=True)
    buyer_name = Column(String, nullable=True)
    amount = Column(String, nullable=True)
    data_json = Column(JSONText, nullable=True)
    is_locked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    file_path = Column(String, nullable=True)
    final_pdf_path = Column(String, nullable=True)
    final_docx_path = Column(String, nullable=True)
    pdf_ready = Column(Boolean, default=False, nullable=True)
    pdf_generation_in_progress = Column(Boolean, default=False, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    template_id = Column(String, nullable=True)
    document_name = Column(String, nullable=True)

    user = relationship("User", back_populates="documents")


class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String, nullable=False)
    url = Column(String, nullable=True, default="#")
    icon = Column(String, nullable=True, default="📄")
    parent_id = Column(Integer, ForeignKey("menu_items.id"), nullable=True)
    order_index = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    type = Column(String, nullable=True, default="page")
    template_id = Column(String, nullable=True)

    children = relationship(
        "MenuItem",
        back_populates="parent",
        foreign_keys=[parent_id],
        cascade="all, delete-orphan"
    )
    parent = relationship("MenuItem", back_populates="children", remote_side=[id])


class DBTemplate(Base):
    __tablename__ = "db_templates"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(String, unique=True, index=True, default=lambda: f"tpl_{uuid.uuid4().hex[:8]}")
    name = Column(String, nullable=False)
    header = Column(Text, nullable=True, default="")
    content = Column(Text, nullable=False, default="")
    content2 = Column(Text, nullable=True, default="")
    footer = Column(Text, nullable=True, default="")
    category = Column(String, default="General")
    fields_json = Column(JSONText, nullable=True)
    field_order_json = Column(JSONText, nullable=True)
    is_active = Column(Boolean, default=True)
    status = Column(String, default="ACTIVE", server_default="ACTIVE")
    file_path = Column(String, nullable=True)
    menu_item_id = Column(Integer, nullable=True)
    document_identity_field = Column(String, nullable=True)
    document_secondary_field = Column(String, nullable=True)
    credit_cost = Column(Integer, default=10, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class StaticPage(Base):
    __tablename__ = "static_pages"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    content = Column(Text, nullable=False, default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True, nullable=False)
    action = Column(String, index=True, nullable=False)
    entity_type = Column(String, nullable=True)
    entity_id = Column(String, nullable=True)
    template_name = Column(String, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)


class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    current_balance = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="wallet")


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id = Column(Integer, primary_key=True, index=True)
    wallet_id = Column(Integer, ForeignKey("wallets.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False)  # CREDIT, DEBIT
    source = Column(String, nullable=False)  # SIGNUP, ADMIN, DOCUMENT
    credits = Column(Integer, nullable=False)
    balance_after = Column(Integer, nullable=False)
    remarks = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    wallet = relationship("Wallet")
    user = relationship("User")


