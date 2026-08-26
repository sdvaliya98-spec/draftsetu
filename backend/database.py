from sqlalchemy import create_engine, text, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.types import TypeDecorator, TEXT
from sqlalchemy.dialects.postgresql import JSONB
from backend.core.config import settings
import logging
import json

logger = logging.getLogger("backend.database")

# Custom database-agnostic JSON-Text type decorator
class JSONText(TypeDecorator):
    """
    SQLAlchemy custom type that stores JSON as TEXT on SQLite and JSONB on PostgreSQL,
    but always exposes it as a JSON string to Python code to maintain backward compatibility.
    """
    impl = TEXT
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(JSONB())
        return dialect.type_descriptor(TEXT())

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if dialect.name == 'postgresql':
            try:
                # Value comes from application as a JSON string
                return json.loads(value)
            except Exception:
                return value
        return value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if dialect.name == 'postgresql':
            # DB returns dict/list, application expects a JSON string
            return json.dumps(value)
        return value

# Engine Creation with Connection Pooling configured conditionally
if "postgresql" in settings.DATABASE_URL:
    logger.info("📡 Database: Configuring PostgreSQL connection engine with pooling...")
    engine = create_engine(
        settings.DATABASE_URL,
        pool_size=20,
        max_overflow=30,
        pool_pre_ping=True
    )
else:
    logger.info("📡 Database: Configuring SQLite connection engine...")
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={
            "check_same_thread": False,
            "timeout": 30
        }
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Immediately after opening SQLite connection, enable WAL mode
try:
    if "sqlite" in settings.DATABASE_URL:
        with engine.connect() as conn:
            conn.execute(text("PRAGMA journal_mode=WAL;"))
            conn.execute(text("PRAGMA synchronous=NORMAL;"))
            conn.commit()
        logger.info("✅ SQLite WAL mode enabled")
