import { useState, useEffect, useRef, useCallback } from 'react';
import { Transaction, WsMessage, TamperAlert } from '../types/transaction';

interface UseWebSocketReturn {
    transactions: Transaction[];
    isConnected: boolean;
    connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
    lastMessage: WsMessage | null;
    tamperAlerts: TamperAlert[];
}

export function useWebSocket(): UseWebSocketReturn {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);
    const [tamperAlerts, setTamperAlerts] = useState<TamperAlert[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting'>('disconnected');

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
    const reconnectAttemptsRef = useRef(0);
    const MAX_RECONNECT_DELAY = 30000;

    const connect = useCallback(() => {
        try {
            setConnectionStatus(reconnectAttemptsRef.current ? 'reconnecting' : 'connecting');
            const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000/ws';
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                setConnectionStatus('connected');
                reconnectAttemptsRef.current = 0; // reset
                console.log('WebSocket Connected');
            };

            ws.onmessage = (event) => {
                try {
                    const message: WsMessage = JSON.parse(event.data);
                    setLastMessage(message);

                    if (message.event === 'transaction') {
                        const rawData = message.data;
                        // Map the transaction_id to our local id prop for ui rendering logic
                        const newTx: Transaction = {
                            ...rawData,
                            id: rawData.transaction_id,
                        };

                        setTransactions(prev => {
                            // Add to top, keep last 500
                            const updated = [newTx, ...prev];
                            return updated.length > 500 ? updated.slice(0, 500) : updated;
                        });
                    } else if (message.event === 'tamper_detected') {
                        setTamperAlerts(prev => {
                            const updated = [message.data, ...prev];
                            return updated.length > 10 ? updated.slice(0, 10) : updated; // keep 10 alerts
                        });
                    }
                } catch (err) {
                    console.error('Failed to parse WS message', err);
                }
            };

            ws.onclose = () => {
                setConnectionStatus('disconnected');
                wsRef.current = null;

                // Exponential backoff reconnect
                const attempt = reconnectAttemptsRef.current;
                const delay = Math.min(Math.pow(2, attempt) * 1000, MAX_RECONNECT_DELAY);
                reconnectAttemptsRef.current += 1;

                console.log(`WebSocket Disconnected. Reconnecting in ${delay}ms... (Attempt ${attempt + 1})`);
                reconnectTimeoutRef.current = setTimeout(connect, delay);
            };

            ws.onerror = (error) => {
                console.error('WebSocket Error', error);
                ws.close(); // will trigger reconnect in onclose
            };

            wsRef.current = ws;
        } catch (err) {
            console.error('WebSocket setup error', err);
        }
    }, []);

    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);

    return {
        transactions,
        isConnected: connectionStatus === 'connected',
        connectionStatus,
        lastMessage,
        tamperAlerts
    };
}
