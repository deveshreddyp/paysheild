import { useState, useEffect } from 'react';
import { Transaction } from '../types/transaction';

interface LatencyStats {
    p50: number;
    p95: number;
    p99: number;
    updatedAt: string;
    time: string;
}

export function useLatencyStats(transactions: Transaction[]) {
    const [stats, setStats] = useState<LatencyStats>({ p50: 0, p95: 0, p99: 0, updatedAt: new Date().toISOString(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) });
    const [history, setHistory] = useState<LatencyStats[]>([]);

    useEffect(() => {
        // We update stats every 5 seconds
        const interval = setInterval(() => {
            // 5 minute sliding window filter
            const now = new Date().getTime();
            const fiveMinsAgo = now - 5 * 60 * 1000;

            const recentLatencies = transactions
                .filter(t => new Date(t.timestamp).getTime() > fiveMinsAgo)
                .map(t => t.latency_ms)
                .sort((a, b) => a - b);

            if (recentLatencies.length > 0) {
                const p50Index = Math.floor(recentLatencies.length * 0.50);
                const p95Index = Math.floor(recentLatencies.length * 0.95);
                const p99Index = Math.floor(recentLatencies.length * 0.99);

                const newStat = {
                    p50: recentLatencies[p50Index],
                    p95: recentLatencies[p95Index],
                    p99: recentLatencies[p99Index],
                    updatedAt: new Date().toISOString(),
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                };

                setStats(newStat);
                setHistory(prev => {
                    const updated = [...prev, newStat];
                    // Keep up to 60 points for the chart (5 mins of 5s intervals = 60 points)
                    return updated.slice(-60);
                });
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [transactions]);

    return { current: stats, history };
}
