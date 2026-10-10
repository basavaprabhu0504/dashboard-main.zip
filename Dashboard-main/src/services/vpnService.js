import { api } from './api';

const CLIENT_AGENT_URL = import.meta.env.VITE_CLIENT_AGENT_URL || 'http://192.168.56.101:8000';
const SERVER_AGENT_URL = import.meta.env.VITE_SERVER_AGENT_URL || 'http://192.168.56.102:8000';
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_DASHBOARD_REQUEST_TIMEOUT_MS) || 15000;

export class QvpnRequestError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'QvpnRequestError';
    this.details = details;
  }
}

/**
 * Expected mode configurations and network properties per handoff specification
 */
export const VPN_MODES = {
  CLASSICAL: {
    id: 'classical',
    name: 'Classical OpenVPN',
    label: 'Classical OpenVPN (AES-256-GCM)',
    startPath: '/vpn/start/classical',
    expectedMode: 'classical',
    expectedInterface: 'tun0',
    clientIp: '10.8.0.2',
    serverIp: '10.8.0.1',
    transport: 'UDP / OpenVPN tun0',
    description: 'Standard classical cryptographic tunnel over tun0 with TLS and AES-256-GCM.',
  },
  PQC: {
    id: 'pqc',
    name: 'Post-Quantum VPN',
    label: 'Post-Quantum (ML-KEM-768)',
    startPath: '/vpn/start/pqc',
    expectedMode: 'pqc',
    expectedInterface: 'qvpn0',
    clientIp: '10.20.0.2',
    serverIp: '10.20.0.1',
    transport: 'TCP 5559 (qvpn0)',
    description: 'Standalone Post-Quantum tunnel using ML-KEM-768 key encapsulation.',
  },
  HYBRID_V2: {
    id: 'hybrid',
    name: 'Unauthenticated Hybrid V2',
    label: 'Hybrid V2 (Unauthenticated X25519 + ML-KEM-768)',
    startPath: '/vpn/start/hybrid-v2',
    legacyStartPath: '/vpn/start/hybrid',
    expectedMode: 'hybrid',
    expectedInterface: 'qvpn0',
    clientIp: '10.20.0.2',
    serverIp: '10.20.0.1',
    transport: 'TCP 5558 (qvpn0)',
    description: 'Dual key exchange baseline (Classical ECDH + PQC) without mutual handshake transcript authentication.',
  },
  HYBRID_V3: {
    id: 'hybrid_v3',
    name: 'Authenticated Hybrid V3',
    label: 'Authenticated Hybrid V3 (Mutual Transcript Auth)',
    startPath: '/vpn/start/hybrid-v3',
    expectedMode: 'hybrid_v3',
    expectedInterface: 'qvpn0',
    clientIp: '10.20.0.2',
    serverIp: '10.20.0.1',
    transport: 'TCP 5558 (qvpn0)',
    description: 'Post-Quantum Hybrid tunnel with mutual transcript authentication (HMAC/PSK) defeating active MITM and downgrade tampering.',
  },
};

/**
 * Fetch raw status from Client Agent (which queries Server Agent)
 * Endpoint: GET /vpn/status
 * Modes returned: 'classical' | 'pqc' | 'hybrid' | 'hybrid_v3' | null
 */
export async function getRawVpnStatus() {
  const res = await api.get('/vpn/status', {
    baseUrl: CLIENT_AGENT_URL,
    timeout: REQUEST_TIMEOUT_MS,
  });

  if (!res.ok || !res.data) {
    return {
      available: false,
      error: res.error || `Client agent unreachable at ${CLIENT_AGENT_URL}`,
      vpn: { active: false, mode: null },
      server: { vpn: { active: false, mode: null } },
    };
  }

  const data = res.data;
  const clientVpn = data.vpn || { active: false, mode: null };
  const serverData = data.server || {};
  const serverVpn = serverData.vpn || { active: false, mode: null };

  return {
    available: true,
    machine: data.machine || 'qvpn-client',
    role: data.role || 'client',
    vpn: clientVpn,
    server: serverData,
    serverVpn: serverVpn,
  };
}

/**
 * Agent reachability probe: GET /status
 */
export async function getAgentReachability() {
  const res = await api.get('/status', {
    baseUrl: CLIENT_AGENT_URL,
    timeout: 5000,
  });

  return {
    online: res.ok && res.data?.agent === 'running',
    data: res.data || null,
    error: res.error || null,
  };
}

/**
 * Standardized status summary for UI cards and monitoring
 */
