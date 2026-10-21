import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  ShieldCheck,
  Server,
  Laptop,
  ArrowRight,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Key,
  FileCode,
  Layers,
  Network,
  Cpu,
  Lock,
  Unlock,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  ExternalLink,
  X,
  Presentation,
  Bot,
  Sparkles,
  Send,
  HelpCircle,
  Eye,
  EyeOff,
  Shield,
  Activity,
} from 'lucide-react';
import { useVpnStatus } from '../hooks/useVpnStatus';

// Presentation embed & direct URLs (Published to web)
const PPT_EMBED_URL =
  'https://docs.google.com/presentation/d/e/2PACX-1vSb-UOvEr-Fk19xfqVjTyUrCl8xJWEzGhuZPXYGYN53XBKuUHXasRJWy-NpNiERpNdeJqatIpLW2fCT/embed?start=false&loop=false&delayms=3000';
const PPT_DIRECT_URL =
  'https://docs.google.com/presentation/d/e/2PACX-1vSb-UOvEr-Fk19xfqVjTyUrCl8xJWEzGhuZPXYGYN53XBKuUHXasRJWy-NpNiERpNdeJqatIpLW2fCT/pub?start=false&loop=false&delayms=3000';

// AI Co-Pilot Knowledge Base
const COPILOT_QA = {
  pqc: {
    q: 'Explain post-quantum cryptography.',
    summary:
      'Post-Quantum Cryptography (PQC) consists of cryptographic algorithms designed to resist cryptanalytic attacks executed on sufficiently capable quantum computers.',
    detail:
      "Classical public-key schemes like RSA and ECC rely on integer factorisation and discrete logarithms, which Shor's algorithm solves in polynomial time O((log N)³). PQC replaces them with hard mathematical problems like lattice-based cryptography (e.g., Module Learning With Errors in ML-KEM-768), which have no known efficient quantum shortcuts.",
  },
  auth: {
    q: 'Why does a VPN need authentication?',
    summary:
      'Encryption provides confidentiality, but authentication proves who is on the other end of the wire. Without authentication, you could be encrypting traffic to an attacker.',
    detail:
      'In a key-exchange protocol, ephemeral key shares establish a shared secret. If an in-path adversary intercepts those shares and substitutes their own, both parties successfully derive session keys, but with the adversary. Mutual authentication (such as pre-shared keys, digital signatures, or transcript HMACs) binds the identities and guarantees negotiation integrity.',
  },
  mitm: {
    q: 'Show me how the MITM attack works.',
    summary:
      'The Windows intermediary intercepts the unauthenticated hybrid handshake, splitting it into two independent, encrypted sessions.',
    detail:
      '1. Client sends ephemeral X25519 + ML-KEM public keys to port 15558.\n2. Relay terminates Client session, deriving Session Key A.\n3. Relay originates an independent connection to Server port 5558, deriving Session Key B.\n4. When the Client transmits data over qvpn0, Relay decrypts with Key A, prints the plaintext payload, re-encrypts with Key B, and forwards it to the Server. Neither algorithm is broken—the key binding is missing.',
  },
  defence: {
    q: 'How does the authenticated hybrid handshake work?',
    summary:
      'It cryptographically binds the entire handshake transcript using a 32-byte pre-shared key (PSK) and constant-time HMAC-SHA256 verification.',
    detail:
      'Both endpoints assemble a transcript prefixed with "QVPN-AUTH-HYBRID-V1" containing protocol version, role, nonces, and public key shares. The sender appends HMAC-SHA256(PSK, transcript). The receiver checks this in constant time with CRYPTO_memcmp. Any in-path manipulation breaks the tag, aborting the connection before the network interface is ever allocated.',
  },
  modes: {
    q: 'What is the difference between PQC-only and Hybrid mode?',
    summary:
      'PQC-only relies solely on ML-KEM-768, while Hybrid combines classical X25519 Diffie-Hellman with ML-KEM-768 using dual-KEM HKDF.',
    detail:
      'Migration standards (NIST & BSI) recommend hybrid key establishment: if an unforeseen mathematical flaw is discovered in lattice cryptography, the mature classical algorithm (X25519) still protects the session. Conversely, if a quantum adversary attacks the classical component, ML-KEM-768 prevents retrospective decryption ("harvest now, decrypt later").',
  },
  viva: {
    q: 'Explain the QVPN project for a viva.',
    summary:
      'QVPN is a real-world cybersecurity evaluation platform proving that post-quantum confidentiality is insufficient against active adversaries without mutual authentication.',
    detail:
      'The project evaluates four VPN modes across a 3-node physical/virtual testbed. It experimentally demonstrates a full two-leg MITM attack against unauthenticated hybrid tunnels, and validates an authenticated transcript HMAC mitigation that thwarts interception, downgrade, and replay attacks with minimal computational overhead (~0.05 ms latency impact).',
  },
};

