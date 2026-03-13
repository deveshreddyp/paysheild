'use client';

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine, Tooltip } from 'recharts';
import { Clock } from 'lucide-react';

interface Props {
    history: Array<{ time: string; p50: number; p95: number; p99: number }>;
}

export function LatencyChart({ history }: Props) {
    return (
        <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"
                    style={{ color: 'var(--text-secondary)' }}>
                    <Clock className="w-3.5 h-3.5" />
                    System Latency (SLA: 500ms)
                </h3>
                <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-indigo)' }} /> P50
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ background: 'var(--warning)' }} /> P95
                    </span>
                </div>
            </div>

            {history.length === 0 ? (
                <div className="h-[140px] flex items-center justify-center text-xs" style={{ color: 'var(--text-muted)' }}>
                    Waiting for latency data…
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={140}>
                    <AreaChart data={history} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="gradP50" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366F1" stopOpacity={0.25} />
                                <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gradP95" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.15} />
                                <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" strokeOpacity={0.5} />
                        <XAxis dataKey="time"
                            tick={{ fontSize: 9, fill: 'var(--chart-label)' }}
                            axisLine={false} tickLine={false} />
                        <YAxis
                            tick={{ fontSize: 9, fill: 'var(--chart-label)' }}
                            axisLine={false} tickLine={false} />
                        <Tooltip
                            contentStyle={{
                                background: 'var(--tooltip-bg)',
                                border: '1px solid var(--tooltip-border)',
                                borderRadius: 8,
                                fontSize: 11,
                                color: 'var(--text-primary)',
                            }}
                            labelStyle={{ color: 'var(--text-secondary)' }}
                        />
                        <ReferenceLine y={500} stroke="#EF4444" strokeDasharray="5 5" strokeOpacity={0.5}
                            label={{ value: 'SLA', position: 'right', fill: '#EF4444', fontSize: 9 }} />
                        <Area type="monotone" dataKey="p50" stroke="#6366F1" fill="url(#gradP50)" strokeWidth={2} dot={false} />
                        <Area type="monotone" dataKey="p95" stroke="#F59E0B" fill="url(#gradP95)" strokeWidth={1.5} dot={false} />
                        <Area type="monotone" dataKey="p99" stroke="#EF4444" fill="transparent" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}
