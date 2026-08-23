from fastapi import FastAPI, Request, Depends, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text, or_
from sqlalchemy.orm import Session
import os
import sys
import logging
from datetime import datetime
from dotenv import load_dotenv
from backend.utils.maintenance import backup_database, cleanup_old_outputs, cleanup_temp_previews

from backend.core.config import settings
from backend.core.constants import DEMO_DATASET_DIR

# Ensure backend directory is in sys.path
BASE_DIR = settings.BASE_DIR
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

# Load Environment
load_dotenv()

# Local Imports
from backend import models, database
from backend.routers import auth, documents, templates, menu, pages, admin, demo_datasets, wallet

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("backend")
START_TIME = datetime.utcnow()

# Initialize Database
models.Base.metadata.create_all(bind=database.engine)
database.ensure_schema_up_to_date()

app = FastAPI(title="Dynamic Document Generator API")

# Middleware: Request Logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    client_host = request.client.host if request.client else "unknown"
    start_time = datetime.utcnow()
    try:
        response = await call_next(request)
        duration = (datetime.utcnow() - start_time).total_seconds()
        logger.info(f"[{client_host}] {request.method} {request.url.path} -> {response.status_code} ({duration:.3f}s)")
        return response
    except Exception as e:
        duration = (datetime.utcnow() - start_time).total_seconds()
        logger.error(f"[{client_host}] {request.method} {request.url.path} -> ERROR: {e} ({duration:.3f}s)")
        # We don't re-raise here; we let the global exception handler handle it or return a response
        import traceback
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"success": False, "detail": "Internal Server Error", "error": str(e)}
        )

# Middleware: CORS
# Hardened CORS: allow_credentials=True cannot be used with allow_origins=["*"]
# Since we use Bearer tokens (Authorization header), we don't strictly need allow_credentials=True.
# However, many browsers are sensitive to this.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.CORS_ORIGINS == ["*"] else settings.CORS_ORIGINS,
    allow_credentials=False if settings.CORS_ORIGINS == ["*"] else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Backend server starting up...")
    
    # 1. Automatic Backup
    backup_database()
    
    # 2. Cleanup Old Files
    cleanup_old_outputs(days=7)
    cleanup_temp_previews(all_files=True)
    
    # Directory Diagnostics
    logger.info("--- Directory Diagnostics ---")
    for d in settings.ALL_DIRS:
        exists = os.path.exists(d)
        logger.info(f"{'✅' if exists else '📁'} {d}")
        if not exists:
            os.makedirs(d)
            logger.info(f"   Created missing directory.")

    # Demo Dataset Diagnostics & Validation
    logger.info("[INFO] Demo Dataset Directory:")
    logger.info(str(DEMO_DATASET_DIR))
    logger.info("--- Demo Dataset Validation ---")
    if DEMO_DATASET_DIR.exists() and DEMO_DATASET_DIR.is_dir():
        import json
        dataset_files = sorted(list(DEMO_DATASET_DIR.glob("*.json")))
        logger.info(f"Discovered {len(dataset_files)} dataset files.")
        for f in dataset_files:
            try:
                with open(f, "r", encoding="utf-8") as file_obj:
                    json.load(file_obj)
                logger.info(f"✅ {f.name}: Valid JSON")
            except Exception as e:
                logger.error(f"❌ {f.name}: Invalid JSON or read error: {e}")
    else:
        logger.warning(f"⚠️ Demo dataset directory does not exist or is not a directory: {DEMO_DATASET_DIR}")

    # Database Diagnostics
    logger.info("--- Database Diagnostics ---")
    try:
        db = database.SessionLocal()
        db.execute(text("SELECT 1"))
        
        is_postgres = "postgresql" in settings.DATABASE_URL
        if not is_postgres:
            # Query SQLite-specific configurations
            mode_res = db.execute(text("PRAGMA journal_mode;")).fetchone()
            journal_mode = mode_res[0] if mode_res else "unknown"
            db_path = settings.DATABASE_URL.split('///')[-1]
            wal_enabled = (journal_mode.lower() == "wal")
            
            logger.info(f"✅ SQLite Database connected: {db_path}")
            logger.info(f"📊 SQLite Journal Mode: {journal_mode}")
            logger.info(f"📊 SQLite WAL Enabled Status: {wal_enabled}")
        else:
            db_host = settings.DATABASE_URL.split("@")[-1] if "@" in settings.DATABASE_URL else "PostgreSQL"
            logger.info(f"✅ PostgreSQL Database connected: {db_host}")
        
        # Migration logic (Fallback manual updates if ensure_schema_up_to_date failed)
        try:
            db.execute(text("ALTER TABLE db_templates ADD COLUMN file_path VARCHAR"))
            db.commit()
            logger.info("✅ Added file_path column to db_templates.")
        except Exception:
            db.rollback()

        try:
            db.execute(text("ALTER TABLE db_templates ADD COLUMN category TEXT DEFAULT 'General'"))
            db.commit()
            logger.info("✅ Added category column to db_templates.")
        except Exception:
            db.rollback()

        try:
            db.execute(text("ALTER TABLE db_templates ADD COLUMN status VARCHAR DEFAULT 'ACTIVE'"))
            db.commit()
            logger.info("✅ Added status column to db_templates.")
        except Exception:
            db.rollback()
            
        try:
            db.execute(text("ALTER TABLE document_submissions ADD COLUMN file_path VARCHAR"))
            db.commit()
            logger.info("✅ Added file_path column to document_submissions.")
        except Exception:
            db.rollback()

        try:
            default_val = "FALSE" if is_postgres else "0"
            db.execute(text(f"ALTER TABLE document_submissions ADD COLUMN pdf_ready BOOLEAN DEFAULT {default_val}"))
            db.commit()
            logger.info("✅ Added pdf_ready column to document_submissions.")
        except Exception:
            db.rollback()

        try:
            default_val = "FALSE" if is_postgres else "0"
            db.execute(text(f"ALTER TABLE document_submissions ADD COLUMN pdf_generation_in_progress BOOLEAN DEFAULT {default_val}"))
            db.commit()
            logger.info("✅ Added pdf_generation_in_progress column to document_submissions.")
        except Exception:
            db.rollback()

        try:
            db.execute(text("ALTER TABLE menu_items ADD COLUMN type TEXT DEFAULT 'page'"))
            db.commit()
            logger.info("✅ Added type column to menu_items.")
        except Exception:
            db.rollback()

        try:
            db.execute(text("ALTER TABLE menu_items ADD COLUMN template_id TEXT"))
            db.commit()
            logger.info("✅ Added template_id column to menu_items.")
        except Exception:
            db.rollback()

        try:
            db.execute(text("ALTER TABLE users ADD COLUMN birth_date VARCHAR"))
            db.commit()
            logger.info("✅ Added birth_date column to users.")
        except Exception:
            db.rollback()

        try:
            db.execute(text("ALTER TABLE users ADD COLUMN mobile_number VARCHAR"))
            db.commit()
            logger.info("✅ Added mobile_number column to users.")
        except Exception:
            db.rollback()

        try:
            db.execute(text("ALTER TABLE activity_logs ADD COLUMN template_name VARCHAR"))
            db.commit()
            logger.info("✅ Added template_name column to activity_logs.")
        except Exception:
            db.rollback()

        # Recovery Logic: Reset broken stale states for document generation
        try:
            stale_docs = db.query(models.DocumentSubmission).filter(
                models.DocumentSubmission.pdf_generation_in_progress == True,
                models.DocumentSubmission.pdf_ready == False,
                or_(
                    models.DocumentSubmission.final_pdf_path == None,
                    models.DocumentSubmission.final_pdf_path == ""
                )
            ).all()
            if stale_docs:
                logger.info(f"🛠️ Startup Recovery: Found {len(stale_docs)} stale documents. Resetting pdf_generation_in_progress=False...")
                for doc in stale_docs:
                    doc.pdf_generation_in_progress = False
                db.commit()
                logger.info("✅ Startup Recovery complete.")
        except Exception as recover_err:
            logger.error(f"❌ Failed to run startup recovery: {recover_err}")
            db.rollback()
            
        db.close()
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
    logger.info("-----------------------------")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("👋 Backend server shutting down gracefully...")
    logger.info("-----------------------------")

