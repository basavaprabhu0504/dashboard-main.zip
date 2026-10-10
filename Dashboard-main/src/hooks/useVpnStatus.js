import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getVpnStatusSummary,
  startClassicalVPN,
  startPqcVPN,
  startHybridV2VPN,
  startAuthenticatedHybridVPN,
  stopVPN,
  getVpnLogs,
  sendChatMessage as apiSendChatMessage,
  VPN_MODES,
} from '../services/vpnService';
import { getExperimentControllerStatus } from '../services/experimentService';

const initialStatus = {
  available: false,
  serverOnline: false,
  clientOnline: false,
  serverActive: false,
  clientActive: false,
  vpnRunning: false,
  vpnState: 'IDLE',
  mode: null,
  interfaceName: null,
  localIp: null,
  peerIp: null,
  errors: [],
  server: null,
  client: null,
};

export function useVpnStatus() {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // null | 'classical' | 'pqc' | 'hybrid' | 'hybrid_v3' | 'stopping'
  const [chatLoading, setChatLoading] = useState(false);
  const [chatOutput, setChatOutput] = useState(null);
  const [v3Logs, setV3Logs] = useState({ lines: [], hasMutualAuthSuccess: false, loading: false });
  const [message, setMessage] = useState(null);
  const pollingRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const summary = await getVpnStatusSummary();
      setStatus(summary);

      // If active mode is hybrid_v3, optionally refresh verification logs
      if (summary.vpnRunning && summary.mode === 'hybrid_v3') {
        const logData = await getVpnLogs(60, 'client');
        if (logData.success) {
          setV3Logs({
            lines: logData.lines,
            hasMutualAuthSuccess: logData.hasMutualAuthSuccess,
            loading: false,
          });
        }
      }
      return summary;
    } catch (error) {
      const failedState = {
        ...initialStatus,
        vpnState: 'STATUS_UNKNOWN',
        errors: [error.message || 'Agent unreachable'],
      };
      setStatus(failedState);
      return failedState;
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll status periodically (every 4 seconds)
  useEffect(() => {
    const poll = () => {
      if (!document.hidden) {
        fetchStatus();
      }
    };

    poll();
    pollingRef.current = setInterval(poll, 4000);
    document.addEventListener('visibilitychange', poll);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      document.removeEventListener('visibilitychange', poll);
    };
  }, [fetchStatus]);

  // Generic tunnel starter that enforces single-mode exclusivity and checks live confirmation
  const handleStartMode = async (modeKey) => {
    if (actionLoading) return;

    if (status.vpnRunning) {
      setMessage({
        type: 'error',
        text: `Cannot start ${VPN_MODES[modeKey].name}: another tunnel (${status.mode?.toUpperCase()}) is already active. Stop the current tunnel first.`,
      });
      return;
    }

    const modeConfig = VPN_MODES[modeKey];
    setActionLoading(modeConfig.id);
    setMessage({
      type: 'info',
      text: `Initiating ${modeConfig.name}... preparing server and local client.`,
    });

    try {
      let result;
      if (modeKey === 'CLASSICAL') {
        result = await startClassicalVPN();
      } else if (modeKey === 'PQC') {
        result = await startPqcVPN();
      } else if (modeKey === 'HYBRID_V2') {
        result = await startHybridV2VPN();
      } else if (modeKey === 'HYBRID_V3') {
        result = await startAuthenticatedHybridVPN();
      }

      // Re-fetch fresh live status directly from agent
      const freshStatus = await fetchStatus();

      if (freshStatus.vpnRunning && freshStatus.mode === modeConfig.expectedMode) {
        let successText = `${modeConfig.name} successfully established on ${freshStatus.interfaceName} (${freshStatus.localIp} ↔ ${freshStatus.peerIp}).`;
        if (modeKey === 'HYBRID_V3') {
          const logs = await getVpnLogs(80, 'client');
          if (logs.hasMutualAuthSuccess) {
            successText += ' Mutual transcript authentication verified.';
          }
        }
        setMessage({ type: 'success', text: successText });
      } else {
        setMessage({
          type: 'error',
          text: `${modeConfig.name} start command sent, but tunnel verification failed or is not active on both nodes.`,
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || `Failed to start ${modeConfig.name}.`,
      });
    } finally {
      setActionLoading(null);
      fetchStatus();
    }
  };

  const startClassicalVpn = () => handleStartMode('CLASSICAL');
  const startPqcVpn = () => handleStartMode('PQC');
  const startHybridV2Vpn = () => handleStartMode('HYBRID_V2');
  const startHybridV3Vpn = () => handleStartMode('HYBRID_V3');

  const stopCurrentVpn = async () => {
    if (actionLoading) return;

    setActionLoading('stopping');
    setMessage({
      type: 'info',
      text: 'Stopping VPN session: stopping local tunnel, remote server tunnel, and chat services...',
    });

    try {
      const res = await stopVPN();
      const freshStatus = await fetchStatus();

      if (!freshStatus.vpnRunning) {
        setMessage({
          type: 'success',
          text: 'VPN tunnel and associated listeners stopped successfully.',
        });
        setChatOutput(null);
      } else {
        setMessage({
          type: 'error',
          text: 'Stop command completed, but one or more interfaces or processes remain active.',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Error occurred while stopping VPN session.',
      });
    } finally {
      setActionLoading(null);
      fetchStatus();
    }
  };

  /**
   * Application chat message over tunnel
   * STRICT REQUIREMENT: No fabricated ACKs! Only display real API server response.
   */
  const sendChatMessage = async (customMessage = 'Hello from Client') => {
    const trimmed = String(customMessage || '').trim();
    if (!trimmed) {
      setMessage({ type: 'error', text: 'Chat message cannot be empty.' });
      return;
    }

    if (!status.vpnRunning) {
      setChatOutput({
        success: false,
        error: 'No active VPN tunnel. You must start a verified tunnel before sending application data.',
        terminalLogs: [
          '[CLIENT CHAT] ERROR: No active VPN tunnel.',
          '[CLIENT CHAT] Please connect Classical, PQC, Hybrid V2, or Hybrid V3 first.',
        ],
      });
      setMessage({
        type: 'error',
        text: 'No active VPN tunnel. Start a tunnel before sending messages.',
      });
      return;
    }

    setChatLoading(true);
    setChatOutput(null);

    try {
      const result = await apiSendChatMessage(trimmed);

      if (result.success) {
        setChatOutput({
          success: true,
          sentMessage: result.sentMessage,
          serverResponse: result.serverResponse,
          destination: result.destination,
          vpnMode: result.vpnMode,
          terminalLogs: [
            `[CLIENT -> SERVER] Sent payload: "${result.sentMessage}"`,
            `[DESTINATION] ${result.destination} over ${result.vpnMode} tunnel`,
            `[SERVER RESPONSE] ${result.serverResponse}`,
          ],
        });
        setMessage({
          type: 'success',
          text: `Verified response received from Server over ${result.vpnMode?.toUpperCase()} tunnel!`,
        });
      } else {
        setChatOutput({
          success: false,
          error: result.error,
          sentMessage: result.sentMessage,
          serverResponse: null,
          terminalLogs: [
            `[CLIENT -> SERVER] Attempted payload: "${result.sentMessage}"`,
            `[CLIENT CHAT] DELIVERY FAILED: ${result.error}`,
          ],
        });
        setMessage({
          type: 'error',
          text: `Chat delivery failed: ${result.error}`,
        });
      }
    } catch (error) {
      setChatOutput({
        success: false,
        error: error.message || 'Transmission error',
        terminalLogs: [`[CLIENT CHAT] Fatal error: ${error.message}`],
      });
      setMessage({ type: 'error', text: `Chat failed: ${error.message}` });
    } finally {
      setChatLoading(false);
    }
  };

  const refreshV3Logs = async (lines = 80) => {
    setV3Logs((prev) => ({ ...prev, loading: true }));
    const logData = await getVpnLogs(lines, 'client');
    setV3Logs({
      lines: logData.lines,
      hasMutualAuthSuccess: logData.hasMutualAuthSuccess,
      loading: false,
    });
    return logData;
  };

  return {
    status,
    loading,
    actionLoading,
    chatLoading,
    chatOutput,
    v3Logs,
    message,
    setMessage,
    startClassicalVpn,
    startPqcVpn,
    startHybridV2Vpn,
    startHybridV3Vpn,
    stopVpn: stopCurrentVpn,
    stopClassicalVpn: stopCurrentVpn,
    sendChatMessage,
    sendSocketMessage: sendChatMessage,
    refreshV3Logs,
    refreshStatus: fetchStatus,
  };
}
