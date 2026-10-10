import { useState } from 'react';
import { Download, RefreshCw, Copy, Search } from 'lucide-react';
import { useLogs } from '../hooks/useLogs';

const tabs = ['VPN Logs', 'System Logs'];

export default function Logs() {
  const [activeTab, setActiveTab] = useState('VPN Logs');
  const [searchTerm, setSearchTerm] = useState('');
  const { logs, loading, refreshLogs } = useLogs();

  const currentEntries = activeTab === 'VPN Logs' 
    ? (logs?.vpn || [])
    : (logs?.system || []);

  const filteredEntries = currentEntries.filter((entry) =>
    entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.module.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const copyToClipboard = () => {
    const text = filteredEntries.map((e) => `[${e.time}] [${e.module}] [${e.level}] ${e.description}`).join('\n');
    navigator.clipboard.writeText(text);
    alert('Logs copied to clipboard!');
  };

  const downloadLogs = () => {
    const text = logs.raw || filteredEntries.map((e) => `[${e.time}] [${e.module}] [${e.level}] ${e.description}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openvpn_logs_${Date.now()}.log`;
    a.click();
  };

  return (
    <div className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeTab === tab ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={refreshLogs}
            disabled={loading}
            className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-200 hover:border-cyan-400"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={downloadLogs}
            className="flex items-center gap-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-300 hover:bg-cyan-500/20"
          >
            <Download size={14} />
            Download Logs
          </button>
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-200 hover:border-cyan-400"
          >
            <Copy size={14} />
            Copy Logs
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm">
          <Search size={16} className="text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent outline-none text-slate-200 placeholder-slate-500"
            placeholder="Search OpenVPN and system log text..."
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-800/80 text-left text-slate-300">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">Log Message</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry, idx) => (
              <tr key={idx} className="border-t border-slate-800/80 hover:bg-slate-800/30 font-mono text-xs">
                <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{entry.time}</td>
                <td className="px-4 py-3 text-cyan-300 font-sans font-medium">{entry.module}</td>
                <td className="px-4 py-3 font-sans">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    entry.level === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' :
                    entry.level === 'WARNING' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' :
                    entry.level === 'ERROR' ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30' :
                    'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                  }`}>
                    {entry.level}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-300 break-all">{entry.description}</td>
                <td className="px-4 py-3 text-slate-400 font-sans">{entry.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
