import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';

// --- Types ---
type ServiceStatus = "HEALTHY" | "DEGRADED" | "DOWN";
interface ServiceHealthMetrics {
  status: ServiceStatus;
  latencyMs: number;
  errorRatePercentage: number;
  message?: string;
}
interface EdgeNetworkHealth {
  timestamp: string;
  overallStatus: ServiceStatus;
  services: Record<string, ServiceHealthMetrics>;
}
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const API_URL = 'http://localhost:8787';

function App() {
  const [health, setHealth] = useState<EdgeNetworkHealth | null>(null);
  const [sessionId] = useState(`session-${Math.random().toString(36).substring(2, 9)}`);

  // Left Pane State
  const [userQuery, setUserQuery] = useState('');
  const [logSnippet, setLogSnippet] = useState('');

  // Right Pane State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch Health Data
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch(`${API_URL}/health`);
        const data = await res.json();
        setHealth(data);
      } catch (err) {
        console.error('Failed to fetch health data', err);
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleDiagnose = async (e: FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim()) return;

    const newMessage: ChatMessage = { role: 'user', content: userQuery, timestamp: new Date() };
    setMessages((prev) => [...prev, newMessage]);
    setIsDiagnosing(true);

    try {
      const res = await fetch(`${API_URL}/api/diagnose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userQuery,
          logSnippet,
        }),
      });

      if (!res.ok) throw new Error(`API returned status: ${res.status}`);
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response, timestamp: new Date() }
      ]);
      setUserQuery('');
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `[SYSTEM ERROR] Failed to connect to diagnostic API: ${String(err)}`, timestamp: new Date() }
      ]);
    } finally {
      setIsDiagnosing(false);
    }
  };

  const getStatusColor = (status: ServiceStatus) => {
    switch (status) {
      case 'HEALTHY': return 'text-infra-accent';
      case 'DEGRADED': return 'text-infra-warn';
      case 'DOWN': return 'text-infra-error text-shadow-error';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-infra-bg text-infra-text font-mono text-sm">

      {/* LEFT PANE: Log Ingestion & Metrics */}
      <div className="w-1/2 h-full flex flex-col border-r border-infra-border bg-infra-panel">
        <header className="p-4 border-b border-infra-border flex justify-between items-center bg-black/40">
          <h1 className="font-bold text-infra-accent tracking-widest uppercase">
            EdgeOps AI Copilot
          </h1>
          <span className="text-xs text-gray-500">SESSION: {sessionId}</span>
        </header>

        {/* Health Metrics Section */}
        <section className="p-4 border-b border-infra-border overflow-y-auto max-h-[40%]">
          <h2 className="text-xs text-gray-400 mb-3 uppercase tracking-wider">Cluster Metrics (Real-time)</h2>
          {!health ? (
            <div className="animate-pulse text-infra-warn">Awaiting telemetry...</div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">OVERALL STATUS</span>
                <span className={`font-bold ${getStatusColor(health.overallStatus)}`}>
                  {health.overallStatus}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(health.services).map(([name, srv]) => (
                  <div key={name} className="p-2 border border-infra-border bg-infra-bg rounded">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-[10px] uppercase truncate" title={name}>{name}</span>
                      <span className={`text-[10px] font-bold ${getStatusColor(srv.status)}`}>{srv.status}</span>
                    </div>
                    <div className="text-[10px] text-gray-400 flex justify-between">
                      <span>Lat: {srv.latencyMs >= 0 ? `${srv.latencyMs}ms` : 'N/A'}</span>
                      <span>Err: {srv.errorRatePercentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Log Ingestion Form */}
        <section className="p-4 flex-1 flex flex-col overflow-hidden">
          <h2 className="text-xs text-gray-400 mb-3 uppercase tracking-wider">Log Ingestion & Query</h2>
          <form onSubmit={handleDiagnose} className="flex-1 flex flex-col gap-4">
            <div className="flex flex-col flex-1 gap-2">
              <label className="text-[10px] text-gray-500 uppercase">System Logs / Stack Trace</label>
              <textarea
                className="flex-1 w-full bg-infra-bg border border-infra-border p-3 focus:outline-none focus:border-infra-accent resize-none font-mono text-xs text-gray-300 placeholder:text-gray-700"
                placeholder="Paste raw logs, stack traces, or metrics here..."
                value={logSnippet}
                onChange={(e) => setLogSnippet(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-gray-500 uppercase">Diagnostic Query</label>
              <input
                type="text"
                className="w-full bg-infra-bg border border-infra-border p-3 focus:outline-none focus:border-infra-accent font-mono text-xs text-white placeholder:text-gray-700"
                placeholder="E.g. Analyze these logs and provide remediation..."
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={isDiagnosing}
              className="w-full p-3 bg-infra-border hover:bg-infra-accent hover:text-black transition-colors font-bold uppercase tracking-wider border border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDiagnosing ? 'Running Diagnostics...' : 'Trigger Analysis'}
            </button>
          </form>
        </section>
      </div>

      {/* RIGHT PANE: Chat Feed */}
      <div className="w-1/2 h-full flex flex-col bg-infra-bg relative">
        <header className="p-4 border-b border-infra-border bg-black/40 shadow-sm z-10 flex justify-between items-center">
          <h2 className="font-bold text-gray-300 tracking-widest uppercase">Diagnostic Feed</h2>
          {isDiagnosing && <span className="text-infra-accent animate-pulse text-xs">Analyzing...</span>}
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2">
              <div className="text-4xl opacity-20">⚙️</div>
              <p>Awaiting incident data</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] text-gray-500 mb-1 px-1">
                  {msg.role === 'user' ? 'OP-REQUEST' : 'SRE-SYSTEM'} • {msg.timestamp.toLocaleTimeString()}
                </span>
                <div
                  className={`max-w-[90%] p-4 rounded-sm border whitespace-pre-wrap leading-relaxed ${msg.role === 'user'
                      ? 'bg-infra-panel border-infra-border text-gray-300'
                      : 'bg-[#051510] border-infra-accent/30 text-infra-text shadow-[0_0_15px_rgba(0,255,204,0.05)]'
                    }`}
                >
                  {/* Basic markdown-like rendering for code blocks from AI */}
                  {msg.content.split('```').map((part, idx) => {
                    if (idx % 2 === 1) {
                      return (
                        <pre key={idx} className="bg-black/60 border border-infra-border p-3 my-2 overflow-x-auto text-[11px] text-infra-accent rounded-sm">
                          <code>{part.replace(/^.*\n/, '') /* naive strip of lang tag */}</code>
                        </pre>
                      );
                    }
                    return <span key={idx}>{part}</span>;
                  })}
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

    </div>
  );
}

export default App;
