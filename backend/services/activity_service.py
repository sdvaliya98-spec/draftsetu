import logging
from sqlalchemy.orm import Session
from backend import models

logger = logging.getLogger("backend.activity")

def log_activity(db: Session, username: str, action: str, entity_type: str = None, entity_id: str = None, template_name: str = None):
    """
    Inserts a log entry into the activity_logs table.
    Wrapped in try/except so that log failures never crash core actions.
    """
    try:
        log_entry = models.ActivityLog(
            username=username,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            template_name=template_name
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        logger.info(f"✨ Activity Logged: user={username}, action={action}, entity={entity_type}:{entity_id}")
        return log_entry
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Failed to log activity: {e}", exc_info=True)
        return None
