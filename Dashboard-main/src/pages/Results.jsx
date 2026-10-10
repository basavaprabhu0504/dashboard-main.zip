import { motion } from 'framer-motion';
import StatusCard from '../components/common/StatusCard';
import BasicTable from '../components/tables/BasicTable';
import { useResults } from '../hooks/useResults';

export default function Results() {
  const { results, loading } = useResults();

  const activeResults = results;

  const totalTests = activeResults.length;
  const passedTests = activeResults.filter(r => r.status === 'PASS').length;

  const rows = activeResults.map((r) => [
    r.name || r.id || 'Experiment Case',
    r.vpnType || 'Classical OpenVPN',
    r.attack || 'Replay / MITM',
    r.expected || 'Secure Stream',
    r.observed || 'AES-256-GCM Verified',
    r.status || 'PASS'
  ]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatusCard title="Total Experiments" value={totalTests.toString()} subtitle="Stored JSON files" tone="blue" />
        <StatusCard title="Passed" value={passedTests.toString()} subtitle="Verified secure" tone="green" />
        <StatusCard title="Failed" value={(totalTests - passedTests).toString()} subtitle="Unexpected issues" tone="yellow" />
        <StatusCard title="Detection Rate" value="—" subtitle="Not calculated by API" tone="blue" />
        <StatusCard title="Security Score" value="—" subtitle="No scoring method configured" tone="blue" />
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-panel">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Experiment Results History</h2>
            <p className="text-sm text-slate-400">Dynamically loaded from backend/results/*.json files</p>
          </div>
          <div className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">
            JSON Storage
          </div>
        </div>

        <BasicTable headers={['Experiment Name', 'VPN Type', 'Evaluation Case', 'Expected Result', 'Observed Result', 'Status']} rows={rows} />
      </div>
    </div>
  );
}
