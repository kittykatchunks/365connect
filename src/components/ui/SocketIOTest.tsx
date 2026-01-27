import { useState } from 'react';
import { testSocketIOConnection } from '@/utils';
import { Socket } from 'socket.io-client';

/**
 * Socket.IO Connection Test Component
 * Tests WebSocket connectivity to Phantom API server
 */
export function SocketIOTest() {
    const [url, setUrl] = useState('https://server1-833.phantomapi.net:3000');
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const [socket, setSocket] = useState<Socket | null>(null);
    const [error, setError] = useState<string>('');
    const [events, setEvents] = useState<Array<{ timestamp: string; event: string; data: any }>>([]);

    const handleConnect = async () => {
        setStatus('connecting');
        setError('');
        setEvents([]);

        try {
            const newSocket = await testSocketIOConnection(url);
            setSocket(newSocket);
            setStatus('connected');

            // Listen for all events
            newSocket.onAny((eventName, ...args) => {
                const timestamp = new Date().toLocaleTimeString();
                setEvents(prev => [...prev, { timestamp, event: eventName, data: args }]);
            });

            // Send a test ping
            newSocket.emit('ping', { test: true, timestamp: Date.now() });

        } catch (err) {
            setStatus('error');
            setError(err instanceof Error ? err.message : 'Connection failed');
        }
    };

    const handleDisconnect = () => {
        if (socket) {
            socket.disconnect();
            setSocket(null);
            setStatus('idle');
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'connected': return 'bg-green-500';
            case 'connecting': return 'bg-yellow-500';
            case 'error': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                    Socket.IO Connection Test
                </h2>

                <div className="space-y-4">
                    {/* URL Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Server URL
                        </label>
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            disabled={status === 'connecting' || status === 'connected'}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50"
                            placeholder="https://server1-833.phantomapi.net:3000"
                        />
                    </div>

                    {/* Status Indicator */}
                    <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Status: {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                        {socket && (
                            <span className="text-xs text-gray-500">
                                ID: {socket.id}
                            </span>
                        )}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                            <p className="text-sm text-red-800 dark:text-red-200">
                                ❌ {error}
                            </p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                        <button
                            onClick={handleConnect}
                            disabled={status === 'connecting' || status === 'connected'}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {status === 'connecting' ? 'Connecting...' : 'Connect'}
                        </button>
                        <button
                            onClick={handleDisconnect}
                            disabled={status !== 'connected'}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Disconnect
                        </button>
                    </div>

                    {/* Events Log */}
                    {events.length > 0 && (
                        <div className="mt-6">
                            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                                Events Log
                            </h3>
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4 max-h-96 overflow-y-auto">
                                {events.map((event, index) => (
                                    <div key={index} className="mb-2 text-sm font-mono">
                                        <span className="text-gray-500 dark:text-gray-400">
                                            [{event.timestamp}]
                                        </span>
                                        <span className="text-blue-600 dark:text-blue-400 ml-2">
                                            {event.event}
                                        </span>
                                        {event.data.length > 0 && (
                                            <pre className="text-gray-700 dark:text-gray-300 ml-4 mt-1">
                                                {JSON.stringify(event.data, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Connection Info */}
                    {socket && status === 'connected' && (
                        <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
                            <h3 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
                                ✅ Connection Established
                            </h3>
                            <div className="text-xs text-green-700 dark:text-green-300 space-y-1">
                                <p>Socket ID: {socket.id}</p>
                                <p>Connected: {socket.connected ? 'Yes' : 'No'}</p>
                                <p>Transport: {socket.io.engine.transport.name}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
