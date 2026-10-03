from flask import Blueprint, jsonify
from services.log_service import log_service

log_bp = Blueprint("logs", __name__)

@log_bp.route("/api/logs", methods=["GET"])
def get_logs():
    data = log_service.get_logs()
    return jsonify(data), 200
