import os
import time
import logging
import threading
from concurrent.futures import ThreadPoolExecutor
import paramiko
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SSHManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super(SSHManager, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, 'initialized'):
            self.initialized = True
            load_dotenv()

            # Server VM Config
            self.server_host = os.getenv("SERVER_VM_HOST", "192.168.56.102")
            self.server_port = int(os.getenv("SERVER_VM_PORT", 22))
            self.server_user = os.getenv("SERVER_VM_USER", "ubuntu")
            self.server_password = os.getenv("SERVER_VM_PASSWORD", "ubuntu")
            self.server_key_path = os.getenv("SERVER_VM_KEY_PATH")

            # Client VM Config
            self.client_host = os.getenv("CLIENT_VM_HOST", "192.168.56.101")
            self.client_port = int(os.getenv("CLIENT_VM_PORT", 22))
            self.client_user = os.getenv("CLIENT_VM_USER", "ubuntu")
            self.client_password = os.getenv("CLIENT_VM_PASSWORD", "ubuntu")
            self.client_key_path = os.getenv("CLIENT_VM_KEY_PATH")

            self.server_ssh = None
            self.client_ssh = None
            self.server_lock = threading.Lock()
            self.client_lock = threading.Lock()

    def _get_connection(self, host, port, user, password, key_path):
        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            if key_path and os.path.exists(key_path):
                ssh.connect(hostname=host, port=port, username=user, key_filename=key_path, timeout=5)
            else:
                ssh.connect(hostname=host, port=port, username=user, password=password, timeout=5)
            
            return ssh
        except Exception as e:
            logger.error(f"Failed to connect to {user}@{host}:{port}: {e}")
            return None

    def get_server_connection(self):
        with self.server_lock:
            if not self.server_ssh or not self.server_ssh.get_transport() or not self.server_ssh.get_transport().is_active():
                logger.info(f"No active server connection found. Connecting to {self.server_user}@{self.server_host}...")
                self.server_ssh = self._get_connection(self.server_host, self.server_port, self.server_user, self.server_password, self.server_key_path)
            return self.server_ssh

    def get_client_connection(self):
        with self.client_lock:
            if not self.client_ssh or not self.client_ssh.get_transport() or not self.client_ssh.get_transport().is_active():
                logger.info(f"No active client connection found. Connecting to {self.client_user}@{self.client_host}...")
                self.client_ssh = self._get_connection(self.client_host, self.client_port, self.client_user, self.client_password, self.client_key_path)
            return self.client_ssh

    def _execute_command(self, ssh_client, command, timeout=15):
        if not ssh_client:
            return "", "SSH client not connected.", 1
        
        try:
            stdin, stdout, stderr = ssh_client.exec_command(command, timeout=timeout)
            
            # Note: We are avoiding sudo with password for better security and reliability.
            # Configure passwordless sudo on the target machines for the specific commands.
            
            out = stdout.read().decode("utf-8", errors="replace").strip()
            err = stderr.read().decode("utf-8", errors="replace").strip()
            exit_code = stdout.channel.recv_exit_status()
            
            return out, err, exit_code
        except Exception as e:
            logger.error(f"Error executing command '{command}': {e}")
            # If an exception occurs, the channel might be dead. Force a reconnect on next call.
            ssh_client.close()
            return "", str(e), 1

    def execute_on_server(self, command, timeout=15):
        ssh = self.get_server_connection()
        return self._execute_command(ssh, command, timeout=timeout)

    def execute_on_client(self, command, timeout=15):
        ssh = self.get_client_connection()
        return self._execute_command(ssh, command, timeout=timeout)

    def execute_parallel(self, commands):
        results = {}
        with ThreadPoolExecutor(max_workers=2) as executor:
            future_map = {}
            if "server" in commands:
                future_map["server"] = executor.submit(self.execute_on_server, commands["server"])
            if "client" in commands:
                future_map["client"] = executor.submit(self.execute_on_client, commands["client"])

            for key, future in future_map.items():
                try:
                    results[key] = future.result()
                except Exception as e:
                    results[key] = ("", str(e), 1)
        return results

    def close_connections(self):
        with self.server_lock:
            if self.server_ssh:
                self.server_ssh.close()
                self.server_ssh = None
                logger.info("Server SSH connection closed.")
        with self.client_lock:
            if self.client_ssh:
                self.client_ssh.close()
                self.client_ssh = None
                logger.info("Client SSH connection closed.")

# Singleton instance
ssh_service = SSHManager()
