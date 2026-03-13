# PayShield — AI IDE Prompts
# Team ORBIT | Devesh Reddy | Hack-Nocturne 2.O

# Paste each prompt block into Antigravity IDE in order.
# Each prompt is self-contained with full context so the AI never gets lost.
# Follow the sequence: Foundation → Fraud → Dashboard → Integration → Polish

---

## CONTEXT BLOCK (paste this first, once, at the start of your session)

```
You are helping me build PayShield — an AI-native payment gateway simulator and fraud intelligence engine built for Hack-Nocturne 2.O hackathon (24 hours, MVIT Bengaluru, March 2026).

Project structure:
payshield/
├── gateway/        → Node.js 20 + Express (port 3000) — payment REST API
├── fraud/          → Python 3.11 + FastAPI (port 8000) — ML fraud scoring
├── dashboard/      → Next.js 14 + TypeScript (port 4000) — live UI
├── redis/          → Redis 7 (port 6379) — rate limiting, pub/sub, idempotency
├── postman/        → Postman collection + environment
├── requestly/      → Requestly rules JSON
└── docker-compose.yml

Tech stack:
- Gateway: Node.js, Express, express-jwt, ioredis, express-rate-limit, uuid, ws
- Fraud: Python, FastAPI, scikit-learn, river, numpy, pandas, redis-py
- Dashboard: Next.js 14, TypeScript, Tailwind CSS, Recharts, Leaflet, native WebSocket
- Infra: Docker, Docker Compose, Redis 7

Key rules:
- Every endpoint requires JWT Bearer auth (HS256, 15-min TTL, auto-rotated in Redis)
- Rate limit: 30 requests per IP per 60 seconds via Redis
- Idempotency keys stored in Redis with 24h TTL
- Card data: accept BIN (first 6 digits) ONLY — never full card number
- Fraud score = 0.5×isolation_forest + 0.3×river_online_model + 0.2×rule_based
- score ≥ 0.8 → CRITICAL → gateway returns 402
- All logs must strip Authorization headers before writing
- Services communicate via Docker internal network names (fraud:8000, redis:6379)
```

---

## PHASE 1 — PROJECT SCAFFOLD

### Prompt 1.1 — Monorepo scaffold + Docker Compose

```
Create the complete project scaffold for PayShield. Generate:

1. docker-compose.yml with 4 services:
   - gateway: build ./gateway, port 3000:3000, depends_on redis and fraud, env vars: FRAUD_ENGINE_URL=http://fraud:8000, REDIS_URL=redis://redis:6379, JWT_ROTATION_INTERVAL=900
   - fraud: build ./fraud, port 8000:8000, depends_on redis, env vars: REDIS_URL=redis://redis:6379, MODEL_BATCH_SIZE=10, ISOLATION_CONTAMINATION=0.1
   - dashboard: build ./dashboard, port 4000:4000, env vars: NEXT_PUBLIC_WS_URL=ws://localhost:3000/ws, NEXT_PUBLIC_GATEWAY_URL=http://localhost:3000
   - redis: image redis:7-alpine, port 6379:6379, add healthcheck

2. gateway/package.json with dependencies: express, express-jwt, jsonwebtoken, ioredis, express-rate-limit, rate-limit-redis, uuid, ws, cors, helmet, morgan, axios
   devDependencies: nodemon

3. gateway/Dockerfile: node:20-alpine, WORKDIR /app, copy package*.json, npm ci --production, copy src, EXPOSE 3000, CMD node src/index.js

4. fraud/requirements.txt: fastapi, uvicorn, scikit-learn, river, numpy, pandas, redis, httpx, python-dotenv

5. fraud/Dockerfile: python:3.11-slim, WORKDIR /app, pip install requirements, copy src, EXPOSE 8000, CMD uvicorn src.main:app --host 0.0.0.0 --port 8000

6. dashboard/package.json: next@14, react, react-dom, typescript, tailwindcss, recharts, leaflet, @types/leaflet, @types/react

7. dashboard/Dockerfile: node:20-alpine, build stage + production stage

8. .env.example with all environment variables documented

9. .gitignore covering node_modules, __pycache__, .env, .next, dist

Make everything production-quality. Use exact version numbers. Include healthchecks in docker-compose.
```

---

## PHASE 2 — GATEWAY API

### Prompt 2.1 — Entry point + middleware stack

