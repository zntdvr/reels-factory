#!/usr/bin/env bash
# MCP entry point for this project: starts a headless project-local Blender
# (if one isn't already listening), then runs the MCP server over stdio.
# Blender is stopped when the MCP session ends, unless it was already running.
set -u

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BLENDER="$HERE/../blender/blender"
export BLENDER_HOST="${BLENDER_HOST:-localhost}"
export BLENDER_PORT="${BLENDER_PORT:-9876}"
export BLENDER_USER_SCRIPTS="$HERE/scripts"
export BLENDER_USER_CONFIG="$HERE/config"
export DISABLE_TELEMETRY=true
export UV_PYTHON_PREFERENCE=only-managed

port_open() { (exec 3<>"/dev/tcp/$BLENDER_HOST/$BLENDER_PORT") 2>/dev/null; }

BLENDER_PID=""
if ! port_open; then
  "$BLENDER" -b --factory-startup --python "$HERE/headless_server.py" \
    >"$HERE/blender.log" 2>&1 </dev/null &
  BLENDER_PID=$!
  for _ in $(seq 1 120); do
    port_open && break
    kill -0 "$BLENDER_PID" 2>/dev/null || { echo "Blender failed to start, see $HERE/blender.log" >&2; exit 1; }
    sleep 0.5
  done
fi

cleanup() { [ -n "$BLENDER_PID" ] && kill "$BLENDER_PID" 2>/dev/null; }
trap cleanup EXIT INT TERM

"$HOME/.local/bin/uvx" --python 3.11 mcp-for-blender==2.2.7
