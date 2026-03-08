"""
PTY Terminal — Real pseudoterminal sessions over WebSocket.
Each session gets its own pty.fork() with full shell access.
"""

import os
import pty
import json
import fcntl
import struct
import signal
import asyncio
import termios
from pathlib import Path
from typing import Optional

from fastapi import WebSocket, WebSocketDisconnect


class PTYSession:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.pid: Optional[int] = None
        self.fd: Optional[int] = None

    def start(self, rows: int = 24, cols: int = 80):
        env = os.environ.copy()
        env["TERM"] = "xterm-256color"
        env["COLORTERM"] = "truecolor"
        go_bin = str(Path.home() / "go" / "bin")
        local_bin = str(Path.home() / ".local" / "bin")
        env["PATH"] = f"{go_bin}:{local_bin}:{env.get('PATH', '')}"

        shell = os.environ.get("SHELL", "/bin/bash")
        pid, fd = pty.fork()

        if pid == 0:
            # Child process
            os.execvpe(shell, [shell, "--login"], env)
        else:
            # Parent
            self.pid = pid
            self.fd = fd
            # Set non-blocking
            flags = fcntl.fcntl(fd, fcntl.F_GETFL)
            fcntl.fcntl(fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)
            # Set initial size
            self.resize(rows, cols)

    def resize(self, rows: int, cols: int):
        if self.fd is not None:
            winsize = struct.pack("HHHH", rows, cols, 0, 0)
            fcntl.ioctl(self.fd, termios.TIOCSWINSZ, winsize)
            if self.pid and self.is_alive():
                os.kill(self.pid, signal.SIGWINCH)

    def write(self, data: bytes):
        if self.fd is not None:
            os.write(self.fd, data)

    def read(self, size: int = 4096) -> bytes:
        if self.fd is None:
            return b""
        try:
            return os.read(self.fd, size)
        except (OSError, BlockingIOError):
            return b""

    def is_alive(self) -> bool:
        if self.pid is None:
            return False
        try:
            pid, status = os.waitpid(self.pid, os.WNOHANG)
            return pid == 0
        except ChildProcessError:
            return False

    def kill(self):
        if self.pid and self.is_alive():
            try:
                os.kill(self.pid, signal.SIGTERM)
                try:
                    os.waitpid(self.pid, 0)
                except Exception:
                    os.kill(self.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
        if self.fd is not None:
            try:
                os.close(self.fd)
            except OSError:
                pass
        self.pid = None
        self.fd = None


class TerminalManager:
    def __init__(self):
        self.sessions: dict[str, PTYSession] = {}

    async def handle_session(self, ws: WebSocket, session_id: str):
        session = PTYSession(session_id)
        session.start()
        self.sessions[session_id] = session

        # Write welcome banner
        banner = (
            "\033[34m"
            "  ⚡ AutoRecon Terminal\r\n"
            "  ─────────────────────\r\n"
            "\033[0m\r\n"
        )
        try:
            await ws.send_bytes(banner.encode())
        except Exception:
            pass

        # Two concurrent tasks
        reader_task = asyncio.create_task(self._pty_reader(ws, session))
        writer_task = asyncio.create_task(self._ws_reader(ws, session))

        try:
            await asyncio.gather(reader_task, writer_task)
        except (WebSocketDisconnect, Exception):
            pass
        finally:
            reader_task.cancel()
            writer_task.cancel()
            session.kill()
            self.sessions.pop(session_id, None)

    async def _pty_reader(self, ws: WebSocket, session: PTYSession):
        """PTY → WebSocket: poll pty every 10ms, send binary frames."""
        while session.is_alive():
            data = session.read()
            if data:
                try:
                    await ws.send_bytes(data)
                except Exception:
                    break
            await asyncio.sleep(0.01)

    async def _ws_reader(self, ws: WebSocket, session: PTYSession):
        """WebSocket → PTY: handle binary (keyboard) and JSON (control) frames."""
        while session.is_alive():
            try:
                msg = await ws.receive()
                if msg.get("type") == "websocket.disconnect":
                    break
                if "bytes" in msg and msg["bytes"]:
                    session.write(msg["bytes"])
                elif "text" in msg and msg["text"]:
                    try:
                        data = json.loads(msg["text"])
                        if data.get("type") == "resize":
                            session.resize(data.get("rows", 24), data.get("cols", 80))
                        elif data.get("type") == "ping":
                            await ws.send_json({"type": "pong"})
                    except json.JSONDecodeError:
                        session.write(msg["text"].encode())
            except WebSocketDisconnect:
                break
            except Exception:
                break

    def inject_command(self, session_id: str, command: str):
        session = self.sessions.get(session_id)
        if session and session.is_alive():
            session.write((command + "\n").encode())
