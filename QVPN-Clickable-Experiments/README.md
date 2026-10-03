# QVPN clickable security experiment controllers

These controllers add opt-in dashboard actions for **two real in-path MITM lab demonstrations** and **three negotiation-harness downgrade comparisons**. The existing VPN agents on TCP 8000 remain responsible for normal tunnels. The client VM controller coordinates experiments on TCP 8010; a second copy on the server VM runs the one-shot negotiation listener; the Windows attacker controller runs on TCP 8011. Keep the machines on the isolated host-only network and start **no normal VPN** during an experiment. These controllers have no API authentication and should never be exposed on NAT, public networks, or other clients.

## Install without replacing the working agents

1. Copy `vm_controller.py` to `/home/client/qvpn-experiments/vm_controller.py` and `/home/server/qvpn-experiments/vm_controller.py`; copy `windows_controller.py` to `C:\QVPN-MITM\windows_controller.py`. Copying these files does not change the installed `agent.py` files.
2. On Windows, verify `py -c "import flask; from cryptography.hazmat.primitives.asymmetric.mlkem import MLKEM768PrivateKey; print('ready')"`. The Windows scripts must be at `C:\QVPN-MITM\qvpn_hybrid_crypto_mitm.py` and `C:\QVPN-MITM\qvpn_authenticated_hybrid_mitm.py`. The V3 script **must contain exactly one** `send_exact(server_sock, server_mlkem_ct)` call, as in the corrected script tested September 22; controller checks this before launching.
3. On client VM, verify `/home/client/qvpn-pqc/hybrid_tunnel/client_mitm`, `/home/client/qvpn-pqc/hybrid_v3_auth/client_mitm`, `/home/client/qvpn-pqc/negotiation_experiment/negotiated_client` and `/home/client/qvpn-pqc/negotiation_experiment/negotiated_client_pqc` exist. Both `client_mitm` binaries must target `192.168.56.1:15558`, not the real server. The PQC-specific negotiation client must start with original offer `PQC CLASSICAL` for its `--tamper-pqc-to-classical` option.
4. On server VM, verify `/home/server/qvpn-pqc/negotiation_experiment/negotiated_server` exists. Ensure both VM agents (`:8000`) are running and VPN status inactive.
5. Start three new controllers in **separate terminals**. Server VM: `sudo python3 /home/server/qvpn-experiments/vm_controller.py --role server`. Windows PowerShell: `py -u C:\QVPN-MITM\windows_controller.py`. Client VM: `sudo python3 /home/client/qvpn-experiments/vm_controller.py --role client`. Check `curl -sS http://192.168.56.101:8010/experiments/status` on client and `curl -sS http://192.168.56.1:8011/attack/status` from Windows. The client controller must reach the server controller on `192.168.56.102:8010` and the Windows controller on `192.168.56.1:8011`.

## Dashboard API (client controller `http://192.168.56.101:8010`)

POST `/experiments/run` with JSON, then display the returned evidence. Poll GET `/experiments/status` during the run. The POST can take **up to 60 seconds**; set this request's frontend timeout at least 90 seconds. HTTP 200 with `success:true` is the only confirmed result. HTTP 422 is inconclusive; HTTP 409 means another run is in progress; HTTP 500 is an execution error. The controller accepts only the fixed experiments below, accepts no command strings or arbitrary script paths, and serializes runs.

| Button | JSON POST body | Expected `outcome` on success |
| --- | --- | --- |
| V2 MITM | `{"kind":"mitm","version":"v2"}` | `mitm_succeeded`; returns client ping evidence and Windows attacker log. |
| V3 MITM rejection | `{"kind":"mitm","version":"v3"}` | `mitm_rejected`; returns client, server and attacker logs and proof client has no `qvpn0`. Do not use exit code alone: existing V3 C client may exit zero on rejection. |
| Hybrid → PQC baseline | `{"kind":"downgrade","scenario":"hybrid-to-pqc","authenticated":false}` | `downgrade_accepted`. |
| Hybrid → PQC authenticated | Same JSON with `"authenticated":true` | `downgrade_rejected`. |
| Hybrid → Classical | Scenario `hybrid-to-classical`, run once false and once true | Accepted then rejected. |
| PQC → Classical | Scenario `pqc-to-classical`, run once false and once true | Accepted then rejected using corrected PQC-specific client binary. |

Example from client VM: `curl -sS -H 'Content-Type: application/json' -d '{"kind":"downgrade","scenario":"hybrid-to-pqc","authenticated":false}' http://192.168.56.101:8010/experiments/run`. Run baseline and authenticated variants **separately**. The negotiation harness changes the client offer locally before transmission; it is not Windows in-path interception and is not part of live V3 suite selection. Never label downgrade buttons as in-path V3 attacks.

The V2 MITM button starts server V2 through server agent, launches the Windows cryptographic attacker, launches special client, sends four pings through `qvpn0`, and requires Windows logs of a successful two-leg handshake and decrypted ICMP. V3 starts its corresponding programs, requires client `SERVER AUTHENTICATION FAILED`, Windows forwarded-tag evidence, server no-client-tag evidence, and absence of client `qvpn0`. Each action stops the spawned client, Windows attacker and server tunnel in a `finally` block. Normal dashboard VPN buttons continue to call the client agent `:8000`, not `:8010`.

## Observed verification and evaluator preparation

On September 22, after installing the three controllers, the lab returned `success:true` for V3 MITM rejection, V2 MITM with four received pings and Windows decrypted ICMP logs, and all six baseline/authenticated downgrade actions. The V3 run was followed by checks that both agents were inactive, client `qvpn0` absent, server TCP 5558 free, and Windows attacker `running:false`/`tracked:false`. The downgrade results are from the standalone client-side offer tampering harness. Preserve the manually demonstrated scripts as fallback. The dashboard buttons themselves must still be implemented and tested by the dashboard team; an API success does not prove UI wiring.
