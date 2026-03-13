# simulate_tamper.ps1
Write-Host "🛡️ PayShield Requestly Tamper Simulation" -ForegroundColor Cyan
Write-Host "----------------------------------------"

# 1. Fetch Token
Write-Host "1. Fetching JWT Token..."
try {
    $TokenResponse = Invoke-RestMethod -Uri "http://localhost:3000/auth/token" -Method POST -ErrorAction Stop
    $Token = $TokenResponse.token
    Write-Host "✅ Token fetched successfully." -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to fetch token. Is the Gateway running on port 3000?" -ForegroundColor Red
    exit
}

# 2. Simulate Requestly Tamper Rule
Write-Host "`n2. Sending Tampered Transaction (amount: 15L, card_bin: 400010, X-Requestly-Modified: true)..."
$IdempKey = "test-tamper-$(Get-Date -Format 'yyyyMMddHHmmss')"

$BodyObj = @{
    amount = 1500000
    currency = "INR"
    card_bin = "400010"
    device_fingerprint = "dev_sim_123"
    merchant_id = "merch_demo"
    geo = @{
        country = "IN"
        ip = "1.1.1.1"
    }
}
$Body = $BodyObj | ConvertTo-Json -Depth 5

$Headers = @{
    "Authorization" = "Bearer $Token"
    "X-Idempotency-Key" = $IdempKey
    "X-Requestly-Modified" = "true"
    "Content-Type" = "application/json"
}

try {
    $Response = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/payment/initiate" `
        -Method POST `
        -Headers $Headers `
        -Body $Body `
        -ErrorAction Stop
    
    Write-Host "`n✅ SUCCESS? Wait, this shouldn't go through!" -ForegroundColor Yellow
    Write-Host ($Response | ConvertTo-Json -Depth 3 -Compress)
} catch {
    Write-Host "`n🚨 REQUEST BLOCKED BY GATEWAY (Expected Behavior!)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $ErrorStream = $_.Exception.Response.GetResponseStream()
        $ErrorReader = New-Object System.IO.StreamReader($ErrorStream)
        $ErrorBody = $ErrorReader.ReadToEnd() | ConvertFrom-Json
        
        Write-Host "Status Code: 402 Payment Required" -ForegroundColor Red
        Write-Host "Reason: $($ErrorBody.status)" -ForegroundColor Red
        Write-Host "Triggered Rules: $($ErrorBody.triggered_rules -join ', ')" -ForegroundColor Red
        Write-Host "Fraud Score: $($ErrorBody.fraud_score)" -ForegroundColor Red
        Write-Host "Fraud Label: $($ErrorBody.fraud_label)" -ForegroundColor Red
    } else {
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
}

Write-Host "`nCheck your Dashboard (http://localhost:4000) right now -- you should see the red animated Tamper Alert pop up!" -ForegroundColor Cyan
