import { useState, useEffect, useMemo } from 'react';
import { 
  Download, 
  RefreshCw, 
  Copy, 
  Search, 
  Terminal, 
  ShieldCheck, 
  ShieldAlert, 
  Server, 
  Monitor, 
  Clock, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { getExperimentHistory } from '../services/experimentHistory';
import { getVpnLogs } from '../services/vpnService';
import { useLogs } from '../hooks/useLogs';

export default function Logs() {
  const [activeTab, setActiveTab] = useState('experiment'); // 'experiment' | 'live_vpn' | 'system'
  const [selectedExperimentId, setSelectedExperimentId] = useState(null);
  const [streamFilter, setStreamFilter] = useState('all'); // 'all' | 'client' | 'server' | 'attacker'
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Live Agent Log states
  const [agentTarget, setAgentTarget] = useState('client'); // 'client' | 'server'
  const [agentLines, setAgentLines] = useState(80);
  const [liveAgentLogs, setLiveAgentLogs] = useState({ lines: [], loading: false, error: null, hasMutualAuth: false });

  // Experiment history from local store
  const [history, setHistory] = useState(() => getExperimentHistory());
  const { logs: backendLogs, loading: backendLoading, refreshLogs: refreshBackendLogs } = useLogs();

  useEffect(() => {
    const update = () => {
      const items = getExperimentHistory();
      setHistory(items);
      if (!selectedExperimentId && items.length > 0) {
        setSelectedExperimentId(items[0].id);
      }
    };
    window.addEventListener('qvpn-history-updated', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('qvpn-history-updated', update);
      window.removeEventListener('storage', update);
    };
  }, [selectedExperimentId]);

  // Set default selected experiment
  useEffect(() => {
    if (!selectedExperimentId && history.length > 0) {
      setSelectedExperimentId(history[0].id);
    }
  }, [history, selectedExperimentId]);

  // Fetch live agent logs
  const fetchLiveAgentLogs = async () => {
    setLiveAgentLogs((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await getVpnLogs(agentLines, agentTarget);
      if (res.success) {
        setLiveAgentLogs({
          lines: res.lines || [],
          loading: false,
          error: null,
          hasMutualAuth: res.hasMutualAuthSuccess || false,
        });
      } else {
        setLiveAgentLogs({
          lines: [],
          loading: false,
          error: res.error || `Could not fetch live logs from ${agentTarget} agent (:8000/vpn/logs)`,
          hasMutualAuth: false,
        });
      }
    } catch (err) {
      setLiveAgentLogs({
        lines: [],
        loading: false,
        error: err.message,
        hasMutualAuth: false,
      });
    }
  };

  useEffect(() => {
    if (activeTab === 'live_vpn') {
      fetchLiveAgentLogs();
    }
  }, [activeTab, agentTarget, agentLines]);

  // Get currently selected experiment
  const currentExperiment = useMemo(() => {
    if (!selectedExperimentId && history.length > 0) return history[0];
    return history.find((h) => h.id === selectedExperimentId) || history[0] || null;
  }, [history, selectedExperimentId]);

  // Parse experiment logs into structured table entries
  const experimentLogEntries = useMemo(() => {
    if (!currentExperiment) return [];
    const entries = [];
    const completedTime = currentExperiment.completedAt
      ? new Date(currentExperiment.completedAt).toLocaleTimeString()
      : 'Run moment';

    // 1. Client Log
    if (currentExperiment.data?.client_log) {
      const lines = currentExperiment.data.client_log.split('\n').filter(Boolean);
      lines.forEach((line) => {
        let level = 'INFO';
        if (line.includes('FAILED') || line.includes('ERROR') || line.includes('error')) level = 'ERROR';
        else if (line.includes('SUCCESS') || line.includes('CONNECTED')) level = 'SUCCESS';
        else if (line.includes('WARN')) level = 'WARNING';

        entries.push({
          time: completedTime,
          stream: 'client',
          module: 'Client VM',
          level,
          description: line.trim(),
        });
      });
    }

    // 2. Client Ping
    if (currentExperiment.data?.client_ping) {
      const lines = currentExperiment.data.client_ping.split('\n').filter(Boolean);
      lines.forEach((line) => {
        entries.push({
          time: completedTime,
          stream: 'client',
          module: 'Client Ping',
          level: line.includes('0% packet loss') ? 'SUCCESS' : line.includes('100% packet loss') ? 'ERROR' : 'INFO',
          description: line.trim(),
        });
      });
    }

    // 3. Server Log
    if (currentExperiment.data?.server_log) {
      const lines = currentExperiment.data.server_log.split('\n').filter(Boolean);
      lines.forEach((line) => {
        let level = 'INFO';
        if (line.includes('FAILED') || line.includes('rejected') || line.includes('REJECTED')) level = 'ERROR';
        else if (line.includes('SUCCESS') || line.includes('ACCEPTED')) level = 'SUCCESS';
        else if (line.includes('WARN')) level = 'WARNING';

        entries.push({
          time: completedTime,
          stream: 'server',
          module: 'Server VM',
          level,
          description: line.trim(),
        });
      });
    }

    // 4. Attacker / Windows Log
    if (currentExperiment.data?.attacker_log) {
      const lines = currentExperiment.data.attacker_log.split('\n').filter(Boolean);
      lines.forEach((line) => {
        let level = 'INFO';
        if (line.includes('SUCCESSFUL') || line.includes('DECRYPTED') || line.includes('ICMP')) level = 'WARNING';
        if (line.includes('tag forwarded')) level = 'INFO';

        entries.push({
          time: completedTime,
          stream: 'attacker',
          module: 'Windows Attacker',
          level,
          description: line.trim(),
        });
      });
    }

    return entries;
  }, [currentExperiment]);

  // Filtered entries depending on current tab
  const displayedEntries = useMemo(() => {
    let list = [];

    if (activeTab === 'experiment') {
      list = experimentLogEntries;
      if (streamFilter !== 'all') {
        list = list.filter((e) => e.stream === streamFilter);
      }
    } else if (activeTab === 'live_vpn') {
      list = (liveAgentLogs.lines || []).map((line, idx) => {
        let level = 'INFO';
        if (line.includes('ERROR') || line.includes('failed') || line.includes('FAILED')) level = 'ERROR';
        else if (line.includes('SUCCESS') || line.includes('Mutual transcript authentication SUCCESS')) level = 'SUCCESS';
        else if (line.includes('WARNING') || line.includes('warn')) level = 'WARNING';

        return {
          time: `Line #${idx + 1}`,
          stream: agentTarget,
          module: agentTarget === 'client' ? 'Client Agent (:8000)' : 'Server Agent (:8000)',
          level,
          description: line,
        };
      });
    } else {
      list = (backendLogs?.vpn || []).map((e) => ({
        time: e.time,
        stream: 'backend',
        module: e.module,
        level: e.level,
        description: e.description,
      }));
    }

    if (levelFilter !== 'ALL') {
      list = list.filter((e) => e.level === levelFilter);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (e) => e.description.toLowerCase().includes(q) || e.module.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeTab, experimentLogEntries, liveAgentLogs.lines, backendLogs, streamFilter, levelFilter, searchTerm, agentTarget]);

  const copyToClipboard = () => {
    const text = displayedEntries.map((e) => `[${e.time}] [${e.module}] [${e.level}] ${e.description}`).join('\n');
    navigator.clipboard.writeText(text);
    alert('Log entries copied to clipboard!');
  };

  const downloadLogs = () => {
    const text = displayedEntries.map((e) => `[${e.time}] [${e.module}] [${e.level}] ${e.description}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qvpn_${activeTab}_logs_${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-panel">
      {/* Top Header & Tab Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('experiment')}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === 'experiment'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Live Experiment Execution Logs
          </button>
          <button
            onClick={() => setActiveTab('live_vpn')}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === 'live_vpn'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Live VPN Daemon Logs (VM :8000)
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === 'system'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            System Logs
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {activeTab === 'live_vpn' && (
            <button
              onClick={fetchLiveAgentLogs}
              disabled={liveAgentLogs.loading}
              className="flex items-center gap-1.5 rounded-2xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs text-slate-200 hover:border-cyan-400"
            >
              <RefreshCw size={14} className={liveAgentLogs.loading ? 'animate-spin' : ''} />
              Refresh Agent Logs
            </button>
          )}
          <button
            onClick={copyToClipboard}
            disabled={displayedEntries.length === 0}
            className="flex items-center gap-1.5 rounded-2xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs text-slate-200 hover:border-cyan-400 disabled:opacity-40"
          >
            <Copy size={14} />
            Copy
          </button>
          <button
            onClick={downloadLogs}
            disabled={displayedEntries.length === 0}
            className="flex items-center gap-1.5 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-40"
          >
            <Download size={14} />
            Download
          </button>
        </div>
      </div>

      {/* Contextual Bar for Active Tab */}
      {activeTab === 'experiment' && (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Run Session:</span>
            {history.length > 0 ? (
              <select
                value={selectedExperimentId || ''}
                onChange={(e) => setSelectedExperimentId(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-400"
              >
                {history.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.title} ({new Date(h.completedAt).toLocaleTimeString()}) - {h.outcome}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-amber-300">No experiments conducted yet</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400">Stream:</span>
            {['all', 'client', 'server', 'attacker'].map((s) => (
              <button
                key={s}
                onClick={() => setStreamFilter(s)}
                className={`rounded-lg px-2.5 py-1 capitalize transition ${
                  streamFilter === s
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'live_vpn' && (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400 uppercase font-semibold">Target VM:</span>
            <button
              onClick={() => setAgentTarget('client')}
              className={`rounded-lg px-3 py-1.5 transition ${
                agentTarget === 'client'
                  ? 'border border-cyan-500/40 bg-cyan-500/20 text-cyan-300'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              Client Agent (192.168.56.101:8000)
            </button>
            <button
              onClick={() => setAgentTarget('server')}
              className={`rounded-lg px-3 py-1.5 transition ${
                agentTarget === 'server'
                  ? 'border border-cyan-500/40 bg-cyan-500/20 text-cyan-300'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              Server Agent (192.168.56.102:8000)
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">Lines:</span>
            {[30, 80, 150].map((l) => (
              <button
                key={l}
                onClick={() => setAgentLines(l)}
                className={`rounded-lg px-2 py-1 ${
                  agentLines === l
                    ? 'border border-cyan-500/40 bg-cyan-500/20 text-cyan-300'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {l}
              </button>
            ))}
            {liveAgentLogs.hasMutualAuth && (
              <span className="flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-300">
                <CheckCircle2 size={12} />
                Mutual Auth SUCCESS
              </span>
            )}
          </div>
        </div>
      )}

      {/* Search and Log Level Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent outline-none text-slate-200 placeholder-slate-500"
            placeholder="Search log messages, modules, or error strings..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {['ALL', 'SUCCESS', 'INFO', 'WARNING', 'ERROR'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                levelFilter === lvl
                  ? lvl === 'ERROR'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : lvl === 'SUCCESS'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : lvl === 'WARNING'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table / Viewer */}
      {liveAgentLogs.error && activeTab === 'live_vpn' ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-center text-xs text-amber-300">
          <AlertCircle size={24} className="mx-auto mb-2 text-amber-400" />
          <p className="font-semibold">{liveAgentLogs.error}</p>
          <p className="mt-1 text-slate-400">Ensure the VM agents on 192.168.56.101/102 (:8000) are running on the host-only lab network.</p>
        </div>
      ) : displayedEntries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-10 text-center text-xs text-slate-400">
          <Terminal size={32} className="mx-auto mb-2 text-slate-500" />
          <p className="font-semibold text-slate-300">No log entries found for current filter</p>
          <p className="mt-1">
            {activeTab === 'experiment'
              ? 'Execute an experiment in Security Experiments to capture live client, server, and attacker evidence.'
              : 'Try adjusting the search query or target VM.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <table className="min-w-full text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-left text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3 w-28">Timestamp</th>
                <th className="px-4 py-3 w-40">Module / Stream</th>
                <th className="px-4 py-3 w-28">Level</th>
                <th className="px-4 py-3">Log Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {displayedEntries.map((entry, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition">
                  <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                    {entry.time}
                  </td>
                  <td className="px-4 py-2.5 font-sans font-medium text-cyan-300 whitespace-nowrap">
                    {entry.module}
                  </td>
                  <td className="px-4 py-2.5 font-sans whitespace-nowrap">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        entry.level === 'SUCCESS'
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                          : entry.level === 'WARNING'
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                          : entry.level === 'ERROR'
                          ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                          : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      {entry.level}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-300 break-all leading-relaxed text-[11px]">
                    {entry.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
