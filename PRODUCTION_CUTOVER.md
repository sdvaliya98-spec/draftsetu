# Production Cutover Runbook & Deployment Package

This document serves as the comprehensive guide for deploying, validating, monitoring, and executing recovery procedures for **TheLegalSetu** in a production environment. 

---

## SECTION A: Deployment Runbook

### A.1 Pre-Deployment Checklist
Prior to starting the migration or deployment to production, verify the following prerequisites:

| Item | Description | Verification Command / Check | Status |
| :--- | :--- | :--- | :--- |
| **System Resources** | Host server has at least 2 vCPUs and 4GB RAM (needed for heavy LibreOffice/Word PDF conversion). | `lscpu` / `free -h` | [ ] |
| **Database Readiness** | Target PostgreSQL server is running and accessible from the app network. | `pg_isready -h <host> -p 5432` | [ ] |
| **Environment Config**| Create and populate `backend/.env` with production-grade configurations. | Check for `SECRET_KEY` (must not be default). | [ ] |
| **Dependencies** | All packages in `backend/requirements.txt` installed (specifically `psycopg2-binary` and `alembic`). | `pip list \| grep -E "psycopg2-binary\|alembic"` | [ ] |
| **Nginx Hardening** | Nginx `nginx.conf` has proxy headers, gzip enabled, and extended timeouts. | Inspect `proxy_read_timeout 300` | [ ] |
| **Storage Directories**| Required upload and temp storage directories exist with write access. | `mkdir -p backend/uploads/{templates_storage,outputs,temp_renders,temp_previews}` | [ ] |
| **PDF Conversion Engine**| `libreoffice` installed (on Linux) or Microsoft Word installed (on Windows). | `soffice --version` or verify Word COM availability | [ ] |
| **Pre-Deployment Backup**| Back up existing SQLite production database if performing an in-place upgrade. | `cp backend/document_system.db backend/backups/pre_prod_backup.db` | [ ] |

---

### A.2 PostgreSQL Database Setup Steps
Since the application uses connection pooling conditionally for PostgreSQL, follow these steps to configure the database engine.

