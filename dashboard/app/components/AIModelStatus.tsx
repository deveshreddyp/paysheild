'use client';

import { Transaction } from '../types/transaction';
import { Cpu, HardDrive, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
    transactions: Transaction[];
}

export function AIModelStatus({ transactions }: Props) {
    const [accuracy, setAccuracy] = useState(99.982);
    const total = transactions.length;
    const avgLatency = total > 0
        ? Math.round(transactions.reduce((s, t) => s + t.latency_ms, 0) / total)
        : 0;

    // Simulate slight accuracy variation
    useEffect(() => {
        if (total > 0) {
            setAccuracy(99.95 + Math.random() * 0.04);
        }
    }, [total]);

    const rows = [
        { label: 'Model Version', value: 'v2.4.1-STABLE', color: 'var(--accent-indigo)' },
        { label: 'Accuracy', value: `${accuracy.toFixed(3)}%`, color: 'var(--success)' },
        { label: 'Inference Time', value: `${avgLatency || 12}ms`, color: 'var(--text-primary)', bold: true },
        { label: 'Engine Status', value: '● OPERATIONAL', color: 'var(--success)' },
    ];

    return (
        <div className="card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
                AI Model Status
            </h3>
            <div className="space-y-3">
                {rows.map(row => (
                    <div key={row.label} className="flex items-center justify-between text-sm">
                        <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                        <span className={`font-mono text-xs ${row.bold ? 'font-bold' : 'font-semibold'}`}
                            style={{ color: row.color }}>
                            {row.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function EngineHealth({ transactions }: Props) {
    const total = transactions.length;
    const cpuLoad = Math.min(95, 8 + total * 0.3);
    const memUsed = 1.8 + total * 0.02;
    const memTotal = 16;
    const netIO = 120 + total * 4;

    const metrics = [
        {
            label: 'CPU Load',
            value: `${cpuLoad.toFixed(0)}%`,
            percent: cpuLoad,
            color: cpuLoad > 80 ? 'var(--danger)' : cpuLoad > 50 ? 'var(--warning)' : 'var(--success)',
            icon: Cpu,
        },
        {
            label: 'Memory',
            value: `${memUsed.toFixed(1)} GB / ${memTotal} GB`,
            percent: (memUsed / memTotal) * 100,
            color: 'var(--accent-blue)',
            icon: HardDrive,
        },
        {
            label: 'Network I/O',
            value: `${Math.round(netIO)} Mbps`,
            percent: Math.min(100, (netIO / 1000) * 100),
            color: 'var(--accent-cyan)',
            icon: Wifi,
        },
    ];

    return (
        <div className="card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
                Engine Health
            </h3>
            <div className="space-y-4">
                {metrics.map(m => (
                    <div key={m.label}>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                                <m.icon className="w-3.5 h-3.5" />
                                {m.label}
                            </span>
                            <span className="font-mono text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {m.value}
                            </span>
                        </div>
                        <div className="progress-bar">
                            <div className="progress-bar-fill"
                                style={{ width: `${m.percent}%`, background: m.color }} />
                        </div>
                    </div>
                ))}
            </div>

            <button className="w-full mt-5 py-2.5 rounded-lg text-white text-xs font-bold uppercase tracking-wider transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}>
                Initialize Forensic Scan
            </button>
        </div>
    );
}
