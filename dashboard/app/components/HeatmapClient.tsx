'use client';

import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Transaction } from '../types/transaction';
import { useEffect, useState, useMemo } from 'react';
import { Globe, AlertTriangle } from 'lucide-react';

const countryCoords: Record<string, [number, number]> = {
    'US': [37.09, -95.71], 'IN': [20.59, 78.96], 'GB': [55.38, -3.44],
    'AU': [-25.27, 133.78], 'SG': [1.35, 103.82], 'AE': [23.42, 53.85],
    'JP': [36.20, 138.25], 'DE': [51.17, 10.45], 'FR': [46.60, 1.89],
    'BR': [-14.24, -51.93], 'CA': [56.13, -106.35], 'RU': [61.52, 105.32],
};

const riskConfig: Record<string, { color: string; radius: number; opacity: number }> = {
    LOW: { color: '#10B981', radius: 3, opacity: 0.4 },
    MEDIUM: { color: '#F59E0B', radius: 5, opacity: 0.5 },
    HIGH: { color: '#EF4444', radius: 7, opacity: 0.6 },
    CRITICAL: { color: '#8B5CF6', radius: 10, opacity: 0.8 },
};

interface Props {
    transactions: Transaction[];
}

export default function HeatmapClient({ transactions }: Props) {
    const [markers, setMarkers] = useState<(Transaction & { coord: [number, number] })[]>([]);

    useEffect(() => {
        const mapped = transactions
            .slice(0, 100)
            .map(t => {
                let coord: [number, number] = [0, 0];
                if (!t.geo) return { ...t, coord: [0, 0] as [number, number] };
                if (t.geo.lat && t.geo.lng) {
                    coord = [t.geo.lat, t.geo.lng];
                } else if (t.geo.country && countryCoords[t.geo.country]) {
                    const base = countryCoords[t.geo.country];
                    coord = [
                        base[0] + (Math.random() - 0.5) * 3,
                        base[1] + (Math.random() - 0.5) * 3,
                    ];
                }
                return { ...t, coord };
            })
            .filter(t => t.coord[0] !== 0);
        setMarkers(mapped);
    }, [transactions]);

    // Country threat counts
    const countryCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        markers.forEach(m => {
            const c = m.geo?.country || 'Unknown';
            counts[c] = (counts[c] || 0) + 1;
        });
        return Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 4);
    }, [markers]);

    return (
        <div className="gradient-border rounded-xl overflow-hidden relative z-0">
            <div className="w-full h-[340px] relative">
                <MapContainer
                    center={[20, 30]}
                    zoom={2}
                    style={{ height: '100%', width: '100%', background: 'var(--bg-primary)' }}
                    zoomControl={false}
                    attributionControl={false}
                >
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png" />

                    {markers.map((tx) => {
                        const cfg = riskConfig[tx.fraud_label] || riskConfig.MEDIUM;
                        return (
                            <CircleMarker
                                key={tx.id}
                                center={tx.coord}
                                radius={cfg.radius}
                                pathOptions={{
                                    color: cfg.color,
                                    fillColor: cfg.color,
                                    fillOpacity: cfg.opacity,
                                    weight: tx.fraud_label === 'CRITICAL' ? 2 : 0,
                                }}
                            >
                                <Popup>
                                    <div className="text-xs space-y-1.5 min-w-[160px]">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold" style={{ color: cfg.color }}>{tx.fraud_label}</span>
                                            <span className="font-mono text-[10px] opacity-70">{tx.fraud_score.toFixed(3)}</span>
                                        </div>
                                        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                                            <div className="h-full rounded-full" style={{ width: `${tx.fraud_score * 100}%`, background: cfg.color }} />
                                        </div>
                                        <div className="flex justify-between text-[11px]">
                                            <span>₹{(tx.amount / 100).toLocaleString()}</span>
                                            <span className="opacity-70">{tx.geo.country}</span>
                                        </div>
                                        {tx.triggered_rules.length > 0 && (
                                            <div className="text-[10px] opacity-60 font-mono pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                                                Rules: {tx.triggered_rules.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                </Popup>
                            </CircleMarker>
                        );
                    })}

                    {/* Threat Vectors for HIGH/CRITICAL */}
                    {markers.filter(t => t.fraud_label === 'CRITICAL' || t.fraud_label === 'HIGH').map((tx) => (
                        <Polyline
                            key={`line-${tx.id}`}
                            positions={[tx.coord, [20.59, 78.96]]} // Destination: India (Central Server)
                            pathOptions={{
                                color: riskConfig[tx.fraud_label].color,
                                weight: 1.5,
                                opacity: 0.4,
                                className: 'map-vector'
                            }}
                        />
                    ))}
                </MapContainer>

                {/* Country Stats Overlay */}
                {countryCounts.length > 0 && (
                    <div className="absolute top-3 left-3 glass rounded-lg px-3 py-2 z-[1000] flex items-center gap-3">
                        <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0" />
                        {countryCounts.map(([country, count]) => (
                            <div key={country} className="flex items-center gap-1 text-[10px]">
                                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{country}</span>
                                <span className="text-danger font-mono">{count}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Legend */}
                <div className="absolute bottom-3 right-3 glass rounded-lg p-2.5 z-[1000] flex flex-col gap-1.5 text-[10px]">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-critical animate-pulse" /><span>Critical</span></div>
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-danger" /><span>High</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-warning" /><span>Medium</span></div>
                </div>

                {/* Total count */}
                <div className="absolute top-3 right-3 glass rounded-lg px-3 py-1.5 z-[1000] flex items-center gap-1.5 text-[10px]">
                    <Globe className="w-3 h-3 text-accent-cyan" />
                    <span className="font-mono text-accent-cyan font-bold">{markers.length}</span>
                    <span className="text-text-muted">threats</span>
                </div>
            </div>
        </div>
    );
}
