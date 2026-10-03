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
    { title: 'Average Handshake', value: summary?.avgHandshake || '18 ms', subtitle: 'OpenVPN Handshake', tone: 'green' },
    { title: 'Maximum Latency', value: summary?.maxLatency || '22 ms', subtitle: 'ICMP Tunnel Ping', tone: 'blue' },
    { title: 'Average CPU', value: summary?.avgCpu || '18%', subtitle: 'Server VM CPU', tone: 'yellow' },
    { title: 'Average Memory', value: summary?.avgMemory || '45%', subtitle: 'Server RAM Used', tone: 'green' },
    { title: 'Packets/sec', value: summary?.packetsPerSec || '1.4k', subtitle: 'Peak throughput', tone: 'blue' },
    { title: 'Connection Stability', value: summary?.stability || '99.2%', subtitle: 'Ping reliability', tone: 'green' },
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
