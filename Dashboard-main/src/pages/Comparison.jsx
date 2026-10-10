import { motion } from 'framer-motion';
import { Radar } from 'react-chartjs-2';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { ShieldCheck, ShieldAlert, Cpu, Layers, CheckCircle2, XCircle } from 'lucide-react';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function Comparison() {
  const comparisonData = {
    labels: ['Quantum Resistance', 'MITM Defense', 'Downgrade Immunity', 'Throughput Speed', 'Handshake Efficiency'],
    datasets: [
      {
        label: 'Classical OpenVPN',
        data: [20, 85, 80, 85, 75],
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        borderColor: '#38bdf8',
        borderWidth: 2,
      },
      {
        label: 'Post-Quantum (ML-KEM)',
        data: [95, 70, 70, 80, 78],
        backgroundColor: 'rgba(168, 85, 247, 0.15)',
        borderColor: '#a855f7',
        borderWidth: 2,
      },
      {
        label: 'Hybrid V2 (Baseline)',
        data: [95, 30, 40, 75, 70],
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        borderColor: '#f59e0b',
        borderWidth: 2,
      },
      {
        label: 'Hybrid V3 (Authenticated)',
        data: [98, 98, 98, 74, 68],
        backgroundColor: 'rgba(16, 185, 129, 0.25)',
        borderColor: '#10b981',
        borderWidth: 2.5,
      },
    ],
  };

  const comparisonRows = [
    {
      metric: 'Key Encapsulation / Exchange',
      classical: 'ECDHE / RSA 2048',
      pqc: 'ML-KEM-768 (Kyber)',
      hybridV2: 'X25519 + ML-KEM-768',
      hybridV3: 'X25519 + ML-KEM-768',
    },
    {
      metric: 'Mutual Transcript Authentication',
      classical: 'TLS Certificate Auth',
      pqc: 'None (Transport only)',
      hybridV2: 'None (Unauthenticated)',
      hybridV3: 'HMAC Transcript Binding',
    },
    {
      metric: 'In-Path MITM Interception',
      classical: 'Resistant (PKI)',
      pqc: 'Vulnerable (No MITM defense)',
      hybridV2: 'Vulnerable (Decrypted ICMP)',
      hybridV3: 'Defended (SERVER AUTH FAILED)',
    },
    {
      metric: 'Downgrade Attack Resistance',
      classical: 'Standard TLS Rules',
      pqc: 'Vulnerable in harness',
      hybridV2: 'Vulnerable (Tampering accepted)',
      hybridV3: 'Defended (Rejected before select)',
    },
    {
      metric: 'Quantum Resistance Guarantee',
      classical: 'None (Vulnerable to Shor\'s)',
      pqc: 'High (Lattice Cryptography)',
      hybridV2: 'High (Dual KEM)',
      hybridV3: 'Highest (Dual KEM + Auth)',
    },
    {
      metric: 'Average Handshake Latency',
      classical: '18.4 ms',
      pqc: '24.2 ms',
      hybridV2: '28.6 ms',
      hybridV3: '31.2 ms',
    },
    {
      metric: 'Tunnel Virtual Interface',
      classical: 'tun0',
      pqc: 'qvpn0',
      hybridV2: 'qvpn0',
      hybridV3: 'qvpn0',
    },
    {
      metric: 'Transport Port',
      classical: 'UDP 1194',
      pqc: 'TCP 5559',
      hybridV2: 'TCP 5558',
      hybridV3: 'TCP 5558',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100">
              Cryptographic Architecture Matrix (4 Modes)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Architecture comparison. Numerical radar and latency values are illustrative unless replaced with measured benchmark data.
            </p>
          </div>
          <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300 border border-cyan-500/30 self-start sm:self-auto">
            Qualitative / Illustrative
          </span>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-800">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-800/80 text-left text-slate-300 font-semibold">
              <tr>
                <th className="px-4 py-3">Security & Performance Attribute</th>
                <th className="px-4 py-3 text-cyan-300">Classical OpenVPN</th>
                <th className="px-4 py-3 text-purple-300">Post-Quantum (PQC)</th>
                <th className="px-4 py-3 text-amber-300">Hybrid V2 (Baseline)</th>
                <th className="px-4 py-3 text-emerald-300">Hybrid V3 (Authenticated)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {comparisonRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition">
                  <td className="px-4 py-3 font-sans text-slate-300 font-medium">{row.metric}</td>
                  <td className="px-4 py-3 text-slate-200">{row.classical}</td>
                  <td className="px-4 py-3 text-slate-200">{row.pqc}</td>
                  <td className="px-4 py-3 text-slate-200">{row.hybridV2}</td>
                  <td className="px-4 py-3 text-emerald-300 font-semibold">{row.hybridV3}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-panel">
        <h2 className="text-xl font-bold text-slate-100">Comparative Security & Performance Radar</h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">
          Illustrative qualitative visualization; do not cite these scores as measured experimental results.
        </p>
        <div className="max-w-2xl mx-auto py-2">
          <Radar
            data={comparisonData}
            options={{
              responsive: true,
              scales: {
                r: {
                  angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                  grid: { color: 'rgba(255, 255, 255, 0.1)' },
                  pointLabels: { color: '#94a3b8', font: { size: 11 } },
                  ticks: { display: false, maxTicksLimit: 5 },
                },
              },
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: { color: '#e2e8f0', boxWidth: 14, font: { size: 12 } },
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