```
We are building the gateway service for PayShield (Node.js + Express on port 3000).

Create gateway/src/index.js — the main Express app entry point:
- Import and apply middleware in order: helmet(), cors(), morgan('combined' but strip auth headers), express.json(), rate limiter, JWT validator
- Mount routers: /auth → authRouter, /api/v1/payment → paymentRouter, /health → health endpoint
- Health endpoint returns: { status: 'ok', service: 'gateway', timestamp: ISO8601, redis: 'connected'|'disconnected' }
- Start WebSocket server on the same HTTP server (not a separate port)
- On startup: connect to Redis, verify fraud engine reachable, log all service URLs
- Graceful shutdown: close Redis connection and HTTP server on SIGTERM

Create gateway/src/config.js — centralised config reading from process.env:
- FRAUD_ENGINE_URL, REDIS_URL, JWT_ROTATION_INTERVAL (default 900), RATE_LIMIT_MAX (default 30), RATE_LIMIT_WINDOW_MS (default 60000), PORT (default 3000)
- Validate all required vars on startup, throw clear error if missing

Create gateway/src/middleware/security.js:
- scrubLogs(req, res, next): removes Authorization header from morgan log token
- tamperDetection(req, res, next): checks for X-Requestly-Modified header, if present sets req.tampered = true and emits a 'tamper_detected' event on the app event emitter (dashboard will show this)
- addRequestId(req, res, next): adds X-Request-ID (uuid) to every request and response
```

### Prompt 2.2 — JWT auth + key rotation

```
Create gateway/src/middleware/auth.js and gateway/src/routes/auth.js for PayShield's JWT system.

gateway/src/middleware/auth.js:
- Export validateJWT middleware
- Get current JWT secret from Redis key 'jwt:current_secret'
- Verify incoming Bearer token with that secret (HS256)
- On failure: return 401 { error: 'UNAUTHORIZED', message: 'Invalid or expired token' }
- Attach decoded payload to req.user

gateway/src/services/keyRotation.js:
- On startup: check if 'jwt:current_secret' exists in Redis. If not, generate one.
- Every JWT_ROTATION_INTERVAL seconds: generate new 64-char hex secret, store as 'jwt:next_secret', wait 30 seconds (grace period for in-flight tokens), then promote next→current, delete old
- Store rotation timestamp in Redis: 'jwt:last_rotation'
- Export getCurrentSecret(), getNextExpiry()

gateway/src/routes/auth.js:
- POST /auth/token: no auth required. Generate JWT signed with current secret, payload: { sub: 'payshield_client', iat: now, exp: now + 900 }. Return: { token, expires_in: 900, next_rotation: timestamp }
- GET /auth/status: requires auth. Return current key rotation status from Redis.

Use jsonwebtoken package. Handle the case where Redis is temporarily unavailable (fallback to in-memory secret with warning log).
```

### Prompt 2.3 — Rate limiting + idempotency middleware

```
Create two middleware files for PayShield's gateway:

gateway/src/middleware/rateLimit.js:
- Use express-rate-limit with rate-limit-redis store
- Window: RATE_LIMIT_WINDOW_MS (60000ms), Max: RATE_LIMIT_MAX (30)
- Key: req.ip (use X-Forwarded-For if behind proxy)
- On limit exceeded: return 429 { error: 'RATE_LIMITED', message: 'Too many requests', retry_after_seconds: number, limit: 30, window_seconds: 60 }
- Add headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset

gateway/src/middleware/idempotency.js:
- Check X-Idempotency-Key header on POST requests
- If missing: return 400 { error: 'MISSING_IDEMPOTENCY_KEY', message: 'X-Idempotency-Key header required for all POST requests' }
- If key exists in Redis ('idempotency:{key}'): return 200 with cached response body (add header X-Idempotency-Replay: true)
- If key is new: attach storeIdempotencyResponse(key, responseBody) helper to req object, set TTL 86400 seconds
- After response sent: middleware stores response body in Redis

The idempotency middleware must intercept the response body. Use a response interceptor pattern (override res.json to capture body before sending).
```

### Prompt 2.4 — Payment routes (core business logic)

