'use client';

import { Transaction } from '../types/transaction';
import { TrendingUp, AlertOctagon, Zap, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
    transactions: Transaction[];
    latency: { p50: number; p95: number; p99: number; updatedAt: string };
}

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        const duration = 600;
        const start = display;
        const diff = value - start;
        if (diff === 0) return;
        const startTime = performance.now();
        const tick = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(start + diff * eased));
            if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }, [value]);
    return <span className="animate-countUp">{display}{suffix}</span>;
}

export function StatsPanel({ transactions, latency }: Props) {
    const total = transactions.length;
    const fraudCount = transactions.filter(t => t.status === 'FRAUD_FLAGGED').length;
    const criticalCount = transactions.filter(t => t.fraud_label === 'CRITICAL' || t.fraud_label === 'HIGH').length;
    const fraudPct = total > 0 ? ((fraudCount / total) * 100).toFixed(1) : '0.0';
    const p95Val = Math.round(latency.p95);

    const stats = [
        {
            label: 'Total Transactions',
            value: total,
            subtitle: `↑ ${total > 0 ? '12.5' : '0'}%`,
            icon: TrendingUp,
            cardClass: 'stat-card-1',
            iconBg: 'rgba(99, 102, 241, 0.15)',
            iconColor: 'var(--accent-indigo)',
            subtitleColor: 'var(--success)',
        },
        {
            label: 'Fraud Flagged',
            value: fraudCount,
            subtitle: `↓ (${fraudPct}%)`,
            icon: AlertOctagon,
            cardClass: 'stat-card-2',
            iconBg: 'rgba(239, 68, 68, 0.15)',
            iconColor: 'var(--danger)',
            subtitleColor: fraudCount > 0 ? 'var(--danger)' : 'var(--success)',
        },
        {
            label: 'Critical Alerts',
            value: criticalCount,
            subtitle: criticalCount > 0 ? 'Active now' : 'None active',
            icon: ShieldAlert,
            cardClass: 'stat-card-3',
            iconBg: 'rgba(245, 158, 11, 0.15)',
            iconColor: 'var(--warning)',
            subtitleColor: 'var(--text-muted)',
        },
        {
            label: 'Latency (P95)',
            value: p95Val,
            suffix: ' ms',
            subtitle: p95Val < 500 ? 'Optimal' : 'Above SLA',
            icon: Zap,
            cardClass: 'stat-card-4',
            iconBg: 'rgba(16, 185, 129, 0.15)',
            iconColor: 'var(--success)',
            subtitleColor: p95Val < 500 ? 'var(--success)' : 'var(--danger)',
        },
    ];

    return (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 stagger-children">
            {stats.map(s => (
                <div key={s.label} className={`stat-card ${s.cardClass}`}>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wider"
                            style={{ color: 'var(--text-muted)' }}>
                            {s.label}
                        </span>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: s.iconBg }}>
                            <s.icon className="w-4 h-4" style={{ color: s.iconColor }} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                            <AnimatedCounter value={s.value} />
                        </span>
                        {s.suffix && (
                            <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                                {s.suffix}
                            </span>
                        )}
                    </div>
                    <span className="text-xs font-medium mt-1 block" style={{ color: s.subtitleColor }}>
                        {s.subtitle}
                    </span>
                </div>
            ))}
        </div>
    );
}
