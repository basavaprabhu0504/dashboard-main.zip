# QVPN agent update for four live VPN modes

This archive contains independent agent files for the Ubuntu client and server VMs. Deploy `client/agent.py` to `/home/client/qvpn-agent/agent.py` on qvpn-client and `server/agent.py` to `/home/server/qvpn-agent/agent.py` on qvpn-server. Make a timestamped backup of each deployed file first. The supplied source is prepared for the VM addresses and directories observed in the September 22 lab session.

## API

Both agents retain `/vpn/start/classical`, `/vpn/start/pqc`, `/vpn/start/hybrid`, `/vpn/stop`, `/vpn/status`, and `/status`. The legacy `/vpn/start/hybrid` remains the V2 baseline. Two explicit routes are added: `/vpn/start/hybrid-v2` (V2 alias) and `/vpn/start/hybrid-v3` (authenticated V3). `GET /vpn/logs` returns up to 200 lines of the local V3 process log and does not return the PSK. The client agent still controls server startup and chat through the server agent.

Modes reported in status are `classical`, `pqc`, `hybrid` (legacy V2 identifier), and `hybrid_v3`. The server may report `active: false, state: listening` before a client connects. A mode is `active: true` only after the expected interface address exists. The server now returns on listener readiness for PQC, V2, and V3; it waits for the OpenVPN service to become active for Classical. The client then verifies the interface and starts the chat server.

## Operational constraints

- Start only one tunnel mode at a time. V2 and V3 share TCP 5558 and `qvpn0`.
- Agents need Python Flask, `ip`, `ss`, `sudo -n`, and `stdbuf`; the referenced VPN binaries and root-readable V3 PSK must already exist.
- Run each agent with the privilege required to stop its own tracked VPN process group, or provision narrowly scoped system controls. The existing setup used `sudo -n` to start binaries.
- These Flask agents listen on host-only VM addresses on TCP 8000 and have permissive CORS inherited from the previous agents. Keep the VM network isolated.
- The chat server accepts one connection and exits. The server agent checks listening state through `ss`, avoiding an accidental connection that would consume the message. A later send restarts chat as needed.
- V3 source in the VM presently returns exit code zero after authentication failure. The agents therefore require an actual `qvpn0` address before claiming success. The V3 log gives the failure reason after the process exits.
- The negotiation and MITM experiments are separate programs; these agent endpoints do not launch them.

## Verification order

1. Back up each existing `agent.py` and install the matching file. Run `python3 -m py_compile` for both before starting.
2. Start server and client agents; check `GET /status` on each host-only address.
3. POST to the client agent `/vpn/start/hybrid-v3`. Confirm both `/vpn/status` responses report `hybrid_v3`, `active: true`, and `qvpn0` with `10.20.0.2` and `10.20.0.1` respectively.
4. Send chat through the client agent, check bidirectional ping, then POST to the client agent `/vpn/stop`. Confirm both interfaces and listeners are gone.
5. Repeat the normal start/stop checks for the existing modes. Keep detailed results as live evidence only when the VM outputs prove them.

## Dashboard handoff note

The existing React dashboard calls `/vpn/start/hybrid` for its Hybrid button; that still starts V2. Add a separate Authenticated V3 control calling `/vpn/start/hybrid-v3`, and treat `hybrid_v3` as a distinct status. The dashboard's current chat service has a synthetic success fallback when a real send fails; remove that behavior before claiming live chat success. The detailed dashboard data contract is a later deliverable, after agent API rehearsal.
