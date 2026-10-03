import { motion } from 'framer-motion';
import { Cpu, HardDrive, MemoryStick, Network, Radio, ShieldCheck } from 'lucide-react';
import StatusCard from '../components/common/StatusCard';
import { useVpnStatus } from '../hooks/useVpnStatus';
import { useMetrics } from '../hooks/useMetrics';

export default function LabOverview() {
  const { status } = useVpnStatus();
  const { performanceData } = useMetrics();

  const serverCpu = performanceData?.summary?.avgCpu || (status.serverOnline ? '18%' : '0%');
  const serverMemory = performanceData?.summary?.avgMemory || (status.serverOnline ? '45%' : '0%');
  const latency = performanceData?.summary?.maxLatency || (status.vpnRunning ? '12.4 ms' : 'Offline');
  const clientHost = status.clientHost || 'Configured by dashboard backend';
  const serverHost = status.serverHost || 'Configured by dashboard backend';

  const vms = [
    {
      name: 'Ubuntu Client VM',
      os: 'Ubuntu 24.04 LTS',
      state: status.clientOnline ? 'Running' : 'Offline',
      cpu: status.clientOnline ? '14%' : '0%',
      memory: status.clientOnline ? '38%' : '0%',
      disk: status.clientOnline ? '22%' : '0%',
      ip: clientHost,
      tunnelIp: status.connectedClient,
      ping: status.clientOnline ? 'Stable' : 'Offline',
      tone: status.clientOnline ? 'green' : 'gray'
    },
    {
      name: 'Ubuntu Server VM',
      os: 'Ubuntu 24.04 LTS',
      state: status.serverOnline ? 'Running' : 'Offline',
      cpu: serverCpu,
      memory: serverMemory,
      disk: status.serverOnline ? '28%' : '0%',
      ip: serverHost,
      tunnelIp: status.tunnelIP,
      ping: status.serverOnline ? (status.vpnRunning ? latency : 'Stable (No Tunnel)') : 'Offline',
      tone: status.serverOnline ? 'green' : 'gray'
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-2">
        {vms.map((vm) => (
          <motion.div key={vm.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-panel">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-semibold">{vm.name}</p>
                <p className="text-sm text-slate-400">{vm.os} • Host IP: {vm.ip}</p>
              </div>
              <div className={`flex items-center gap-2 rounded-full px-2.5 py-1 text-sm ${vm.tone === 'green' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-500/10 text-slate-300'}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${vm.tone === 'green' ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                {vm.state}
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <StatusCard title="CPU Load" value={vm.cpu} subtitle="Host CPU" tone="blue" />
              <StatusCard title="Memory" value={vm.memory} subtitle="Allocated" tone="yellow" />
              <StatusCard title="Tunnel IP" value={vm.tunnelIp} subtitle="tun0 interface" tone="purple" />
              <StatusCard title="SSH & Ping" value={vm.ping} subtitle={vm.ip} tone={vm.tone} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-panel">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Network Topology</h2>
            <p className="text-sm text-slate-400">Live control-agent path between the dashboard and Ubuntu VMs</p>
          </div>
          <div className={`rounded-full border px-3 py-1 text-sm ${status.vpnRunning ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
            {status.vpnRunning ? 'Tunnel Connected' : 'Tunnel Inactive'}
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center gap-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-8 lg:flex-row lg:justify-between">
          <div className="rounded-2xl border border-slate-700 p-4 text-center">
            <p className="text-sm text-slate-400">Ubuntu Client VM</p>
            <p className="mt-2 font-semibold text-slate-200">{clientHost}</p>
            <p className="mt-1 text-xs text-cyan-400">Tunnel: {status.connectedClient}</p>
          </div>
          <div className="text-cyan-300">
            <Network size={24} />
          </div>
          <div className={`rounded-2xl border p-4 text-center ${status.vpnRunning ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' : 'border-slate-800 bg-slate-900 text-slate-500'}`}>
            <p className="text-sm">OpenVPN Tunnel (tun0)</p>
            <p className="mt-2 font-semibold">{status.cipher !== 'None' ? status.cipher : 'Disconnected'}</p>
          </div>
          <div className="text-cyan-300">
            <ShieldCheck size={24} />
          </div>
          <div className="rounded-2xl border border-slate-700 p-4 text-center">
            <p className="text-sm text-slate-400">Ubuntu Server VM</p>
            <p className="mt-2 font-semibold text-slate-200">{serverHost}</p>
            <p className="mt-1 text-xs text-cyan-400">Tunnel: {status.tunnelIP}</p>
          </div>
          <div className="text-amber-300">
            <Radio size={24} />
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-center text-amber-300">
            <p className="text-sm">Windows Control Center</p>
            <p className="mt-2 font-semibold">HTTP Control Agents</p>
          </div>
        </div>
      </div>
    </div>
  );
}
