from flask import Flask, jsonify, request
import subprocess
import time
import os
import signal
import socket

app = Flask(__name__)

# ============================================================
# QVPN SERVER AGENT
# ============================================================

MACHINE = "qvpn-server"
ROLE = "server"

CLASSICAL_SERVICE = "openvpn-server@server"

PQC_BINARY = "/home/server/qvpn-pqc/pqc_tunnel/server"
PQC_PORT = 5559

HYBRID_BINARY = "/home/server/qvpn-pqc/hybrid_tunnel/server"
HYBRID_PORT = 5558
HYBRID_V3_BINARY = "/home/server/qvpn-pqc/hybrid_v3_auth/server"

CLASSICAL_INTERFACE = "tun0"
CLASSICAL_LOCAL_IP = "10.8.0.1"
CLASSICAL_PEER_IP = "10.8.0.2"

PQC_INTERFACE = "qvpn0"
PQC_LOCAL_IP = "10.20.0.1"
PQC_PEER_IP = "10.20.0.2"

HYBRID_INTERFACE = "qvpn0"
HYBRID_LOCAL_IP = "10.20.0.1"
HYBRID_PEER_IP = "10.20.0.2"

CHAT_DIR = "/home/server/vpn-chat"
CHAT_SCRIPT = "/home/server/vpn-chat/server.py"
CHAT_PORT = 5000

PID_DIR = "/tmp/qvpn-agent"

PQC_PID_FILE = os.path.join(PID_DIR, "pqc_server.pid")
HYBRID_PID_FILE = os.path.join(PID_DIR, "hybrid_server.pid")
HYBRID_V3_PID_FILE = os.path.join(PID_DIR, "hybrid_v3_server.pid")
CHAT_PID_FILE = os.path.join(PID_DIR, "chat_server.pid")
HYBRID_V3_LOG = os.path.join(PID_DIR, "hybrid_v3_server.log")


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


def port_is_listening(port):
    result = run_command(["ss", "-lnt"])
    if not result["success"]:
        return False

    return any(
        "LISTEN" in line and f":{port}" in line
        for line in result["stdout"].splitlines()
    )


def wait_for_port(port, timeout=20):
    for _ in range(timeout * 2):
        if port_is_listening(port):
            return True
        time.sleep(0.5)
    return False


def tcp_port_open(host, port, timeout=1):
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except Exception:
        return False


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
        return {"mode": "classical", "active": False, "state": "listening",
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
            "transport_port": PQC_PORT,
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
            "transport_port": HYBRID_PORT,
            "pid": hybrid_pid
        }

    v3_pid = read_pid(HYBRID_V3_PID_FILE)
    if process_exists(v3_pid) and interface_has_ip(HYBRID_INTERFACE, HYBRID_LOCAL_IP):
        return {
            "mode": "hybrid_v3", "active": True, "state": "tunnel_ready",
            "interface": HYBRID_INTERFACE, "local_ip": HYBRID_LOCAL_IP,
            "peer_ip": HYBRID_PEER_IP, "transport_port": HYBRID_PORT,
            "pid": v3_pid
        }

    for mode, pid_file, port in (("pqc", PQC_PID_FILE, PQC_PORT),
                                 ("hybrid", HYBRID_PID_FILE, HYBRID_PORT),
                                 ("hybrid_v3", HYBRID_V3_PID_FILE, HYBRID_PORT)):
        pid = read_pid(pid_file)
        if process_exists(pid):
            return {"mode": mode, "active": False, "state": "listening",
                    "interface": "qvpn0", "local_ip": None,
                    "peer_ip": HYBRID_PEER_IP, "transport_port": port,
                    "pid": pid}

    return {
        "mode": None,
        "active": False,
        "interface": None,
        "local_ip": None,
        "peer_ip": None
    }


# ============================================================
# STOP HELPERS
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

    return {"success": True, "message": "Process stopped", "pid": pid}


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
                    "stopped": mode, "details": result, "interface_cleanup": cleanup}

    if interface_exists("qvpn0"):
        return {"success": False, "stopped": None,
                "message": "Untracked qvpn0 exists; inspect its owning process before cleanup"}

    return {"success": True, "stopped": None, "message": "No VPN is active"}


# ============================================================
# CLASSICAL
# ============================================================

@app.route("/vpn/start/classical", methods=["POST", "OPTIONS"])
def start_classical():
    if request.method == "OPTIONS":
        return ("", 204)

    current = get_current_vpn()

    if current["active"] or current.get("state") == "listening":
        if current["mode"] == "classical":
            return jsonify({
                "success": True,
                "message": "Classical VPN server already active",
                "vpn": current
            })
        return jsonify({
            "success": False,
            "message": "Another VPN mode is already active",
            "active_vpn": current["mode"]
        }), 409

    result = run_command([
        "sudo", "-n", "systemctl", "start", CLASSICAL_SERVICE
    ])

    if not result["success"]:
        return jsonify({
            "success": False,
            "stage": "process",
            "message": "Failed to start Classical VPN server",
            "details": result
        }), 500

    if not run_command(["systemctl", "is-active", "--quiet", CLASSICAL_SERVICE])["success"]:
        stop_classical_internal()
        return jsonify({
            "success": False,
            "stage": "service",
            "message": "Classical VPN server service did not stay active"
        }), 500

    return jsonify({
        "success": True,
        "message": "Classical VPN server started; waiting for client",
        "vpn": {
            "mode": "classical",
            "interface": CLASSICAL_INTERFACE,
            "local_ip": CLASSICAL_LOCAL_IP,
            "peer_ip": CLASSICAL_PEER_IP,
            "state": "listening"
        }
    })


