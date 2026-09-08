# Homeowner Outreach Letter — RATIFIED COPY (owner-approved 2026-08-31)

This is the canonical, owner-approved wording. The letter module must use this copy
verbatim. Merge fields are `{{double_braces}}` and are filled from the lead record
(public data) or from business config.

## Compliance notes (do not regress)
- Facts-only opening: "public records show a tax sale occurred" — never claim funds
  are already found or owed.
- "Estimate, not a guarantee" appears inline AND in the footer disclaimer.
- No urgency, no deadlines, no "act now" (the TX 180-day window is intentionally omitted).
- No invented owner name — address to "Property Owner / Former Owner".
- 30% contingency disclosed; nothing up front.
- Honest opt-out + "you can inquire with the county yourself".

## Merge fields
Lead record (public data): `{{date}}`, `{{address}}`, `{{city}}`, `{{state}}`, `{{zip}}`,
`{{county}}`, `{{cause_nbr}}`, `{{estimated_surplus}}`.
Business config (MUST be real values before any send — never hardcode fake ones):
`{{business_name}}`, `{{business_address}}`, `{{business_city}}`, `{{business_state}}`,
`{{business_zip}}`, `{{business_phone}}`, `{{business_website}}`, `{{business_domain}}`.

---

{{business_name}}
{{business_address}}
{{business_city}}, {{business_state}} {{business_zip}}
{{business_phone}} · {{business_website}}

{{date}}

**Property Owner / Former Owner**
{{address}}
{{city}}, {{state}} {{zip}}

**Re: Potential unclaimed surplus funds — {{county}} County tax sale, Cause No. {{cause_nbr}}**

Dear Property Owner,

Public records show that the property at **{{address}}, {{city}}, {{state}}** was listed
in a {{county}} County tax foreclosure sale (Cause No. {{cause_nbr}}).

When a property is sold at a tax sale for more than the amount of taxes owed, the
difference — called "surplus" or "excess proceeds" — may be returned to the former
owner. Based on the public record for this property, we **estimate** the potential
surplus may be approximately **${{estimated_surplus}}**. This is an estimate, not a
guarantee, and the actual amount (if any) must be confirmed with the county.

Our firm helps former property owners identify and claim these funds. We work on a
contingency basis:

- **You pay nothing up front.**
- **Our fee is 30% of the amount recovered** — we only get paid if you do.

If you are the former owner of this property (or an heir), and you'd like to learn
whether funds may be available to you, contact us at **{{business_phone}}** or visit
{{business_website}}.

If you no longer own this property and have no claim to it, please disregard this
letter. To be removed from future mailings, email us at optout@{{business_domain}} or
call the number above.

Sincerely,

{{business_name}}

*This is a solicitation, not a government notice. This letter does not guarantee that
funds are available or that you are entitled to any amount. You are not required to use
our services; former owners may also inquire directly with the county.*
