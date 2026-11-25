# AGENTS.md — Acadex (Primary Marks Entry & Results System)

This file defines the core architecture, academic rules, data standards, and standing instructions for AI agents working in this repository.

---

## 1. Standing Agent Rules (Mandatory)

1. **No Unsolicited Git Commits or Pushes:** Never run `git commit` or `git push` unless the user explicitly instructs you to do so.
2. **Clarify & Plan Before Changing Data or Marks:** Whenever ingesting marks, modifying grading/comment logic, or changing data structures:
   - Ask clarifying questions first (using the question tool when available) for any ambiguous names, overwritten marks, column mappings, or incomplete records.
   - Save a master plan in `temp/` (git-ignored) and wait for explicit approval before executing edits.
3. **100% Mark Accuracy & Row-Total Verification:**
   - Active school context: **`SUNLIGHT NURSERY AND PRIMARY SCHOOL`** (Kyebando).
   - Always verify transcribed subject marks against handwritten/source row totals. When the teacher's handwritten total/grade/division differs from the raw marks' arithmetic sum, trust and verify the raw subject marks and flag the discrepancy clearly—Acadex recalculates totals, grades, aggregates, divisions, and positions automatically.
   - Never fabricate missing marks: leave missing papers blank (`""`) and preserve incomplete students on the roster unless instructed otherwise.
4. **Verify After Every Edit:** Always run JS syntax checks, JSON schema/dash validation, and end-to-end Node logic verification after editing code or data.
5. **No Build Step / Pure Static Stack:** Keep the app zero-build, dependency-free Vanilla ES6+ JavaScript (`IIFE` modules loaded via `<script>` tags in `index.html`) plus SheetJS (`xlsx` CDN) for in-browser Excel export.

---

## 2. Project Architecture & File Map

```text
EXAM_ENTRANT/
├── AGENTS.md                        # Core agent instructions & project reference (this file)
├── README.md                        # Project overview & quickstart
├── index.html                       # Single-page entry point & script load order
├── styles.css                       # UI styles & grade/division badge color tokens
├── favicon.svg                      # App icon
├── .gitignore                       # Ignores /exports/ and /temp/
├── comments_p1p3.json               # Lower Primary (P1–P3) comment bank (400 entries)
├── comments_p4p6.json               # Upper Primary (P4–P7) comment bank (400 entries)
├── data/
│   └── term3_2026_sunlight.json     # Master auto-seed bundle (Term 3, 2026 P1–P6: 108 pupils)
├── exports/                         # Git-ignored roster JSONs (roster_P1.json .. roster_P7.json)
├── temp/                            # Git-ignored master plans & working notes
└── js/
    ├── config.js                    # Classes, subjects, Sunlight grading scale, division thresholds
    ├── comments.js                  # Comment bank loader, smart subject analyzer & division shuffler
    ├── logic.js                     # Pure mark parsing, aggregates, division lookup, tie-aware ranking
    ├── storage.js                   # localStorage persistence, seed loader, full JSON backup/restore
    ├── export.js                    # SheetJS (.xlsx) per-class workbook exporter
    ├── ui.js                        # DOM rendering (Setup, History, Roster, Marks Entry, Results)
    └── app.js                       # App controller, event handlers, bootstrap & backup actions
```

### Module Responsibilities & Script Order (`index.html`)
1. `js/config.js` (`CONFIG`) — Static academic configuration.
2. `js/comments.js` (`Comments`) — Loads `comments_p1p3.json` & `comments_p4p6.json`, analyzes weak/best subjects, and runs deterministic non-repeating Fisher-Yates shuffles per division/tier.
3. `js/logic.js` (`Logic`) — Pure calculation engine (`getGrade`, `getDivision`, `calcLower`, `calcUpper`, `rankStudents`, `processAll`, `classStats`).
4. `js/storage.js` (`Storage`) — Browser `localStorage` persistence, `applySeedBundle()`, `exportFullBackup()`, `importFullBackup()`.
5. `js/export.js` (`Export`) — Browser Excel export via `window.XLSX`.
6. `js/ui.js` (`UI`) — View rendering, drag-and-drop subject column / student row reordering, grouped smart comment dropdowns, and randomize/reset buttons.
7. `js/app.js` (`App`) — Bootstraps `Comments.loadBanks()` and `loadDefaultSeed(false)` on `DOMContentLoaded`, coordinates views and exports.

---

## 3. Academic Rules, Subjects & Sunlight Grading Scales (`js/config.js`)

### Class Levels & Subjects
- **Lower Primary (`P1`, `P2`, `P3`):** `CONFIG.classLevel(cls) === 'lower'`
  - Subjects (5): `ENG` (English), `MTC` (Mathematics), `LITI` (Literacy I), `LITII` (Literacy II), `RE` (Religious Education).
  - Max End-of-Term Total: **500** (5 × 100). Ranked descending by `TOTAL_END` (ties share rank).
  - *Incomplete rule:* If any of the 5 Mid or End marks is missing, `TOTAL_MID` or `TOTAL_END` is `null` (and `position` is `null` if End is incomplete).
