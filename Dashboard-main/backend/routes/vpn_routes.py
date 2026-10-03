from flask import Blueprint, jsonify, request
from services.vpn_service import vpn_service

vpn_bp = Blueprint("vpn", __name__)


@vpn_bp.route("/api/status", methods=["GET"])
def get_status():
    status = vpn_service.get_status()
    return jsonify(status), 200


# ── VPN Start ────────────────────────────────────────────────

@vpn_bp.route("/api/classical/start", methods=["POST"])
def start_classical_vpn():
    res = vpn_service.start_classical()
    return jsonify(res), 200 if res.get("success") else 502


@vpn_bp.route("/api/pqc/start", methods=["POST"])
def start_pqc_vpn():
    res = vpn_service.start_pqc()
    return jsonify(res), 200 if res.get("success") else 502


@vpn_bp.route("/api/hybrid/start", methods=["POST"])
@vpn_bp.route("/api/hybrid-v2/start", methods=["POST"])
def start_hybrid_vpn():
    res = vpn_service.start_hybrid()
    return jsonify(res), 200 if res.get("success") else 502


@vpn_bp.route("/api/hybrid-v3/start", methods=["POST"])
def start_hybrid_v3_vpn():
    res = vpn_service.start_hybrid_v3()
    return jsonify(res), 200 if res.get("success") else 502


# ── VPN Logs ─────────────────────────────────────────────────

@vpn_bp.route("/api/vpn/logs", methods=["GET"])
def get_vpn_logs():
    lines = request.args.get("lines", 80)
    target = request.args.get("target", "client")
    res = vpn_service.get_logs(lines=lines, target=target)
    return jsonify(res), 200


# ── VPN Stop ─────────────────────────────────────────────────

@vpn_bp.route("/api/classical/stop", methods=["POST"])
def stop_classical_vpn():
    res = vpn_service.stop_vpn()
    return jsonify(res), 200 if res.get("success") else 502


@vpn_bp.route("/api/vpn/stop", methods=["POST"])
def stop_vpn():
    res = vpn_service.stop_vpn()
    return jsonify(res), 200 if res.get("success") else 502


# ── Chat ──────────────────────────────────────────────────────

@vpn_bp.route("/api/chat/start", methods=["POST"])
def start_chat_app():
    data = request.get_json(silent=True) or {}
    client_msg = data.get("message", "Hello from Client")
    res = vpn_service.start_chat(client_message=client_msg)
    return jsonify(res), 200


@vpn_bp.route("/api/chat/send", methods=["POST"])
def send_chat_message():
    data = request.get_json(silent=True) or {}
    client_msg = data.get("message", "Hello from Client")
    res = vpn_service.start_chat(client_message=client_msg)
    return jsonify(res), 200 if res.get("success") else 500
