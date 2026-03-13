import time
import json
import numpy as np

BIN_RISK_TABLE = {
    '411111': 0.1, '411110': 0.9, '555555': 0.6, '400000': 0.3,
    '400010': 1.0, '522222': 0.95, '453982': 0.2, '541333': 0.4,
    '654321': 0.7, '371234': 0.1, '378282': 0.2, '601100': 0.3,
    '352800': 0.2, '512345': 0.5, '424242': 0.1, '411122': 0.15,
    '555123': 0.45, '400111': 0.25, '520000': 0.6, '456789': 0.8
}

BIN_COUNTRY = {
    '41': 'US', '55': 'IN', '40': 'GB', '52': 'IN', '45': 'AU', 
    '54': 'SG', '65': 'AE', '37': 'US', '60': 'IN', '35': 'JP', '42': 'US'
}

async def extract_features(transaction: dict, redis_client) -> tuple[np.ndarray, dict]:
    """
    Extracts 7 features from the raw transaction and updates Redis states inline.
    Returns: (features_numpy_array, features_dictionary)
    """
    now = time.time()
    
    amount = transaction['amount']
    # If the exact BIN isn't in our table, fall back to a medium default
    bin_prefix = transaction['card_bin']
    bin_risk_score = BIN_RISK_TABLE.get(bin_prefix, 0.5)
    
    merchant_id = transaction['merchant_id']
    dev_fingerprint = transaction['device_fingerprint']
    country = transaction['geo']['country']
    
    # 1. Merchant Stats (Welford's algorithm read from Redis hash)
    stats_key = f"merchant:{merchant_id}:stats"
    stats_raw = await redis_client.hgetall(stats_key)
    
    if not stats_raw:
        merchant_mean = 50000.0
        merchant_std = 30000.0
        n = 0
    else:
        # safe decode from bytes or strings
        merchant_mean = float(stats_raw.get('mean', stats_raw.get(b'mean', 50000.0)))
        merchant_std = float(stats_raw.get('std', stats_raw.get(b'std', 30000.0)))
        n = int(stats_raw.get('count', stats_raw.get(b'count', 0)))
        
    amount_zscore = (amount - merchant_mean) / merchant_std if merchant_std > 0 else 0.0
    
    # 2 & 3. Velocity Checks using Redis Sorted Sets
    vel_key = f"velocity:{dev_fingerprint}"
    
    # Prune old data (> 10 mins)
    ten_mins_ago = now - 600
    one_min_ago = now - 60
    
    await redis_client.zremrangebyscore(vel_key, "-inf", ten_mins_ago)
    
    velocity_10min = await redis_client.zcount(vel_key, ten_mins_ago, "+inf")
    velocity_1min = await redis_client.zcount(vel_key, one_min_ago, "+inf")
    
    # 4. Geo Mismatch
    # Approximate expected country using first two digits of BIN
    expected_country = BIN_COUNTRY.get(bin_prefix[:2], country)
    geo_mismatch = 1.0 if expected_country != country else 0.0
    
    # 6. Hour of Day Risk
    # In a real system this would use the user's timezone, here we approximate
    # based on the transaction timestamp or current UTC hour
    # Simulated India night hours 1:00 AM - 5:00 AM
    hour = int(transaction['timestamp'][11:13]) # 2026-03-05T10:00:00.000Z
    hour_of_day_risk = 0.8 if 1 <= hour <= 5 else 0.1
    
    # 7. Device Seen Before
    device_key = f"device:{dev_fingerprint}"
    seen = await redis_client.exists(device_key)
    device_seen_before = 1.0 if seen else 0.0
    
    # --- State Updates ---
    # Async operations fire and forget style would be better but we await to assure safety
    pipe = redis_client.pipeline()
    
    # Update device
    if not seen:
        pipe.set(device_key, '1')
        
    # Add to velocity sorted set (score = timestamp, member = uuid or timestamp text)
    pipe.zadd(vel_key, {str(now): now})
    # Set TTL on velocity set so it cleans up entirely if idle
    pipe.expire(vel_key, 600)
    
    # Welford's algorithm online mean/variance update
    n += 1
    delta = amount - merchant_mean
    merchant_mean += delta / n
    # Approximate standard deviation update
    merchant_std = max(((merchant_std * merchant_std * (n - 1) + delta * (amount - merchant_mean)) / n) ** 0.5, 1.0)
    
    pipe.hset(stats_key, mapping={
        'mean': str(merchant_mean),
        'std': str(merchant_std),
        'count': str(n)
    })
    
    await pipe.execute()
    
    # Prepare outputs
    features_dict = {
        'amount_zscore': amount_zscore,
        'velocity_1min': float(velocity_1min),
        'velocity_10min': float(velocity_10min),
        'geo_mismatch': geo_mismatch,
        'bin_risk_score': bin_risk_score,
        'hour_of_day_risk': hour_of_day_risk,
        'device_seen_before': device_seen_before
    }
    
    # Scikit-learn expects 2D array [n_samples, n_features]
    features_array = np.array([[
        amount_zscore,
        velocity_1min,
        velocity_10min,
        geo_mismatch,
        bin_risk_score,
        hour_of_day_risk,
        device_seen_before
    ]])
    
    return features_array, features_dict
