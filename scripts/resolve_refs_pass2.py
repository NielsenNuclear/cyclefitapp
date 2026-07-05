"""
resolve_refs_pass2.py — Targeted second-pass resolution for entries that did not resolve
in pass 1, plus verification of carmichael2021nr journal discrepancy.

Runs targeted Crossref queries with alternate strategies for each stubborn entry.
Also verifies carmichael2021nr DOI match by fetching the record.
"""

import json
import os
import sys
import time
import unicodedata
import re

# Force UTF-8 stdout on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

try:
    import requests
except ImportError:
    print("ERROR: pip install requests"); sys.exit(1)

INPUT_JSON  = os.path.join(os.path.dirname(__file__), "..", "research", "initial", "axis-references-resolved.json")
OUTPUT_JSON = INPUT_JSON  # overwrite in place

CROSSREF_WORKS  = "https://api.crossref.org/works/{doi}"
CROSSREF_SEARCH = "https://api.crossref.org/works"
CONTACT_EMAIL   = "ryannielsenied1@gmail.com"
TIMEOUT = 12
DELAY   = 0.8
HEADERS = {"User-Agent": f"AxisRefResolver/1.0 (mailto:{CONTACT_EMAIL})"}


def ascii_lower(s):
    nfkd = unicodedata.normalize("NFKD", s or "")
    return nfkd.encode("ascii", errors="ignore").decode("ascii").lower()

def title_words(title, n=5):
    words = re.sub(r"[^a-zA-Z0-9 ]", " ", ascii_lower(title)).split()
    stop = {"the","a","an","of","in","and","for","on","to","with","by","from"}
    sig = [w for w in words if w not in stop]
    return set(sig[:n])

def title_match(a, b, threshold=4):
    return len(title_words(a) & title_words(b)) >= threshold

def surname_from_crossref(cf_authors):
    if not cf_authors: return ""
    return ascii_lower(cf_authors[0].get("family", ""))

def fetch_by_doi(doi):
    url = CROSSREF_WORKS.format(doi=doi)
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        print(f"  [error] {e}")
    return None

def search(query_title, query_author="", year=None, rows=5, extra_filter=""):
    params = {
        "query.bibliographic": query_title,
        "rows": rows,
        "select": "DOI,title,author,published-print,published-online,container-title",
    }
    if query_author:
        params["query.author"] = query_author
    f = []
    if year:
        f.append(f"from-pub-date:{year-1},until-pub-date:{year+1}")
    if extra_filter:
        f.append(extra_filter)
    if f:
        params["filter"] = ",".join(f)
    try:
        r = requests.get(CROSSREF_SEARCH, params=params, headers=HEADERS, timeout=TIMEOUT)
        if r.status_code == 200:
            return r.json().get("message", {}).get("items", [])
    except Exception as e:
        print(f"  [error] {e}")
    return []

def get_year(item):
    d = item.get("published-print") or item.get("published-online") or {}
    parts = d.get("date-parts", [[0]])[0]
    return parts[0] if parts else 0


