# Listing preview images — Credit Report Dispute Letter template
Six 1600×2000 PNG listing previews for the Etsy/Gumroad digital-download listing
(price $19.99, DOCX + PDF instant download). Every claim on the slides is taken
from `../crdl-listing-copy.md` and the template source `../credit-report-dispute-letter.md`
(both already claims-checked) — nothing added, nothing invented. Text is typeset
HTML rasterized with a headless browser. **No AI image generation** (it mangles text).
The set **leads with the product's framing — "a blank letter you fill in and send
yourself" — plus the FCRA § 611 reinvestigation request** right under the title on
the cover. Tied with the Debt Validation Letter for the strictest compliance in the
catalog, so the slides follow the claims discipline in `../crdl-listing-copy.md` exactly.

## Files
| File | Slide |
|---|---|
| `01-cover.png` | Main listing image — "a blank letter you fill in and send yourself" + FCRA § 611 feature strip, price, DOCX/PDF badges, bracket-blank letter mock |
| `02-look-inside.png` | Real template preview (embeds `../_build/credit-report-dispute-letter.html`) |
| `03-whats-included.png` | The two files (DOCX + PDF, 4 pages US Letter) + delivery terms + no-refunds |
| `04-sections.png` | The 10 numbered sections (verbatim from listing copy) |
| `05-how-it-works.png` | 5 steps from the listing copy |
| `06-please-read.png` | Compliance slide — all 8 "Please read before you buy" points, incl. the extended no-outcome-guaranteed and no-credit-repair lines |

Sources: `html/*.html` + `html/style.css` (shared design system from the IC/NDA
sets; exact 1600×2000).

## How they were made / how to regenerate
```bash
cd /home/team/shared/templates && python3 -m http.server 8768 &
agent-browser set viewport 1600 2000
for i in 01-cover 02-look-inside 03-whats-included 04-sections 05-how-it-works 06-please-read; do
  agent-browser open "http://127.0.0.1:8768/crdl-listing-images/html/$i.html"
  sleep 4
  agent-browser screenshot --full "crdl-listing-images/$i.png"
done
```
The server must serve the **templates root** (not the html folder) so slide 2's
iframe (`../../_build/credit-report-dispute-letter.html`) resolves.

## Verification (this build)
- All 6 PNGs exactly 1600×2000 (`file` verified).
- Zero overflow on every slide: `document.body.scrollHeight == 2000` and the
  footer sits flush at y 2000 (nothing clipped). Cover letter-mock checked
  element-by-element: the doc-note sits fully inside the sheet (bottom 1249 <
  sheet bottom 1334) and the price block ends at y 1884 where the footer band begins.
- Slide 2 iframe contains the real built template: body scrollHeight 2057 px,
  first text "CREDIT REPORT DISPUTE LETTER / BLANK TEMPLATE — NOT LEGAL ADVICE…",
  13 h2s (10 numbered sections + how-to-use cover + letter title + FULL DISCLAIMER).
- Compliance by construction: every word is verbatim from the claims-checked
  `../crdl-listing-copy.md` (which passed `_build/check_listing.py`). General
  banned-vocabulary scan (attorney-drafted, lawyer-approved, legally binding,
  enforceable, compliant, protects you, ironclad, court-ready, limited time,
  only N left, testimonial, rating, reviews): zero hits. The only "guarantee"
  occurrences are inside the required "No outcome is guaranteed. / We do not
  guarantee that …" bullet on slide 6. The only "repair" is "We do not provide
  credit repair services" (verbatim disclaimer). "score" appears only in the
  same disclaimer's negation ("or that any credit score or credit report will
  change"), and "will be removed" only inside "We do not guarantee that …
  any item will be removed, corrected, changed, or reported differently".
  Standalone "valid" does not appear. All credit/outcome vocabulary hits sit
  inside those required disclaimer sentences — nothing negative elsewhere.
- The remaining flagged words are internal, instructional uses: "delete the
  statute sentence" (cover doc-note), "delete any you do not want" (how-it-works
  step about [OPTIONAL] brackets), and "we do not review your finished letter"
  (slide-6 self-serve distance statement).

## Facts locked to the listing copy (all present on slides)
- $19.99 one-time, instant download (both platforms, owner-confirmed 2026-10-25).
- Editable DOCX; PDF **4 pages US Letter** (verified against the finished file).
- 10 numbered sections; Section 6 cites the federal Fair Credit Reporting Act,
  section 611, 15 U.S.C. § 1681i with an optional note to remove the statute
  sentence; Section 5 = Statement of Dispute (Option A inaccurate / Option B
  incomplete / Option C not mine / Option D other, keep one); Section 7 = What I
  Ask You to Do (a request written into the letter — plus written notice of the
  results); Section 9 = Response Period (blank for a number of days); Section 10
  = single signature block (a letter from one sender, not a two-party agreement).
- Section 2 names Equifax, Experian, and TransUnion **inside a blank as a factual
  example** — slide text repeats the copy's "nothing in the template recommends one".
- **No blank count on any slide** — deliberate omission, same reason as the DVL
  set (rendered count 33 vs source spans 32 because one blank nests another;
  several brackets are delete-this-note instructions, not fields).
- Plus one-page "How to use this template" cover and full disclaimer at the end.
- No refunds — all sales final (instant digital download), stated on slides 3 and 6.
- Slide 4's footer carries the strongest compliance moment: "Sections 6 and 7 are
  requests written into the letter — not promises that a bureau will respond,
  reinvestigate, or change anything."

## Open items before the owner uploads
Same as the other sets:
- Etsy accepts ≥570px; 1600×2000 (4:5) is above minimum and matches Etsy's
  recommended aspect. If higher-res is wanted (Etsy recommends 2000px+ for zoom),
  regenerate at `agent-browser set viewport 2000 2500` after bumping the canvas
  sizes in `html/style.css` (`html, body { width/height }` and `.slide`).
- The Etsy thumbnail crop may cut the top/bottom ~5–10% of the cover — key text
  is kept inside the central band of `01-cover.png` by design.
- Shop name on the images is **SurplusClaimAI** (matching `../crdl-listing-copy.md`,
  the NDA set, and the DVL set; the IC set used "SurplusClaim AI" — the
  brand-naming question is being raised to the owner separately; if one form is
  chosen, do a global find/replace in `html/` and re-render).
- Do NOT add Etsy attributes, tags, or title keywords promising a credit outcome,
  a score change, or a credit-repair service when listing (per the copy's Etsy
  notes, which also forbid bundling this with the DVL as a "credit repair" package).