from flask import Flask, jsonify, request
import subprocess
import socket
import time
import os
import signal
import json
import urllib.request
import urllib.error

app = Flask(__name__)

# ============================================================
# QVPN CLIENT AGENT
# ============================================================

MACHINE = "qvpn-client"
ROLE = "client"

SERVER_AGENT_URL = "http://192.168.56.102:8000"

CLASSICAL_SERVICE = "openvpn-client@client"

PQC_BINARY = "/home/client/qvpn-pqc/pqc_tunnel/client"
PQC_PORT = 5559

HYBRID_BINARY = "/home/client/qvpn-pqc/hybrid_tunnel/client"
HYBRID_PORT = 5558
HYBRID_V3_BINARY = "/home/client/qvpn-pqc/hybrid_v3_auth/client"

CLASSICAL_INTERFACE = "tun0"
CLASSICAL_LOCAL_IP = "10.8.0.2"
CLASSICAL_PEER_IP = "10.8.0.1"

PQC_INTERFACE = "qvpn0"
PQC_LOCAL_IP = "10.20.0.2"
PQC_PEER_IP = "10.20.0.1"

HYBRID_INTERFACE = "qvpn0"
HYBRID_LOCAL_IP = "10.20.0.2"
HYBRID_PEER_IP = "10.20.0.1"

VPN_SERVER_IP = "192.168.56.102"

CHAT_PORT = 5000

PID_DIR = "/tmp/qvpn-agent"
PQC_PID_FILE = os.path.join(PID_DIR, "pqc_client.pid")
HYBRID_PID_FILE = os.path.join(PID_DIR, "hybrid_client.pid")
HYBRID_V3_PID_FILE = os.path.join(PID_DIR, "hybrid_v3_client.pid")
HYBRID_V3_LOG = os.path.join(PID_DIR, "hybrid_v3_client.log")


# ============================================================
# CORS — React/Vite dashboard
# ============================================================

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response


# ============================================================
# HELPERS
# ============================================================

def run_command(command, timeout=20):
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout.strip(),
            "stderr": result.stderr.strip(),
            "returncode": result.returncode
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Command timed out", "returncode": -1}
    except Exception as e:
        return {"success": False, "error": str(e), "returncode": -1}


def ensure_pid_dir():
    os.makedirs(PID_DIR, exist_ok=True)


def write_pid(path, pid):
    ensure_pid_dir()
    with open(path, "w") as f:
        f.write(str(pid))


def read_pid(path):
    try:
        with open(path, "r") as f:
            return int(f.read().strip())
    except Exception:
        return None


def remove_pid(path):
    try:
        os.remove(path)
    except FileNotFoundError:
        pass


def process_exists(pid):
    if not pid:
        return False
    try:
        with open(f"/proc/{pid}/stat", "r") as stat_file:
            if stat_file.read().split(") ", 1)[1].startswith("Z "):
                return False
        os.kill(pid, 0)
        return True
    except (ProcessLookupError, OSError):
        return False
    except PermissionError:
        return True


def interface_exists(interface):
    return run_command(["ip", "link", "show", interface])["returncode"] == 0


def interface_has_ip(interface, ip_address):
    result = run_command(["ip", "-4", "addr", "show", "dev", interface])
    return result["success"] and ip_address in result["stdout"]


def wait_for_interface_ip(interface, ip_address, timeout=20):
    for _ in range(timeout * 2):
        if interface_has_ip(interface, ip_address):
            return True
        time.sleep(0.5)
    return False


def tcp_port_open(host, port, timeout=1):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout)
    try:
        sock.connect((host, port))
        return True
    except Exception:
        return False
    finally:
        sock.close()


