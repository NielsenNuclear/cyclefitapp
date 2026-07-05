# Axis Catalog Verification Report

**Generated:** 2026-07-05  
**Catalog source:** `research/initial/axis-references-resolved.json`  
**BibTeX target:** `research/axis-library.bib`  
**Validator:** `scripts/verify_refs.py` (Crossref REST API)

---

## Summary

| Status | Count |
|---|---|
| DOI resolved + surname confirmed | 59 |
| DOI resolved (surname not checkable in Crossref) | 1 (`nattiv2007`) |
| Books — no DOI expected | 2 |
| **Unresolved — human review required** | **3** |
| **Total entries** | **65** |

**CI gate:** `scripts/verify_refs.py` exits non-zero while any unresolved entries remain.

---

## Unresolved entries — human review required

These three entries could not be confirmed via Crossref after three targeted search passes. **Do not add a DOI to these entries without manually verifying the paper at the publisher's website.**

| Key | Title | Journal | Year | Reason |
|---|---|---|---|---|
| `carmichael2023sleep` | Menstrual Cycle Symptoms and Sleep: Associations With Performance and Recovery in Elite Athletes | Int J Sports Physiology and Performance | 2023 | No matching record found via IJSPP ISSN-filtered Crossref search (2022–2024 range). Paper may not yet be indexed. Verify at Human Kinetics / IJSPP directly. |
| `mcnamara2022` | The Menstrual Cycle, Exercise Performance and Recovery: Narrative Review and Practical Recommendations | Sports (MDPI) | 2022 | DOI pattern `10.3390/sports10060088` resolves to a different paper. Catalog volume/issue/pages may be inaccurate. Verify in the MDPI Sports archive for McNamara et al. 2022. |
| `carmichael2021track` | Menstrual Cycle Symptom Tracking and the Association With Training Load and Wellness in Elite Female Athletes | Frontiers in Sports and Active Living | 2021 | Frontiers DOI pattern `10.3389/fspor.2021.656229` returns HTTP 404 from Crossref. Article may exist on Frontiers but not be registered with Crossref. Verify at frontiersin.org. |

---

## D2 — Authors resolved via DOI

| Key | Authors (from Crossref) |
|---|---|
| `mlphase2025` | Kilungeja, Grentina; Graham, Krystal; Liu, Xudong; Nasseri, Mona |
| `flowingdata2025` | Mohan, Sarika; Jenkins, Judy |
| `tempreg2020` | Baker, Fiona C.; Siboza, Felicia; Fuller, Andrea |

---

## D3 — DOIs resolved via Crossref bibliographic search

| Key | DOI confirmed |
|---|---|
| `kuikman2023` | `10.1249/mss.0000000000003056` |
| `ekenros2022` | `10.3389/fphys.2022.954760` |
| `bruinvels2021strava` | `10.1136/bjsports-2020-102792` |
| `bruinvels2022transitions` | `10.1007/s40279-022-01691-2` |
| `martin2018` | `10.1123/ijspp.2017-0330` |
| `bull2019` | `10.1038/s41746-019-0152-7` |
| `costello2014` | `10.1080/17461391.2014.911354` |
| `jansedejonge2019` | `10.1249/mss.0000000000002073` |
| `meignie2022` | `10.1007/s00421-022-05014-1` |
| `hagstrom2021` | `10.1007/s40279-020-01405-6` |
| `desouza2014fatc` | `10.1097/jsm.0000000000000085` |
| `gibbs2013` | `10.1249/mss.0b013e31827e1bdc` |
| `carmichael2021nr` | `10.3390/ijerph18041667` *(see note)* |
| `schaumberg2017` | `10.1016/j.jsams.2016.08.013` |
| `burden2015iron` | `10.1136/bjsports-2014-093624` |

**Note on `carmichael2021nr`:** Crossref confirms the title "The Impact of Menstrual Cycle Phase on Athletes' Performance: A Narrative Review" at this DOI, but the journal is *International Journal of Environmental Research and Public Health* (Vol 18/4/article 1667), not *Nutrients* as listed in the catalog. The BibTeX entry has been updated to the Crossref-confirmed journal. If the catalog entry was intentionally pointing to a Nutrients paper, this requires human review.

