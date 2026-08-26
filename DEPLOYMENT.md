# Production Deployment Guide

This document outlines the steps to deploy the DraftSetu (TheLegalSetu) Legal Document Automation SaaS in a production environment.

---

## 1. Docker Deployment (Recommended)

The easiest way to deploy is using Docker and Docker Compose.

### Prerequisites
- Docker and Docker Compose installed on your VPS (Ubuntu 22.04+ recommended).
- A domain name pointing to your VPS IP.

### Steps
1. Clone the repository to your VPS.
2. Copy `backend/.env.example` to `backend/.env` and update all values:
   ```bash
   cp backend/.env.example backend/.env
   nano backend/.env
   ```
3. Run the orchestration:
   ```bash
   docker-compose up -d --build
   ```
4. Your app will be available at `http://your-vps-ip`.

---

## 2. Razorpay Payment Gateway Production Configuration

### Environment Variables
Configure the following in `backend/.env`:

| Variable | Description | Example / Required |
|---|---|---|
| `RAZORPAY_KEY_ID` | Public Key ID from Razorpay Dashboard | `rzp_live_xxxxxxxxxxxxxx` (Required) |
| `RAZORPAY_KEY_SECRET` | Private Secret Key for server-side HMAC-SHA256 signature verification | `xxxxxxxxxxxxxxxxxxxxxxxx` (Required, Keep Secret!) |
| `RAZORPAY_WEBHOOK_SECRET` | Secret key configured for Razorpay Webhooks in dashboard | `xxxxxxxxxxxxxxxxxxxxxxxx` (Recommended) |

> [!CAUTION]
> **Security Notice**: `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` must **NEVER** be exposed to frontend code, committed to git, or sent in API responses.

### Setting Up Razorpay Webhook (Optional but Recommended)
1. Go to **Razorpay Dashboard** > **Settings** > **Webhooks** > **Add New Webhook**.
2. **Webhook URL**: `https://yourdomain.com/api/wallet/webhook/razorpay`
3. **Secret**: Enter your `RAZORPAY_WEBHOOK_SECRET`.
4. **Active Events**:
   - `payment.captured`
   - `order.paid`
5. Save Webhook.

---

## 3. Reverse Proxy & HTTPS

The provided `nginx.conf` is configured for HTTP (port 80). For production, you **MUST** use HTTPS.

### Steps for SSL (Certbot)
1. Install Certbot: `sudo apt install certbot python3-certbot-nginx`
2. Run Certbot: `sudo certbot --nginx -d yourdomain.com`
3. Certbot will automatically update your Nginx configuration.

---

## 4. PostgreSQL Migration Strategy

For production, migrate from SQLite to PostgreSQL:

### Steps:
1. Start a PostgreSQL container in `docker-compose.yml` or use a managed database service (e.g. AWS RDS, Supabase, Neon).
2. Update `DATABASE_URL` in `backend/.env`:
   ```env
   DATABASE_URL=postgresql://user:password@db_host:5432/draftsetu_db
   ```
3. Run Alembic migrations:
   ```bash
   alembic upgrade head
   ```
4. Automatic schema validation in `backend/database.py` will also ensure all tables (`payment_orders`, `users`, `wallets`, `wallet_transactions`, etc.) and unique indexes are intact.

---

## 5. Maintenance & Backups
- **Database:** SQLite backups are automatically created in `backend/backups/`.
- **Logs:** Docker logs can be viewed with `docker-compose logs -f`.
- **Cleanup:** Old output files and temporary renders are automatically cleaned up on startup.

---

## 6. Security Hardening
- Change the `SECRET_KEY` in `.env` to a secure random string (at least 32 characters).
- Ensure Nginx `proxy_read_timeout` is sufficient (60s).
- Use a firewall (UFW) to block all ports except 80 and 443.
