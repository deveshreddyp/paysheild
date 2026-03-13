'use client';

import { Transaction } from '../types/transaction';
import { RefreshCw, Minus, Plus } from 'lucide-react';
import { useState } from 'react';

interface Props {
    transactions: Transaction[];
}

export function RiskPipeline({ transactions }: Props) {
    const [dotCount, setDotCount] = useState(20);

    const lastN = transactions.slice(0, dotCount);

    const getDotStyle = (tx: Transaction) => {
        switch (tx.fraud_label) {
            case 'CRITICAL': return { size: 'w-4 h-4', bg: 'bg-danger' };
            case 'HIGH': return { size: 'w-3.5 h-3.5', bg: 'bg-warning' };
            case 'MEDIUM': return { size: 'w-3 h-3', bg: 'bg-yellow-400' };
            default: return { size: 'w-3 h-3', bg: 'bg-success' };
        }
    };

    const decrease = () => setDotCount(prev => Math.max(10, prev - 5));
    const increase = () => setDotCount(prev => Math.min(50, prev + 5));

    return (
        <div className="card p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-secondary)' }}>
                    Risk Pipeline
                </h3>
                <div className="flex items-center gap-2">
                    <RefreshCw className="w-3 h-3 animate-spin"
                        style={{ color: 'var(--text-muted)', animationDuration: '3s' }} />
                    <span className="badge-live badge">● LIVE</span>
                </div>
            </div>

            {/* Range Selector */}
            <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                    Showing last <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{dotCount}</span> transactions
                </span>
                <div className="flex items-center gap-1">
                    <button onClick={decrease}
                        disabled={dotCount <= 10}
                        className="w-6 h-6 rounded-md flex items-center justify-center border transition-all disabled:opacity-30"
                        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                        <Minus className="w-3 h-3" />
                    </button>
                    {/* Mini range indicator */}
                    <div className="w-20 h-1.5 rounded-full overflow-hidden mx-1" style={{ background: 'var(--bg-secondary)' }}>
                        <div className="h-full rounded-full transition-all duration-300"
                            style={{
                                width: `${((dotCount - 10) / 40) * 100}%`,
                                background: 'var(--accent-indigo)',
                            }} />
                    </div>
                    <button onClick={increase}
                        disabled={dotCount >= 50}
                        className="w-6 h-6 rounded-md flex items-center justify-center border transition-all disabled:opacity-30"
                        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                        <Plus className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Dot Grid */}
            <div className="flex flex-wrap gap-2 justify-start">
                {Array.from({ length: dotCount }).map((_, i) => {
                    const tx = lastN[i];
                    if (!tx) {
                        return (
                            <div key={`empty-${i}`} className="w-3 h-3 rounded-full opacity-20"
                                style={{ background: 'var(--border)' }} />
                        );
                    }
                    const dot = getDotStyle(tx);
                    return (
                        <div key={tx.id}
                            className={`rounded-full ${dot.size} ${dot.bg} transition-all duration-300 animate-scaleIn cursor-default`}
                            style={{ animationDelay: `${i * 30}ms` }}
                            title={`${tx.id.slice(0, 12)} — ${tx.fraud_label} (${tx.fraud_score.toFixed(2)})`}
                        />
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> Low</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Med</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning" /> High</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-danger" /> Critical</span>
            </div>
        </div>
    );
}
