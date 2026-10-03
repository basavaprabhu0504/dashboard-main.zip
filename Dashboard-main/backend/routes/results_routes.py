import os
import json
import time
from flask import Blueprint, jsonify, request

results_bp = Blueprint("results", __name__)

RESULTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "results")

@results_bp.route("/api/results", methods=["GET"])
def get_results():
    if not os.path.exists(RESULTS_DIR):
        os.makedirs(RESULTS_DIR, exist_ok=True)

    results_list = []
    try:
        files = os.listdir(RESULTS_DIR)
        for fname in sorted(files, reverse=True):
            if fname.endswith(".json"):
                fpath = os.path.join(RESULTS_DIR, fname)
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        results_list.append(data)
                except Exception as e:
                    print(f"Error reading result file {fname}: {e}")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({"results": results_list}), 200

@results_bp.route("/api/results", methods=["POST"])
def add_result():
    if not os.path.exists(RESULTS_DIR):
        os.makedirs(RESULTS_DIR, exist_ok=True)

    payload = request.get_json() or {}
    filename = f"result_{int(time.time())}.json"
    filepath = os.path.join(RESULTS_DIR, filename)

    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
        return jsonify({"success": True, "file": filename}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
