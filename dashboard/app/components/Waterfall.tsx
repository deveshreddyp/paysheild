'use client';

import { Transaction } from '../types/transaction';
import { useState } from 'react';
import { ChevronDown, ChevronUp, Shield, AlertTriangle, Clock, MapPin, Search, Download, Activity } from 'lucide-react';

interface Props {
    transactions: Transaction[];
}

const statusBadge = (status: string) => {
    switch (status) {
        case 'SUCCESS': return { class: 'badge-approved', icon: '✓', label: 'APPROVED' };
        case 'FRAUD_FLAGGED': return { class: 'badge-rejected', icon: '⛔', label: 'REJECTED' };
        case 'RATE_LIMITED': return { class: 'badge-throttled', icon: '⚠', label: 'THROTTLED' };
        case 'VALIDATION_FAILED': return { class: 'badge-rejected', icon: '✕', label: 'REJECTED' };
        case 'TIMEOUT': return { class: 'badge-timeout', icon: '⏱', label: 'TIMEOUT' };
        default: return { class: 'badge-approved', icon: '✓', label: 'APPROVED' };
    }
};

const riskBarClass = (label: string) => {
    switch (label) {
        case 'CRITICAL': return 'critical';
        case 'HIGH': return 'high';
        case 'MEDIUM': return 'medium';
        default: return 'low';
    }
};

