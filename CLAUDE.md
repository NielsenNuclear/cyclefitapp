@AGENTS.md

---

## Section 2 — Research Library Standing Standards

These rules apply to all research-track work in the `research/` directory and to any evidence claims surfaced in the app. They are binding on all agents and contributors.

### 2.1 Reference integrity

- **Never invent references, authors, titles, journals, years, volumes, pages, or DOIs.** If a specific detail cannot be verified, leave it blank or mark it `TODO`. A blank field is always better than a fabricated one.
- **Every DOI must be live.** Before adding an entry to `axis-library.bib`, confirm the DOI resolves at `https://doi.org/{doi}`. Use `doi = {TODO:unverified}` for unconfirmed DOIs. Run `python scripts/verify_refs.py` before committing — it exits non-zero on unresolved DOIs.
- **Author names must match.** Verify all author surnames against the PubMed or publisher record. Surname mismatch in `verify_refs.py` output must be resolved before committing.
- Cite-key format: `authorYYYYkeyword` (e.g. `wikstromfrisen2017resistance`). Once assigned, keys are stable and must not change.
- Full checklist: `research/CITATION_STANDARDS.md`.

### 2.2 Evidence grading

Every claim exposed in the app's evidence hub must carry an explicit grade:

| Grade | Definition |
|---|---|
| **A** | Multiple high-quality RCTs or meta-analysis with I² < 50% |
| **B** | At least one RCT or consistent observational evidence |
| **C** | Observational / expert opinion with mechanistic rationale |
| **D** | Theoretical / mechanistic only |
| **Insufficient** | Conflicting or too little evidence to grade |

- Grade must be justified by citing specific papers — never asserted.
- **"Insufficiently evidenced" ≠ "unsupported."** These are different claims. Use the precise language.

### 2.3 Phase verification

For any study in folders 01–08:
- Record the phase-verification method: `calendar`, `LH-strip`, `LH-serum`, `progesterone-serum`, `BBT`, `ultrasound`, or `not-stated`.
- Flag `calendar-only` and `not-stated` entries as **high misclassification risk**.
- Do not equate calendar-only and serum-verified studies in evidence summaries.

### 2.4 OCP disclosure

For studies in folders 02–05:
- Record whether OCP users were included, excluded, or not disclosed.
- Flag studies that do not report OCP status as having an **uncontrolled confound**.

### 2.5 Counter-evidence obligation

- Engage the strongest counter-evidence directly by name — never sidestep papers that complicate the narrative.
  - Resistance training domain: Wikström-Frisén et al. (2017) and Sung et al. (2014) must be engaged directly.
  - Performance domain: Kissow et al. (2022) must be engaged directly.
- Represent opposing findings at their strongest (no strawmen).
- Note citation network non-independence: count independent research groups, not just paper count.

### 2.6 Credential security

- `ZOTERO_API_KEY` and `ZOTERO_LIBRARY_ID` must come from environment variables. Never hardcode credentials.
- `scripts/.env` is gitignored via `.env*`. Do not commit it.
- Do not touch the live Zotero library without confirmed credentials supplied by the user.

---

## Section 3 — Research Library Taxonomy

The `research/` directory uses a 14-folder taxonomy. Each folder has a `README.md` defining scope, inclusion criteria, and an evidence note.

| Folder | Name | Primary purpose |
|---|---|---|
| `01-menstrual-physiology` | Menstrual Physiology | Hormonal mechanisms, cycle phases, reference ranges |
| `02-cycle-phases-hormones` | Cycle Phases & Hormones | Phase-specific hormonal profiles and their physiological effects |
| `03-resistance-training` | Resistance Training | Strength, hypertrophy, and resistance training across the cycle |
| `04-endurance-performance` | Endurance & Aerobic Performance | Aerobic capacity, VO2max, endurance performance |
| `05-recovery-fatigue` | Recovery & Fatigue | Recovery markers, fatigue, readiness — highest-defensibility domain |
| `06-nutrition-fueling` | Nutrition & Fueling | Substrate use, REDs, fueling strategy |
| `07-psychological-perceptual` | Psychological & Perceptual Factors | Perceived exertion, mood, motivation, pain |
| `08-clinical-special-populations` | Clinical & Special Populations | Amenorrhea, PCOS, elite athletes, clinical populations |
| `09-contraception` | Contraception & Hormonal Modulation | OCP, hormonal IUD, and other contraceptive effects |
| `10-meta-analyses` | Meta-Analyses & Systematic Reviews | Aggregate evidence; Kissow 2022 is a key anchor paper |
| `11-behavior-change` | Behavior Change & Adherence | Habit formation, adherence, motivational frameworks |
| `12-wearables-biomarkers` | Wearables & Biomarkers | HRV, temperature, wearable validity |
| `13-digital-health` | Digital Health & Femtech | Femtech evidence, DTx regulation, health data privacy |
| `14-research-gaps` | Research Gaps & Methodological Critiques | Known evidence gaps, methodological weaknesses, Axis design decisions under uncertainty |

Primary bibliography: `research/axis-library.bib` (BibTeX) and `research/axis-library.json` (CSL-JSON mirror).
Citation standards: `research/CITATION_STANDARDS.md`.
DOI validator: `scripts/verify_refs.py`.
Zotero collection creator: `scripts/setup_zotero.py`.

