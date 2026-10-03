import { Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import LabOverview from './pages/LabOverview';
import VPNConfiguration from './pages/VPNConfiguration';
import AttackControl from './pages/AttackControl';
import PacketMonitoring from './pages/PacketMonitoring';
import Performance from './pages/Performance';
import Logs from './pages/Logs';
import Results from './pages/Results';
import Comparison from './pages/Comparison';
import Report from './pages/Report';

function App() {
  const location = useLocation();

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/lab" element={<LabOverview />} />
            <Route path="/vpn" element={<VPNConfiguration />} />
            <Route path="/attack" element={<AttackControl />} />
            <Route path="/packets" element={<PacketMonitoring />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/results" element={<Results />} />
            <Route path="/comparison" element={<Comparison />} />
            <Route path="/report" element={<Report />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}

export default App;
