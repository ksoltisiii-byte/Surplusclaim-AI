"""Backward-compatible aliases for the canonical LGBS scraper.

The feed is no longer Harris-only.  New code should import from
:mod:`scrapers.lgbs`; these aliases keep older imports working without
maintaining a second parser or a second surplus calculation.
"""
from __future__ import annotations

from .lgbs import LGBSClient, LGBSScraper, SurplusLead, normalize_record, write_csv


class HarrisCountyScraper(LGBSScraper):
    """Compatibility wrapper defaulting to Harris County.

    Pass ``county=None`` or ``counties=...`` to use the same all-county path as
    :class:`LGBSScraper`.
    """

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("county", "HARRIS COUNTY")
        super().__init__(*args, **kwargs)


__all__ = [
    "HarrisCountyScraper",
    "LGBSClient",
    "LGBSScraper",
    "SurplusLead",
    "normalize_record",
    "write_csv",
]
