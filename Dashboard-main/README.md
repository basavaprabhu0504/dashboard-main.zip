# QVPN Security Evaluation Dashboard

React/Vite dashboard for the verified QVPN lab. The security-critical controls call the existing VM agents and experiment controllers; the dashboard does not create VPN tunnels or attack results itself.

## Live control architecture

- Client QVPN agent: `http://192.168.56.101:8000`
- Server QVPN agent: `http://192.168.56.102:8000`
- Client experiment controller: `http://192.168.56.101:8010`
- Server experiment controller: `http://192.168.56.102:8010`
- Windows attack controller: `http://192.168.56.1:8011`

The frontend provides four distinct tunnel controls:

- Classical OpenVPN: `POST /vpn/start/classical`
- PQC ML-KEM-768: `POST /vpn/start/pqc`
- Hybrid V2 (unauthenticated): `POST /vpn/start/hybrid-v2`
- Hybrid V3 (authenticated transcript): `POST /vpn/start/hybrid-v3`

All tunnel modes stop through `POST /vpn/stop`. Application chat uses the real `POST /chat/send` response and has no synthetic ACK fallback.

The Security Experiments page exposes the eight verified actions through `POST /experiments/run`: V2/V3 MITM plus baseline/authenticated variants of Hybrid→PQC, Hybrid→Classical, and PQC→Classical downgrade tests. Downgrade tests are accurately labelled as a local offer-tampering harness, not an in-path interceptor.

## Required lab processes

Before opening the dashboard, run the following long-lived processes:

1. Client VM: QVPN agent on port 8000 and VM experiment controller on port 8010.
2. Server VM: QVPN agent on port 8000 and VM experiment controller on port 8010.
3. Windows host: attack controller on port 8011.

Use the exact launch commands and prerequisites in `QVPN-Dashboard-Handoff.md` at the repository root.

```ini
QVPN_SERVER_AGENT_URL=http://192.168.56.102:8000
QVPN_CLIENT_AGENT_URL=http://192.168.56.101:8000
QVPN_AGENT_TIMEOUT_SECONDS=8
```

### 2. Start Flask Backend

```bash
py -m pip install -r backend/requirements.txt
py backend/app.py
```

### 3. Start Frontend Dashboard

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### QVPN control-agent integration

The browser communicates only with the dashboard backend. For Classical VPN, the backend starts the server agent first, then the client agent, and checks both `/vpn/status` endpoints before displaying a connected state. Disconnect reverses that order.

Copy `.env.example` to `.env` when the default addresses need to change:

```ini
VITE_DASHBOARD_API_BASE=/api
VITE_DASHBOARD_REQUEST_TIMEOUT_MS=10000
```

On a Mac, the VirtualBox host-only addresses may be unreachable; this is handled as a visible status error, not a simulated connection. Deploy by pushing the repository to GitHub, pulling it on the Windows host, configuring `backend/.env` if needed, then running `npm install`, `python backend/app.py`, and `npm run dev`. The browser does not call Ubuntu agents directly, avoiding a browser-to-agent CORS dependency.

---

## Key Features

- **VPN Control Page**: Start/Stop Classical OpenVPN via SSH systemctl & daemon commands. Launch Python socket chat application across the tunnel.
- **Lab Overview Page**: Real SSH health status, ping, CPU, memory, and IP layout for Ubuntu Server and Client VMs.
- **Packet Monitoring Page**: Real-time `tcpdump -i tun0` packet capture and protocol breakdown.
- **Performance Page**: CPU, Memory, Latency, and Handshake time-series metrics.
- **Logs Page**: Collects live `journalctl -u openvpn*` logs over SSH with log copy, search, and download features.
- **Results Page**: Reads dynamic evaluation result JSON files stored in `backend/results/`.
