# Quantum VPN Security Evaluation Platform - Control Center

A real-time remote control dashboard and monitoring platform for evaluating Classical OpenVPN and Quantum-Safe VPNs across Ubuntu Server & Client Virtual Machines.

## Architecture

- **Frontend**: React, Vite, Tailwind CSS, Framer Motion, Chart.js (Runs on Windows Dashboard machine)
- **Backend**: Python Flask REST API (runs on the Windows dashboard host)
- **Target VMs**: Ubuntu Server VM (OpenVPN Server) & Ubuntu Client VM (OpenVPN Client)

```
React Frontend (Port 3000)
    ↓ /api proxy
Flask Dashboard Backend (Port 5000)
    ↓ HTTP control-agent API
QVPN Server Agent (192.168.56.102:8000)  ←-- OpenVPN Tun0 --→  QVPN Client Agent (192.168.56.101:8000)
```

---

## Setup & Running Instructions

### 1. Environment Configuration

Copy `backend/.env.example` to `backend/.env`. Configure the QVPN agent URLs for Classical VPN control; SSH settings remain available for monitoring, logs, performance, and socket chat:

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
