import { motion } from 'framer-motion';
import LineChartCard from '../components/charts/LineChartCard';
import StatusCard from '../components/common/StatusCard';
import { useMetrics } from '../hooks/useMetrics';
import { mockData } from '../services/mockData';

export default function Performance() {
  const { performanceData } = useMetrics();

  const summary = performanceData?.summary;
  const charts = performanceData?.charts;

  const metrics = [
    { title: 'Average Handshake', value: summary?.avgHandshake || 'N/A', subtitle: 'Measured backend value', tone: 'green' },
    { title: 'Maximum Latency', value: summary?.maxLatency || 'N/A', subtitle: 'Measured backend value', tone: 'blue' },
    { title: 'Average CPU', value: summary?.avgCpu || 'N/A', subtitle: 'Measured backend value', tone: 'yellow' },
    { title: 'Average Memory', value: summary?.avgMemory || 'N/A', subtitle: 'Measured backend value', tone: 'green' },
    { title: 'Packets/sec', value: summary?.packetsPerSec || 'N/A', subtitle: 'Measured backend value', tone: 'blue' },
    { title: 'Connection Stability', value: summary?.stability || 'N/A', subtitle: 'Measured backend value', tone: 'green' },
  ];

  const handshakeData = charts?.handshake?.length ? charts.handshake : mockData.performance.handshake;
  const latencyData = charts?.latency?.length ? charts.latency : mockData.performance.latency;
  const cpuData = charts?.cpu?.length ? charts.cpu : mockData.performance.cpu;
  const memoryData = charts?.memory?.length ? charts.memory : mockData.performance.memory;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <StatusCard key={metric.title} title={metric.title} value={metric.value} subtitle={metric.subtitle} tone={metric.tone} />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <LineChartCard title="Handshake Time (ms)" data={handshakeData} color="#38bdf8" />
        <LineChartCard title="Latency (ms)" data={latencyData} color="#f59e0b" />
        <LineChartCard title="CPU Usage (%)" data={cpuData} color="#22c55e" />
        <LineChartCard title="Memory Usage (%)" data={memoryData} color="#8b5cf6" />
      </div>
    </div>
  );
}
