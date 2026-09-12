#!/usr/bin/env python3
"""
server.py — Servidor do Tracker

Só stdlib (Python 3). Substitui o `python3 -m http.server`:
  - Serve os arquivos estáticos da raiz do repo (`/` → tracker/index.html).
  - Expõe a API REST /api/* com persistência em SQLite (tracker.db).

Uso:
  python3 server.py [--port 8765] [--db /caminho/tracker.db]
"""
import argparse
import json
import mimetypes
import os
import sqlite3
import sys
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
DEFAULT_PORT = 8765
MAX_BODY = 2 * 1024 * 1024  # 2 MB


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class DB:
    """Conexões SQLite por requisição (thread-safe com ThreadingHTTPServer)."""

    def __init__(self, path):
        self.path = path
        conn = self._connect()
        try:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS kv (
                    key        TEXT PRIMARY KEY,
                    value      TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            conn.commit()
        finally:
            conn.close()

    def _connect(self):
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        return conn

    def get(self, key):
        conn = self._connect()
        try:
            row = conn.execute("SELECT value FROM kv WHERE key = ?", (key,)).fetchone()
            return row["value"] if row else None
        finally:
            conn.close()

    def set(self, key, value):
        conn = self._connect()
        try:
            conn.execute(
                """
                INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
                """,
                (key, value, now_iso()),
            )
            conn.commit()
        finally:
            conn.close()

    def all(self):
        conn = self._connect()
        try:
            return conn.execute("SELECT key, value FROM kv").fetchall()
        finally:
            conn.close()


class Handler(BaseHTTPRequestHandler):
    server_version = "TrackerServer/1.0"
    protocol_version = "HTTP/1.1"
    db = None  # injetado em make_handler
    static_root = ROOT

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _send(self, code, body, ctype="application/json; charset=utf-8", extra=None):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Connection", "close")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if body:
            self.wfile.write(body)

    def _send_json(self, code, obj):
        self._send(code, json.dumps(obj).encode("utf-8"))

    def _read_body(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BODY:
            return None
        if length > 0:
            return self.rfile.read(length)
        # Transfer-Encoding: chunked (ex.: http.request do node sem Content-Length)
        if self.headers.get("Transfer-Encoding", "").lower() == "chunked":
            chunks = []
            total = 0
            while True:
                line = self.rfile.readline().strip()
                if not line:
                    break
                try:
                    size = int(line.split(b";")[0], 16)
                except ValueError:
                    return None
                if size == 0:
                    self.rfile.readline()
                    break
                total += size
                if total > MAX_BODY:
                    return None
                chunks.append(self.rfile.read(size))
                self.rfile.readline()
            return b"".join(chunks)
        return None

    # ─────────────────────────── API ───────────────────────────

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/data":
            self.api_get()
        elif path == "/api/health":
            self._send_json(200, {"ok": True})
        else:
            self.serve_static(path)

    def do_PUT(self):
        path = urlparse(self.path).path
        if path == "/api/data":
            self.api_put()
        else:
            self._send_json(404, {"error": "not found"})

    def api_get(self):
        rows = self.db.all()
        states = {}
        content = None
        for r in rows:
            if r["key"] == "content":
                try:
                    content = json.loads(r["value"])
                except json.JSONDecodeError:
                    content = None
            else:
                try:
                    states[r["key"]] = json.loads(r["value"])
                except json.JSONDecodeError:
                    pass
        self._send_json(200, {"content": content, "states": states})

    def api_put(self):
        raw = self._read_body()
        if raw is None:
            self._send_json(400, {"error": "invalid body"})
            return
        try:
            data = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            self._send_json(400, {"error": "invalid json"})
            return
        if not isinstance(data, dict):
            self._send_json(400, {"error": "invalid payload"})
            return
        if "content" in data:
            self.db.set("content", json.dumps(data["content"]))
        if isinstance(data.get("state"), dict) and data["state"].get("key"):
            key = data["state"]["key"]
            value = json.dumps(data["state"].get("value"))
            self.db.set(key, value)
        self._send_json(200, {"ok": True})

    # ─────────────────────── Estáticos ───────────────────────

    def serve_static(self, path):
        # Assets relativos (style.css, app.js, ...) resolvem a partir do
        # diretório da página. Para o tracker, isso é /tracker/.
        if path in ("", "/", "/index.html"):
            self.send_response(301)
            self.send_header("Location", "/tracker/")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        if path in ("/tracker", "/tracker/"):
            path = "/tracker/index.html"
        full = os.path.realpath(os.path.join(self.static_root, path.lstrip("/")))
        if not full.startswith(self.static_root) or not os.path.isfile(full):
            self._send_json(404, {"error": "not found"})
            return
        ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype in ("application/javascript", "application/json"):
            ctype += "; charset=utf-8"
        with open(full, "rb") as f:
            body = f.read()
        self._send(200, body, ctype)


def make_handler(db):
    handler = Handler
    handler.db = db
    return handler


def main():
    parser = argparse.ArgumentParser(description="Tracker server (estáticos + API SQLite)")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--db", default=os.path.join(ROOT, "tracker.db"))
    args = parser.parse_args()

    db = DB(args.db)
    handler = make_handler(db)

    httpd = ThreadingHTTPServer(("0.0.0.0", args.port), handler)
    print(f"Tracker em http://0.0.0.0:{args.port} (db: {args.db})", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nEncerrando…", flush=True)


if __name__ == "__main__":
    main()
