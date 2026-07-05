"""
resolve_refs_pass3.py — Targeted verification for the 4 remaining unresolved entries.

nattiv2007: verify DOI candidate 10.1249/mss.0b013e318149f111 (title shortened in Crossref)
carmichael2021track: try Frontiers article-number DOI 10.3389/fspor.2021.656229
carmichael2023sleep: try IJSPP search with carmichael + year=2023 relaxed
mcnamara2022: try Sports (MDPI) with relaxed title/surname matching
"""

import json, os, sys, time, unicodedata, re

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

try:
    import requests
except ImportError:
    print("ERROR: pip install requests"); sys.exit(1)

INPUT_JSON = os.path.join(os.path.dirname(__file__), "..", "research", "initial", "axis-references-resolved.json")
CROSSREF_WORKS  = "https://api.crossref.org/works/{doi}"
CROSSREF_SEARCH = "https://api.crossref.org/works"
CONTACT = "ryannielsenied1@gmail.com"
TIMEOUT = 12
DELAY   = 0.8
HEADERS = {"User-Agent": f"AxisRefResolver/1.0 (mailto:{CONTACT})"}

def ascii_lower(s):
    nfkd = unicodedata.normalize("NFKD", s or "")
    return nfkd.encode("ascii", errors="ignore").decode("ascii").lower()

def title_words_set(title, n=8):
    words = re.sub(r"[^a-zA-Z0-9 ]"," ", ascii_lower(title)).split()
    stop = {"the","a","an","of","in","and","for","on","to","with","by","from","its","at","is","are","was"}
    return set(w for w in words if w not in stop)[:n] if False else set([w for w in words if w not in stop][:n])

def title_match(a, b, threshold=3):
    return len(title_words_set(a) & title_words_set(b)) >= threshold

def fetch_doi(doi):
    url = CROSSREF_WORKS.format(doi=doi)
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        if r.status_code == 200:
            return r.json()["message"]
        print(f"  HTTP {r.status_code} for {doi}")
    except Exception as e:
        print(f"  Error: {e}")
    return None

def search(q_title, q_author="", year=None, rows=5, extra_filter=""):
    params = {"query.bibliographic": q_title, "rows": rows,
              "select": "DOI,title,author,published-print,published-online,container-title"}
    if q_author: params["query.author"] = q_author
    f = []
    if year: f.append(f"from-pub-date:{year-1},until-pub-date:{year+1}")
    if extra_filter: f.append(extra_filter)
    if f: params["filter"] = ",".join(f)
    try:
        r = requests.get(CROSSREF_SEARCH, params=params, headers=HEADERS, timeout=TIMEOUT)
        if r.status_code == 200:
            return r.json().get("message",{}).get("items",[])
    except Exception as e:
        print(f"  Search error: {e}")
    return []

def get_year(item):
    d = item.get("published-print") or item.get("published-online") or {}
    p = d.get("date-parts",[[0]])[0]
    return p[0] if p else 0

