#!/usr/bin/env python3
"""HTTP bridge for the SurplusClaim AI claim engine (port 7100).

Wraps claim-forms/claim_engine.create_claim (backend engineer's module) behind
the HTTP API that the intake service expects (config.json -> claim_engine):
    POST /generate   {"owner_id": N, "property_id": N} -> claim JSON
    GET  /health     -> {"ok": true}

The bridge handles the dashed package names (data-pipeline/, claim-forms/) that
Python's import system can't load directly, by aliasing them in sys.modules.

Usage: python3 claim-forms/server.py   (launched by scripts/start.sh)
"""
from __future__ import annotations
import importlib.util
import json
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# ---- alias data-pipeline/ as importable package "data_pipeline" ----
_DP = ROOT / "data-pipeline"
_pkg_spec = importlib.util.spec_from_file_location("data_pipeline", _DP / "__init__.py")
_pkg = importlib.util.module_from_spec(_pkg_spec)
_pkg.__path__ = [str(_DP)]
sys.modules["data_pipeline"] = _pkg

_db_spec = importlib.util.spec_from_file_location("data_pipeline.database", _DP / "database.py")
_db_mod = importlib.util.module_from_spec(_db_spec)
sys.modules["data_pipeline.database"] = _db_mod
_db_spec.loader.exec_module(_db_mod)
Database = _db_mod.Database

# ---- load claim_engine.py by file path ----
_ce_spec = importlib.util.spec_from_file_location("claim_engine", ROOT / "claim-forms" / "claim_engine.py")
_ce = importlib.util.module_from_spec(_ce_spec)
_ce_spec.loader.exec_module(_ce)
create_claim = _ce.create_claim

DB = Database(ROOT / "data-pipeline" / "surplusclaim.db")
OUT_DIR = ROOT / "data" / "claim-forms"
PORT = 7100


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):  # keep logs quiet
        pass

    def _json(self, code: int, payload: dict) -> None:
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.rstrip("/") == "/health":
            return self._json(200, {"ok": True, "service": "claim-engine", "port": PORT})
        self._json(404, {"error": "not found"})

    def do_POST(self):
        if self.path.rstrip("/") != "/generate":
            return self._json(404, {"error": "not found"})
        try:
            length = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            return self._json(400, {"error": "invalid JSON body"})
        owner_id = int(data.get("owner_id") or 0)
        property_id = int(data.get("property_id") or 0)
        if not owner_id or not property_id:
            return self._json(400, {"error": "owner_id and property_id are required"})
        try:
            result = create_claim(DB, owner_id, property_id, output_dir=OUT_DIR)
        except Exception as exc:  # surface engine errors to the intake fallback
            return self._json(422, {"error": str(exc)})
        self._json(201, {
            "claim_id": result["claim_id"],
            "claim_number": result["claim_number"],
            "state": result["state"],
            "status": "draft",
            "deadline": result.get("deadline"),
            "output_path": result.get("output_path"),
            "engine": "external",
        })


if __name__ == "__main__":
    print(f"[claim-engine] listening on 127.0.0.1:{PORT}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