- **Upper Primary (`P4`, `P5`, `P6`, `P7`):** `CONFIG.classLevel(cls) === 'upper'`
  - Core Subjects (4): `ENG` (English), `MTC` (Mathematics), `SCI` (Science), `SST` (Social Studies).
  - Ranked ascending by `TOTAL_AGG_END` (lowest aggregate = 1st; ties share rank).

### Sunlight Custom Grading Scale (`P4`–`P7`)
| Mark Range | Grade | Aggregate |
|---|---|---|
| `90 – 100` | `D1` | `1` |
| `80 – 89` | `D2` | `2` |
| `70 – 79` | `C3` | `3` |
| `60 – 69` | `C4` | `4` |
| `50 – 59` | `C5` | `5` |
| `44 – 49` | `C6` | `6` |
| `37 – 43` | `P7` | `7` |
| `30 – 36` | `P8` | `8` |
| `0 – 29` | `F9` | `9` |

### Upper Primary Division Thresholds (Total Aggregate of 4 Subjects)
| Total Aggregate | Division | Comment Tier Key (`comments_p4p6.json`) |
|---|---|---|
| `4 – 12` | `I` | `Division_I` |
| `13 – 24` | `II` | `Division_II` |
| `25 – 28` | `III` | `Division_III` |
| `29 – 32` | `IV` | `Division_IV` |
| `33 – 36` | `U` | `Division_U` |

### Lower Primary Performance Tiers (`TOTAL_END` out of 500, `comments_p1p3.json`)
| `TOTAL_END` Range | Tier Label |
|---|---|
| `450 – 500` | `Outstanding` |
| `401 – 449` | `Excellent` |
| `350 – 400` | `Good` |
| `250 – 349` | `Average` |
| `0 – 249` | `NeedsSupport` |

---

## 4. Comment Bank & Smart Comment System (`js/comments.js`)

### Bank Structure & Content Standards
Both `comments_p1p3.json` (root key `"lower"`) and `comments_p4p6.json` (root key `"upper"`) have 5 tiers, each containing:
- `teacher[tier]`: **40** unique general class teacher comments (200 total per file)
- `teacher_subject[tier]`: **15** unique subject-aware templates (75 total per file)
- `ht[tier]`: **20** unique general headteacher comments (100 total per file)
- `ht_subject[tier]`: **5** unique subject-aware templates (25 total per file)
- **Grand Total:** **400** entries per file (**800** across both files).

**Strict Writing Rules:**
- **Zero em dashes (`—`) or en dashes (`–`)** anywhere in any comment string.
- Natural primary school report-card tone (warm encouragement + concrete revision/neatness/holiday study advice), avoiding repetitive AI phrasing.
- In `comments_p4p6.json`, maintain a natural mix: some comments explicitly name the division (`Division I`..`Division U`), while others address the performance level directly.
- Subject templates must use only `{weak_subject}`, `{weak_subjects}`, and `{best_subject}`.

### Smart Subject Analysis (`Comments.analyzeStudentSubjects(marks, level)`)
- **All-Poor Safeguard (`allPoor = true`):** Triggered if `< 58` in **3+ of 4 subjects** (Upper Primary) or **4+ of 5 subjects** (Lower Primary), or if the student's best mark is `< 55`. These students receive **100% general comments**, and subject-singling templates are hidden from their dropdown.
- **Specific Weak Subject(s):** When not `allPoor`, a subject qualifies as weak if it is **below 60%** OR lags **at least 12 marks** behind the mean of the student's other subjects (and is at least **8 marks** below their highest mark). Up to 2 weak subjects are combined (`"Mathematics and Science"`).
- **Balanced Students:** If no subject meets the weak threshold, `hasWeakSubject = false` and the student receives **100% general comments** (subject templates hidden in dropdown).

### Division-Locked Non-Repeating Shuffle (`Comments.assignClassComments`)
- Every student strictly receives comments from their current division/tier.
- Uses a Mulberry32 PRNG + Fisher-Yates shuffle seeded by `cls + term + year + tier + role + shuffleSeed` so classmates in the same division do not receive duplicate comments until the pool is exhausted.
- Among students with 1–2 specific weak subjects, assigns a **~50% / 50% mix** of subject-focused and general comments.
- Moving a student to a different division/tier on mark edit automatically refreshes their comments to the new division.
- Results view provides **`🎲 Randomize Comments`** (increments `commentSeed`, preserves manual edits) and **`↺ Reset Manual Edits`**.

---

## 5. Persistence & Data Schema (`js/storage.js`)

