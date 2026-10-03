#!/usr/bin/env python3
"""QVPN lab experiment controller for the client/server Ubuntu VMs.

Run as root on each VM: python3 vm_controller.py --role client|server
Only fixed experiment paths and a fixed server/Windows host are accepted.
"""

import argparse
import json
import os
import re
import signal
import socket
import subprocess
import threading
import time
import urllib.error
import urllib.request

from flask import Flask, jsonify, request

app = Flask(__name__)
ROLE = None
CLIENT = "http://192.168.56.101:8000"
SERVER = "http://192.168.56.102:8000"
SERVER_EXPERIMENT = "http://192.168.56.102:8010"
WINDOWS = "http://192.168.56.1:8011"
CLIENT_ROOT = "/home/client/qvpn-pqc"
SERVER_ROOT = "/home/server/qvpn-pqc"
ALLOWED_SCENARIOS = {
    "hybrid-to-pqc": ("--tamper-hybrid-to-pqc", "PQC", "negotiated_client"),
    "hybrid-to-classical": ("--tamper-hybrid-to-classical", "CLASSICAL", "negotiated_client"),
    "pqc-to-classical": ("--tamper-pqc-to-classical", "CLASSICAL", "negotiated_client_pqc"),
}
lock = threading.Lock()
state = {"state": "idle", "result": None}
negotiation = {"process": None, "output": "", "exit_code": None}


@app.after_request
def cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response


