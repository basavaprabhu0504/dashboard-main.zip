import { useState } from 'react';
import { motion } from 'framer-motion';
import StatusCard from '../components/common/StatusCard';
import LineChartCard from '../components/charts/LineChartCard';
import PieChartCard from '../components/charts/PieChartCard';
import BasicTable from '../components/tables/BasicTable';
import { useVpnStatus } from '../hooks/useVpnStatus';
import { mockData } from '../services/mockData';
import { ShieldCheck, Database, Filter, Info } from 'lucide-react';

export default function PacketMonitoring() {
  const { status: vpnLiveStatus } = useVpnStatus();
  const [selectedModeFilter, setSelectedModeFilter] = useState('all');

  const currentMode = vpnLiveStatus.vpnRunning ? vpnLiveStatus.mode : 'idle';

  const packetStats = [
    {
      title: 'Current Tunnel Stream',
      value: vpnLiveStatus.vpnRunning
        ? `${vpnLiveStatus.mode?.toUpperCase().replace('_', ' ')} (${vpnLiveStatus.interfaceName})`
        : 'DISCONNECTED',
      subtitle: vpnLiveStatus.vpnRunning
        ? `Client ${vpnLiveStatus.localIp} ↔ Server ${vpnLiveStatus.peerIp}`
        : 'No Active Tunnel Stream',
      tone: vpnLiveStatus.vpnRunning ? 'green' : 'amber',
    },
    {
      title: 'Illustrative Packet Dataset',
      value: (14280).toLocaleString(),
      subtitle: 'UI sample — not measured evidence',
      tone: 'cyan',
    },
    {
      title: 'Active Transport',
      value: vpnLiveStatus.vpnRunning
        ? vpnLiveStatus.mode === 'classical'
          ? 'UDP / tun0'
          : vpnLiveStatus.mode === 'pqc'
          ? 'TCP 5559 / qvpn0'
          : 'TCP 5558 / qvpn0'
        : 'Standby',
      subtitle: 'Verified Lab Network',
      tone: 'purple',
    },
    {
      title: 'Authenticated Transcript Mode',
      value: currentMode === 'hybrid_v3' ? 'V3 ACTIVE (HMAC Bound)' : 'Disabled / Baseline',
      subtitle: currentMode === 'hybrid_v3' ? 'Mutual Verification Valid' : 'Classical/PQC/V2 Baseline',
      tone: currentMode === 'hybrid_v3' ? 'green' : 'blue',
    },
    {
      title: 'Illustrative Frame Size',
      value: '128 B',
      subtitle: 'UI sample — not measured evidence',
      tone: 'yellow',
    },
    {
      title: 'Evidence Origin',
      value: 'Host-Only Lab VMs',
      subtitle: 'Ubuntu 22.04 LTS Testbed',
      tone: 'blue',
    },
  ];

  // Illustrative UI rows only. These are not measured lab evidence.
  const archivedCaptures = [
    {
      time: '14:22:10',
      mode: 'hybrid_v3',
      source: '10.20.0.2',
      destination: '10.20.0.1:5558',
      protocol: 'TCP / QVPN-V3',
      status: 'Mutual Auth Validated',
      size: '128 B',
    },
    {
      time: '14:22:08',
      mode: 'hybrid_v3',
      source: '10.20.0.1',
      destination: '10.20.0.2:5558',
      protocol: 'TCP / QVPN-V3',
      status: 'Server Tag Validated',
      size: '128 B',
    },
    {
      time: '14:21:45',
      mode: 'hybrid',
      source: '10.20.0.2',
      destination: '10.20.0.1:5558',
      protocol: 'TCP / QVPN-V2',
      status: 'Dual KEM Unauthenticated',
      size: '128 B',
    },
    {
      time: '14:20:12',
      mode: 'pqc',
      source: '10.20.0.2',
      destination: '10.20.0.1:5559',
      protocol: 'TCP / ML-KEM-768',
      status: 'Kyber Key Encapsulation',
      size: '128 B',
    },
    {
      time: '14:18:05',
      mode: 'classical',
      source: '10.8.0.2',
      destination: '10.8.0.1',
      protocol: 'UDP / OpenVPN',
      status: 'AES-256-GCM Encrypted',
      size: '84 B',
    },
  ];

  const filteredCaptures =
    selectedModeFilter === 'all'
      ? archivedCaptures
      : archivedCaptures.filter((c) => c.mode === selectedModeFilter);

  const tableRows = filteredCaptures.map((p) => [
    p.time,
    p.mode.toUpperCase().replace('_', ' '),
    p.source,
    p.destination,
    p.protocol,
    p.status,
    p.size,
  ]);

  return (
    <div className="space-y-6">
      {/* Notice regarding live telemetry vs archived lab evidence */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400 flex items-start gap-3">
        <Info size={18} className="shrink-0 text-cyan-400 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-200 block mb-0.5">
            Lab Evaluation Telemetry & Saved Benchmarks
          </span>
          Live agent status above reflects the active connection mode ({currentMode?.toUpperCase()}). The charts and packet rows below are explicitly illustrative UI data, not live capture or measured experimental evidence.
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {packetStats.map((stat) => (
          <StatusCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            subtitle={stat.subtitle}
            tone={stat.tone}
          />
        ))}
      </div>

      {/* Traffic Charts */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <LineChartCard
          title="Illustrative Packet Throughput (not measured)"
          data={mockData.packets.liveFlow}
          color="#22c55e"
        />
        <LineChartCard
          title="Illustrative Protocol Timeline (not measured)"
          data={mockData.packets.trafficTimeline}
          color="#38bdf8"
        />
      </div>

      {/* Protocol Breakdown & Evidence Table */}
      <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <PieChartCard
          title="Illustrative Traffic Distribution (not measured)"
          data={mockData.packets.packetTypes}
        />

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-panel">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Illustrative Packet Rows (Not Evaluation Evidence)
              </h3>
              <p className="text-xs text-slate-400">
                UI demonstration data; use experiment logs for verified evidence
              </p>
            </div>

            {/* Mode Filter Buttons including hybrid_v3 */}
            <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {[
                { id: 'all', label: 'All Modes' },
                { id: 'classical', label: 'Classical' },
                { id: 'pqc', label: 'PQC' },
                { id: 'hybrid', label: 'Hybrid V2' },
                { id: 'hybrid_v3', label: 'Hybrid V3' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedModeFilter(filter.id)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    selectedModeFilter === filter.id
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <BasicTable
            headers={['Timestamp', 'Mode', 'Source', 'Destination', 'Protocol', 'Verification Status', 'Size']}
            rows={tableRows}
          />
        </div>
      </div>
    </div>
  );
}