except Exception as e:
    logger.error(f"❌ Failed to enable WAL mode: {e}")

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def ensure_schema_up_to_date():
    """Safely adds missing columns to SQLite or PostgreSQL database if they don't exist."""
    try:
        inspector = inspect(engine)
        table_names = inspector.get_table_names()
        
        # Check db_templates
        if "db_templates" in table_names:
            columns = [col["name"] for col in inspector.get_columns("db_templates")]
            missing_cols = {
                "header": "TEXT DEFAULT ''",
                "footer": "TEXT DEFAULT ''",
                "content2": "TEXT DEFAULT ''",
                "menu_item_id": "INTEGER",
                "status": "VARCHAR DEFAULT 'ACTIVE'",
                "document_identity_field": "VARCHAR",
                "document_secondary_field": "VARCHAR",
                "credit_cost": "INTEGER DEFAULT 10"
            }
            with engine.begin() as conn:
                for col, col_type in missing_cols.items():
                    if col not in columns:
                        logger.info(f"🛠️ Adding missing column '{col}' to db_templates table...")
                        conn.execute(text(f"ALTER TABLE db_templates ADD COLUMN {col} {col_type}"))
            
        # Check document_submissions
        if "document_submissions" in table_names:
            columns = [col["name"] for col in inspector.get_columns("document_submissions")]
            
            is_postgres = "postgresql" in settings.DATABASE_URL
            ds_missing_cols = {
                "final_pdf_path": "TEXT",
                "final_docx_path": "TEXT",
                "pdf_ready": "BOOLEAN DEFAULT FALSE" if is_postgres else "BOOLEAN DEFAULT 0",
                "pdf_generation_in_progress": "BOOLEAN DEFAULT FALSE" if is_postgres else "BOOLEAN DEFAULT 0",
                "template_id": "VARCHAR",
                "document_name": "VARCHAR"
            }
            with engine.begin() as conn:
                for col, col_type in ds_missing_cols.items():
                    if col not in columns:
                        logger.info(f"🛠️ Adding missing column '{col}' to document_submissions table...")
                        conn.execute(text(f"ALTER TABLE document_submissions ADD COLUMN {col} {col_type}"))
            
        # Check menu_items
        if "menu_items" in table_names:
            columns = [col["name"] for col in inspector.get_columns("menu_items")]
            menu_missing_cols = {
                "type": "TEXT DEFAULT 'page'",
                "template_id": "TEXT"
            }
            with engine.begin() as conn:
                for col, col_type in menu_missing_cols.items():
                    if col not in columns:
                        logger.info(f"🛠️ Adding missing column '{col}' to menu_items table...")
                        conn.execute(text(f"ALTER TABLE menu_items ADD COLUMN {col} {col_type}"))

        # Check users
        if "users" in table_names:
            columns = [col["name"] for col in inspector.get_columns("users")]
            if "is_active" not in columns:
                logger.info("🛠️ Adding missing column 'is_active' to users table...")
                is_postgres = "postgresql" in settings.DATABASE_URL
                col_type = "BOOLEAN DEFAULT TRUE" if is_postgres else "BOOLEAN DEFAULT 1"
                with engine.begin() as conn:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN is_active {col_type}"))
            if "birth_date" not in columns:
                logger.info("🛠️ Adding missing column 'birth_date' to users table...")
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE users ADD COLUMN birth_date VARCHAR"))
            if "mobile_number" not in columns:
                logger.info("🛠️ Adding missing column 'mobile_number' to users table...")
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE users ADD COLUMN mobile_number VARCHAR"))

        # Check activity_logs
        if "activity_logs" in table_names:
            columns = [col["name"] for col in inspector.get_columns("activity_logs")]
            if "template_name" not in columns:
                logger.info("🛠️ Adding missing column 'template_name' to activity_logs table...")
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE activity_logs ADD COLUMN template_name VARCHAR"))

        # Check / Create payment_orders table
        if "payment_orders" not in table_names:
            logger.info("🛠️ Creating 'payment_orders' table...")
            with engine.begin() as conn:
                is_postgres = "postgresql" in settings.DATABASE_URL
                if is_postgres:
                    conn.execute(text("""
                        CREATE TABLE IF NOT EXISTS payment_orders (
                            id SERIAL PRIMARY KEY,
                            user_id INTEGER NOT NULL REFERENCES users(id),
                            order_id VARCHAR NOT NULL UNIQUE,
                            payment_id VARCHAR UNIQUE,
                            signature VARCHAR,
                            plan_id VARCHAR NOT NULL,
                            amount INTEGER NOT NULL,
                            currency VARCHAR NOT NULL DEFAULT 'INR',
                            credits INTEGER NOT NULL,
                            status VARCHAR NOT NULL DEFAULT 'CREATED',
                            error_code VARCHAR,
                            error_description VARCHAR,
                            wallet_transaction_id INTEGER REFERENCES wallet_transactions(id),
                            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                        );
                        CREATE INDEX IF NOT EXISTS ix_payment_orders_user_id ON payment_orders(user_id);
                        CREATE INDEX IF NOT EXISTS ix_payment_orders_order_id ON payment_orders(order_id);
                        CREATE INDEX IF NOT EXISTS ix_payment_orders_payment_id ON payment_orders(payment_id);
                        CREATE INDEX IF NOT EXISTS ix_payment_orders_status ON payment_orders(status);
                    """))
                else:
                    conn.execute(text("""
                        CREATE TABLE IF NOT EXISTS payment_orders (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            user_id INTEGER NOT NULL,
                            order_id VARCHAR NOT NULL UNIQUE,
                            payment_id VARCHAR UNIQUE,
                            signature VARCHAR,
                            plan_id VARCHAR NOT NULL,
                            amount INTEGER NOT NULL,
                            currency VARCHAR NOT NULL DEFAULT 'INR',
                            credits INTEGER NOT NULL,
                            status VARCHAR NOT NULL DEFAULT 'CREATED',
                            error_code VARCHAR,
                            error_description VARCHAR,
                            wallet_transaction_id INTEGER,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY(user_id) REFERENCES users(id),
                            FOREIGN KEY(wallet_transaction_id) REFERENCES wallet_transactions(id)
                        );
                        CREATE INDEX IF NOT EXISTS ix_payment_orders_user_id ON payment_orders(user_id);
                        CREATE UNIQUE INDEX IF NOT EXISTS ix_payment_orders_order_id ON payment_orders(order_id);
                        CREATE UNIQUE INDEX IF NOT EXISTS ix_payment_orders_payment_id ON payment_orders(payment_id);
                        CREATE INDEX IF NOT EXISTS ix_payment_orders_status ON payment_orders(status);
                    """))
            logger.info("✅ 'payment_orders' table created successfully.")
        else:
            # Table exists, ensure all columns and indexes exist
            po_cols = [col["name"] for col in inspector.get_columns("payment_orders")]
            with engine.begin() as conn:
                if "error_code" not in po_cols:
                    conn.execute(text("ALTER TABLE payment_orders ADD COLUMN error_code VARCHAR"))
                if "error_description" not in po_cols:
                    conn.execute(text("ALTER TABLE payment_orders ADD COLUMN error_description VARCHAR"))
                if "wallet_transaction_id" not in po_cols:
                    conn.execute(text("ALTER TABLE payment_orders ADD COLUMN wallet_transaction_id INTEGER"))

        # Check and ensure high-value performance indexes exist
        indexes_to_ensure = [
            ("users", "ix_users_is_active", "is_active"),
            ("document_submissions", "ix_document_submissions_user_id", "user_id"),
            ("document_submissions", "ix_document_submissions_template_id", "template_id"),
            ("document_submissions", "ix_document_submissions_created_at", "created_at"),
            ("document_submissions", "ix_document_submissions_is_locked", "is_locked"),
            ("wallet_transactions", "ix_wallet_transactions_user_id", "user_id"),
            ("wallet_transactions", "ix_wallet_transactions_wallet_id", "wallet_id"),
            ("wallet_transactions", "ix_wallet_transactions_created_at", "created_at"),
            ("wallets", "ix_wallets_user_id", "user_id"),
            ("db_templates", "ix_db_templates_is_active", "is_active"),
            ("db_templates", "ix_db_templates_status", "status"),
            ("static_pages", "ix_static_pages_is_active", "is_active"),
            ("payment_orders", "ix_payment_orders_created_at", "created_at"),
            ("menu_items", "ix_menu_items_parent_id", "parent_id"),
            ("menu_items", "ix_menu_items_is_active", "is_active"),
        ]

        with engine.begin() as conn:
            for tbl, idx_name, col in indexes_to_ensure:
                if tbl in table_names:
                    existing_indices = [idx["name"] for idx in inspector.get_indexes(tbl)]
                    if idx_name not in existing_indices:
                        try:
                            logger.info(f"⚡ Creating index '{idx_name}' on {tbl}({col})...")
                            conn.execute(text(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {tbl}({col})"))
                        except Exception as idx_err:
                            logger.warning(f"Could not create index {idx_name}: {idx_err}")

        logger.info("✅ Schema check completed successfully.")
    except Exception as e:
        logger.error(f"❌ Schema check failed: {e}")
