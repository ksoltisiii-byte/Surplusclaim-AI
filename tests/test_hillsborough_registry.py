"""Regression tests for the Hillsborough registry parser's newest-file selection.

Bug fixed 2026-09-27 (task: fix/hillsborough-registry-newest-date): live filenames
embed the as-of date as "<Www>_MM_DD_YYYY" (e.g. ..._as_of_Fri_09_25_2026.pdf) and
the old selector sorted the NAME string, which compares the weekday abbreviation
first (Fri < Mon < Thu < Tue < Wed alphabetically) and therefore picked Wed over
the newer Thu/Fri.  The live auto-fetch grabbed Wed_09_23 while Fri_09_25 was the
freshest file in the directory.  Selection now parses the embedded date.

Run from the repo root:
    python3 -m unittest discover -s tests -v
"""
import unittest
from datetime import datetime
from unittest import mock

from scrapers import hillsborough_registry as hb

FRI = "Registry_and_TrustAccounts_Balances_as_of_Fri_09_25_2026.pdf"
WED = "Registry_and_TrustAccounts_Balances_as_of_Wed_09_23_2026.pdf"
MON = "Registry_and_TrustAccounts_Balances_as_of_Mon_09_21_2026.pdf"
TUE = "Registry_and_TrustAccounts_Balances_as_of_Tue_09_22_2026.pdf"
THU = "Registry_and_TrustAccounts_Balances_as_of_Thu_09_24_2026.pdf"
SAT = "Registry_and_TrustAccounts_Balances_as_of_Sat_09_26_2026.pdf"


def _listing(*names: str) -> bytes:
    """Fake live-directory Apache index HTML holding exactly the given PDFs."""
    rows = "\n".join(
        f'<tr><td><a href="{n}">{n}</a></td><td>2026-09-25 22:00</td></tr>'
        for n in names
    )
    return (f"<html><body><table>{rows}</table></body></html>").encode()


class AsOfDateTest(unittest.TestCase):
    def test_live_shape_parses(self):
        # Registry_and_TrustAccounts_Balances_as_of_Fri_09_25_2026.pdf
        self.assertEqual(
            hb._asof_date(FRI), datetime(2026, 9, 25),
        )
        self.assertEqual(hb._asof_date(WED), datetime(2026, 9, 23))

    def test_archived_dash_shape_parses(self):
        # Local snapshots use ..._as_of_2026-09-22.pdf (YYYY-MM-DD, no weekday).
        self.assertEqual(
            hb._asof_date("hillsborough_Registry_and_TrustAccounts_Balances_as_of_2026-09-22.pdf"),
            datetime(2026, 9, 22),
        )

    def test_unparseable_returns_none(self):
        self.assertIsNone(hb._asof_date("Registry_and_TrustAccounts_Balances_as_of_LATEST.pdf"))
        self.assertIsNone(hb._asof_date("Registry_and_TrustAccounts_Balances_as_of_99_99_9999.pdf"))
        self.assertIsNone(hb._asof_date("not_a_match.pdf"))


class LatestPdfUrlTest(unittest.TestCase):
    def _latest(self, *names: str) -> str:
        """Run _latest_pdf_url against a fake listing; return the chosen basename."""
        with mock.patch.object(hb, "_read_bytes", return_value=_listing(*names)):
            url, name = hb._latest_pdf_url()
        self.assertTrue(url.startswith(hb.LIVE_DIR), url)
        self.assertTrue(url.endswith(name), url)
        return name

    def test_fri_beats_wed(self):
        # THE regression: the old name-sort picked Wed (W > F); date-sort must pick Fri.
        self.assertEqual(self._latest(FRI, WED), FRI)
        self.assertEqual(self._latest(WED, FRI), FRI)

    def test_full_weekday_week_picks_friday(self):
        # Clerk publishes Mon-Fri only; the newest is Friday's file.
        self.assertEqual(self._latest(MON, TUE, WED, THU, FRI), FRI)

    def test_weekend_gap_falls_back_to_last_weekday(self):
        # No Sat/Sun file exists over the weekend -- Friday still wins.
        self.assertEqual(self._latest(MON, TUE, WED, THU, FRI), FRI)

    def test_saturday_would_beat_friday(self):
        # Selection is purely date-based: if a weekend file ever appeared it wins.
        self.assertEqual(self._latest(FRI, SAT), SAT)

    def test_same_date_tie_breaks_by_name(self):
        # Two files dated same day (shouldn't happen, but be deterministic).
        a = "Registry_and_TrustAccounts_Balances_as_of_Mon_01_01_2026.pdf"
        b = "Registry_and_TrustAccounts_Balances_as_of_Tue_01_01_2026.pdf"
        self.assertEqual(self._latest(a, b), b)  # 'Tue' > 'Mon' desc

    def test_unparseable_names_fall_back_to_name_sort(self):
        # Naming change (no date in the name): never crash; name-sort fallback.
        a = "Registry_and_TrustAccounts_Balances_as_of_LATEST.pdf"
        b = "Registry_and_TrustAccounts_Balances_as_of_NEXT.pdf"
        self.assertEqual(self._latest(b, a), b)

    def test_dated_file_beats_undated_name(self):
        # A dated file must always win over an undated one (no shadowing).
        self.assertEqual(self._latest("Registry_and_TrustAccounts_Balances_as_of_NEXT.pdf", FRI), FRI)


if __name__ == "__main__":
    unittest.main()