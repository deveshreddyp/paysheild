#!/bin/bash
set -e

GATEWAY="http://localhost:3000"

echo "🧪 Running Integration Tests..."

# 1. Fetch Token
echo -n "1. Fetch JWT Token... "
TOKEN=$(curl -s -X POST $GATEWAY/auth/token | grep -o '\"token\":\"[^\"]*' | cut -d: -f2 | tr -d '\"')
if [ -z "$TOKEN" ]; then
  echo "❌ FAILED"
  exit 1
fi
echo "✅ PASS"

# 2. Test Idempotency
echo -n "2. Test Idempotency Engine... "
IDEMP_KEY="test-idemp-$(date +%s)"
RES1=$(curl -s -o /dev/null -w "%{http_code}" -X POST $GATEWAY/api/v1/payment/initiate \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Idempotency-Key: $IDEMP_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount":100,"currency":"INR","card_bin":"411111","device_fingerprint":"d1","merchant_id":"m1","geo":{"country":"IN","ip":"1.1.1.1"}}')

RES2_HEADERS=$(curl -s -D - -o /dev/null -X POST $GATEWAY/api/v1/payment/initiate \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Idempotency-Key: $IDEMP_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount":100,"currency":"INR","card_bin":"411111","device_fingerprint":"d1","merchant_id":"m1","geo":{"country":"IN","ip":"1.1.1.1"}}')

if echo "$RES2_HEADERS" | grep -q "x-idempotency-replay: true"; then
  echo "✅ PASS"
else
  echo "❌ FAILED (No replay header)"
  exit 1
fi

# 3. Requestly Tamper Sim
echo -n "3. Tamper Detection... "
TAMPER_RES=$(curl -s -X POST $GATEWAY/api/v1/payment/initiate \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Idempotency-Key: tamper-key-$(date +%s)" \
  -H "X-Requestly-Modified: true" \
  -H "Content-Type: application/json" \
  -d '{"amount":100,"currency":"INR","card_bin":"411111","device_fingerprint":"d1","merchant_id":"m1","geo":{"country":"IN","ip":"1.1.1.1"}}')

if echo "$TAMPER_RES" | grep -q "FRAUD_FLAGGED"; then
  echo "✅ PASS (Blocked by tamper)"
else
  echo "❌ FAILED (Tamper bypassed)"
  exit 1
fi

echo "🎉 All integration tests passed!"