1. **Install PostgreSQL Server (if not containerized)**:
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib -y
   ```
2. **Create Database User**:
   Connect as the `postgres` user and create a dedicated application user:
   ```sql
   CREATE USER legalsetu_user WITH PASSWORD 'Strong_Production_Password_Here';
   ```
3. **Create Database**:
   Create the production database and assign ownership:
   ```sql
   CREATE DATABASE legalsetu_prod OWNER legalsetu_user;
   GRANT ALL PRIVILEGES ON DATABASE legalsetu_prod TO legalsetu_user;
   ```
4. **Configure Access Control (`pg_hba.conf`)**:
   Ensure the application server/container can connect to the PostgreSQL instance. Add the following rule to your `pg_hba.conf` (usually in `/etc/postgresql/15/main/`):
   ```text
   # TYPE  DATABASE        USER            ADDRESS                 METHOD
   host    legalsetu_prod  legalsetu_user  127.0.0.1/32            scram-sha-256
   ```
5. **Verify Connection Settings**:
   The connection URL to be supplied in the `backend/.env` must match the format:
   ```env
   DATABASE_URL=postgresql://legalsetu_user:Strong_Production_Password_Here@127.0.0.1:5432/legalsetu_prod
   ```

---

### A.3 Schema Migration & Initialization Steps
The database setup supports two strategies for initializing the PostgreSQL schema:

#### Strategy 1: SQLAlchemy Auto-Initialization (Recommended for First Launch)
When the application server restarts, the initialization sequence in [main.py](file:///d:/new/backend/main.py) does the following automatically:
1. Calls `models.Base.metadata.create_all(bind=database.engine)` to create any missing tables.
2. Calls `database.ensure_schema_up_to_date()` to inspect the existing schema and add missing columns:
   - **`db_templates` Table**: Adds `header`, `footer`, `content2`, `menu_item_id` if missing.
   - **`document_submissions` Table**: Adds `final_pdf_path`, `final_docx_path`, `pdf_ready` (boolean), `pdf_generation_in_progress` (boolean) if missing.
   - **`menu_items` Table**: Adds `type` (defaults to `'page'`), `template_id` if missing.
   - **`users` Table**: Adds `is_active` (boolean, defaults to `True`) if missing.
3. Automatically attempts SQL column additions for fallback coverage (e.g. `file_path`, `category`).

#### Strategy 2: Alembic Migrations (Recommended for Production Version Control)
If you prefer deterministic, trackable migration runs:
1. Update `DATABASE_URL` in your `.env`.
2. Execute the migrations using Alembic:
   ```bash
   alembic upgrade head
   ```
3. Check the current database migration status:
   ```bash
   alembic current
   ```

---

### A.4 Deployment Validation Steps
After service startup, verify the application successfully initialized and connected to the database:

1. **Verify Backend Startup Logs**:
   Look for the following log markers indicating a successful PostgreSQL initialization:
   ```text
   📡 Database: Configuring PostgreSQL connection engine with pooling...
   ✅ PostgreSQL Database connected: <your-db-host>
   ✅ Schema check completed successfully.
   🚀 Backend server starting up...
   ```
2. **Execute Health Check Endpoint**:
   Perform an HTTP GET request to the health route:
   ```bash
   curl -X GET http://127.0.0.1:8000/api/health
   ```
   **Expected Response Body**:
   ```json
   {
     "status": "online",
     "services": {
       "database": "ok",
       "storage": "ok"
     },
     "diagnostics": {
       "db_path": "your_postgresql_host_info",
       "total_templates": 0
     }
   }
   ```
3. **Execute Port Check**:
   Validate that the API gateway (Nginx on port 80/443) and FastAPI backend (port 8000) are running and listening.
   ```bash
   python check_port.py
   ```

---

### A.5 Deployment Rollback Steps
If the PostgreSQL database connection fails, pool issues occur, or database errors block document generation, follow this rollback plan:

1. **Stop Application Services**:
   ```bash
   docker-compose down
   ```
2. **Revert Configuration to SQLite**:
   Edit `backend/.env` and reset the database URL to use SQLite:
   ```env
   DATABASE_URL=sqlite:///backend/document_system.db
   ```
3. **Restore SQLite Database File**:
   Copy the pre-deployment SQLite database backup back to its active location:
   ```bash
   cp backend/backups/pre_prod_backup.db backend/document_system.db
   ```
4. **Re-activate WAL Mode**:
   On startup, the SQLite connection engine automatically re-enables WAL mode via:
   ```sql
   PRAGMA journal_mode=WAL;
   PRAGMA synchronous=NORMAL;
   ```
5. **Restart Services**:
   ```bash
   docker-compose up -d --build
   ```
6. **Confirm Successful Rollback**:
   Verify `"status": "online"` and SQLite database indicators return to normal:
   ```bash
   curl -X GET http://127.0.0.1:8000/api/health
   ```

---

## SECTION B: Production Validation Checklist

Execute these verification checks in order to validate the deployed environment.

### B.1 User Registration & Authentication

#### B.1.1 User Registration
* **Action**: Submit new user registration payload to `POST /api/auth/register`.
* **Expected Result**: HTTP 201 Created. User record is committed to the database. The `is_active` field in the database must default to `True` (1).
* **Command**:
  ```bash
  curl -X POST http://127.0.0.1:8000/api/auth/register \
       -H "Content-Type: application/json" \
       -d "{\"username\": \"testuser\", \"password\": \"securepassword123\"}"
  ```

#### B.1.2 User Login
* **Action**: Submit valid credentials to `POST /api/auth/login`.
* **Expected Result**: HTTP 200 OK. Returns a JSON payload containing `access_token` and `token_type` (bearer).
* **Command**:
  ```bash
  curl -X POST http://127.0.0.1:8000/api/auth/login \
       -H "Content-Type: application/x-www-form-urlencoded" \
       -d "username=testuser&password=securepassword123"
  ```
  *(Store the returned JWT token as environment variable `JWT_TOKEN` for subsequent steps)*

---

### B.2 Document Draft Operations

#### B.2.1 Create & Save Draft
* **Action**: Submit a document data payload to `POST /api/documents/draft`.
* **Expected Result**: HTTP 200 OK. Returns the new document record. `is_locked` must be `False` (0) and `tracking_id` is assigned (format: `DOC-XXXXXXXX`).
* **Command**:
  ```bash
  curl -X POST http://127.0.0.1:8000/api/documents/draft \
       -H "Authorization: Bearer $JWT_TOKEN" \
       -H "Content-Type: application/json" \
       -d "{\"survey_no\": \"123/A\", \"buyer_name\": \"Amit Patel\", \"amount\": \"500000\", \"template_id\": \"varasai_pedhinamu\"}"
  ```

#### B.2.2 Draft Saves Cap Enforcement
* **Action**: Attempt to save more than 10 draft documents for a single user account.
* **Expected Result**: The 11th request returns HTTP 400 Bad Request with a clear error payload:
  `{"detail": "Maximum 10 saved documents allowed. Please delete old documents before saving new ones."}`

---

### B.3 Document Finalization & Generation

#### B.3.1 Finalize Draft (Locking)
* **Action**: Send a PUT request with `is_final: true` to `PUT /api/documents/{tracking_id}`.
* **Expected Result**:
  1. The database column `is_locked` is set to `True`.
  2. The database column `pdf_generation_in_progress` is set to `True`, and `pdf_ready` is set to `False`.
  3. A background task `start_background_pdf_generation` is successfully spawned.
* **Command**:
  ```bash
  curl -X PUT http://127.0.0.1:8000/api/documents/DOC-YOURTRACKINGID \
       -H "Authorization: Bearer $JWT_TOKEN" \
       -H "Content-Type: application/json" \
       -d "{\"is_final\": true, \"survey_no\": \"123/A\", \"buyer_name\": \"Amit Patel\", \"amount\": \"500000\", \"template_id\": \"varasai_pedhinamu\"}"
  ```

#### B.3.2 Lock Modification Prevention
* **Action**: Attempt to perform another edit PUT request to a finalized document: `PUT /api/documents/{tracking_id}`.
* **Expected Result**: HTTP 403 Forbidden with `{"detail": "Finalized documents cannot be edited"}`.

#### B.3.3 Background PDF Conversion & Fault Recovery
* **Verification**: Monitor backend logs to confirm:
  1. Background thread starts PDF generation.
  2. The DOCX file is populated using the `docxtpl` engine.
  3. The DOCX file is converted to PDF (via Microsoft Word or LibreOffice headless subprocess).
  4. Final files are copied to `backend/uploads/outputs/`.
  5. The database record transitions: `pdf_ready` -> `True` and `pdf_generation_in_progress` -> `False`.
* **Fault Handling Test**: If PDF conversion fails, ensure the database transaction logs show that the background error catcher resets `pdf_ready` -> `False` and `pdf_generation_in_progress` -> `False` to prevent the document from getting locked in a perpetual processing state.

---

### B.4 Administrative & Analytics APIs

#### B.4.1 User Account Enable/Disable
* **Action**: Send a PUT request as administrator to toggle a user account state: `PUT /api/admin/users/{user_id}/status`.
* **Expected Result**: HTTP 200 OK. Account status updated.
* **Self-Disable Prevention**: Check that attempting to disable the active logged-in administrator account returns HTTP 400 Bad Request: `{"detail": "Admins cannot disable their own accounts"}`.

#### B.4.2 System Activity Logs Audit
* **Action**: Access activity log querying endpoint: `GET /api/admin/activity-logs`.
* **Expected Result**: HTTP 200 OK. Return list of logged actions. Confirm logs exist for:
  - `"action": "Draft Saved"`
  - `"action": "Document Generated"`
  - `"action": "PDF Downloaded"`
  - `"action": "User Enabled"` or `"action": "User Disabled"`

#### B.4.3 Template Analytics Verification
* **Action**: Retrieve template usage metrics: `GET /api/admin/template-analytics`.
* **Expected Result**: Returns metrics aggregating document submissions using:
  - SQLite: `json_extract(data_json, '$.template_id')`
  - PostgreSQL: `jsonb_extract_path_text(data_json, 'template_id')`
  Verify the top 20 templates array includes usage count statistics and correct `last_used` timestamps.

#### B.4.4 Storage Analytics Verification
* **Action**: Retrieve storage sizing calculations: `GET /api/admin/storage-analytics`.
* **Expected Result**: Returns sizes of active directories:
  - Database file size (`database_bytes` - including main file, `-wal` write-ahead log, and `-shm` shared memory).
  - Templates uploads path (`uploads_bytes`).
  - Output documents path (`generated_bytes`).
  - Temporary workspace path (`temp_bytes`).

---

## SECTION C: Monitoring Checklist

To ensure operational stability, set up automated alerting on the following metrics:

### C.1 Key Performance Metrics

| Metric | Target Normal Range | Warning Threshold | Alert Action |
| :--- | :--- | :--- | :--- |
| **System CPU Usage** | < 20% average | > 80% sustained for > 5 min | Alert admin of potential CPU bottleneck during conversions. |
| **System RAM Usage** | 1.0GB - 2.5GB active | > 85% utilization | Trigger inspection for zombie `soffice.bin` or `WINWORD.EXE` processes. |
| **Database Pool Connections** | 2 - 10 active connections | > 80% pool utilization (16+ active connections out of 20 pool size) | Investigate connection leaks or long-running database transactions. |
| **Disk Partition Usage** | < 60% capacity | > 80% utilization | Trigger disk cleanup. |
| **Uptime (Uvicorn)** | 100% active | Process crashes | Restart daemon via systemd / docker container restart policy. |

---

### C.2 Connection Pooling Configuration
When executing in PostgreSQL mode, verify the database engine connection pool metrics (hardcoded in [database.py](file:///d:/new/backend/database.py)):
* **Connection Pool Size (`pool_size`)**: `20` concurrent connection slots.
* **Overflow Limit (`max_overflow`)**: `30` additional connections allowed during burst traffic.
* **Pre-ping Check (`pool_pre_ping`)**: Set to `True` to validate stale connection sockets prior to execution (prevents DB errors from server side terminations).

---

### C.3 Storage Cleanup Automations
Verify that temporary rendering directories are cleaned regularly to prevent storage exhaustion:
1. **Application Startup Cleanup**: On launch, the server triggers:
   - `cleanup_old_outputs(days=7)`: Cleans any generated files in the outputs directory older than 7 days.
   - `cleanup_temp_previews(all_files=True)`: Purges all files in the temporary previews directory immediately.
2. **Background Task Cleanup**: During preview requests, the application registers a background task to clean preview files.

---

## SECTION D: Emergency Recovery Plan

Use these runbooks to mitigate system outages or failures.

### D.1 Backup Restore Procedures

#### D.1.1 SQLite Database Restore
If running in SQLite mode and the database gets corrupted:
1. Stop the application services:
   ```bash
   docker-compose down
   ```
2. Navigate to the backup directory: `backend/backups/`.
3. Locate the latest healthy database file (named `document_system_backup_YYYYMMDD_HHMMSS.db`).
4. Copy the backup file over the active database:
   ```bash
   cp backend/backups/document_system_backup_20260606_080000.db backend/document_system.db
   ```
5. Restart the application:
   ```bash
   docker-compose up -d
   ```

#### D.1.2 PostgreSQL Database Restore
If running in PostgreSQL mode and database recovery is required:
1. Drop the corrupted database:
   ```sql
   DROP DATABASE legalsetu_prod;
   CREATE DATABASE legalsetu_prod OWNER legalsetu_user;
   ```
2. Run the restore command from your backup file:
   ```bash
   # If backup is a plain SQL dump:
   psql -h 127.0.0.1 -U legalsetu_user -d legalsetu_prod < database_backup.sql
   
   # If backup is a custom tar/directory archive:
   pg_restore -h 127.0.0.1 -U legalsetu_user -d legalsetu_prod -v database_backup.dump
   ```

---

### D.2 SQLite Rollback Procedure
If the PostgreSQL cluster experiences a catastrophic failure, use this guide to rollback the application to SQLite within 3 minutes:

```mermaid
graph TD
    A[PostgreSQL Cluster Crash] --> B[Stop Application Service]
    B --> C[Configure backend/.env Database URL to SQLite]
    C --> D[Restore Healthy SQLite Backup from backups/ folder]
    D --> E[Start Application Service]
    E --> F[Verify Connection and WAL Mode on Health check]
