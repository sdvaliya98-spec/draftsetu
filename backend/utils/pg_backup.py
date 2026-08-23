import os
import sys
import argparse
import subprocess
import logging
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger("pg_backup")

def run_backup(pg_bin_dir, pg_dsn, backup_dir, retention_count=5):
    """
    Executes a PG dump of the specified database connection and enforces a retention policy.
    """
    try:
        os.makedirs(backup_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = os.path.join(backup_dir, f"thelegalsetu_backup_{timestamp}.dump")
        
        pg_dump_path = os.path.join(pg_bin_dir, "pg_dump.exe" if os.name == 'nt' else "pg_dump")
        if not os.path.exists(pg_dump_path):
            # Fallback to system path lookup if bin dir is default
            pg_dump_path = "pg_dump"

        cmd = [pg_dump_path, "-d", pg_dsn, "-F", "c", "-f", backup_file]
        
        # Strip password from DSN to avoid logging it
        safe_dsn = pg_dsn
        if "@" in pg_dsn:
            parts = pg_dsn.split("@")
            user_part = parts[0].split("//")[-1]
            if ":" in user_part:
                user = user_part.split(":")[0]
                safe_dsn = pg_dsn.replace(user_part, f"{user}:******")

        logger.info(f"Initiating PostgreSQL backup for: {safe_dsn}")
        
        env = os.environ.copy()
        # Parse password from DSN if present to send as PGPASSWORD env variable
        if "postgresql://" in pg_dsn and "@" in pg_dsn:
            credentials = pg_dsn.split("://")[1].split("@")[0]
            if ":" in credentials:
                env["PGPASSWORD"] = credentials.split(":")[1]

        start_time = datetime.now()
        subprocess.run(cmd, env=env, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        duration = (datetime.now() - start_time).total_seconds()
        
        logger.info(f"[SUCCESS] Database backup created in {duration:.3f}s: {backup_file}")
        
        # Enforce retention policy
        backups = sorted([os.path.join(backup_dir, f) for f in os.listdir(backup_dir) if f.endswith('.dump')])
        if len(backups) > retention_count:
            for old_backup in backups[:-retention_count]:
                os.remove(old_backup)
                logger.info(f"Removed old backup file under retention policy: {old_backup}")
                
        return backup_file
    except subprocess.CalledProcessError as e:
        logger.error(f"[ERROR] Database backup failed: {e.stderr.decode('utf-8')}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"[ERROR] Backup script failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Automated PostgreSQL Backup Utility")
    parser.add_argument("--pg-bin-dir", default=os.getenv("PG_BIN_DIR"), help="Path to PostgreSQL binary folder (defaults to PG_BIN_DIR env var)")
    parser.add_argument("--pg-dsn", default=os.getenv("DATABASE_URL"), help="Connection DSN (defaults to DATABASE_URL env var)")
    parser.add_argument("--backup-dir", default=os.getenv("BACKUP_DIR", r"d:\new\backend\backups\pg"), help="Directory where backups are stored")
    parser.add_argument("--retention", type=int, default=5, help="Number of backup files to retain")
    
    args = parser.parse_args()
    
    # Enforce database DSN check
    if not args.pg_dsn:
        sys.stderr.write(
            "\n"
            "========================================================================\n"
            "CONFIGURATION ERROR: PostgreSQL Connection DSN Missing.\n"
            "Please define the DATABASE_URL environment variable or supply --pg-dsn.\n"
            "========================================================================\n"
            "\n"
        )
        sys.exit(1)
        
    # Enforce postgres binary folder check
    if not args.pg_bin_dir:
        sys.stderr.write(
            "\n"
            "========================================================================\n"
            "CONFIGURATION ERROR: PostgreSQL Binaries Directory Missing.\n"
            "Please define the PG_BIN_DIR environment variable or supply --pg-bin-dir.\n"
            "========================================================================\n"
            "\n"
        )
        sys.exit(1)
    
    run_backup(
        pg_bin_dir=args.pg_bin_dir,
        pg_dsn=args.pg_dsn,
        backup_dir=args.backup_dir,
        retention_count=args.retention
    )