export default function QVPN() {
  const { status: liveStatus } = useVpnStatus();

  // ─── PRESENTATION MODAL STATE ──────────────────────────────────────
  const [isPptOpen, setIsPptOpen] = useState(false);
  const [isPptFullscreen, setIsPptFullscreen] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  // ─── CHAPTER 1: QUANTUM THREAT STEPPER ─────────────────────────────
  const [quantumStage, setQuantumStage] = useState(0); // 0: Classical, 1: Quantum Threat, 2: Post-Quantum
  const [showQuantumDetails, setShowQuantumDetails] = useState(false);

  // ─── CHAPTER 2: HOW VPNS WORK INTERACTION ──────────────────────────
  const [vpnAuthActive, setVpnAuthActive] = useState(true);
  const [showVpnDetails, setShowVpnDetails] = useState(false);

  // ─── CHAPTER 3 & 4: MITM SIMULATOR STATE ───────────────────────────
  const [mitmMode, setMitmMode] = useState('mitm'); // 'normal' | 'mitm' | 'protected'
  const [mitmStep, setMitmStep] = useState(0); // 0: Intercept, 1: Client HS, 2: Server HS, 3: Keys, 4: Exposure
  const [isMitmPlaying, setIsMitmPlaying] = useState(false);
  const [showTranscriptDetails, setShowTranscriptDetails] = useState(false);

  // ─── CHAPTER 5: QVPN ARCHITECTURE & MODES ──────────────────────────
  const [selectedVpnMode, setSelectedVpnMode] = useState('hybrid'); // 'classical' | 'pqc' | 'hybrid'
  const [selectedAttackTab, setSelectedAttackTab] = useState('mitm'); // 'mitm' | 'downgrade' | 'replay' | 'tampering'
  const [showTestbedDetails, setShowTestbedDetails] = useState(false);

  // ─── AI COPILOT STATE ──────────────────────────────────────────────
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotQuery, setCopilotQuery] = useState('');
  const [activeCopilotAnswer, setActiveCopilotAnswer] = useState(COPILOT_QA.pqc);
  const [copilotDetailExpanded, setCopilotDetailExpanded] = useState(false);

  // Auto-play MITM steps when in play mode
  useEffect(() => {
    let timer;
    if (isMitmPlaying) {
      timer = setInterval(() => {
        setMitmStep((prev) => {
          if (prev >= 4) {
            setIsMitmPlaying(false);
            return 4;
          }
          return prev + 1;
        });
      }, 2500);
    }
    return () => clearInterval(timer);
  }, [isMitmPlaying]);

  // Handle ESC key for PPT modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isPptOpen) {
        setIsPptOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPptOpen]);

  // Prevent background scrolling when PPT modal is open
  useEffect(() => {
    if (isPptOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    }
  }, [isPptOpen]);

  // Smooth scroll helper
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Co-pilot question submit
  const handleCopilotAsk = (e) => {
    e?.preventDefault();
    if (!copilotQuery.trim()) return;

    const queryLower = copilotQuery.toLowerCase();
    if (queryLower.includes('quantum') || queryLower.includes('pqc') || queryLower.includes('shor')) {
      setActiveCopilotAnswer(COPILOT_QA.pqc);
    } else if (queryLower.includes('auth') || queryLower.includes('trust') || queryLower.includes('psk')) {
      setActiveCopilotAnswer(COPILOT_QA.auth);
    } else if (queryLower.includes('mitm') || queryLower.includes('attack') || queryLower.includes('relay')) {
      setActiveCopilotAnswer(COPILOT_QA.mitm);
    } else if (queryLower.includes('protect') || queryLower.includes('hmac') || queryLower.includes('defen')) {
      setActiveCopilotAnswer(COPILOT_QA.defence);
    } else if (queryLower.includes('mode') || queryLower.includes('hybrid') || queryLower.includes('difference')) {
      setActiveCopilotAnswer(COPILOT_QA.modes);
    } else {
      setActiveCopilotAnswer(COPILOT_QA.viva);
    }
    setCopilotQuery('');
    setCopilotDetailExpanded(false);
  };

  return (
    <div className="min-h-screen bg-[#060914] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* ─── QUICK STORYLINE NAV BAR ───────────────────────────────── */}
      <nav aria-label="Storyline" className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#060914]/90 backdrop-blur-md px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 text-cyan-400">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-bold tracking-wider">QVPN RESEARCH STORY</span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-slate-400">
            <button onClick={() => scrollTo('hero')} className="hover:text-cyan-300 transition">
              Overview
            </button>
            <button onClick={() => scrollTo('quantum')} className="hover:text-cyan-300 transition">
              1. Quantum
            </button>
            <button onClick={() => scrollTo('vpns')} className="hover:text-cyan-300 transition">
              2. VPN Trust
            </button>
            <button onClick={() => scrollTo('mitm-attack')} className="hover:text-cyan-300 transition">
              3. MITM Attack
            </button>
            <button onClick={() => scrollTo('defence')} className="hover:text-cyan-300 transition">
              4. Mitigation
            </button>
            <button onClick={() => scrollTo('project')} className="hover:text-cyan-300 transition">
              5. QVPN Platform
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPptOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:from-cyan-500/30 hover:to-purple-500/30 transition shadow-sm hover:shadow-cyan-500/20"
            >
              <Presentation size={14} className="text-cyan-400" />
              <span>Open PPT</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-24">
        {/* ═════════════════════════════════════════════════════════════ */}
        {/* 4. HERO SECTION: BEYOND ENCRYPTION. INTO TRUST.             */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <section id="hero" className="pt-8 pb-12 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            POST-QUANTUM VPN SECURITY LABORATORY
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-tight">
            QVPN
            <span className="block mt-2 bg-gradient-to-r from-cyan-400 via-sky-300 to-purple-400 bg-clip-text text-transparent">
              Beyond Encryption. Into Trust.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl font-normal leading-relaxed">
            Exploring how post-quantum cryptography, hybrid key establishment, and authentication shape VPN security.
          </p>

          {/* Central Question Callout */}
          <div className="mt-8 max-w-2xl w-full rounded-2xl border border-slate-800 bg-[#0D1424]/90 p-5 text-center shadow-panel">
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 block mb-1">
              The Central Question
            </span>
            <p className="text-sm sm:text-base font-semibold text-white">
              What happens when your communication is encrypted, but the party you are communicating with has not
              been authenticated?
            </p>
          </div>

          {/* Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => scrollTo('quantum')}
              className="rounded-xl bg-cyan-500 hover:bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition shadow-lg shadow-cyan-500/25 flex items-center gap-2"
            >
              <span>Explore the Story</span>
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => {
                setMitmMode('mitm');
                scrollTo('mitm-attack');
              }}
              className="rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-200 transition flex items-center gap-2"
            >
              <ShieldAlert size={16} className="text-rose-400" />
              <span>Watch the MITM Attack</span>
            </button>
          </div>

          {/* Dominant Hero Animated Network Visualization */}
          <div className="mt-14 w-full rounded-2xl border border-slate-800/80 bg-[#0D1424] p-6 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-radial-at-c from-cyan-500/5 via-transparent to-transparent pointer-events-none" />

            <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4">
              {/* Client Endpoint */}
              <div className="flex flex-col items-center">
                <div className="relative h-20 w-20 rounded-2xl border-2 border-cyan-400 bg-slate-900 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <Laptop size={32} className="text-cyan-400" />
                  <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-cyan-500 text-[10px] font-mono font-bold text-slate-950">
                    CLIENT
                  </span>
                </div>
                <span className="mt-3 text-xs font-mono text-cyan-300 font-semibold">Client Endpoint</span>
                <span className="text-[11px] font-mono text-slate-400">192.168.56.101</span>
              </div>

              {/* Animated Encrypted Tunnel Line */}
              <div className="flex-1 w-full flex flex-col items-center px-4">
                <div className="w-full relative h-12 flex items-center">
                  {/* Outer tunnel envelope */}
                  <div className="w-full h-4 rounded-full bg-slate-950 border border-cyan-500/30 overflow-hidden relative shadow-inner">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-cyan-500/30 via-purple-500/30 to-cyan-500/30"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>

                  {/* Flowing Data Packets */}
                  <motion.div
                    className="absolute h-3 w-3 rounded-full bg-cyan-400 shadow-md shadow-cyan-400/80"
                    animate={{ left: ['5%', '90%'] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <motion.div
                    className="absolute h-3 w-3 rounded-full bg-purple-400 shadow-md shadow-purple-400/80"
                    animate={{ left: ['85%', '10%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                  />
                </div>

                <div className="flex items-center gap-2 mt-2 text-xs font-mono text-slate-400">
                  <Lock size={12} className="text-cyan-400" />
                  <span>Encrypted Tunnel Active</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-cyan-400">AES-256-GCM / ML-KEM-768</span>
                </div>
              </div>

              {/* Server Endpoint */}
              <div className="flex flex-col items-center">
                <div className="relative h-20 w-20 rounded-2xl border-2 border-purple-400 bg-slate-900 flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Server size={32} className="text-purple-400" />
                  <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-purple-500 text-[10px] font-mono font-bold text-slate-950">
                    SERVER
                  </span>
                </div>
                <span className="mt-3 text-xs font-mono text-purple-300 font-semibold">VPN Gateway</span>
                <span className="text-[11px] font-mono text-slate-400">192.168.56.102</span>
              </div>
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* 5. CHAPTER ONE — THE QUANTUM THREAT                         */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <section id="quantum" className="scroll-mt-20">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">
              Chapter 1 • Cryptographic Migration
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
              What Happens When Computers Get Quantum?
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
              Quantum computers could eventually threaten the mathematical foundations of widely used public-key
              cryptography. This motivates the development of post-quantum cryptography.
            </p>
          </div>

          {/* 3-Stage Visual Transition Stepper */}
          <div className="mt-10 rounded-2xl border border-slate-800 bg-[#0D1424] p-6 sm:p-8 shadow-panel">
            <div className="flex justify-center mb-8">
              <div className="inline-flex rounded-xl border border-slate-800 bg-slate-950 p-1 text-xs font-mono">
                {[
                  { label: 'Classical Cryptography', icon: Lock },
                  { label: 'Quantum Threat (Shor)', icon: AlertTriangle },
                  { label: 'Post-Quantum (ML-KEM)', icon: ShieldCheck },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setQuantumStage(idx)}
                    className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg font-medium transition ${
                      quantumStage === idx
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <item.icon size={14} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Stage Visual Scene */}
            <div className="min-h-[220px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                {quantumStage === 0 && (
                  <motion.div
                    key="stage-0"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col items-center text-center max-w-lg"
                  >
                    <div className="h-16 w-16 rounded-2xl border border-cyan-500/40 bg-cyan-950/20 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/20 mb-4">
                      <Lock size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-white">RSA & Elliptic-Curve Cryptography</h3>
                    <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                      Conventional key establishment relies on discrete logarithms (Diffie-Hellman / X25519) and prime
                      factorisation (RSA). Classical computers require billions of years to break these mathematical structures.
                    </p>
                  </motion.div>
                )}

                {quantumStage === 1 && (
                  <motion.div
                    key="stage-1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col items-center text-center max-w-lg"
                  >
                    <div className="h-16 w-16 rounded-2xl border border-rose-500/40 bg-rose-950/20 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/20 mb-4 animate-pulse">
                      <Unlock size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-rose-300">Shor’s Algorithm Breaks Factorisation</h3>
                    <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                      On a sufficiently capable fault-tolerant quantum computer, Shor&apos;s algorithm solves discrete
                      logarithms and factorisation in polynomial time, collapsing the security of RSA and standard ECC.
                    </p>
                  </motion.div>
                )}

                {quantumStage === 2 && (
                  <motion.div
                    key="stage-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col items-center text-center max-w-lg"
                  >
                    <div className="h-16 w-16 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20 mb-4">
                      <ShieldCheck size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-emerald-300">ML-KEM-768 Lattice Cryptography</h3>
                    <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                      ML-KEM-768 is a post-quantum key-encapsulation mechanism used to establish shared secret material.
                      Its hardness is based on the Module Learning With Errors (M-LWE) lattice problem, secure against
                      both classical and quantum adversaries.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Punchline Statement */}
            <div className="mt-6 pt-6 border-t border-slate-800 text-center">
              <p className="text-xs sm:text-sm font-semibold text-cyan-300">
                “The threat motivating migration is quantum. The adversary in our experiments is conventional.”
              </p>
            </div>

            {/* Expandable Technical Details */}
            <div className="mt-4 flex flex-col items-center">
              <button
                onClick={() => setShowQuantumDetails(!showQuantumDetails)}
                className="text-xs font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
              >
                <span>{showQuantumDetails ? 'Hide technical details' : 'Show technical details'}</span>
                {showQuantumDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showQuantumDetails && (
                <div className="mt-3 w-full rounded-xl border border-slate-800/80 bg-slate-950 p-4 text-xs font-mono text-slate-300 leading-relaxed">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-cyan-400 font-bold block mb-1">Quantum Impact:</span>
                      <p>
                        Shor&apos;s algorithm runs in O((log N)³) operations. In contrast, symmetric algorithms like AES-256
                        are affected only by Grover&apos;s algorithm (reducing search space from 2²⁵⁶ to 2¹²⁸), which
                        remains securely intractable.
                      </p>
                    </div>
                    <div>
                      <span className="text-purple-400 font-bold block mb-1">NIST FIPS 203 Standard:</span>
                      <p>
                        ML-KEM-768 provides Security Category 3 (equivalent to AES-192 brute-force security). Public key:
                        1,184 bytes; Ciphertext: 1,088 bytes; Shared secret: 32 bytes.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* 6. CHAPTER TWO — HOW VPNS WORK                              */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <section id="vpns" className="scroll-mt-20">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">
              Chapter 2 • Foundations of Secure Tunnels
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
              A VPN Creates a Secure Tunnel. But With Whom?
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
              Virtual private networks create protected communication channels across untrusted networks.
              However, cryptographic protection relies on two distinct pillars: confidentiality and peer authentication.
            </p>
          </div>

          <div className="mt-10 rounded-2xl border border-slate-800 bg-[#0D1424] p-6 sm:p-8 shadow-panel">
            {/* Interactive Toggle: Authenticated vs Unauthenticated */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-400">Tunnel Security State:</span>
                <button
                  onClick={() => setVpnAuthActive(!vpnAuthActive)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-mono font-medium transition ${
                    vpnAuthActive
                      ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300'
                      : 'border-rose-500/40 bg-rose-950/20 text-rose-300'
                  }`}
                >
                  {vpnAuthActive ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
                  <span>{vpnAuthActive ? 'Authentication Active' : 'Authentication Stripped (?)'}</span>
                </button>
              </div>

              <span className="text-xs font-mono text-slate-400">
                Click button to toggle authentication layer
              </span>
            </div>

            {/* Visual Diagram: Client -> Untrusted Network -> Server */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-950 p-6 sm:p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-center">
                {/* Client Node */}
                <div className="rounded-xl border border-cyan-500/30 bg-slate-900/60 p-4">
                  <div className="flex items-center justify-center gap-2 text-cyan-300 font-bold font-mono text-sm">
                    <Laptop size={18} /> CLIENT
                  </div>
                  <p className="text-[11px] font-mono text-slate-400 mt-1">Initiates Connection</p>
                  <div className="mt-3 text-[11px] font-mono text-cyan-400 bg-cyan-950/30 rounded py-1 border border-cyan-500/20">
                    Sends Key Shares
                  </div>
                </div>

                {/* Untrusted Network / Tunnel Formation */}
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2">
                    Untrusted Transit Network
                  </span>

                  <div className="w-full relative h-10 flex items-center justify-center">
                    <div className="w-full h-3 rounded-full bg-slate-900 border border-slate-800 overflow-hidden relative">
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-cyan-500/40 to-purple-500/40"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                      />
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400 mt-2">
                    {vpnAuthActive ? 'Mutual Transcript Binding' : 'No Peer Validation'}
                  </span>
                </div>

                {/* Server Node with Dynamic Question Mark */}
                <div
                  className={`rounded-xl border p-4 transition duration-300 ${
                    vpnAuthActive
                      ? 'border-purple-500/30 bg-slate-900/60'
                      : 'border-rose-500/50 bg-rose-950/20 animate-pulse'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2 font-bold font-mono text-sm">
                    {vpnAuthActive ? (
                      <>
                        <Server size={18} className="text-purple-400" />
                        <span className="text-purple-300">LEGITIMATE SERVER</span>
                      </>
                    ) : (
                      <>
                        <HelpCircle size={18} className="text-rose-400" />
                        <span className="text-rose-300">UNKNOWN PEER (?)</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-slate-400 mt-1">
                    {vpnAuthActive ? 'Verified Peer Identity' : 'Identity Unverified'}
                  </p>
                  <div
                    className={`mt-3 text-[11px] font-mono rounded py-1 border ${
                      vpnAuthActive
                        ? 'text-purple-300 bg-purple-950/30 border-purple-500/20'
                        : 'text-rose-300 bg-rose-950/30 border-rose-500/30 font-bold'
                    }`}
                  >
                    {vpnAuthActive ? 'PSK Verified' : 'Who is holding the keys?'}
                  </div>
                </div>
              </div>
            </div>

            {/* Two Short Visual Callouts */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                  <Lock size={16} />
                  <span>Encryption protects the traffic.</span>
                </div>
                <p className="text-slate-300 mt-2 leading-relaxed">
                  AES-256-GCM protects the custom tunnel&apos;s records with confidentiality and integrity, ensuring
                  eavesdroppers cannot read packets in transit.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                  <Key size={16} />
                  <span>Authentication establishes trust.</span>
                </div>
                <p className="text-slate-300 mt-2 leading-relaxed">
                  The handshake must establish that the communicating party is the intended peer. Without
                  authentication, you could be encrypting traffic directly to an active intermediary.
                </p>
              </div>
            </div>

            {/* The Critical Realization Box */}
            <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-950/15 p-4 text-center">
              <p className="text-sm font-semibold text-amber-200">
                “A secure tunnel is not enough if you do not know who is on the other end.”
              </p>
            </div>

            {/* Expandable Technical Details */}
            <div className="mt-4 flex flex-col items-center">
              <button
                onClick={() => setShowVpnDetails(!showVpnDetails)}
                className="text-xs font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
              >
                <span>{showVpnDetails ? 'Hide cryptographic primitives' : 'Show cryptographic primitives'}</span>
                {showVpnDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showVpnDetails && (
                <div className="mt-3 w-full rounded-xl border border-slate-800/80 bg-slate-950 p-4 text-xs font-mono text-slate-300 leading-relaxed">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-2 border border-slate-800 rounded-lg">
                      <span className="text-cyan-400 font-bold block">1. Key Exchange</span>
                      <p className="text-[11px] text-slate-400 mt-1">X25519 (ECDH) + ML-KEM-768 (Lattice KEM)</p>
                    </div>
                    <div className="p-2 border border-slate-800 rounded-lg">
                      <span className="text-purple-400 font-bold block">2. Key Derivation</span>
                      <p className="text-[11px] text-slate-400 mt-1">HKDF-Extract &amp; HKDF-Expand with SHA-256</p>
                    </div>
                    <div className="p-2 border border-slate-800 rounded-lg">
                      <span className="text-emerald-400 font-bold block">3. Data Transport</span>
                      <p className="text-[11px] text-slate-400 mt-1">AES-256-GCM AEAD over TCP (Ports 5558/5559)</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* 7 & 8. CHAPTER THREE & FOUR — MITM & PROTECTION SIMULATOR    */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <section id="mitm-attack" className="scroll-mt-20">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-mono uppercase tracking-widest text-rose-400 font-bold">
              Chapter 3 &amp; 4 • Active Adversary Simulation
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
              {mitmMode === 'protected'
                ? 'Can We Stop the Attack Without Breaking the Encryption?'
                : 'The Tunnel Is Encrypted. The Connection Is Compromised.'}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
              {mitmMode === 'protected'
                ? 'Authenticated Hybrid V3 binds the handshake transcript with a pre-shared key, detecting in-path manipulation before any tunnel interface is allocated.'
                : 'When public keys are unauthenticated, an in-path adversary establishes two independent handshakes. The encryption algorithms function perfectly, yet all data is intercepted.'}
            </p>
          </div>

          <div className="mt-10 rounded-2xl border border-slate-800 bg-[#0D1424] p-6 sm:p-8 shadow-panel">
            {/* Top Controls: 3 Modes */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
              <div className="flex rounded-xl border border-slate-800 bg-slate-950 p-1 text-xs font-mono">
                <button
                  onClick={() => {
                    setMitmMode('normal');
                    setMitmStep(0);
                    setIsMitmPlaying(false);
                  }}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    mitmMode === 'normal'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Normal Connection
                </button>
                <button
                  onClick={() => {
                    setMitmMode('mitm');
                    setMitmStep(0);
                  }}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    mitmMode === 'mitm'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Simulate MITM Attack
                </button>
                <button
                  onClick={() => {
                    setMitmMode('protected');
                    setMitmStep(0);
                    setIsMitmPlaying(false);
                  }}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    mitmMode === 'protected'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Apply Protection (V3)
                </button>
              </div>

              {/* Step Navigation Controls (for MITM Mode) */}
              {mitmMode === 'mitm' && (
                <div className="flex items-center gap-2 text-xs font-mono">
                  <button
                    onClick={() => setMitmStep((s) => Math.max(0, s - 1))}
                    disabled={mitmStep === 0}
                    className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900 disabled:opacity-40"
                    title="Previous stage"
                  >
                    <SkipBack size={14} />
                  </button>
                  <button
                    onClick={() => setIsMitmPlaying(!isMitmPlaying)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900 flex items-center gap-1"
                  >
                    {isMitmPlaying ? <Pause size={14} /> : <Play size={14} />}
                    <span>{isMitmPlaying ? 'Pause' : 'Play'}</span>
                  </button>
                  <button
                    onClick={() => setMitmStep((s) => Math.min(4, s + 1))}
                    disabled={mitmStep === 4}
                    className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900 disabled:opacity-40"
                    title="Next stage"
                  >
                    <SkipForward size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setMitmStep(0);
                      setIsMitmPlaying(false);
                    }}
                    className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900"
                    title="Reset simulation"
                  >
                    <RotateCcw size={14} />
                  </button>
                  <span className="text-slate-400 ml-2">Stage {mitmStep + 1}/5</span>
                </div>
              )}
            </div>

            {/* MITM Stage Indicator Bar */}
            {mitmMode === 'mitm' && (
              <div className="grid grid-cols-5 gap-1 mb-6 text-[11px] font-mono text-center">
                {[
                  '1. Interception',
                  '2. Client Handshake',
                  '3. Server Handshake',
                  '4. Independent Keys',
                  '5. Traffic Exposure',
                ].map((stName, idx) => (
                  <button
                    key={idx}
                    onClick={() => setMitmStep(idx)}
                    className={`py-1.5 px-1 rounded transition border ${
                      mitmStep === idx
                        ? 'border-rose-500/50 bg-rose-950/40 text-rose-300 font-bold'
                        : idx < mitmStep
                        ? 'border-slate-800 bg-slate-900 text-slate-400'
                        : 'border-slate-900 bg-slate-950 text-slate-600'
                    }`}
                  >
                    {stName}
                  </button>
                ))}
              </div>
            )}

            {/* DOMINANT 3-NODE REUSABLE DIAGRAM */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-950 p-6 sm:p-8 relative">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-center">
                {/* 1. Client Node */}
                <div className="rounded-xl border border-cyan-500/30 bg-slate-900/60 p-5">
                  <div className="flex items-center justify-center gap-2 text-cyan-300 font-bold font-mono text-sm">
                    <Laptop size={18} /> QVPN Client VM
                  </div>
                  <p className="text-[11px] font-mono text-slate-400 mt-1">192.168.56.101 • enp0s9</p>

                  <div className="mt-3 pt-3 border-t border-slate-800 text-xs font-mono">
                    {mitmMode === 'normal' && (
                      <span className="text-cyan-400">Direct session with Server</span>
                    )}
                    {mitmMode === 'mitm' && (
                      <div className="space-y-1">
                        <span className="text-slate-400 block text-[10px]">Session Context A:</span>
                        <span className="text-cyan-300 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800 inline-block">
                          Key A: 0x8F4C...2A
                        </span>
                      </div>
                    )}
                    {mitmMode === 'protected' && (
                      <span className="text-emerald-400 font-bold">HMAC(PSK, Transcript) Sent</span>
                    )}
                  </div>
                </div>

                {/* 2. Intermediary / Center Channel */}
                <div
                  className={`rounded-xl border p-5 transition-all duration-300 ${
                    mitmMode === 'normal'
                      ? 'border-dashed border-slate-800 bg-slate-900/20'
                      : mitmMode === 'mitm'
                      ? 'border-rose-500/50 bg-rose-950/20 shadow-lg shadow-rose-950/40'
                      : 'border-emerald-500/40 bg-emerald-950/20'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2 font-bold font-mono text-sm">
                    {mitmMode === 'normal' && (
                      <>
                        <Network size={18} className="text-slate-500" />
                        <span className="text-slate-400">Direct Transit Path</span>
                      </>
                    )}
                    {mitmMode === 'mitm' && (
                      <>
                        <ShieldAlert size={18} className="text-rose-400 animate-pulse" />
                        <span className="text-rose-300">Windows In-Path Relay</span>
                      </>
                    )}
                    {mitmMode === 'protected' && (
                      <>
                        <ShieldCheck size={18} className="text-emerald-400" />
                        <span className="text-emerald-300">Attacker In-Path (V3)</span>
                      </>
                    )}
                  </div>

                  <p className="text-[11px] font-mono text-slate-400 mt-1">
                    {mitmMode === 'normal'
                      ? 'No intermediary active'
                      : '192.168.56.1 • Port 15558 (Dedicated Listener)'}
                  </p>

                  <div className="mt-3 pt-3 border-t border-slate-800 text-xs font-mono">
                    {mitmMode === 'normal' && (
                      <span className="text-slate-500">Unmodified transit packets</span>
                    )}
                    {mitmMode === 'mitm' && (
                      <div className="space-y-1">
                        {mitmStep < 3 ? (
                          <span className="text-amber-300">Intercepting handshake messages...</span>
                        ) : mitmStep === 3 ? (
                          <span className="text-rose-300 font-bold">Holds Key A AND Key B</span>
                        ) : (
                          <div className="bg-slate-950 p-1.5 rounded border border-rose-500/30 text-[11px] text-rose-300">
                            <span className="block text-[9px] text-slate-500">Plaintext Sniffed:</span>
                            <code>GET /credentials HTTP/1.1</code>
                          </div>
                        )}
                      </div>
                    )}
                    {mitmMode === 'protected' && (
                      <span className="text-rose-400 font-bold">
                        Cannot Forge PSK Tag (Session Aborted)
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Server Node */}
                <div className="rounded-xl border border-purple-500/30 bg-slate-900/60 p-5">
                  <div className="flex items-center justify-center gap-2 text-purple-300 font-bold font-mono text-sm">
                    <Server size={18} /> Real QVPN Server VM
                  </div>
                  <p className="text-[11px] font-mono text-slate-400 mt-1">192.168.56.102 • enp0s9</p>

                  <div className="mt-3 pt-3 border-t border-slate-800 text-xs font-mono">
                    {mitmMode === 'normal' && (
                      <span className="text-purple-400">Direct session with Client</span>
                    )}
                    {mitmMode === 'mitm' && (
                      <div className="space-y-1">
                        <span className="text-slate-400 block text-[10px]">Session Context B:</span>
                        <span className="text-purple-300 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800 inline-block">
                          Key B: 0x3E71...9D
                        </span>
                      </div>
                    )}
                    {mitmMode === 'protected' && (
                      <span className="text-rose-400 font-bold">CRYPTO_memcmp != 0 (REJECTED)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Explanatory Outcome Callout */}
              <div
                className={`mt-6 rounded-xl border p-4 text-xs font-sans ${
                  mitmMode === 'normal'
                    ? 'border-cyan-500/30 bg-cyan-950/20 text-cyan-200'
                    : mitmMode === 'mitm'
                    ? 'border-rose-500/40 bg-rose-950/20 text-rose-200'
                    : 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {mitmMode === 'normal' && <CheckCircle2 size={18} className="text-cyan-400 shrink-0 mt-0.5" />}
                  {mitmMode === 'mitm' && <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />}
                  {mitmMode === 'protected' && <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />}

                  <div className="space-y-1">
                    <span className="font-bold text-sm block">
                      {mitmMode === 'normal' && 'Secure Direct Tunnel Established'}
                      {mitmMode === 'mitm' && 'The encryption was not broken. Trust was.'}
                      {mitmMode === 'protected' && 'Handshake Rejected. The Tunnel Was Never Established.'}
                    </span>
                    <p className="text-slate-300 leading-relaxed text-xs">
                      {mitmMode === 'normal' &&
                        'When no active adversary is in-path, client and server negotiate keys directly and transmit encrypted records.'}
                      {mitmMode === 'mitm' &&
                        'The vulnerable handshake failed to authenticate the intended peer, allowing an intermediary to establish two independent session contexts. Traffic is decrypted at the relay, inspected in plaintext, and re-encrypted. Neither X25519 nor ML-KEM-768 was mathematically broken.'}
                      {mitmMode === 'protected' &&
                        'The authenticated variant binds the handshake transcript to a PSK-based HMAC check. The relay lacks the 32-byte PSK, so verification fails in constant time. The server aborts before allocating qvpn0, guaranteeing zero plaintext exposure.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Conceptual Simulation Notice */}
              <div className="mt-4 text-center">
                <span className="text-[10px] font-mono text-slate-500">
                  *Conceptual interactive simulation reproducing testbed findings from Chapter 4 of the research.
                </span>
              </div>
            </div>

            {/* Expandable Technical Transcript Inspector */}
            <div className="mt-4 flex flex-col items-center">
              <button
                onClick={() => setShowTranscriptDetails(!showTranscriptDetails)}
                className="text-xs font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
              >
                <span>{showTranscriptDetails ? 'Hide transcript fields' : 'Inspect handshake transcript fields (V3)'}</span>
                {showTranscriptDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showTranscriptDetails && (
                <div className="mt-3 w-full rounded-xl border border-slate-800/80 bg-slate-950 p-4 text-xs font-mono text-slate-300 leading-relaxed">
                  <span className="text-emerald-400 font-bold block mb-2">Authenticated Hybrid Transcript Structure:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                    <div className="p-2 border border-slate-800 rounded bg-slate-900/40">
                      <span className="text-slate-500 block">Protocol Prefix:</span>
                      <code className="text-emerald-300">QVPN-AUTH-HYBRID-V1</code>
                    </div>
                    <div className="p-2 border border-slate-800 rounded bg-slate-900/40">
                      <span className="text-slate-500 block">Nonces (Freshness):</span>
                      <code className="text-cyan-300">ClientNonce (32B) • ServerNonce (32B)</code>
                    </div>
                    <div className="p-2 border border-slate-800 rounded bg-slate-900/40">
                      <span className="text-slate-500 block">Public Shares:</span>
                      <code className="text-purple-300">X25519 PubKey (32B) • ML-KEM PubKey (1184B)</code>
                    </div>
                    <div className="p-2 border border-slate-800 rounded bg-slate-900/40">
                      <span className="text-slate-500 block">Authentication Check:</span>
                      <code className="text-emerald-300">HMAC-SHA256(PSK, Transcript) • CRYPTO_memcmp</code>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* 9 & 10. CHAPTER FIVE — MEET THE QVPN PROJECT & EXPERIMENTS   */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <section id="project" className="scroll-mt-20">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">
              Chapter 5 • Research Platform
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
              So, We Built QVPN.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
              An experimental platform for evaluating classical, post-quantum, and hybrid VPN security against active network attacks.
            </p>
          </div>

          <div className="mt-10 rounded-2xl border border-slate-800 bg-[#0D1424] p-6 sm:p-8 shadow-panel">
            {/* Compact 3-Way Mode Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
              <div>
                <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  Testbed Protocol Configurations
                </span>
                <p className="text-xs text-slate-400 mt-0.5">Select a mode to inspect its architecture</p>
              </div>

              <div className="flex rounded-xl border border-slate-800 bg-slate-950 p-1 text-xs font-mono">
                {[
                  { id: 'classical', label: 'Classical (OpenVPN)' },
                  { id: 'pqc', label: 'PQC-Only (ML-KEM)' },
                  { id: 'hybrid', label: 'Hybrid (Dual KEM)' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setSelectedVpnMode(mode.id)}
                    className={`rounded-lg px-3 py-1.5 transition ${
                      selectedVpnMode === mode.id
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Protocol Diagram & Summary */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-950 p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Cryptographic Engine</span>
                  <h4 className="text-base font-bold text-white mt-1">
                    {selectedVpnMode === 'classical' && 'OpenVPN (AES-256-GCM)'}
                    {selectedVpnMode === 'pqc' && 'ML-KEM-768 Tunnel'}
                    {selectedVpnMode === 'hybrid' && 'X25519 + ML-KEM-768'}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    {selectedVpnMode === 'classical' && 'Baseline standard VPN using TLS PKI certificates.'}
                    {selectedVpnMode === 'pqc' && 'FIPS 203 lattice-based key encapsulation mechanism.'}
                    {selectedVpnMode === 'hybrid' && 'Dual-KEM combination via HKDF-SHA256 with transcript authentication.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Interface &amp; Ports</span>
                  <div className="mt-1 font-mono text-xs text-cyan-300 space-y-1">
                    <p>
                      Interface:{' '}
                      <span className="text-white">
                        {selectedVpnMode === 'classical' ? 'tun0 (10.8.0.0/24)' : 'qvpn0 (10.20.0.0/24)'}
                      </span>
                    </p>
                    <p>
                      Transport:{' '}
                      <span className="text-white">
                        {selectedVpnMode === 'classical' ? 'UDP 1194' : selectedVpnMode === 'pqc' ? 'TCP 5559' : 'TCP 5558'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Security Assessment</span>
                  <div className="mt-1 font-mono text-xs space-y-1">
                    <p>
                      Quantum-Safe:{' '}
                      <span className={selectedVpnMode === 'classical' ? 'text-rose-400' : 'text-emerald-400 font-bold'}>
                        {selectedVpnMode === 'classical' ? 'No (Vulnerable)' : 'Yes (Lattice)'}
                      </span>
                    </p>
                    <p>
                      Active MITM Defense:{' '}
                      <span className={selectedVpnMode === 'pqc' ? 'text-rose-400' : 'text-emerald-400 font-bold'}>
                        {selectedVpnMode === 'pqc' ? 'Vulnerable (No Auth)' : 'Defended'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* What the Project Tests: 4 Compact Interactive Labels */}
            <div className="mt-8">
              <span className="text-xs font-mono uppercase tracking-wider text-purple-400 font-bold block mb-3">
                What the Project Tests • Experimental Suites
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {[
                  { id: 'mitm', label: 'MITM Interception' },
                  { id: 'downgrade', label: 'Downgrade Integrity' },
                  { id: 'replay', label: 'Replay & Freshness' },
                  { id: 'tampering', label: 'Transcript Tampering' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedAttackTab(tab.id)}
                    className={`p-2.5 rounded-xl border text-xs font-mono font-medium transition text-center ${
                      selectedAttackTab === tab.id
                        ? 'border-purple-500/50 bg-purple-950/30 text-purple-300 font-bold'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Selected Suite Explanation */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs font-mono text-slate-300">
                {selectedAttackTab === 'mitm' && (
                  <p>
                    <strong className="text-rose-400">MITM Interception Test:</strong> Demonstrates two-leg plaintext extraction when authentication is absent, proving that confidentiality without transcript binding leaves communications exposed.
                  </p>
                )}
                {selectedAttackTab === 'downgrade' && (
                  <p>
                    <strong className="text-amber-400">Downgrade &amp; Negotiation Integrity:</strong> Evaluates capability tampering (Classical=1, PQC=2, Hybrid=4, preferred: Hybrid &gt; PQC &gt; Classical) and verifies that tamper-proof negotiation prevents forced fallback to weaker cipher suites.
                  </p>
                )}
                {selectedAttackTab === 'replay' && (
                  <p>
                    <strong className="text-blue-400">Replay &amp; Freshness:</strong> Validates handshake nonces and timestamps against replayed session setup packets, preventing attackers from re-instantiating stale encrypted tunnels.
                  </p>
                )}
                {selectedAttackTab === 'tampering' && (
                  <p>
                    <strong className="text-emerald-400">Transcript Tampering &amp; Key Binding:</strong> Evaluates 1-bit avalanche effect and constant-time HMAC-SHA256 rejection (CRYPTO_memcmp), ensuring modified handshake parameters cause instantaneous session abortion.
                  </p>
                )}
              </div>
            </div>

            {/* Expandable Testbed Details */}
            <div className="mt-6 flex flex-col items-center">
              <button
                onClick={() => setShowTestbedDetails(!showTestbedDetails)}
                className="text-xs font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
              >
                <span>{showTestbedDetails ? 'Hide testbed ports and nodes' : 'Show Table 4.1 testbed nodes and ports'}</span>
                {showTestbedDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showTestbedDetails && (
                <div className="mt-3 w-full rounded-xl border border-slate-800/80 bg-slate-950 p-4 text-xs font-mono text-slate-300 leading-relaxed">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-cyan-400 font-bold block mb-1">Host &amp; VM Roles:</span>
                      <ul className="space-y-1 text-slate-400 text-[11px]">
                        <li>• Client VM: 192.168.56.101 (Ubuntu 24.04, enp0s9)</li>
                        <li>• Server VM: 192.168.56.102 (Ubuntu 24.04, enp0s9)</li>
                        <li>• Windows MITM Host: 192.168.56.1 (Dedicated listeners)</li>
                      </ul>
                    </div>
                    <div>
                      <span className="text-purple-400 font-bold block mb-1">Port Allocations:</span>
                      <ul className="space-y-1 text-slate-400 text-[11px]">
                        <li>• Classical OpenVPN: UDP 1194</li>
                        <li>• Custom Hybrid Tunnel: TCP 5558 / PQC TCP 5559</li>
                        <li>• Orchestration Agents: Flask 8000 / Controllers 8010 &amp; 8011</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* 11. PRESENTATION SECTION: EMBEDDED GOOGLE SLIDES            */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <section id="presentation" className="scroll-mt-20">
          <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-[#0D1424] to-[#060914] p-8 sm:p-12 text-center shadow-panel relative overflow-hidden">
            <div className="absolute top-0 right-0 h-48 w-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 h-48 w-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-4">
                <Presentation size={14} />
                PROJECT SLIDE DECK
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                Explore the Project Presentation
              </h2>

              <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
                View the complete QVPN Major Project Phase-II presentation without leaving this page.
                Browse technical slides, experimental data charts, and viva defence material.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={() => setIsPptOpen(true)}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 px-8 py-4 text-base font-bold text-slate-950 transition shadow-xl shadow-cyan-500/25 flex items-center gap-3"
                >
                  <Presentation size={20} className="text-slate-950" />
                  <span>Open PPT</span>
                </button>

                <a
                  href={PPT_DIRECT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 px-5 py-4 text-sm font-semibold text-slate-300 transition flex items-center gap-2"
                >
                  <span>Open in Google Slides</span>
                  <ExternalLink size={16} />
                </a>
              </div>

              <p className="mt-4 text-[11px] font-mono text-cyan-400/80">
                • Published Presentation • Major Project Phase-II •
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 11. IN-SITE MINI BROWSER MODAL FOR GOOGLE SLIDES            */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isPptOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
            {/* Backdrop click dismiss */}
            <div className="absolute inset-0" onClick={() => setIsPptOpen(false)} />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className={`relative z-10 w-full flex flex-col rounded-2xl border border-slate-700 bg-[#060914] shadow-2xl overflow-hidden transition-all ${
                isPptFullscreen
                  ? 'h-[98vh] max-w-[98vw]'
                  : 'h-[85vh] max-w-5xl'
              }`}
            >
              {/* Mini Browser Titlebar / Chrome */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-[#0D1424]">
                {/* Traffic Lights & Title */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsPptOpen(false)}
                      className="h-3 w-3 rounded-full bg-rose-500 hover:opacity-80 transition"
                      title="Close"
                    />
                    <button
                      onClick={() => setIsPptFullscreen(!isPptFullscreen)}
                      className="h-3 w-3 rounded-full bg-amber-500 hover:opacity-80 transition"
                      title="Toggle Size"
                    />
                    <button
                      onClick={() => setIsPptFullscreen(!isPptFullscreen)}
                      className="h-3 w-3 rounded-full bg-emerald-500 hover:opacity-80 transition"
                      title="Expand"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                    <Presentation size={14} className="text-cyan-400" />
                    <span className="font-semibold text-white">QVPN Presentation</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-slate-400 hidden sm:inline text-[11px]">
                      Major Project Phase-II
                    </span>
                  </div>
                </div>

                {/* Window Actions */}
                <div className="flex items-center gap-2">
                  <a
                    href={PPT_DIRECT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30 transition text-xs font-mono font-medium"
                    title="Open directly in Google Slides"
                  >
                    <span>Open in Google Slides</span>
                    <ExternalLink size={14} />
                  </a>

                  <button
                    onClick={() => setIsPptFullscreen(!isPptFullscreen)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title={isPptFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  >
                    {isPptFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>

                  <button
                    onClick={() => setIsPptOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Close (Esc)"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Published Slide Deck Status Banner */}
              <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-300">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>
                    Published Presentation Loaded • Publicly Accessible • No Sign-In Required
                  </span>
                </div>
                <a
                  href={PPT_DIRECT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
                >
                  <span>Open Full Screen in New Tab</span>
                  <ExternalLink size={12} />
                </a>
              </div>

              {/* Presentation Iframe Container */}
              <div className="relative flex-1 w-full bg-black flex items-center justify-center">
                {!iframeError ? (
                  <iframe
                    src={PPT_EMBED_URL}
                    title="QVPN Project Presentation"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen; storage-access"
                    allowFullScreen
                    onError={() => setIframeError(true)}
                  />
                ) : (
                  /* Fallback when Google blocks embed */
                  <div className="p-8 text-center max-w-md">
                    <AlertTriangle size={36} className="text-amber-400 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-white">Google Slides Embed Notice</h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      If Google restricts embedding or requires authentication for your account, you can open the presentation directly in Google Slides.
                    </p>
                    <a
                      href={PPT_DIRECT_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition"
                    >
                      <span>Open presentation in Google Slides</span>
                      <ExternalLink size={14} />
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 13. UNOBTRUSIVE AI CO-PILOT (DOCKED BOTTOM-RIGHT)           */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-6 right-6 z-40">
        {!isCopilotOpen ? (
          <button
            onClick={() => setIsCopilotOpen(true)}
            className="flex items-center gap-2 rounded-full border border-cyan-500/40 bg-[#0D1424]/95 px-4 py-2.5 text-xs font-mono font-bold text-cyan-300 shadow-xl shadow-cyan-950/60 hover:bg-slate-900 transition backdrop-blur-md"
          >
            <Sparkles size={16} className="text-cyan-400" />
            <span>Ask QVPN Co-Pilot</span>
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-80 sm:w-96 rounded-2xl border border-slate-700 bg-[#060914] p-4 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
                <Bot size={16} className="text-cyan-400" />
                <span>QVPN Research Assistant</span>
              </div>
              <button
                onClick={() => setIsCopilotOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Question Chips */}
            <div className="py-2.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1.5">
                Suggested Questions:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {Object.entries(COPILOT_QA).map(([key, item]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setActiveCopilotAnswer(item);
                      setCopilotDetailExpanded(false);
                    }}
                    className={`text-[10px] font-mono px-2 py-1 rounded border transition ${
                      activeCopilotAnswer.q === item.q
                        ? 'border-cyan-500/50 bg-cyan-950/30 text-cyan-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item.q}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Answer Display */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs">
              <span className="font-bold text-white block mb-1">{activeCopilotAnswer.q}</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {activeCopilotAnswer.summary}
              </p>

              {copilotDetailExpanded && (
                <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-mono leading-relaxed whitespace-pre-line">
                  {activeCopilotAnswer.detail}
                </div>
              )}

              <button
                onClick={() => setCopilotDetailExpanded(!copilotDetailExpanded)}
                className="mt-2 text-[10px] font-mono text-cyan-400 hover:underline flex items-center gap-1"
              >
                <span>{copilotDetailExpanded ? 'Less detail' : 'Deeper technical detail'}</span>
              </button>
            </div>

            {/* Custom Input */}
            <form onSubmit={handleCopilotAsk} className="mt-3 flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Ask about PQC, MITM, or Viva..."
                value={copilotQuery}
                onChange={(e) => setCopilotQuery(e.target.value)}
                className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="p-1.5 rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition"
              >
                <Send size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}
