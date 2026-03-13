# 🚂 Deploying PayShield to Railway (Full Stack)

Railway supports deploying multiple services from a single monorepo. Each service gets its own container, and Railway provides a free Redis plugin. Here is the exact step-by-step process.

> **Note:** Railway's free "Trial" plan gives you $5 of usage credit. This is more than enough for a hackathon demo (services only consume credits while running).

---

## Step 1: Sign Up & Create a Project

1. Go to [railway.app](https://railway.app) and sign up with your **GitHub** account.
2. Once logged in, click **"New Project"** in the top right.
3. Select **"Empty Project"**. This creates a blank canvas where we will add each service.

---

## Step 2: Add Redis (The Database)

1. Inside your new project, click **"+ New"** in the top right.
2. Select **"Database"** → **"Add Redis"**.
3. Railway will instantly provision a Redis instance.
4. Click on the Redis service tile → go to the **"Variables"** tab.
5. You will see a variable called `REDIS_URL`. Copy its value (e.g., `redis://default:password@...railway.internal:6379`). You will need this for the other services.

---

## Step 3: Deploy the Fraud Engine (Python ML)

1. Click **"+ New"** → **"GitHub Repo"** → Select your `deveshreddyp/paysheild` repository.
2. Railway will ask you to configure the service. Set:
   - **Service Name:** `fraud-engine`
   - **Root Directory:** `/fraud` (Click "Settings" tab → scroll to "Root Directory" → type `fraud`)
3. Go to the **"Variables"** tab and add:
   - `REDIS_URL` = *(Paste the Redis URL from Step 2)*
   - `MODEL_BATCH_SIZE` = `10`
   - `ISOLATION_CONTAMINATION` = `0.1`
   - `PORT` = `8000`
4. Go to **"Settings"** tab → Under **"Networking"** → Click **"Generate Domain"** to give it a public URL.
5. Also under Networking, note the **"Private Networking"** address (e.g., `fraud-engine.railway.internal`). This is how the Gateway will talk to it internally (faster, no public internet roundtrip).
6. Wait for the build to complete. Railway auto-detects the Dockerfile in `/fraud` and builds it.

---

## Step 4: Deploy the API Gateway (Node.js)

1. Click **"+ New"** → **"GitHub Repo"** → Select your `deveshreddyp/paysheild` repository again.
2. Configure:
   - **Service Name:** `gateway`
   - **Root Directory:** `/gateway`
3. Go to **"Variables"** tab and add:
   - `REDIS_URL` = *(Paste the Redis URL from Step 2)*
   - `FRAUD_ENGINE_URL` = `http://fraud-engine.railway.internal:8000` *(Use the internal Railway address from Step 3 for speed and security)*
   - `JWT_ROTATION_INTERVAL` = `900`
   - `PORT` = `3000`
   - `RATE_LIMIT_MAX` = `100` *(Increase for demo so judges don't get rate-limited)*
4. Go to **"Settings"** → **"Networking"** → Click **"Generate Domain"**.
5. **Important:** Copy the generated public domain URL (e.g., `gateway-production-xxxx.up.railway.app`). The Dashboard needs this.
6. Wait for the build to complete.

---

## Step 5: Deploy the Dashboard (Next.js)

1. Click **"+ New"** → **"GitHub Repo"** → Select your `deveshreddyp/paysheild` repository one more time.
2. Configure:
   - **Service Name:** `dashboard`
   - **Root Directory:** `/dashboard`
3. Go to **"Variables"** tab and add:
   - `NEXT_PUBLIC_WS_URL` = `wss://gateway-production-xxxx.up.railway.app/ws` *(Use `wss://` not `ws://` because Railway uses HTTPS. Replace with your actual Gateway domain from Step 4)*
   - `NEXT_PUBLIC_GATEWAY_URL` = `https://gateway-production-xxxx.up.railway.app` *(Same Gateway domain, with `https://`)*
   - `PORT` = `4000`
4. Go to **"Settings"** → **"Networking"** → Click **"Generate Domain"**.
5. **This Dashboard URL is what you submit to the hackathon as your "Deployed URL"!**

---

## Step 6: Verify Everything Works

1. Open the Dashboard URL in your browser.
2. You should see the PayShield dashboard loading.
3. Click **"TEST TAMPER"** — a tampered transaction should appear in the live feed.
4. Check the **Replay Engine** — it should show the full 4-step trace.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Dashboard shows blank | Check `NEXT_PUBLIC_GATEWAY_URL` env var points to the correct Gateway URL |
| Gateway crashes on startup | Check `REDIS_URL` and `FRAUD_ENGINE_URL` env vars are set correctly |
| WebSocket not connecting | Make sure `NEXT_PUBLIC_WS_URL` uses `wss://` (not `ws://`) |
| Build fails for Dashboard | Make sure Root Directory is set to `/dashboard` (not `/`) |
| Fraud Engine 500 error | Check the Fraud Engine logs in Railway for Python import errors |

---

## Architecture on Railway

```
┌─────────────────────────────────────────────────┐
│                    Railway Project               │
│                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐    │
│  │ Dashboard │──▶│ Gateway  │──▶│  Fraud   │    │
│  │ (Next.js) │   │ (Node.js)│   │ (Python) │    │
│  │  :4000   │   │  :3000   │   │  :8000   │    │
│  └──────────┘   └────┬─────┘   └──────────┘    │
│                      │                           │
│                 ┌────▼─────┐                    │
│                 │  Redis   │                    │
│                 │  :6379   │                    │
│                 └──────────┘                    │
└─────────────────────────────────────────────────┘
```

**Total cost: $0 (within Railway's $5 trial credit)**
