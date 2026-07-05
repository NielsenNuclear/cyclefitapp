"""
resolve_refs.py — Resolve authors_via_doi and doi_to_verify entries in axis-references.json.

D2: For entries with authors_via_doi=true, fetch author list from Crossref by DOI.
D3: For entries with doi_status=to-verify, search Crossref bibliographically and confirm match.

Writes resolved JSON to research/initial/axis-references-resolved.json and prints a report.

Usage:
  python scripts/resolve_refs.py
"""

import json
import os
import sys
import time
import unicodedata
import re

try:
    import requests
except ImportError:
    print("ERROR: requests not installed. Run: pip install requests")
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────────────────────

INPUT_JSON = os.path.join(os.path.dirname(__file__), "..", "research", "initial", "axis-references.json")
OUTPUT_JSON = os.path.join(os.path.dirname(__file__), "..", "research", "initial", "axis-references-resolved.json")
CROSSREF_WORKS = "https://api.crossref.org/works/{doi}"
CROSSREF_SEARCH = "https://api.crossref.org/works"
CONTACT_EMAIL = "ryannielsenied1@gmail.com"
TIMEOUT = 12
DELAY = 0.8  # polite pool delay

HEADERS = {"User-Agent": f"AxisRefResolver/1.0 (mailto:{CONTACT_EMAIL})"}

# ── Normalisation helpers ──────────────────────────────────────────────────────

def ascii_lower(s: str) -> str:
    nfkd = unicodedata.normalize("NFKD", s or "")
    return nfkd.encode("ascii", errors="ignore").decode("ascii").lower()

def surname_from_bib(author_str: str) -> str:
    """First author, last name only, ascii-lowercased."""
    if not author_str:
        return ""
    first = author_str.split(" and ")[0].strip()
    if "," in first:
        return ascii_lower(first.split(",")[0].strip())
    parts = first.split()
    return ascii_lower(parts[-1]) if parts else ""

def surname_from_crossref(cf_authors: list) -> str:
    if not cf_authors:
        return ""
    return ascii_lower(cf_authors[0].get("family", ""))

def title_words(title: str, n: int = 5) -> set:
    """Return first n significant words of a title, lowercased."""
    words = re.sub(r"[^a-zA-Z0-9 ]", " ", ascii_lower(title)).split()
    stop = {"the","a","an","of","in","and","for","on","to","with","by","from"}
    sig = [w for w in words if w not in stop]
    return set(sig[:n])

def title_match(a: str, b: str, threshold: int = 4) -> bool:
    """True if >= threshold significant words overlap between two titles."""
    return len(title_words(a) & title_words(b)) >= threshold

# ── Crossref helpers ──────────────────────────────────────────────────────────

def fetch_by_doi(doi: str) -> dict | None:
    url = CROSSREF_WORKS.format(doi=doi)
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        print(f"    [network error] {doi}: {e}")
    return None


def search_bibliographic(title: str, first_author: str, year: int) -> list:
    """Return top 3 Crossref hits for a bibliographic query."""
    params = {
        "query.bibliographic": title,
        "query.author": first_author,
        "filter": f"from-pub-date:{year-1},until-pub-date:{year+1}",
        "rows": 5,
        "select": "DOI,title,author,published-print,published-online,container-title",
    }
    try:
        r = requests.get(CROSSREF_SEARCH, params=params, headers=HEADERS, timeout=TIMEOUT)
        if r.status_code == 200:
            items = r.json().get("message", {}).get("items", [])
            return items
    except Exception as e:
        print(f"    [network error] search: {e}")
    return []


def authors_from_cf(cf_data: dict) -> list[str]:
    """Return list of 'Surname, Given' strings from Crossref author array."""
    authors = cf_data.get("message", {}).get("author", [])
    out = []
    for a in authors:
        surname = a.get("family", "")
        given = a.get("given", "")
        if surname:
            out.append(f"{surname}, {given}".strip(", "))
    return out

# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    with open(INPUT_JSON, encoding="utf-8") as f:
        data = json.load(f)

    refs = data["references"]
    authors_via_doi_keys = set(data.get("authors_via_doi", []))
    doi_to_verify_keys = set(data.get("doi_to_verify", []))

    report_d2 = []
    report_d3 = []
    resolved_count = 0
    unresolved_d3 = []

    for entry in refs:
        key = entry["key"]

        # ── D2: authors_via_doi ───────────────────────────────────────────
        if key in authors_via_doi_keys:
            doi = entry.get("doi", "").strip()
            print(f"\n[D2] {key}  doi={doi}")
            cf = fetch_by_doi(doi)
            time.sleep(DELAY)
            if cf:
                authors = authors_from_cf(cf)
                cf_title = cf["message"].get("title", [""])[0]
                if authors:
                    print(f"  -> {len(authors)} authors: {authors}")
                    entry["authors"] = authors
                    entry["_d2_cf_title"] = cf_title
                    report_d2.append({
                        "key": key, "status": "resolved",
                        "authors": authors, "cf_title": cf_title
                    })
                else:
                    print(f"  -> no authors in Crossref record")
                    report_d2.append({"key": key, "status": "no-authors-in-cf", "cf_title": cf_title})
            else:
                print(f"  -> DOI did not resolve")
                report_d2.append({"key": key, "status": "doi-unresolved"})

        # ── D3: doi_to_verify ─────────────────────────────────────────────
        elif key in doi_to_verify_keys:
            title = entry.get("title", "")
            year  = entry.get("year", 0)
            authors_list = entry.get("authors", [])
            first_author = authors_list[0].split(",")[0].strip() if authors_list else ""

            print(f"\n[D3] {key}  year={year}  first_author={first_author}")
            print(f"     title: {title[:80]}")

            candidates = search_bibliographic(title, first_author, year)
            time.sleep(DELAY)

            matched_doi = None
            match_detail = None

            for candidate in candidates:
                cf_titles = candidate.get("title", [])
                cf_title = cf_titles[0] if cf_titles else ""
                cf_doi = candidate.get("DOI", "")
                cf_authors = candidate.get("author", [])
                cf_year_data = candidate.get("published-print") or candidate.get("published-online") or {}
                cf_year_parts = cf_year_data.get("date-parts", [[0]])[0]
                cf_year = cf_year_parts[0] if cf_year_parts else 0
                cf_surname = surname_from_crossref(cf_authors)
                bib_surname = ascii_lower(first_author) if first_author else ""

                year_ok = abs(cf_year - year) <= 1
                surname_ok = bib_surname and cf_surname and bib_surname in cf_surname or cf_surname in bib_surname
                title_ok = title_match(title, cf_title, threshold=4)

                print(f"  candidate DOI={cf_doi}")
                print(f"    cf_title={cf_title[:70]}")
                print(f"    cf_year={cf_year} year_ok={year_ok}  cf_sur={cf_surname} sur_ok={surname_ok}  title_ok={title_ok}")

                if year_ok and surname_ok and title_ok:
                    matched_doi = cf_doi
                    match_detail = {
                        "cf_title": cf_title,
                        "cf_year": cf_year,
                        "cf_surname": cf_surname,
                    }
                    print(f"  => MATCH: {cf_doi}")
                    break
                else:
                    print(f"  => no match (year_ok={year_ok}, sur_ok={surname_ok}, title_ok={title_ok})")

            if matched_doi:
                entry["doi"] = matched_doi
                entry["doi_status"] = "resolved"
                resolved_count += 1
                report_d3.append({
                    "key": key, "status": "resolved",
                    "doi": matched_doi, **match_detail
                })
            else:
                entry["doi"] = ""
                entry["doi_status"] = "unresolved"
                reason = f"no Crossref hit with matching title+author+year among {len(candidates)} candidates"
                entry["_unresolved_reason"] = reason
                unresolved_d3.append(key)
                report_d3.append({
                    "key": key, "status": "unresolved",
                    "reason": reason, "candidates_checked": len(candidates)
                })
                print(f"  => UNRESOLVED")

    # ── Write resolved JSON ───────────────────────────────────────────────────
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"\n\nResolved JSON written to {OUTPUT_JSON}")

    # ── Print summary ─────────────────────────────────────────────────────────
    print("\n" + "="*60)
    print("D2 AUTHOR RESOLUTION SUMMARY")
    for r in report_d2:
        print(f"  {r['key']}: {r['status']}")
        if r.get("authors"):
            print(f"    authors: {r['authors']}")

    print("\nD3 DOI RESOLUTION SUMMARY")
    d3_resolved = [r for r in report_d3 if r["status"] == "resolved"]
    d3_unresolved = [r for r in report_d3 if r["status"] == "unresolved"]
    print(f"  Resolved:   {len(d3_resolved)}")
    print(f"  Unresolved: {len(d3_unresolved)}")
    for r in d3_resolved:
        print(f"  [ok]   {r['key']} -> {r['doi']}")
    for r in d3_unresolved:
        print(f"  [fail] {r['key']}: {r['reason']}")

    print("\n" + "="*60)
    print(f"Run complete. {resolved_count} DOIs resolved, {len(unresolved_d3)} unresolved.")


if __name__ == "__main__":
    main()
