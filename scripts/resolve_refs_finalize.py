"""
resolve_refs_finalize.py — Accept nattiv2007 based on verified vol/page/journal/year match
and write final unresolved reasons for carmichael2021track, carmichael2023sleep, mcnamara2022.
"""

import json, os, sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

INPUT_JSON = os.path.join(os.path.dirname(__file__), "..", "research", "initial", "axis-references-resolved.json")

with open(INPUT_JSON, encoding="utf-8") as f:
    data = json.load(f)

refs = {r["key"]: r for r in data["references"]}

# Accept nattiv2007: Crossref confirmed MSSE 2007 vol=39 pages=1867-1882 — all match catalog
# Title "The Female Athlete Triad" is abbreviated form; empty surname is Crossref data quality issue for 2007 MSSE record
refs["nattiv2007"]["doi"] = "10.1249/mss.0b013e318149f111"
refs["nattiv2007"]["doi_status"] = "resolved"
refs["nattiv2007"]["_doi_accept_reason"] = (
    "Crossref confirmed MSSE 2007 vol=39 pages=1867-1882. "
    "All 4 metadata fields match catalog. Crossref title 'The Female Athlete Triad' is abbreviated form of catalog title. "
    "Empty author surname in Crossref record is a data quality issue for this 2007 MSSE record."
)
refs["nattiv2007"].pop("_unresolved_reason", None)
print("nattiv2007 -> accepted 10.1249/mss.0b013e318149f111")

# Document unresolved reasons
unresolved_notes = {
    "carmichael2021track": (
        "Frontiers in Sports and Active Living 2021, pages=656229. "
        "DOI pattern 10.3389/fspor.2021.656229 returns 404 from Crossref — article may not be indexed. "
        "No surname+title match found via bibliographic search. Requires manual verification."
    ),
    "carmichael2023sleep": (
        "Int J Sports Physiology and Performance 2023. "
        "Exhaustive IJSPP ISSN-filtered search (2022-2024) returned no Carmichael record with matching title. "
        "Paper may have been published late 2023 / early 2024 and not yet indexed in Crossref."
    ),
    "mcnamara2022": (
        "Sports (MDPI) 2022 vol=10 issue=6 pages=88. "
        "DOI pattern 10.3390/sports10060088 resolves to a different paper (cycling study). "
        "Catalog volume/issue/pages may be inaccurate. No surname+title match found via search. "
        "Requires manual verification against the MDPI Sports archive."
    ),
}

for key, reason in unresolved_notes.items():
    refs[key]["doi_status"] = "unresolved"
    refs[key]["_unresolved_reason"] = reason
    refs[key]["doi"] = ""
    print(f"{key} -> unresolved: {reason[:80]}...")

with open(INPUT_JSON, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

still = [r["key"] for r in data["references"] if r.get("doi_status") in ("to-verify", "unresolved")]
print(f"\nFinal unresolved count: {len(still)}")
for k in still:
    print(f"  {k}: {refs[k].get('_unresolved_reason','')[:80]}")
