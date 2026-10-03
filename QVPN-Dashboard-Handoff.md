# QVPN dashboard team handoff

The updated agents are installed on the lab VMs. The user-facing dashboard should call the **client agent** at `http://192.168.56.101:8000` (`VITE_CLIENT_AGENT_URL`), which orchestrates the server agent at `http://192.168.56.102:8000`. For clickable MITM and downgrade experiments, call the separate **client experiment controller** at `http://192.168.56.101:8010`; its partner controllers run on server VM `:8010` and Windows `192.168.56.1:8011`. All three controllers have been installed and their eight experiment API actions were live verified September 22; the dashboard's buttons still need implementation and UI testing. All controllers have permissive CORS and no API authentication, so keep them on the isolated host-only lab network. The ZIP [QVPN-Agent-Update.zip](QVPN-Agent-Update.zip) contains existing client and server agent sources; the separate [QVPN-Clickable-Experiments.zip](QVPN-Clickable-Experiments.zip) contains experiment controllers and deployment instructions.

## Endpoint contract

| Action | Method and client-agent path | Expected success / important fields |
| --- | --- | --- |
| Agent reachability | `GET /status` | `agent:"running"`, `vpn` current local state. |
| Live state, including server | `GET /vpn/status` | `vpn.active`, `vpn.mode`, `vpn.interface`, `vpn.local_ip`, `vpn.peer_ip`, plus `server.vpn` with corresponding server values. |
| Classical OpenVPN | `POST /vpn/start/classical` | `success:true`, `vpn.mode:"classical"`, `tun0`, client `10.8.0.2`, server `10.8.0.1`. |
| PQC | `POST /vpn/start/pqc` | `success:true`, `vpn.mode:"pqc"`, `qvpn0`, client `10.20.0.2`, server `10.20.0.1`, transport TCP 5559. |
| Unauthenticated Hybrid V2 | `POST /vpn/start/hybrid-v2` | `success:true`, **reported mode `hybrid`**, `qvpn0`, TCP 5558. Legacy `POST /vpn/start/hybrid` is the same V2 mode. |
| Authenticated Hybrid V3 | `POST /vpn/start/hybrid-v3` | `success:true`, **reported mode `hybrid_v3`**, `qvpn0`, TCP 5558. This is the control to add to the dashboard. |
| Send application message | `POST /chat/send`, JSON `{"message":"..."}` | `success:true`, `sent_message`, `response` from real server, `destination` and `vpn`. Empty message gives HTTP 400; no active tunnel gives HTTP 409. |
| Chat readiness | `GET /chat/status` | `chat_server` contains forwarded server result. A one-shot chat server may exit after each message and restart on the next send. |
| V3 local process log | `GET /vpn/logs?lines=80` | `mode:"hybrid_v3"`, `lines` (1–200 allowed), and `source`. This URL on the client returns client logs. To show server logs, fetch `http://192.168.56.102:8000/vpn/logs` explicitly. Logs represent the last V3 run, even after stop. |
| Stop whole session | `POST /vpn/stop` | `success:true`; stops local VPN, server VPN and server chat. Recheck status on both after stop. |

Use response `success` **and** a fresh `GET /vpn/status` before displaying a tunnel as running; require `vpn.active === true`, expected mode/interface/IP, and matching `server.vpn.active === true`. The server can temporarily report `state:"listening"` while waiting for the client; this is not an established VPN. For V3, show mutual authentication only if the V3 log contains `Mutual transcript authentication SUCCESS` for the run and both tunnels are active. Show unavailable when agent requests fail; do not infer success from cached status. Do not render PSK bytes or truncated key fingerprints as handshake evidence.

## Required dashboard source changes

