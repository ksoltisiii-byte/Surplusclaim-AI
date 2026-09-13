"""Public-record scrapers for SurplusClaim AI.

Lazy re-exports: importing the package must NOT import every scraper module,
otherwise `python3 -m scrapers.lgbs` (running from the project root) warns that
the target module is already in sys.modules when runpy executes it.
``from scrapers import LGBSScraper`` still works via __getattr__.
"""

_LAZY = {
    "HarrisCountyScraper": (".harris_county_scraper", "HarrisCountyScraper"),
    "LGBSClient": (".lgbs", "LGBSClient"),
    "LGBSScraper": (".lgbs", "LGBSScraper"),
    "SurplusLead": (".lgbs", "SurplusLead"),
    "normalize_record": (".lgbs", "normalize_record"),
    "write_csv": (".lgbs", "write_csv"),
}


def __getattr__(name):
    import importlib

    mapping = _LAZY.get(name)
    if mapping is not None:
        module_name, attr = mapping
        mod = importlib.import_module(module_name, __name__)
        return getattr(mod, attr)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


def __dir__():
    return sorted(list(globals().keys()) + list(_LAZY.keys()))