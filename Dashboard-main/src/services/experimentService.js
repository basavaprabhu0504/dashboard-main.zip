import { api } from './api';

const CLIENT_EXPERIMENT_URL = import.meta.env.VITE_CLIENT_EXPERIMENT_URL || 'http://192.168.56.101:8010';
const EXPERIMENT_TIMEOUT_MS = Number(import.meta.env.VITE_EXPERIMENT_TIMEOUT_MS) || 95000;

/**
 * 8 Fixed Verified Security Experiments per Handoff Specification
 */
export const EXPERIMENT_DEFINITIONS = [
  // --- IN-PATH MITM ATTACKS (Real Windows Interception) ---
  {
    id: 'mitm-v2',
    category: 'mitm',
    title: 'V2 MITM Attack (Unauthenticated Hybrid)',
    badge: 'In-Path Interception',
    badgeTone: 'rose',
    target: 'Hybrid V2 Tunnel (TCP 5558)',
    description:
      'Windows attacker intercepts unauthenticated Hybrid V2 handshake, establishes dual sessions with client and server, and decrypts live ICMP payload in-flight.',
    payload: { kind: 'mitm', version: 'v2' },
    expectedOutcome: 'mitm_succeeded',
    expectedLabel: 'MITM Succeeded (Decrypted ICMP)',
    expectedVerdict: 'Vulnerable (Baseline)',
    evidenceExpected: 'Windows attacker decrypts ICMP pings; client receives 4/4 replies via intercepted proxy.',
  },
  {
    id: 'mitm-v3',
    category: 'mitm',
    title: 'V3 MITM Rejection (Authenticated Hybrid)',
    badge: 'Transcript Auth Protected',
    badgeTone: 'emerald',
    target: 'Authenticated Hybrid V3 (TCP 5558)',
    description:
      'Windows attacker attempts the same interception on Authenticated Hybrid V3. The mutual transcript auth tags do not match; client rejects server and aborts tunnel creation.',
    payload: { kind: 'mitm', version: 'v3' },
    expectedOutcome: 'mitm_rejected',
    expectedLabel: 'MITM Rejected (Tunnel Aborted)',
    expectedVerdict: 'Defended (V3 Protected)',
    evidenceExpected: 'Client reports SERVER AUTHENTICATION FAILED; server missing client tag; qvpn0 interface absent.',
  },

  // --- DOWNGRADE COMPARISON: Hybrid -> PQC ---
  {
    id: 'downgrade-hybrid-to-pqc-baseline',
    category: 'downgrade',
    title: 'Downgrade: Hybrid → PQC (Baseline)',
    badge: 'Local Offer Tampering',
    badgeTone: 'amber',
    scenario: 'hybrid-to-pqc',
    authenticated: false,
    target: 'Negotiation Harness (Unauthenticated)',
    description:
      'Simulates client offer tampering from Hybrid down to PQC without cryptographic transcript binding. Server accepts the stripped offer.',
    payload: { kind: 'downgrade', scenario: 'hybrid-to-pqc', authenticated: false },
    expectedOutcome: 'downgrade_accepted',
    expectedLabel: 'Downgrade Accepted (Tampered Suite)',
    expectedVerdict: 'Vulnerable (Baseline)',
    evidenceExpected: 'Server logs confirm lower suite selected: PQC.',
  },
  {
    id: 'downgrade-hybrid-to-pqc-auth',
    category: 'downgrade',
    title: 'Downgrade: Hybrid → PQC (Authenticated)',
    badge: 'Auth-Bound Negotiation',
    badgeTone: 'emerald',
    scenario: 'hybrid-to-pqc',
    authenticated: true,
    target: 'Negotiation Harness (Authenticated)',
    description:
      'Client offer is tampered from Hybrid to PQC with transcript authentication enabled. Server HMAC verification fails and rejects negotiation before suite selection.',
    payload: { kind: 'downgrade', scenario: 'hybrid-to-pqc', authenticated: true },
    expectedOutcome: 'downgrade_rejected',
    expectedLabel: 'Downgrade Rejected (Auth Failure)',
    expectedVerdict: 'Defended (V3 Protected)',
    evidenceExpected: 'Server logs show CLIENT NEGOTIATION AUTHENTICATION FAILED before suite selection.',
  },

  // --- DOWNGRADE COMPARISON: Hybrid -> Classical ---
  {
    id: 'downgrade-hybrid-to-classical-baseline',
    category: 'downgrade',
    title: 'Downgrade: Hybrid → Classical (Baseline)',
    badge: 'Local Offer Tampering',
    badgeTone: 'amber',
    scenario: 'hybrid-to-classical',
    authenticated: false,
    target: 'Negotiation Harness (Unauthenticated)',
    description:
      'Tampering strips PQC from Hybrid offer down to Classical only. Unauthenticated server accepts classical suite.',
    payload: { kind: 'downgrade', scenario: 'hybrid-to-classical', authenticated: false },
    expectedOutcome: 'downgrade_accepted',
    expectedLabel: 'Downgrade Accepted (Classical Fallback)',
    expectedVerdict: 'Vulnerable (Baseline)',
    evidenceExpected: 'Server selects Classical cipher suite; downgrade succeeds.',
  },
  {
    id: 'downgrade-hybrid-to-classical-auth',
    category: 'downgrade',
    title: 'Downgrade: Hybrid → Classical (Authenticated)',
    badge: 'Auth-Bound Negotiation',
    badgeTone: 'emerald',
    scenario: 'hybrid-to-classical',
    authenticated: true,
    target: 'Negotiation Harness (Authenticated)',
    description:
      'Tampering strips PQC from Hybrid offer with transcript auth enabled. Server HMAC mismatch triggers immediate handshake abort.',
    payload: { kind: 'downgrade', scenario: 'hybrid-to-classical', authenticated: true },
    expectedOutcome: 'downgrade_rejected',
    expectedLabel: 'Downgrade Rejected (Integrity Preserved)',
    expectedVerdict: 'Defended (V3 Protected)',
    evidenceExpected: 'Server aborts before suite selection; negotiation integrity maintained.',
  },

  // --- DOWNGRADE COMPARISON: PQC -> Classical ---
  {
    id: 'downgrade-pqc-to-classical-baseline',
    category: 'downgrade',
    title: 'Downgrade: PQC → Classical (Baseline)',
    badge: 'Local Offer Tampering',
    badgeTone: 'amber',
    scenario: 'pqc-to-classical',
    authenticated: false,
    target: 'Negotiation Harness (Unauthenticated)',
    description:
      'Client offer is stripped from PQC to Classical. Unauthenticated server falls back to Classical cipher suite without verifying negotiation integrity.',
    payload: { kind: 'downgrade', scenario: 'pqc-to-classical', authenticated: false },
    expectedOutcome: 'downgrade_accepted',
    expectedLabel: 'Downgrade Accepted (Quantum Protection Lost)',
    expectedVerdict: 'Vulnerable (Baseline)',
    evidenceExpected: 'Server accepts Classical negotiation; PQC security lost.',
  },
  {
    id: 'downgrade-pqc-to-classical-auth',
    category: 'downgrade',
    title: 'Downgrade: PQC → Classical (Authenticated)',
    badge: 'Auth-Bound Negotiation',
    badgeTone: 'emerald',
    scenario: 'pqc-to-classical',
    authenticated: true,
    target: 'Negotiation Harness (Authenticated)',
    description:
      'Client offer is stripped from PQC to Classical with transcript authentication enabled. Server rejects tampered offer and protects quantum-safe baseline.',
    payload: { kind: 'downgrade', scenario: 'pqc-to-classical', authenticated: true },
    expectedOutcome: 'downgrade_rejected',
    expectedLabel: 'Downgrade Rejected (Tampering Blocked)',
    expectedVerdict: 'Defended (V3 Protected)',
    evidenceExpected: 'Server rejects tampered offer; client receives rejection; abort verified.',
  },
];

