"""Operational compliance guardrails; verify with licensed counsel before production use."""
from dataclasses import dataclass
from datetime import date

@dataclass(frozen=True)
class StateRule:
    code: str; statute: str; fee_cap: float | None; attorney_required: bool; deadline_days: int; disclosure: str

RULES = {
 "CA": StateRule("CA", "California Government Code §7060", None, False, 365, "California has no statutory contingency cap; disclose fee in writing."),
 "FL": StateRule("FL", "Florida Statute §45.035", .30, True, 60, "Florida surplus claims require state-specific compliance and attorney involvement."),
 "TX": StateRule("TX", "Texas Property Code §51", .40, False, 180, "Texas permits fees up to 40%; disclose fee and right to independent counsel."),
}

def state_rule(state: str) -> StateRule:
    try: return RULES[state.upper()]
    except KeyError: raise ValueError(f"unsupported state: {state}")

def validate_fee(state: str, fee_percent: float) -> None:
    rule = state_rule(state)
    if fee_percent < 0 or (rule.fee_cap is not None and fee_percent / 100 > rule.fee_cap):
        raise ValueError(f"{state} fee exceeds permitted cap")

def deadline(state: str, auction_date: date) -> date:
    return auction_date.fromordinal(auction_date.toordinal() + state_rule(state).deadline_days)