```
Create gateway/src/routes/payment.js — the heart of PayShield.

All routes require: validateJWT, rateLimiter, idempotency middleware (POST only), addRequestId, tamperDetection.

POST /api/v1/payment/initiate:
Request body schema (validate with express-validator or manual checks):
{
  amount: number (positive integer, paise),
  currency: string (must be "INR"),
  card_bin: string (exactly 6 digits, numeric only — reject anything else),
  device_fingerprint: string (required),
  merchant_id: string (required),
  geo: { country: string (2-char ISO), ip: string }
}

Logic:
1. Validate body — return 400 with specific field errors if invalid
2. Build transaction object: { id: uuid(), ...body, timestamp: ISO8601, request_id: req.requestId }
3. Call fraud engine: POST http://fraud:8000/fraud/score with transaction object, timeout 3000ms
4. If fraud engine times out or errors: use fallback score 0.5, label MEDIUM, log warning
5. Determine gateway response based on fraud score:
   - score >= 0.8 (CRITICAL): status FRAUD_FLAGGED, http_code 402
   - score >= 0.6 (HIGH): 30% chance TIMEOUT (408), 70% SUCCESS (200)
   - score < 0.6: SUCCESS (200) — but if req.tampered, force 402
6. Build full response: { transaction_id, status, http_code, fraud_score, fraud_label, triggered_rules, latency_ms, amount, currency, merchant_id, timestamp }
7. Store transaction in Redis: 'tx:{id}' with 3600s TTL
8. Publish to Redis pub/sub channel 'tx:live': JSON.stringify(fullResponse)
9. Call req.storeIdempotencyResponse(response)
10. Return response with correct HTTP status code

POST /api/v1/payment/verify:
- Requires X-Idempotency-Key — idempotency middleware handles the cache hit
- If no cache hit: return 404 { error: 'TRANSACTION_NOT_FOUND' }

GET /api/v1/payment/status/:transaction_id:
- Read 'tx:{id}' from Redis
- Return full transaction object or 404

Include a gateway/src/services/fraudClient.js that handles the HTTP call to fraud engine with proper timeout, retry once on connection error, and structured error handling.
```

### Prompt 2.5 — WebSocket broadcaster

```
Create gateway/src/ws/broadcaster.js for PayShield's real-time transaction streaming.

This module:
1. Accepts the HTTP server instance from index.js
2. Creates a ws.WebSocketServer attached to the same server on path /ws
3. Subscribes to Redis pub/sub channel 'tx:live' using a dedicated Redis client (separate from the main client — Redis pub/sub requires exclusive connection)
4. On Redis message: parse JSON, broadcast to ALL connected ws clients that are in OPEN state
5. On tamper_detected app event: broadcast special message { event: 'tamper_detected', data: { timestamp, request_id, ip } }
6. Handle client connection: send { event: 'connected', data: { server_time: ISO8601, message: 'PayShield WebSocket connected' } }
7. Handle client disconnect cleanly (remove from client set)
8. Ping/pong heartbeat every 30 seconds to detect dead connections
9. Log connection count on each connect/disconnect

Message format for all broadcasts:
{
  event: 'transaction' | 'tamper_detected' | 'connected',
  data: { ...payload },
  server_timestamp: ISO8601
}

Export: initBroadcaster(httpServer, redisClient, appEventEmitter)
```

---

## PHASE 3 — FRAUD ENGINE

### Prompt 3.1 — FastAPI app + feature extractor

```
Create the fraud engine service for PayShield (Python 3.11 + FastAPI on port 8000).

fraud/src/main.py:
- FastAPI app with title "PayShield Fraud Engine"
- Lifespan handler: on startup load/initialize models, connect Redis, log ready status
- CORS middleware allowing gateway origin
- Mount router from fraud/src/router.py
- GET /health: return { status: 'ok', service: 'fraud-engine', model_version: str, transactions_scored: int, last_model_update: ISO8601 }

fraud/src/schemas.py — Pydantic models:
TransactionPayload:
  transaction_id: str
  amount: int
  currency: str
  card_bin: str
  device_fingerprint: str
  merchant_id: str
  geo: GeoInfo (country: str, ip: str)
  timestamp: str

FraudScoreResponse:
  transaction_id: str
  risk_score: float (0.0-1.0)
  risk_label: Literal['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
  triggered_rules: List[str]
  latency_ms: float
  model_version: str

fraud/src/features/extractor.py — Feature engineering:
extract_features(transaction, redis_client) → numpy array of 7 features:
1. amount_zscore: (amount - merchant_avg) / merchant_std — read merchant stats from Redis key 'merchant:{merchant_id}:stats', default mean=50000, std=30000 if no history
2. velocity_1min: count of Redis ZADD entries in 'velocity:{device_fingerprint}' in last 60s (use sorted set with timestamp score)
3. velocity_10min: count in last 600s in same sorted set
4. geo_mismatch: 1.0 if BIN country (first 2 digits → lookup dict) != geo.country, else 0.0
5. bin_risk_score: lookup float from BIN_RISK_TABLE dict (hardcode 20 BIN prefixes with risk 0.0-1.0)
6. hour_of_day_risk: risk curve — hours 1-5 AM get 0.8, normal hours 0.1
7. device_seen_before: 0.0 if 'device:{device_fingerprint}' not in Redis, 1.0 if seen

After extraction: update velocity sorted set (ZADD current timestamp), update device seen (SET with no TTL), update merchant stats (running mean/std using Welford's algorithm stored in Redis hash).

Include a BIN_RISK_TABLE dict with at least 20 BIN prefixes (411111=0.1, 555555=0.6, 400000=0.3, etc).
```