/**
 * Query current experiment controller status
 * Endpoint: GET http://192.168.56.101:8010/experiments/status
 */
export async function getExperimentControllerStatus() {
  const res = await api.get('/experiments/status', {
    baseUrl: CLIENT_EXPERIMENT_URL,
    timeout: 6000,
  });

  if (!res.ok || !res.data) {
    return {
      available: false,
      state: 'UNREACHABLE',
      error: res.error || 'Experiment controller is offline or unreachable at port 8010.',
      running: false,
      current: null,
      last: null,
    };
  }

  return {
    available: true,
    state: res.data.state || (res.data.running ? 'RUNNING' : 'IDLE'),
    running: res.data.running === true,
    current: res.data.current || null,
    last: res.data.last || null,
    raw: res.data,
  };
}

/**
 * Execute a security experiment action via the client controller
 * Endpoint: POST http://192.168.56.101:8010/experiments/run
 * 
 * Timeout must be >= 90 seconds (we use 95s) as per handoff spec!
 */
export async function runSecurityExperiment(payload) {
  const res = await api.post('/experiments/run', payload, {
    baseUrl: CLIENT_EXPERIMENT_URL,
    timeout: EXPERIMENT_TIMEOUT_MS,
  });

  if (res.ok && res.data?.success === true) {
    return {
      success: true,
      status: res.status,
      outcome: res.data.outcome, // 'mitm_succeeded' | 'mitm_rejected' | 'downgrade_accepted' | 'downgrade_rejected'
      data: res.data,
      clientLogs: res.data.client_logs || res.data.client_log || '',
      serverLogs: res.data.server_logs || res.data.server_log || '',
      windowsLogs: res.data.windows_logs || res.data.attacker_log || '',
      error: null,
    };
  }

  // Non-200 or failure outcome
  let errorMessage = res.data?.message || res.data?.error || res.error;
  if (res.status === 409) {
    errorMessage = 'Another experiment or process is currently active on the controller.';
  } else if (res.status === 422) {
    errorMessage = 'Experiment run was inconclusive or prerequisites failed (check VM controller).';
  } else if (res.isTimeout) {
    errorMessage = `Experiment timed out after ${EXPERIMENT_TIMEOUT_MS / 1000}s. Check VM and Windows controllers.`;
  }

  return {
    success: false,
    status: res.status,
    outcome: res.data?.outcome || 'failed',
    data: res.data || null,
    error: errorMessage || 'Experiment failed to complete.',
  };
}

