import time
import json
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from .schemas import TransactionPayload, FraudScoreResponse
from .dependencies import get_ml_models, get_db
from .features.extractor import extract_features

router = APIRouter()

@router.post("/score", response_model=FraudScoreResponse)
async def score_transaction(
    payload: TransactionPayload,
    models: dict = Depends(get_ml_models),
    redis = Depends(get_db)
):
    start_time = time.perf_counter()
    
    # Extract features combining both request payload and Redis lookups
    features_array, features_dict = await extract_features(payload.model_dump(), redis)
    
    # Score 1: Batch Trained Isolation Forest
    isolation_score = models['isolation'].score(features_array)
    
    # Score 2: Online River ML 
    online_score = models['online'].score_one(features_dict)
    
    # Score 3: Rule Based Engine
    rule_score, triggered_rules = models['rules'].evaluate(features_dict, payload.model_dump())
    
    # Composite Risk Generation
    risk_score = round(0.5 * isolation_score + 0.3 * online_score + 0.2 * rule_score, 4)
    risk_score = max(0.0, min(1.0, risk_score)) # Clamp
    
    # Translate score into functional label
    if risk_score < 0.3:
        risk_label = 'LOW'
    elif risk_score < 0.6:
        risk_label = 'MEDIUM'
    elif risk_score < 0.8:
        risk_label = 'HIGH'
    else:
        risk_label = 'CRITICAL'
        
    # Async background task to update the online model batch
    # We add to the pending batch directly (in-memory) instead of awaiting
    models['online'].add_to_batch(features_dict)
    
    # Calculate Latency
    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
    
    # System Telemetry Update
    await redis.incr('fraud:transactions_scored')
    
    # Push latest score to sliding window history
    pipeline = redis.pipeline()
    pipeline.lpush('fraud:recent_scores', risk_score)
    pipeline.ltrim('fraud:recent_scores', 0, 99) # Keep last 100
    await pipeline.execute()
    
    # Distribute the result
    res = FraudScoreResponse(
        transaction_id=payload.transaction_id,
        risk_score=risk_score,
        risk_label=risk_label,
        triggered_rules=triggered_rules,
        latency_ms=latency_ms,
        model_version=models['isolation'].get_version()
    )
    
    # Publish to Gateway
    await redis.publish('fraud:scores', res.model_dump_json())
    
    return res

@router.get("/model/stats")
async def get_model_stats(
    models: dict = Depends(get_ml_models),
    redis = Depends(get_db)
):
    tx_scored = await redis.get('fraud:transactions_scored')
    recent_scores = await redis.lrange('fraud:recent_scores', 0, -1)
    
    avg_score = 0.0
    if recent_scores:
        avg_score = sum(float(x) for x in recent_scores) / len(recent_scores)
        
    return {
        "transactions_scored": int(tx_scored) if tx_scored else 0,
        "isolation_model_version": models['isolation'].get_version(),
        "online_model_pending_batch": models['online'].get_stats()['pending_batch_size'],
        "online_learned_samples": models['online'].get_stats()['learned_samples'],
        "avg_score_last_100": round(avg_score, 4)
    }