# ============================================================
# PQC
# ============================================================

@app.route("/vpn/start/pqc", methods=["POST", "OPTIONS"])
def start_pqc():
    if request.method == "OPTIONS":
        return ("", 204)

    current = get_current_vpn()

    if current["active"] or current.get("state") == "listening":
        if current["mode"] == "pqc":
            return jsonify({
                "success": True,
                "message": "PQC VPN server already active",
                "vpn": current
            })
        return jsonify({
            "success": False,
            "message": "Another VPN mode is already active",
            "active_vpn": current["mode"]
        }), 409

    if interface_exists("qvpn0"):
        return jsonify({"success": False, "message": "Untracked qvpn0 exists"}), 409

    try:
        process = subprocess.Popen(
            ["sudo", "-n", PQC_BINARY],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True
        )
        write_pid(PQC_PID_FILE, process.pid)
    except Exception as e:
        return jsonify({
            "success": False,
            "stage": "process",
            "error": str(e)
        }), 500

    # The server cannot configure its address until the client connects.
    if not wait_for_port(PQC_PORT):
        stop_process(PQC_PID_FILE)
        delete_qvpn_interface()
        return jsonify({
            "success": False,
            "stage": "tunnel",
            "message": "PQC VPN server failed to listen"
        }), 500

    return jsonify({
        "success": True,
        "message": "PQC VPN server listening for client",
        "vpn": {
            "mode": "pqc",
            "interface": PQC_INTERFACE,
            "local_ip": PQC_LOCAL_IP,
            "peer_ip": PQC_PEER_IP,
            "transport_port": PQC_PORT,
            "state": "listening"
        }
    })


# ============================================================
# HYBRID
# ============================================================

@app.route("/vpn/start/hybrid", methods=["POST", "OPTIONS"])
@app.route("/vpn/start/hybrid-v2", methods=["POST", "OPTIONS"])
def start_hybrid():
    if request.method == "OPTIONS":
        return ("", 204)

    current = get_current_vpn()

    if current["active"] or current.get("state") == "listening":
        if current["mode"] == "hybrid":
            return jsonify({
                "success": True,
                "message": "Hybrid VPN server already active",
                "vpn": current
            })
        return jsonify({
            "success": False,
            "message": "Another VPN mode is already active",
            "active_vpn": current["mode"]
        }), 409

    if interface_exists("qvpn0"):
        return jsonify({"success": False, "message": "Untracked qvpn0 exists"}), 409

    try:
        process = subprocess.Popen(
            ["sudo", "-n", HYBRID_BINARY],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True
        )
        write_pid(HYBRID_PID_FILE, process.pid)
    except Exception as e:
        return jsonify({
            "success": False,
            "stage": "process",
            "error": str(e)
        }), 500

    # Hybrid creates qvpn0 after the client connects.
    if not wait_for_port(HYBRID_PORT):
        stop_process(HYBRID_PID_FILE)
        delete_qvpn_interface()
        return jsonify({
            "success": False,
            "stage": "listener",
            "message": "Hybrid VPN server failed to listen on TCP 5558"
        }), 500

    return jsonify({
        "success": True,
        "message": "Hybrid VPN server ready for client connection",
        "vpn": {
            "mode": "hybrid",
            "interface": HYBRID_INTERFACE,
            "local_ip": HYBRID_LOCAL_IP,
            "peer_ip": HYBRID_PEER_IP,
            "transport_port": HYBRID_PORT,
            "state": "listening"
        }
    })


@app.route("/vpn/start/hybrid-v3", methods=["POST", "OPTIONS"])
def start_hybrid_v3():
    if request.method == "OPTIONS":
        return ("", 204)

    current = get_current_vpn()
    if current["active"] or current.get("state") == "listening":
        if current["mode"] == "hybrid_v3":
            return jsonify({"success": True, "message": "V3 already running", "vpn": current})
        return jsonify({"success": False, "message": "Another VPN mode is running",
                        "active_vpn": current["mode"]}), 409
    if interface_exists("qvpn0"):
        return jsonify({"success": False, "message": "Untracked qvpn0 exists"}), 409
    if not os.path.isfile(HYBRID_V3_BINARY):
        return jsonify({"success": False, "message": "V3 server binary missing"}), 500

    try:
        ensure_pid_dir()
        with open(HYBRID_V3_LOG, "w") as log:
            process = subprocess.Popen(["sudo", "-n", "stdbuf", "-oL", "-eL", HYBRID_V3_BINARY],
                                       stdout=log, stderr=subprocess.STDOUT,
                                       start_new_session=True)
        write_pid(HYBRID_V3_PID_FILE, process.pid)
    except Exception as exc:
        return jsonify({"success": False, "stage": "process", "message": str(exc)}), 500

    if not wait_for_port(HYBRID_PORT) or not process_exists(process.pid):
        result = stop_process(HYBRID_V3_PID_FILE)
        return jsonify({"success": False, "stage": "listener",
                        "message": "V3 server did not listen on TCP 5558",
                        "details": result}), 500
    return jsonify({"success": True, "message": "V3 server listening for client",
                    "vpn": get_current_vpn()})


