# Listing preview images — Non-Disclosure Agreement template

Six 1600×2000 PNG listing previews for the Etsy/Gumroad digital-download listing
(price $19.99, DOCX + PDF instant download). Every claim on the slides is taken
from `../nda-listing-copy.md` and the template source `../non-disclosure-agreement.md`
(both already claims-checked) — nothing added, nothing invented. Text is typeset
HTML rasterized with a headless browser. **No AI image generation** (it mangles text).

The set deliberately **leads with the product's defining feature — one document,
one-way or mutual** — right under the title on the cover (Section 10: Option A
one-way / Option B mutual; buyer keeps one and deletes the other, so there is no
need to buy two versions).

## Files

| File | Slide |
|---|---|
| `01-cover.png` | Main listing image — title, price, DOCX/PDF badges, **one document one-way-or-mutual** feature strip with Option A / Option B cards, bracket-blank mock |
| `02-look-inside.png` | Real template preview (embeds `../_build/non-disclosure-agreement.html`) |
| `03-whats-included.png` | The two files (DOCX + PDF, 7 pages US Letter) and delivery terms — incl. the no-refunds policy |
| `04-sections.png` | The 15 numbered sections (verbatim from listing copy) |
| `05-how-it-works.png` | 5 steps from the listing copy — step 2 is "read Section 10, decide one-way or mutual" |
| `06-please-read.png` | Compliance slide — the 7 "Please read before you buy" points |

Sources: `html/*.html` + `html/style.css` (shared design system from the IC set
plus a one-way/mutual feature-strip section; exact 1600×2000).

## How they were made / how to regenerate

```bash
cd /home/team/shared/templates && python3 -m http.server 8767 &
agent-browser set viewport 1600 2000
for i in 01-cover 02-look-inside 03-whats-included 04-sections 05-how-it-works 06-please-read; do
  agent-browser open "http://127.0.0.1:8767/nda-listing-images/html/$i.html"
  sleep 4
  agent-browser screenshot --full "nda-listing-images/$i.png"
done
```

The server must serve the **templates root** (not the html folder) so slide 2's
iframe (`../../_build/non-disclosure-agreement.html`) resolves.

## Verification (this build)

- All 6 PNGs exactly 1600×2000 (`file` verified).
- Zero overflow on every slide: `document.body.scrollHeight == 2000` and the
  footer sits at y 1884–2000 (nothing clipped, nothing cut off).
- Slide 2 iframe contains the real built template: body scrollHeight 3861 px,
  text starts "NON-DISCLOSURE AGREEMENT / BLANK TEMPLATE — NOT LEGAL ADVICE…".
- Compliance grep across `html/`: the only "guaranteed" occurrence is the
  required disclaimer "No outcome is guaranteed." on slide 6; the only "review"
  hits are slide 5/6's "we do not review your finished document" negation and a
  comment in the shared CSS (not user-visible). No attorney-drafted /
  lawyer-approved / legally binding / enforceable / compliant / protects-you /
  limited-time / testimonials claims. "not legal advice" ×3, "not a law firm" ×2,
  "attorney-client" ×1, "licensed attorney" ×2 — the standard disclaimer lines.

## Facts locked to the listing copy (all present on slides)

- $19.99 one-time, instant download (both platforms, owner-confirmed).
- Editable DOCX; PDF **7 pages US Letter** (the NDA is 7 pages — the IC set's
  "8 pages" does NOT carry over).
- 15 numbered sections; Section 10 = One-Way or Mutual, choose one.
- 44 fill-in blanks in the DOCX and PDF (bracket count verified 44 = 44 in the
  claims table of `../nda-listing-copy.md`); stated on the cover doc-note.
- Blanks in bold shaded blocks, e.g. `[DISCLOSING PARTY NAME]`, `[EFFECTIVE DATE]`.
- Plus one-page "How to use this template" cover and full disclaimer at the end.
- No refunds — all sales final (instant digital download), stated on slides 3 and 6.

## Open items before the owner uploads

Same as the IC set:

- Etsy accepts ≥570px; 1600×2000 (4:5) is above minimum and matches Etsy's
  recommended aspect. If higher-res is wanted (Etsy recommends 2000px+ for zoom),
  regenerate at `agent-browser set viewport 2000 2500` after bumping the canvas
  sizes in `html/style.css` (`html, body { width/height }` and `.slide`).
- The Etsy thumbnail crop may cut the top/bottom ~5–10% of the cover — key text
  is kept inside the central band of `01-cover.png` by design; re-check if Etsy
  recrops aggressively.
- Shop name on the images is **SurplusClaimAI** (matching the shop name in
  `../nda-listing-copy.md` and the business plan) with no space — the IC set used
  "SurplusClaim AI" with a space. If the owner prefers one form everywhere,
  regenerate at the same viewport after a find/replace in `html/`.