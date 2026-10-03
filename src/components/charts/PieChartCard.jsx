import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function PieChartCard({ title, data }) {
  const chartData = {
    labels: ['Encrypted', 'Modified', 'Dropped', 'Flagged'],
    datasets: [{ data, backgroundColor: ['#22c55e', '#38bdf8', '#f59e0b', '#ef4444'] }],
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-panel">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</h3>
      <Pie data={chartData} options={{ responsive: true }} />
    </div>
  );
}
