"""
setup_zotero.py — Create Axis Research Library collections in Zotero.

Reads credentials from environment variables:
  ZOTERO_API_KEY    — your Zotero Web API key
  ZOTERO_LIBRARY_ID — your Zotero library ID (numeric)

Runs idempotently: skips collections that already exist.

Usage:
  python scripts/setup_zotero.py

Requirements:
  pip install pyzotero python-dotenv
"""

import os
import sys

# Load .env if present (never required — env vars can come from the shell)
try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
except ImportError:
    pass

try:
    from pyzotero import zotero
except ImportError:
    print("ERROR: pyzotero not installed. Run: pip install pyzotero")
    sys.exit(1)

# ── Credentials ──────────────────────────────────────────────────────────────

API_KEY    = os.environ.get("ZOTERO_API_KEY")
LIBRARY_ID = os.environ.get("ZOTERO_LIBRARY_ID")

if not API_KEY or not LIBRARY_ID:
    print(
        "ERROR: ZOTERO_API_KEY and ZOTERO_LIBRARY_ID must be set as environment "
        "variables (or in scripts/.env).\n"
        "Example:\n"
        "  export ZOTERO_API_KEY=your_key_here\n"
        "  export ZOTERO_LIBRARY_ID=123456"
    )
    sys.exit(1)

# ── Collection taxonomy ───────────────────────────────────────────────────────
# Mirrors the 14-folder structure under research/.
# Each entry is (folder_number, collection_name).

COLLECTIONS = [
    ("01", "Menstrual Physiology"),
    ("02", "Cycle Phases & Hormones"),
    ("03", "Resistance Training"),
    ("04", "Endurance & Aerobic Performance"),
    ("05", "Recovery & Fatigue"),
    ("06", "Nutrition & Fueling"),
    ("07", "Psychological & Perceptual Factors"),
    ("08", "Clinical & Special Populations"),
    ("09", "Contraception & Hormonal Modulation"),
    ("10", "Meta-Analyses & Systematic Reviews"),
    ("11", "Behavior Change & Adherence"),
    ("12", "Wearables & Biomarkers"),
    ("13", "Digital Health & Femtech"),
    ("14", "Research Gaps & Methodological Critiques"),
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def get_existing_collection_names(zot) -> set:
    """Return a set of top-level collection names already in the library."""
    try:
        existing = zot.collections()
    except Exception as exc:
        print(f"ERROR: Could not retrieve existing collections: {exc}")
        sys.exit(1)
    return {c["data"]["name"] for c in existing}


def create_collection(zot, name: str) -> str:
    """Create a single collection and return its key."""
    payload = [{"name": name, "parentCollection": False}]
    try:
        result = zot.create_collections(payload)
        # pyzotero returns a dict with 'successful', 'unchanged', 'failed'
        if result.get("successful"):
            key = list(result["successful"].values())[0]["key"]
            return key
        elif result.get("unchanged"):
            return ""  # already existed — should have been caught by pre-check
        else:
            print(f"  WARNING: unexpected response creating '{name}': {result}")
            return ""
    except Exception as exc:
        print(f"  ERROR creating '{name}': {exc}")
        return ""

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print(f"Connecting to Zotero library {LIBRARY_ID}...")
    zot = zotero.Zotero(LIBRARY_ID, "user", API_KEY)

    print("Fetching existing collections...")
    existing_names = get_existing_collection_names(zot)
    print(f"  Found {len(existing_names)} existing top-level collection(s).")

    created = 0
    skipped = 0

    for folder_num, name in COLLECTIONS:
        display_name = f"{folder_num} — {name}"
        if display_name in existing_names or name in existing_names:
            print(f"  [skip]    {display_name}")
            skipped += 1
            continue

        key = create_collection(zot, display_name)
        if key:
            print(f"  [created] {display_name}  (key: {key})")
            created += 1
        else:
            print(f"  [error]   {display_name}")

    print(f"\nDone. {created} created, {skipped} already existed.")
    if created == 0 and skipped == len(COLLECTIONS):
        print("All collections are already present — library is up to date.")


if __name__ == "__main__":
    main()
