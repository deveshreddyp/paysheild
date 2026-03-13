'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface TamperAlertData {
    timestamp: string;
    request_id: string;
    ip: string;
}

interface Props {
    alerts: TamperAlertData[];
}

export function TamperAlert({ alerts }: Props) {
    const [dismissed, setDismissed] = useState(false);
    const [prevCount, setPrevCount] = useState(0);

    useEffect(() => {
        if (alerts.length > prevCount) {
            setDismissed(false);
        }
        setPrevCount(alerts.length);
    }, [alerts.length]);

    if (alerts.length === 0 || dismissed) return null;

    return (
        <div className="animate-slideDown" style={{
            background: 'linear-gradient(90deg, rgba(239,68,68,0.12), rgba(139,92,246,0.12))',
            borderBottom: '1px solid rgba(239,68,68,0.25)',
        }}>
            <div className="max-w-[1600px] mx-auto px-6 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--danger)' }} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--danger)' }}>
                        ⚠️ TAMPER DETECTED — {alerts.length} modified request{alerts.length > 1 ? 's' : ''} intercepted
                    </span>
                    <div className="hidden md:flex items-center gap-4 ml-4 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                        {alerts.slice(0, 3).map((a, i) => (
                            <span key={i}>{a.ip} @ {new Date(a.timestamp).toLocaleTimeString()}</span>
                        ))}
                    </div>
                </div>
                <button onClick={() => setDismissed(true)}
                    className="w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:opacity-80"
                    style={{ color: 'var(--text-muted)' }}>
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