def api(base, path, payload=None, timeout=30):
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(base + path, data=data,
                                 headers={"Content-Type": "application/json"},
                                 method="GET" if data is None else "POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        try:
            detail = exc.read().decode()
        except OSError:
            detail = ""
        raise RuntimeError(f"{base}{path}: HTTP {exc.code}: {detail[:350]}") from exc


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def output_of(process, seconds=15):
    try:
        text, _ = process.communicate(timeout=seconds)
        return text, process.returncode
    except subprocess.TimeoutExpired:
        terminate(process)
        text, _ = process.communicate(timeout=3)
        return text, process.returncode


def terminate(process):
    if not process or process.poll() is not None:
        return
    try:
        os.killpg(process.pid, signal.SIGTERM)
        process.wait(timeout=3)
    except (ProcessLookupError, subprocess.TimeoutExpired):
        if process.poll() is None:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait(timeout=3)


def preflight():
    for base, label in ((CLIENT, "client"), (SERVER, "server")):
        vpn = api(base, "/vpn/status").get("vpn", {})
        require(not vpn.get("active") and vpn.get("state") not in ("listening", "connecting"),
                f"{label} VPN must be stopped before an experiment")
    require(subprocess.run(["ip", "link", "show", "qvpn0"],
                           capture_output=True).returncode != 0, "Existing qvpn0 on client")


def wait_tunnel(process):
    for _ in range(60):
        if process.poll() is not None:
            return False
        result = subprocess.run(["ip", "-4", "addr", "show", "dev", "qvpn0"],
                                capture_output=True, text=True)
        if result.returncode == 0 and "10.20.0.2" in result.stdout:
            return True
        time.sleep(0.25)
    return False


def negotiate(scenario, authenticated):
    flag, selected, binary = ALLOWED_SCENARIOS[scenario]
    preflight()
    base = os.path.join(CLIENT_ROOT, "negotiation_experiment")
    client_bin = os.path.join(base, binary)
    require(os.path.isfile(client_bin), f"Client experiment binary missing: {client_bin}")
    server_started = False
    try:
        started = api(SERVER_EXPERIMENT, "/internal/negotiation/start",
                      {"authenticated": authenticated})
        require(started.get("success"), "Negotiation listener did not start")
        server_started = True
        cmd = [client_bin]
        if authenticated:
            cmd.append("--authenticated")
        cmd.append(flag)
        client_run = subprocess.run(cmd, capture_output=True, text=True, timeout=12)
        server_run = api(SERVER_EXPERIMENT, "/internal/negotiation/result")
        client_log = client_run.stdout + client_run.stderr
        server_log = server_run.get("output", "")
        if authenticated:
            passed = ("CLIENT NEGOTIATION AUTHENTICATION FAILED" in server_log
                      and "Negotiation rejected before suite selection" in server_log
                      and "NEGOTIATION ACCEPTED" not in server_log)
            outcome = "downgrade_rejected"
        else:
            passed = (f"DOWNGRADE SUCCEEDED in baseline negotiation" in client_log
                      and f"NEGOTIATION ACCEPTED: {selected}" in server_log)
            outcome = "downgrade_accepted"
        return {"success": passed, "experiment": "negotiation_harness",
                "tampering": "client offer changed before sending; not an in-path interceptor",
                "scenario": scenario, "authenticated": authenticated,
                "outcome": outcome if passed else "inconclusive",
                "client_exit_code": client_run.returncode,
                "server_exit_code": server_run.get("exit_code"),
                "client_log": client_log[-5000:], "server_log": server_log[-5000:]}
    finally:
        if server_started:
            api(SERVER_EXPERIMENT, "/internal/negotiation/stop", {})


def mitm(version):
    preflight()
    name = "hybrid-v2" if version == "v2" else "hybrid-v3"
    suffix = "hybrid_tunnel" if version == "v2" else "hybrid_v3_auth"
    client_bin = os.path.join(CLIENT_ROOT, suffix, "client_mitm")
    require(os.path.isfile(client_bin), f"Special MITM client missing: {client_bin}")
    require(not api(WINDOWS, "/attack/status").get("running"),
            "Windows attack listener is busy")
    server_started = windows_started = False
    process = None
    try:
        server_started = True  # Clean up even when startup times out after spawning.
        started = api(SERVER, "/vpn/start/" + name, {}, timeout=25)
        require(started.get("success"), "Tunnel server failed to listen")
        windows_started = True
        win = api(WINDOWS, "/attack/start", {"version": version})
        require(win.get("success"), "Windows listener failed to start")
        process = subprocess.Popen([client_bin], stdout=subprocess.PIPE,
                                   stderr=subprocess.STDOUT, text=True,
                                   start_new_session=True)
        if version == "v2":
            require(wait_tunnel(process), "V2 client failed to establish qvpn0")
            ping = subprocess.run(["ping", "-c", "4", "-W", "3", "-I", "qvpn0", "10.20.0.1"],
                                  capture_output=True, text=True, timeout=20)
            # The attacker prints a confirmation after re-encrypting actual ICMP packets.
            time.sleep(1)
            attack_log = api(WINDOWS, "/attack/result")
            attack_text = attack_log.get("log", "")
            passed = (ping.returncode == 0 and "4 received" in ping.stdout
                      and "CRYPTOGRAPHIC MITM HANDSHAKE SUCCESSFUL" in attack_text
                      and "CLIENT -> MITM IPv4 ICMP" in attack_text)
            return {"success": passed, "experiment": "in_path_hybrid_mitm",
                    "version": "v2", "outcome": "mitm_succeeded" if passed else "inconclusive",
                    "client_ping": ping.stdout[-2200:], "attacker_log": attack_text[-7000:]}
        client_log, code = output_of(process, seconds=15)
        process = None
        server_log = "\n".join(api(SERVER, "/vpn/logs").get("lines", []))
        attacker_log = api(WINDOWS, "/attack/result").get("log", "")
        interface_absent = subprocess.run(["ip", "link", "show", "qvpn0"],
                                          capture_output=True).returncode != 0
        passed = ("SERVER AUTHENTICATION FAILED" in client_log
                  and "Authentication tag forwarded" in attacker_log
                  and "Failed to receive client authentication tag" in server_log
                  and interface_absent)
        return {"success": passed, "experiment": "in_path_hybrid_mitm",
                "version": "v3", "outcome": "mitm_rejected" if passed else "inconclusive",
                "client_exit_code": code, "client_log": client_log[-5000:],
                "server_log": server_log[-4000:], "attacker_log": attacker_log[-5000:],
                "client_interface_absent": interface_absent}
    finally:
        terminate(process)
        if windows_started:
            try:
                api(WINDOWS, "/attack/stop", {})
            except Exception:
                pass
        if server_started:
            try:
                api(SERVER, "/vpn/stop", {})
            except Exception:
                pass


@app.route("/experiments/run", methods=["POST", "OPTIONS"])
def run_experiment():
    if request.method == "OPTIONS":
        return "", 204
    if ROLE != "client":
        return jsonify({"success": False, "error": "Client controller only"}), 404
    config = request.get_json(silent=True) or {}
    kind = config.get("kind")
    if kind == "mitm":
        valid = config.get("version") in ("v2", "v3")
    elif kind == "downgrade":
        valid = (config.get("scenario") in ALLOWED_SCENARIOS
                 and type(config.get("authenticated")) is bool)
    else:
        valid = False
    if not valid:
        return jsonify({"success": False, "error": "Invalid fixed experiment selection"}), 400
    if not lock.acquire(blocking=False):
        return jsonify({"success": False, "error": "Another experiment is running"}), 409
    state.update(state="running", result=None)
    try:
        result = (mitm(config["version"]) if kind == "mitm" else
                  negotiate(config["scenario"], config["authenticated"]))
        state.update(state="completed", result=result)
        return jsonify(result), 200 if result["success"] else 422
    except Exception as exc:
        result = {"success": False, "outcome": "error", "error": str(exc)}
        state.update(state="failed", result=result)
        return jsonify(result), 500
    finally:
        lock.release()


@app.route("/experiments/status", methods=["GET", "OPTIONS"])
def status():
    if request.method == "OPTIONS":
        return "", 204
    return jsonify({"role": ROLE, **state})


@app.route("/internal/negotiation/start", methods=["POST"])
def server_negotiation_start():
    if ROLE != "server":
        return jsonify({"success": False}), 404
    data = request.get_json(silent=True) or {}
    if type(data.get("authenticated")) is not bool:
        return jsonify({"success": False, "error": "authenticated boolean required"}), 400
    if negotiation["process"] is not None:
        return jsonify({"success": False, "error": "Negotiation already running"}), 409
    binary = os.path.join(SERVER_ROOT, "negotiation_experiment", "negotiated_server")
    if not os.path.isfile(binary):
        return jsonify({"success": False, "error": "Server binary missing"}), 500
    cmd = [binary] + (["--authenticated"] if data["authenticated"] else [])
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                            text=True, start_new_session=True)
    negotiation.update(process=proc, output="", exit_code=None)
    for _ in range(30):
        if proc.poll() is not None:
            break
        # A TCP connect would consume the one-shot server; inspect ss instead.
        check = subprocess.run(["ss", "-ltn"], capture_output=True, text=True)
        if check.returncode == 0 and re.search(r":5560\s", check.stdout):
            return jsonify({"success": True, "state": "listening"})
        time.sleep(0.1)
    terminate(proc)
    negotiation["process"] = None
    return jsonify({"success": False, "error": "Server did not listen on 5560"}), 500


@app.route("/internal/negotiation/result", methods=["GET"])
def server_negotiation_result():
    if ROLE != "server":
        return jsonify({"success": False}), 404
    proc = negotiation["process"]
    if proc is not None:
        text, code = output_of(proc, seconds=5)
        negotiation.update(process=None, output=text[-5000:], exit_code=code)
    return jsonify({"output": negotiation["output"], "exit_code": negotiation["exit_code"]})


@app.route("/internal/negotiation/stop", methods=["POST"])
def server_negotiation_stop():
    if ROLE != "server":
        return jsonify({"success": False}), 404
    proc = negotiation["process"]
    if proc is not None:
        terminate(proc)
        text, _ = proc.communicate(timeout=2)
        negotiation.update(process=None, output=text[-5000:], exit_code=proc.returncode)
    return jsonify({"success": True})


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--role", choices=("client", "server"), required=True)
    args = parser.parse_args()
    ROLE = args.role
    app.run(host="192.168.56.101" if ROLE == "client" else "192.168.56.102",
            port=8010, threaded=True)
