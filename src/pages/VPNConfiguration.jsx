import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  RefreshCw,
  StopCircle,
  PlayCircle,
  Send,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Lock,
  Layers,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useVpnStatus } from '../hooks/useVpnStatus';
import { VPN_MODES } from '../services/vpnService';

export default function VPNConfiguration() {
  const {
    status,
    actionLoading,
    chatLoading,
    chatOutput,
    v3Logs,
    message,
    setMessage,
    startClassicalVpn,
    startPqcVpn,
    startHybridV2Vpn,
    startHybridV3Vpn,
    stopVpn,
    sendChatMessage,
    refreshV3Logs,
  } = useVpnStatus();

  const [inputMessage, setInputMessage] = useState('Hello from Client');
  const [showV3Logs, setShowV3Logs] = useState(false);

  const handleSend = (e) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      sendChatMessage(inputMessage.trim());
    }
  };

  const isModeActive = (expectedMode) => status.vpnRunning && status.mode === expectedMode;

  const getModeStatusBadge = (expectedMode) => {
    if (!status.available) {
      return (
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
          AGENT OFFLINE
        </span>
      );
    }
    if (isModeActive(expectedMode)) {
      return (
        <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 shadow-sm shadow-emerald-500/20">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          ACTIVE & CONNECTED
        </span>
      );
    }
    if (status.vpnRunning && status.mode !== expectedMode) {
      return (
        <span className="rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-400">
          STANDBY
        </span>
      );
    }
    if (actionLoading === expectedMode) {
      return (
        <span className="flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-300">
          <RefreshCw size={12} className="animate-spin" />
          ESTABLISHING...
        </span>
      );
    }
    return (
      <span className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs font-medium text-slate-400">
        DISCONNECTED
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Alert / Notification Banner */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`rounded-2xl border p-4 text-sm flex items-center justify-between shadow-lg backdrop-blur-md ${
              message.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : message.type === 'error'
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
            }`}
          >
            <div className="flex items-center gap-3">
              {message.type === 'success' ? (
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              ) : message.type === 'error' ? (
                <AlertTriangle size={18} className="text-rose-400 shrink-0" />
              ) : (
                <Activity size={18} className="text-cyan-400 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
            <button
              onClick={() => setMessage(null)}
              className="text-xs uppercase font-mono tracking-wider opacity-70 hover:opacity-100 px-2 py-1"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Active Tunnel Overview Bar */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-panel backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`p-3 rounded-2xl border ${
                status.vpnRunning
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                  : 'border-slate-700 bg-slate-800/80 text-slate-400'
              }`}
            >
              <Lock size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-100">
                  {status.vpnRunning
                    ? `Active Tunnel: ${status.mode?.toUpperCase().replace('_', ' ')}`
                    : 'VPN State: Disconnected'}
                </h1>
                {status.vpnRunning && (
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-mono font-medium text-emerald-300 border border-emerald-500/30">
                    {status.interfaceName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {status.vpnRunning
                  ? `Client ${status.localIp || '10.x.x.x'} ↔ Server ${status.peerIp || '10.x.x.x'} • Isolated Host-Only Network`
                  : 'Select one of the 4 cryptographic tunneling architectures below to initiate connection.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {status.vpnRunning && (
              <button
                onClick={stopVpn}
                disabled={actionLoading === 'stopping'}
                className="flex items-center gap-2 rounded-xl border border-rose-500/50 bg-rose-500/20 px-4 py-2.5 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/30 shadow-md shadow-rose-950 disabled:opacity-50"
              >
                {actionLoading === 'stopping' ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    DISCONNECTING...
                  </>
                ) : (
                  <>
                    <StopCircle size={16} />
                    DISCONNECT SESSION
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4 Mode Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Card 1: Classical OpenVPN */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl border p-6 transition-all duration-300 shadow-panel ${
            isModeActive('classical')
              ? 'border-emerald-500/50 bg-slate-900/90 ring-1 ring-emerald-500/30'
              : 'border-slate-800 bg-slate-900/70'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Cpu size={18} className="text-cyan-400" />
                <h2 className="text-xl font-bold text-slate-100">Classical OpenVPN</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">AES-256-GCM • TLS Handshake • tun0</p>
            </div>
            {getModeStatusBadge('classical')}
          </div>

          <p className="mt-4 text-xs text-slate-300 leading-relaxed">
            Standard enterprise VPN tunnel. Uses classical public-key cryptography for key exchange and AES-256-GCM for packet encryption.
          </p>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-xs space-y-1.5 font-mono text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Interface:</span>
              <span className="text-cyan-300">tun0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">IP Allocation:</span>
              <span>10.8.0.2 ↔ 10.8.0.1</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Transport:</span>
              <span>UDP OpenVPN Systemd Service</span>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={startClassicalVpn}
              disabled={status.vpnRunning || actionLoading !== null}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
                isModeActive('classical')
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : status.vpnRunning
                  ? 'bg-slate-800/60 text-slate-500 cursor-not-allowed border border-slate-800'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
            >
              {actionLoading === 'classical' ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  STARTING...
                </>
              ) : (
                <>
                  <PlayCircle size={16} />
                  START CLASSICAL VPN
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Card 2: Post-Quantum VPN */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={`rounded-3xl border p-6 transition-all duration-300 shadow-panel ${
            isModeActive('pqc')
              ? 'border-emerald-500/50 bg-slate-900/90 ring-1 ring-emerald-500/30'
              : 'border-slate-800 bg-slate-900/70'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-purple-400" />
                <h2 className="text-xl font-bold text-slate-100">Post-Quantum VPN</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">ML-KEM-768 (Kyber) • qvpn0 • Port 5559</p>
            </div>
            {getModeStatusBadge('pqc')}
          </div>

          <p className="mt-4 text-xs text-slate-300 leading-relaxed">
            Quantum-safe cryptographic tunnel. Uses pure NIST-standardized ML-KEM-768 lattice-based key encapsulation to protect against quantum cryptanalysis.
          </p>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-xs space-y-1.5 font-mono text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Interface:</span>
              <span className="text-purple-300">qvpn0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">IP Allocation:</span>
              <span>10.20.0.2 ↔ 10.20.0.1</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Transport:</span>
              <span>TCP 5559 (PQC Tunnel Daemon)</span>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={startPqcVpn}
              disabled={status.vpnRunning || actionLoading !== null}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
                isModeActive('pqc')
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : status.vpnRunning
                  ? 'bg-slate-800/60 text-slate-500 cursor-not-allowed border border-slate-800'
                  : 'bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30'
              }`}
            >
              {actionLoading === 'pqc' ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  STARTING...
                </>
              ) : (
                <>
                  <PlayCircle size={16} />
                  START PQC VPN
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Card 3: Unauthenticated Hybrid V2 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`rounded-3xl border p-6 transition-all duration-300 shadow-panel ${
            isModeActive('hybrid')
              ? 'border-emerald-500/50 bg-slate-900/90 ring-1 ring-emerald-500/30'
              : 'border-slate-800 bg-slate-900/70'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-amber-400" />
                <h2 className="text-xl font-bold text-slate-100">Hybrid V2 (Unauthenticated)</h2>
              </div>
              <p className="text-xs text-amber-300/80 mt-1">X25519 + ML-KEM-768 • Baseline Tunnel</p>
            </div>
            {getModeStatusBadge('hybrid')}
          </div>

          <p className="mt-4 text-xs text-slate-300 leading-relaxed">
            Combines classical ECDH (X25519) and ML-KEM-768 for defense-in-depth, but lacks transcript authentication. Vulnerable to active in-path MITM interception.
          </p>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-xs space-y-1.5 font-mono text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Interface:</span>
              <span className="text-amber-300">qvpn0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">IP Allocation:</span>
              <span>10.20.0.2 ↔ 10.20.0.1</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Transport:</span>
              <span>TCP 5558 (V2 Tunnel Daemon)</span>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={startHybridV2Vpn}
              disabled={status.vpnRunning || actionLoading !== null}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
                isModeActive('hybrid')
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : status.vpnRunning
                  ? 'bg-slate-800/60 text-slate-500 cursor-not-allowed border border-slate-800'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              }`}
            >
              {actionLoading === 'hybrid' ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  STARTING...
                </>
              ) : (
                <>
                  <PlayCircle size={16} />
                  START HYBRID V2 VPN
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Card 4: Authenticated Hybrid V3 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={`rounded-3xl border p-6 transition-all duration-300 shadow-panel relative overflow-hidden ${
            isModeActive('hybrid_v3')
              ? 'border-cyan-500/60 bg-slate-900/90 ring-1 ring-cyan-500/40'
              : 'border-cyan-900/40 bg-slate-900/70'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-cyan-400" />
                <h2 className="text-xl font-bold text-slate-100">Hybrid V3 (Authenticated)</h2>
              </div>
              <p className="text-xs text-cyan-300 mt-1">X25519 + ML-KEM-768 + Mutual Transcript Auth</p>
            </div>
            {getModeStatusBadge('hybrid_v3')}
          </div>

          <p className="mt-4 text-xs text-slate-300 leading-relaxed">
            Full quantum-safe hybrid tunnel with mutual transcript authentication (HMAC-based session binding). Defeats MITM proxy attacks and cipher suite downgrade tampering.
          </p>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-xs space-y-1.5 font-mono text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Interface:</span>
              <span className="text-cyan-300">qvpn0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">IP Allocation:</span>
              <span>10.20.0.2 ↔ 10.20.0.1</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Transport:</span>
              <span>TCP 5558 (V3 Auth Daemon)</span>
            </div>
          </div>

          {/* V3 Authentication Proof Badge */}
          {isModeActive('hybrid_v3') && (
            <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-300 font-medium">
                <CheckCircle2 size={16} />
                <span>Transcript Authentication Verified</span>
              </div>
              <button
                onClick={() => setShowV3Logs(!showV3Logs)}
                className="text-xs text-cyan-300 hover:underline flex items-center gap-1 font-mono"
              >
                {showV3Logs ? 'Hide Log' : 'View Log'}
                {showV3Logs ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={startHybridV3Vpn}
              disabled={status.vpnRunning || actionLoading !== null}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
                isModeActive('hybrid_v3')
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : status.vpnRunning
                  ? 'bg-slate-800/60 text-slate-500 cursor-not-allowed border border-slate-800'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 shadow-md shadow-cyan-950'
              }`}
            >
              {actionLoading === 'hybrid_v3' ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  STARTING...
                </>
              ) : (
                <>
                  <PlayCircle size={16} />
                  START AUTHENTICATED V3
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>

      {/* V3 Logs Drawer */}
      <AnimatePresence>
        {showV3Logs && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-panel font-mono text-xs overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 text-slate-400">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-cyan-400" />
                <span className="font-semibold text-slate-200">
                  Hybrid V3 Client Process Log (GET /vpn/logs)
                </span>
              </div>
              <button
                onClick={() => refreshV3Logs(80)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-slate-300 hover:bg-slate-800"
              >
                <RefreshCw size={12} className={v3Logs.loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 pr-2 text-slate-300">
              {v3Logs.lines?.length > 0 ? (
                v3Logs.lines.map((line, i) => (
                  <div
                    key={i}
                    className={`p-1 rounded ${
                      line.includes('Mutual transcript authentication SUCCESS')
                        ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                        : line.includes('FAILED') || line.includes('error')
                        ? 'bg-rose-500/20 text-rose-300'
                        : ''
                    }`}
                  >
                    {line}
                  </div>
                ))
              ) : (
                <div className="py-4 text-slate-500 text-center">
                  No V3 process log entries returned. Logs represent the last V3 run.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Socket Chat & Command Output Terminal */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-panel"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Terminal className="text-cyan-400" size={20} />
              <h2 className="text-xl font-bold text-slate-100">Live Application Chat Channel</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Sends an application message via Client Agent → Server Agent over the active tunnel (POST /chat/send). Real response only, no synthetic fallback.
            </p>
          </div>

          <form onSubmit={handleSend} className="flex gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Enter message for server..."
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400 flex-1 sm:w-64"
            />
            <button
              type="submit"
              disabled={chatLoading}
              className="flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/30 disabled:opacity-50"
            >
              {chatLoading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              Send
            </button>
          </form>
        </div>

        {/* Live Server Response Display */}
        {chatOutput?.success && chatOutput?.serverResponse && (
          <div className="mt-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <CheckCircle2 size={18} className="text-emerald-400" />
                Verified Server Reply Received:
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                via {chatOutput.vpnMode?.toUpperCase()} ({chatOutput.destination})
              </span>
            </div>
            <p className="mt-2 text-sm font-mono text-slate-100 bg-slate-950/80 p-3 rounded-xl border border-emerald-500/20 break-all">
              {chatOutput.serverResponse}
            </p>
          </div>
        )}

        {/* Real Error Output */}
        {chatOutput && !chatOutput.success && (
          <div className="mt-6 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-300">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <AlertTriangle size={18} className="text-rose-400" />
              Application Message Failed Delivery:
            </div>
            <div className="mt-2 text-sm font-mono text-slate-200 bg-slate-950/80 p-3 rounded-xl border border-rose-500/20">
              {chatOutput.error || 'Server did not return a response.'}
            </div>
          </div>
        )}

        {/* Terminal logs */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 text-slate-500">
            <span>Transmission Log Feed (POST /chat/send)</span>
            <span>Target: {status.vpnRunning ? status.peerIp : 'No Active VPN'}</span>
          </div>

          {chatLoading ? (
            <div className="py-6 text-center text-cyan-400 flex items-center justify-center gap-2">
              <RefreshCw size={16} className="animate-spin" />
              Transmitting application message across tunnel to server...
            </div>
          ) : chatOutput?.terminalLogs ? (
            <div className="space-y-2">
              {chatOutput.terminalLogs.map((logLine, index) => (
                <div key={index} className="flex gap-2">
                  <span className="text-cyan-400 font-bold">$</span>
                  <span
                    className={
                      logLine.includes('SERVER RESPONSE')
                        ? 'text-emerald-300 font-bold'
                        : logLine.includes('FAILED') || logLine.includes('ERROR')
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }
                  >
                    {logLine}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-slate-500 text-center">
              Connect a tunnel above and click <strong className="text-cyan-300">"Send"</strong> to transmit test packets and receive verified replies.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
