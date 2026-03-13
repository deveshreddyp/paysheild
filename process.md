# PayShield — Complete Process Guide (Hack-Nocturne 2.O)

> End-to-end guide: from setting up services to configuring Requestly and testing the live Tamper Detection.
> All commands are for **Windows PowerShell**.

---

## 📋 Prerequisites

| Tool              | Version  | Check Command         |
|-------------------|----------|-----------------------|
| **Node.js**       | 20+      | `node --version`      |
| **Python**        | 3.11+    | `python --version`    |
| **Docker Desktop**| 4.x+     | `docker --version`    |
| **Redis**         | 7+       | `redis-cli ping`      |

---

## 🔧 PHASE 1 — Start All Services

### Option A: Docker (Recommended)

```powershell
# Navigate to project root
cd C:\Users\kiran\OneDrive\Desktop\payshield

# Build and start all containers (Redis, Gateway, Fraud Engine, Dashboard)
docker-compose up -d --build

# Verify all containers are running
docker-compose ps
```

### Option B: Run Locally (Without Docker)

#### 1. Start Redis
```powershell
docker run -d -p 6379:6379 --name payshield-redis redis:7-alpine
```

#### 2. Terminal 1 — Fraud Engine (Python)
```powershell
cd C:\Users\kiran\OneDrive\Desktop\payshield\fraud
$env:REDIS_URL="redis://localhost:6379"
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 3. Terminal 2 — Gateway API (Node.js)
```powershell
cd C:\Users\kiran\OneDrive\Desktop\payshield\gateway
npm install
$env:REDIS_URL="redis://localhost:6379"
$env:FRAUD_ENGINE_URL="http://localhost:8000"
$env:PORT="3000"
node src/index.js
```

#### 4. Terminal 3 — Dashboard UI (Next.js)
```powershell
cd C:\Users\kiran\OneDrive\Desktop\payshield\dashboard
npm install
$env:NEXT_PUBLIC_WS_URL="ws://localhost:3000/ws"
$env:NEXT_PUBLIC_GATEWAY_URL="http://localhost:3000"
npm run dev -- -p 4000
```

---

## ✅ PHASE 2 — Verify Services Are Running

```powershell
# Gateway health check
Invoke-RestMethod -Uri http://localhost:3000/health

# Fraud Engine health check
Invoke-RestMethod -Uri http://localhost:8000/health

# Dashboard — point your browser to:
http://localhost:4000
```

---

## 🌱 PHASE 3 — Seed Demo Data

Populate the dashboard with 50 live transactions so it looks active:

```powershell
# If using Docker:
docker-compose exec gateway node src/scripts/seedDemo.js

# If running locally:
cd C:\Users\kiran\OneDrive\Desktop\payshield\gateway
node src/scripts/seedDemo.js
```

Check the Dashboard (`http://localhost:4000`) to confirm transactions are streaming in.

---

## 🔌 PHASE 4 — Set Up Requestly Extension

### Step 1: Install from Hackathon Tracking Link

> ⚠️ **IMPORTANT**: Install from this specific link to be eligible for the **$100 partner track prize**.

Navigate to: `https://r.hack-nocturne.in/requestly`
- Install the extension.
- Sign up / Log in to the Requestly Dashboard.

### Step 2: Manually Create the Hackathon Rules

We need to create 2 rules to simulate a Man-in-the-Middle API tamper attack.

#### Rule 1: Force CRITICAL Fraud Score
1. Go to Requestly Dashboard → **Rules** → **New Rule**.
2. Select **Modify Request Body**.
3. **Rule Name:** `Force CRITICAL Fraud Score`
4. **If Request:** Set to **Equals** and paste: `http://localhost:3000/api/v1/payment/initiate`
5. **Request Body:** Select **Static Data**, and paste this exact JSON:
   ```json
   {
     "amount": 1500000,
     "card_bin": "400010"
   }
   ```
6. Click **Save Rule**.

#### Rule 2: Inject the Tamper Marker
1. Go to Requestly Dashboard → **Rules** → **New Rule**.
2. Select **Modify Headers**.
3. **Rule Name:** `Inject Tamper Marker`
4. **If Request:** Set to **Equals** and paste: `http://localhost:3000/api/v1/payment/initiate`
5. Under **Request Headers**, click **Add Header**.
6. **Key:** `X-Requestly-Modified` | **Value:** `true`
7. Click **Save Rule**.

---

## 🧪 PHASE 5 — Test & Demo (Hackathon Presentation)

### Step 1: The Requestly Extension Real-World Demo
1. Open your Dashboard at `http://localhost:4000`
2. Make sure the two Requestly rules are **Enabled** in the extension.
3. Use the Dashboard UI (or Postman) to send a normal payment.
4. Requestly intercepts it, alters the body, and injects the header.
5. The Gateway detects the tamper, rejects it with a `402 FRAUD_FLAGGED`, and you see a **RED Tamper Alert** appear automatically on the dashboard.

### Step 2: The Automated PowerShell Test Script (Live Demo Backup)
We created a script to simulate exactly what Requestly does. This is perfect if you want to show the judges the tamper detection working instantly, without needing to fiddle with the browser extension mid-presentation.

1. Keep your Dashboard open in the browser (`http://localhost:4000`).
2. Open a new PowerShell terminal.
3. Run the simulation script:
```powershell
cd C:\Users\kiran\OneDrive\Desktop\payshield
.\simulate_tamper.ps1
```

**What it does during your pitch:**
- It securely fetches an auth token from your Gateway.
- It fires a raw API transaction with the exact `amount: 1500000` and `X-Requestly-Modified: true` headers that your Requestly rules use.
- It prints exactly how the Gateway blocks it (`Status 402` and rules triggered).
- You will instantly see the **Red Tamper Alert** animation pop up on your dashboard screen! 🚨

---

## 🛑 Shutdown

```powershell
# Stop all Docker containers
cd C:\Users\kiran\OneDrive\Desktop\payshield
docker-compose down

# Kill local processes (if you ran the Option B method)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```
