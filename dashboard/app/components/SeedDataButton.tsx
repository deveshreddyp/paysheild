'use client';

import { useState } from 'react';
import { Database, Loader2 } from 'lucide-react';

export function SeedDataButton() {
    const [isLoading, setIsLoading] = useState(false);

    const handleSeed = async () => {
        setIsLoading(true);
        try {
            const apiBase = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3000';
            const response = await fetch(`${apiBase}/api/v1/payment/seed`, {
                method: 'POST',
            });
            
            if (!response.ok) {
                console.error('[SeedDataButton] Failed to trigger seed:', await response.text());
            }
        } catch (error) {
            console.error('[SeedDataButton] Request error:', error);
        } finally {
            // Give it a small visual delay so the user sees the button spin
            setTimeout(() => setIsLoading(false), 2000);
        }
    };

    return (
        <button
            onClick={handleSeed}
            disabled={isLoading}
            className={`btn-secondary text-[11px] font-bold px-3 py-1.5 h-8 gap-1.5 
                ${isLoading ? 'opacity-80 pointer-events-none' : ''}`}
            title="Inject 25 Transactions (Live Stream)"
        >
            {isLoading ? (
                <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Seeding...
                </>
            ) : (
                <>
                    <Database className="w-3.5 h-3.5" />
                    Seed Data 🚀
                </>
            )}
        </button>
    );
}