### Prompt 3.2 — ML models (Isolation Forest + River online)

```
Create the ML model layer for PayShield's fraud engine.

fraud/src/model/isolation.py:
- IsolationForestModel class
- __init__: create sklearn IsolationForest(n_estimators=100, contamination=ISOLATION_CONTAMINATION, random_state=42)
- train_initial(X): fit on 200 synthetic transactions generated internally:
  - Normal: amount_zscore~N(0,1), velocities low (0-3), geo_mismatch=0, bin_risk~U(0,0.3), device_seen=1
  - Fraudulent (20%): amount_zscore>3, velocities high (10-30), geo_mismatch=1, bin_risk>0.7, device_seen=0
  - Fit the model on this synthetic data
- score(features_array) → float 0.0-1.0:
  - Use decision_function() output, normalize to 0-1 (higher = more anomalous)
  - Invert sign (isolation forest returns negative for anomalies)
- get_version() → str (SHA of model params)
- Save/load model to /tmp/isolation_model.pkl using joblib

fraud/src/model/online.py:
- OnlineModel class using river.anomaly.HalfSpaceTrees
- __init__: river.anomaly.HalfSpaceTrees(n_trees=10, height=8, window_size=100, seed=42)
- score_one(features_dict) → float 0.0-1.0
- learn_one(features_dict): update model with new sample
- batch_update(transactions_list): call learn_one for each, log update
- pending_batch: list accumulating transactions since last update
- add_to_batch(features_dict): append to pending_batch, if len >= MODEL_BATCH_SIZE call batch_update and clear

fraud/src/model/rules.py:
- RuleEngine class
- evaluate(features_dict, transaction) → (score: float, triggered_rules: list[str])
- Rules:
  - VELOCITY_SPIKE: velocity_1min > 5 → score 0.9, triggered
  - HIGH_AMOUNT_NEW_DEVICE: amount > 100000 and device_seen=0 → score 0.8
  - GEO_MISMATCH_HIGH_RISK_BIN: geo_mismatch=1 and bin_risk>0.5 → score 0.85
  - NIGHT_TRANSACTION_HIGH_AMOUNT: hour_of_day_risk>0.5 and amount_zscore>2 → score 0.7
  - RAPID_MERCHANT_CHURN: velocity_10min > 15 → score 0.75
  - BLOCKED_BIN_PREFIX: card_bin starts with ['400010','522222','411110'] → score 1.0
- Return weighted average of triggered rule scores, list of triggered rule names
```

### Prompt 3.3 — Scoring endpoint + Redis publisher

```
Create fraud/src/router.py — the FastAPI router for PayShield's fraud engine.

POST /fraud/score:
1. Start timer (time.perf_counter)
2. Call extract_features(transaction, redis_client) — returns numpy array + features_dict
3. Get isolation_score from IsolationForestModel.score(features_array)
4. Get online_score from OnlineModel.score_one(features_dict)
5. Get rule_score, triggered_rules from RuleEngine.evaluate(features_dict, transaction)
6. Compute: risk_score = round(0.5*isolation_score + 0.3*online_score + 0.2*rule_score, 4)
7. Clamp to 0.0-1.0
8. Determine risk_label: <0.3→LOW, <0.6→MEDIUM, <0.8→HIGH, ≥0.8→CRITICAL
9. Add to online model's pending batch (async — don't await)
10. Increment global transactions_scored counter
11. Stop timer → latency_ms
12. Publish to Redis channel 'fraud:scores': JSON with transaction_id, risk_score, risk_label, triggered_rules
13. Return FraudScoreResponse

GET /fraud/model/stats:
- Return: { transactions_scored: int, isolation_model_version: str, online_model_pending_batch: int, last_batch_update: ISO8601, avg_score_last_100: float (read from Redis list 'fraud:recent_scores') }

Also create fraud/src/dependencies.py:
- Singleton Redis client (redis.asyncio)
- Singleton model instances (IsolationForestModel, OnlineModel, RuleEngine)
- FastAPI dependency functions: get_redis(), get_models()
- Initialize all on app startup, store on app.state
```

---

## PHASE 4 — DASHBOARD

