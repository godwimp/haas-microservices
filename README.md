# 🍯 HaaS — Honeypot as a Service

A deception-based security microservice that intercepts requests to fake endpoints, fingerprints attackers, and logs their behavior — built with NestJS, PostgreSQL, Redis, and BullMQ.

---

## How It Works

```
Incoming Request
  └─> HoneypotMiddleware (all routes)
        ├─> Skip? (auth, health, trap management) → next()
        ├─> Path matches active trap?
        │     ├─> No  → next()
        │     └─> Yes → TRAP TRIGGERED
        │           ├─> Extract fingerprint
        │           ├─> Calculate risk score
        │           ├─> Queue enrichment + logging job (BullMQ)
        │           ├─> Artificial delay (100–300ms)
        │           └─> Return fake response
        └─> Route Handler (if not a trap)
```

---

## Features

- 🪤 **Honeypot Traps** — Define fake endpoints with custom responses (path, method, severity, response code/body)
- 🔍 **Request Fingerprinting** — Extracts IP, User-Agent, headers, browser, OS, device
- 📊 **Risk Scoring** — Scores attacker behavior (bot UA, attack tools, proxy headers)
- 🌐 **IP Enrichment** — Geolocation + VPN/proxy detection via [ipapi.co](https://ipapi.co)
- ⚡ **Async Processing** — BullMQ queue for non-blocking enrichment & logging with retry logic
- 🔔 **Discord Alerts** — Webhook notifications when risk score exceeds threshold, with per-IP cooldown
- 🗃️ **Redis Caching** — Per `path:method` trap cache (TTL 300s) to minimize DB hits
- 🔐 **JWT Auth + RBAC** — Position-based permissions for managing traps
- 📚 **Swagger Docs** — Auto-generated API documentation

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | NestJS 11 |
| Database | PostgreSQL + Prisma |
| Cache | Redis (`cache-manager-ioredis-yet`) |
| Queue | BullMQ + `@nestjs/bullmq` |
| Auth | JWT + Passport |
| Docs | Swagger / OpenAPI |

---

## Prerequisites

- Node.js >= 18.x
- PostgreSQL >= 14.x
- Redis instance (self-hosted or managed)

---

## Installation

```bash
# Clone repo
git clone https://github.com/your-username/haas-microservices.git
cd haas-microservices

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your credentials

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database (creates default roles & permissions)
npm run prisma:seed
```

---

## Environment Variables

```env
# App
NODE_ENV=development
PORT=3000
APP_NAME=HaaS

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/haas

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=7d
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRATION=30d

# Redis (cache)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# BullMQ (uses same Redis, separate config for flexibility)
BULLMQ_REDIS_HOST=your-redis-host
BULLMQ_REDIS_PORT=6379
BULLMQ_REDIS_PASSWORD=your_redis_password

# IP Enrichment
IP_ENRICHMENT_ENABLED=true
IP_ENRICHMENT_API_KEY=        # optional, for higher rate limits on ipapi.co

# Alerts
ALERT_ENABLED=true
ALERT_RISK_THRESHOLD=70       # 0–100, alert if risk_score >= threshold
ALERT_COOLDOWN_SECONDS=300    # suppress duplicate alerts per IP for N seconds
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

---

## Running the App

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build
npm run start:prod

# Debug
npm run start:debug
```

Swagger UI available at: `http://localhost:3000/api/docs`

---

## API Overview

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register user |
| POST | `/api/v1/auth/login` | Login, returns JWT |

### Traps
> All trap endpoints require authentication + permissions.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/trap` | List all traps |
| POST | `/api/v1/trap` | Create new trap |
| GET | `/api/v1/trap/:id` | Get trap detail |
| PATCH | `/api/v1/trap/:id` | Update trap |
| DELETE | `/api/v1/trap/:id` | Delete trap |
| PATCH | `/api/v1/trap/:id/toggle` | Toggle active/inactive |

### Example: Create a Trap

```bash
curl -X POST http://localhost:3000/api/v1/trap \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/admin/config",
    "method": "GET",
    "severity": "CRITICAL",
    "response_code": 200,
    "description": "Fake admin config endpoint"
  }'
```

---

## Risk Score

Risk score (0–100) is calculated from request fingerprint:

| Signal | Score |
|---|---|
| No User-Agent | +20 |
| Bot/Crawler UA | +30 |
| Attack tool UA (nikto, sqlmap, nmap, burp, etc.) | +50 |
| X-Forwarded-For header present | +10 |

Alert is triggered when `risk_score >= ALERT_RISK_THRESHOLD`.

---

## Trap Severity Levels

| Severity | Use Case |
|---|---|
| `LOW` | Mildly suspicious paths |
| `MEDIUM` | Common recon endpoints |
| `HIGH` | Admin/config endpoints |
| `CRITICAL` | Direct attack indicators |

---

## Project Structure

```
src/
├── common/
│   ├── decorators/          # @Public(), @Permissions(), etc.
│   ├── filters/             # Global HTTP exception filter
│   ├── guards/              # JwtAuthGuard, PermissionsGuard
│   ├── interceptors/        # Logging, Transform
│   ├── middlewares/         # HoneypotMiddleware (core intercept)
│   └── prisma/              # PrismaService
├── config/                  # App, DB, JWT, Redis config
├── modules/
│   ├── auth/                # JWT auth, login/register
│   ├── honeypot/
│   │   ├── controllers/     # TrapController
│   │   ├── dto/             # CreateTrapDto, UpdateTrapDto
│   │   ├── processors/      # TrapLogProcessor (BullMQ worker)
│   │   └── services/        # TrapService, FingerprintService,
│   │                        # DeceptionService, IpEnrichmentService,
│   │                        # AlertService
│   ├── health/              # Health check endpoint
│   └── users/               # User management
├── app.module.ts
└── main.ts
```

---

## Database Schema

```
User → Position → PositionPermission → Permission  (RBAC)
Trap → TrapLog                                      (Honeypot)
```

`TrapLog` stores full fingerprint per hit: IP, method, headers, body, country, VPN flag, risk score.

Indexes on: `trap_id`, `ip_address`, `created_at`, `risk_score`.

---

## Self-Hosting Redis

If you need a self-hosted Redis instance, here's a quick Docker setup:

```bash
mkdir -p ~/redis/data

# redis.conf
cat > ~/redis/redis.conf <<EOF
bind 0.0.0.0
port 6379
requirepass YOUR_STRONG_PASSWORD
appendonly yes
maxmemory 256mb
maxmemory-policy allkeys-lru
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command CONFIG ""
EOF

# docker-compose.yml
cat > ~/redis/docker-compose.yml <<EOF
services:
  redis:
    image: redis:7-alpine
    container_name: haas-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - ./data:/data
      - ./redis.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf
EOF

cd ~/redis && docker compose up -d
```

> Restrict port 6379 via firewall to your app server IP only.

---

## License

MIT
