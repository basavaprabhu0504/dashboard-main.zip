import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, ArrowRight, FileText, ShieldAlert, TerminalSquare, RefreshCw } from 'lucide-react';
import StatusCard from '../components/common/StatusCard';
import { mockData } from '../services/mockData';
import { useVpnStatus } from '../hooks/useVpnStatus';
import { getExperimentHistory } from '../services/experimentHistory';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const { status, loading, startClassicalVpn, actionLoading, message } = useVpnStatus();
  const navigate = useNavigate();
  const [historyItems, setHistoryItems] = useState(() => getExperimentHistory());

  useEffect(() => {
    const update = () => setHistoryItems(getExperimentHistory());
    window.addEventListener('qvpn-history-updated', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('qvpn-history-updated', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  const recentEvents = historyItems.slice(0, 5).map((item) => {
    const isSuccess = item.success || item.outcome?.includes('rejected');
    const color = item.outcome === 'mitm_rejected' || item.outcome === 'downgrade_rejected'
      ? 'green'
      : item.outcome === 'mitm_succeeded' || item.outcome === 'downgrade_accepted'
      ? 'amber'
      : item.success ? 'blue' : 'red';

    return {
      id: item.id,
      title: item.title,
      time: item.completedAt ? new Date(item.completedAt).toLocaleTimeString() : 'Recent',
      detail: `Outcome: ${item.outcome?.replace('_', ' ').toUpperCase()} • ${item.category?.toUpperCase() || 'SECURITY'}`,
      color,
    };
  });

  const liveStats = [
    {
      label: 'VPN Status',
      value: status.vpnRunning ? 'Active & Connected' : 'Disconnected',
      subtitle: status.vpnRunning ? `Mode: ${status.mode?.toUpperCase().replace('_', ' ')}` : 'Standby',
      tone: status.vpnRunning ? 'green' : 'red',
    },
    {
      label: 'Active Interface',
      value: status.interfaceName || 'None',
      subtitle: status.vpnRunning ? `${status.localIp} ↔ ${status.peerIp}` : 'No allocation',
      tone: 'cyan',
    },
    {
      label: 'Tunnel Suite',
      value: status.mode ? status.mode.toUpperCase().replace('_', ' ') : 'Standby',
      subtitle: status.vpnRunning ? 'Active Tunnel' : 'Select mode in VPN Center',
      tone: 'purple',
    },
    {
      label: 'V3 Transcript Auth',
      value: status.mode === 'hybrid_v3' ? 'Verified (Mutual HMAC)' : 'Not Active',
      subtitle: 'Session binding integrity',
      tone: status.mode === 'hybrid_v3' ? 'green' : 'blue',
    },
    {
      label: 'Client Agent (:8000)',
      value: status.available ? 'Online & Ready' : 'Agent Offline',
      subtitle: '192.168.56.101',
      tone: status.available ? 'green' : 'amber',
    },
    {
      label: 'Attack Controller (:8010)',
      value: 'Ready for Testing',
      subtitle: 'MITM & Downgrade Suite',
      tone: 'blue',
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-slate-800 bg-gradient-to-br from-cyan-500/10 via-slate-900 to-slate-950 p-6 shadow-panel">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Mission Control Center</p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{mockData.project.name}</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">{mockData.project.description}</p>
          </div>
          <div className={`rounded-2xl border ${status.vpnRunning ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-300'} p-4`}>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Activity size={16} />
              {status.vpnRunning ? 'VPN Tunnel Active' : 'VPN Tunnel Stopped'}
            </div>
            <p className="mt-2 text-sm text-slate-300">Server: {status.serverOnline ? 'Online' : 'Offline'} | Client: {status.clientOnline ? 'Online' : 'Offline'}</p>
          </div>
        </div>
      </motion.div>

      {message && (
        <div className={`rounded-2xl border p-4 text-sm flex items-center justify-between ${message.type === 'success' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : message.type === 'error' ? 'border-rose-500/40 bg-rose-500/10 text-rose-300' : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'}`}>
          <span>{message.text}</span>
          <button onClick={() => navigate('/vpn')} className="underline ml-4">View VPN Page</button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {liveStats.map((stat) => (
          <StatusCard key={stat.label} title={stat.label} value={stat.value} subtitle={stat.subtitle || stat.change} tone={stat.tone} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-panel">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Recent Activity</h2>
              <p className="text-sm text-slate-400">Live events from experiment runs and tunnel controls</p>
            </div>
            <div className={`rounded-full border px-3 py-1 text-sm ${status.vpnRunning ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
              VPN {status.vpnRunning ? 'RUNNING' : 'STOPPED'}
            </div>
          </div>
          <div className="mt-6 space-y-4">
            {recentEvents.length > 0 ? (
              recentEvents.map((item) => (
                <div key={item.id || item.title} className="flex items-start gap-3">
                  <div className={`mt-1 h-3 w-3 rounded-full ${item.color === 'green' ? 'bg-emerald-400' : item.color === 'red' ? 'bg-rose-400' : item.color === 'blue' ? 'bg-cyan-400' : 'bg-amber-400'}`} />
                  <div className="flex-1 border-b border-slate-800 pb-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-slate-100">{item.title}</p>
                      <p className="text-sm text-slate-400">{item.time}</p>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{item.detail}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-5 text-center">
                <p className="text-sm font-medium text-slate-300">No experiments conducted yet</p>
                <p className="mt-1 text-xs text-slate-400">Launch a security experiment or start a VPN tunnel to record live session events.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-panel">
            <h2 className="text-xl font-semibold">Quick Actions</h2>
            <div className="mt-4 grid gap-3">
              <button 
                onClick={() => navigate('/vpn')} 
                className="flex items-center justify-between rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-left text-cyan-300 transition hover:bg-cyan-500/20"
              >
                <span className="flex items-center gap-2"><FileText size={16} />VPN Mode Center (4 Modes)</span>
                <ArrowRight size={16} />
              </button>
              <button 
                onClick={() => navigate('/attack')} 
                className="flex items-center justify-between rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-left text-rose-300 transition hover:bg-rose-500/20"
              >
                <span className="flex items-center gap-2"><ShieldAlert size={16} />Security Experiments (MITM / Downgrade)</span>
                <ArrowRight size={16} />
              </button>
              <button 
                onClick={() => navigate('/logs')} 
                className="flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left text-amber-300 transition hover:bg-amber-500/20"
              >
                <span className="flex items-center gap-2"><TerminalSquare size={16} />Lab Logs</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