### Prompt 4.1 — Next.js setup + WebSocket hook

```
Set up the PayShield dashboard (Next.js 14, TypeScript, Tailwind CSS, port 4000).

dashboard/next.config.js:
- output: 'standalone'
- env: expose NEXT_PUBLIC_WS_URL and NEXT_PUBLIC_GATEWAY_URL

dashboard/tailwind.config.ts: configure with dark mode 'class', extend colors:
  brand: '#0D5C8A', accent: '#00B4D8', success: '#06D6A0', danger: '#EF4444', warning: '#F59E0B', critical: '#7C3AED'

dashboard/app/types/transaction.ts — TypeScript interfaces:
Transaction: { id, status, http_code, amount, currency, fraud_score, fraud_label, triggered_rules, latency_ms, geo: { lat, lng, country }, merchant_id, timestamp, tampered? }
FraudLabel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
WsMessage: { event: 'transaction'|'tamper_detected'|'connected', data: any, server_timestamp: string }

dashboard/app/hooks/useWebSocket.ts:
- Connect to NEXT_PUBLIC_WS_URL on mount
- Reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s) on disconnect
- Parse incoming JSON messages
- Export: { transactions: Transaction[], isConnected: boolean, connectionStatus: 'connecting'|'connected'|'disconnected'|'reconnecting', lastMessage: WsMessage | null, tamperAlerts: TamperAlert[] }
- Keep last 500 transactions in state (sliding window, drop oldest)
- Keep last 200 latency readings for the graph

dashboard/app/hooks/useLatencyStats.ts:
- Accept transactions array
- Compute p50, p95, p99 from latency_ms values over sliding 5-minute window
- Return { p50, p95, p99, updatedAt } — recompute every 5 seconds using setInterval
```

### Prompt 4.2 — Main layout + transaction waterfall

```
Create the main dashboard layout and transaction waterfall for PayShield.

dashboard/app/page.tsx:
- Dark theme (bg-gray-950)
- Top navbar: PayShield logo (shield icon), "LIVE" badge with pulsing green dot if connected, connection status, transaction counter
- 2-column layout: left 60% = waterfall, right 40% = stats panel
- Bottom row: full-width latency chart
- Import and render: <Waterfall />, <StatsPanel />, <LatencyChart />, <FraudMap /> (in a tab below)
- Show <TamperAlert /> banner when tamper_alerts.length > 0 (red banner at top)

dashboard/app/components/Waterfall.tsx:
- Scrolling list of transactions, newest at top, auto-scroll with pause-on-hover
- Each row: status chip (colored), transaction_id (truncated), amount (formatted ₹), fraud_label chip, latency badge, timestamp
- Status colors: SUCCESS=green, FRAUD_FLAGGED=purple, TIMEOUT=yellow, RATE_LIMITED=orange, GATEWAY_ERROR=red
- Fraud label colors: LOW=green, MEDIUM=yellow, HIGH=orange, CRITICAL=red (pulsing)
- Click row → expand: show full payload JSON, triggered_rules list, fraud score bar (0-1 gradient)
- If transaction.tampered = true: show red "⚠ TAMPERED" badge on the row
- Animate new rows in with a slide-down + fade transition
- Max visible rows: 50 (virtual scroll if possible, otherwise cap at 50 with "... and N more" indicator)

dashboard/app/components/StatsPanel.tsx:
- 4 metric cards: Total Transactions, Fraud Flagged (count + %), Avg Latency (ms), Critical Alerts
- Each card: large number, trend indicator (vs last 10 transactions), icon
- Below cards: mini bar chart showing last 20 transactions as colored bars by status
- Real-time update every time transactions array changes
```

### Prompt 4.3 — Fraud heatmap + latency chart

