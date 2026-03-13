<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/shield-check.svg" width="100" height="100" alt="PayShield Logo">
  <h1>PayShield 🛡️</h1>
  <p><b>AI-Powered Fraud Intelligence vs. Client-Side API Tampering</b></p>
  
  [![Hackathon](https://img.shields.io/badge/HackNocturne-2.O-blueviolet)](#)
  [![Stack](https://img.shields.io/badge/Stack-Node%20%7C%20FastAPI%20%7C%20Next.js-blue)](#)
  [![Status](https://img.shields.io/badge/Status-Winning_Ready-brightgreen)](#)
  [![Live Dashboard](https://img.shields.io/badge/🚀%20Live%20Dashboard-payshield.onrender.com-success)](https://payshield-dashboard.onrender.com/)
  [![Demo Video](https://img.shields.io/badge/🎥%20Demo%20Video-Watch%20on%20Drive-red)](https://drive.google.com/file/d/1gOl_pqGhhH8_0XgCW7FzAeVuAONGDXX-/view?usp=sharing)
</div>

<br/>

> 🚀 **Live App:** [https://payshield-dashboard.onrender.com/](https://payshield-dashboard.onrender.com/)  
> 🎥 **Demo Video:** [Watch the attack simulation on Google Drive](https://drive.google.com/file/d/1gOl_pqGhhH8_0XgCW7FzAeVuAONGDXX-/view?usp=sharing)



## 🚨 The $48 Billion Blind Spot

Modern web applications **trust the browser by default**. When a user clicks "Pay ₹25", the server assumes the incoming API request is genuine. 

The reality? Attackers use proxy tools, developer consoles, and browser extensions (like Requestly) to **intercept and silently modify API requests mid-flight**—changing the amount, the currency, or the destination account before it even reaches the server. 

Current Web Application Firewalls (WAFs) and traditional fraud models **do not catch this**. They scan for malicious code or score data *after* it arrives, unaware it was tampered with in transit. This is the **number one attack vector** causing an estimated $48B in digital payment fraud annually.

---

## 💡 The Solution: PayShield (Our Novelty)

**PayShield** is an end-to-end, microservice-driven fraud intelligence system designed to detect and block API tampering *in milliseconds*, backed by an AI scoring engine. 

Unlike most security projects that use static datasets to "detect fraud", **PayShield actively defends against live, simulated attacks in real-time.**

### 🏆 Why PayShield is Unique
1. **Live Attack Simulation:** We prove our security works by attacking our own API during the demo using **Requestly** (a browser interception extension), demonstrating how invisible tampering is caught live.
2. **The "Replay Engine":** A powerful dashboard feature that visually reconstructs the entire lifecycle of a transaction (Browser → Gateway → ML Engine → Decision), explaining exactly *why* a payment was blocked.
3. **Middleware-Level Interception:** We catch tampered requests (e.g., injected headers, modified signatures) at the API edge *before* they ever reach business logic servers.

---

## 🏗️ Architecture & Tech Stack

A fully containerized, 4-tier microservice architecture that communicates via REST and WebSockets.

| Origin | Service | Technology | Purpose |
| :--- | :--- | :--- | :--- |
| **Client** | 🌐 React Dashboard | **Next.js, Tailwind, WebSockets** | Real-time threat visualization & Replay Engine |
| **Edge** | 🛡️ API Gateway | **Node.js, Express** | JWT Auth, Rate Limiting, Idempotency, **Tamper Detection Middleware** |
| **Brain** | 🧠 Fraud AI | **Python, FastAPI, XGBoost** | ML scoring on device/geo features; returns risk (0.0 - 1.0) in <50ms |
| **Data** | 🗄️ In-Memory Stack| **Redis (Pub/Sub & Cache)** | Instant event broadcasting & idempotency key storage |

---

## 🚀 How It Works (The Flow)

1. The browser initiates a payment request.
2. An attacker (simulated via **Requestly**) intercepts the request and injects a tampering payload or header.
3. The **PayShield Gateway** catches the anomaly in `< 2ms`, flagging `req.tampered = true`.
4. The transaction routes to the **Fraud Engine** for historical scoring (even if blocked, we want the ML score).
5. The Gateway immediately drops the transaction (`402 FRAUD_FLAGGED`).
6. **Redis Pub/Sub** pushes the block event to the **Next.js Dashboard**, instantly showing a red alert and logging the lifecycle in the Replay Engine.

---

## 🎮 Running PayShield Locally

We built this to be frictionless for judges to review. The entire system is orchestrated with Docker Compose.

### Prerequisites
* Docker & Docker Compose installed.

### Quick Start
```bash
# Clone the repository
git clone https://github.com/your-username/payshield.git
cd payshield

# Launch the entire microservice stack
docker-compose up -d --build
```

### Accessing the Services
* **Live Dashboard:** `http://localhost:4000`
* **API Gateway:** `http://localhost:3000`
* **Fraud Engine (Swagger Docs):** `http://localhost:8000/docs`

---

## 📁 Project File Structure

```
payshield/
│
├── 📂 dashboard/                    # Next.js Frontend Dashboard (React + WebSocket)
│   ├── app/
│   │   ├── components/              # React UI Components
│   │   │   ├── AIModelStatus.tsx     # AI model performance display
│   │   │   ├── HeatmapClient.tsx     # Geographic heatmap visualization
│   │   │   ├── LatencyChart.tsx      # Real-time latency metrics
│   │   │   ├── ReplayEngine.tsx      # Transaction lifecycle analyzer
│   │   │   ├── RequestlyDemoButton.tsx # Requestly attack simulator
│   │   │   ├── RiskPipeline.tsx      # Risk scoring pipeline viz
│   │   │   ├── SeedDataButton.tsx    # Demo data seeder
│   │   │   ├── StatsPanel.tsx        # Key metrics panel
│   │   │   ├── TamperAlert.tsx       # Tampering alerts
│   │   │   ├── TrackingStatus.tsx    # Request tracking status
│   │   │   └── Waterfall.tsx         # Request waterfall diagram
│   │   ├── hooks/                   # Custom React Hooks
│   │   │   ├── useLatencyStats.ts    # Latency statistics hook
│   │   │   └── useWebSocket.ts       # WebSocket connection hook
│   │   ├── types/                   # TypeScript Type Definitions
│   │   │   └── transaction.ts        # Transaction type schemas
│   │   ├── layout.tsx               # Root layout component
│   │   ├── page.tsx                 # Main dashboard page
│   │   └── globals.css              # Global styles
│   ├── public/                      # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── Dockerfile
│   └── next.config.mjs
│
├── 📂 gateway/                      # Node.js Express API Gateway (Edge Layer)
│   ├── src/
│   │   ├── middleware/              # Express middleware stack
│   │   │   ├── auth.js              # JWT authentication
│   │   │   ├── errorHandler.js      # Centralized error handling
│   │   │   ├── idempotency.js       # Idempotency key management
│   │   │   ├── notFound.js          # 404 handler
│   │   │   ├── rateLimit.js         # Rate limiting
│   │   │   └── security.js          # Security headers & XSS protection
│   │   ├── routes/                  # API endpoint routes
│   │   │   ├── auth.js              # Authentication routes
│   │   │   └── payment.js           # Payment processing routes
│   │   ├── services/                # Business logic services
│   │   │   ├── fraudClient.js       # Fraud engine integration
│   │   │   ├── keyRotation.js       # Cryptographic key rotation
│   │   │   └── redisClient.js       # Redis cache/pub-sub client
│   │   ├── ws/                      # WebSocket handlers
│   │   │   └── broadcaster.js       # Real-time event broadcaster
│   │   ├── scripts/
│   │   │   └── seedDemo.js          # Demo data seeding script
│   │   ├── config.js                # Configuration management
│   │   ├── index.js                 # Server entry point
│   │   └── swagger.js               # OpenAPI/Swagger docs
│   ├── package.json
│   ├── Dockerfile
│   └── .gitignore
│
├── 📂 fraud/                        # Python FastAPI Fraud Detection Engine (ML Brain)
│   ├── src/
│   │   ├── features/                # Feature engineering
│   │   │   └── extractor.py         # Transaction feature extraction
│   │   ├── model/                   # Machine Learning Models
│   │   │   ├── isolation.py         # Isolation forest anomaly detection
│   │   │   ├── online.py            # Online learning pipeline
│   │   │   └── rules.py             # Rule-based fraud detection
│   │   ├── dependencies.py          # FastAPI dependency injection
│   │   ├── main.py                  # FastAPI application entry
│   │   ├── middleware.py            # Request/response middleware
│   │   ├── router.py                # API route definitions
│   │   └── schemas.py               # Pydantic request/response schemas
│   ├── requirements.txt             # Python dependencies
│   ├── Dockerfile
│   └── .gitignore
│
├── 📂 k8s-manifests/                # Kubernetes Deployment
│   └── payshield-stack.yaml         # Complete K8s stack manifest
│
├── 📂 payshield-demo/               # HTML Interactive Demo
│   └── index.html                   # Browser-based attack simulator
│
├── 📂 postman/                      # API Testing Collection
│   └── collection.json              # Postman API endpoints
│
├── 📂 requestly/                    # Requestly Browser Extension Rules
│   └── rules.json                   # Request tampering rules config
│
├── 📂 test/                         # Integration Tests
│   └── integration.sh               # End-to-end test suite
│
├── 🐳 docker-compose.yml            # Docker Compose orchestration
├── 📋 render.yaml                   # Render.com deployment config
├── README.md                        # This file
└── 📚 Documentation Files
    ├── cmd.md                       # Command reference
    ├── doc.md                       # Detailed documentation
    ├── guide.md                     # User guide
    ├── full_deployment_guide.md     # Deployment instructions
    ├── k8s_deployment_guide.md      # Kubernetes guide
    ├── railway_deployment_guide.md  # Railway.app guide
    ├── info.md                      # Project information
    ├── process.md                   # Development process
    └── [other documentation]
```

### File Structure Legend
* 📂 **Directories** - Logical service boundaries
* 🐳 **Docker Files** - containerization configs
* 📋 **Config Files** - deployment and build configuration
* 📚 **Documentation** - guides and references

---

## 🎥 Demo Video

See PayShield in action intercepting a live API tampering attack:

👉 **[Watch Demo on Google Drive](https://drive.google.com/file/d/1gOl_pqGhhH8_0XgCW7FzAeVuAONGDXX-/view?usp=sharing)**

---

## 🌐 Using the Live Deployed App (User Flow for Judges)

The entire PayShield stack is deployed publicly on Render.com. No local setup required.

**🔗 Live Dashboard:** [https://payshield-dashboard.onrender.com/](https://payshield-dashboard.onrender.com/)

### Step-by-Step User Flow

**Step 1: Open the Dashboard**
- Go to [https://payshield-dashboard.onrender.com/](https://payshield-dashboard.onrender.com/)
- You will see the PayShield Intelligence System in dark mode with 4 stat cards at the top.
- The **"🟢 Connected"** badge in the top right confirms a live WebSocket connection to the backend.

**Step 2: Seed Demo Data (Inject 25 Transactions)**
- Click the **"Seed Data 🚀"** button in the top header.
- Within 5-8 seconds, you will see 25 transactions populate the **Transaction Stream** waterfall table in real time.
- The stats cards will update automatically: **Total Transactions = 25**, **Fraud Flagged = 1**, **Critical Alerts = 2**.

**Step 3: Explore the Transaction Stream**
- Each row shows: `Transaction ID | Amount | Merchant | Risk Score | Status | Latency | Time`
- **Green rows** = Safe (`SUCCESS`). **Red rows** = Blocked (`FRAUD_FLAGGED` / `TAMPERED`).
- Use the **Search bar** to filter by merchant name or transaction ID.

**Step 4: View the Global Threat Map**
- Click the **"Global Threat Map"** tab.
- You will see geo-located dots on the world map showing where the suspicious transactions originated (US, IN, SG, AU).
- Color coding: 🟡 Medium Risk, 🔴 High Risk, 🟣 Critical / Tampered.

**Step 5: Simulate a Live Attack (The Wow Moment)**
- Click the **"⚡ TEST TAMPER"** button in the top-right header.
- Alternatively, install the **Requestly Chrome Extension** and add a Modify Headers rule:
  - URL **Contains:** `payment/initiate`
  - Request Header: `X-Requestly-Modified` → `true`
- The moment the tampered request hits the Gateway, a **red banner** appears at the top of the screen:
  `⚠️ TAMPER DETECTED — 1 modified request intercepted`
- The transaction appears as `🚨 BLOCKED` in the stream with a `402 FRAUD_FLAGGED` status.

**Step 6: Analyze the Attack in the Replay Engine**
- Click the **"Replay Engine"** tab.
- Select the red `TAMPERED / BLOCKED` transaction.
- The Replay Engine visually reconstructs the entire lifecycle:
  `Browser → [TAMPERED] → Gateway (Middleware Caught It) → ML Engine (Scored 1.0) → BLOCKED`
- This is the exact proof that PayShield caught the attack before it reached the database.

**Step 7: Check the Right Sidebar**
- **Risk Pipeline:** Shows the last 20 transactions as color-coded dots. Look for the red dot (the tampered transaction).
- **System Latency Chart:** Shows P50/P95 latency across the session—should remain under 500ms SLA.
- **AI Model Status:** Confirms the ML model version and accuracy metrics.

---

## 🎯 How to Test the Live Attack (For Judges)

> **📌 Important for Judges:** Even if you have the Requestly extension installed, you would still need to manually create and configure the specific header injection rule. To avoid this friction, **we strongly recommend watching the pre-recorded demo first:**  
> **🎥 [Watch the full attack simulation on Google Drive](https://drive.google.com/file/d/1gOl_pqGhhH8_0XgCW7FzAeVuAONGDXX-/view?usp=sharing)**  
> The video shows the exact Requestly rule setup, the header injection, the `⚠️ TAMPER DETECTED` alert, and the live `402 FRAUD_FLAGGED` block — step by step.

If you still want to test it yourself, here's how:

### Method 1: Import Our Requestly Rules (1 Click Setup)
We have pre-built the exact Requestly rule and saved it in the repo. No manual configuration needed.
1. Install the **[Requestly Chrome Extension](https://requestly.com/)**.
2. Open Requestly → Click **Import Rules** → Upload the file `requestly/rules.json` from this repository.
3. Open the live dashboard, click **Seed Data 🚀**, then click any transaction to trigger an API call.
4. Watch the `⚠️ TAMPER DETECTED` red banner fire on the dashboard instantly.

### Method 2: Manual Rule Setup
If you'd rather create the rule yourself in Requestly:
- **Rule Type:** Modify Headers
- **URL Contains:** `payshield-gateway.onrender.com/api/v1/payment`
- **Request Header:** `X-Requestly-Modified` → value `true`

### Method 3: Use The Dashboard's Built-In Button
No extension needed! Click the `⚡ TEST TAMPER` button directly in the PayShield Dashboard header. It sends a pre-tampered payload straight to the Gateway and triggers the full detection flow instantly.

---

## 🔮 Future Roadmap

* **Behavioral Biometrics:** Tracking typing speed and mouse movements to detect bots mimicking user behavior.
* **Graph Database Integration:** Linking fraud rings together by mapping shared IP addresses and device fingerprints (Neo4j).
* **Automated Webhooks:** Instant Slack/PagerDuty alerts for critical threshold breaches.

---

## 👥 Team Orbit
- M Tanusree Reddy
- Nihal DR
- Pusalapati Devesh Reddy

<div align="center">
  <b>Built with ❤️ by Team ORBIT for Hack-Nocturne 2.O</b><br>
  <i>Stop trusting the client. Start proving it.</i>
</div>