export function Waterfall({ transactions }: Props) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filtered = searchQuery
        ? transactions.filter(t =>
            t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.merchant_id.toLowerCase().includes(searchQuery.toLowerCase()))
        : transactions;

    const exportCSV = () => {
        const header = 'ID,Amount,Merchant,Fraud Score,Status,Latency,Time\n';
        const rows = transactions.map(t =>
            `${t.id},${t.amount},${t.merchant_id},${t.fraud_score},${t.status},${t.latency_ms},${t.timestamp}`
        ).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'payshield_transactions.csv'; a.click();
    };

    return (
        <div className="h-full flex flex-col card overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Activity className="w-4 h-4" style={{ color: 'var(--accent-indigo)' }} />
                        Transaction Stream
                    </h3>
                    <span className="badge badge-live">● LIVE</span>
                    {transactions.length > 0 && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                            style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                            {transactions.length} total
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="h-8 pl-8 pr-3 text-xs rounded-lg border outline-none focus:ring-2 focus:ring-[var(--accent-indigo)]/30 transition-all"
                            style={{
                                background: 'var(--bg-input)',
                                borderColor: 'var(--border)',
                                color: 'var(--text-primary)',
                            }}
                        />
                    </div>
                    <button onClick={exportCSV}
                        className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors hover:opacity-80"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                        title="Export CSV">
                        <Download className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[0.4fr_0.8fr_0.6fr_0.6fr_1fr_0.7fr_0.5fr_0.6fr_0.3fr] gap-2 px-5 py-2.5 text-[10px] uppercase tracking-wider font-semibold border-b"
                style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                <span>#</span>
                <span>Transaction ID</span>
                <span>Amount</span>
                <span>Merchant</span>
                <span>Risk Score</span>
                <span>Status</span>
                <span>Latency</span>
                <span>Time</span>
                <span></span>
            </div>

            {/* Rows */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-16" style={{ color: 'var(--text-muted)' }}>
                        <Shield className="w-10 h-10 mb-4 opacity-30 animate-float" />
                        <p className="text-sm">{searchQuery ? 'No matching transactions' : 'Waiting for live transactions…'}</p>
                        {!searchQuery && <p className="text-xs mt-1 opacity-50">Run the seed script to generate traffic</p>}
                    </div>
                ) : (
                    filtered.map((tx, i) => {
                        const isExpanded = expandedId === tx.id;
                        const badge = statusBadge(tx.status);
                        const barClass = riskBarClass(tx.fraud_label);

                        return (
                            <div key={tx.id} className="animate-slideUp border-b last:border-0"
                                style={{ borderColor: 'var(--border)', animationDelay: `${Math.min(i * 20, 200)}ms` }}>
                                {/* Main Row */}
                                <button
                                    onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                                    className="w-full grid grid-cols-[0.4fr_0.8fr_0.6fr_0.6fr_1fr_0.7fr_0.5fr_0.6fr_0.3fr] gap-2 px-5 py-3 text-sm items-center transition-all duration-200 group cursor-pointer text-left hover:brightness-95 dark:hover:brightness-110"
                                    style={{ background: isExpanded ? 'var(--bg-secondary)' : 'transparent' }}
                                >
                                    {/* # */}
                                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                                        {String(i + 1).padStart(2, '0')}
                                    </span>

                                    {/* ID */}
                                    <span className="font-mono text-xs truncate transition-colors"
                                        style={{ color: tx.status === 'FRAUD_FLAGGED' ? 'var(--danger)' : 'var(--accent-indigo)' }}>
                                        {tx.id.slice(0, 14)}…
                                    </span>

                                    {/* Amount */}
                                    <span className="font-mono font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>
                                        ₹{(tx.amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>

                                    {/* Merchant */}
                                    <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                                        {tx.merchant_id}
                                    </span>

                                    {/* Risk Score Bar */}
                                    <div className="flex items-center gap-2">
                                        <div className="risk-bar flex-1">
                                            <div className={`risk-bar-fill ${barClass}`}
                                                style={{ width: `${Math.max(5, tx.fraud_score * 100)}%` }} />
                                        </div>
                                        <span className="font-mono text-[11px] font-semibold w-8 text-right"
                                            style={{ color: 'var(--text-secondary)' }}>
                                            {tx.fraud_score.toFixed(2)}
                                        </span>
                                    </div>

                                    {/* Status */}
                                    <span className={`badge ${badge.class}`}>
                                        {badge.icon} {badge.label}
                                    </span>

                                    {/* Latency */}
                                    <span className="font-mono text-xs"
                                        style={{
                                            color: tx.latency_ms > 500 ? 'var(--danger)' :
                                                tx.latency_ms > 200 ? 'var(--warning)' : 'var(--text-muted)'
                                        }}>
                                        {tx.latency_ms}ms
                                    </span>

                                    {/* Time */}
                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                        {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                                    </span>

                                    {/* Expand */}
                                    <span className="flex justify-center">
                                        {isExpanded
                                            ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                                            : <ChevronDown className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }} />
                                        }
                                    </span>
                                </button>

                                {/* Expanded Detail */}
                                {isExpanded && (
                                    <div className="animate-slideDown px-5 pb-4">
                                        <div className="terminal-block p-4 grid grid-cols-3 gap-4 text-xs">
                                            <div>
                                                <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Full ID</div>
                                                <div className="font-mono break-all" style={{ color: 'var(--accent-cyan)' }}>{tx.id}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Fraud Score</div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                                                        <div className={`h-full rounded-full transition-all duration-700 risk-bar-fill ${barClass}`}
                                                            style={{ width: `${tx.fraud_score * 100}%` }} />
                                                    </div>
                                                    <span className="font-mono font-bold">{tx.fraud_score.toFixed(3)}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] uppercase tracking-wide mb-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                                    <MapPin className="w-3 h-3" /> Geography
                                                </div>
                                                <div>{tx.geo.country} — {tx.geo.ip}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] uppercase tracking-wide mb-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                                    <AlertTriangle className="w-3 h-3" /> Triggered Rules
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {tx.triggered_rules.length === 0 ? <span style={{ color: 'var(--text-muted)' }}>None</span> :
                                                        tx.triggered_rules.map(r => (
                                                            <span key={r} className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                                                                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger)' }}>
                                                                {r}
                                                            </span>
                                                        ))
                                                    }
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] uppercase tracking-wide mb-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                                    <Clock className="w-3 h-3" /> Response Code
                                                </div>
                                                <span className="font-mono font-bold text-lg"
                                                    style={{ color: tx.http_code === 200 ? 'var(--success)' : 'var(--danger)' }}>
                                                    {tx.http_code}
                                                </span>
                                            </div>
                                            <div>
                                                <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Merchant</div>
                                                <div className="font-mono">{tx.merchant_id}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
