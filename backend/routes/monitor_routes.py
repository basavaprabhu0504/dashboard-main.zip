from flask import Blueprint, jsonify
from services.monitor_service import monitor_service

monitor_bp = Blueprint("monitor", __name__)

@monitor_bp.route("/api/packets", methods=["GET"])
def get_packets():
    data = monitor_service.get_packets()
    return jsonify(data), 200