```
Create the fraud heatmap and latency chart components for PayShield dashboard.

dashboard/app/components/FraudMap.tsx:
- Use react-leaflet (install it) with OpenStreetMap tiles
- Center on India (lat: 20.5937, lng: 78.9629), zoom: 5
- For each transaction with fraud_label HIGH or CRITICAL: add a CircleMarker
  - radius: fraud_score * 20 (so CRITICAL transactions have bigger circles)
  - color: HIGH=orange, CRITICAL=red
  - fillOpacity: 0.6
  - On click popup: show transaction_id, amount, fraud_score, triggered_rules
- For geo data: use a lookup of country codes to approximate lat/lng (India center for IN, etc.)
- Add a legend in bottom-right corner: color scale LOW→CRITICAL
- Map must be dynamically imported (no SSR) — use next/dynamic with ssr: false
- Cap markers at 100 most recent HIGH/CRITICAL transactions

dashboard/app/components/LatencyChart.tsx:
- Use Recharts LineChart
- X-axis: last 60 data points (sliding window, labeled with time HH:MM:SS)
- Y-axis: milliseconds (0 to max+50)
- 3 lines: p50 (blue), p95 (orange), p99 (red)
- Dashed reference line at 500ms labeled "SLA"
- If p95 > 500ms: the chart area turns slightly red (add a red ReferenceArea)
- Chart updates every 5 seconds using useLatencyStats hook
- Tooltip showing all 3 values at hovered point
- Responsive container — fill parent width

dashboard/app/components/TamperAlert.tsx:
- Red banner at top of page: "⚠️ REQUESTLY TAMPER DETECTED — {N} modified requests intercepted"
- Shows list of last 3 tamper events with timestamp and IP
- Dismiss button (X) but re-shows if new tamper event arrives
- Animate in with slide-down from top
```

### Prompt 4.4 — Replay engine

```
Create dashboard/app/components/ReplayEngine.tsx for PayShield.

This component:
- Input: select a transaction from a searchable dropdown (search by transaction_id or amount)
- "Replay" button triggers step-by-step animated playback

Playback steps (animate each with 800ms delay between):
Step 1 — REQUEST RECEIVED
  Show: method, path, headers (with Authorization masked as "Bearer ***"), body JSON

Step 2 — VALIDATION
  Show: body validation result, idempotency key check result (HIT/MISS), rate limit status (X remaining)

Step 3 — FRAUD SCORE REQUEST
  Show: features extracted (all 7 as a table), POST to fraud engine, loading spinner

Step 4 — FRAUD SCORE RESPONSE
  Show: risk_score as an animated fill bar (0→actual value over 600ms), risk_label chip, triggered_rules as badges, latency_ms

Step 5 — GATEWAY DECISION
  Show: decision logic as a flowchart (simple divs with arrows): score→threshold check→response code selection

Step 6 — RESPONSE SENT
  Show: full response JSON, HTTP status code (large, colored), total latency

UI: Dark card with step indicators at top (numbered circles, completed=filled, current=pulsing, future=empty). Each step slides in from right. "Replay Again" button resets to step 1.
```

---

## PHASE 5 — INTEGRATION & TOOLING

### Prompt 5.1 — Postman collection

```
Create postman/PayShield.postman_collection.json — a complete Postman collection for PayShield.

Collection structure:
1. Folder: Auth
   - POST {{base_url}}/auth/token — no auth, stores token in environment variable

2. Folder: Payment - Happy Path
   - POST Initiate Payment (LOW risk) — low amount, known BIN, known device
   - POST Initiate Payment (MEDIUM risk) — moderate amount, slightly unusual BIN
   - GET Check Payment Status — uses transaction_id from previous response

3. Folder: Payment - Fraud Scenarios
   - POST High Amount + Unknown Device → should return 402
   - POST Velocity Attack (run 5x in collection runner) → 5th should trigger velocity rule
   - POST Geo Mismatch (country=US, BIN from IN) → HIGH/CRITICAL score
   - POST Blocked BIN Prefix (card_bin: 400010) → CRITICAL
   - POST Night Hour Simulation (modify system time in pre-request) → elevated score

4. Folder: Edge Cases
   - POST Duplicate Idempotency Key (run twice) → 2nd should return cached response with X-Idempotency-Replay: true
   - POST Rate Limit Test (runner 35 iterations) → should get 429 after 30
   - POST Missing Fields → 400 with field-specific errors
   - POST Invalid BIN (7 digits) → 400 validation error

5. Folder: Auth Edge Cases
   - POST Expired Token → 401
   - POST No Token → 401

Pre-request script (collection level) — runs before every request:
- If pm.environment.get('token_expires_at') < Date.now(): call /auth/token and update token + expires_at
- Generate random idempotency key: pm.environment.set('idempotency_key', require('uuid').v4() — use pm.variables.replaceIn('{{$guid}}'))
- Randomize payload: random amount 1000-500000, random card_bin from list of 10 BINs, random device_fingerprint

Test script (collection level) — runs after every request:
- pm.test('Response time < 500ms', () => pm.expect(pm.response.responseTime).to.be.below(500))
- pm.test('Has transaction_id', () => pm.expect(pm.response.json()).to.have.property('transaction_id'))
- pm.test('Has fraud_score', () => pm.expect(pm.response.json()).to.have.property('fraud_score'))
- Store transaction_id in environment for status check

Also create postman/PayShield.postman_environment.json with variables: base_url (http://localhost:3000), token (empty), token_expires_at (0), transaction_id (empty), idempotency_key (empty).
```

