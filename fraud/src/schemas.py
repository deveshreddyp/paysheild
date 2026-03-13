from pydantic import BaseModel, Field
from typing import Literal, List

class GeoInfo(BaseModel):
    country: str = Field(..., max_length=2, min_length=2)
    ip: str

class TransactionPayload(BaseModel):
    transaction_id: str
    amount: int
    currency: str
    card_bin: str
    device_fingerprint: str
    merchant_id: str
    geo: GeoInfo
    timestamp: str

class FraudScoreResponse(BaseModel):
    transaction_id: str
    risk_score: float = Field(..., ge=0.0, le=1.0)
    risk_label: Literal['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    triggered_rules: List[str]
    latency_ms: float
    model_version: str