**Note on `nattiv2007`:** DOI `10.1249/mss.0b013e318149f111` confirmed via Crossref as MSSE 2007 Vol 39 pages 1867–1882 — all 4 fields match the catalog exactly. Crossref title is "The Female Athlete Triad" (abbreviated form of catalog title). Author surname not parseable from the 2007 Crossref record; accepted on vol+page+year+journal match.

---

## D4 — Books (no DOI expected)

| Key | Publisher | ISBN |
|---|---|---|
| `sims2016roar` | Rodale Books | 9781623366865 |
| `sims2022nextlevel` | Rodale Books | 9780593233153 |

Both correctly flagged as `[no-doi]` warnings (not failures) by `verify_refs.py`.

---

## Full per-entry pass/flag table

| Key | Status | DOI |
|---|---|---|
| `mcnulty2020` | ✓ resolved + surname ok | `10.1007/s40279-020-01319-3` |
| `elliottsale2020oc` | ✓ resolved + surname ok | `10.1007/s40279-020-01317-5` |
| `colensosemple2023` | ✓ resolved + surname ok | `10.3389/fspor.2023.1054542` |
| `elorduy2025` | ✓ resolved + surname ok | `10.3390/muscles4020015` |
| `meignie2021` | ✓ resolved + surname ok | `10.3389/fphys.2021.654585` |
| `wikstromfrisen2017` | ✓ resolved + surname ok | `10.23736/S0022-4707.16.05848-5` |
| `sung2014` | ✓ resolved + surname ok | `10.1186/2193-1801-3-668` |
| `kissow2022` | ✓ resolved + surname ok | `10.1007/s40279-022-01679-y` |
| `sakamaki2016` | ✓ resolved + surname ok | `10.1519/JSC.0000000000001250` |
| `ekberg2023` | ✓ resolved + surname ok | `10.1080/02701367.2023.2291473` |
| `oosthuyse2023` | ✓ resolved + surname ok | `10.1007/s00421-022-05090-3` |
| `mattu2020` | ✓ resolved + surname ok | `10.1111/sms.13590` |
| `issn2023female` | ✓ resolved + surname ok | `10.1080/15502783.2023.2204066` |
| `kuikman2023` | ✓ resolved + surname ok | `10.1249/mss.0000000000003056` |
| `smith2022supp` | ✓ resolved + surname ok | `10.3390/nu14050953` |
| `mountjoy2014` | ✓ resolved + surname ok | `10.1136/bjsports-2014-093502` |
| `mountjoy2018` | ✓ resolved + surname ok | `10.1136/bjsports-2018-099193` |
| `mountjoy2023` | ✓ resolved + surname ok | `10.1136/bjsports-2023-106994` |
| `loucks2011` | ✓ resolved + surname ok | `10.1080/02640414.2011.588958` |
| `heikura2018` | ✓ resolved + surname ok | `10.1123/ijsnem.2017-0313` |
| `carson2023` | ✓ resolved + surname ok | `10.1136/bjsports-2021-104083` |
| `desouza2010` | ✓ resolved + surname ok | `10.1093/humrep/dep411` |
| `bruinvels2016` | ✓ resolved + surname ok | `10.1371/journal.pone.0149881` |
| `oester2024` | ✓ resolved + surname ok | `10.1016/j.jsams.2024.02.012` |
| `ekenros2022` | ✓ resolved + surname ok | `10.3389/fphys.2022.954760` |
| `bruinvels2021strava` | ✓ resolved + surname ok | `10.1136/bjsports-2020-102792` |
| `bruinvels2022transitions` | ✓ resolved + surname ok | `10.1007/s40279-022-01691-2` |
| `antero2023` | ✓ resolved + surname ok | `10.3389/fphys.2023.1110526` |
| `martin2018` | ✓ resolved + surname ok | `10.1123/ijspp.2017-0330` |
| `creinin2004` | ✓ resolved + surname ok | `10.1016/j.contraception.2004.04.012` |
| `bull2019` | ✓ resolved + surname ok | `10.1038/s41746-019-0152-7` |
| `costello2014` | ✓ resolved + surname ok | `10.1080/17461391.2014.911354` |
| `cowley2021` | ✓ resolved + surname ok | `10.1123/wspaj.2021-0028` |
| `jansedejonge2019` | ✓ resolved + surname ok | `10.1249/mss.0000000000002073` |
| `elliottsale2021meth` | ✓ resolved + surname ok | `10.1007/s40279-021-01435-8` |
| `burden2021` | ✓ resolved + surname ok | `10.1113/EP089884` |
| `meignie2022` | ✓ resolved + surname ok | `10.1007/s00421-022-05014-1` |
| `hagstrom2021` | ✓ resolved + surname ok | `10.1007/s40279-020-01405-6` |
| `mujika2019` | ✓ resolved + surname ok | `10.1123/ijspp.2019-0514` |
| `isenmann2023` | ✓ resolved + surname ok | `10.1186/s12905-023-02671-y` |
| `svensen2025` | ✓ resolved + surname ok | `10.1249/MSS.0000000000003586` |
| `nattiv2007` | ✓ resolved (vol+pages+year+journal match; surname not parseable from 2007 record) | `10.1249/mss.0b013e318149f111` |
| `desouza2014fatc` | ✓ resolved + surname ok | `10.1097/jsm.0000000000000085` |
| `gibbs2013` | ✓ resolved + surname ok | `10.1249/mss.0b013e31827e1bdc` |
| `herzberg2017` | ✓ resolved + surname ok | `10.1177/2325967117718781` |
| `chidiogbolu2019` | ✓ resolved + surname ok | `10.3389/fphys.2018.01834` |
| `romeroparra2021` | ✓ resolved + surname ok | `10.1519/JSC.0000000000003878` |
| `carmichael2023sleep` | ⚠ UNRESOLVED | — see above |
| `carmichael2021nr` | ✓ resolved + surname ok *(journal corrected to IJERPH)* | `10.3390/ijerph18041667` |
| `mcnamara2022` | ⚠ UNRESOLVED | — see above |
| `nolan2024` | ✓ resolved + surname ok | `10.1007/s40279-023-01911-3` |
| `sung2022oc` | ✓ resolved + surname ok | `10.1186/s12905-022-01740-y` |
| `patterson2022bct` | ✓ resolved + surname ok | `10.1186/s12966-022-01319-8` |
| `hayman2021bct` | ✓ resolved + surname ok | `10.2196/23649` |
| `mlphase2025` | ✓ resolved + surname ok | `10.1038/s44294-025-00078-8` |
| `carmichael2021track` | ⚠ UNRESOLVED | — see above |
| `carmichael2025scoping` | ✓ resolved + surname ok | `10.1177/17479541251333888` |
| `flowingdata2025` | ✓ resolved + surname ok | `10.1093/oodh/oqaf011` |
| `lei2017` | ✓ resolved + surname ok | `10.1113/JP273176` |
| `tempreg2020` | ✓ resolved + surname ok | `10.1080/23328940.2020.1735927` |
| `schaumberg2017` | ✓ resolved + surname ok | `10.1016/j.jsams.2016.08.013` |
| `doroshuk2025` | ✓ resolved + surname ok | `10.1177/26884844251379415` |
| `burden2015iron` | ✓ resolved + surname ok | `10.1136/bjsports-2014-093624` |
| `sims2016roar` | ℹ book — no DOI | ISBN 9781623366865 |
| `sims2022nextlevel` | ℹ book — no DOI | ISBN 9780593233153 |

---

## D7 — Zotero import

**Status: pending user action.**

The `axis-catalog.rdf` file in `research/initial/` preserves the 15-collection hierarchy on import. To populate Zotero:

1. Supply `ZOTERO_API_KEY` and `ZOTERO_LIBRARY_ID` as environment variables.
2. Run `python scripts/setup_zotero.py` to create the 15 collections.
3. In Zotero desktop: **File → Import → `research/initial/axis-catalog.rdf`** (preserves collection membership). Do NOT use the `.ris` file — it does not carry collection membership.

Alternatively, after running `setup_zotero.py`, items can be added via the Zotero API using the resolved JSON as the source. The `scripts/setup_zotero.py` script is idempotent — re-running does not create duplicates.

**Credentials must come from environment variables only. Never hardcode.**
