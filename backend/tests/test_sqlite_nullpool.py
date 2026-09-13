import unittest
from sqlalchemy.pool import NullPool
from sqlalchemy import text
from backend import database, models
from backend.core.config import settings
import concurrent.futures

class TestSQLiteNullPool(unittest.TestCase):
    def test_engine_pool_is_nullpool(self):
        if "sqlite" in settings.DATABASE_URL:
            self.assertIsInstance(
                database.engine.pool,
                NullPool,
                f"Expected engine.pool to be NullPool on SQLite, got {type(database.engine.pool)}"
            )
            print("[OK] Verified: SQLite engine uses NullPool")
        else:
            print("[INFO] Skipping NullPool check on non-SQLite database")

    def test_session_lifecycle_with_nullpool(self):
        db = database.SessionLocal()
        try:
            res = db.execute(text("SELECT 1")).scalar()
            self.assertEqual(res, 1)
        finally:
            db.close()
        print("[OK] Verified: Session lifecycle with NullPool executes and closes cleanly")

    def test_concurrent_sessions_under_nullpool(self):
        def worker_query(worker_id):
            db = database.SessionLocal()
            try:
                tpl_count = db.query(models.DBTemplate).count()
                val = db.execute(text("SELECT 42")).scalar()
                return tpl_count >= 0 and val == 42
            finally:
                db.close()

        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
            futures = [executor.submit(worker_query, i) for i in range(50)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]

        self.assertTrue(all(results))
        self.assertEqual(len(results), 50)
        print("[OK] Verified: 50 concurrent sessions with NullPool completed successfully")

if __name__ == "__main__":
    unittest.main()
