import sqlite3
import os

db_path = 'backend/document_system.db'
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print(f"Tables: {tables}")
        for table in tables:
            table_name = table[0]
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            print(f"Table {table_name}: {count} rows")
            if table_name == 'users':
                cursor.execute("SELECT id, username, is_admin FROM users")
                users = cursor.fetchall()
                print(f"Users: {users}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()