### Prompt 5.2 — Requestly rules

```
Create requestly/PayShield_rules.json — Requestly rules export file for PayShield demo.

Create 3 rules in Requestly's export format:

Rule 1 — Force Fraud Override:
  name: "PayShield — Force CRITICAL Fraud"
  ruleType: "Headers"
  pairs:
    - source: { key: "url", operator: "Contains", value: "localhost:3000/api/v1/payment/initiate" }
    - modifications: { Request: [{ header: "X-Fraud-Override", value: "CRITICAL", type: "Add" }] }
  description: "Injects X-Fraud-Override header forcing any transaction to return 402 — demonstrates defense layer"
  status: "Inactive" (disabled by default so user can toggle)

Rule 2 — BIN 4111 Timeout Mock:
  name: "PayShield — BIN 4111 Timeout"
  ruleType: "Response"  
  pairs:
    - source: { key: "url", operator: "Contains", value: "localhost:3000/api/v1/payment/initiate" }
    - response: override status to 408, body: { "error": "GATEWAY_TIMEOUT", "message": "Requestly mock: forced timeout for BIN 4111", "transaction_id": "MOCK_TIMEOUT", "http_code": 408 }
  description: "Overrides response for BIN 411111 to simulate gateway timeout — demos mock rule capability"
  status: "Inactive"

Rule 3 — Tamper Detection Marker:
  name: "PayShield — Tamper Detection Demo"
  ruleType: "Headers"
  pairs:
    - source: { key: "url", operator: "Contains", value: "localhost:3000/api/v1/payment" }
    - modifications: { Request: [{ header: "X-Requestly-Modified", value: "true", type: "Add" }] }
  description: "Marks all payment requests as modified — gateway detects this and shows tamper alert on dashboard"
  status: "Inactive"

Use the actual Requestly JSON export schema so this file can be directly imported into the Requestly extension without modification. Check Requestly docs format if unsure — the key fields are: id, name, ruleType, status, pairs, description, createdBy, currentOwner, modificationDate.
```

---

## PHASE 6 — POLISH & DEMO PREP

### Prompt 6.1 — Seed data + demo script

```
Create gateway/src/scripts/seedDemo.js — a script that populates PayShield with realistic demo data.

When run (node src/scripts/seedDemo.js), it should:
1. Get a JWT token from the running gateway
2. Send 50 transactions over 10 seconds (5/second) with varied profiles:
   - 30 normal transactions: amounts 500-50000, known BINs, Indian geo, known devices
   - 10 medium risk: high amounts 100000-500000, slightly suspicious BINs
   - 7 high risk: geo mismatch, high velocity (send 3 from same device in 30 seconds)
   - 3 critical: blocked BIN prefixes, massive amounts, new devices from foreign geo
3. Log each transaction result to console with colored output (green=success, red=fraud)
4. Print summary at end: { total, success_count, fraud_flagged_count, timeout_count, avg_latency_ms }

This gives judges something to look at on the dashboard immediately when PayShield starts.

Also create a demo.sh bash script in the root:
#!/bin/bash
echo "🛡️ Starting PayShield..."
docker-compose up -d
echo "⏳ Waiting for services..."
sleep 30
echo "🌱 Seeding demo data..."
docker exec payshield-gateway-1 node src/scripts/seedDemo.js
echo "✅ PayShield ready!"
echo "📊 Dashboard: http://localhost:4000"
echo "🔌 Gateway API: http://localhost:3000"
echo "🧠 Fraud Engine: http://localhost:8000"
echo "📮 Import Postman collection from ./postman/"
echo "🔧 Import Requestly rules from ./requestly/"
```

### Prompt 6.2 — Error handling + logging

```
Add production-quality error handling and logging across all PayShield services.

gateway/src/middleware/errorHandler.js — Express global error handler:
- Catch all unhandled errors
- Log: timestamp, error.message, error.stack, request_id, method, path, user.sub
- Strip any auth tokens/card data from logged error context
- Return structured error response:
  { error: ERROR_CODE, message: human readable, request_id, timestamp }
- Map common errors: validation errors → 400, JWT errors → 401, rate limit → 429, everything else → 500
- Never leak stack traces in response body (only in logs)

gateway/src/middleware/notFound.js:
- 404 handler for unknown routes
- Return { error: 'NOT_FOUND', message: 'Endpoint not found', available_endpoints: [list all routes] }

fraud/src/middleware.py:
- FastAPI exception handler for RequestValidationError → 422 with field-level details
- Generic exception handler → 500, log full traceback, return safe message
- Add request logging middleware: log method, path, status, latency for every request

For ALL console.log/print calls across the entire codebase:
- Replace with a structured logger
- Gateway: use a simple custom logger that outputs JSON: { level, timestamp, service: 'gateway', message, ...context }
- Fraud: use Python logging with JSON formatter
- Every log entry must include: timestamp (ISO8601), service name, request_id where available
- Log levels: DEBUG (dev only), INFO (normal flow), WARN (degraded but working), ERROR (failures)
```

