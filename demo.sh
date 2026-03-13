#!/bin/bash

echo "🛡️ Starting PayShield Hackathon Demo..."

# 1. Start all services in detached mode
echo "📦 Booting Docker containers..."
docker-compose up -d --build

# 2. Wait for Gateway to be healthy
echo "⏳ Waiting for Gateway to initialize..."
until curl -s http://localhost:3000/health > /dev/null; do
  sleep 2
  echo -n "."
done
echo " Gateway is up!"

# 3. Wait for Fraud Engine to be healthy
echo "⏳ Waiting for Fraud Engine to initialize..."
until curl -s http://localhost:8000/health > /dev/null; do
  sleep 2
  echo -n "."
done
echo " Fraud Engine is up!"

# 4. Wait for Dashboard to be healthy
echo "⏳ Waiting for Dashboard to initialize..."
# Just wait a few seconds for next.js to boot
sleep 5

# 5. Run Seed Script
echo "🌱 Injecting 50 varied transactions..."
cd gateway && npm install && node src/scripts/seedDemo.js
cd ..

echo "✅ Boot complete."
echo ""
echo "🔗 Access Points:"
echo " - Dashboard: http://localhost:4000"
echo " - Gateway API: http://localhost:3000/api/v1/payment"
echo " - Fraud API: http://localhost:8000/fraud/score"
