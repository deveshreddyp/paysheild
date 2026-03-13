import logging
import redis.asyncio as redis
from fastapi import Request

logger = logging.getLogger("fraud_engine")

# To be instantiated in main.py lifespan handler
redis_client = None
isolation_model = None
online_model = None
rule_engine = None

async def get_redis():
    if redis_client is None:
        raise ValueError("Redis client not initialized")
    return redis_client

async def get_models():
    if None in (isolation_model, online_model, rule_engine):
        raise ValueError("Models not initialized")
    return {
        "isolation": isolation_model,
        "online": online_model,
        "rules": rule_engine
    }

def get_db(request: Request):
    return request.app.state.redis

def get_ml_models(request: Request):
    return {
        "isolation": request.app.state.isolation_model,
        "online": request.app.state.online_model,
        "rules": request.app.state.rule_engine
    }