def server_agent_request(path, method="POST", payload=None, timeout=30):
    url = SERVER_AGENT_URL + path
    try:
        body = None
        if payload is not None:
            body = json.dumps(payload).encode("utf-8")

        req = urllib.request.Request(url, data=body, method=method)
        req.add_header("Content-Type", "application/json")

        with urllib.request.urlopen(req, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                data = {
                    "success": False,
                    "message": "Invalid JSON from server agent",
                    "raw": raw
                }
            return {"http_status": response.status, "data": data}

    except urllib.error.HTTPError as e:
        try:
            data = json.loads(e.read().decode("utf-8"))
        except Exception:
            data = {"success": False, "message": str(e)}
        return {"http_status": e.code, "data": data}

    except Exception as e:
        return {
            "http_status": None,
            "data": {
                "success": False,
                "message": "Unable to contact server agent",
                "error": str(e)
            }
        }


# ============================================================
# VPN STATUS
# ============================================================

def get_current_vpn():
    if interface_has_ip(CLASSICAL_INTERFACE, CLASSICAL_LOCAL_IP):
        return {
            "mode": "classical",
            "active": True,
            "interface": CLASSICAL_INTERFACE,
            "local_ip": CLASSICAL_LOCAL_IP,
            "peer_ip": CLASSICAL_PEER_IP
        }

    if run_command(["systemctl", "is-active", "--quiet", CLASSICAL_SERVICE])["success"]:
        return {"mode": "classical", "active": False, "state": "connecting",
                "interface": CLASSICAL_INTERFACE, "local_ip": None,
                "peer_ip": CLASSICAL_PEER_IP}

    pqc_pid = read_pid(PQC_PID_FILE)
    if process_exists(pqc_pid) and interface_has_ip(PQC_INTERFACE, PQC_LOCAL_IP):
        return {
            "mode": "pqc",
            "active": True,
            "interface": PQC_INTERFACE,
            "local_ip": PQC_LOCAL_IP,
            "peer_ip": PQC_PEER_IP,
            "transport": f"{VPN_SERVER_IP}:{PQC_PORT}",
            "pid": pqc_pid
        }

    hybrid_pid = read_pid(HYBRID_PID_FILE)
    if process_exists(hybrid_pid) and interface_has_ip(HYBRID_INTERFACE, HYBRID_LOCAL_IP):
        return {
            "mode": "hybrid",
            "active": True,
            "interface": HYBRID_INTERFACE,
            "local_ip": HYBRID_LOCAL_IP,
            "peer_ip": HYBRID_PEER_IP,
            "transport": f"{VPN_SERVER_IP}:{HYBRID_PORT}",
            "pid": hybrid_pid
        }

    v3_pid = read_pid(HYBRID_V3_PID_FILE)
    if process_exists(v3_pid) and interface_has_ip(HYBRID_INTERFACE, HYBRID_LOCAL_IP):
        return {"mode": "hybrid_v3", "active": True,
                "state": "tunnel_ready", "interface": HYBRID_INTERFACE,
                "local_ip": HYBRID_LOCAL_IP, "peer_ip": HYBRID_PEER_IP,
                "transport": f"{VPN_SERVER_IP}:{HYBRID_PORT}", "pid": v3_pid}

    if process_exists(v3_pid):
        return {"mode": "hybrid_v3", "active": False,
                "state": "authenticating", "interface": None,
                "local_ip": None, "peer_ip": HYBRID_PEER_IP,
                "pid": v3_pid}

    return {
        "mode": None,
        "active": False,
        "interface": None,
        "local_ip": None,
        "peer_ip": None
    }


# ============================================================
# STOP
# ============================================================

def stop_classical_internal():
    return run_command([
        "sudo", "-n", "systemctl", "stop", CLASSICAL_SERVICE
    ])


def stop_process(pid_file):
    pid = read_pid(pid_file)

    if not pid:
        remove_pid(pid_file)
        return {"success": True, "message": "Process was not running"}

    if not process_exists(pid):
        remove_pid(pid_file)
        return {"success": True, "message": "Process was already stopped", "pid": pid}

    try:
        os.killpg(os.getpgid(pid), signal.SIGTERM)
    except ProcessLookupError:
        pass
    except Exception as e:
        return {"success": False, "error": str(e), "pid": pid}

    for _ in range(30):
        if not process_exists(pid):
            break
        time.sleep(0.1)

    if process_exists(pid):
        try:
            os.killpg(os.getpgid(pid), signal.SIGKILL)
        except Exception:
            pass

    time.sleep(0.5)
    remove_pid(pid_file)

    return {"success": True, "message": "Tunnel process stopped", "pid": pid}


def delete_qvpn_interface():
    if interface_exists("qvpn0"):
        return run_command(["sudo", "-n", "ip", "link", "delete", "qvpn0"])
    return {"success": True, "message": "Interface already removed"}


def stop_current_vpn():
    if interface_has_ip(CLASSICAL_INTERFACE, CLASSICAL_LOCAL_IP) or run_command(
            ["systemctl", "is-active", "--quiet", CLASSICAL_SERVICE])["success"]:
        result = stop_classical_internal()
        return {"success": result["success"], "stopped": "classical", "details": result}

    for mode, pid_file in (("pqc", PQC_PID_FILE),
                           ("hybrid", HYBRID_PID_FILE),
                           ("hybrid_v3", HYBRID_V3_PID_FILE)):
        if read_pid(pid_file):
            result = stop_process(pid_file)
            cleanup = delete_qvpn_interface() if result["success"] else {"success": False, "message": "Process did not stop"}
            return {"success": result["success"] and cleanup["success"],
                    "stopped": mode, "details": result,
                    "interface_cleanup": cleanup}

    if interface_exists("qvpn0"):
        return {"success": False, "stopped": None,
                "message": "Untracked qvpn0 exists; inspect its owning process before cleanup"}

    return {"success": True, "stopped": None, "message": "No VPN is active"}


# ============================================================
# LOCAL VPN STARTERS
# ============================================================

def start_local_classical():
    result = run_command([
        "sudo", "-n", "systemctl", "start", CLASSICAL_SERVICE
    ])
    if not result["success"]:
        return {"success": False, "stage": "process", "details": result}

    if not wait_for_interface_ip(CLASSICAL_INTERFACE, CLASSICAL_LOCAL_IP):
        stop_classical_internal()
        return {
            "success": False,
            "stage": "tunnel",
            "message": "Classical VPN tunnel failed to establish"
        }

    return {
        "success": True,
        "vpn": {
            "mode": "classical",
            "interface": CLASSICAL_INTERFACE,
            "local_ip": CLASSICAL_LOCAL_IP,
            "peer_ip": CLASSICAL_PEER_IP
        }
    }


def start_local_pqc():
    if interface_exists("qvpn0"):
        return {"success": False, "message": "Untracked qvpn0 exists"}

    try:
        process = subprocess.Popen(
            ["sudo", "-n", PQC_BINARY],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True
        )
        write_pid(PQC_PID_FILE, process.pid)
    except Exception as e:
        return {"success": False, "stage": "process", "error": str(e)}

    if not wait_for_interface_ip(PQC_INTERFACE, PQC_LOCAL_IP):
        stop_process(PQC_PID_FILE)
        delete_qvpn_interface()
        return {
            "success": False,
            "stage": "tunnel",
            "message": "PQC VPN tunnel failed to establish"
        }

    return {
        "success": True,
        "vpn": {
            "mode": "pqc",
            "interface": PQC_INTERFACE,
            "local_ip": PQC_LOCAL_IP,
            "peer_ip": PQC_PEER_IP,
            "transport": f"{VPN_SERVER_IP}:{PQC_PORT}"
        }
    }


def start_local_hybrid():
    if interface_exists("qvpn0"):
        return {"success": False, "message": "Untracked qvpn0 exists"}

    try:
        process = subprocess.Popen(
            ["sudo", "-n", HYBRID_BINARY],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True
        )
        write_pid(HYBRID_PID_FILE, process.pid)
    except Exception as e:
        return {"success": False, "stage": "process", "error": str(e)}

    if not wait_for_interface_ip(HYBRID_INTERFACE, HYBRID_LOCAL_IP):
        stop_process(HYBRID_PID_FILE)
        delete_qvpn_interface()
        return {
            "success": False,
            "stage": "tunnel",
            "message": "Hybrid VPN tunnel failed to establish"
        }

    return {
        "success": True,
        "vpn": {
            "mode": "hybrid",
            "interface": HYBRID_INTERFACE,
            "local_ip": HYBRID_LOCAL_IP,
            "peer_ip": HYBRID_PEER_IP,
            "transport": f"{VPN_SERVER_IP}:{HYBRID_PORT}"
        }
    }


def start_local_hybrid_v3():
    if interface_exists("qvpn0"):
        return {"success": False, "message": "Untracked qvpn0 exists"}
    if not os.path.isfile(HYBRID_V3_BINARY):
        return {"success": False, "message": "V3 client binary missing"}
    try:
        ensure_pid_dir()
        with open(HYBRID_V3_LOG, "w") as log:
            process = subprocess.Popen(["sudo", "-n", "stdbuf", "-oL", "-eL", HYBRID_V3_BINARY],
                                       stdout=log, stderr=subprocess.STDOUT,
                                       start_new_session=True)
        write_pid(HYBRID_V3_PID_FILE, process.pid)
    except Exception as exc:
        return {"success": False, "stage": "process", "message": str(exc)}

    if not wait_for_interface_ip(HYBRID_INTERFACE, HYBRID_LOCAL_IP) or not process_exists(process.pid):
        result = stop_process(HYBRID_V3_PID_FILE)
        if result["success"]:
            delete_qvpn_interface()
        return {"success": False, "stage": "authentication_or_tunnel",
                "message": "V3 authentication or tunnel setup failed",
                "details": result, "log_endpoint": "/vpn/logs"}
    return {"success": True, "vpn": get_current_vpn()}


# ============================================================
# COMPLETE SESSION
# ============================================================

def prepare_remote_vpn(mode):
    response = server_agent_request(f"/vpn/start/{mode}", timeout=30)
    data = response["data"]

    if response["http_status"] != 200 or not data.get("success"):
        return {
            "success": False,
            "stage": "remote_vpn",
            "message": data.get("message", "Remote VPN server failed"),
            "server_response": data
        }

    return {"success": True, "server_response": data}


def start_remote_chat():
    response = server_agent_request("/chat/start", timeout=20)
    data = response["data"]

    if response["http_status"] != 200 or not data.get("success"):
        return {
            "success": False,
            "message": data.get("message", "Remote chat server failed"),
            "server_response": data
        }

    return {"success": True, "server_response": data}


def start_complete_session(mode):
    if mode not in ("classical", "pqc", "hybrid", "hybrid_v3"):
        return {"success": False, "message": "Invalid VPN mode"}

    current = get_current_vpn()

    if current["active"] or current.get("state") in ("authenticating", "connecting"):
        if current["mode"] == mode:
            chat = start_remote_chat()
            if not chat["success"]:
                return {
                    "success": False,
                    "stage": "chat",
                    "message": "VPN is active but chat server could not start",
                    "vpn": current,
                    "chat": chat
                }
            return {
                "success": True,
                "message": f"{mode.upper()} VPN and chat are already ready",
                "vpn": current,
                "chat": {
                    "ready": True,
                    "server": VPN_SERVER_IP,
                    "port": CHAT_PORT
                }
            }

        return {
            "success": False,
            "message": "Another VPN mode is already active",
            "active_vpn": current["mode"]
        }

    stopped = stop_current_vpn()
    if not stopped["success"]:
        return {"success": False, "stage": "preflight", "message": stopped.get("message", "Could not prepare local tunnel"), "details": stopped}

    remote = prepare_remote_vpn(mode)
    if not remote["success"]:
        return remote

    if mode == "classical":
        local = start_local_classical()
    elif mode == "pqc":
        local = start_local_pqc()
    elif mode == "hybrid":
        local = start_local_hybrid()
    else:
        local = start_local_hybrid_v3()

    if not local["success"]:
        server_agent_request("/vpn/stop", timeout=15)
        return {
            "success": False,
            "stage": "local_vpn",
            "message": "Local VPN client failed",
            "details": local
        }

    vpn = get_current_vpn()
    if not vpn["active"]:
        stop_current_vpn()
        server_agent_request("/vpn/stop", timeout=15)
        return {
            "success": False,
            "stage": "verification",
            "message": "VPN process started but tunnel verification failed"
        }

    chat = start_remote_chat()
    if not chat["success"]:
        stop_current_vpn()
        server_agent_request("/vpn/stop", timeout=15)
        return {
            "success": False,
            "stage": "chat",
            "message": "VPN established but chat server failed to start",
            "vpn": vpn,
            "chat": chat
        }

    return {
        "success": True,
        "message": f"{mode.upper()} VPN + Chat session ready",
        "vpn": vpn,
        "chat": {
            "ready": True,
            "server": VPN_SERVER_IP,
            "port": CHAT_PORT
        }
    }


# ============================================================
# VPN API
# ============================================================

@app.route("/vpn/start/classical", methods=["POST", "OPTIONS"])
def start_classical():
    if request.method == "OPTIONS":
        return ("", 204)
    result = start_complete_session("classical")
    return jsonify(result), 200 if result["success"] else 500


@app.route("/vpn/start/pqc", methods=["POST", "OPTIONS"])
def start_pqc():
    if request.method == "OPTIONS":
        return ("", 204)
    result = start_complete_session("pqc")
    return jsonify(result), 200 if result["success"] else 500


@app.route("/vpn/start/hybrid", methods=["POST", "OPTIONS"])
@app.route("/vpn/start/hybrid-v2", methods=["POST", "OPTIONS"])
def start_hybrid():
    if request.method == "OPTIONS":
        return ("", 204)
    result = start_complete_session("hybrid")
    return jsonify(result), 200 if result["success"] else 500


@app.route("/vpn/start/hybrid-v3", methods=["POST", "OPTIONS"])
def start_hybrid_v3():
    if request.method == "OPTIONS":
        return ("", 204)
    result = start_complete_session("hybrid_v3")
    return jsonify(result), 200 if result["success"] else 500


@app.route("/vpn/stop", methods=["POST", "OPTIONS"])
def stop_vpn():
    if request.method == "OPTIONS":
        return ("", 204)

    results = {}

    remote_chat = server_agent_request("/chat/stop", timeout=15)
    results["remote_chat"] = remote_chat["data"]

    local_vpn = stop_current_vpn()
    results["local_vpn"] = local_vpn

    remote_vpn = server_agent_request("/vpn/stop", timeout=15)
    results["remote_vpn"] = remote_vpn["data"]

    success = (
        local_vpn["success"]
        and remote_vpn["data"].get("success", False)
    )

    return jsonify({
        "success": success,
        "message": "Complete QVPN session stopped" if success
                   else "QVPN session stop completed with one or more errors",
        "details": results
    })


@app.route("/vpn/status", methods=["GET", "OPTIONS"])
def vpn_status():
    if request.method == "OPTIONS":
        return ("", 204)

    current = get_current_vpn()
    remote = server_agent_request("/vpn/status", method="GET", timeout=5)

    return jsonify({
        "machine": MACHINE,
        "role": ROLE,
        "vpn": current,
        "server": remote["data"]
    })


@app.route("/status", methods=["GET", "OPTIONS"])
def status():
    if request.method == "OPTIONS":
        return ("", 204)

    return jsonify({
        "machine": MACHINE,
        "role": ROLE,
        "agent": "running",
        "vpn": get_current_vpn(),
        "server_agent": SERVER_AGENT_URL
    })


# ============================================================
# CHAT API
# ============================================================

@app.route("/chat/send", methods=["POST", "OPTIONS"])
def send_chat_message():
    if request.method == "OPTIONS":
        return ("", 204)

    data = request.get_json(silent=True) or {}
    message = str(data.get("message", "")).strip()

    if not message:
        return jsonify({
            "success": False,
            "message": "Message cannot be empty"
        }), 400

    current = get_current_vpn()
    if not current["active"]:
        return jsonify({
            "success": False,
            "message": "No VPN tunnel is active"
        }), 409

    chat_start = start_remote_chat()
    if not chat_start["success"]:
        return jsonify({
            "success": False,
            "stage": "chat_start",
            "message": "Chat server is not available",
            "details": chat_start
        }), 500

    chat_host = (
        CLASSICAL_PEER_IP
        if current["mode"] == "classical"
        else PQC_PEER_IP
    )

    try:
        with socket.create_connection((chat_host, CHAT_PORT), timeout=10) as client:
            client.sendall(message.encode("utf-8"))
            response = client.recv(4096).decode("utf-8")

        return jsonify({
            "success": True,
            "vpn": current["mode"],
            "destination": f"{chat_host}:{CHAT_PORT}",
            "sent_message": message,
            "response": response
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Failed to send message",
            "error": str(e)
        }), 500


@app.route("/chat/status", methods=["GET", "OPTIONS"])
def chat_status():
    if request.method == "OPTIONS":
        return ("", 204)

    remote = server_agent_request("/chat/status", method="GET", timeout=5)
    return jsonify({
        "machine": MACHINE,
        "chat_server": remote["data"]
    })


@app.route("/vpn/logs", methods=["GET", "OPTIONS"])
def vpn_logs():
    if request.method == "OPTIONS":
        return ("", 204)
    lines = max(1, min(request.args.get("lines", 80, type=int), 200))
    try:
        with open(HYBRID_V3_LOG, "r") as log:
            content = log.readlines()[-lines:]
    except FileNotFoundError:
        content = []
    return jsonify({"machine": MACHINE, "mode": "hybrid_v3",
                    "source": HYBRID_V3_LOG, "lines": [x.rstrip("\n") for x in content]})


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    ensure_pid_dir()

    print("=" * 50)
    print(" QVPN Agent - CLIENT")
    print("=" * 50)
    print("Dashboard endpoint: http://192.168.56.101:8000")
    print(f"Server Agent: {SERVER_AGENT_URL}")
    print()
    print("POST /vpn/start/classical")
    print("POST /vpn/start/pqc")
    print("POST /vpn/start/hybrid")
    print("POST /vpn/start/hybrid-v2")
    print("POST /vpn/start/hybrid-v3")
    print("POST /vpn/stop")
    print("GET  /vpn/status")
    print("POST /chat/send")
    print("GET  /chat/status")
    print()

    app.run(
        host="192.168.56.101",
        port=8000,
        debug=False
    )
