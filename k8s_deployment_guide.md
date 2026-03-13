# 🚢 The Complete Beginner's Guide to Deploying PayShield to Kubernetes

Kubernetes (K8s) is the industry standard for deploying enterprise microservices. It is powerful but complex to set up from scratch. Because you do not currently have the tools installed, we will use **Google Kubernetes Engine (GKE)** or **Amazon Elastic Kubernetes Service (EKS)**.

This guide takes you from 0 to a live Kubernetes cluster. 

---

## Prerequisites: Tools You Need to Install Locally
Before you touch Kubernetes, your computer needs these three tools:
1. **[Docker Desktop](https://www.docker.com/products/docker-desktop/)**: To turn your code into container images.
2. **[kubectl](https://kubernetes.io/docs/tasks/tools/)**: The command-line tool used to talk to a Kubernetes cluster.
3. A Cloud CLI: **[Google Cloud CLI (`gcloud`)](https://cloud.google.com/sdk/docs/install)** OR **[AWS CLI](https://aws.amazon.com/cli/)**.

---

## Step 1: Build Your Docker Images and Push to Docker Hub
Kubernetes does not build your code. It pulls pre-built "images" from the internet (like Docker Hub) and runs them.

1. **Create a Free Account** at [Docker Hub](https://hub.docker.com/).
2. **Open your Terminal** (PowerShell or Bash) and log in:
   ```bash
   docker login
   ```
3. **Build and Push the Fraud Engine Image:**
   ```bash
   # Make sure you are in the payshield root folder
   cd fraud
   # Replace 'yourusername' with your actual Docker Hub username!
   docker build -t yourusername/payshield-fraud:latest .
   docker push yourusername/payshield-fraud:latest
   cd ..
   ```
4. **Build and Push the Gateway Image:**
   ```bash
   cd gateway
   docker build -t yourusername/payshield-gateway:latest .
   docker push yourusername/payshield-gateway:latest
   cd ..
   ```
5. **Build and Push the Dashboard Image:**
   ```bash
   cd dashboard
   docker build -t yourusername/payshield-dashboard:latest .
   docker push yourusername/payshield-dashboard:latest
   cd ..
   ```

---

## Step 2: Spin Up a Kubernetes Cluster in the Cloud

*(We will use Google Cloud (GCP) for this example as it is generally the most beginner-friendly and offers $300 in free credits).*

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project called `payshield-cluster`.
2. Search for **"Kubernetes Engine"** and click **Enable API**.
3. Once enabled, click **Create** -> Choose **GKE Standard** (or Autopilot if you prefer).
4. Give it a name (e.g., `payshield-k8s`) and select a Region close to you.
5. Under **Node Pools**, use a basic machine type (like `e2-medium`) with 3 nodes. Click **Create**.
6. Wait 5-10 minutes for Google to provision the massive cluster infrastructure.

---

## Step 3: Connect your Terminal to the Cluster
Once the cluster is glowing green in your Google Cloud Console:

1. Click the **"Connect"** button next to your cluster.
2. Google will give you a terminal command that looks like this. Copy and paste it into your local terminal:
   ```bash
   gcloud container clusters get-credentials payshield-k8s --region us-central1 --project payshield-cluster
   ```
3. Verify you are connected by asking Kubernetes for the status of the nodes:
   ```bash
   kubectl get nodes
   ```
   *(It should list your 3 healthy server nodes!)*

---

## Step 4: Update the Kubernetes Manifests
Open the `k8s-manifests/payshield-stack.yaml` file that I created for you.

You MUST find the 3 lines that say `image: yourdockerhub/payshield-...` and update them with the actual names you used in Step 1.

Example, you must alter this block for the Gateway:
```yaml
      containers:
      - name: gateway
        image: devesh123/payshield-gateway:latest  <-- CHANGE THIS to your Docker Hub username
```

---

## Step 5: DEPLOY! 🚀

Now, tell Kubernetes to read that file and build your entire infrastructure dynamically:

```bash
kubectl apply -f k8s-manifests/payshield-stack.yaml
```

Kubernetes will instantly read the YAML file, download the images from Docker Hub, create internal routing IP addresses, spin up the load balancers, and start your apps.

Check the progress:
```bash
kubectl get pods
```
Wait until all 4 pods (fraud, gateway, dashboard, redis) say `Running`.

---

## Step 6: Get Your Live Links

Because we defined the Gateway and Dashboard as `LoadBalancer` types in the YAML file, Kubernetes will automatically talk to Google Cloud and provision an expensive, public-facing IP address for them.

Find your live IP addresses:
```bash
kubectl get services
```

You will see an `EXTERNAL-IP` address assigned to both your Gateway and your Dashboard.

1. **Copy the Dashboard's `EXTERNAL-IP`** and paste it into your browser (e.g., `http://34.120.45.67:80`). You should see your UI!
2. **Copy the Gateway's `EXTERNAL-IP`** — this is the critical step.
3. Open `k8s-manifests/payshield-stack.yaml` one last time. Go to the Dashboard deployment at the very bottom, and update the Environment variables to point to the Gateway's new public IP:
   ```yaml
        env:
        - name: NEXT_PUBLIC_GATEWAY_URL
          value: "http://<PUT_GATEWAY_IP_HERE>:3000" 
        - name: NEXT_PUBLIC_WS_URL
          value: "ws://<PUT_GATEWAY_IP_HERE>:3000/ws" 
   ```
4. Run `kubectl apply -f k8s-manifests/payshield-stack.yaml` again to update it.

**Congratulations! You have successfully mastered Docker, Google Cloud networking, and Kubernetes orchestration.** That `EXTERNAL-IP` for the Dashboard is your absolute final Hackathon Submission Link.
