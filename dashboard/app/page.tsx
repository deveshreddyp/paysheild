'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useLatencyStats } from './hooks/useLatencyStats';
import { Waterfall } from './components/Waterfall';
import { StatsPanel } from './components/StatsPanel';
import { LatencyChart } from './components/LatencyChart';
import { ReplayEngine } from './components/ReplayEngine';
import { TamperAlert } from './components/TamperAlert';
import { TrackingStatus } from './components/TrackingStatus';
import { RiskPipeline } from './components/RiskPipeline';
import { AIModelStatus, EngineHealth } from './components/AIModelStatus';
import { RequestlyDemoButton } from './components/RequestlyDemoButton';
import { SeedDataButton } from './components/SeedDataButton';
import { Shield, Wifi, WifiOff, Sun, Moon, Bell, User, Activity } from 'lucide-react';

const Heatmap = dynamic(() => import('./components/HeatmapClient'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[360px] rounded-xl flex items-center justify-center card animate-shimmer"
            style={{ color: 'var(--text-muted)' }}>
            <Activity className="w-5 h-5 mr-2 animate-pulse" /> Loading Threat Map…
        </div>
    ),
});

export default function Dashboard() {
    const { transactions, isConnected, connectionStatus, tamperAlerts } = useWebSocket();
    const latency = useLatencyStats(transactions);
    const [isDark, setIsDark] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('payshield-theme');
            return saved ? saved === 'dark' : true;
        }
        return true;
    });
    const [activeTab, setActiveTab] = useState<'stream' | 'map' | 'replay'>('stream');

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('payshield-theme', isDark ? 'dark' : 'light');
    }, [isDark]);

    return (
        <div className="min-h-screen flex flex-col font-sans transition-colors duration-300"
            style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

            {/* Tamper Alert Banner */}
            <TamperAlert alerts={tamperAlerts} />

            {/* ── Header ── */}
            <header className="glass sticky top-0 z-50">
                <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
                    {/* Left: Logo + Branding */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center shadow-lg">
                                <Shield className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                                    PayShield
                                </h1>
                                <p className="text-[10px] font-medium uppercase tracking-wider flex items-center gap-1.5"
                                    style={{ color: 'var(--text-muted)' }}>
                                    Intelligence System
                                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                    <span style={{ color: 'var(--success)' }}>Live Monitoring</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right: Controls */}
                    <div className="flex items-center gap-3">
                        <SeedDataButton />
                        <RequestlyDemoButton />
                        <span className="badge-production badge">Production Cluster</span>

                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all duration-300
                            ${isConnected
                                ? 'border-[var(--success)]'
                                : 'border-[var(--danger)]'
                            }`}
                            style={{
                                background: isConnected ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                                color: isConnected ? 'var(--success)' : 'var(--danger)',
                                borderColor: isConnected ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
                            }}
                        >
                            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                            <span className="capitalize">{connectionStatus}</span>
                        </div>

                        {/* Theme Toggle */}
                        <button onClick={() => setIsDark(!isDark)} className="theme-toggle" title="Toggle theme">
                            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>

                        {/* Notifications */}
                        <div className="relative">
                            <button className="theme-toggle">
                                <Bell className="w-4 h-4" />
                            </button>
                            {transactions.filter(t => t.fraud_label === 'CRITICAL').length > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center">
                                    {transactions.filter(t => t.fraud_label === 'CRITICAL').length}
                                </span>
                            )}
                        </div>

                        {/* User Avatar */}
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                            <User className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Stats Cards ── */}
            <div className="max-w-[1600px] w-full mx-auto px-6 pt-5 pb-2">
                <StatsPanel transactions={transactions} latency={latency.current} />
            </div>

            {/* ── Main Content Grid ── */}
            <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-4 grid grid-cols-1 lg:grid-cols-12 gap-5">

                {/* Left: Transaction Stream / Map / Replay */}
                <section className="lg:col-span-8 flex flex-col gap-4 min-h-0" style={{ height: 'calc(100vh - 16rem)' }}>
                    {/* Tab Bar */}
                    <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                        {[
                            { key: 'stream', label: 'Transaction Stream', icon: Activity },
                            { key: 'map', label: 'Global Threat Map', icon: Shield },
                            { key: 'replay', label: 'Replay Engine', icon: Activity },
                        ].map(tab => (
                            <button key={tab.key}
                                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-md transition-all duration-200"
                                style={{
                                    background: activeTab === tab.key ? 'var(--bg-card)' : 'transparent',
                                    color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
                                    boxShadow: activeTab === tab.key ? 'var(--shadow-card)' : 'none',
                                }}
                            >
                                <tab.icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 min-h-0">
                        {activeTab === 'stream' && <Waterfall transactions={transactions} />}
                        {activeTab === 'map' && (
                            <div className="card p-0 h-full overflow-hidden">
                                <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                                    <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                        <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                                        Global Threat Origins
                                    </h3>
                                    <span className="badge badge-live">Real Time Stream</span>
                                </div>
                                <div className="h-[calc(100%-3rem)]">
                                    <Heatmap transactions={transactions} />
                                </div>
                            </div>
                        )}
                        {activeTab === 'replay' && <ReplayEngine transactions={transactions} />}
                    </div>
                </section>

                {/* Right: Analytics Sidebar */}
                <aside className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-1 pb-10 custom-scrollbar"
                    style={{ height: 'calc(100vh - 16rem)' }}>

                    {/* Risk Pipeline */}
                    <RiskPipeline transactions={transactions} />

                    {/* Latency Chart */}
                    <LatencyChart history={latency.history} />

                    {/* AI Model Status */}
                    <AIModelStatus transactions={transactions} />

                    {/* Engine Health */}
                    <EngineHealth transactions={transactions} />

                    {/* Payment Tracking */}
                    <TrackingStatus transactions={transactions} />
                </aside>
            </main>

            {/* ── Footer ── */}
            <footer className="py-3 px-6" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="max-w-[1600px] mx-auto flex items-center justify-between text-[10px]"
                    style={{ color: 'var(--text-muted)' }}>
                    <span>PayShield v2.4 — Hack-Nocturne 2.O</span>
                    <span className="font-mono">Gateway :3000 · Fraud :8000 · Dashboard :4000</span>
                </div>
            </footer>
        </div>
    );
}
