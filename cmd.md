# PayShield — Run Commands

## Prerequisites

| Tool            | Required Version | Check Command             |
|-----------------|-----------------|---------------------------|
| **Node.js**     | 20+             | `node --version`          |
| **Python**      | 3.11+           | `python --version`        |
| **Redis**       | 7+              | `redis-cli ping`          |
| **Docker** *(optional)* | 4.x+    | `docker --version`       |

---

## Option A: Run with Docker (Recommended)

```bash
# Start all services (builds + launches Redis, Gateway, Fraud Engine, Dashboard)
docker-compose up -d --build

# Check service status
docker-compose ps

# View live logs
docker-compose logs -f

# Stop all services
docker-compose down
```

---

## Option B: Run Locally (Without Docker)

> ⚠️ **Redis must be running first.** If you don't have Redis installed locally, start it via Docker:

### 1. Start Redis
(If you don't have Redis running, open a terminal and run this once):
```powershell
docker run -d -p 6379:6379 --name payshield-redis redis:7-alpine
```

### 2. Terminal 1: Fraud Engine
Open a new terminal, copy-paste this exactly:
```powershell
cd fraud
$env:REDIS_URL="redis://localhost:6379"
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Terminal 2: Gateway API
Open a **second** new terminal, copy-paste this exactly:
```powershell
cd gateway
$env:REDIS_URL="redis://localhost:6379"
$env:FRAUD_ENGINE_URL="http://localhost:8000"
$env:PORT="3000"
node src/index.js
```

### 4. Terminal 3: Dashboard UI
Open a **third** new terminal, copy-paste this exactly:
```powershell
cd dashboard
$env:NEXT_PUBLIC_WS_URL="ws://localhost:3000/ws"
$env:NEXT_PUBLIC_GATEWAY_URL="http://localhost:3000"
npm run dev -p 4000
```

> 💡 **Why port 4000?** We run the dashboard on port 4000 so it doesn't conflict with the Gateway on port 3000.

---

## Verify Services

```bash
# Gateway health
curl http://localhost:3000/health

# Fraud Engine health
curl http://localhost:8000/health

# Dashboard
# Open browser → http://localhost:4000
```

---

## Seed Demo Data

After all services are running, populate the dashboard with demo transactions:

```bash
# Docker
docker-compose exec gateway node src/scripts/seedDemo.js

# Local
cd gateway
node src/scripts/seedDemo.js
```

---

## Run Integration Tests

```bash
bash test/integration.sh
```

---

## Access Points

| Service          | URL                          |
|------------------|------------------------------|
| 🖥️ Dashboard     | http://localhost:4000         |
| 🔌 Gateway API   | http://localhost:3000         |
| 🧠 Fraud Engine  | http://localhost:8000         |
| 📊 Fraud API Docs| http://localhost:8000/docs    |

---

## Useful Commands

```bash
# Kill process on a specific port (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Rebuild a specific Docker service
docker-compose build --no-cache gateway
docker-compose up -d gateway

# View specific service logs (Docker)
docker-compose logs -f fraud
```
