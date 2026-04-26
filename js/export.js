// ═══════════════════════════════════════════
//  ACADEX EXPORT — Excel via SheetJS
// ═══════════════════════════════════════════

const Export = (() => {

  // ── Build flat header row array ───────────
  function buildHeaders(level) {
    const headers = ['No.', 'Name'];

    if (level === 'lower') {
      const subjects = CONFIG.subjects.lower;
      subjects.forEach(s => headers.push(`${s}_MID`, `${s}_END`));
      headers.push('TOTAL_MID', 'TOTAL_END', 'POSITION');
    } else {
      const subjects = CONFIG.subjects.upper;
      subjects.forEach(s => headers.push(`${s}_MID`, `${s}_MID_AGG`, `${s}_END`, `${s}_END_AGG`));
      headers.push('TOTAL_AGG_MID', 'TOTAL_AGG_END', 'DIV_MID', 'DIV_END');
    }

    headers.push('TEACHER_COMMENT', 'HT_COMMENT');
    return headers;
  }

  // ── Build one data row for a student ─────
  function buildRow(student, level, index) {
    const row = [index + 1, student.name];
    const m = student.marks || {};
    const c = student.calc || {};
    const cmt = student.comments || {};

    if (level === 'lower') {
      CONFIG.subjects.lower.forEach(s => {
        row.push(m[`${s}_MID`] ?? '', m[`${s}_END`] ?? '');
      });
      row.push(
        c.TOTAL_MID ?? '',
        c.TOTAL_END ?? '',
        student.position ?? ''
      );
    } else {
      CONFIG.subjects.upper.forEach(s => {
        row.push(
          m[`${s}_MID`]     ?? '',
          c[`${s}_MID_AGG`] ?? '',
          m[`${s}_END`]     ?? '',
          c[`${s}_END_AGG`] ?? ''
        );
      });
      row.push(
        c.TOTAL_AGG_MID ?? '',
        c.TOTAL_AGG_END ?? '',
        c.DIV_MID ?? '',
        c.DIV_END ?? ''
      );
    }

    row.push(cmt.teacher ?? '', cmt.ht ?? '');
    return row;
  }

  // ── Column widths ─────────────────────────
  function buildColWidths(level) {
    const widths = [
      { wch: 5 },   // No.
      { wch: 22 },  // Name
    ];
    const subjectCount = level === 'lower'
      ? CONFIG.subjects.lower.length
      : CONFIG.subjects.upper.length;
    const colsPerSubj = level === 'lower' ? 2 : 4;

    for (let i = 0; i < subjectCount * colsPerSubj; i++) {
      widths.push({ wch: level === 'lower' ? 9 : 10 });
    }

    if (level === 'lower') {
      widths.push({ wch: 11 }, { wch: 11 }, { wch: 9 }); // totals + position
    } else {
      widths.push({ wch: 13 }, { wch: 13 }, { wch: 9 }, { wch: 9 }); // aggs + divs
    }

    widths.push({ wch: 45 }, { wch: 45 }); // comments
    return widths;
  }

  // ── Main export function ──────────────────
  function exportClass(students, cls, term, year) {
    if (!window.XLSX) {
      UI.toast('SheetJS not loaded. Cannot export.', 'error');
      return;
    }

    const level = CONFIG.classLevel(cls);
    const headers = buildHeaders(level);
    const rows = [headers];
    students.forEach((s, i) => rows.push(buildRow(s, level, i)));

    // Create workbook + sheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = buildColWidths(level);

    // Style header row bold (SheetJS community = limited styling; we freeze pane)
    ws['!freeze'] = { xSplit: 2, ySplit: 1 };

    // Sheet & file names
    const sheetName = `${cls} Term${term} ${year}`;
    const fileName  = `${cls}_Assessment_Term${term}_${year}.xlsx`;

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, fileName);

    UI.toast(`Exported: ${fileName}`, 'success');
  }

  return { exportClass };
})();
