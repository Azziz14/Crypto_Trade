'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
}

interface WebSocketContextType {
  isConnected: boolean;
  prices: Record<string, number>;
  priceDirections: Record<string, 'up' | 'down' | 'flat'>;
  subscribeToTopic: (destination: string, callback: (message: any) => void) => () => void;
  stompClient: Client | null;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [priceDirections, setPriceDirections] = useState<Record<string, 'up' | 'down' | 'flat'>>({});
  const stompClientRef = useRef<Client | null>(null);
  const activeSubscriptionsRef = useRef<Record<string, { count: number; unsubscribe: () => void }>>({});
  const callbacksRef = useRef<Record<string, Set<(message: any) => void>>>({});

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_URL}/ws`),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: (frame) => {
        console.log('STOMP connected successfully', frame);
        setIsConnected(true);
        
        // Re-establish active subscriptions if reconnected
        Object.keys(callbacksRef.current).forEach((destination) => {
          setupStompSubscription(destination);
        });
      },
      onDisconnect: () => {
        console.log('STOMP disconnected');
        setIsConnected(false);
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
      },
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
    };
  }, []);

  const setupStompSubscription = (destination: string) => {
    const client = stompClientRef.current;
    if (!client || !client.connected) return;

    // Avoid duplicate STOMP subscriptions
    if (activeSubscriptionsRef.current[destination]) return;

    console.log(`Setting up new STOMP subscription for: ${destination}`);
    const subscription = client.subscribe(destination, (message) => {
      try {
        const body = JSON.parse(message.body);
        
        // If it's a price tick, handle inside context state to prevent child re-renders overhead
        if (destination.startsWith('/topic/prices/')) {
          const update = body as PriceUpdate;
          setPrices((prev) => {
            const currentPrice = prev[update.symbol];
            if (currentPrice !== undefined && currentPrice !== update.price) {
              const direction = update.price > currentPrice ? 'up' : 'down';
              setPriceDirections((prevDir) => ({ ...prevDir, [update.symbol]: direction }));
              
              // Reset direction back to flat after animation
              setTimeout(() => {
                setPriceDirections((prevDir) => {
                  if (prevDir[update.symbol] === direction) {
                    return { ...prevDir, [update.symbol]: 'flat' };
                  }
                  return prevDir;
                });
              }, 1000);
            }
            return { ...prev, [update.symbol]: update.price };
          });
        }

        // Dispatch to all listeners
        const callbacks = callbacksRef.current[destination];
        if (callbacks) {
          callbacks.forEach((cb) => cb(body));
        }
      } catch (err) {
        console.error(`Failed to parse WebSocket message from ${destination}`, err);
      }
    });

    activeSubscriptionsRef.current[destination] = {
      count: 1,
      unsubscribe: () => subscription.unsubscribe(),
    };
  };

  const subscribeToTopic = (destination: string, callback: (message: any) => void) => {
    if (!callbacksRef.current[destination]) {
      callbacksRef.current[destination] = new Set();
    }
    callbacksRef.current[destination].add(callback);

    // Setup active subscription on broker
    if (stompClientRef.current?.connected) {
      if (activeSubscriptionsRef.current[destination]) {
        activeSubscriptionsRef.current[destination].count++;
      } else {
        setupStompSubscription(destination);
      }
    } else {
      // If client not connected yet, it will subscribe automatically onConnect
      if (activeSubscriptionsRef.current[destination]) {
        activeSubscriptionsRef.current[destination].count++;
      }
    }

    // Return cleanup unsubscribe function
    return () => {
      const callbacks = callbacksRef.current[destination];
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          delete callbacksRef.current[destination];
          const sub = activeSubscriptionsRef.current[destination];
          if (sub) {
            sub.count--;
            if (sub.count <= 0) {
              sub.unsubscribe();
              delete activeSubscriptionsRef.current[destination];
              console.log(`Cleaned up STOMP subscription for: ${destination}`);
            }
          }
        }
      }
    };
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, prices, priceDirections, subscribeToTopic, stompClient: stompClientRef.current }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
