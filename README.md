<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/shield-check.svg" width="100" height="100" alt="PayShield Logo">
  <h1>PayShield 🛡️</h1>
  <p><b>AI-Powered Fraud Intelligence vs. Client-Side API Tampering</b></p>
  
  [![Hackathon](https://img.shields.io/badge/HackNocturne-2.O-blueviolet)](#)
  [![Stack](https://img.shields.io/badge/Stack-Node%20%7C%20FastAPI%20%7C%20Next.js-blue)](#)
  [![Status](https://img.shields.io/badge/Status-Winning_Ready-brightgreen)](#)
</div>

<br/>

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

## 🎯 How to Test the Live Attack (For Judges)

We highly recommend testing the Requestly integration yourself.

### Method 1: The Interactive Demo Page
We built a standalone frontend simulator demonstrating the architecture and Requestly integration visually.
👉 **Open:** `requestly_demo.html` in your browser. Toggle the "Requestly" button to see how the Gateway reacts to clean vs. poisoned traffic.

### Method 2: Live System Seed
Don't want to click manually? Run our seeder script against the running Docker stack. It simulates 25 live payments—including one intentionally tampered request—so you can watch the dashboard react in real-time.
```bash
cd gateway
npm install
node src/scripts/seedDemo.js
```
*Watch `http://localhost:4000` to see the results live!*

---

## 🔮 Future Roadmap

* **Behavioral Biometrics:** Tracking typing speed and mouse movements to detect bots mimicking user behavior.
* **Graph Database Integration:** Linking fraud rings together by mapping shared IP addresses and device fingerprints (Neo4j).
* **Automated Webhooks:** Instant Slack/PagerDuty alerts for critical threshold breaches.

---

<div align="center">
  <b>Built with ❤️ by Team PayShield for Hack-Nocturne 2.O</b><br>
  <i>Stop trusting the client. Start proving it.</i>
</div>
