import os
import sys
import sqlite3
import psycopg2
from psycopg2.extras import execute_values, Json
import json
import hashlib
import argparse
from datetime import datetime

# Insert project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

class MigrationUtility:
    def __init__(self, sqlite_path, pg_dsn, dry_run=False, overwrite=False):
        self.sqlite_path = sqlite_path
        self.pg_dsn = pg_dsn
        self.dry_run = dry_run
        self.overwrite = overwrite
        self.sqlite_conn = None
        self.pg_conn = None
        self.tables = [
            "users",
            "static_pages",
            "db_templates",
            "menu_items",
            "document_submissions",
            "activity_logs"
        ]

    def connect(self):
        print(f"Connecting to SQLite database at: {self.sqlite_path}")
        self.sqlite_conn = sqlite3.connect(self.sqlite_path)
        self.sqlite_conn.row_factory = sqlite3.Row

        print(f"Connecting to PostgreSQL database...")
        self.pg_conn = psycopg2.connect(self.pg_dsn)
        self.pg_conn.set_client_encoding('UTF8')
        # We handle transactions manually
        self.pg_conn.autocommit = False

    def close(self):
        if self.sqlite_conn:
            self.sqlite_conn.close()
        if self.pg_conn:
            self.pg_conn.close()

    def get_sqlite_table_data(self, table):
        cursor = self.sqlite_conn.cursor()
        # Sort menu_items by parent_id so parents are inserted before children
        if table == "menu_items":
            cursor.execute("SELECT * FROM menu_items ORDER BY parent_id ASC NULLS FIRST;")
        else:
            cursor.execute(f"SELECT * FROM {table};")
        return cursor.fetchall()

    def get_sqlite_table_columns(self, table):
        cursor = self.sqlite_conn.cursor()
        cursor.execute(f"PRAGMA table_info({table});")
        return [col[1] for col in cursor.fetchall()]

    def get_pg_table_columns(self, pg_cursor, table):
        pg_cursor.execute(f"""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = '{table}';
        """)
        return [row[0] for row in pg_cursor.fetchall()]

    def normalize_value(self, val, col_name):
        if val is None:
            return ""
        # 1. Normalize JSON structures
        if col_name in ["data_json", "fields_json", "field_order_json"]:
            try:
                d = json.loads(val) if isinstance(val, str) else val
                return json.dumps(d, sort_keys=True)
            except Exception:
                return str(val)
        # 2. Normalize Booleans
        if col_name in ["is_admin", "is_active", "is_locked", "pdf_ready", "pdf_generation_in_progress"]:
            return "1" if bool(val) else "0"
        # 3. Normalize Datetime/Timestamps
        if col_name in ["created_at", "updated_at", "timestamp"]:
            if isinstance(val, str):
                t_str = val.replace("T", " ")
                # Strip subseconds past microsecond or strip timezone offset if present
                if "+" in t_str:
                    t_str = t_str.split("+")[0]
                # Try parsing and standardizing
                try:
                    dt = datetime.fromisoformat(t_str)
                    return dt.strftime("%Y-%m-%d %H:%M:%S.%f")
                except ValueError:
                    return t_str
            elif isinstance(val, datetime):
                return val.strftime("%Y-%m-%d %H:%M:%S.%f")
        return str(val)

    def compute_sqlite_checksum(self, table, columns):
        cursor = self.sqlite_conn.cursor()
        # Sort columns to ensure consistent hashing
        sorted_cols = sorted(columns)
        cursor.execute(f"SELECT * FROM {table} ORDER BY id;")
        rows = cursor.fetchall()
        
        hasher = hashlib.sha256()
        for row in rows:
            row_data = []
            for col in sorted_cols:
                row_data.append(self.normalize_value(row[col], col))
            hasher.update(",".join(row_data).encode('utf-8'))
        return hasher.hexdigest()

    def compute_pg_checksum(self, pg_cursor, table, columns):
        # Sort columns to match the SQLite ordering
        sorted_cols = sorted(columns)
        col_list_str = ", ".join(sorted_cols)
        
        pg_cursor.execute(f"SELECT {col_list_str} FROM {table} ORDER BY id;")
        rows = pg_cursor.fetchall()
        
        hasher = hashlib.sha256()
        for row in rows:
            row_data = []
            for i, col in enumerate(sorted_cols):
                row_data.append(self.normalize_value(row[i], col))
            hasher.update(",".join(row_data).encode('utf-8'))
        return hasher.hexdigest()

    def migrate_table(self, pg_cursor, table):
        sqlite_cols = self.get_sqlite_table_columns(table)
        pg_cols = self.get_pg_table_columns(pg_cursor, table)
        
        # Intersect columns to only migrate columns present in both schemas
        common_cols = [col for col in sqlite_cols if col in pg_cols]
        
        sqlite_rows = self.get_sqlite_table_data(table)
        
        print(f"\n--- Migrating Table: {table} ({len(sqlite_rows)} rows) ---")
        print(f"  SQLite Schema Columns: {len(sqlite_cols)}")
        print(f"  Postgres Schema Columns: {len(pg_cols)}")
        print(f"  Common Migrated Columns: {len(common_cols)}")
        
        if self.overwrite:
            print(f"  Truncating PostgreSQL table '{table}' (--overwrite specified)...")
            pg_cursor.execute(f"TRUNCATE TABLE {table} CASCADE;")

        if len(sqlite_rows) == 0:
            print(f"  No records to migrate for table: {table}")
            return 0, 0

        # Construct INSERT statement
        col_names = ", ".join(common_cols)
        placeholders = ", ".join(["%s"] * len(common_cols))
        insert_query = f"INSERT INTO {table} ({col_names}) VALUES ({placeholders}) ON CONFLICT (id) DO NOTHING;"
        
        # Prepare values
        insert_values = []
        for row in sqlite_rows:
            row_values = []
            for col in common_cols:
                val = row[col]
                # 1. Special handling for JSON fields stored as TEXT in SQLite but JSONB/JSON in Postgres
                if col in ["data_json", "fields_json", "field_order_json"] and val is not None:
                    try:
                        # Parse SQLite TEXT JSON and wrap it in psycopg2's Json wrapper
                        row_values.append(Json(json.loads(val)))
                    except Exception:
                        row_values.append(val)
                # 2. Convert integer representation of boolean columns (0/1) from SQLite to boolean (False/True)
                elif col in ["is_admin", "is_active", "is_locked", "pdf_ready", "pdf_generation_in_progress"] and val is not None:
                    row_values.append(bool(val))
                else:
                    row_values.append(val)
            insert_values.append(row_values)

        # Execute batch insert
        # We use ON CONFLICT (id) DO NOTHING to support idempotent operations
        pg_cursor.executemany(insert_query, insert_values)
        inserted_count = pg_cursor.rowcount
        print(f"  PostgreSQL reported rows modified: {inserted_count}")

        # Update serial sequence (only if table has id serial column)
        try:
            pg_cursor.execute(f"SELECT MAX(id) FROM {table};")
            max_id = pg_cursor.fetchone()[0]
            if max_id:
                seq_name = f"{table}_id_seq"
                pg_cursor.execute(f"SELECT setval(%s, %s, true);", (seq_name, max_id))
                print(f"  Updated sequence '{seq_name}' to MAX(id) = {max_id}")
        except Exception as e:
            # Table might not have standard sequence naming
            print(f"  Could not update sequence for {table}: {e}")
            
        return len(sqlite_rows), inserted_count

    def validate_migration(self, pg_cursor):
        print("\n========================================")
        print("         MIGRATION VALIDATION")
        print("========================================")
        
        validation_success = True
        
        for table in self.tables:
            sqlite_cols = self.get_sqlite_table_columns(table)
            pg_cols = self.get_pg_table_columns(pg_cursor, table)
            common_cols = [col for col in sqlite_cols if col in pg_cols]
            
            # 1. Compare row counts
            sqlite_count = len(self.get_sqlite_table_data(table))
            pg_cursor.execute(f"SELECT COUNT(*) FROM {table};")
            pg_count = pg_cursor.fetchone()[0]
            
            print(f"\nTable: {table}")
            print(f"  Row Counts: SQLite = {sqlite_count} | PostgreSQL = {pg_count}")
            
            if sqlite_count != pg_count:
                print(f"  [FAILED] Row count mismatch on table: {table}")
                validation_success = False
                continue

            if sqlite_count == 0:
                print(f"  [SUCCESS] Empty table verified.")
                continue

            # 2. Compare checksums on common columns
            sqlite_checksum = self.compute_sqlite_checksum(table, common_cols)
            pg_checksum = self.compute_pg_checksum(pg_cursor, table, common_cols)
            print(f"  Checksums:  SQLite = {sqlite_checksum[:12]}... | PostgreSQL = {pg_checksum[:12]}...")
            
            if sqlite_checksum != pg_checksum:
                print(f"  [FAILED] Checksum mismatch on table: {table}")
                validation_success = False
            else:
                print(f"  [SUCCESS] Checksums match.")

            # 3. Compare Sample Records (First row)
            cursor = self.sqlite_conn.cursor()
            cursor.execute(f"SELECT * FROM {table} ORDER BY id LIMIT 1;")
            sqlite_sample = cursor.fetchone()
            
            pg_cursor.execute(f"SELECT * FROM {table} ORDER BY id LIMIT 1;")
            pg_sample = pg_cursor.fetchone()
            
            if sqlite_sample and pg_sample:
                # Find the index of columns in PG schema
                pg_idx = {col: i for i, col in enumerate(sorted(common_cols))}
                
                print(f"  Sample Record Compare (ID: {sqlite_sample['id']}):")
                # Compare critical keys
                if table == "users" and "username" in common_cols:
                    print(f"    SQLite: {sqlite_sample['username']} | PG: {pg_sample[pg_idx['username']]}")
                elif table == "document_submissions" and "tracking_id" in common_cols:
                    print(f"    SQLite: {sqlite_sample['tracking_id']} | PG: {pg_sample[pg_idx['tracking_id']]}")
                elif table == "db_templates" and "name" in common_cols:
                    print(f"    SQLite: {sqlite_sample['name']} | PG: {pg_sample[pg_idx['name']]}")
                    
        return validation_success

    def run(self):
        self.connect()
        pg_cursor = self.pg_conn.cursor()
        
        try:
            # Start transaction block
            print("\nStarting transaction migration block...")
            
            # Temporarily defer foreign key constraints in Postgres if needed
            pg_cursor.execute("SET CONSTRAINTS ALL DEFERRED;")
            
            for table in self.tables:
                self.migrate_table(pg_cursor, table)

            # Validate the migration in the current transaction session
            valid = self.validate_migration(pg_cursor)
            
            if not valid:
                print("\n[FAILED] Migration Validation Failed. Rolling back changes...")
                self.pg_conn.rollback()
                sys.exit(1)

            if self.dry_run:
                print("\n[WARNING] Dry-run mode active. Rolling back all transaction changes.")
                self.pg_conn.rollback()
                print("Dry-run complete. Staging database unaltered.")
            else:
                print("\n[SUCCESS] Migration Validation Succeeded. Committing transaction changes to PostgreSQL...")
                self.pg_conn.commit()
                print("Migration complete!")
                
        except Exception as e:
            print(f"\n[ERROR] Critical Error encountered during migration: {e}")
            print("Rolling back all changes...")
            self.pg_conn.rollback()
            self.close()
            sys.exit(1)
        finally:
            self.close()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="SQLite to PostgreSQL Staging Migration Utility")
    parser.add_argument("--sqlite", default="backend/document_system.db", help="Path to SQLite DB file")
    parser.add_argument("--pg-dsn", default="postgresql://postgres:postgres@localhost:5432/thelegalsetu_staging", help="PG DSN string")
    parser.add_argument("--dry-run", action="store_true", help="Execute migration inside rolled back transaction")
    parser.add_argument("--overwrite", action="store_true", help="Truncate target PG tables before copy")
    
    args = parser.parse_args()
    
    migrator = MigrationUtility(
        sqlite_path=args.sqlite,
        pg_dsn=args.pg_dsn,
        dry_run=args.dry_run,
        overwrite=args.overwrite
    )
    migrator.run()
