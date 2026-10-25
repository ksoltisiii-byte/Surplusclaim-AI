# Listing preview images — Debt Validation Letter template

Six 1600×2000 PNG listing previews for the Etsy/Gumroad digital-download listing
(price $19.99, DOCX + PDF instant download). Every claim on the slides is taken
from `../dvl-listing-copy.md` and the template source `../debt-validation-letter.md`
(both already claims-checked) — nothing added, nothing invented. Text is typeset
HTML rasterized with a headless browser. **No AI image generation** (it mangles text).

The set **leads with the product's framing — "a blank letter you fill in and send
yourself" — plus the FDCPA § 1692g verification request** right under the title on
the cover. This is the highest-risk product in the catalog, so the slides follow
the claims discipline in `../dvl-listing-copy.md` exactly.

## Files

| File | Slide |
|---|---|
| `01-cover.png` | Main listing image — "a blank letter you fill in and send yourself" + FDCPA § 1692g feature strip, price, DOCX/PDF badges, bracket-blank letter mock |
| `02-look-inside.png` | Real template preview (embeds `../_build/debt-validation-letter.html`) |
| `03-whats-included.png` | The two files (DOCX + PDF, 4 pages US Letter) + delivery terms + no-refunds |
| `04-sections.png` | The 10 numbered sections (verbatim from listing copy) |
| `05-how-it-works.png` | 5 steps from the listing copy |
| `06-please-read.png` | Compliance slide — the 8 "Please read before you buy" points, incl. the extended no-outcome-guaranteed and no-credit-repair lines |

Sources: `html/*.html` + `html/style.css` (shared design system from the IC/NDA
sets; exact 1600×2000).

## How they were made / how to regenerate

```bash
cd /home/team/shared/templates && python3 -m http.server 8768 &
agent-browser set viewport 1600 2000
for i in 01-cover 02-look-inside 03-whats-included 04-sections 05-how-it-works 06-please-read; do
  agent-browser open "http://127.0.0.1:8768/dvl-listing-images/html/$i.html"
  sleep 4
  agent-browser screenshot --full "dvl-listing-images/$i.png"
done
```

The server must serve the **templates root** (not the html folder) so slide 2's
iframe (`../../_build/debt-validation-letter.html`) resolves.

## Verification (this build)

- All 6 PNGs exactly 1600×2000 (`file` verified).
- Zero overflow on every slide: `document.body.scrollHeight == 2000` and the
  footer sits flush at y 2000 (nothing clipped). Cover letter-mock checked
  element-by-element: the doc-note sits fully inside the sheet, and the price
  block ends at y 1884 where the footer band begins.
- Slide 2 iframe contains the real built template: body scrollHeight 2137 px,
  text starts "DEBT VALIDATION LETTER / BLANK TEMPLATE — NOT LEGAL ADVICE…".
- Compliance grep: the only "guarantee" occurrences are inside the required
  "No outcome is guaranteed. / We do not guarantee that …" bullet on slide 6
  (verbatim from the copy). The only "repair" is "We do not provide credit
  repair services" (verbatim disclaimer). The only "review" is "we do not
  review your finished letter" (negation). Standalone "valid" does not appear —
  the only hits are substrings of the product name "Validation".
- Credit/outcome vocabulary audit (repair, improve your credit, fix your credit,
  boost, raise your score, credit score, remove the debt, delete the debt, erase,
  wipe, clean up, settle, forgive, eliminate, will not owe, no longer owe, stop
  collectors, stop collection calls): **zero hits outside the two required
  disclaimer sentences above.**

## Facts locked to the listing copy (all present on slides)

- $19.99 one-time, instant download (both platforms, owner-confirmed 2026-10-25).
- Editable DOCX; PDF **4 pages US Letter** (the DVL is 4 pages — NOT the IC's 8
  or the NDA's 7).
- 10 numbered sections; Section 4 = Statement of Dispute (Option A / Option B,
  keep one); Section 5 cites 15 U.S.C. § 1692g with an optional note to delete
  the statute sentence; Section 7 = Request to Pause Collection Activity (a
  request written into the letter — the mock uses the template's own wording
  "I ask that you not continue collection activity…"); Section 8 = a blank where
  you enter a number of days (shown as `[NUMBER]`, no number asserted).
- **No blank count on any slide** — deliberate omission per `../dvl-listing-copy.md`
  ("Why the '22 blanks' figure is not in the copy"); do not add one.
- Plus one-page "How to use this template" cover and full disclaimer at the end.
- No refunds — all sales final (instant digital download), stated on slides 3 and 6.

## Open items before the owner uploads

Same as the other sets:

- Etsy accepts ≥570px; 1600×2000 (4:5) is above minimum and matches Etsy's
  recommended aspect. If higher-res is wanted (Etsy recommends 2000px+ for zoom),
  regenerate at `agent-browser set viewport 2000 2500` after bumping the canvas
  sizes in `html/style.css` (`html, body { width/height }` and `.slide`).
- The Etsy thumbnail crop may cut the top/bottom ~5–10% of the cover — key text
  is kept inside the central band of `01-cover.png` by design.
- Shop name on the images is **SurplusClaimAI** (matching `../dvl-listing-copy.md`
  and the NDA set; the IC set used "SurplusClaim AI" — the brand-naming question
  is being raised to the owner separately; if one form is chosen, do a global
  find/replace in `html/` and re-render).
- Do NOT add Etsy attributes, tags, or title keywords promising a credit outcome
  when listing (per the copy's Etsy notes).