# ============================================================
# VPN STOP / STATUS
# ============================================================

@app.route("/vpn/stop", methods=["POST", "OPTIONS"])
def stop_vpn():
    if request.method == "OPTIONS":
        return ("", 204)

    result = stop_current_vpn()
    return jsonify(result), 200 if result["success"] else 500


@app.route("/vpn/status", methods=["GET", "OPTIONS"])
def vpn_status():
    if request.method == "OPTIONS":
        return ("", 204)

    return jsonify({
        "machine": MACHINE,
        "role": ROLE,
        "vpn": get_current_vpn()
    })


@app.route("/status", methods=["GET", "OPTIONS"])
def status():
    if request.method == "OPTIONS":
        return ("", 204)

    return jsonify({
        "machine": MACHINE,
        "role": ROLE,
        "agent": "running",
        "vpn": get_current_vpn()
    })


# ============================================================
# CHAT
# ============================================================

@app.route("/chat/start", methods=["POST", "OPTIONS"])
def start_chat():
    if request.method == "OPTIONS":
        return ("", 204)

    current = get_current_vpn()

    if not current["active"]:
        return jsonify({
            "success": False,
            "message": "Start a VPN tunnel before starting chat"
        }), 409

    pid = read_pid(CHAT_PID_FILE)

    if process_exists(pid):
        if port_is_listening(CHAT_PORT):
            return jsonify({
                "success": True,
                "message": "Chat server already running",
                "pid": pid,
                "bind_ip": current["local_ip"],
                "port": CHAT_PORT,
                "vpn_mode": current["mode"]
            })

        stop_process(CHAT_PID_FILE)

    bind_ip = (
        CLASSICAL_LOCAL_IP
        if current["mode"] == "classical"
        else PQC_LOCAL_IP
    )

    env = os.environ.copy()
    env["QVPN_CHAT_BIND_IP"] = bind_ip
    env["QVPN_CHAT_PORT"] = str(CHAT_PORT)

    try:
        process = subprocess.Popen(
            ["python3", CHAT_SCRIPT],
            cwd=CHAT_DIR,
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True
        )
        write_pid(CHAT_PID_FILE, process.pid)
    except Exception as e:
        return jsonify({
            "success": False,
            "stage": "process",
            "error": str(e)
        }), 500

    for _ in range(20):
        if port_is_listening(CHAT_PORT):
            return jsonify({
                "success": True,
                "message": "Chat server ready",
                "pid": process.pid,
                "bind_ip": bind_ip,
                "port": CHAT_PORT,
                "vpn_mode": current["mode"]
            })

        if not process_exists(process.pid):
            remove_pid(CHAT_PID_FILE)
            return jsonify({
                "success": False,
                "message": "Chat server exited before listening"
            }), 500

        time.sleep(0.5)

    stop_process(CHAT_PID_FILE)

    return jsonify({
        "success": False,
        "message": "Chat server failed to start listening"
    }), 500


@app.route("/chat/status", methods=["GET", "OPTIONS"])
def chat_status():
    if request.method == "OPTIONS":
        return ("", 204)

    pid = read_pid(CHAT_PID_FILE)
    current = get_current_vpn()

    listening = False
    if current["active"] and current["local_ip"]:
        listening = port_is_listening(CHAT_PORT)

    alive = process_exists(pid)

    return jsonify({
        "machine": MACHINE,
        "chat_server": alive and listening,
        "process_alive": alive,
        "listening": listening,
        "pid": pid if alive else None,
        "port": CHAT_PORT,
        "vpn_mode": current["mode"] if current["active"] else None
    })


@app.route("/chat/stop", methods=["POST", "OPTIONS"])
def stop_chat():
    if request.method == "OPTIONS":
        return ("", 204)

    result = stop_process(CHAT_PID_FILE)
    return jsonify(result), 200 if result["success"] else 500


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
    print(" QVPN Agent - SERVER")
    print("=" * 50)
    print("Dashboard endpoint: http://192.168.56.102:8000")
    print()
    print("POST /vpn/start/classical")
    print("POST /vpn/start/pqc")
    print("POST /vpn/start/hybrid")
    print("POST /vpn/start/hybrid-v2")
    print("POST /vpn/start/hybrid-v3")
    print("POST /vpn/stop")
    print("GET  /vpn/status")
    print("POST /chat/start")
    print("POST /chat/stop")
    print("GET  /chat/status")
    print()

    app.run(
        host="192.168.56.102",
        port=8000,
        debug=False
    )
