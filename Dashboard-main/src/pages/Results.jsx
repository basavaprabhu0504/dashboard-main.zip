import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Download, 
  ExternalLink, 
  Eye, 
  X, 
  Terminal, 
  Play, 
  RefreshCw 
} from 'lucide-react';
import StatusCard from '../components/common/StatusCard';
import { getExperimentHistory, clearExperimentHistory } from '../services/experimentHistory';
import { useResults } from '../hooks/useResults';

export default function Results() {
  const navigate = useNavigate();
  const { results: backendResults, loading: backendLoading, refreshResults: refreshBackend } = useResults();
  const [historyItems, setHistoryItems] = useState(() => getExperimentHistory());
  const [selectedItem, setSelectedItem] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const update = () => setHistoryItems(getExperimentHistory());
    window.addEventListener('qvpn-history-updated', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('qvpn-history-updated', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  // Merge local history with any unique backend results
  const allResults = [
    ...historyItems.map((item) => ({
      ...item,
      source: 'local_run',
    })),
    ...(backendResults || [])
      .filter((br) => !historyItems.some((h) => h.id === br.id))
      .map((br) => ({
        id: br.id || `backend-${Math.random()}`,
        title: br.name || 'Backend Recorded Evaluation',
        category: br.vpnType?.toLowerCase().includes('openvpn') ? 'classical' : 'mitm',
        outcome: br.status === 'PASS' ? 'mitm_rejected' : 'failed',
        success: br.status === 'PASS',
        completedAt: br.timestamp || new Date().toISOString(),
        data: br,
        source: 'backend_storage',
      })),
  ];

  const filteredResults = allResults.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'mitm') return r.category === 'mitm';
    if (filter === 'downgrade') return r.category === 'downgrade';
    if (filter === 'defended') return r.outcome === 'mitm_rejected' || r.outcome === 'downgrade_rejected';
    if (filter === 'vulnerable') return r.outcome === 'mitm_succeeded' || r.outcome === 'downgrade_accepted';
    return true;
  });

  const totalRuns = allResults.length;
  const defendedRuns = allResults.filter(
    (r) => r.outcome === 'mitm_rejected' || r.outcome === 'downgrade_rejected'
  ).length;
  const vulnerableRuns = allResults.filter(
    (r) => r.outcome === 'mitm_succeeded' || r.outcome === 'downgrade_accepted'
  ).length;
  const inconclusiveRuns = totalRuns - defendedRuns - vulnerableRuns;

  const handleClear = () => {
    if (window.confirm('Clear all local experiment results from history?')) {
      clearExperimentHistory();
      setHistoryItems([]);
      setSelectedItem(null);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(allResults, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `qvpn_experiment_results_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getVerdictBadge = (outcome) => {
    if (outcome === 'mitm_rejected') {
      return {
        label: 'DEFENDED (V3 MUTUAL AUTH)',
        className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        icon: ShieldCheck,
      };
    }
    if (outcome === 'downgrade_rejected') {
      return {
        label: 'DEFENDED (TAMPERING BLOCKED)',
        className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        icon: ShieldCheck,
      };
    }
    if (outcome === 'mitm_succeeded') {
      return {
        label: 'VULNERABLE (V2 BASELINE)',
        className: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        icon: ShieldAlert,
      };
    }
    if (outcome === 'downgrade_accepted') {
      return {
        label: 'VULNERABLE (SUITE STRIPPED)',
        className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        icon: AlertTriangle,
      };
    }
    return {
      label: outcome?.toUpperCase().replace('_', ' ') || 'UNKNOWN',
      className: 'bg-slate-800 text-slate-300 border-slate-700',
      icon: AlertTriangle,
    };
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatusCard
          title="Total Experiments Run"
          value={totalRuns.toString()}
          subtitle="Real-time lab sessions"
          tone="blue"
        />
        <StatusCard
          title="Attacks Defended"
          value={defendedRuns.toString()}
          subtitle="V3 Auth & Tamper Blocked"
          tone="green"
        />
        <StatusCard
          title="Baseline Vulnerabilities"
          value={vulnerableRuns.toString()}
          subtitle="Demonstrated in V2/Baseline"
          tone="yellow"
        />
        <StatusCard
          title="Protection Rate"
          value={totalRuns > 0 ? `${Math.round((defendedRuns / totalRuns) * 100)}%` : '—'}
          subtitle={totalRuns > 0 ? `${defendedRuns} of ${totalRuns} secured` : 'Awaiting test runs'}
          tone={defendedRuns > 0 ? 'green' : 'blue'}
        />
      </div>

      {/* Main Table Card */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Live Experiment Results</h2>
            <p className="text-sm text-slate-400">
              Measured evidence and cryptographic verdicts captured from security evaluation runs
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate('/attack')}
              className="flex items-center gap-1.5 rounded-2xl bg-cyan-500 px-3.5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              <Play size={14} />
              Run New Test
            </button>
            <button
              onClick={handleExportJson}
              disabled={allResults.length === 0}
              className="flex items-center gap-1.5 rounded-2xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
            >
              <Download size={14} />
              Export JSON
            </button>
            <button
              onClick={handleClear}
              disabled={allResults.length === 0}
              className="flex items-center gap-1.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
            >
              <Trash2 size={14} />
              Clear
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-4 text-xs font-medium">
          {[
            { id: 'all', label: `All Runs (${allResults.length})` },
            { id: 'mitm', label: 'In-Path MITM' },
            { id: 'downgrade', label: 'Downgrade Harness' },
            { id: 'defended', label: 'Defended (V3)' },
            { id: 'vulnerable', label: 'Vulnerable (Baseline)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`rounded-full px-3 py-1.5 transition ${
                filter === tab.id
                  ? 'border border-cyan-500/40 bg-cyan-500/20 text-cyan-300'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table / Empty State */}
        {filteredResults.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-10 text-center">
            <ShieldAlert size={36} className="mx-auto text-slate-500 mb-3" />
            <h3 className="text-base font-semibold text-slate-200">No Experiment Results Recorded Yet</h3>
            <p className="mt-1 text-sm text-slate-400 max-w-md mx-auto">
              Execute an in-path MITM or downgrade experiment in the Security Experiments tab to generate live cryptographic evidence and verdicts.
            </p>
            <button
              onClick={() => navigate('/attack')}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
            >
              <Play size={14} />
              Open Security Experiments
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Experiment Title</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Observed Outcome</th>
                  <th className="px-4 py-3">Cryptographic Verdict</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredResults.map((item) => {
                  const badge = getVerdictBadge(item.outcome);
                  const BadgeIcon = badge.icon;
                  const timeFormatted = item.completedAt
                    ? new Date(item.completedAt).toLocaleTimeString()
                    : 'Just now';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/40 transition group cursor-pointer"
                      onClick={() => setSelectedItem(item)}
                    >
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono whitespace-nowrap">
                        {timeFormatted}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-100">
                        {item.title}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs text-slate-300">
                          {item.category?.toUpperCase() || 'EVALUATION'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-cyan-300">
                        {item.outcome}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
                        >
                          <BadgeIcon size={12} />
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(item);
                          }}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
                        >
                          <Eye size={12} />
                          Evidence
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Evidence Inspection Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-100">{selectedItem.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    Conducted: {new Date(selectedItem.completedAt).toLocaleString()} • ID: {selectedItem.id}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                {/* Outcome summary card */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 block mb-1">Observed Outcome</span>
                    <span className="text-cyan-300 font-mono text-sm font-semibold">
                      {selectedItem.outcome}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Execution Status</span>
                    <span className="text-emerald-400 font-mono text-sm font-semibold">
                      {selectedItem.success ? 'SUCCESS (VERIFIED)' : 'INCONCLUSIVE / ERROR'}
                    </span>
                  </div>
                </div>

                {/* Captured Log Evidence */}
                {selectedItem.data?.client_ping && (
                  <div>
                    <h4 className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                      <Terminal size={14} className="text-cyan-400" /> Client Ping Evidence (ICMP Decrypted by Attacker)
                    </h4>
                    <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-emerald-300 text-[11px] leading-relaxed max-h-48">
                      {selectedItem.data.client_ping}
                    </pre>
                  </div>
                )}

                {selectedItem.data?.attacker_log && (
                  <div>
                    <h4 className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                      <Terminal size={14} className="text-rose-400" /> Windows Attacker Log Evidence
                    </h4>
                    <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-rose-300 text-[11px] leading-relaxed max-h-48">
                      {selectedItem.data.attacker_log}
                    </pre>
                  </div>
                )}

                {selectedItem.data?.client_log && (
                  <div>
                    <h4 className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                      <Terminal size={14} className="text-cyan-400" /> Client VM Log Evidence
                    </h4>
                    <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-slate-300 text-[11px] leading-relaxed max-h-48">
                      {selectedItem.data.client_log}
                    </pre>
                  </div>
                )}

                {selectedItem.data?.server_log && (
                  <div>
                    <h4 className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                      <Terminal size={14} className="text-amber-400" /> Server VM Log Evidence
                    </h4>
                    <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-slate-300 text-[11px] leading-relaxed max-h-48">
                      {selectedItem.data.server_log}
                    </pre>
                  </div>
                )}

                {selectedItem.error && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-300">
                    <p className="font-semibold mb-0.5">Execution Error</p>
                    <p className="font-mono text-[11px]">{selectedItem.error}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-slate-800 pt-4">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="rounded-2xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
