# Deployment Guide — Sunset Customer Application Platform (Backend)

This document provides instructions for deploying the FastAPI backend into production.

---

## 1. System Requirements

- **Operating System:** Linux (Ubuntu 22.04 LTS / Debian 12 recommended) or Windows Server
- **Python:** 3.11 or 3.12
- **Database:** PostgreSQL 14+
- **Cache/Queue:** Redis 7+ (optional for background workers)
- **Object Storage:** AWS S3, Cloudflare R2, MinIO, or Wasabi

---

## 2. Production Environment Configuration (`.env`)

```ini
APP_NAME="Sunset Group Customer Platform"
APP_VERSION="1.0.0"
DEBUG=false
ENVIRONMENT=production
SECRET_KEY=YOUR_64_CHAR_HEX_RANDOM_SECRET_KEY
LOG_LEVEL=INFO

# Database
DATABASE_URL=postgresql://sunset_user:STRONG_PASSWORD@db-host.internal:5432/sunset_prod_db
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=40

# JWT Authentication
JWT_SECRET_KEY=YOUR_JWT_SECRET_KEY_MIN_32_CHARS
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# S3 Compatible Private Storage
S3_BUCKET_NAME=sunset-group-customer-docs
S3_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY
S3_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_KEY
S3_REGION=ap-southeast-1
S3_ENDPOINT_URL=
S3_SIGNED_URL_EXPIRE_SECONDS=3600

# CORS & Security
CORS_ORIGINS=https://customer.sunsetgroup.com,https://admin.sunsetgroup.com
CORS_ALLOW_CREDENTIALS=true

# Rate Limits
RATE_LIMIT_PER_MINUTE=120
AUTH_RATE_LIMIT_PER_MINUTE=10
```

---

## 3. Database Migration & Initialization

Run migrations and database seeding:
```bash
# Activate production venv
source /opt/sunset/backend/venv/bin/activate

# Execute schema migrations
alembic upgrade head

# Run seed script (idempotent, ensures 4 divisions & admin user exist)
python scripts/seed_db.py
```

---

## 4. Production Gunicorn + Uvicorn Worker Setup

Install gunicorn in the virtual environment:
```bash
pip install gunicorn
```

Run with 4 Uvicorn workers:
```bash
gunicorn main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --access-logfile /var/log/sunset/access.log \
  --error-logfile /var/log/sunset/error.log
```

---

## 5. Systemd Service File (`/etc/systemd/system/sunset-backend.service`)

```ini
[Unit]
Description=Sunset Customer Platform Backend API
After=network.target postgresql.service

[Service]
Type=simple
User=sunset
Group=sunset
WorkingDirectory=/opt/sunset/backend
EnvironmentFile=/opt/sunset/backend/.env
ExecStart=/opt/sunset/backend/venv/bin/gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 127.0.0.1:8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable sunset-backend
sudo systemctl start sunset-backend
```

---

## 6. Nginx Reverse Proxy Configuration

```nginx
server {
    listen 80;
    server_name api.sunsetgroup.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.sunsetgroup.com;

    ssl_certificate /etc/letsencrypt/live/api.sunsetgroup.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.sunsetgroup.com/privkey.pem;

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 7. Docker Compose Option (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: sunset_user
      POSTGRES_PASSWORD: sunset_password
      POSTGRES_DB: sunset_customer_db
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  api:
    build: .
    restart: always
    env_file: .env
    ports:
      - "8000:8000"
    depends_on:
      - db
    command: >
      sh -c "alembic upgrade head &&
             python scripts/seed_db.py &&
             uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4"

volumes:
  pgdata:
```

