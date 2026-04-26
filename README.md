# Acadex

> A fast, browser-based marks entry and results app for primary schools. Enter marks, calculate grades, assign positions, add comments, and export to Excel — all without a backend.

![HTML5][Badge-HTML5] ![JavaScript][Badge-JS] ![No Backend][Badge-NoBackend]

---

## Overview

Acadex is a lightweight single-page application for managing primary school assessment data entirely in the browser. Teachers can quickly set up a session, maintain a class roster, enter marks for students across multiple subjects, and view calculated results including totals, grades, divisions, and class positions.

**No server required** — all data persists in `localStorage`. The app loads reusable comment banks from JSON files and produces Excel reports ready for printing or further editing.

---

## Features

- **Session Setup** — Configure school, class level (P1–P6), term, and year
- **Roster Management** — Add, remove, rename, reorder, import/export students
- **Marks Entry** — Enter scores for each subject with live calculation
- **Auto-Calculation** — Subject totals, aggregates, grades (D1–F9), divisions (I–U), and class positions
- **Comment Banks** — Teacher and headteacher comments with performance-based suggestions
- **Excel Export** — Full class reports as `.xlsx` files
- **Session History** — Quick access to previous sessions

---

## Tech Stack

| Component | Technology |
|---|---|
| UI | HTML5, CSS3 |
| Logic | Vanilla JavaScript (ES6+) |
| Excel Export | [SheetJS (xlsx)](https://sheetjs.com/) |
| Storage | Browser `localStorage` |
| CDN | cdnjs (SheetJS library) |

---

## Project Structure

```
EXAM_ENTRANT/
├── index.html              # Main HTML entry point
├── styles.css             # Application styles
├── favicon.svg           # App icon
├── comments_p1p3.json    # Comment bank for P1–P3
├── comments_p4p6.json    # Comment bank for P4–P6
├── exports/              # Downloaded Excel files (optional)
└── js/
    ├── app.js           # Main controller & navigation
    ├── config.js      # Subjects, grading, division rules
    ├── comments.js   # Comment bank loader & suggestions
    ├── logic.js      # Mark calculation & ranking
    ├── storage.js    # localStorage read/write
    ├── export.js     # Excel workbook builder
    └── ui.js         # View rendering & DOM updates
```

---

## Getting Started

### 1. Serve the files

Because the app loads JSON comment banks, you need a local web server:

```bash
# Python 3
python3 -m http.server 8000

# OR Node.js
npx serve .
```

### 2. Open in browser

```
http://localhost:8000
```

### 3. Use the app

1. **Setup** — Enter school name, select class (P1–P6), term, and year
2. **Roster** — Add students by name
3. **Marks Entry** — Enter marks for each subject; totals and positions update live
4. **Results** — Review grades, divisions, and positions
5. **Comments** — Add teacher and headteacher comments
6. **Export** — Download the class report as `.xlsx`

---

## How It Works

### Lower Primary (P1–P3)

- **Subjects:** English, Mathematics, Literacy I, Literacy II, Religious Education
- **Calculation:** Subject totals summed to `TOTAL_END`
- **Ranking:** By end-of-term marks
- **Comments:** Tiers based on `TOTAL_END` ranges

### Upper Primary (P4–P6)

- **Subjects:** English, Mathematics, Science, Social Studies
- **Calculation:** Each subject scored 0–100 and converted to grade (D1–F9); grades become aggregates (1–9); aggregates summed to `TOTAL_AGG`
- **Grading:** D1 (90–100) through F9 (0–29)
- **Divisions:** I (≤12), II (≤24), III (≤30), IV (≤33), U (34+)
- **Comments:** Based on aggregate performance

### Data Flow

1. **Session** → Saved to localStorage on setup
2. **Roster** → Student names and IDs persist per class
3. **Marks** → Entered per subject, calculated on input, queued to buffer
4. **Save** → Buffer flushed to localStorage
5. **Export** → SheetJS builds an Excel workbook from current data

---

## Configuration

Edit `js/config.js` to customize:

```javascript
classes: ['P1','P2','P3','P4','P5','P6'],    // Supported class levels
subjects: { lower: [...], upper: [...] }, // Subject lists
gradingScale: [...],  // Mark-to-grade mappings
divisionScale: [...], // Aggregate-to-division thresholds
terms: [1, 2, 3],    // Available terms
```

---

## Limitations

- No user authentication — data lives in the browser profile
- No cloud sync — manual export for backup
- JSON comment banks must be served alongside the app
- Excel export requires internet for SheetJS CDN

---

## Browser Compatibility

Chrome · Edge · Firefox · Safari  
(Any modern browser with ES6 and localStorage support)

---

## License

MIT License — free to use and modify.

[Badge-HTML5]: https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white
[Badge-JS]: https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=333
[Badge-NoBackend]: https://img.shields.io/badge/No_Backend-yes-27ae60?style=flat