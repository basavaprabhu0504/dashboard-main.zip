import { useState } from 'react';
import { motion } from 'framer-motion';

export default function Report() {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 1400);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Export Report</h2>
            <p className="mt-2 text-sm text-slate-400">Generate a polished executive brief for technical stakeholders and lab reviewers.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={handleGenerate} className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-cyan-300">Generate PDF Report</button>
            <button className="rounded-2xl border border-slate-700 bg-slate-800/70 px-4 py-2 text-slate-300">Export Logs</button>
            <button className="rounded-2xl border border-slate-700 bg-slate-800/70 px-4 py-2 text-slate-300">Export Graphs</button>
          </div>
        </div>
        {isGenerating && (
          <div className="mt-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-sm text-cyan-300">
            Report generation in progress… preparing executive summary, comparison analysis, and packet insights.
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-panel">
          <h3 className="text-lg font-semibold">Report Preview</h3>
          <div className="mt-4 space-y-4 text-sm text-slate-300">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="font-semibold text-slate-100">Executive Summary</p>
              <p className="mt-2">Quantum-safe transport demonstrated resilience against downgrade and replay conditions while preserving strong throughput.</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="font-semibold text-slate-100">Experiment Overview</p>
              <p className="mt-2">The lab successfully validated hybrid handshake efficiency, detection coverage, and packet integrity.</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="font-semibold text-slate-100">Final Verdict</p>
              <p className="mt-2">Hybrid architecture produced the strongest performance-security balance and is the preferred candidate for further evaluation.</p>
            </div>
          </div>
        </motion.div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-panel">
          <h3 className="text-lg font-semibold">Export Options</h3>
          <div className="mt-4 grid gap-3">
            <button className="rounded-2xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-left text-slate-300">Download CSV</button>
            <button className="rounded-2xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-left text-slate-300">Download JSON</button>
            <button className="rounded-2xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-left text-slate-300">Download Screenshots</button>
          </div>
        </div>
      </div>
    </div>
  );
}
