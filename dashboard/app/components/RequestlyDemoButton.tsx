'use client';

import { useState, useCallback } from 'react';
import { Play, Loader2, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

type ToastState = {
    type: 'success' | 'tampered' | 'error';
    message: string;
    detail?: string;
} | null;

export function RequestlyDemoButton() {
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState<ToastState>(null);

    const showToast = useCallback((t: ToastState) => {
        setToast(t);
        setTimeout(() => setToast(null), 4000);
    }, []);

    const handleSimulate = async () => {
        setIsLoading(true);
        setToast(null);

        try {
            const tokenRes = await fetch(
                `${process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3000'}/auth/token`,
                { method: 'POST' }
            );
            if (!tokenRes.ok) throw new Error('Failed to get auth token');
            const { token } = await tokenRes.json();

            const payRes = await fetch(
                `${process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3000'}/api/v1/payment/initiate`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'X-Idempotency-Key': `demo-btn-${Date.now()}`
                    },
                    body: JSON.stringify({
                        amount: 2500,
                        currency: "INR",
                        card_bin: "411111",
                        device_fingerprint: "dashboard_demo_btn",
                        merchant_id: "demo_merchant",
                        geo: { country: "IN", ip: "192.168.1.100" }
                    })
                }
            );

            const data = await payRes.json();

            if (data.tampered || data.status === 'FRAUD_FLAGGED') {
                showToast({
                    type: 'tampered',
                    message: '🚨 Tamper Detected!',
                    detail: `Requestly intercepted → ${payRes.status} FRAUD_FLAGGED | Score: ${data.fraud_score?.toFixed(3) || 'N/A'}`
                });
            } else {
                showToast({
                    type: 'success',
                    message: '✅ Payment Passed',
                    detail: `${payRes.status} ${data.status} | Score: ${data.fraud_score?.toFixed(3) || 'N/A'} — Requestly is OFF`
                });
            }
        } catch (err: any) {
            console.error('Demo simulation error:', err);
            showToast({
                type: 'error',
                message: 'Request Failed',
                detail: err.message
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative">
            {/* Button */}
            <div className="relative group">
                <div className="absolute inset-0 bg-danger/20 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                <button
                    onClick={handleSimulate}
                    disabled={isLoading}
                    className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                        background: 'var(--danger)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}
                    title="Fires a normal API transaction. Turn ON Requestly to intercept."
                >
                    {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                    )}
                    <span className="tracking-wide">TEST TAMPER</span>
                </button>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div className={`absolute top-full right-0 mt-2 w-72 rounded-xl shadow-2xl border backdrop-blur-xl z-[100] overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-top-2
                    ${toast.type === 'tampered' ? 'border-red-500/50 bg-red-950/90' :
                      toast.type === 'success' ? 'border-emerald-500/50 bg-emerald-950/90' :
                      'border-amber-500/50 bg-amber-950/90'}`}
                >
                    {/* Colored top bar */}
                    <div className={`h-1 w-full ${toast.type === 'tampered' ? 'bg-red-500' : toast.type === 'success' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <div className="p-3 flex items-start gap-2.5">
                        <div className={`mt-0.5 flex-shrink-0 ${toast.type === 'tampered' ? 'text-red-400' : toast.type === 'success' ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {toast.type === 'tampered' ? <ShieldAlert className="w-5 h-5" /> :
                             toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
                             <AlertTriangle className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className={`text-sm font-bold ${toast.type === 'tampered' ? 'text-red-200' : toast.type === 'success' ? 'text-emerald-200' : 'text-amber-200'}`}>
                                {toast.message}
                            </div>
                            {toast.detail && (
                                <div className={`text-[11px] mt-0.5 font-mono leading-relaxed ${toast.type === 'tampered' ? 'text-red-300/70' : toast.type === 'success' ? 'text-emerald-300/70' : 'text-amber-300/70'}`}>
                                    {toast.detail}
                                </div>
                            )}
                        </div>
                        <button onClick={() => setToast(null)} className="text-white/30 hover:text-white/70 text-xs mt-0.5">✕</button>
                    </div>
                </div>
            )}
        </div>
    );
}
