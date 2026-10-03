import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from routes.vpn_routes import vpn_bp
from routes.monitor_routes import monitor_bp
from routes.performance_routes import performance_bp
from routes.log_routes import log_bp
from routes.results_routes import results_bp

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-key-quantum-vpn')
    
    # Enable CORS for frontend integration
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Register blueprints
    app.register_blueprint(vpn_bp)
    app.register_blueprint(monitor_bp)
    app.register_blueprint(performance_bp)
    app.register_blueprint(log_bp)
    app.register_blueprint(results_bp)

    @app.route("/", methods=["GET"])
    def root():
        return jsonify({
            "service": "Quantum VPN Security Evaluation Backend",
            "status": "Operational",
            "endpoints": [
                "/api/status",
                "/api/classical/start",
                "/api/classical/stop",
                "/api/chat/start",
                "/api/packets",
                "/api/performance",
                "/api/logs",
                "/api/results"
            ]
        })

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Endpoint not found"}), 404

    @app.errorhandler(500)
    def server_error(e):
        import traceback
        trace = traceback.format_exc()
        print("--- SERVER ERROR TRACEBACK ---")
        print(trace)
        return jsonify({"error": "Internal server error", "details": str(e), "traceback": trace}), 500

    return app

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", 5000))
    print(f"[*] Quantum VPN Backend listening on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=True)
