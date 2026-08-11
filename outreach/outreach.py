"""Consent-aware outreach templates with dry-run logging (no provider SDK dependency)."""
from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
import re
try:
    from data_pipeline.database import Database
except ImportError:
    import importlib
    Database = importlib.import_module("data-pipeline.database").Database

TEMPLATES = {
 "initial": {"channel":"email", "subject":"Information about possible surplus funds", "body":"Hello {first_name},\n\nOur records indicate there may be surplus foreclosure funds associated with {address} in {state}. We can explain the public-record process and answer questions; recovery is not guaranteed. There is no fee unless funds are recovered.\n\nIf you do not want further messages, reply STOP."},
 "follow_up": {"channel":"email", "subject":"Following up about surplus funds", "body":"Hello {first_name},\n\nI’m following up regarding possible surplus funds connected to {address}. Please contact us only if you would like more information. There is no obligation and no fee unless funds are recovered. Reply STOP to opt out."},
 "final": {"channel":"email", "subject":"Last planned update about surplus funds", "body":"Hello {first_name},\n\nThis is our last planned message about possible surplus funds related to {address}. If you would like information, you may contact us; otherwise no action is needed. Reply STOP to opt out."},
 "sms": {"channel":"sms", "subject":"", "body":"Hi {first_name}, possible surplus funds may be associated with {address}, {state}. No obligation and no fee unless recovered. Reply STOP to opt out."},
}

@dataclass
class Message:
    channel: str; recipient: str; subject: str; body: str; dry_run: bool = True

def render(template: str, data: dict) -> Message:
    if template not in TEMPLATES: raise ValueError(f"unknown template: {template}")
    item = TEMPLATES[template]
    values = {k: str(v) for k,v in data.items()}
    return Message(item["channel"], values.get("email") or values.get("phone", ""), item["subject"].format_map(values), item["body"].format_map(values))

def send(db: Database, owner_id: int, template: str, data: dict, *, dry_run: bool = True) -> Message:
    """Render and log a message. Sending is intentionally unavailable in dry-run mode."""
    db.initialize()
    owner = db.fetchall("SELECT opted_out FROM owners WHERE id=?", (owner_id,))
    if not owner: raise ValueError("owner not found")
    if owner[0]["opted_out"]: raise ValueError("owner has opted out")
    msg = render(template, data); msg.dry_run = dry_run
    status = "dry_run" if dry_run else "queued"
    db.execute("INSERT INTO outreach_log(owner_id,channel,direction,template,status,sent_at,error) VALUES(?,?,?,?,?,?,?)", (owner_id,msg.channel,"outbound",template,status,datetime.utcnow().isoformat() if not dry_run else None, None if dry_run else "Provider integration disabled; queue for approved sender"))
    print(f"[DRY RUN] {msg.channel} -> {msg.recipient}\n{msg.body}") if dry_run else None
    return msg