1. In `src/services/vpnService.js`, add `startAuthenticatedHybridVPN()` calling `api.post('/vpn/start/hybrid-v3')`. Keep the existing `startHybridVPN()` as Hybrid V2; change its label so no one confuses it with authenticated V3. Update the `getVpnStatus()` mode comment/type to include `hybrid_v3`. Add a helper for `GET /vpn/logs` if showing live V3 authentication logs.
2. In `src/pages/VPNConfiguration.jsx`, add a fourth mode card/control and status state for V3. Map `hybrid_v3` to V3, `hybrid` to V2; enable one mode at a time and poll `GET /vpn/status` after starting and stopping. Use a fresh status response rather than setting `RUNNING` merely because a POST returned success. The existing `AuthenticatedHybrid.jsx` page describes V3 but is not itself a start control.
3. In `src/services/vpnService.js` `sendChatMessage`, **remove the synthetic ACK path** which returns success when `/chat/send` fails but `/vpn/status` is active. Also remove synthetic default `response`, `destination`, and mode values on successful sends; display `res.data.response`, `res.data.destination`, and `res.data.vpn` only when `res.ok && res.data.success === true`. A retry is fine, but after both attempts fail show the actual error. Otherwise the UI can claim a chat reply that never happened.
4. In `src/pages/PacketMonitoring.jsx` and any mode badges/filters, add a distinct `hybrid_v3` display. The live status API does not supply packet capture events, throughput, or a packet feed; do not label local static values as live telemetry. Annotate archived benchmark and MITM/downgrade results as saved lab evidence with experiment type and date. Do not turn the separate negotiation harness into a claimed in-path V3 downgrade test.
5. On the Security Experiments page, add V2 MITM, V3 MITM rejection, and six baseline/authenticated downgrade actions. Call `POST http://192.168.56.101:8010/experiments/run` with one of the **fixed JSON bodies** documented in `QVPN-Clickable-Experiments.zip`'s `README.md`; poll `GET /experiments/status` while a run is in progress. This controller orchestrates the Windows attacker and VM programs; the existing VPN agent does not. Set this request's timeout to at least 90 seconds: the shared `src/services/api.js` uses a 15-second timeout, which is too short for MITM plus four pings. Prevent simultaneous experiment and normal VPN buttons. Display the returned `outcome` only when `success === true`, and show errors/inconclusive responses faithfully. Label downgrade results **negotiation harness (local offer tampering)**, not Windows in-path or live V3 negotiation.

## Acceptance checks for the team

- Starting V3 calls `/vpn/start/hybrid-v3`, both client and server status report `hybrid_v3` active, and V3 success is supported by logs and a successful tunnel ping or chat ACK.
- Starting V2 calls `/vpn/start/hybrid-v2` (or legacy `/vpn/start/hybrid`) and displays `hybrid`, not authenticated V3.
- Classical, PQC, V2 and V3 each show their own active mode after a verified start, and all return to inactive after `POST /vpn/stop`.
- With the chat server unavailable or the network broken, the UI shows a failure, **never an invented server ACK**. With a working tunnel, display the exact ACK returned by the API.
- When either agent cannot be reached, show an error or unavailable state. Stale V3 logs and static experiment results must remain identified as historical.
- Once all three experiment controllers have been installed and validated, each attack button displays the client, server and Windows evidence returned from that actual run. A failed or unavailable controller never displays an archived result as live. Tests should include MITM v2, MITM v3, all three downgrade scenarios in both modes, and cleanup after each run.

## Verified experiment API outcomes (September 22)

| Client controller request | Observed API outcome | Independent evidence returned |
| --- | --- | --- |
| `{"kind":"mitm","version":"v2"}` | `success:true`, `mitm_succeeded` | Windows recorded distinct client/server sessions and decrypted ICMP; client ping received 4/4. |
| `{"kind":"mitm","version":"v3"}` | `success:true`, `mitm_rejected` | Client `SERVER AUTHENTICATION FAILED`, server missing client tag, attacker forwarded real tag, client `qvpn0` absent. Post-run: server 5558 free; Windows attacker stopped. |
| Hybrid→PQC, Hybrid→Classical, PQC→Classical, `authenticated:false` | `success:true`, `downgrade_accepted` for all three | Client and server logs show lower selected suite. |
| Same three scenarios, `authenticated:true` | `success:true`, `downgrade_rejected` for all three | Server logs say client negotiation authentication failed before suite selection. |

The dashboard implementation remains to be validated against these endpoints. Do not render the previous controller result as a new run while a request is pending; GET `/experiments/status` retains the previous result until the next POST changes state.

## Known implementation limits

The current C V3 client can exit with code zero after authentication rejection; judge rejection using explicit log strings and absence of established interface. Agents are manually started, not installed as systemd services. Server and client VMs were cloned with the same SSH host key; use verified host fingerprints when transferring files and plan unique host keys before wider use. The API is for an isolated evaluation lab, not a production security boundary.
