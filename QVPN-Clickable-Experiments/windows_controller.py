#!/usr/bin/env python3
"""Windows-host controller for the two fixed QVPN laboratory MITM scripts."""

from pathlib import Path
import re
import socket
import subprocess
import sys
import threading
import time

from flask import Flask, jsonify, request

app = Flask(__name__)
SCRIPTS = {
    "v2": Path(r"C:\QVPN-MITM\qvpn_hybrid_crypto_mitm.py"),
    "v3": Path(r"C:\QVPN-MITM\qvpn_authenticated_hybrid_mitm.py"),
}
state = {"process": None, "version": None, "lines": []}
lock = threading.RLock()


@app.after_request
def cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response


def read_stdout(process):
    try:
        for line in process.stdout:
            # Key fragments printed by the V2 demonstration never belong in the UI.
            if re.search(r"\b(?:client TX key|server TX key|master secret)\s*=", line, re.I):
                continue
            with lock:
                if state["process"] is process:
                    state["lines"].append(line.rstrip("\r\n"))
                    state["lines"] = state["lines"][-350:]
    except (OSError, ValueError):
        pass


def listening():
    with socket.socket() as sock:
        try:
            sock.bind(("192.168.56.1", 15558))
            return False
        except OSError:
            return True


@app.route("/attack/start", methods=["POST", "OPTIONS"])
def start():
    if request.method == "OPTIONS":
        return "", 204
    version = (request.get_json(silent=True) or {}).get("version")
    if version not in SCRIPTS:
        return jsonify({"success": False, "error": "Unknown version"}), 400
    with lock:
        if state["process"] is not None and state["process"].poll() is not None:
            state["process"] = None
        if state["process"] is not None:
            return jsonify({"success": False, "error": "Attacker process already tracked"}), 409
        path = SCRIPTS[version]
        if not path.is_file():
            return jsonify({"success": False, "error": f"Script missing: {path}"}), 500
        if version == "v3" and path.read_text(encoding="utf-8").count(
                "send_exact(server_sock, server_mlkem_ct)") != 1:
            return jsonify({"success": False, "error": "V3 script requires single ciphertext send"}), 500
        if listening():
            return jsonify({"success": False, "error": "Windows port 15558 already in use"}), 409
        try:
            process = subprocess.Popen([sys.executable, "-u", str(path)],
                                       cwd=str(path.parent), stdout=subprocess.PIPE,
                                       stderr=subprocess.STDOUT, text=True,
                                       creationflags=subprocess.CREATE_NEW_PROCESS_GROUP)
        except OSError as exc:
            return jsonify({"success": False, "error": str(exc)}), 500
        state.update(process=process, version=version, lines=[])
        threading.Thread(target=read_stdout, args=(process,), daemon=True).start()
    for _ in range(40):
        if process.poll() is not None:
            with lock:
                state["process"] = None
            return jsonify({"success": False, "error": "Attacker script exited before listening",
                            "log": "\n".join(state["lines"][-30:])}), 500
        if listening():
            return jsonify({"success": True, "version": version, "state": "listening"})
        time.sleep(0.1)
    process.terminate()
    process.wait(timeout=3)
    with lock:
        state["process"] = None
    return jsonify({"success": False, "error": "Attacker listener did not start"}), 500


@app.route("/attack/status", methods=["GET", "OPTIONS"])
def status():
    if request.method == "OPTIONS":
        return "", 204
    with lock:
        process = state["process"]
        return jsonify({"running": process is not None and process.poll() is None,
                        "tracked": process is not None, "version": state["version"]})


@app.route("/attack/result", methods=["GET", "OPTIONS"])
def result():
    if request.method == "OPTIONS":
        return "", 204
    with lock:
        process = state["process"]
        return jsonify({"version": state["version"], "running": process is not None
                        and process.poll() is None,
                        "exit_code": None if process is None else process.poll(),
                        "log": "\n".join(state["lines"][-250:])[-14000:]})


@app.route("/attack/stop", methods=["POST", "OPTIONS"])
def stop():
    if request.method == "OPTIONS":
        return "", 204
    with lock:
        process = state["process"]
        if process is not None and process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=4)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=3)
        state["process"] = None
        return jsonify({"success": True, "version": state["version"]})


if __name__ == "__main__":
    app.run(host="192.168.56.1", port=8011, threaded=True)
