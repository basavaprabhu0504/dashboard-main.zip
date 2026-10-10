# QVPN Dashboard Team — Final One-Go Completion Guide

Repository: `https://github.com/basavaprabhu0504/dashboard-main.zip`  
Reviewed base commit: `d21e5d04a90aec080428c21f478975cbc7c2cbc7`  
Dashboard directory: `Dashboard-main/`

## 1. What the team must do

There are only two required activities:

1. Apply the complete repository patch in Section 3 (or make the same edits manually).
2. Run the live acceptance checklist in Section 7.

Sections marked **optional** must not delay the evaluator demonstration.

## 2. Preserve the working implementation

The repository already contains the following required functionality. Do not replace it with mocked responses or a second control architecture:

- Four VPN controls: Classical, PQC, Hybrid V2 and authenticated Hybrid V3.
- Real chat through the client agent's `/chat/send` endpoint.
- Client/server tunnel status and V3 logs.
- Eight clickable experiments: two MITM cases and six downgrade cases.
- A 95-second experiment timeout.
- Downgrade labels that clearly say local offer tampering, not in-path interception.

The live endpoints are:

| Component | URL |
|---|---|
| Client QVPN agent | `http://192.168.56.101:8000` |
| Server QVPN agent | `http://192.168.56.102:8000` |
| Client experiment controller | `http://192.168.56.101:8010` |
| Server experiment controller | `http://192.168.56.102:8010` |
| Windows attack controller | `http://192.168.56.1:8011` |

## 3. Mandatory repository fixes

### Fastest safe method: apply the supplied final patch

Copy `QVPN-Dashboard-Final-Completion.patch` beside the cloned repository, then run from the repository root:

```powershell
git status
git apply --check .\QVPN-Dashboard-Final-Completion.patch
git apply .\QVPN-Dashboard-Final-Completion.patch
git diff --check
```

If `git apply --check` fails because the dashboard team changed the same files after the reviewed commit, do not force it. Apply the requirements below manually and preserve their newer unrelated work.

### 3.1 Honest tunnel-start verification

File: `Dashboard-main/src/services/vpnService.js`

`verifyTunnelAfterStart(expectedMode)` must throw `QvpnRequestError` if polling finishes without both agents reporting an active tunnel in the requested mode. It must not return an inactive status and allow the caller to interpret the start as successful.

Required behaviour:

```javascript
const finalSummary = await getVpnStatusSummary();
throw new QvpnRequestError(
  `Start request completed, but both agents did not verify an active ${expectedMode} tunnel.`,
  finalSummary
);
```

### 3.2 Parse the actual experiment-controller response

File: `Dashboard-main/src/services/experimentService.js`

The real `/experiments/status` response is shaped like:

```json
{
  "role": "client",
  "state": "idle|running|completed|failed",
  "result": null
}
```

It does not provide dependable `running`, `current` and `last` fields. Normalize `state`, derive `running` from `state === "running"`, and expose completed/failed `result` as `last`.

Also return `online: true` or use `available` consistently in the UI.

### 3.3 Remove the nonexistent experiment-stop integration

File: `Dashboard-main/src/services/experimentService.js`

Remove `stopExperiment()` and all references to:

```text
POST /experiments/stop
```

The supplied `vm_controller.py` does not implement this endpoint. Do not add a Stop Experiment button unless the controller is deliberately extended and cleanup is tested.

### 3.4 Correct the controller-ready indicator

File: `Dashboard-main/src/pages/AttackControl.jsx`

Use:

```javascript
controllerState?.available
```

instead of the old nonexistent `controllerState?.online` assumption, unless `online` is explicitly added by the service.

### 3.5 Enforce mutual exclusion in both directions

File: `Dashboard-main/src/hooks/useVpnStatus.js`

The Attack page already blocks experiments when a normal VPN is active. Before starting a VPN, also call `getExperimentControllerStatus()` and block the start when `running === true`.

Required message:

```text
Cannot start a normal VPN while a security experiment is running. Wait for the experiment to finish.
```

### 3.6 Fix API-wrapper consumption

Files:

- `Dashboard-main/src/hooks/useLogs.js`
- `Dashboard-main/src/hooks/useMetrics.js`
- `Dashboard-main/src/hooks/useResults.js`

`api.get()` returns:

```javascript
{ ok, status, data, error }
```

Therefore these hooks must read `response.data`, not treat the entire response wrapper as the endpoint payload.

Example:

```javascript
const response = await api.get('/results');
if (response.ok && Array.isArray(response.data?.results)) {
  setResults(response.data.results);
}
```

### 3.7 Restore the optional backend's correct base URL

File: `Dashboard-main/src/services/api.js`

Use:

```javascript
const DEFAULT_BASE_URL = import.meta.env.VITE_DASHBOARD_API_BASE || '/api';
```

VPN and experiment services already supply their explicit agent/controller URLs. The default base is for the optional Flask backend pages.

### 3.8 Remove fabricated success and metrics fallbacks

Files:

- `Dashboard-main/src/pages/Results.jsx`
- `Dashboard-main/src/pages/Logs.jsx`
- `Dashboard-main/src/pages/Performance.jsx`

Required rules:

- Do not create a fake PASS result when the Results API returns no records.
- Do not display mock log lines when the Logs API is unavailable.
- Display `N/A` instead of invented performance values such as 18 ms, 22 ms, 18%, 1.4k or 99.2%.
- Do not display a fixed `100% Detection Rate` or `95/100 Security Score` without a documented calculation from real results.

### 3.9 Label packet visualizations honestly

File: `Dashboard-main/src/pages/PacketMonitoring.jsx`

The current packet charts and rows are static UI data, not live `tcpdump` output. Every such section must say **Illustrative — not measured evidence**. Do not call the `14,280` packet figure, timestamps or `128 B` values verified September evidence.

Live tunnel mode, interface and IP information may continue to be labelled live because they come from the agents.

### 3.10 Replace the outdated README

File: `Dashboard-main/README.md`

The README must describe:

- the five live processes and their ports;
- four VPN modes;
- real chat;
- eight experiments;
- `npm run dev` on port 3001;
- the optional role of the Flask backend;
- the requirement not to present illustrative data as measurements.

The supplied patch contains a complete corrected README.

### 3.11 Complete the Report page and evidence history

Files:

- `Dashboard-main/src/services/experimentHistory.js` (new)
- `Dashboard-main/src/pages/AttackControl.jsx`
- `Dashboard-main/src/pages/Report.jsx`

Every completed or failed experiment response must be stored in browser `localStorage` under `qvpn.experimentHistory.v1`. Store at most 50 records and preserve the returned `client_log`, `server_log`, `attacker_log` and `client_ping` fields.

The Report page must provide working controls for:

- Print / Save PDF through the browser print dialog;
- download all saved results as JSON;
- download a summary as CSV;
- download combined client/server/attacker/ping evidence as a text file;
- clear locally saved history after confirmation.

It must show latest-result evidence and a run-history table. When no experiment has been run, it must display an honest empty state. It must never generate a predetermined verdict.

### 3.12 Mark the Comparison page as qualitative

File: `Dashboard-main/src/pages/Comparison.jsx`

The radar scores and latency values are static. Mark the page and radar chart as **Qualitative / Illustrative** and state that the values must not be cited as measured experimental results.

## 4. Required dashboard runtime

Before using the dashboard, the following must already be running:

| Machine | Required process | Port |
|---|---|---:|
| Client VM | `agent.py` | 8000 |
| Client VM | `vm_controller.py` | 8010 |
| Server VM | `agent.py` | 8000 |
| Server VM | `vm_controller.py` | 8010 |
| Windows host | `windows_controller.py` | 8011 |

The dashboard controls these services through HTTP. It should not attempt to start VirtualBox, SSH into the VMs, or fabricate a successful result when a service is unavailable.

## 5. Dashboard setup

From `Dashboard-main/`:

```powershell
npm install
npm run build
npm run dev
```

Open:

```text
http://localhost:3001
```

Optional `.env` values:

```ini
VITE_CLIENT_AGENT_URL=http://192.168.56.101:8000
VITE_SERVER_AGENT_URL=http://192.168.56.102:8000
VITE_CLIENT_EXPERIMENT_URL=http://192.168.56.101:8010
VITE_DASHBOARD_API_BASE=/api
VITE_DASHBOARD_REQUEST_TIMEOUT_MS=15000
VITE_EXPERIMENT_TIMEOUT_MS=95000
```

## 6. Expected experiment mapping

| Dashboard action | Request payload | Required outcome |
|---|---|---|
| V2 MITM | `{"kind":"mitm","version":"v2"}` | `mitm_succeeded` |
| V3 MITM | `{"kind":"mitm","version":"v3"}` | `mitm_rejected` |
| Hybrid→PQC baseline | `{"kind":"downgrade","scenario":"hybrid-to-pqc","authenticated":false}` | `downgrade_accepted` |
| Hybrid→PQC authenticated | Same scenario with `authenticated:true` | `downgrade_rejected` |
| Hybrid→Classical baseline | `{"kind":"downgrade","scenario":"hybrid-to-classical","authenticated":false}` | `downgrade_accepted` |
| Hybrid→Classical authenticated | Same scenario with `authenticated:true` | `downgrade_rejected` |
| PQC→Classical baseline | `{"kind":"downgrade","scenario":"pqc-to-classical","authenticated":false}` | `downgrade_accepted` |
| PQC→Classical authenticated | Same scenario with `authenticated:true` | `downgrade_rejected` |

The dashboard should show the returned client, server, attacker and ping logs when present. It must not replace them with predetermined text.

## 7. One final acceptance checklist

Perform this once after merging:

- [ ] `npm run build` succeeds.
- [ ] Client and server agents show reachable.
- [ ] Both experiment controllers and Windows controller are reachable.
- [ ] Classical starts, shows `tun0`, sends real chat, and stops cleanly.
- [ ] PQC starts, shows `qvpn0`, sends real chat, and stops cleanly.
- [ ] Hybrid V2 starts, shows `qvpn0`, sends real chat, and stops cleanly.
- [ ] Hybrid V3 starts and both sides report `hybrid_v3`.
- [ ] V3 logs show `Mutual transcript authentication SUCCESS`.
- [ ] V3 real chat returns the server ACK.
- [ ] V2 MITM returns `mitm_succeeded` and the 4/4 ping evidence.
- [ ] V3 MITM returns `mitm_rejected`, auth failure, and no tunnel interface.
- [ ] All three baseline downgrade cases return `downgrade_accepted`.
- [ ] All three authenticated downgrade cases return `downgrade_rejected`.
- [ ] Experiment buttons are blocked while a VPN is active.
- [ ] VPN start is blocked while an experiment is active.
- [ ] Final stop leaves no `qvpn0`/`tun0` and no VPN listener.
- [ ] No page reports a mock value as live or measured evidence.
- [ ] Completed experiments appear on the Report page after navigation.
- [ ] JSON, CSV and Evidence Logs downloads create real files.
- [ ] Print / Save PDF opens the browser print dialog with the evidence report.
- [ ] Clear History removes locally stored report entries only after confirmation.

## 8. Optional improvements — do not block submission

These are not required for the completed evaluator workflow:

- Live `tcpdump` streaming and real-time packet charts.
- Automated benchmark collection for handshake, throughput, CPU and memory.
- Central multi-user/server-side experiment storage (browser-local history is already included).
- Automatic graph-image and screenshot exports.
- Emergency experiment cancellation.

If these are not implemented, disable their buttons or label them clearly as unavailable/illustrative. Do not simulate completion.

## 9. Accuracy rules for visible text

- Use `ML-KEM-768` for the implemented standardized PQC algorithm.
- Describe V2 MITM and V3 MITM as real Windows in-path experiments.
- Describe downgrade experiments as local client-offer tampering harnesses.
- Do not claim V3 is universally secure; state only that it rejected the implemented MITM and authenticated downgrade tests.
- Do not cite radar scores, placeholder latency values or illustrative packet counts as research measurements.

## 10. Definition of done

The dashboard team's work is complete when Section 7 passes, including the Report page checks. The optional items in Section 8 are enhancements and are not prerequisites for demonstrating the completed QVPN project.
