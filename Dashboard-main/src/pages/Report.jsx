import { useEffect, useMemo, useState } from 'react';
import { Download, FileJson, FileText, Printer, Trash2 } from 'lucide-react';
import { clearExperimentHistory, getExperimentHistory } from '../services/experimentHistory';

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export default function Report() {
  const [history, setHistory] = useState(() => getExperimentHistory());

  useEffect(() => {
    const refresh = () => setHistory(getExperimentHistory());
    window.addEventListener('storage', refresh);
    window.addEventListener('qvpn-history-updated', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('qvpn-history-updated', refresh);
    };
  }, []);

  const latest = history[0] || null;
  const summary = useMemo(() => ({
    defended: history.filter((item) => ['mitm_rejected', 'downgrade_rejected'].includes(item.outcome)).length,
    vulnerable: history.filter((item) => ['mitm_succeeded', 'downgrade_accepted'].includes(item.outcome)).length,
  }), [history]);

  const exportJson = () => downloadFile(
    `qvpn-experiment-results-${Date.now()}.json`,
    JSON.stringify({ exportedAt: new Date().toISOString(), results: history }, null, 2),
    'application/json'
  );

  const exportCsv = () => {
    const rows = history.map((item) => [item.completedAt, item.title, item.category, item.outcome, item.success]);
    downloadFile(
      `qvpn-experiment-results-${Date.now()}.csv`,
      [['Timestamp', 'Experiment', 'Category', 'Outcome', 'Completed'], ...rows]
        .map((row) => row.map(csvCell).join(',')).join('\n'),
      'text/csv'
    );
  };

  const exportLogs = () => {
    const text = history.map((item) => [
      `=== ${item.title} ===`, `Timestamp: ${item.completedAt}`, `Outcome: ${item.outcome}`,
      '', '[CLIENT LOG]', item.data?.client_log || 'Not returned',
      '', '[SERVER LOG]', item.data?.server_log || 'Not returned',
      '', '[WINDOWS ATTACKER LOG]', item.data?.attacker_log || 'Not returned',
      '', '[PING OUTPUT]', item.data?.client_ping || 'Not returned',
    ].join('\n')).join('\n\n');
    downloadFile(`qvpn-evidence-${Date.now()}.txt`, text, 'text/plain');
  };

  const handleClear = () => {
    if (window.confirm('Clear locally saved dashboard experiment history?')) {
      clearExperimentHistory();
      setHistory([]);
    }
  };

  return (
    <div className="space-y-6 print:bg-white print:text-black">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-panel print:border-0 print:bg-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">QVPN Experiment Evidence Report</h2>
            <p className="mt-2 text-sm text-slate-400 print:text-slate-700">Built only from experiment-controller responses saved by this browser.</p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl border border-cyan-500/30 px-3 py-2 text-sm text-cyan-300"><Printer size={15} />Print / Save PDF</button>
            <button onClick={exportJson} disabled={!history.length} className="flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm disabled:opacity-40"><FileJson size={15} />JSON</button>
            <button onClick={exportCsv} disabled={!history.length} className="flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm disabled:opacity-40"><Download size={15} />CSV</button>
            <button onClick={exportLogs} disabled={!history.length} className="flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm disabled:opacity-40"><FileText size={15} />Evidence Logs</button>
            <button onClick={handleClear} disabled={!history.length} className="flex items-center gap-2 rounded-xl border border-rose-500/30 px-3 py-2 text-sm text-rose-300 disabled:opacity-40"><Trash2 size={15} />Clear</button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs text-slate-400">Saved Runs</p><p className="mt-1 text-2xl font-bold">{history.length}</p></div>
        <div className="rounded-2xl border border-emerald-900 bg-slate-900/70 p-4"><p className="text-xs text-slate-400">Attacks Rejected</p><p className="mt-1 text-2xl font-bold text-emerald-300">{summary.defended}</p></div>
        <div className="rounded-2xl border border-amber-900 bg-slate-900/70 p-4"><p className="text-xs text-slate-400">Baseline Attacks Accepted</p><p className="mt-1 text-2xl font-bold text-amber-300">{summary.vulnerable}</p></div>
      </div>

      {!latest ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center text-slate-400">No saved evidence yet. Run a Security Experiment first.</div>
      ) : (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 print:border-slate-300 print:bg-white">
          <h3 className="text-lg font-semibold">Latest Result</h3>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
            <div><dt className="text-slate-500">Experiment</dt><dd>{latest.title}</dd></div>
            <div><dt className="text-slate-500">Timestamp</dt><dd>{latest.completedAt}</dd></div>
            <div><dt className="text-slate-500">Outcome</dt><dd className="font-semibold">{latest.outcome}</dd></div>
            <div><dt className="text-slate-500">Controller completion</dt><dd>{latest.success ? 'Completed' : 'Failed / inconclusive'}</dd></div>
          </dl>
          {['client_log', 'server_log', 'attacker_log', 'client_ping'].map((key) => latest.data?.[key] && (
            <section key={key} className="mt-5">
              <h4 className="mb-2 text-sm font-semibold uppercase text-slate-400">{key.replaceAll('_', ' ')}</h4>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-xs text-slate-300 print:max-h-none print:bg-slate-100 print:text-black">{latest.data[key]}</pre>
            </section>
          ))}
        </div>
      )}

      {history.length > 1 && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 print:border-slate-300 print:bg-white">
          <h3 className="text-lg font-semibold">Run History</h3>
          <div className="mt-4 overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-slate-400"><th className="p-2">Time</th><th className="p-2">Experiment</th><th className="p-2">Outcome</th></tr></thead><tbody>{history.map((item) => <tr key={item.id} className="border-t border-slate-800"><td className="p-2">{item.completedAt}</td><td className="p-2">{item.title}</td><td className="p-2 font-mono">{item.outcome}</td></tr>)}</tbody></table></div>
        </div>
      )}
    </div>
  );
}
