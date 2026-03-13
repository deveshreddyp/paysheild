import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as redis

from .router import router as fraud_router
from .model.isolation import IsolationForestModel
from .model.online import OnlineModel
from .model.rules import RuleEngine
from .middleware import add_process_time_header, custom_exception_handler, validation_exception_handler
from fastapi.exceptions import RequestValidationError

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("fraud_engine.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Redis Client
    redis_url = os.environ.get("REDIS_URL", "redis://redis:6379")
    app.state.redis = redis.from_url(redis_url, decode_responses=True)
    logger.info(f"[Lifespan] Connected to Redis at {redis_url}")
    
    # Initialize ML Models
    isolation = IsolationForestModel(contamination=float(os.environ.get("ISOLATION_CONTAMINATION", "0.1")))
    if not isolation.load():
        isolation.train_initial()
        
    online = OnlineModel(batch_size=int(os.environ.get("MODEL_BATCH_SIZE", "10")))
    rules = RuleEngine()
    
    app.state.isolation_model = isolation
    app.state.online_model = online
    app.state.rule_engine = rules
    
    logger.info("[Lifespan] Initialized all Fraud ML Models")
    yield
    
    await app.state.redis.close()
    logger.info("[Lifespan] Disconnected from Redis")

app = FastAPI(
    title="PayShield Fraud Engine",
    description="Real-time ML anomaly detection and rules engine",
    version="1.0.0",
    lifespan=lifespan
)

# Exception Handlers
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, custom_exception_handler)

# Middlewares
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Since gateway communicates server-to-server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.middleware("http")(add_process_time_header)

# Routers
app.include_router(fraud_router, prefix="/fraud", tags=["scoring"])

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "fraud-engine",
        "model_version": app.state.isolation_model.get_version(),
        "timestamp": app.state.redis.time()
    }
