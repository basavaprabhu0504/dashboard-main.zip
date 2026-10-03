import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  PlayCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Terminal,
  Activity,
  Server,
  Monitor,
  Radio,
  FileText,
  Clock,
  ExternalLink,
} from 'lucide-react';
import {
  EXPERIMENT_DEFINITIONS,
  runSecurityExperiment,
  getExperimentControllerStatus,
} from '../services/experimentService';
import { useVpnStatus } from '../hooks/useVpnStatus';

export default function AttackControl() {
  const { status: vpnStatus, stopVpn } = useVpnStatus();

  const [activeTab, setActiveTab] = useState('mitm'); // 'mitm' | 'downgrade'
  const [runningExperimentId, setRunningExperimentId] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [controllerState, setControllerState] = useState(null);
  const [currentResult, setCurrentResult] = useState(null);
  const [selectedLogTab, setSelectedLogTab] = useState('summary');
  const [errorMessage, setErrorMessage] = useState(null);

  const timerRef = useRef(null);
  const pollRef = useRef(null);

  // Check experiment controller status periodically
  useEffect(() => {
    const checkController = async () => {
      const state = await getExperimentControllerStatus();
      setControllerState(state);
    };
    checkController();
    const interval = setInterval(checkController, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleStartExperiment = async (experiment) => {
    if (runningExperimentId) return;

    if (vpnStatus.vpnRunning) {
      setErrorMessage(
        `Normal VPN tunnel (${vpnStatus.mode?.toUpperCase()}) is currently active. The experiment controllers require all normal VPN tunnels to be stopped before running.`
      );
      return;
    }

    setErrorMessage(null);
    setRunningExperimentId(experiment.id);
    setCurrentResult(null);
    setElapsedSeconds(0);
    setSelectedLogTab('summary');

    // Start elapsed timer
    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    // Poll controller status while running
    pollRef.current = setInterval(async () => {
      const state = await getExperimentControllerStatus();
      setControllerState(state);
    }, 2000);

    try {
      const outcome = await runSecurityExperiment(experiment.payload);

      if (outcome.success) {
        setCurrentResult({
          experiment,
          success: true,
          status: outcome.status,
          outcome: outcome.outcome,
          data: outcome.data,
          completedAt: new Date().toLocaleTimeString(),
        });
      } else {
        setCurrentResult({
          experiment,
          success: false,
          status: outcome.status,
          outcome: outcome.outcome || 'inconclusive',
          error: outcome.error,
          data: outcome.data,
          completedAt: new Date().toLocaleTimeString(),
        });
        setErrorMessage(outcome.error || 'Experiment execution was inconclusive or failed.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error occurred while contacting experiment controller.');
      setCurrentResult({
        experiment,
        success: false,
        outcome: 'error',
        error: err.message,
      });
    } finally {
      clearInterval(timerRef.current);
      clearInterval(pollRef.current);
      setRunningExperimentId(null);
      // Fresh controller status check
      const finalState = await getExperimentControllerStatus();
      setControllerState(finalState);
    }
  };

  const mitmExperiments = EXPERIMENT_DEFINITIONS.filter((e) => e.category === 'mitm');
  const downgradeExperiments = EXPERIMENT_DEFINITIONS.filter((e) => e.category === 'downgrade');

  return (
    <div className="space-y-6">
      {/* Top Advisory Banner */}
      <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-300 shadow-panel backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="shrink-0 mt-0.5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold text-amber-200 uppercase tracking-wide">
                Controlled Security Evaluation Environment
              </h2>
              <p className="text-xs text-amber-300/80 mt-0.5 leading-relaxed">
                Clickable demonstrations orchestrate the Windows in-path attacker (192.168.56.1:8011) and VM controllers (192.168.56.101:8010 & 192.168.56.102:8010). All requests run on the isolated host-only testbed.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <span className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs font-mono text-slate-300">
              <span
                className={`h-2 w-2 rounded-full ${
                  controllerState?.online ? 'bg-emerald-400' : 'bg-rose-500'
                }`}
              />
              Controller {controllerState?.online ? 'Ready (:8010)' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Warning if Normal VPN is currently active */}
        {vpnStatus.vpnRunning && (
          <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/15 p-3.5 text-xs text-rose-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-rose-400 shrink-0" />
              <span>
                <strong>Warning:</strong> A normal VPN tunnel ({vpnStatus.mode?.toUpperCase()}) is active. Preflight requires all tunnels stopped before launching attack experiments.
              </span>
            </div>
            <button
              onClick={stopVpn}
              className="rounded-lg border border-rose-500/40 bg-rose-500/30 px-3 py-1 text-xs font-bold text-rose-200 hover:bg-rose-500/50"
            >
              Disconnect VPN
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-950/60 p-3 text-xs text-rose-300 flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="underline font-mono text-rose-400">
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('mitm')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'mitm'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <ShieldAlert size={16} />
          In-Path MITM Experiments (Windows Attacker)
        </button>
        <button
          onClick={() => setActiveTab('downgrade')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'downgrade'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Radio size={16} />
          Negotiation Downgrade Harness (Local Tampering)
        </button>
      </div>

      {/* SECTION 1: IN-PATH MITM ATTACKS */}
      {activeTab === 'mitm' && (
        <div className="space-y-6">
          <div className="text-xs text-slate-400 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <strong>Demonstration Architecture:</strong> The Windows Host (`192.168.56.1:8011`) acts as a transparent cryptographic proxy between the Client VM (`192.168.56.101`) and Server VM (`192.168.56.102`). Tests evaluate whether the tunnel protocol can detect active interception and prevent session establishment.
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {mitmExperiments.map((exp) => {
              const isRunning = runningExperimentId === exp.id;
              const isV2 = exp.id === 'mitm-v2';

              return (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-3xl border p-6 shadow-panel flex flex-col justify-between ${
                    isV2
                      ? 'border-rose-900/40 bg-slate-900/80'
                      : 'border-emerald-900/40 bg-slate-900/80 ring-1 ring-emerald-500/20'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-100">{exp.title}</h3>
                        <p className="text-xs text-slate-400 mt-1">{exp.target}</p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider border ${
                          isV2
                            ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                            : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        }`}
                      >
                        {exp.expectedVerdict}
                      </span>
                    </div>

                    <p className="mt-4 text-xs text-slate-300 leading-relaxed">
                      {exp.description}
                    </p>

                    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 text-xs font-mono space-y-1 text-slate-400">
                      <div>
                        <span className="text-slate-500">Expected Outcome: </span>
                        <span className={isV2 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                          {exp.expectedOutcome}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Validation: </span>
                        <span>{exp.evidenceExpected}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800">
                    <button
                      onClick={() => handleStartExperiment(exp)}
                      disabled={runningExperimentId !== null || vpnStatus.vpnRunning}
                      className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition ${
                        isRunning
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : runningExperimentId !== null || vpnStatus.vpnRunning
                          ? 'bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed'
                          : isV2
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                      }`}
                    >
                      {isRunning ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          RUNNING ATTACK DEMO ({elapsedSeconds}s)...
                        </>
                      ) : (
                        <>
                          <PlayCircle size={16} />
                          EXECUTE {exp.payload.version.toUpperCase()} EXPERIMENT
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: DOWNGRADE SCENARIOS */}
      {activeTab === 'downgrade' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/30 p-4 text-xs text-cyan-200">
            <p className="font-semibold uppercase tracking-wider mb-1">
              Methodology: Negotiation Harness (Local Offer Tampering)
            </p>
            <p className="text-cyan-300/80 leading-relaxed">
              <strong>Notice:</strong> This harness alters the client’s cipher suite proposal locally before transmission across port 5560. It simulates an active adversary tampering with negotiation proposals. Compare baseline (unauthenticated) vs. authenticated V3 transcript-bound negotiation side by side.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {[
              {
                title: 'Scenario 1: Hybrid → PQC',
                desc: 'Adversary strips Classical ECDH from Hybrid offer.',
                baselineId: 'downgrade-hybrid-to-pqc-baseline',
                authId: 'downgrade-hybrid-to-pqc-auth',
              },
              {
                title: 'Scenario 2: Hybrid → Classical',
                desc: 'Adversary strips Post-Quantum ML-KEM from Hybrid offer.',
                baselineId: 'downgrade-hybrid-to-classical-baseline',
                authId: 'downgrade-hybrid-to-classical-auth',
              },
              {
                title: 'Scenario 3: PQC → Classical',
                desc: 'Adversary strips PQC offer down to Classical only.',
                baselineId: 'downgrade-pqc-to-classical-baseline',
                authId: 'downgrade-pqc-to-classical-auth',
              },
            ].map((group, idx) => {
              const baselineExp = EXPERIMENT_DEFINITIONS.find((e) => e.id === group.baselineId);
              const authExp = EXPERIMENT_DEFINITIONS.find((e) => e.id === group.authId);

              return (
                <div
                  key={idx}
                  className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-panel flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-base font-bold text-slate-100">{group.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">{group.desc}</p>

                    <div className="mt-4 space-y-3">
                      {/* Baseline Option */}
                      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-amber-300">Baseline (Unauthenticated)</span>
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
                            Downgrade Accepted
                          </span>
                        </div>
                        <p className="text-slate-400 mt-1 text-[11px]">
                          Server accepts tampered lower suite.
                        </p>
                        <button
                          onClick={() => handleStartExperiment(baselineExp)}
                          disabled={runningExperimentId !== null || vpnStatus.vpnRunning}
                          className="mt-3 w-full rounded-xl border border-amber-500/30 bg-amber-500/10 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition disabled:opacity-50"
                        >
                          {runningExperimentId === baselineExp.id ? (
                            <span className="flex items-center justify-center gap-1.5">
                              <RefreshCw size={12} className="animate-spin" />
                              Running ({elapsedSeconds}s)...
                            </span>
                          ) : (
                            'Run Baseline Test'
                          )}
                        </button>
                      </div>

                      {/* Authenticated Option */}
                      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-emerald-300">V3 Protected (Authenticated)</span>
                          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300">
                            Downgrade Rejected
                          </span>
                        </div>
                        <p className="text-slate-400 mt-1 text-[11px]">
                          HMAC transcript auth detects tampering & aborts.
                        </p>
                        <button
                          onClick={() => handleStartExperiment(authExp)}
                          disabled={runningExperimentId !== null || vpnStatus.vpnRunning}
                          className="mt-3 w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition disabled:opacity-50"
                        >
                          {runningExperimentId === authExp.id ? (
                            <span className="flex items-center justify-center gap-1.5">
                              <RefreshCw size={12} className="animate-spin" />
                              Running ({elapsedSeconds}s)...
                            </span>
                          ) : (
                            'Run Authenticated Test'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Run Status Indicator */}
      <AnimatePresence>
        {runningExperimentId && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="rounded-3xl border border-cyan-500/40 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RefreshCw size={24} className="text-cyan-400 animate-spin" />
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Executing Security Experiment: {runningExperimentId}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Coordinating target binaries, Windows attacker script, and verification probes...
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 font-mono text-sm text-cyan-300 bg-cyan-950/60 px-3 py-1.5 rounded-xl border border-cyan-500/30">
                <Clock size={16} />
                <span>{elapsedSeconds}s elapsed</span>
              </div>
            </div>
            <div className="mt-4 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <motion.div
                className="bg-cyan-400 h-full"
                animate={{ width: ['0%', '100%'] }}
                transition={{ duration: 45, ease: 'linear' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Experiment Results & Evidence Viewer */}
      {currentResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-panel backdrop-blur-xl space-y-5"
        >
          {/* Result Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                {currentResult.success ? (
                  <CheckCircle2 size={22} className="text-emerald-400 shrink-0" />
                ) : (
                  <XCircle size={22} className="text-rose-400 shrink-0" />
                )}
                <h3 className="text-lg font-bold text-slate-100">
                  Experiment Outcome: {currentResult.outcome?.toUpperCase()}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {currentResult.experiment.title} • Completed at {currentResult.completedAt}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider border ${
                  currentResult.outcome === 'mitm_rejected' || currentResult.outcome === 'downgrade_rejected'
                    ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                    : currentResult.outcome === 'mitm_succeeded' || currentResult.outcome === 'downgrade_accepted'
                    ? 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                    : 'border-rose-500/40 bg-rose-500/20 text-rose-300'
                }`}
              >
                Outcome: {currentResult.outcome}
              </span>
            </div>
          </div>

          {/* Evidence Tabs */}
          <div className="flex gap-2 border-b border-slate-800 pb-2 text-xs">
            <button
              onClick={() => setSelectedLogTab('summary')}
              className={`rounded-lg px-3 py-1.5 font-medium transition ${
                selectedLogTab === 'summary'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Overview & Verification
            </button>
            {currentResult.data?.attacker_log && (
              <button
                onClick={() => setSelectedLogTab('attacker')}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  selectedLogTab === 'attacker'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Windows Attacker Log
              </button>
            )}
            {currentResult.data?.client_log && (
              <button
                onClick={() => setSelectedLogTab('client')}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  selectedLogTab === 'client'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Client VM Log
              </button>
            )}
            {currentResult.data?.server_log && (
              <button
                onClick={() => setSelectedLogTab('server')}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  selectedLogTab === 'server'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Server VM Log
              </button>
            )}
            {currentResult.data?.client_ping && (
              <button
                onClick={() => setSelectedLogTab('ping')}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  selectedLogTab === 'ping'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Client Ping Output
              </button>
            )}
          </div>

          {/* Tab Content Display */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 max-h-72 overflow-y-auto">
            {selectedLogTab === 'summary' && (
              <div className="space-y-3 font-sans text-xs">
                <div className="grid gap-2 sm:grid-cols-2 text-slate-300">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[11px]">Experiment Type</span>
                    <span className="font-semibold text-slate-200">{currentResult.experiment.title}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[11px]">Reported Outcome</span>
                    <span className="font-semibold text-cyan-300">{currentResult.outcome}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300">
                  <span className="text-slate-400 font-semibold block mb-1">Observed Cryptographic Verdict:</span>
                  {currentResult.outcome === 'mitm_rejected' && (
                    <p className="text-emerald-300">
                      Mutual transcript authentication detected in-path tampering. Handshake tags mismatched; client aborted connection (`SERVER AUTHENTICATION FAILED`) and prevented tunnel creation. Post-run checks confirmed `qvpn0` was absent and the attacker session terminated.
                    </p>
                  )}
                  {currentResult.outcome === 'mitm_succeeded' && (
                    <p className="text-rose-300">
                      Unauthenticated Hybrid V2 lacked transcript binding. The Windows attacker successfully established dual sessions and decrypted live ICMP packets in-flight.
                    </p>
                  )}
                  {currentResult.outcome === 'downgrade_rejected' && (
                    <p className="text-emerald-300">
                      Server detected proposal tampering via HMAC validation and rejected negotiation before suite selection (`CLIENT NEGOTIATION AUTHENTICATION FAILED`).
                    </p>
                  )}
                  {currentResult.outcome === 'downgrade_accepted' && (
                    <p className="text-amber-300">
                      Unauthenticated baseline negotiation accepted the tampered proposal, successfully forcing a downgrade to the lower cipher suite.
                    </p>
                  )}
                </div>
              </div>
            )}

            {selectedLogTab === 'attacker' && (
              <pre className="whitespace-pre-wrap text-slate-300">
                {currentResult.data?.attacker_log || 'No attacker log returned.'}
              </pre>
            )}

            {selectedLogTab === 'client' && (
              <pre className="whitespace-pre-wrap text-slate-300">
                {currentResult.data?.client_log || 'No client log returned.'}
              </pre>
            )}

            {selectedLogTab === 'server' && (
              <pre className="whitespace-pre-wrap text-slate-300">
                {currentResult.data?.server_log || 'No server log returned.'}
              </pre>
            )}

            {selectedLogTab === 'ping' && (
              <pre className="whitespace-pre-wrap text-emerald-300">
                {currentResult.data?.client_ping || 'No ping data recorded.'}
              </pre>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
