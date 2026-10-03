import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

export default function LineChartCard({ title, data, color = '#38bdf8' }) {
  const chartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        data,
        borderColor: color,
        backgroundColor: `${color}33`,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-panel">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</h3>
      <Line data={chartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
    </div>
  );
}