export async function getVpnStatusSummary() {
  const raw = await getRawVpnStatus();

  if (!raw.available) {
    return {
      available: false,
      serverOnline: false,
      clientOnline: false,
      serverActive: false,
      clientActive: false,
      vpnRunning: false,
      vpnState: 'STATUS_UNKNOWN',
      mode: null,
      interfaceName: null,
      localIp: null,
      peerIp: null,
      transport: null,
      errors: [raw.error],
      server: null,
      client: null,
    };
  }

  const clientVpn = raw.vpn || {};
  const serverVpn = raw.serverVpn || {};

  const clientActive = clientVpn.active === true;
  // Note per handoff: Server can temporarily report state:"listening" while waiting; require active === true
  const serverActive = serverVpn.active === true;
  const mode = clientVpn.mode || serverVpn.mode || null;

  let vpnState = 'IDLE';
  if (clientActive && serverActive) {
    vpnState = 'CONNECTED';
  } else if (clientActive || serverActive || clientVpn.state === 'listening' || serverVpn.state === 'listening') {
    vpnState = 'CONNECTING';
  } else if (!clientActive && !serverActive) {
    vpnState = 'DISCONNECTED';
  }

  return {
    available: true,
    serverOnline: true,
    clientOnline: true,
    serverActive,
    clientActive,
    vpnRunning: clientActive && serverActive,
    vpnState,
    mode, // 'classical' | 'pqc' | 'hybrid' | 'hybrid_v3'
    interfaceName: clientVpn.interface || (mode === 'classical' ? 'tun0' : 'qvpn0'),
    localIp: clientVpn.local_ip || null,
    peerIp: clientVpn.peer_ip || null,
    server: serverVpn,
    client: clientVpn,
    errors: [],
  };
}

export async function getAgentAvailability() {
  const status = await getVpnStatusSummary();
  return {
    serverOnline: status.serverOnline,
    clientOnline: status.clientOnline,
    available: status.available,
  };
}

export async function getServerStatus() {
  const status = await getVpnStatusSummary();
  return status.server;
}

export async function getClientStatus() {
  const status = await getVpnStatusSummary();
  return status.client;
}

/**
 * Common validator: Requires response success AND verified live active status
 */
async function verifyTunnelAfterStart(expectedMode) {
  for (let attempt = 0; attempt < 6; attempt++) {
    await new Promise((r) => setTimeout(r, 1000));
    const summary = await getVpnStatusSummary();

    if (summary.vpnRunning && summary.mode === expectedMode) {
      return summary;
    }
  }

  const finalSummary = await getVpnStatusSummary();
  throw new QvpnRequestError(
    `Start request completed, but both agents did not verify an active ${expectedMode} tunnel.`,
    finalSummary
  );
}

/**
 * 1. Start Classical OpenVPN
 * Endpoint: POST /vpn/start/classical
 */
export async function startClassicalVPN() {
  const res = await api.post('/vpn/start/classical', {}, {
    baseUrl: CLIENT_AGENT_URL,
    timeout: 30000,
  });

  if (!res.ok || res.data?.success !== true) {
    throw new QvpnRequestError(res.data?.message || res.error || 'Failed to start Classical OpenVPN.');
  }

  const verified = await verifyTunnelAfterStart('classical');
  return { success: true, message: res.data.message, status: verified };
}

/**
 * 2. Start Post-Quantum VPN
 * Endpoint: POST /vpn/start/pqc
 */
export async function startPqcVPN() {
  const res = await api.post('/vpn/start/pqc', {}, {
    baseUrl: CLIENT_AGENT_URL,
    timeout: 30000,
  });

  if (!res.ok || res.data?.success !== true) {
    throw new QvpnRequestError(res.data?.message || res.error || 'Failed to start Post-Quantum VPN.');
  }

  const verified = await verifyTunnelAfterStart('pqc');
  return { success: true, message: res.data.message, status: verified };
}

/**
 * 3. Start Unauthenticated Hybrid V2 VPN
 * Endpoint: POST /vpn/start/hybrid-v2 (reported mode: 'hybrid')
 */
export async function startHybridVPN() {
  const res = await api.post('/vpn/start/hybrid-v2', {}, {
    baseUrl: CLIENT_AGENT_URL,
    timeout: 30000,
  });

  if (!res.ok || res.data?.success !== true) {
    throw new QvpnRequestError(res.data?.message || res.error || 'Failed to start Hybrid V2 VPN.');
  }

  const verified = await verifyTunnelAfterStart('hybrid');
  return { success: true, message: res.data.message, status: verified };
}

export const startHybridV2VPN = startHybridVPN;

/**
 * 4. Start Authenticated Hybrid V3 VPN
 * Endpoint: POST /vpn/start/hybrid-v3 (reported mode: 'hybrid_v3')
 */
