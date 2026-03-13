# 🌎 Deploying the Complete PayShield Architecture for Free

Deploying a 4-container microservice architecture (Node.js Gateway, Python ML Engine, Next.js Dashboard, Redis) entirely for free is challenging because most free cloud platforms (like Vercel or Netlify) only host static frontends. 

To deploy the **complete backend and frontend**, the absolute best free platform is **Render.com**. Render gives you free Web Services (for Node and Python) and a free Redis instance.

Here is the exact, step-by-step process to get your entire backend live.

---

## Step 0: Prepare Your Code for Production
Before you deploy, you need to make sure your services know how to talk to each other over the public internet, not just `localhost`.

1.  **Push to GitHub:** Make sure your entire `payshield` repository is pushed to a public or private GitHub repository.

---

## Step 1: Deploy the Database (Redis)
All of your real-time WebSocket broadcasting and rate-limiting depends on Redis. We deploy this first.

1.  Go to [Render.com](https://render.com) and create a free account using your GitHub login.
2.  In the Render Dashboard, click **New +** and select **Redis**.
3.  Name it: `payshield-redis`.
4.  Instance Type: **Free** (select the free tier option, no credit card required).
5.  Click **Create Redis**.
6.  Once it is created, scroll down and find your **Internal Redis URL** (e.g., `redis://red-c...:6379`) and your **External Redis URL**. Save these; you will need them.

---

## Step 2: Deploy the ML Fraud Engine (Python)
The Gateway needs the Fraud Engine to be alive so it can send it transactions to score.

1.  In the Render Dashboard, click **New +** and select **Web Service**.
2.  Connect your GitHub account and select your `payshield` repository.
3.  Fill out the deployment details:
    *   **Name:** `payshield-fraud-engine`
    *   **Root Directory:** `fraud_engine` (Type this exactly, so it knows to only build the Python folder).
    *   **Environment:** `Python 3`
    *   **Build Command:** `pip install -r requirements.txt`
    *   **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port 8000`
    *   **Instance Type:** **Free**
4.  Click **Create Web Service**.
5.  Once it deploys, Render will give you a live URL for your ML Engine (e.g., `https://payshield-fraud.onrender.com`). **Save this URL.**

---

## Step 3: Deploy the API Gateway (Node.js)
The Gateway needs to know where the ML Engine and Redis are located. 

1.  In the Render Dashboard, click **New +** and select **Web Service**.
2.  Select your `payshield` repository again.
3.  Fill out the deployment details:
    *   **Name:** `payshield-gateway`
    *   **Root Directory:** `gateway`
    *   **Environment:** `Node`
    *   **Build Command:** `npm install`
    *   **Start Command:** `node src/index.js`
    *   **Instance Type:** **Free**
4.  **CRITICAL STEP (Environment Variables):** Before clicking Create, scroll down to **Advanced** -> **Add Environment Variable**. You must add these three variables so the Gateway can connect to your other services:
    *   Key: `REDIS_URL` | Value: *(Paste the External Redis URL from Step 1)*
    *   Key: `FRAUD_ENGINE_URL` | Value: *(Paste the URL from Step 2, e.g., `https://payshield-fraud.onrender.com`)*
    *   Key: `PORT` | Value: `3000`
5.  Click **Create Web Service**.
6.  Once it deploys, Render will give you a live URL for your Gateway (e.g., `https://payshield-gateway.onrender.com`). **Save this URL.**

---

## Step 4: Deploy the Real-Time Dashboard (Next.js)
Because Next.js is a frontend, we can deploy this on **Vercel** for free (Render is too slow for Next.js free tiers).

1.  Go to [Vercel.com](https://vercel.com) and log in.
2.  Click **Add New Project**.
3.  Import your `payshield` repository from GitHub.
4.  **CRITICAL STEP (Configuration):**
    *   **Framework Preset:** Make sure it says `Next.js`.
    *   **Root Directory:** Click "Edit" and change it to `dashboard` (so it knows not to deploy the Node/Python code).
5.  **Environment Variables:** Add the following variable so your Next.js app knows where the Render API Gateway is located:
    *   Key: `NEXT_PUBLIC_GATEWAY_URL` | Value: *(Paste the URL from Step 3, e.g., `https://payshield-gateway.onrender.com`)*
6.  Click **Deploy**.

---

### 🎉 You Are Done!

You now have a fully deployed, completely free 4-tier microservice architecture:
1. **The Vercel URL** is your live dashboard (This is what you submit to the Hackathon).
2. It talks to your **Render Gateway**.
3. Which talks to your **Render ML Engine** and **Render Redis Database**.

*Note: Render free-tier Web Services go to "sleep" after 15 minutes of inactivity. When a judge clicks your link for the first time, the Node and Python servers might take 30-60 seconds to "wake up" and boot. This is normal for free hosting!*