# Health & Debug Routes
@app.get("/health")
@app.get("/api/health")
def health_check(db: Session = Depends(database.get_db)):
    db_name = "unknown"
    if "postgresql" in settings.DATABASE_URL:
        db_name = settings.DATABASE_URL.split("@")[-1] if "@" in settings.DATABASE_URL else "postgresql"
    elif "sqlite" in settings.DATABASE_URL:
        db_name = settings.DATABASE_URL.split("///")[-1]

    health_status = {
        "status": "online",
        "timestamp": datetime.utcnow().isoformat(),
        "uptime_seconds": (datetime.utcnow() - START_TIME).total_seconds(),
        "services": {
            "database": "down",
            "storage": "ok"
        },
        "diagnostics": {
            "db_path": db_name,
            "total_templates": 0
        }
    }
    
    # 1. Check Database
    try:
        db.execute(text("SELECT 1"))
        health_status["services"]["database"] = "ok"
        health_status["diagnostics"]["total_templates"] = db.query(models.DBTemplate).count()
    except Exception as e:
        health_status["status"] = "degraded"
        health_status["services"]["database"] = f"error: {str(e)}"

    # 2. Check Storage
    for d in settings.ALL_DIRS:
        if not os.path.exists(d):
            health_status["status"] = "degraded"
            health_status["services"]["storage"] = "error: missing directories"

    return health_status

@app.get("/debug/routes")
def get_all_routes():
    url_list = [{"path": route.path, "name": route.name, "methods": list(route.methods)} for route in app.routes]
    return url_list

# Include Routers with /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(templates.router, prefix="/api")
app.include_router(menu.router, prefix="/api")
app.include_router(pages.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(demo_datasets.router, prefix="/api")
app.include_router(wallet.router, prefix="/api")

# Global Exception Handler (Final Catch-All)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"🔥 FATAL EXCEPTION at {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "detail": "A critical server error occurred. The process is still running.",
            "error": str(exc)
        }
    )