export async function startAuthenticatedHybridVPN() {
  const res = await api.post('/vpn/start/hybrid-v3', {}, {
    baseUrl: CLIENT_AGENT_URL,
    timeout: 35000,
  });

  if (!res.ok || res.data?.success !== true) {
    throw new QvpnRequestError(res.data?.message || res.error || 'Failed to start Authenticated Hybrid V3 VPN.');
  }

  const verified = await verifyTunnelAfterStart('hybrid_v3');
  return { success: true, message: res.data.message, status: verified };
}

/**
 * Stop Whole Session
 * Endpoint: POST /vpn/stop
 * Stops local VPN, server VPN, and server chat process.
 */
export async function stopVPN() {
  const res = await api.post('/vpn/stop', {}, {
    baseUrl: CLIENT_AGENT_URL,
    timeout: 30000,
  });

  if (!res.ok || res.data?.success !== true) {
    console.warn('POST /vpn/stop reported warnings or errors:', res.data || res.error);
  }

  await new Promise((r) => setTimeout(r, 1000));
  const finalSummary = await getVpnStatusSummary();
  return {
    success: finalSummary.vpnState === 'DISCONNECTED' || finalSummary.vpnState === 'IDLE',
    message: res.data?.message || 'VPN stop requested.',
    status: finalSummary,
  };
}

export const stopClassicalVPN = stopVPN;

/**
 * Fetch V3 Process Logs
 * Endpoint: GET /vpn/logs?lines=80
 * Allowed lines: 1-200
 * Target: 'client' (192.168.56.101:8000) or 'server' (192.168.56.102:8000)
 */
export async function getVpnLogs(lines = 80, target = 'client') {
  const clampedLines = Math.max(1, Math.min(Number(lines) || 80, 200));
  const baseUrl = target === 'server' ? SERVER_AGENT_URL : CLIENT_AGENT_URL;

  const res = await api.get(`/vpn/logs?lines=${clampedLines}`, {
    baseUrl,
    timeout: 10000,
  });

  if (!res.ok || !res.data) {
    return {
      success: false,
      error: res.error || `Failed to fetch logs from ${target} agent`,
      lines: [],
      hasMutualAuthSuccess: false,
    };
  }

  const logLines = Array.isArray(res.data.lines) ? res.data.lines : [];
  const hasMutualAuthSuccess = logLines.some((l) =>
    l.includes('Mutual transcript authentication SUCCESS')
  );

  return {
    success: true,
    machine: res.data.machine,
    mode: res.data.mode,
    source: res.data.source,
    lines: logLines,
    hasMutualAuthSuccess,
  };
}

/**
 * Send real application chat message across the active tunnel
 * Endpoint: POST /chat/send, JSON { "message": "..." }
 * 
 * STRICT HANDOFF REQUIREMENT:
 * - NO synthetic ACK path.
 * - NO synthetic response, destination, or mode fallbacks.
 * - Return actual server response ONLY when res.ok && res.data.success === true.
 * - Display honest error if failed.
 */
export async function sendChatMessage(message) {
  const trimmed = String(message || '').trim();
  if (!trimmed) {
    return {
      success: false,
      error: 'Message cannot be empty.',
    };
  }

  let res = await api.post('/chat/send', { message: trimmed }, {
    baseUrl: CLIENT_AGENT_URL,
    timeout: 15000,
  });

  if (!res.ok || res.data?.success !== true) {
    console.info('Retrying chat send once...');
    await new Promise((r) => setTimeout(r, 600));
    res = await api.post('/chat/send', { message: trimmed }, {
      baseUrl: CLIENT_AGENT_URL,
      timeout: 15000,
    });
  }

  if (res.ok && res.data?.success === true) {
    return {
      success: true,
      sentMessage: res.data.sent_message || trimmed,
      serverResponse: res.data.response,
      destination: res.data.destination,
      vpnMode: res.data.vpn,
      raw: res.data,
    };
  }

  const errorMessage =
    res.data?.message ||
    res.data?.error ||
    res.error ||
    `Chat send failed with status ${res.status || 'network error'}`;

  return {
    success: false,
    error: errorMessage,
    stage: res.data?.stage || 'transport',
    sentMessage: trimmed,
    serverResponse: null,
    destination: null,
  };
}

/**
 * Check chat server readiness: GET /chat/status
 */
export async function getChatStatus() {
  const res = await api.get('/chat/status', {
    baseUrl: CLIENT_AGENT_URL,
    timeout: 8000,
  });

  return {
    ok: res.ok,
    chatServer: res.data?.chat_server || null,
    error: res.error || null,
  };
}
