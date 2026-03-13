# 📘 PayShield — Getting Started Guide

This guide walks you through setting up and running PayShield from scratch.

---

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| **Docker Desktop** | 4.x+ | `docker --version` |
| **Docker Compose** | 2.x+ | `docker-compose --version` |
| **Git** | Any | `git --version` |
| **Node.js** *(optional, for local dev)* | 20+ | `node --version` |
| **Python** *(optional, for local dev)* | 3.11+ | `python --version` |

> 💡 Only Docker is required. Node.js and Python are only needed if you want to run services outside Docker.

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/your-team/payshield.git
cd payshield
```

---

## Step 2: Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Default values work out of the box. Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `FRAUD_ENGINE_URL` | `http://fraud:8000` | Internal Docker URL for fraud service |
| `REDIS_URL` | `redis://redis:6379` | Redis connection string |
| `JWT_ROTATION_INTERVAL` | `3600000` | JWT secret rotation (ms, default: 1hr) |
| `RATE_LIMIT_MAX` | `30` | Max requests per window |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (ms) |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:3000` | Dashboard WebSocket URL |
| `NEXT_PUBLIC_GATEWAY_URL` | `http://localhost:3000` | Dashboard API URL |

---

## Step 3: Start All Services

```bash
docker-compose up -d --build
```

This builds and starts 4 containers:

| Container | Image | Port | Health Check |
|-----------|-------|------|-------------|
| `payshield-redis-1` | `redis:7-alpine` | 6379 | `redis-cli ping` |
| `payshield-gateway-1` | `payshield-gateway` | 3000 | `curl localhost:3000/health` |
| `payshield-fraud-1` | `payshield-fraud` | 8000 | `curl localhost:8000/health` |
| `payshield-dashboard-1` | `payshield-dashboard` | 4000 | Browser check |

First build takes 2-3 minutes. Subsequent builds use Docker cache.

---

## Step 4: Verify Services Are Running

```bash
docker-compose ps
```

Expected output:
```
NAME                    STATUS
payshield-redis-1       Up (healthy)
payshield-gateway-1     Up
payshield-fraud-1       Up
payshield-dashboard-1   Up
```

Check logs if a service isn't running:
```bash
docker-compose logs gateway
docker-compose logs fraud
docker-compose logs dashboard
```

---

## Step 5: Seed Demo Data

Open the dashboard first at **http://localhost:4000**, then seed:

```bash
docker-compose exec gateway node src/scripts/seedDemo.js
```

This sends **50 varied transactions** to the gateway:
- ~80% normal transactions (LOW/MEDIUM risk)
- ~20% intentionally suspicious (HIGH/CRITICAL risk)
- 15% chance of duplicate idempotency keys (tests cache)

You'll see transactions streaming live on the dashboard!

---

## Step 6: Test with Postman

1. Import `postman/collection.json` into Postman
2. Set environment variable `BASE_URL` to `http://localhost:3000`
3. Run the collection — it covers:
   - Token generation
   - Happy path (safe transaction)
   - Fraud path (blocked transaction)
   - Idempotency replay
   - Missing headers

---

## Step 7: Test with Requestly

1. Install the [Requestly](https://requestly.io/) browser extension
2. Import `requestly/rules.json`
3. Available rules:
   - **Force CRITICAL** — Overrides amount to trigger fraud
   - **Simulate Timeout** — Adds 5-8s delay for specific BINs
   - **Inject Tamper** — Adds `X-Requestly-Modified` header

---

## Access Points

| Service | URL |
|---------|-----|
| 🖥️ **Dashboard** | http://localhost:4000 |
| 🔌 **Gateway API** | http://localhost:3000 |
| 🧠 **Fraud Engine** | http://localhost:8000 |
| 📊 **Fraud Docs** | http://localhost:8000/docs |

---

## Common Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# View live logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f gateway

# Run seed script
docker-compose exec gateway node src/scripts/seedDemo.js

# Run integration tests (requires bash/WSL)
bash test/integration.sh
```

---

## Troubleshooting

### Port already in use
```bash
# Find and stop the conflicting container
docker ps --filter "publish=3000"
docker stop <container_id>
```

### Gateway crashes with MODULE_NOT_FOUND
```bash
docker-compose build --no-cache gateway
docker-compose up -d gateway
```

### Dashboard shows unstyled HTML
Ensure `postcss.config.js` and `tailwind.config.ts` exist in `dashboard/`. Rebuild:
```bash
docker-compose build --no-cache dashboard
docker-compose up -d dashboard
```

### Fraud Engine can't connect to Redis
Check Redis is healthy:
```bash
docker-compose ps redis
docker-compose logs redis
```

### WebSocket not connecting
Ensure `NEXT_PUBLIC_WS_URL=ws://localhost:3000` in your `.env` or dashboard build args.

---

## Local Development (Without Docker)

### Gateway
```bash
cd gateway
npm install
REDIS_URL=redis://localhost:6379 node src/index.js
```

### Fraud Engine
```bash
cd fraud
pip install -r requirements.txt
REDIS_URL=redis://localhost:6379 uvicorn src.main:app --port 8000 --reload
```

### Dashboard
```bash
cd dashboard
npm install
npm run dev
```

> ⚠️ You need Redis running locally: `docker run -d -p 6379:6379 redis:7-alpine`

---

Happy hacking! 🛡️
