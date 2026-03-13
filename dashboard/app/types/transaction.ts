export type FraudLabel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface GeoInfo {
    lat?: number;
    lng?: number;
    country: string;
    ip?: string;
}

export interface Transaction {
    id: string;
    status: string;
    http_code: number;
    amount: number;
    currency: string;
    card_bin?: string;
    fraud_score: number;
    fraud_label: FraudLabel;
    triggered_rules: string[];
    latency_ms: number;
    geo: GeoInfo;
    merchant_id: string;
    timestamp: string;
    tampered?: boolean;
}

export interface WsMessage {
    event: 'transaction' | 'tamper_detected' | 'connected';
    data: any;
    server_timestamp: string;
}

export interface TamperAlert {
    timestamp: string;
    request_id: string;
    ip: string;
}