```

1. **Modify Environment Configuration**:
   Update `backend/.env` with:
   ```env
   DATABASE_URL=sqlite:///backend/document_system.db
   ```
2. **Restore SQLite State**:
   Restore the latest backup file from `backend/backups/` into the root backend path:
   ```bash
   cp backend/backups/document_system_backup_latest.db backend/document_system.db
   ```
3. **Boot Up System**:
   ```bash
   docker-compose up -d --build
   ```
4. **Validation**:
   Validate SQLite status using the healthcheck API. Confirm journal mode outputs:
   ```text
   📊 SQLite Journal Mode: wal
   📊 SQLite WAL Enabled Status: True
   ```

---

### D.3 PostgreSQL Failure Handling
If database query timeouts or connection pool exhaustion errors appear in logs:

1. **Check Connection Pool Exhaustion**:
   If the log throws `TimeoutError: QueuePool limit of size 20 overflow 30 reached, connection timed out`, verify current active connections using PostgreSQL administrative query:
   ```sql
   SELECT count(*), state FROM pg_stat_activity WHERE datname = 'legalsetu_prod' GROUP BY state;
   ```
2. **Terminate Leaked Connections**:
   If inactive connections are blocking the pool, terminate idle sessions:
   ```sql
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
   WHERE datname = 'legalsetu_prod' AND state = 'idle' AND state_change < current_timestamp - interval '5 minutes';
   ```
3. **Restart PostgreSQL Service**:
   If database becomes unresponsive, perform a safe restart:
   ```bash
   sudo systemctl restart postgresql
   ```

---

## SECTION E: Final GO / NO-GO

Before cutting over to the live production environment, the deployment manager and team leads must complete the following evaluation checklist.

### E.1 Pre-Flight Check Status

| Evaluation Check | Criticality | Target State / Requirement | Status (PASS / FAIL) | Notes |
| :--- | :--- | :--- | :---: | :--- |
| **PostgreSQL Schema Sync** | Block-critical | All tables and columns matching `models` are present. | [ ] | |
| **API Health Endpoints** | Block-critical | GET `/api/health` returns status `online` and service databases are `ok`. | [ ] | |
| **Document Generation** | Block-critical | DOCX file generates and renders without errors. | [ ] | |
| **PDF Conversion Engine** | Block-critical | `convert_docx_to_pdf` converts files successfully via Word COM / LibreOffice. | [ ] | |
| **User Access Security** | High | Default password hashes or insecure SECRET_KEYs removed. | [ ] | |
| **Storage Sizing Bounds** | Medium | Disk has > 50% capacity available. Preview cleanup task executes successfully. | [ ] | |
| **Backup Cron Tasks** | High | Backup processes configured to run daily and store offsite. | [ ] | |

---

### E.2 GO / NO-GO Decision Matrix

```text
       ┌────────────────────────────────────────────────────────┐
       │   Are all "Block-critical" evaluation checks PASS?     │
       └───────────────────────────┬────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼ Yes                         ▼ No
       ┌──────────────────────────┐    ┌──────────────────────────┐
       │     Check High items     │    │        NO-GO             │
       └────────────┬─────────────┘    │  (Deploy Rollback Plan)  │
                    │                  └──────────────────────────┘
      ┌─────────────┴─────────────┐
      ▼ All PASS                  ▼ Any FAIL (with no workaround)
 ┌──────────┐                ┌──────────┐
 │  GO-LIVE │                │  NO-GO   │
 └──────────┘                └──────────┘
```

---

### E.3 Cutover Sign-Off Template

* **Release Version**: `v1.0.0`
* **Cutover Timestamp**: `2026-06-06T08:30:00Z`
* **Deployment Engineer**: `__________________________`
* **QA / Verification Lead**: `__________________________`
* **Project Manager**: `__________________________`

**Final Cutover Decision**: **[ GO ] / [ NO-GO ]**

*Reasoning / Comments:*
__________________________________________________________________________________________________
__________________________________________________________________________________________________
