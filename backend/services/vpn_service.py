import base64
import datetime
import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from dotenv import load_dotenv
from services.ssh_service import ssh_service

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))


class AgentRequestError(Exception):
    """A failure returned by, or while reaching, a QVPN Flask agent."""


class VPNService:
    def __init__(self):
        self.server_agent_url = os.getenv("QVPN_SERVER_AGENT_URL", "http://192.168.56.102:8000").rstrip("/")
        self.client_agent_url = os.getenv("QVPN_CLIENT_AGENT_URL", "http://192.168.56.101:8000").rstrip("/")
        self.agent_timeout = float(os.getenv("QVPN_AGENT_TIMEOUT_SECONDS", "30"))
        self.server_tunnel_ip = os.getenv("SERVER_TUNNEL_IP", "10.8.0.1")
        self.client_tunnel_ip = os.getenv("CLIENT_TUNNEL_IP", "10.8.0.2")
        self.start_time = None

    def _agent_url(self, agent, path):
        base_url = self.server_agent_url if agent == "server" else self.client_agent_url
        return f"{base_url}{path}"

    def _request_agent(self, agent, path, method="GET", timeout=None):
        t = timeout or self.agent_timeout
        request = Request(
            self._agent_url(agent, path),
            method=method,
            headers={"Accept": "application/json", "Content-Type": "application/json"},
        )
        try:
            with urlopen(request, timeout=t) as response:
                raw_body = response.read().decode("utf-8")
        except HTTPError as error:
            body = error.read().decode("utf-8", errors="replace")
            try:
                message = json.loads(body).get("message") or json.loads(body).get("error")
            except json.JSONDecodeError:
                message = None
            raise AgentRequestError(message or f"QVPN {agent.title()} Agent returned HTTP {error.code}.") from error
        except URLError as error:
            raise AgentRequestError(f"QVPN {agent.title()} Agent is unreachable.") from error
        except TimeoutError as error:
            raise AgentRequestError(f"QVPN {agent.title()} Agent did not respond in time.") from error

        try:
            return json.loads(raw_body) if raw_body else {}
        except json.JSONDecodeError as error:
            raise AgentRequestError(f"QVPN {agent.title()} Agent returned invalid JSON.") from error

    def _request_agent_json(self, agent, path, method="POST", payload=None, timeout=None):
        """POST with a JSON body."""
        t = timeout or self.agent_timeout
        body = json.dumps(payload or {}).encode("utf-8")
        request = Request(
            self._agent_url(agent, path),
            data=body,
            method=method,
            headers={"Accept": "application/json", "Content-Type": "application/json"},
        )
        try:
            with urlopen(request, timeout=t) as response:
                raw_body = response.read().decode("utf-8")
        except HTTPError as error:
            body_text = error.read().decode("utf-8", errors="replace")
            try:
                message = json.loads(body_text).get("message") or json.loads(body_text).get("error")
            except json.JSONDecodeError:
                message = None
            raise AgentRequestError(message or f"QVPN {agent.title()} Agent returned HTTP {error.code}.") from error
        except URLError as error:
            raise AgentRequestError(f"QVPN {agent.title()} Agent is unreachable.") from error
        except TimeoutError as error:
            raise AgentRequestError(f"QVPN {agent.title()} Agent did not respond in time.") from error

        try:
            return json.loads(raw_body) if raw_body else {}
        except json.JSONDecodeError as error:
            raise AgentRequestError(f"QVPN {agent.title()} Agent returned invalid JSON.") from error

    @staticmethod
    def _is_successful(response):
        return isinstance(response, dict) and response.get("success") is True

    def _agent_host(self, agent):
        return urlparse(self.server_agent_url if agent == "server" else self.client_agent_url).hostname

    # ─────────────────────────────────────────────────────────────
    # STATUS
    # ─────────────────────────────────────────────────────────────

    def get_status(self):
        agent_status = {}
        vpn_status = {}
        errors = []
        checks = [(agent, "health", "/status") for agent in ("server", "client")]
        checks += [(agent, "vpn", "/vpn/status") for agent in ("server", "client")]
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = {executor.submit(self._request_agent, agent, path): (agent, check_type)
                       for agent, check_type, path in checks}
            for future in as_completed(futures):
                agent, check_type = futures[future]
                try:
                    if check_type == "health":
                        agent_status[agent] = future.result()
                    else:
                        vpn_status[agent] = future.result()
                except AgentRequestError as error:
                    errors.append(error.args[0])

        server_vpn = vpn_status.get("server", {})
        client_vpn = vpn_status.get("client", {})

        # Support both legacy {active: bool} and new {vpn: {active: bool}} shapes
        server_active = server_vpn.get("active") or (server_vpn.get("vpn") or {}).get("active", False)
        client_active = client_vpn.get("active") or (client_vpn.get("vpn") or {}).get("active", False)

        status_unavailable = "server" not in vpn_status or "client" not in vpn_status
        if status_unavailable:
            vpn_state = "STATUS_UNKNOWN"
        elif server_active and client_active:
            vpn_state = "CONNECTED"
        elif server_active or client_active:
            vpn_state = "PARTIAL_CONNECTION"
        else:
            vpn_state = "DISCONNECTED"

        # Determine active mode from client vpn status
        client_vpn_detail = client_vpn.get("vpn") or client_vpn
        active_mode = client_vpn_detail.get("mode") if client_vpn_detail.get("active") else None

        if vpn_state == "CONNECTED" and self.start_time is None:
            self.start_time = datetime.datetime.now()
        elif vpn_state != "CONNECTED":
            self.start_time = None

        uptime = "00:00:00"
        if self.start_time:
            elapsed = int((datetime.datetime.now() - self.start_time).total_seconds())
            hours, remainder = divmod(elapsed, 3600)
            minutes, seconds = divmod(remainder, 60)
            uptime = f"{hours:02d}:{minutes:02d}:{seconds:02d}"

        # Determine tunnel IPs based on mode
        if active_mode == "classical":
            tunnel_ip = "10.8.0.1"
            connected_client = "10.8.0.2"
        elif active_mode in ("pqc", "hybrid", "hybrid_v3"):
            tunnel_ip = "10.20.0.1"
            connected_client = "10.20.0.2"
        else:
            tunnel_ip = "Unknown"
            connected_client = "Unknown"

        return {
            "serverOnline": "server" in agent_status,
            "clientOnline": "client" in agent_status,
            "serverActive": server_active,
            "clientActive": client_active,
            "vpnRunning": server_active and client_active,
            "vpnState": vpn_state,
            "activeMode": active_mode,
            "server": vpn_status.get("server"),
            "client": vpn_status.get("client"),
            "service": server_vpn.get("service") or client_vpn.get("service"),
            "serverHost": self._agent_host("server"),
            "clientHost": self._agent_host("client"),
            "tunnelIP": tunnel_ip,
            "connectedClient": connected_client,
            "cipher": "AES-256-GCM" if active_mode == "classical" else ("Kyber-1024 + ChaCha20" if active_mode == "pqc" else ("Kyber-1024 + X25519 + AES" if active_mode == "hybrid" else ("HMAC-Transcript Auth" if active_mode == "hybrid_v3" else "Not reported by agent"))),
            "uptime": uptime,
            "errors": list(dict.fromkeys(errors)),
        }

    # ─────────────────────────────────────────────────────────────
    # START HELPERS — delegate to client agent which orchestrates both VMs
    # ─────────────────────────────────────────────────────────────

    def _start_mode(self, mode_path, mode_label):
        """
        Call the client agent's start endpoint.  The agent handles
        signalling the server agent and establishing the local tunnel.
        Timeout is generous (60 s) as the agent waits for interface up.
        """
        try:
            response = self._request_agent("client", f"/vpn/start/{mode_path}", method="POST", timeout=60)
            if not self._is_successful(response):
                return {"success": False, "message": response.get("message", f"Unable to start {mode_label} VPN."), "details": response}
        except AgentRequestError as error:
            return {"success": False, "message": f"Unable to start {mode_label} VPN: {error}"}

        return {"success": True, "message": f"{mode_label} VPN started successfully.", "status": self.get_status()}

    def start_classical(self):
        return self._start_mode("classical", "Classical")

    def start_pqc(self):
        return self._start_mode("pqc", "PQC")

    def start_hybrid(self):
        return self._start_mode("hybrid", "Hybrid V2")

    def start_hybrid_v3(self):
        return self._start_mode("hybrid-v3", "Hybrid V3")

    # ─────────────────────────────────────────────────────────────
    # STOP — delegate to client agent which handles both VMs
    # ─────────────────────────────────────────────────────────────

    def stop_vpn(self):
        try:
            response = self._request_agent("client", "/vpn/stop", method="POST", timeout=30)
            success = self._is_successful(response)
        except AgentRequestError as error:
            return {"success": False, "message": f"VPN stop failed: {error}"}

        status = self.get_status()
        if success:
            return {"success": True, "message": "VPN session stopped.", "status": status}
        return {"success": False, "message": response.get("message", "VPN stop completed with errors."), "details": response, "status": status}

    def stop_classical(self):
        return self.stop_vpn()

    # ─────────────────────────────────────────────────────────────
    # CHAT — SSH-based socket demo over active VPN tunnel
    # ─────────────────────────────────────────────────────────────

    def start_chat(self, client_message="Hello from Client"):
        status = self.get_status()
        if not status["vpnRunning"]:
            return {
                "success": False,
                "message": "VPN is not active. Start a VPN tunnel before sending a message.",
                "clientMessage": client_message,
                "serverResponse": "",
                "terminalLogs": ["[SYSTEM] VPN connection is not verified active."]
            }

        active_mode = status.get("activeMode", "classical")
        server_ip = "10.8.0.1" if active_mode == "classical" else "10.20.0.1"

        server_script = (
            "import socket\n"
            "s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)\n"
            "s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)\n"
            "s.bind(('0.0.0.0', 9999))\n"
            "s.listen(1)\n"
            "conn, addr = s.accept()\n"
            "msg = conn.recv(1024).decode()\n"
            f'reply = "ACK from Server ({server_ip}) via {active_mode.upper()}: Received \'" + msg + "\' over encrypted VPN tunnel"\n'
            "conn.sendall(reply.encode())\n"
            "conn.close()\n"
            "s.close()\n"
        )
        client_script = (
            "import socket, time\n"
            "time.sleep(0.5)\n"
            "s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)\n"
            "s.settimeout(5)\n"
            "try:\n"
            f"    s.connect(('{server_ip}', 9999))\n"
            f"    s.sendall({repr(client_message.encode('utf-8'))})\n"
            "    print('RECV: ' + s.recv(1024).decode())\n"
            "except Exception as e:\n"
            "    print('ERROR: ' + str(e))\n"
            "finally:\n"
            "    s.close()\n"
        )
        server_b64 = base64.b64encode(server_script.encode("utf-8")).decode("utf-8")
        client_b64 = base64.b64encode(client_script.encode("utf-8")).decode("utf-8")

        ssh_service.execute_on_server(
            f"python3 -c \"import base64; exec(base64.b64decode('{server_b64}'))\" > /dev/null 2>&1 &",
            timeout=1
        )
        client_output, client_error, client_code = ssh_service.execute_on_client(
            f"python3 -c \"import base64; exec(base64.b64decode('{client_b64}'))\"",
            timeout=7
        )
        if client_code == 0 and "RECV:" in client_output:
            response_text = client_output.split("RECV:", 1)[1].strip()
            return {
                "success": True,
                "message": "Message sent and response received over VPN tunnel.",
                "clientMessage": client_message,
                "serverResponse": response_text,
                "terminalLogs": [
                    f"[CLIENT → SERVER] Sent: \"{client_message}\"",
                    f"[CLIENT] Received: \"{response_text}\"",
                    f"[TUNNEL] Mode: {active_mode.upper()} | Server: {server_ip}:9999"
                ]
            }
        return {
            "success": False,
            "message": "Socket chat could not be completed over the VPN tunnel.",
            "clientMessage": client_message,
            "serverResponse": "",
            "terminalLogs": [f"[CLIENT] Socket chat failed: {client_error or client_output or 'no response'}"]
        }

    def get_logs(self, lines=80, target="client"):
        try:
            clamped = max(1, min(int(lines), 200))
            return self._request_agent(target, f"/vpn/logs?lines={clamped}")
        except Exception as e:
            return {"success": False, "error": str(e), "lines": []}


vpn_service = VPNService()