def main():
    with open(INPUT_JSON, encoding="utf-8") as f:
        data = json.load(f)

    refs = {r["key"]: r for r in data["references"]}
    changes = {}

    # ── Verify carmichael2021nr journal discrepancy ───────────────────────────
    print("\n== Verifying carmichael2021nr journal ==")
    e = refs["carmichael2021nr"]
    doi = e.get("doi","")
    print(f"  resolved DOI: {doi}  catalog journal: {e.get('journal')}")
    cf = fetch_by_doi(doi)
    time.sleep(DELAY)
    if cf:
        m = cf["message"]
        cf_journal = (m.get("container-title") or [""])[0]
        cf_title = (m.get("title") or [""])[0]
        cf_vol = m.get("volume","")
        cf_issue = m.get("issue","")
        cf_page = m.get("page","")
        print(f"  Crossref journal: {cf_journal}")
        print(f"  Crossref title:   {cf_title}")
        print(f"  Crossref vol/iss/page: {cf_vol}/{cf_issue}/{cf_page}")
        print(f"  Catalog   vol/iss/page: {e.get('volume')}/{e.get('issue')}/{e.get('pages')}")
        # Title match confirms it's the right paper despite journal discrepancy
        if title_match(e["title"], cf_title, threshold=5):
            print("  => Title matches. DOI is correct. Journal in catalog was wrong; updating to Crossref value.")
            changes["carmichael2021nr_journal"] = cf_journal
            e["journal"] = cf_journal
            e["volume"] = cf_vol
            e["issue"] = cf_issue
            e["pages"] = cf_page
    else:
        print("  => could not fetch DOI record")

    # ── Second-pass: 5 unresolved entries ────────────────────────────────────
    unresolved = ["meignie2022", "nattiv2007", "carmichael2023sleep", "mcnamara2022", "carmichael2021track"]

    for key in unresolved:
        e = refs[key]
        title  = e["title"]
        year   = e["year"]
        authors = e.get("authors", [])
        first_author = authors[0].split(",")[0].strip() if authors else ""
        print(f"\n== {key} (year={year}) ==")
        print(f"   {title[:80]}")

        # Strategy 1: shorter title query (first 8 words), author, year
        short_title = " ".join(title.split()[:8])
        candidates = search(short_title, first_author, year, rows=5)
        time.sleep(DELAY)

        matched = None
        for c in candidates:
            cf_title  = (c.get("title") or [""])[0]
            cf_doi    = c.get("DOI","")
            cf_year   = get_year(c)
            cf_sur    = surname_from_crossref(c.get("author",[]))
            bib_sur   = ascii_lower(first_author)
            year_ok   = abs(cf_year - year) <= 1
            sur_ok    = bib_sur and (bib_sur in cf_sur or cf_sur in bib_sur)
            t_ok      = title_match(title, cf_title, threshold=4)
            print(f"  [s1] doi={cf_doi}  year_ok={year_ok} sur_ok={sur_ok} title_ok={t_ok}")
            print(f"       cf_title={cf_title[:65]}")
            if year_ok and sur_ok and t_ok:
                matched = cf_doi; break

        # Strategy 2: title only, no author filter
        if not matched:
            candidates2 = search(title, year=year, rows=5)
            time.sleep(DELAY)
            for c in candidates2:
                cf_title  = (c.get("title") or [""])[0]
                cf_doi    = c.get("DOI","")
                cf_year   = get_year(c)
                cf_sur    = surname_from_crossref(c.get("author",[]))
                bib_sur   = ascii_lower(first_author)
                year_ok   = abs(cf_year - year) <= 1
                sur_ok    = bib_sur and (bib_sur in cf_sur or cf_sur in bib_sur)
                t_ok      = title_match(title, cf_title, threshold=4)
                print(f"  [s2] doi={cf_doi}  year_ok={year_ok} sur_ok={sur_ok} title_ok={t_ok}")
                print(f"       cf_title={cf_title[:65]}")
                if year_ok and sur_ok and t_ok:
                    matched = cf_doi; break

        # Strategy 3: try journal-filtered search for MSSE (nattiv2007)
        if not matched and key == "nattiv2007":
            # Try: "female athlete triad" with nattiv, MSSE, 2007, using ISSN filter
            # MSSE ISSN: 0195-9131
            candidates3 = search("female athlete triad", "nattiv", 2007, rows=5,
                                  extra_filter="issn:0195-9131")
            time.sleep(DELAY)
            for c in candidates3:
                cf_title  = (c.get("title") or [""])[0]
                cf_doi    = c.get("DOI","")
                cf_year   = get_year(c)
                print(f"  [s3-nattiv] doi={cf_doi}  year={cf_year}  title={cf_title[:65]}")
                if abs(cf_year - 2007) <= 1 and "triad" in ascii_lower(cf_title):
                    matched = cf_doi
                    print(f"  => MATCH via triad keyword: {cf_doi}")
                    break

        # Strategy 4: MDPI DOI prefix search for carmichael2021track (Frontiers Sport Active Living)
        if not matched and key == "carmichael2021track":
            # FSAL article: try searching Frontiers Sports Active Living
            candidates4 = search("menstrual cycle symptom tracking training load wellness elite", year=2021, rows=5)
            time.sleep(DELAY)
            for c in candidates4:
                cf_title  = (c.get("title") or [""])[0]
                cf_doi    = c.get("DOI","")
                cf_year   = get_year(c)
                cf_sur    = surname_from_crossref(c.get("author",[]))
                year_ok   = abs(cf_year - year) <= 1
                sur_ok    = "carmichael" in cf_sur
                t_ok      = title_match(title, cf_title, threshold=3)
                print(f"  [s4] doi={cf_doi}  year_ok={year_ok} sur_ok={sur_ok} title_ok={t_ok}")
                print(f"       cf_title={cf_title[:65]}")
                if year_ok and sur_ok and t_ok:
                    matched = cf_doi; break

        # Strategy 5: for mcnamara2022 Sports (MDPI), try with MDPI issn filter
        if not matched and key == "mcnamara2022":
            # Sports (MDPI) ISSN 2075-4663
            candidates5 = search("menstrual cycle exercise performance recovery narrative review", year=2022, rows=5,
                                  extra_filter="issn:2075-4663")
            time.sleep(DELAY)
            for c in candidates5:
                cf_title  = (c.get("title") or [""])[0]
                cf_doi    = c.get("DOI","")
                cf_year   = get_year(c)
                cf_sur    = surname_from_crossref(c.get("author",[]))
                year_ok   = abs(cf_year - year) <= 1
                sur_ok    = "mcnamara" in cf_sur
                t_ok      = title_match(title, cf_title, threshold=3)
                print(f"  [s5-sports] doi={cf_doi}  year_ok={year_ok} sur_ok={sur_ok} title_ok={t_ok}")
                print(f"       cf_title={cf_title[:65]}")
                if year_ok and sur_ok and t_ok:
                    matched = cf_doi; break

        # Strategy 6: carmichael2023sleep in IJSPP
        if not matched and key == "carmichael2023sleep":
            # IJSPP ISSN 1555-0265
            candidates6 = search("menstrual cycle symptoms sleep performance recovery elite athletes", year=2023, rows=5,
                                  extra_filter="issn:1555-0265")
            time.sleep(DELAY)
            for c in candidates6:
                cf_title  = (c.get("title") or [""])[0]
                cf_doi    = c.get("DOI","")
                cf_year   = get_year(c)
                cf_sur    = surname_from_crossref(c.get("author",[]))
                year_ok   = abs(cf_year - year) <= 1
                sur_ok    = "carmichael" in cf_sur
                t_ok      = title_match(title, cf_title, threshold=3)
                print(f"  [s6-ijspp] doi={cf_doi}  year_ok={year_ok} sur_ok={sur_ok} title_ok={t_ok}")
                print(f"       cf_title={cf_title[:65]}")
                if year_ok and sur_ok and t_ok:
                    matched = cf_doi; break

        # Strategy 7: meignie2022 EJAP
        if not matched and key == "meignie2022":
            # EJAP ISSN 1439-6327
            candidates7 = search("dealing menstrual cycle sport exclude women research", year=2022, rows=5,
                                  extra_filter="issn:1439-6327")
            time.sleep(DELAY)
            for c in candidates7:
                cf_title  = (c.get("title") or [""])[0]
                cf_doi    = c.get("DOI","")
                cf_year   = get_year(c)
                cf_sur    = surname_from_crossref(c.get("author",[]))
                sur_ok    = "meignie" in cf_sur
                t_ok      = title_match(title, cf_title, threshold=3)
                print(f"  [s7-ejap] doi={cf_doi}  sur_ok={sur_ok} title_ok={t_ok}")
                print(f"       cf_title={cf_title[:65]}")
                if sur_ok and t_ok:
                    matched = cf_doi; break

        if matched:
            print(f"  => RESOLVED: {matched}")
            e["doi"] = matched
            e["doi_status"] = "resolved"
            if "_unresolved_reason" in e:
                del e["_unresolved_reason"]
        else:
            print(f"  => still UNRESOLVED after all strategies")

    # ── Persist ───────────────────────────────────────────────────────────────
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    # ── Final summary ─────────────────────────────────────────────────────────
    print("\n" + "="*60)
    still_unresolved = [r["key"] for r in data["references"]
                        if r.get("doi_status") in ("to-verify","unresolved")]
    print(f"Still unresolved after pass 2: {len(still_unresolved)}")
    for k in still_unresolved:
        print(f"  {k}")
    print("Resolved JSON updated.")


if __name__ == "__main__":
    main()
