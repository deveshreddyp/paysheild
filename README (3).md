# PayShield 🛡️

> **AI-Native Payment Gateway Simulator & Fraud Intelligence Engine**

[![Hackathon](https://img.shields.io/badge/Hack--Nocturne-2.O-6C63FF?style=for-the-badge)](https://hack-nocturne-2.devfolio.co/)
[![Track](https://img.shields.io/badge/Track-SaaS%20%2F%20Backend%20%2F%20APIs-0D9488?style=for-the-badge)]()
[![Team](https://img.shields.io/badge/Team-ORBIT-E63946?style=for-the-badge)]()
[![Author](https://img.shields.io/badge/Author-Devesh%20Reddy-1F3A8C?style=for-the-badge)]()

---

## What is PayShield?

India processes **13B+ UPI transactions per month** — yet developers building payment integrations have **zero realistic way** to test fraud scenarios, gateway failures, or edge-case timeouts without hitting production systems.

**PayShield is the lab that doesn't exist yet.**

A full-stack payment simulation platform with three layers that no other hackathon project has:

| Layer | Tech | What it does |
|---|---|---|
| 🏗️ **Mock Gateway Engine** | Node.js + Express | Full Razorpay/UPI-spec REST API with intelligent dynamic responses |
| 🧠 **AI Fraud Brain** | Python + scikit-learn + River ML | Online-learning anomaly detection — adapts mid-session |
| 📊 **Live Intelligence Dashboard** | Next.js 14 + WebSockets | Real-time fraud heatmaps, transaction waterfalls, replay engine |

Plus **Requestly integration** for mid-flight API interception — directly targeting the sponsor prize.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT / POSTMAN                        │
└───────────────────────┬─────────────────────────────────────────┘
                        │ HTTP REST
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              GATEWAY API  (Node.js :3000)                       │
│   JWT Auth → Rate Limit (Redis) → Idempotency → Route          │
└───────────────────┬───────────────────┬─────────────────────────┘
                    │ POST /fraud/score  │ Publish to Redis pub/sub
                    ▼                   ▼
┌───────────────────────┐   ┌─────────────────────────────────────┐
│  FRAUD ENGINE         │   │       REDIS  (:6379)                │
│  (Python :8000)       │   │  Rate limits · Idempotency keys     │
│                       │   │  WebSocket message bus              │
│  Isolation Forest     │   └──────────────────┬──────────────────┘
│  + River ML (online)  │                      │ Subscribe
│  → risk_score         │                      ▼
│  → triggered_rules    │   ┌─────────────────────────────────────┐
└───────────────────────┘   │    DASHBOARD  (Next.js :4000)       │
                            │  Waterfall · Heatmap · Replay       │
                            └─────────────────────────────────────┘
```

---

## Features

### 🏗️ Mock Payment Gateway API

- `POST /api/v1/payment/initiate` — initiate a transaction
- `POST /api/v1/payment/verify` — idempotency-aware verification
- `GET /api/v1/payment/status/:id` — poll transaction state
- Dynamic responses based on AI fraud score (not random):
  - `200 SUCCESS`
  - `402 PAYMENT_REQUIRED` (fraud score > 0.8)
  - `408 TIMEOUT` (simulated gateway lag)
  - `429 RATE_LIMITED` (> 30 req/60s)
  - `500 GATEWAY_ERROR`

### 🧠 AI Fraud Brain

- **Isolation Forest** — trained anomaly detection baseline
- **River ML HalfSpaceTrees** — online learning that updates every 10 transactions
- Feature vector: velocity, amount z-score, geo-mismatch, BIN risk, device fingerprint, hour-of-day
- Returns: `risk_score` (0.0–1.0), `risk_label` (LOW/MEDIUM/HIGH/CRITICAL), `triggered_rules[]`
- Inference SLA: **< 50ms p95** (fully in-memory)

### 📊 Live Intelligence Dashboard

- **Transaction Waterfall** — real-time scrolling list, color-coded by status
- **Fraud Heatmap** — Leaflet map with fraud signal pins, sized by score
- **Latency Graph** — p50/p95/p99 live tracking via Recharts
- **Replay Engine** — step-by-step playback of any historical transaction

### 🔌 Requestly Integration (Sponsor Prize Target)

| Rule | Effect |
|---|---|
| Inject `X-Fraud-Override: CRITICAL` | Force any transaction to fail — tests defense layer |
| Match BIN prefix `4111` → override response to `408` | Mock timeout for specific card types |
| Add `X-Requestly-Modified: true` | Triggers tamper detection alert on dashboard |

### 🤖 Postman Automation

- Pre-request scripts: randomize BIN, amount, currency, device fingerprint
- Environment variables: auto-rotate JWT before expiry
- Test assertions: status code, response time < 500ms, fraud score present
- Collection runner: 100-transaction stress test suite included

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- [Postman](https://www.postman.com/downloads/) (for running automation suite)
- [Requestly Extension](https://requestly.com/) (for interception demo)

### 1. Clone & Start

```bash
git clone https://github.com/devesh-reddy/payshield
cd payshield
docker-compose up --build
```

All 4 services start in ~45 seconds. Health check:

```bash
curl http://localhost:3000/health    # gateway
curl http://localhost:8000/health    # fraud engine
open http://localhost:4000           # dashboard
```

### 2. Run Your First Transaction

```bash
# Get a JWT
TOKEN=$(curl -s http://localhost:3000/auth/token | jq -r '.token')

# Initiate a payment
curl -X POST http://localhost:3000/api/v1/payment/initiate \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 150000,
    "currency": "INR",
    "card_bin": "411111",
    "device_fingerprint": "abc123",
    "merchant_id": "MERCH_001",
    "geo": { "country": "IN", "ip": "203.0.113.1" }
  }'
```

### 3. Run Postman Stress Test

1. Import `./postman/PayShield.postman_collection.json`
2. Import `./postman/PayShield.postman_environment.json`
3. Run Collection → 100 iterations → watch dashboard update live

### 4. Set Up Requestly

1. Install [Requestly browser extension](https://requestly.com/)
2. Import rules from `./requestly/PayShield_rules.json`
3. Enable rules and re-run transactions — watch dashboard detect overrides

---

## Project Structure

```
payshield/
├── gateway/                    # Node.js payment gateway
│   ├── src/
│   │   ├── routes/
│   │   │   ├── payment.js      # /payment/* endpoints
│   │   │   └── auth.js         # JWT issuance + rotation
│   │   ├── middleware/
│   │   │   ├── rateLimit.js    # Redis-backed rate limiter
│   │   │   ├── idempotency.js  # Idempotency key validator
│   │   │   └── security.js     # Header scrubbing, tamper detection
│   │   ├── services/
│   │   │   └── fraudClient.js  # HTTP client for fraud engine
│   │   └── ws/
│   │       └── broadcaster.js  # WebSocket + Redis pub/sub bridge
│   ├── Dockerfile
│   └── package.json
│
├── fraud/                      # Python fraud engine
│   ├── src/
│   │   ├── main.py             # FastAPI app
│   │   ├── model/
│   │   │   ├── isolation.py    # scikit-learn Isolation Forest
│   │   │   └── online.py       # River ML HalfSpaceTrees
│   │   ├── features/
│   │   │   └── extractor.py    # Feature engineering pipeline
│   │   └── rules/
│   │       └── engine.py       # Rule-based scoring layer
│   ├── Dockerfile
│   └── requirements.txt
│
├── dashboard/                  # Next.js dashboard
│   ├── app/
│   │   ├── page.tsx            # Main dashboard layout
│   │   ├── components/
│   │   │   ├── Waterfall.tsx   # Transaction list
│   │   │   ├── FraudMap.tsx    # Leaflet heatmap
│   │   │   ├── LatencyChart.tsx# Recharts p50/p95/p99
│   │   │   └── ReplayEngine.tsx# Transaction replay
│   │   └── hooks/
│   │       └── useWebSocket.ts # WS connection + message parsing
│   ├── Dockerfile
│   └── package.json
│
├── postman/
│   ├── PayShield.postman_collection.json
│   └── PayShield.postman_environment.json
│
├── requestly/
│   └── PayShield_rules.json
│
├── docker-compose.yml
├── .env.example
├── PRD.docx
├── TRD.docx
└── README.md
```

---

## API Reference

### Authentication

```
POST /auth/token
Response: { "token": "<JWT>", "expires_in": 900 }
```

All other endpoints require: `Authorization: Bearer <token>`

### Payment Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/payment/initiate` | Initiate a new transaction |
| `POST` | `/api/v1/payment/verify` | Verify with idempotency key |
| `GET` | `/api/v1/payment/status/:id` | Get transaction status |

### Fraud Engine

| Method | Path | Description |
|---|---|---|
| `POST` | `/fraud/score` | Score a transaction payload |
| `GET` | `/fraud/model/stats` | Current model accuracy stats |

### WebSocket

```
ws://localhost:3000/ws
Messages: JSON { event: "transaction", data: { ...full transaction object } }
```

---

## Fraud Scoring Logic

```
risk_score = 0.5 × isolation_forest_score
           + 0.3 × online_model_score      ← updates every 10 transactions
           + 0.2 × rule_based_score

risk_label:
  score < 0.3  → LOW       → 200 SUCCESS
  score < 0.6  → MEDIUM    → 200 SUCCESS (flagged in dashboard)
  score < 0.8  → HIGH      → 200 SUCCESS (alert in dashboard)
  score ≥ 0.8  → CRITICAL  → 402 PAYMENT_REQUIRED
```

---

## Security Features

| Feature | Implementation |
|---|---|
| JWT Auth | HS256, 15-min TTL, auto-rotation via Redis |
| Rate Limiting | 30 req/60s per IP, Redis-backed |
| Idempotency | 24-hour TTL key store in Redis |
| Card Data | BIN (6 digits) only — no full card number ever accepted |
| Header Scrubbing | Authorization stripped from all log entries |
| Tamper Detection | Requestly-modified requests flagged and alerted |

---

## Environment Variables

Copy `.env.example` to `.env`:

```env
# Gateway
JWT_SECRET=auto-managed-by-redis
FRAUD_ENGINE_URL=http://fraud:8000
REDIS_URL=redis://redis:6379
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=30

# Fraud Engine  
MODEL_BATCH_SIZE=10
ISOLATION_CONTAMINATION=0.1

# Dashboard
NEXT_PUBLIC_WS_URL=ws://localhost:3000/ws
NEXT_PUBLIC_GATEWAY_URL=http://localhost:3000
```

---

## Team

| Name | Role |
|---|---|
| **Devesh Reddy** | Full-Stack Developer · AI/ML · Backend APIs |

**Team ORBIT** — Hack-Nocturne 2.O, March 2026  
Organized by TechHub Community & GLUG MVIT

---

## Hackathon Context

- **Event:** [Hack-Nocturne 2.O](https://hack-nocturne-2.devfolio.co/) — 24-hour hackathon, MVIT Bengaluru
- **Track:** SaaS / Backend / APIs
- **Sponsor Target:** Requestly Prize (Silver Sponsor)
- **Date:** March 13–14, 2026

---

## License

MIT License — built for Hack-Nocturne 2.O

---

*"Through the night, ideas take flight."* 🌙
