import os
import shutil
import time
import logging
from datetime import datetime
from backend.core.config import settings

logger = logging.getLogger("backend.maintenance")

def backup_database():
    """Creates a timestamped backup of the SQLite database."""
    if "sqlite" not in settings.DATABASE_URL:
        logger.warning("⚠️ Database backup skipped: Backup tool only supports SQLite database files.")
        return

    db_path = settings.DATABASE_URL.split("///")[-1]
    if not os.path.exists(db_path):
        return

    backup_dir = os.path.join(settings.BASE_DIR, "backups")
    os.makedirs(backup_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(backup_dir, f"document_system_{timestamp}.db")
    
    try:
        shutil.copy2(db_path, backup_path)
        logger.info(f"✅ Database backup created: {backup_path}")
        
        # Keep only last 10 backups
        backups = sorted([os.path.join(backup_dir, f) for f in os.listdir(backup_dir) if f.endswith('.db')])
        if len(backups) > 10:
            for old_backup in backups[:-10]:
                os.remove(old_backup)
                logger.info(f"🗑️ Removed old backup: {old_backup}")
    except Exception as e:
        logger.error(f"❌ Backup failed: {e}")

def cleanup_old_outputs(days=7):
    """Deletes generated documents older than X days."""
    now = time.time()
    cutoff = now - (days * 86400)
    
    count = 0
    if os.path.exists(settings.OUTPUT_DIR):
        for f in os.listdir(settings.OUTPUT_DIR):
            file_path = os.path.join(settings.OUTPUT_DIR, f)
            if os.path.isfile(file_path) and os.path.getmtime(file_path) < cutoff:
                try:
                    os.remove(file_path)
                    count += 1
                except Exception as e:
                    logger.error(f"Error deleting {f}: {e}")
    
    if count > 0:
        logger.info(f"🧹 Cleaned up {count} old output documents.")

def check_storage_integrity():
    """Checks if template files exist for all database records."""
    # This would require a DB session, usually called from startup_event
    pass

def sanitize_filename(filename: str) -> str:
    """Sanitizes a filename to prevent path traversal and weird characters."""
    import re
    # Keep only alphanumeric, dots, and underscores
    name = os.path.basename(filename)
    name = re.sub(r'[^a-zA-Z0-9._-]', '_', name)
    return name

def cleanup_temp_previews(all_files: bool = False):
    """Deletes temporary preview files. If all_files is True, deletes all. Otherwise deletes files older than 1 hour (3600 seconds)."""
    import time
    count = 0
    now = time.time()
    cutoff = now - 3600 # 1 hour
    
    previews_dir = getattr(settings, "TEMP_PREVIEWS_DIR", None)
    if not previews_dir or not os.path.exists(previews_dir):
        return
        
    for f in os.listdir(previews_dir):
        file_path = os.path.join(previews_dir, f)
        if os.path.isfile(file_path):
            should_delete = all_files or os.path.getmtime(file_path) < cutoff
            if should_delete:
                try:
                    os.remove(file_path)
                    count += 1
                except Exception as e:
                    logger.error(f"Error deleting temporary preview file {f}: {e}")
                    
    if count > 0:
        logger.info(f"🧹 Temporary preview cleanup: deleted {count} files (all_files={all_files}).")

