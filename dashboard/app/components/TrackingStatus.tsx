'use client';

import { Transaction } from '../types/transaction';
import { useEffect, useState, useRef } from 'react';
import { CheckCircle2, Circle, CreditCard, ArrowRight } from 'lucide-react';

interface Props {
    transactions: Transaction[];
}

const STAGES = [
    { id: 1, label: 'Initiated', desc: 'Payment received' },
    { id: 2, label: 'Validated', desc: 'Schema & rate limit' },
    { id: 3, label: 'Scored', desc: 'AI fraud analysis' },
    { id: 4, label: 'Decided', desc: 'Accept or block' },
    { id: 5, label: 'Completed', desc: 'Response sent' },
];

export function TrackingStatus({ transactions }: Props) {
    const [activeStage, setActiveStage] = useState(0);
    const [latestTx, setLatestTx] = useState<Transaction | null>(null);
    const prevCountRef = useRef(0);

    useEffect(() => {
        if (transactions.length > prevCountRef.current) {
            const tx = transactions[0];
            setLatestTx(tx);
            setActiveStage(0);

            const timers: NodeJS.Timeout[] = [];
            STAGES.forEach((_, i) => {
                timers.push(setTimeout(() => setActiveStage(i + 1), (i + 1) * 400));
            });

            prevCountRef.current = transactions.length;
            return () => timers.forEach(clearTimeout);
        }
    }, [transactions]);

    const getRiskColor = (label?: string) => {
        if (!label) return 'var(--text-muted)';
        switch (label) {
            case 'CRITICAL': return 'var(--critical)';
            case 'HIGH': return 'var(--danger)';
            case 'MEDIUM': return 'var(--warning)';
            default: return 'var(--success)';
        }
    };

    const getRiskBg = (label?: string) => {
        if (!label) return 'transparent';
        switch (label) {
            case 'CRITICAL': return 'rgba(139,92,246,0.12)';
            case 'HIGH': return 'rgba(239,68,68,0.12)';
            case 'MEDIUM': return 'rgba(245,158,11,0.12)';
            default: return 'rgba(16,185,129,0.12)';
        }
    };

    return (
        <div className="card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-4"
                style={{ color: 'var(--text-secondary)' }}>
                Payment Tracking
            </h3>

            {!latestTx ? (
                <div className="text-center py-6 text-sm" style={{ color: 'var(--text-muted)' }}>
                    <CreditCard className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    Waiting for transaction…
                </div>
            ) : (
                <>
                    {/* Mini Card Preview */}
                    <div className="terminal-block px-4 py-3 mb-4 flex items-center gap-3">
                        <div className="w-10 h-7 rounded bg-gradient-brand flex items-center justify-center flex-shrink-0">
                            <CreditCard className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-mono text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                                {latestTx.id.slice(0, 16)}…
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                                    ₹{(latestTx.amount / 100).toLocaleString()}
                                </span>
                                <ArrowRight className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {latestTx.merchant_id}
                                </span>
                            </div>
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{
                                color: getRiskColor(latestTx.fraud_label),
                                background: getRiskBg(latestTx.fraud_label),
                            }}>
                            {latestTx.fraud_label}
                        </span>
                    </div>

                    {/* Vertical Pipeline */}
                    <div className="relative pl-5">
                        <div className="absolute left-[9px] top-2 bottom-2 w-[2px] rounded-full overflow-hidden"
                            style={{ background: 'var(--border)' }}>
                            <div className="w-full bg-gradient-to-b from-[var(--accent-indigo)] to-[var(--accent-cyan)] transition-all duration-500 ease-out rounded-full"
                                style={{ height: `${(activeStage / STAGES.length) * 100}%` }} />
                        </div>

                        {STAGES.map((stage, i) => {
                            const isComplete = activeStage > i;
                            const isActive = activeStage === i + 1;
                            const isFuture = activeStage <= i;

                            return (
                                <div key={stage.id} className="relative flex items-start gap-3 pb-4 last:pb-0">
                                    <div className="relative z-10 flex-shrink-0">
                                        {isComplete ? (
                                            <CheckCircle2 className="w-5 h-5 animate-scaleIn" style={{ color: 'var(--accent-cyan)' }} />
                                        ) : isActive ? (
                                            <div className="w-5 h-5 rounded-full animate-pulseGlow flex items-center justify-center"
                                                style={{ background: 'var(--accent-indigo)' }}>
                                                <div className="w-2 h-2 rounded-full bg-white" />
                                            </div>
                                        ) : (
                                            <Circle className="w-5 h-5" style={{ color: 'var(--border)' }} />
                                        )}
                                    </div>
                                    <div className={`transition-all duration-300 ${isFuture ? 'opacity-40' : ''}`}>
                                        <div className="text-sm font-medium"
                                            style={{ color: isActive ? 'var(--accent-cyan)' : isComplete ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                            {stage.label}
                                        </div>
                                        <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                            {stage.desc}
                                        </div>
                                    </div>
                                    {isComplete && i === STAGES.length - 1 && (
                                        <div className="ml-auto text-xs font-mono animate-fadeIn" style={{ color: 'var(--accent-cyan)' }}>
                                            {latestTx.latency_ms}ms
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
