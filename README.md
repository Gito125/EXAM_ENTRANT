# Acadex

> A simple browser-based marks entry and results app for primary schools, built for fast class setup, score calculation, comments, and Excel export.

---

## Overview

Acadex is a lightweight front-end application for managing primary school assessment data in the browser. It lets a teacher set up a session, maintain a class roster, enter marks for P1 to P6, and view calculated results immediately.

The app keeps data locally in `localStorage`, so it works without a backend. It also loads reusable teacher and headteacher comment banks from JSON files and can export a class report to Excel.

## Tech Stack

- **Language:** JavaScript, HTML, CSS
- **Key Libraries:** SheetJS (`xlsx`) for Excel export
- **Platform:** Browser-based, runs on Linux or any modern desktop browser
- **Storage:** `localStorage` for session, roster, marks, and comments

---

## Project Structure

```text
EXAM_ENTRANT/
├── index.html
├── styles.css
├── comments_p1p3.json
├── comments_p4p6.json
├── favicon.svg
├── exports/
└── js/
    ├── app.js
    ├── comments.js
    ├── config.js
    ├── export.js
    ├── logic.js
    ├── storage.js
    └── ui.js
```

## Getting Started

### Prerequisites

- A modern browser such as Chrome, Edge, or Firefox
- A local web server to serve the files, so the JSON comment banks load correctly

### Run the App

From the project root:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

### Usage

1. Open the app and complete the session setup.
2. Add students to the class roster.
3. Enter marks in the marks entry table.
4. Review the calculated totals, grades, divisions, and positions.
5. Add or adjust teacher and headteacher comments.
6. Export the full class report to Excel.

## How It Works

The app is organized as a small front-end module system:

- `app.js` controls navigation, session state, and actions.
- `storage.js` reads and writes session data, roster data, marks, and comments.
- `logic.js` performs mark parsing, totals, grades, divisions, and ranking.
- `comments.js` loads comment banks and provides suggestions based on performance tiers.
- `ui.js` renders the views and keeps the interface responsive to input changes.
- `export.js` builds the Excel workbook using SheetJS.

Lower primary classes use subject totals and ranking by end marks. Upper primary classes use aggregate grades and divisions based on total aggregates.

## Configuration

The grading rules, class groups, subject lists, and division thresholds live in `js/config.js`.

| Item | Location | Purpose |
|---|---|---|
| Classes | `CONFIG.classes` | Supported class levels from P1 to P6 |
| Subjects | `CONFIG.subjects` | Subject sets for lower and upper primary |
| Grading | `CONFIG.gradingScale` | Converts marks to grades and aggregates |
| Divisions | `CONFIG.divisionScale` | Converts aggregate totals to divisions |
| Terms | `CONFIG.terms` | Session term options |

## Output

- Session data, roster, marks, and comments are stored locally in the browser.
- Excel exports are written as `.xlsx` files with the class, term, and year in the filename.
- Generated files can be kept in the `exports/` folder if you want a place to collect downloads manually.

## Limitations

- There is no backend or user authentication.
- Data stays on the device and browser profile where it was entered.
- Comment suggestions depend on the bundled JSON files being available.
- Excel export depends on the SheetJS CDN being reachable.

## License

No license file is included yet.