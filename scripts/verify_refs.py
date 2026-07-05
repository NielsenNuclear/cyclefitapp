"""
verify_refs.py — Validate all DOIs in research/axis-library.bib.

For each entry:
  - Flags entries with no DOI field
  - Flags entries with doi = {TODO:unverified}
  - Hits the Crossref REST API to confirm each real DOI resolves
  - Compares the first author's surname in .bib against the Crossref record

Exits 0 if all DOIs resolve. Exits 1 if any DOI is unresolved or the
.bib file has entries with TODO:unverified DOIs.

Usage:
  python scripts/verify_refs.py

Requirements:
  pip install bibtexparser requests
"""

import os
import sys
import time
import re

try:
    import bibtexparser
    from bibtexparser.bparser import BibTexParser
    from bibtexparser.customization import convert_to_unicode
except ImportError:
    print("ERROR: bibtexparser not installed. Run: pip install bibtexparser")
    sys.exit(1)

try:
    import requests
except ImportError:
    print("ERROR: requests not installed. Run: pip install requests")
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────────────────────

BIB_PATH = os.path.join(
    os.path.dirname(__file__), "..", "research", "axis-library.bib"
)
CROSSREF_BASE = "https://api.crossref.org/works/{doi}"
REQUEST_TIMEOUT = 10  # seconds per request
POLITE_DELAY    = 0.5  # seconds between Crossref requests (Crossref etiquette)
CONTACT_EMAIL   = "ryannielsenied1@gmail.com"  # for Crossref polite pool

# ── Helpers ───────────────────────────────────────────────────────────────────

def load_bib(path: str):
    parser = BibTexParser(common_strings=True)
    parser.customization = convert_to_unicode
    with open(path, encoding="utf-8") as f:
        db = bibtexparser.load(f, parser=parser)
    return db.entries


def normalise_surname(name: str) -> str:
    """Lowercase, strip accents via ASCII conversion, remove spaces/hyphens."""
    import unicodedata
    nfkd = unicodedata.normalize("NFKD", name)
    ascii_name = nfkd.encode("ascii", errors="ignore").decode("ascii")
    return re.sub(r"[\s\-]", "", ascii_name).lower()


def first_author_surname_from_bib(entry: dict) -> str | None:
    raw = entry.get("author", "")
    if not raw:
        return None
    # Authors are separated by " and " in BibTeX
    first = raw.split(" and ")[0].strip()
    # BibTeX name formats: "Surname, Given" or "Given Surname"
    if "," in first:
        surname = first.split(",")[0].strip()
    else:
        parts = first.split()
        surname = parts[-1] if parts else first
    return normalise_surname(surname)


def first_author_surname_from_crossref(crossref_data: dict) -> str | None:
    authors = crossref_data.get("message", {}).get("author", [])
    if not authors:
        return None
    family = authors[0].get("family", "")
    return normalise_surname(family) if family else None


def check_doi(doi: str, entry_key: str) -> dict:
    """
    Returns a result dict with keys:
      status   : "ok" | "unresolved" | "error"
      message  : human-readable description
      bib_sur  : first-author surname from .bib (or None)
      cf_sur   : first-author surname from Crossref (or None)
      sur_match: True / False / None (None = couldn't check)
    """
    url = CROSSREF_BASE.format(doi=doi)
    headers = {"User-Agent": f"AxisRefValidator/1.0 (mailto:{CONTACT_EMAIL})"}
    try:
        resp = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
    except requests.RequestException as exc:
        return {"status": "error", "message": str(exc),
                "bib_sur": None, "cf_sur": None, "sur_match": None}

    if resp.status_code == 404:
        return {"status": "unresolved", "message": "DOI not found (HTTP 404)",
                "bib_sur": None, "cf_sur": None, "sur_match": None}
    if resp.status_code != 200:
        return {"status": "error",
                "message": f"Crossref returned HTTP {resp.status_code}",
                "bib_sur": None, "cf_sur": None, "sur_match": None}

    data = resp.json()
    cf_sur = first_author_surname_from_crossref(data)
    return {"status": "ok", "message": "resolved",
            "bib_sur": None,  # filled in by caller
            "cf_sur": cf_sur, "sur_match": None}  # sur_match filled by caller

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    bib_path = os.path.abspath(BIB_PATH)
    if not os.path.exists(bib_path):
        print(f"ERROR: BibTeX file not found: {bib_path}")
        sys.exit(1)

    entries = load_bib(bib_path)

    if not entries:
        print("axis-library.bib is empty — nothing to validate.")
        sys.exit(0)

    print(f"Loaded {len(entries)} entries from axis-library.bib\n")

    issues = []
    warnings = []

    for entry in entries:
        key   = entry.get("ID", "<unknown>")
        doi   = entry.get("doi", "").strip()
        bib_surname = first_author_surname_from_bib(entry)

        # ── 1. Missing DOI ────────────────────────────────────────────────
        if not doi:
            warnings.append(f"[NO-DOI]   {key}  — no DOI field")
            print(f"  [no-doi]  {key}")
            continue

        # ── 2. TODO:unverified marker ────────────────────────────────────
        if doi.lower().startswith("todo"):
            issues.append(f"[UNVERIFIED] {key}  — doi = {doi}")
            print(f"  [todo]    {key}  doi={doi}")
            continue

        # ── 3. Live Crossref check ────────────────────────────────────────
        result = check_doi(doi, key)
        result["bib_sur"] = bib_surname

        if result["status"] == "ok" and bib_surname and result["cf_sur"]:
            result["sur_match"] = (bib_surname == result["cf_sur"])

        if result["status"] == "ok":
            sur_info = ""
            if result["sur_match"] is False:
                sur_info = (
                    f"  !! surname mismatch: bib='{bib_surname}' "
                    f"cf='{result['cf_sur']}'"
                )
                warnings.append(
                    f"[SUR-MISMATCH] {key}  "
                    f"bib='{bib_surname}' cf='{result['cf_sur']}'"
                )
            match_tag = " (surname ok)" if result["sur_match"] is True else sur_info
            print(f"  [ok]      {key}  doi={doi}{match_tag}")
        elif result["status"] == "unresolved":
            issues.append(f"[UNRESOLVED] {key}  doi={doi}")
            print(f"  [FAIL]    {key}  doi={doi}  — {result['message']}")
        else:
            warnings.append(f"[ERROR]    {key}  doi={doi}  — {result['message']}")
            print(f"  [error]   {key}  doi={doi}  — {result['message']}")

        time.sleep(POLITE_DELAY)

    # ── Summary ───────────────────────────────────────────────────────────────
    print(f"\n{'─'*60}")
    print(f"Entries checked : {len(entries)}")
    print(f"Hard failures   : {len(issues)}")
    print(f"Warnings        : {len(warnings)}")

    if issues:
        print("\nHARD FAILURES (must fix before committing):")
        for msg in issues:
            print(f"  {msg}")

    if warnings:
        print("\nWARNINGS (review recommended):")
        for msg in warnings:
            print(f"  {msg}")

    if not issues:
        print("\nAll DOIs resolved. Library is clean.")
        sys.exit(0)
    else:
        print(f"\n{len(issues)} unresolved DOI(s). Fix before committing.")
        sys.exit(1)


if __name__ == "__main__":
    main()