### `localStorage` Keys
| Key | Contents |
|---|---|
| `acadex_session` | Active `{ school, cls, term, year }` |
| `acadex_session_history` | Array of saved/opened session objects sorted by `lastOpenedAt` |
| `acadex_applied_seed` | `seedId` of last auto-loaded bundle (prevents overwriting user edits) |
| `acadex_roster_${cls}` | Array of `{ id, name, cls }` |
| `acadex_marks_${cls}_T${term}_${year}` | `{ [studentId]: { SUBJ_MID, SUBJ_END, ... } }` |
| `acadex_comments_${cls}_T${term}_${year}` | `{ [studentId]: { teacher, ht, tier, sig, manualTeacher, manualHt } }` |
| `acadex_comment_seed_${cls}_T${term}_${year}` | Integer shuffle seed for Results view |
| `acadex_subject_order_${cls}_T${term}_${year}` | Custom dragged subject column order |

### Seed & Backup Bundle (`data/term3_2026_sunlight.json`)
- Loaded once on first startup via `App.init()` → `loadDefaultSeed(false)`.
- Can be re-applied via **Setup → `↺ Reload Term 3, 2026 Seed`**.
- Full `localStorage` snapshots can be exported/restored anytime via **Setup → `⬇ Export Full Backup (JSON)` / `⬆ Import Backup (JSON)`**.

---

## 6. Data Ingestion & Reconciliation SOP (Sunlight Sheets)

When transcribing new physical/scanned performance sheets or spreadsheets:
1. **Confirm Ambiguities Before Writing:** Use the question tool to resolve unclear handwriting, overwritten cells, duplicate rows, or alternate student spellings.
2. **Known Term 3, 2026 Precedents (already applied in `data/term3_2026_sunlight.json`):**
   - **P1 Mid-Term Column Mapping:** Physical sheet columns `LIT` → `LITI_MID`, `READING` → `LITII_MID`, `R.E` → `RE_MID`.
   - **P2 Pupil Merge:** `Kyetelekela Scovia` (Mid) and `Sumayiya Scovia` (EOT) were reconciled into one record: `KYETELEKELA SUMAYIYA SCOVIA`.
   - **P4 Duplicate Removal:** Dropped duplicate incomplete `NASASIRA ERINA` row from EOT Excel, retaining her complete record (`ENG 80, MTC 69, SCI 70, SST 81`).
   - **Partial / Single-Exam Students:** Retained on roster with missing papers left blank (`""`) so Mid-Term or partial marks are preserved without fabricating End-of-Term results.
3. **Update Both Seed & Roster Files:** Keep `data/term3_2026_sunlight.json` and `exports/roster_P*.json` synchronized, preserving existing `stu_*` IDs for returning pupils.

---

## 7. Common Commands & Verification Checklist

### Run the App Locally
`fetch()` requires HTTP (opening `index.html` via `file://` will fail to load JSON banks/seed data):
```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

### Validate JS Syntax & Comment Banks (Run After Any Edit)
```bash
node -c js/config.js && node -c js/logic.js && node -c js/comments.js && \
node -c js/storage.js && node -c js/export.js && node -c js/ui.js && node -c js/app.js && \
python3 -c '
import json
for fn, root, tiers in [
    ("comments_p4p6.json", "upper", ["Division_I","Division_II","Division_III","Division_IV","Division_U"]),
    ("comments_p1p3.json", "lower", ["Outstanding","Excellent","Good","Average","NeedsSupport"]),
]:
    data = json.load(open(fn))
    raw = json.dumps(data, ensure_ascii=False)
    assert "—" not in raw and "–" not in raw, f"Dash found in {fn}"
    b = data[root]
    for t in tiers:
        assert len(b["teacher"][t]) == 40 and len(set(b["teacher"][t])) == 40
        assert len(b["teacher_subject"][t]) == 15 and len(set(b["teacher_subject"][t])) == 15
        assert len(b["ht"][t]) == 20 and len(set(b["ht"][t])) == 20
        assert len(b["ht_subject"][t]) == 5 and len(set(b["ht_subject"][t])) == 5
print("Comment banks OK (800 unique entries, 0 dashes)")
'
```

### Validate Seed Bundle Totals & Roster Counts
```bash
python3 -c '
import json
b = json.load(open("data/term3_2026_sunlight.json"))
for cls, cdata in b["classes"].items():
    r_ids = {s["id"] for s in cdata["roster"]}
    assert len(r_ids) == len(cdata["roster"]), f"Duplicate IDs in {cls}"
    assert set(cdata["marks"].keys()) <= r_ids, f"Orphan marks in {cls}"
    print(f"{cls}: {len(cdata[\"roster\"])} pupils")
'
```

### Generate & Verify Styled Excel Verification Sheets
To regenerate all styled Excel workbooks (`Sunlight_Term3_2026_All_Classes.xlsx` + `P1`–`P6` individual files) into `~/Downloads/Sunlight_Sheets/`:
```bash
python3 /home/gideon/.gemini/antigravity-cli/brain/499a5e1e-379e-4fec-89e4-e245ca94496b/scratch/generate_sunlight_excel.py
```
*(Or use the `Export Excel` button inside Acadex's Results view for single-class SheetJS `.xlsx` exports.)*
