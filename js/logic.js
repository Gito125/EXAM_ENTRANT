// ═══════════════════════════════════════════
//  ACADEX LOGIC — Grading, Totals, Ranking
// ═══════════════════════════════════════════

const Logic = (() => {

  // ── Grade lookup (P4–P6) ─────────────────
  function getGrade(mark) {
    const m = Number(mark);
    if (isNaN(m) || mark === '' || mark === null) return null;
    for (const row of CONFIG.gradingScale) {
      if (m >= row.min && m <= row.max) return row;
    }
    return null;
  }

  // ── Division lookup (P4–P6) ──────────────
  function getDivision(totalAgg) {
    if (totalAgg === null || totalAgg === undefined) return null;
    for (const row of CONFIG.divisionScale) {
      if (totalAgg <= row.max) return row.div;
    }
    return 'U';
  }

  // ── Parse mark safely ────────────────────
  function parseMark(val) {
    if (val === '' || val === null || val === undefined) return null;
    const n = Number(val);
    return (!isNaN(n) && n >= 0 && n <= 100) ? n : null;
  }

  // ── Calculate one student (lower P1–P3) ──
  function calcLower(studentMarks) {
    const subjects = CONFIG.subjects.lower;
    let totalMid = 0, totalEnd = 0;
    let midComplete = true, endComplete = true;

    for (const subj of subjects) {
      const mid = parseMark(studentMarks[`${subj}_MID`]);
      const end = parseMark(studentMarks[`${subj}_END`]);
      if (mid === null) midComplete = false; else totalMid += mid;
      if (end === null) endComplete = false; else totalEnd += end;
    }

    return {
      TOTAL_MID: midComplete ? totalMid : null,
      TOTAL_END: endComplete ? totalEnd : null,
    };
  }

  // ── Calculate one student (upper P4–P6) ──
  function calcUpper(studentMarks) {
    const subjects = CONFIG.subjects.upper;
    let aggMid = 0, aggEnd = 0;
    let midComplete = true, endComplete = true;
    const grades = {};

    for (const subj of subjects) {
      const mid = parseMark(studentMarks[`${subj}_MID`]);
      const end = parseMark(studentMarks[`${subj}_END`]);

      const midGrade = mid !== null ? getGrade(mid) : null;
      const endGrade = end !== null ? getGrade(end) : null;

      grades[`${subj}_MID_AGG`] = midGrade ? midGrade.grade : null;
      grades[`${subj}_END_AGG`] = endGrade ? endGrade.grade : null;

      if (mid === null || !midGrade) midComplete = false;
      else aggMid += midGrade.agg;

      if (end === null || !endGrade) endComplete = false;
      else aggEnd += endGrade.agg;
    }

    return {
      ...grades,
      TOTAL_AGG_MID: midComplete ? aggMid : null,
      TOTAL_AGG_END: endComplete ? aggEnd : null,
      DIV_MID: midComplete ? getDivision(aggMid) : null,
      DIV_END: endComplete ? getDivision(aggEnd) : null,
    };
  }

  // ── Rank all students in a class ─────────
  // Lower: highest TOTAL_END = 1st (ties share rank)
  // Upper: lowest TOTAL_AGG_END = 1st (ties share rank)
  function rankStudents(students, level) {
    const key = level === 'lower' ? 'TOTAL_END' : 'TOTAL_AGG_END';
    const direction = level === 'lower' ? -1 : 1; // lower: desc; upper: asc

    // Separate those with scores vs incomplete
    const scored = students.filter(s => s.calc && s.calc[key] !== null && s.calc[key] !== undefined);
    const unscored = students.filter(s => !s.calc || s.calc[key] === null || s.calc[key] === undefined);

    // Sort
    scored.sort((a, b) => direction * (a.calc[key] - b.calc[key]));

    // Assign positions with ties
    let rank = 1;
    for (let i = 0; i < scored.length; i++) {
      if (i > 0 && scored[i].calc[key] === scored[i - 1].calc[key]) {
        scored[i].position = scored[i - 1].position; // tie
      } else {
        scored[i].position = rank;
      }
      rank++;
    }
    unscored.forEach(s => s.position = null);

    return [...scored, ...unscored];
  }

  // ── Compute all students in a dataset ────
  function processAll(students, level) {
    const processed = students.map(s => {
      const calc = level === 'lower' ? calcLower(s.marks) : calcUpper(s.marks);
      return { ...s, calc };
    });
    return rankStudents(processed, level);
  }

  // ── Stats summary for results view ───────
  function classStats(students, level) {
    const complete = students.filter(s => s.position !== null);
    if (!complete.length) return null;

    if (level === 'lower') {
      const totals = complete.map(s => s.calc.TOTAL_END);
      return {
        total: students.length,
        complete: complete.length,
        highest: Math.max(...totals),
        lowest: Math.min(...totals),
        average: (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1),
      };
    } else {
      const divCount = { I: 0, II: 0, III: 0, IV: 0, U: 0 };
      complete.forEach(s => {
        const d = s.calc.DIV_END;
        if (d && divCount[d] !== undefined) divCount[d]++;
      });
      return {
        total: students.length,
        complete: complete.length,
        divCount,
        bestAgg: Math.min(...complete.map(s => s.calc.TOTAL_AGG_END)),
      };
    }
  }

  return { getGrade, getDivision, parseMark, calcLower, calcUpper, rankStudents, processAll, classStats };
})();
