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

## Frontend setup

```powershell
cd Dashboard-main
npm install
npm run dev
```

Open `http://localhost:3001`.

Optional frontend environment variables:

```ini
VITE_CLIENT_AGENT_URL=http://192.168.56.101:8000
VITE_SERVER_AGENT_URL=http://192.168.56.102:8000
VITE_CLIENT_EXPERIMENT_URL=http://192.168.56.101:8010
VITE_DASHBOARD_REQUEST_TIMEOUT_MS=15000
VITE_EXPERIMENT_TIMEOUT_MS=95000
```

The Vite development proxy also exposes `/agent`, `/server-agent`, and `/experiments-proxy`. Absolute defaults are used by the current services so the browser must be able to reach the host-only VM addresses.

## Optional legacy/telemetry backend

The Flask backend under `backend/` is not required for the four VPN controls, chat, or the eight security experiments. It is used only by the older results, performance, monitoring, and log pages.

```powershell
py -m pip install -r backend/requirements.txt
py backend/app.py
```

Do not treat illustrative chart data as measured evidence. Evaluator evidence must come from live agent status, V3 process logs, and experiment-controller result logs.

## Verification

```powershell
npm run build
```

Then perform the live checklist in `QVPN-Dashboard-Handoff.md`: verify all four start/stop modes, real chat ACKs, V3 mutual-auth logs, both MITM outcomes, all six downgrade outcomes, controller timeouts, and mutual exclusion between normal VPN sessions and experiments.
