'use client';

import { Transaction } from '../types/transaction';
import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Search, ChevronRight, CreditCard, CheckCircle2, XCircle, Gauge } from 'lucide-react';

interface Props {
    transactions: Transaction[];
}

const SPEEDS = [
    { label: '0.5x', ms: 1600 },
    { label: '1x', ms: 800 },
    { label: '2x', ms: 400 },
];

export function ReplayEngine({ transactions }: Props) {
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speedIdx, setSpeedIdx] = useState(1);
    const [elapsed, setElapsed] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const elapsedRef = useRef<NodeJS.Timeout | null>(null);

    const filtered = transactions
        .filter(t => {
            const term = searchTerm.trim().toLowerCase();
            if (!term) return true;
            return t.id.toLowerCase().includes(term) || (t.amount / 100).toString().includes(term);
        })
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 30);

    // Step timer
    useEffect(() => {
        if (isPlaying) {
            elapsedRef.current = setInterval(() => setElapsed(e => e + 100), 100);
        } else if (elapsedRef.current) {
            clearInterval(elapsedRef.current);
        }
        return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
    }, [isPlaying]);

    // Auto-advance steps
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isPlaying && currentStep < 6) {
            timer = setTimeout(() => setCurrentStep(s => s + 1), SPEEDS[speedIdx].ms);
        } else if (currentStep >= 6) {
            setIsPlaying(false);
        }
        return () => clearTimeout(timer);
    }, [isPlaying, currentStep, speedIdx]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [currentStep]);

    const startReplay = () => { setCurrentStep(1); setIsPlaying(true); setElapsed(0); };
    const togglePause = () => setIsPlaying(p => !p);
    const resetReplay = () => { setCurrentStep(0); setIsPlaying(false); setElapsed(0); };

    const selectTx = (tx: Transaction) => { setSelectedTx(tx); resetReplay(); setSearchTerm(''); };

    const stepLabels = ['Received', 'Validate', 'Fraud Req', 'Fraud Res', 'Decision', 'Complete'];

    return (
        <div className="card overflow-hidden flex flex-col" style={{ maxHeight: '520px' }}>
            {/* Header */}
            <div className="p-3 border-b flex items-center justify-between gap-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Play className="w-3.5 h-3.5 text-accent-indigo" />
                    Replay Engine
                </h3>

                {selectedTx && (
                    <button onClick={() => { setSelectedTx(null); resetReplay(); }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors hover:bg-bg-elevated"
                        style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        ← Back to list
                    </button>
                )}
            </div>

            {/* Body */}
            <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto custom-scrollbar" style={{ background: 'var(--bg-card)' }}>
                {!selectedTx ? (
                    /* ── Transaction List ── */
                    <div className="flex flex-col gap-2">
                        {/* Search filter */}
                        <div className="relative mb-2">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                className="w-full pl-8 pr-3 py-2 border rounded-lg text-xs focus:outline-none transition-colors"
                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                                placeholder="Filter by ID or amount…"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {filtered.length === 0 ? (
                            <div className="py-8 flex flex-col items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
                                <Search className="w-6 h-6 mb-2 opacity-30" />
                                <p>No transactions yet</p>
                                <p className="text-[10px] mt-1">Run the seed script or click TEST TAMPER</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1">
                                {filtered.map(tx => (
                                    <button key={tx.id} onClick={() => selectTx(tx)}
                                        className="w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all duration-200 flex items-center justify-between gap-2 group"
                                        style={{
                                            background: tx.tampered ? 'rgba(239,68,68,0.08)' : 'var(--bg-secondary)',
                                            border: tx.tampered ? '1px solid rgba(239,68,68,0.3)' : '1px solid var(--border)',
                                        }}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            {/* Status dot */}
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                                tx.tampered ? 'bg-danger animate-pulse' :
                                                tx.status === 'FRAUD_FLAGGED' ? 'bg-danger' :
                                                tx.status === 'RATE_LIMITED' ? 'bg-warning' : 'bg-success'
                                            }`} />
                                            <span className="font-mono truncate w-20" style={{ color: 'var(--text-muted)' }}>
                                                {tx.id.slice(0, 10)}…
                                            </span>
                                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                                ₹{(tx.amount / 100).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {tx.tampered && (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-danger text-white animate-pulse">
                                                    TAMPERED
                                                </span>
                                            )}
                                            <span className={`text-[10px] font-bold ${
                                                tx.status === 'FRAUD_FLAGGED' ? 'text-danger' :
                                                tx.status === 'RATE_LIMITED' ? 'text-warning' : 'text-success'
                                            }`}>
                                                {tx.status === 'FRAUD_FLAGGED' ? 'BLOCKED' :
                                                 tx.status === 'RATE_LIMITED' ? 'RATE_LTD' : 'OK'}
                                            </span>
                                            <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-1">
                        {/* Step Progress */}
                        <div className="flex items-center gap-1 mb-5 px-2">
                            {stepLabels.map((label, i) => (
                                <div key={i} className="flex items-center flex-1">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300
                                        ${i + 1 < currentStep ? 'bg-accent-cyan text-bg-primary' :
                                            i + 1 === currentStep ? 'bg-accent-indigo text-white animate-pulseGlow' :
                                                'bg-bg-terminal text-text-muted border border-border-subtle'}`}>
                                        {i + 1 < currentStep ? '✓' : i + 1}
                                    </div>
                                    {i < 5 && (
                                        <div className="flex-1 h-[2px] mx-1 bg-bg-terminal overflow-hidden rounded">
                                            <div className={`h-full transition-all duration-500 ${i + 1 < currentStep ? 'bg-accent-cyan w-full' : 'w-0'}`} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Controls bar */}
                        {currentStep > 0 && (
                            <div className="flex items-center justify-between mb-4 px-1">
                                <div className="flex items-center gap-2">
                                    {currentStep < 6 ? (
                                        <button onClick={togglePause}
                                            className="w-7 h-7 rounded-lg bg-accent-indigo/15 hover:bg-accent-indigo/25 flex items-center justify-center transition-colors">
                                            {isPlaying ? <Pause className="w-3.5 h-3.5 text-accent-indigo" /> : <Play className="w-3.5 h-3.5 text-accent-indigo" />}
                                        </button>
                                    ) : (
                                        <button onClick={resetReplay}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-terminal border border-border-subtle hover:bg-bg-elevated text-xs text-text-secondary transition-colors">
                                            <RotateCcw className="w-3 h-3" /> Replay
                                        </button>
                                    )}
                                    {/* Speed */}
                                    <div className="flex items-center bg-bg-terminal rounded-lg border border-border-subtle overflow-hidden">
                                        {SPEEDS.map((sp, i) => (
                                            <button key={sp.label} onClick={() => setSpeedIdx(i)}
                                                className={`px-2 py-1 text-[10px] font-mono transition-colors ${i === speedIdx ? 'bg-accent-indigo/20 text-accent-cyan' : 'text-text-muted hover:text-text-secondary'}`}>
                                                {sp.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="font-mono text-[11px] text-text-muted">{(elapsed / 1000).toFixed(1)}s</div>
                            </div>
                        )}

                        {/* Start Button */}
                        {currentStep === 0 && (
                            <div className="flex items-center justify-center py-10">
                                <button onClick={startReplay}
                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-brand hover:opacity-90 text-white rounded-xl font-medium text-sm transition-all shadow-lg glow-indigo">
                                    <Play className="w-4 h-4 fill-current" /> Start Replay
                                </button>
                            </div>
                        )}

                        {/* Step 1: Payment Card */}
                        {currentStep >= 1 && (
                            <div className="animate-slideUp mb-3">
                                <div className="text-[10px] text-accent-cyan font-mono mb-1.5">▸ STEP 1 — REQUEST RECEIVED</div>
                                <div className="terminal-block p-3 flex gap-3">
                                    {/* Mini Card */}
                                    <div className="w-32 h-20 rounded-lg bg-gradient-brand p-2.5 flex flex-col justify-between flex-shrink-0 glow-indigo">
                                        <div className="text-[9px] text-white/70 uppercase tracking-wide">PayShield</div>
                                        <div className="font-mono text-white text-xs tracking-widest">
                                            {selectedTx.card_bin || '4111'}** **** ****
                                        </div>
                                        <div className="flex justify-between text-[8px] text-white/60">
                                            <span>{selectedTx.geo.country}</span>
                                            <CreditCard className="w-3 h-3 text-white/60" />
                                        </div>
                                    </div>
                                    {/* Request details */}
                                    <div className="font-mono text-[11px] text-text-secondary flex-1 space-y-0.5">
                                        <div className="text-text-primary text-xs mb-1">POST /api/v1/payment/initiate</div>
                                        <div>amount: <span className="text-accent-cyan">₹{(selectedTx.amount / 100).toLocaleString()}</span></div>
                                        <div>merchant: <span className="text-text-muted">{selectedTx.merchant_id}</span></div>
                                        <div>geo: <span className="text-text-muted">{selectedTx.geo.country} ({selectedTx.geo.ip})</span></div>
                                        {selectedTx.tampered && (
                                            <div className="text-danger font-bold mt-1 bg-danger/10 px-1 inline-block rounded">
                                                [HEADER] X-Requestly-Modified: true
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Validation */}
                        {currentStep >= 2 && (
                            <div className="animate-slideUp mb-3">
                                <div className="text-[10px] text-accent-cyan font-mono mb-1.5">▸ STEP 2 — GATEWAY VALIDATION</div>
                                <div className="terminal-block p-3 space-y-1.5 font-mono text-xs">
                                    {[
                                        ['Schema Validation', 'PASS'], 
                                        ['Idempotency Check', 'MISS (New Key)'], 
                                        ['Rate Limit', 'OK (29 rem)'],
                                        ['Tamper Detection', selectedTx.tampered ? 'FAILED (Header Present)' : 'PASS']
                                    ].map(([k, v]) => (
                                        <div key={k as string} className="flex justify-between items-center">
                                            <span className="text-text-secondary">{k}</span>
                                            <span className={(v as string) === 'PASS' || (v as string)?.startsWith('OK') ? 'text-success' : 'text-danger font-bold animate-pulse'}>{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Step 3: Fraud Request */}
                        {currentStep >= 3 && (
                            <div className="animate-slideUp mb-3">
                                <div className="text-[10px] text-accent-cyan font-mono mb-1.5">▸ STEP 3 — FRAUD SCORE REQUEST</div>
                                <div className="terminal-block terminal-warning p-3 flex items-center gap-3 text-xs">
                                    {currentStep === 3 ? (
                                        <div className="w-4 h-4 rounded-full border-2 border-warning border-t-transparent animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                                    )}
                                    <span className="font-mono text-text-secondary">POST http://fraud:8000/fraud/score</span>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Fraud Response */}
                        {currentStep >= 4 && (
                            <div className="animate-slideUp mb-3">
                                <div className="text-[10px] text-accent-cyan font-mono mb-1.5">▸ STEP 4 — FRAUD ENGINE RESPONSE</div>
                                <div className={`terminal-block ${selectedTx.fraud_score >= 0.8 ? 'terminal-danger' : 'terminal-success'} p-3`}>
                                    {/* Score bar */}
                                    <div className="flex justify-between text-xs mb-2">
                                        <span className="text-text-secondary flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5" /> Risk Score</span>
                                        <span className="font-mono font-bold text-text-primary">{selectedTx.fraud_score.toFixed(3)}</span>
                                    </div>
                                    <div className="h-2.5 w-full bg-bg-primary rounded-full overflow-hidden mb-3">
                                        <div className={`h-full rounded-full transition-all duration-1000 ease-out ${selectedTx.fraud_score >= 0.8 ? 'bg-gradient-danger' : selectedTx.fraud_score >= 0.6 ? 'bg-danger' : selectedTx.fraud_score >= 0.3 ? 'bg-warning' : 'bg-gradient-success'}`}
                                            style={{ width: `${Math.min(100, selectedTx.fraud_score * 100)}%` }} />
                                    </div>
                                    <div className="flex gap-3 items-start">
                                        <div>
                                            <div className="text-[10px] text-text-muted mb-0.5">Label</div>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold
                                                ${selectedTx.fraud_label === 'CRITICAL' ? 'bg-critical/15 text-critical animate-borderGlow border border-critical/30' :
                                                    selectedTx.fraud_label === 'HIGH' ? 'bg-danger/15 text-danger' :
                                                        selectedTx.fraud_label === 'MEDIUM' ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'}`}>
                                                {selectedTx.fraud_label}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-[10px] text-text-muted mb-0.5">Rules</div>
                                            <div className="flex flex-wrap gap-1">
                                                {selectedTx.triggered_rules.length === 0 ? <span className="text-[10px] text-text-muted">None</span> :
                                                    selectedTx.triggered_rules.map(r => (
                                                        <span key={r} className={`px-1.5 py-0.5 border rounded text-[10px] font-mono
                                                            ${r === 'TAMPER_DETECTED' || r === 'REQUESTLY_INTERCEPTION' ? 'bg-danger/20 border-danger text-danger font-bold' : 'bg-bg-terminal border-border-subtle text-text-muted'}`}>
                                                            {r}
                                                        </span>
                                                    ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 5: Decision */}
                        {currentStep >= 5 && (
                            <div className="animate-slideUp mb-3">
                                <div className="text-[10px] text-accent-cyan font-mono mb-1.5">▸ STEP 5 — GATEWAY DECISION</div>
                                <div className="terminal-block p-3 flex items-center justify-center gap-3 text-xs font-mono">
                                    <div className="bg-bg-terminal border border-border-subtle px-3 py-2 rounded-lg text-center">
                                        Score: {selectedTx.fraud_score.toFixed(2)}
                                    </div>
                                    <ChevronRight className="text-text-muted w-4 h-4" />
                                    <div className="bg-bg-terminal border border-border-subtle px-3 py-2 rounded-lg text-center text-text-muted">
                                        Threshold<br /><span className="text-text-secondary">≥ 0.8 Block</span>
                                    </div>
                                    <ChevronRight className="text-text-muted w-4 h-4" />
                                    <div className={`px-3 py-2 rounded-lg text-center font-bold text-white ${selectedTx.status === 'FRAUD_FLAGGED'
                                        ? 'bg-danger/80 border border-danger glow-danger' : 'bg-success/80 border border-success glow-cyan'}`}>
                                        {selectedTx.status === 'FRAUD_FLAGGED' ? (
                                            <span className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> BLOCK 402</span>
                                        ) : (
                                            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> ALLOW 200</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 6: Complete */}
                        {currentStep >= 6 && (
                            <div className="animate-slideUp mb-3">
                                <div className="text-[10px] text-accent-cyan font-mono mb-1.5">▸ STEP 6 — RESPONSE SENT</div>
                                <div className={`terminal-block ${selectedTx.status === 'FRAUD_FLAGGED' ? 'terminal-danger' : 'terminal-success'} p-4 flex justify-between items-center`}>
                                    <div>
                                        <div className="text-[10px] text-text-muted mb-0.5">HTTP Status</div>
                                        <div className={`text-3xl font-bold font-mono ${selectedTx.http_code === 200 ? 'text-success' : 'text-danger'}`}>
                                            {selectedTx.http_code}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-text-muted mb-0.5">Total Latency</div>
                                        <div className="text-2xl font-mono text-accent-cyan">{selectedTx.latency_ms}<span className="text-sm text-text-muted ml-1">ms</span></div>
                                    </div>
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${selectedTx.status === 'FRAUD_FLAGGED' ? 'bg-danger/15 glow-danger' : 'bg-success/15 glow-cyan'}`}>
                                        {selectedTx.status === 'FRAUD_FLAGGED'
                                            ? <XCircle className="w-6 h-6 text-danger" />
                                            : <CheckCircle2 className="w-6 h-6 text-success" />}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
