# Production Deployment Guide

This document outlines the steps to deploy the Gujarati Legal Document Generator SaaS in a production environment.

## 1. Docker Deployment (Recommended)

The easiest way to deploy is using Docker and Docker Compose.

### Prerequisites
- Docker and Docker Compose installed on your VPS (Ubuntu 22.04+ recommended).
- A domain name pointing to your VPS IP.

### Steps
1. Clone the repository to your VPS.
2. Update `backend/.env` with a strong `SECRET_KEY`.
3. Run the orchestration:
   ```bash
   docker-compose up -d --build
   ```
4. Your app will be available at `http://your-vps-ip`.

## 2. Reverse Proxy & HTTPS
The provided `nginx.conf` is configured for HTTP (port 80). For production, you **MUST** use HTTPS.

### Steps for SSL (Certbot)
1. Install Certbot: `sudo apt install certbot python3-certbot-nginx`
2. Run Certbot: `sudo certbot --nginx -d yourdomain.com`
3. Certbot will automatically update your Nginx configuration.

## 3. PostgreSQL Migration Strategy
Currently, the app uses SQLite. For high-traffic SaaS, you should migrate to PostgreSQL.

### How to migrate:
1. Start a PostgreSQL container in `docker-compose.yml`.
2. Update `DATABASE_URL` in `.env`:
   ```env
   DATABASE_URL=postgresql://user:password@db_host:5432/db_name
   ```
3. Install `psycopg2-binary` (already in `requirements.txt` ideally, or add it).
4. SQLAlchemy will handle the schema creation automatically on the next startup.
5. To migrate existing data, use a tool like `pgloader`.

## 4. Maintenance & Backups
- **Database:** SQLite backups are automatically created in `backend/backups/`.
- **Logs:** Docker logs can be viewed with `docker-compose logs -f`.
- **Cleanup:** Old output files are automatically cleaned up every 7 days on startup.

## 5. Security Hardening
- Change the `SECRET_KEY` in `.env`.
- Ensure Nginx `proxy_read_timeout` is sufficient but not infinite.
- Use a firewall (UFW) to block all ports except 80 and 443.
- The `Dockerfile` runs with a non-root user (recommended optimization for next stage).
