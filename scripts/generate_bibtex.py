"""
generate_bibtex.py — Convert axis-references-resolved.json to BibTeX and merge into
research/axis-library.bib. Deduplicates by cite-key. Preserves existing entries.

Outputs:
  - @article for journal entries
  - @book for type=book entries (publisher + ISBN, no DOI forced)
  - keywords = {folder:X; focus:Y; tier:Z; grade:W} for filtering

Run: python scripts/generate_bibtex.py
"""

import json, os, re, sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

try:
    import bibtexparser
    from bibtexparser.bparser import BibTexParser
    from bibtexparser.customization import convert_to_unicode
except ImportError:
    print("ERROR: pip install bibtexparser"); sys.exit(1)

INPUT_JSON = os.path.join(os.path.dirname(__file__), "..", "research", "initial", "axis-references-resolved.json")
BIB_PATH   = os.path.join(os.path.dirname(__file__), "..", "research", "axis-library.bib")

# ── Load resolved JSON ────────────────────────────────────────────────────────

with open(INPUT_JSON, encoding="utf-8") as f:
    data = json.load(f)

focus_map = data.get("focus_categories", {})

# ── Load existing .bib to get already-present cite-keys ──────────────────────

existing_keys = set()
if os.path.exists(BIB_PATH):
    parser = BibTexParser(common_strings=True)
    parser.customization = convert_to_unicode
    with open(BIB_PATH, encoding="utf-8") as f:
        existing_db = bibtexparser.load(f, parser=parser)
    for e in existing_db.entries:
        existing_keys.add(e.get("ID",""))

print(f"Existing cite-keys in .bib: {len(existing_keys)}")

# ── Helpers ───────────────────────────────────────────────────────────────────

def escape_bib(s: str) -> str:
    """Minimal BibTeX escaping for field values."""
    s = s.replace("\\", "")  # remove stray backslashes
    s = s.replace("{", "{{").replace("}", "}}")  # re-brace only if needed
    # Actually for simplicity, wrap entire value in braces (already done at field level)
    return s

def format_authors(authors: list) -> str:
    """Return BibTeX-style author string."""
    cleaned = []
    for a in authors:
        a = a.strip()
        if not a:
            continue
        # Ensure "Surname, Given" format
        if "," not in a:
            # "Given Surname" → "Surname, Given"
            parts = a.split()
            if len(parts) >= 2:
                a = f"{parts[-1]}, {' '.join(parts[:-1])}"
        cleaned.append(a)
    return " and ".join(cleaned)

def keywords_field(entry: dict) -> str:
    parts = []
    for folder in entry.get("folders", []):
        parts.append(f"folder:{folder}")
    for fnum in entry.get("focus", []):
        label = focus_map.get(str(fnum), str(fnum))
        parts.append(f"focus:{label}")
    if entry.get("tier"):
        parts.append(f"tier:{entry['tier']}")
    if entry.get("grade"):
        parts.append(f"grade:{entry['grade']}")
    if entry.get("seminal"):
        parts.append("seminal-exception")
    return "; ".join(parts)

def make_article(entry: dict) -> str:
    key = entry["key"]
    lines = [f"@article{{{key},"]

    title = entry.get("title","").replace("{","{{").replace("}","}}")
    lines.append(f"  title     = {{{title}}},")

    authors_raw = entry.get("authors", [])
    if authors_raw:
        lines.append(f"  author    = {{{format_authors(authors_raw)}}},")

    journal = entry.get("journal","").replace("&", "\\&")
    if journal:
        lines.append(f"  journal   = {{{journal}}},")

    year = entry.get("year")
    if year:
        lines.append(f"  year      = {{{year}}},")

    vol = entry.get("volume","")
    if vol:
        lines.append(f"  volume    = {{{vol}}},")

    issue = entry.get("issue","")
    if issue:
        lines.append(f"  number    = {{{issue}}},")

    pages = entry.get("pages","")
    if pages:
        lines.append(f"  pages     = {{{pages}}},")

    doi = entry.get("doi","").strip()
    doi_status = entry.get("doi_status","")
    if doi and doi_status not in ("to-verify","unresolved"):
        lines.append(f"  doi       = {{{doi}}},")
    elif not doi or doi_status in ("unresolved",):
        lines.append(f"  doi       = {{TODO:unverified}},")
        reason = entry.get("_unresolved_reason","DOI not resolved via Crossref")
        short_reason = reason[:120]
        lines.append(f"  note      = {{TODO: DOI unresolved — {short_reason}}},")

    kw = keywords_field(entry)
    if kw:
        lines.append(f"  keywords  = {{{kw}}},")

    lines.append(f"}}")
    return "\n".join(lines)


def make_book(entry: dict) -> str:
    key = entry["key"]
    lines = [f"@book{{{key},"]

    title = entry.get("title","").replace("{","{{").replace("}","}}")
    lines.append(f"  title     = {{{title}}},")

    authors_raw = entry.get("authors", [])
    if authors_raw:
        lines.append(f"  author    = {{{format_authors(authors_raw)}}},")

    publisher = entry.get("publisher","")
    if publisher:
        lines.append(f"  publisher = {{{publisher}}},")

    year = entry.get("year")
    if year:
        lines.append(f"  year      = {{{year}}},")

    isbn = entry.get("isbn","")
    if isbn:
        lines.append(f"  isbn      = {{{isbn}}},")

    kw = keywords_field(entry)
    if kw:
        lines.append(f"  keywords  = {{{kw}}},")

    note = entry.get("note","")
    if note:
        short_note = note[:200].replace("{","").replace("}","")
        lines.append(f"  note      = {{{short_note}}},")

    lines.append(f"}}")
    return "\n".join(lines)


# ── Generate new entries ──────────────────────────────────────────────────────

new_entries = []
skipped = []
added = []

for entry in data["references"]:
    key = entry["key"]
    if key in existing_keys:
        skipped.append(key)
        continue
    etype = entry.get("type","article")
    if etype == "book":
        bib_str = make_book(entry)
    else:
        bib_str = make_article(entry)
    new_entries.append(bib_str)
    added.append(key)

print(f"New entries to add: {len(new_entries)}")
print(f"Skipped (already in .bib): {len(skipped)}")

# ── Append to .bib file ───────────────────────────────────────────────────────

if new_entries:
    with open(BIB_PATH, "a", encoding="utf-8") as f:
        f.write("\n\n")
        f.write("% ============================================================\n")
        f.write("% Axis Reference Catalog — merged from axis-references-resolved.json\n")
        f.write("% 65 entries: 63 @article + 2 @book\n")
        f.write("% Generated by scripts/generate_bibtex.py\n")
        f.write("% ============================================================\n\n")
        for bib_str in new_entries:
            f.write(bib_str)
            f.write("\n\n")
    print(f"\nMerged {len(new_entries)} entries into axis-library.bib")
else:
    print("\nNo new entries (all already present or nothing to add).")

# ── Summary ───────────────────────────────────────────────────────────────────
print("\nAdded keys:")
for k in added:
    print(f"  {k}")

unresolved = [r for r in data["references"] if r.get("doi_status") in ("to-verify","unresolved")]
if unresolved:
    print(f"\nUnresolved DOIs ({len(unresolved)}):")
    for r in unresolved:
        print(f"  {r['key']}: {r.get('_unresolved_reason','')[:80]}")