def main():
    with open(INPUT_JSON, encoding="utf-8") as f:
        data = json.load(f)
    refs = {r["key"]: r for r in data["references"]}

    results = {}

    # ── nattiv2007: verify 10.1249/mss.0b013e318149f111 ─────────────────────
    print("\n== nattiv2007 ==")
    candidate_doi = "10.1249/mss.0b013e318149f111"
    m = fetch_doi(candidate_doi)
    time.sleep(DELAY)
    if m:
        cf_title   = (m.get("title") or [""])[0]
        cf_journal = (m.get("container-title") or [""])[0]
        cf_authors = m.get("author", [])
        cf_year_d  = m.get("published-print") or m.get("published-online") or {}
        cf_year    = (cf_year_d.get("date-parts",[[0]])[0] or [0])[0]
        cf_vol     = m.get("volume","")
        cf_pages   = m.get("page","")
        cf_sur     = ascii_lower(cf_authors[0].get("family","")) if cf_authors else ""
        print(f"  cf_title:   {cf_title}")
        print(f"  cf_journal: {cf_journal}")
        print(f"  cf_year:    {cf_year}  cf_vol={cf_vol}  cf_pages={cf_pages}")
        print(f"  cf_surname: {cf_sur}")
        # Accept if: Nattiv as first author + MSSE + 2007 + vol 39 + pages 1867
        catalog_vol   = refs["nattiv2007"].get("volume","39")
        catalog_pages = refs["nattiv2007"].get("pages","1867-1882")
        year_ok    = abs(cf_year - 2007) <= 1
        sur_ok     = "nattiv" in cf_sur
        vol_ok     = cf_vol == str(catalog_vol)
        page_ok    = cf_pages and catalog_pages.split("-")[0] in cf_pages
        print(f"  year_ok={year_ok} sur_ok={sur_ok} vol_ok={vol_ok} page_ok={page_ok}")
        if year_ok and sur_ok and (vol_ok or page_ok):
            print(f"  => ACCEPT (Nattiv/2007/MSSE/{cf_vol} matches catalog vol/year/author)")
            results["nattiv2007"] = candidate_doi
        else:
            print(f"  => REJECT")
    else:
        print(f"  => DOI fetch failed")

    # ── carmichael2021track: try Frontiers article-number DOI ───────────────
    print("\n== carmichael2021track ==")
    # Pages in catalog: 656229  — Frontiers DOI pattern: 10.3389/fspor.2021.656229
    frontiers_doi = "10.3389/fspor.2021.656229"
    m = fetch_doi(frontiers_doi)
    time.sleep(DELAY)
    if m:
        cf_title  = (m.get("title") or [""])[0]
        cf_journal = (m.get("container-title") or [""])[0]
        cf_authors = m.get("author", [])
        cf_sur    = ascii_lower(cf_authors[0].get("family","")) if cf_authors else ""
        cf_year_d = m.get("published-print") or m.get("published-online") or {}
        cf_year   = (cf_year_d.get("date-parts",[[0]])[0] or [0])[0]
        print(f"  cf_title:   {cf_title}")
        print(f"  cf_journal: {cf_journal}")
        print(f"  cf_year:    {cf_year}  cf_surname={cf_sur}")
        year_ok = abs(cf_year - 2021) <= 1
        sur_ok  = "carmichael" in cf_sur
        t_ok    = title_match(refs["carmichael2021track"]["title"], cf_title, threshold=3)
        print(f"  year_ok={year_ok} sur_ok={sur_ok} title_ok={t_ok}")
        if year_ok and sur_ok and t_ok:
            print(f"  => ACCEPT: {frontiers_doi}")
            results["carmichael2021track"] = frontiers_doi
        else:
            print(f"  => REJECT")

    # ── carmichael2023sleep: IJSPP, try with relaxed sur match ──────────────
    print("\n== carmichael2023sleep ==")
    catalog_title = refs["carmichael2023sleep"]["title"]
    # Try broader keyword search in IJSPP (1555-0265)
    for q in [
        "menstrual cycle symptoms sleep performance recovery elite athletes",
        "menstrual cycle symptoms sleep elite athletes carmichael",
    ]:
        print(f"  query: {q[:60]}")
        hits = search(q, year=2023, rows=5, extra_filter="issn:1555-0265")
        time.sleep(DELAY)
        for c in hits:
            cf_title  = (c.get("title") or [""])[0]
            cf_doi    = c.get("DOI","")
            cf_year   = get_year(c)
            cf_sur    = ascii_lower((c.get("author") or [{}])[0].get("family",""))
            year_ok   = abs(cf_year - 2023) <= 1
            sur_ok    = "carmichael" in cf_sur
            t_ok      = title_match(catalog_title, cf_title, threshold=3)
            print(f"  doi={cf_doi}  sur_ok={sur_ok}  t_ok={t_ok}")
            print(f"  cf_title={cf_title[:65]}")
            if year_ok and sur_ok and t_ok:
                results["carmichael2023sleep"] = cf_doi
                print(f"  => ACCEPT: {cf_doi}")
                break
        if "carmichael2023sleep" in results:
            break
    if "carmichael2023sleep" not in results:
        # Try a direct DOI guess based on IJSPP numbering pattern: 10.1123/ijspp.YYYY-XXXX
        # Just do a broader search without journal filter
        hits2 = search("menstrual cycle symptoms sleep performance recovery", "carmichael", 2023, rows=5)
        time.sleep(DELAY)
        for c in hits2:
            cf_title  = (c.get("title") or [""])[0]
            cf_doi    = c.get("DOI","")
            cf_year   = get_year(c)
            cf_sur    = ascii_lower((c.get("author") or [{}])[0].get("family",""))
            year_ok   = abs(cf_year - 2023) <= 1
            sur_ok    = "carmichael" in cf_sur
            t_ok      = title_match(catalog_title, cf_title, threshold=3)
            print(f"  [no-filter] doi={cf_doi}  sur_ok={sur_ok}  t_ok={t_ok}")
            print(f"  cf_title={cf_title[:65]}")
            if year_ok and sur_ok and t_ok:
                results["carmichael2023sleep"] = cf_doi
                print(f"  => ACCEPT: {cf_doi}")
                break
    if "carmichael2023sleep" not in results:
        print("  => still unresolved")

    # ── mcnamara2022: try Sports MDPI with McNamara relaxed ─────────────────
    print("\n== mcnamara2022 ==")
    catalog_title = refs["mcnamara2022"]["title"]
    for q in [
        "menstrual cycle exercise performance recovery practical recommendations",
        "menstrual cycle exercise performance recovery mcnamara 2022",
    ]:
        print(f"  query: {q[:60]}")
        hits = search(q, year=2022, rows=5)
        time.sleep(DELAY)
        for c in hits:
            cf_title  = (c.get("title") or [""])[0]
            cf_doi    = c.get("DOI","")
            cf_year   = get_year(c)
            cf_sur    = ascii_lower((c.get("author") or [{}])[0].get("family",""))
            year_ok   = abs(cf_year - 2022) <= 1
            sur_ok    = "mcnamara" in cf_sur
            t_ok      = title_match(catalog_title, cf_title, threshold=3)
            print(f"  doi={cf_doi}  sur_ok={sur_ok}  t_ok={t_ok}")
            print(f"  cf_title={cf_title[:65]}")
            if year_ok and sur_ok and t_ok:
                results["mcnamara2022"] = cf_doi
                print(f"  => ACCEPT: {cf_doi}")
                break
        if "mcnamara2022" in results:
            break
    if "mcnamara2022" not in results:
        # Try direct: Sports (MDPI) 10.3390/sports pattern
        # The catalog says vol 10 issue 6 pages 88 → DOI might be 10.3390/sports10060088
        candidate = "10.3390/sports10060088"
        print(f"  Trying direct DOI guess (volume-issue-article pattern): {candidate}")
        m = fetch_doi(candidate)
        time.sleep(DELAY)
        if m:
            cf_title  = (m.get("title") or [""])[0]
            cf_jour   = (m.get("container-title") or [""])[0]
            cf_sur    = ascii_lower((m.get("author") or [{}])[0].get("family",""))
            cf_year_d = m.get("published-print") or m.get("published-online") or {}
            cf_year   = (cf_year_d.get("date-parts",[[0]])[0] or [0])[0]
            print(f"  cf_title={cf_title}")
            print(f"  cf_jour={cf_jour}  cf_year={cf_year}  cf_sur={cf_sur}")
            year_ok = abs(cf_year - 2022) <= 1
            sur_ok  = "mcnamara" in cf_sur
            t_ok    = title_match(catalog_title, cf_title, threshold=3)
            print(f"  year_ok={year_ok} sur_ok={sur_ok} title_ok={t_ok}")
            if year_ok and sur_ok and t_ok:
                results["mcnamara2022"] = candidate
                print(f"  => ACCEPT: {candidate}")
            else:
                print(f"  => REJECT")
        else:
            print(f"  => DOI fetch failed")
    if "mcnamara2022" not in results:
        print("  => still unresolved")

    # ── Apply results ─────────────────────────────────────────────────────────
    print("\n" + "="*60)
    for key, doi in results.items():
        refs[key]["doi"] = doi
        refs[key]["doi_status"] = "resolved"
        refs[key].pop("_unresolved_reason", None)
        print(f"  RESOLVED: {key} -> {doi}")

    still = [r["key"] for r in data["references"] if r.get("doi_status") in ("to-verify","unresolved")]
    print(f"\nStill unresolved: {len(still)}")
    for k in still:
        reason = refs[k].get("_unresolved_reason","")
        print(f"  {k}: {reason}")

    with open(INPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print("\nJSON updated.")

if __name__ == "__main__":
    main()
