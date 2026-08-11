"""Plain-text engagement letter generator with required commercial disclosures."""
from .compliance import validate_fee, state_rule

def generate_engagement(owner_name: str, state: str, property_address: str, fee_percent: float = 30) -> str:
    validate_fee(state, fee_percent); rule = state_rule(state)
    attorney = " Because Florida law may require attorney involvement, an attorney partner must review this engagement before filing." if rule.attorney_required else ""
    return f'''SURPLUS FUNDS RECOVERY ENGAGEMENT AGREEMENT

Client: {owner_name}
Property: {property_address}
State: {state.upper()} ({rule.statute})

SERVICES. We will assist with identifying and submitting a claim for surplus foreclosure proceeds. You may consult independent counsel at any time.

CONTINGENCY FEE. Our fee is {fee_percent:.0f}% of funds actually recovered and paid to you. NO RECOVERY, NO FEE: you owe us no fee if no surplus funds are recovered. Any government filing fees or third-party costs will be disclosed and approved separately.

DISCLOSURES. This agreement is not legal advice. Recovery is not guaranteed. You retain the right to pursue the claim yourself or with another representative. Please review all information and ask questions before signing.{attorney}

Client signature: __________________________    Date: __________
Company representative: ____________________    Date: __________
'''