### Prompt 6.3 — Final integration test

```
Create a simple integration test script: test/integration.sh

This bash script verifies the entire PayShield system is working end-to-end:

1. Check all services healthy:
   curl -f http://localhost:3000/health || exit 1
   curl -f http://localhost:8000/health || exit 1
   curl -f http://localhost:4000 || exit 1
   echo "✅ All services healthy"

2. Get JWT token (store in TOKEN variable)

3. Test auth rejection (no token → 401)

4. Test rate limit info headers (check X-RateLimit-Limit in response)

5. Send a normal transaction, assert:
   - HTTP 200
   - fraud_score is a number 0-1
   - fraud_label is one of LOW/MEDIUM/HIGH/CRITICAL
   - transaction_id is present
   - latency_ms < 1000

6. Send same request with same idempotency key, assert:
   - X-Idempotency-Replay: true header present

7. Send a CRITICAL fraud transaction (use blocked BIN 400010, amount 999999999, geo mismatch), assert:
   - HTTP 402
   - fraud_label = CRITICAL

8. Send 31 requests quickly, assert 31st returns 429

9. Call /fraud/model/stats, assert transactions_scored > 0

10. Print final summary: PASSED/FAILED for each test

Make the script colorized (green ✅ for pass, red ❌ for fail) and exit with code 1 if any test fails.
```

---

## QUICK REFERENCE

### File → Prompt mapping
| File | Prompt |
|---|---|
| docker-compose.yml, all Dockerfiles, package.json, requirements.txt | 1.1 |
| gateway/src/index.js, config.js, middleware/security.js | 2.1 |
| gateway/src/middleware/auth.js, routes/auth.js, services/keyRotation.js | 2.2 |
| gateway/src/middleware/rateLimit.js, middleware/idempotency.js | 2.3 |
| gateway/src/routes/payment.js, services/fraudClient.js | 2.4 |
| gateway/src/ws/broadcaster.js | 2.5 |
| fraud/src/main.py, schemas.py, features/extractor.py | 3.1 |
| fraud/src/model/isolation.py, model/online.py, model/rules.py | 3.2 |
| fraud/src/router.py, dependencies.py | 3.3 |
| dashboard/app/page.tsx, hooks/useWebSocket.ts, hooks/useLatencyStats.ts | 4.1 |
| dashboard/app/components/Waterfall.tsx, StatsPanel.tsx | 4.2 |
| dashboard/app/components/FraudMap.tsx, LatencyChart.tsx, TamperAlert.tsx | 4.3 |
| dashboard/app/components/ReplayEngine.tsx | 4.4 |
| postman/*.json | 5.1 |
| requestly/PayShield_rules.json | 5.2 |
| gateway/src/scripts/seedDemo.js, demo.sh | 6.1 |
| All error handlers + loggers | 6.2 |
| test/integration.sh | 6.3 |

### Build order for 24-hour hackathon
```
Hour 0-2:   Prompt 1.1 (scaffold) → docker-compose up → verify all 4 containers start
Hour 2-4:   Prompts 2.1, 2.2 (gateway foundation + auth)
Hour 4-6:   Prompts 2.3, 2.4 (rate limit + payment routes) → test with curl
Hour 6-10:  Prompts 3.1, 3.2 (fraud features + ML models)
Hour 10-12: Prompt 3.3 (scoring endpoint) → end-to-end gateway→fraud test
Hour 12-16: Prompts 4.1, 4.2 (dashboard layout + waterfall)
Hour 16-20: Prompts 4.3, 4.4 (heatmap + replay engine)
Hour 20-21: Prompt 2.5 (WebSocket broadcaster — connects all 3 layers)
Hour 21-22: Prompts 5.1, 5.2 (Postman + Requestly)
Hour 22-23: Prompt 6.1 (seed data) + run demo.sh → verify dashboard shows data
Hour 23-24: Prompts 6.2, 6.3 (error handling + integration test) → polish demo script
```
