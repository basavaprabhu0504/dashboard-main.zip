from flask import Blueprint, jsonify
from services.performance_service import performance_service

performance_bp = Blueprint("performance", __name__)

@performance_bp.route("/api/performance", methods=["GET"])
def get_performance():
    data = performance_service.get_performance_metrics()
    return jsonify(data), 200
