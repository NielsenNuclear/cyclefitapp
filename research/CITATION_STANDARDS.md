# Axis Citation Standards

A checklist for any contributor (human or agent) adding references to the Axis Research Library. Every item is non-negotiable unless explicitly noted as advisory.

---

## 1. Source verification

- [ ] **The reference exists.** Confirm the paper exists via PubMed, Google Scholar, or the publisher's website before adding it. Never add a reference from a secondary citation without verifying the primary.
- [ ] **The DOI resolves.** If the entry has a DOI, visit `https://doi.org/{doi}` and confirm it returns the correct paper. Do not guess DOIs.
- [ ] **No fabricated DOIs.** If a DOI cannot be confirmed, use `doi = {TODO:unverified}` and add `note = {TODO: DOI unresolved — verify before publishing}`. A blank DOI field is better than a wrong one.
- [ ] **Author names match.** The surnames in your BibTeX entry match what appears on the paper. This is the most common data-entry error — check each author against the source record.
- [ ] **Year and journal match.** Publication year and journal name match the canonical record (PubMed or publisher page), not a preprint or working paper unless that is explicitly what is being cited.

---

## 2. Cite-key convention

- [ ] **Format:** `authorYYYYkeyword` — first author surname (lowercase, ASCII, no hyphens/spaces), four-digit year, one distinguishing keyword.
- [ ] **No duplicates.** Run a duplicate check before committing (`scripts/verify_refs.py` flags duplicate cite keys).
- [ ] **Stable keys.** Once a cite key is in the library, do not change it — other documents may reference it.

---

## 3. Search and database standards

Before claiming a literature gap or consensus, search in this order:
1. PubMed
2. Google Scholar
3. SPORTDiscus
4. Scopus
5. Web of Science

- [ ] Record which databases were searched when compiling a topic summary.
- [ ] Prioritise: ACSM publications, ISSN publications, IOC consensus statements, *British Journal of Sports Medicine*, *Sports Medicine*, *Medicine & Science in Sports & Exercise*.

---

## 4. Evidence grading

Every key claim in the library and in the app's evidence hub must carry an explicit evidence grade. Use the following scheme:

| Grade | Definition |
|---|---|
| **A** | Consistent evidence from multiple high-quality RCTs or a well-conducted meta-analysis with low heterogeneity (I² < 50%) |
| **B** | Evidence from at least one RCT, or consistent findings from well-conducted observational studies |
| **C** | Evidence from observational studies, case series, or expert opinion with mechanistic rationale |
| **D** | Theoretical / mechanistic only; no direct human evidence |
| **Insufficient** | Conflicting evidence or evidence base too small to grade |

- [ ] Every claim in an evidence hub entry has an assigned grade.
- [ ] Grade is justified by citing the specific papers that underpin it — not asserted.

---

## 5. Phase verification tagging

For every entry in folders 01–08:

- [ ] Record the phase-verification method: `calendar`, `LH-strip`, `LH-serum`, `progesterone-serum`, `BBT`, `ultrasound`, or `not-stated`.
- [ ] Flag entries with `not-stated` or `calendar-only` as **high misclassification risk** where hormonal verification was feasible.
- [ ] Do not equate calendar-only and serum-verified studies in evidence summaries.

---

## 6. Engaging counter-evidence

- [ ] **Engage the strongest counter-evidence directly by name.** Do not sidestep papers that complicate the narrative.
  - For resistance training: engage Wikström-Frisén et al. (2017) and Sung et al. (2014) directly.
  - For performance: engage Kissow et al. (2022) directly.
  - For any domain: identify the two strongest pro-phase papers and the two strongest null-finding papers and address both.
- [ ] **No strawmen.** Represent opposing findings at their strongest, not at their weakest.
- [ ] **Distinguish "insufficiently evidenced" from "unsupported."** These are different claims. "Insufficiently evidenced" = the question has not been adequately studied. "Unsupported" = the evidence actively points against the claim.

---

## 7. Citation network non-independence

- [ ] Note when a cluster of papers shares authors, institutional affiliations, or funding sources — citation networks can overstate consensus when the same group cites itself repeatedly.
- [ ] When summarising a body of evidence, count independent research groups, not just paper count.

---

## 8. OCP disclosure

- [ ] For every entry in folders 02–05, record whether OCP users were included, excluded, or not disclosed.
- [ ] Flag any study that does not report OCP status as having an **uncontrolled confound**.

---

## 9. Running the validator

Before committing any new entries to `axis-library.bib`:

```bash
python scripts/verify_refs.py
```

- The script checks all DOIs against the Crossref REST API.
- It flags missing DOIs, unresolved DOIs, and author-surname mismatches.
- It exits non-zero if any DOI is unresolved — fix before committing.

---

## 10. Prohibited actions

- **Never invent a reference, title, author list, journal, year, volume, page, or DOI.** If you cannot verify a specific detail, leave it blank or mark it `TODO`.
- **Never paraphrase a paper you have not read.** If you have only read the abstract, note that explicitly.
- **Never remove a `TODO:unverified` marker without actually verifying** the entry against a live source record.

---

*This document is enforced by the agent rules in `CLAUDE.md`. If a future session conflicts with these standards, these standards take precedence for all research-track work.*
