"""Headless Blender + MCP bridge for this project.

Run as: blender -b --factory-startup --python headless_server.py
The add-on normally relies on bpy.app.timers, which never fire in background
mode, so this script starts the socket server itself and drains the command
queue on the main thread in a plain loop.
"""
import os
import socket
import sys
import threading
import time

import addon_utils
import bpy

HOST = os.environ.get("BLENDER_HOST", "localhost")
PORT = int(os.environ.get("BLENDER_PORT", "9876"))

addon_utils.enable("blender_mcp_addon", default_set=True, persistent=True)
mod = sys.modules["blender_mcp_addon"]

server = mod.BlenderMCPServer(host=HOST, port=PORT)
bpy.types.blendermcp_server = server

# server.start() refuses to run under -b, so do its socket setup here
# (minus the timer registration, which the loop below replaces).
try:
    server.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.socket.bind((HOST, PORT))
    server.socket.listen(5)
except OSError as e:
    print(f"BlenderMCP headless: failed to listen on {HOST}:{PORT}: {e}", flush=True)
    sys.exit(1)
server.running = True
server.server_thread = threading.Thread(target=server._server_loop, daemon=True)
server.server_thread.start()

print(f"BlenderMCP headless: listening on {HOST}:{PORT}", flush=True)
try:
    while server.running:
        server._drain_command_queue()
        time.sleep(0.05)
except KeyboardInterrupt:
    pass
finally:
    server.stop()
