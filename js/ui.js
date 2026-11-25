// ═══════════════════════════════════════════
//  ACADEX UI — Render Engine
// ═══════════════════════════════════════════

const UI = (() => {

  const main    = () => document.getElementById('app-main');
  const ctxBar  = () => document.getElementById('context-bar');

  // ── Toast ────────────────────────────────
  let toastTimer;
  function toast(msg, type = 'info') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast toast-${type} show`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }

  // ── Context bar ──────────────────────────
  function renderContextBar(session) {
    const bar = ctxBar();
    if (!session) { bar.classList.add('hidden'); return; }
    bar.classList.remove('hidden');
    bar.innerHTML = `
      <div class="ctx-item"><span class="ctx-label">School:</span><span class="ctx-val">${session.school}</span></div>
      <div class="ctx-item"><span class="ctx-label">Class:</span><span class="ctx-val">${session.cls}</span></div>
      <div class="ctx-item"><span class="ctx-label">Term:</span><span class="ctx-val">${session.term}</span></div>
      <div class="ctx-item"><span class="ctx-label">Year:</span><span class="ctx-val">${session.year}</span></div>
      <span class="ctx-change" onclick="App.goTo('setup')">Change →</span>
    `;
  }

  // ── Nav active state ─────────────────────
  function setNavActive(view) {
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.view === view);
    });
  }

  // ══════════════════════════════════════════
  //  SETUP VIEW
  // ══════════════════════════════════════════
  function renderSetup(session = {}, history = []) {
    session = session || {};
    const recent = Array.isArray(history) ? history.slice(0, 8) : [];

    const termOpts = CONFIG.terms.map(t =>
      `<option value="${t}" ${session.term == t ? 'selected' : ''}>Term ${t}</option>`
    ).join('');
    const clsOpts = CONFIG.classes.map(c =>
      `<option value="${c}" ${session.cls === c ? 'selected' : ''}>${c}</option>`
    ).join('');

    const recentRows = recent.map(item => `
      <tr>
        <td style="white-space:nowrap;font-weight:600">${item.cls}</td>
        <td>Term ${item.term} • ${item.year}</td>
        <td>${escHtml(item.school)}</td>
        <td style="white-space:nowrap">${formatTime(item.lastOpenedAt || item.lastSavedAt || item.createdAt)}</td>
        <td style="text-align:right;white-space:nowrap">
          <button class="btn btn-xs btn-secondary" onclick="App.loadHistorySession('${item.id}','setup')">Setup</button>
          <button class="btn btn-xs btn-primary" onclick="App.loadHistorySession('${item.id}','entry')">Marks →</button>
          <button class="btn btn-xs btn-success" onclick="App.loadHistorySession('${item.id}','results')">Results →</button>
        </td>
      </tr>
    `).join('');

    main().innerHTML = `
      <div class="card setup-card">
        <div class="card-title">Session Setup</div>
        <div class="form-grid">
          <div class="form-group" style="grid-column:1/-1">
            <label>School Name</label>
            <input type="text" id="inp-school" placeholder="e.g. SUNLIGHT NURSERY AND PRIMARY SCHOOL"
              value="${escHtml(session.school || '')}">
          </div>
          <div class="form-group">
            <label>Class</label>
            <select id="inp-cls">${clsOpts}</select>
          </div>
          <div class="form-group">
            <label>Term</label>
            <select id="inp-term">${termOpts}</select>
          </div>
          <div class="form-group">
            <label>Year</label>
            <input type="number" id="inp-year" placeholder="e.g. 2026"
              value="${session.year || new Date().getFullYear()}" min="2020" max="2050">
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" onclick="App.saveSession()">Save & Continue →</button>
          <button class="btn btn-secondary" onclick="App.goTo('history')">View Full History</button>
        </div>
      </div>

      <div class="card setup-card mt-2">
        <div class="section-title">Data Backup & Term 3, 2026 Seed</div>
        <p class="entry-note" style="margin-bottom:.75rem">Export all rosters, marks, comments, and sessions as a single JSON backup, or restore from a saved JSON file.</p>
        <div class="roster-controls" style="margin-bottom:0">
          <button class="btn btn-secondary btn-sm" onclick="App.exportFullBackup()">⬇ Export Full Backup (JSON)</button>
          <button class="btn btn-secondary btn-sm" onclick="App.importFullBackup()">⬆ Import Backup (JSON)</button>
          <button class="btn btn-secondary btn-sm" onclick="App.reloadDefaultSeed()">↺ Reload Term 3, 2026 Seed</button>
        </div>
      </div>

      ${recent.length ? `
      <div class="card mt-2">
        <div class="section-title">Recent Sessions</div>
        <div class="marks-wrap">
          <table class="roster-table setup-history-table">
            <thead>
              <tr><th>Class</th><th>Term / Year</th><th>School</th><th>Last Opened</th><th></th></tr>
            </thead>
            <tbody>${recentRows}</tbody>
          </table>
        </div>
      </div>
      ` : ''}
    `;
  }

  function renderHistory(history = [], session = null) {
    if (!Array.isArray(history) || !history.length) {
      main().innerHTML = `
        <div class="card">
          <div class="section-title">Session History</div>
          <div class="empty-state">
            <div class="empty-icon">🕘</div>
            <h3>No history yet</h3>
            <p>Saved setup sessions will appear here for quick reuse.</p>
            <button class="btn btn-primary" onclick="App.goTo('setup')">Back to Setup</button>
          </div>
        </div>
      `;
      return;
    }

    const groups = history.reduce((acc, item) => {
      const key = item.cls;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    const classOrder = Object.keys(groups).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));

    const sections = classOrder.map(cls => {
      const rows = groups[cls].map(item => `
        <tr>
          <td style="white-space:nowrap;font-weight:600">Term ${item.term}</td>
          <td style="white-space:nowrap">${item.year}</td>
          <td>${escHtml(item.school)}</td>
          <td style="white-space:nowrap">${formatTime(item.lastOpenedAt || item.lastSavedAt || item.createdAt)}</td>
          <td style="text-align:right;white-space:nowrap">
            <button class="btn btn-xs btn-secondary" onclick="App.loadHistorySession('${item.id}','setup')">Load into Setup</button>
            <button class="btn btn-xs btn-primary" onclick="App.loadHistorySession('${item.id}','entry')">Marks →</button>
            <button class="btn btn-xs btn-success" onclick="App.loadHistorySession('${item.id}','results')">Results →</button>
          </td>
        </tr>
      `).join('');

      return `
        <div class="card mt-2">
          <div class="section-title">${cls} Sessions</div>
          <div class="marks-wrap">
            <table class="roster-table history-table">
              <thead>
                <tr><th>Term</th><th>Year</th><th>School</th><th>Last Opened</th><th></th></tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      `;
    }).join('');

    const currentPill = session
      ? `<span class="badge badge-pos" style="margin-left:.5rem">Current: ${session.cls} T${session.term} ${session.year}</span>`
      : '';

    main().innerHTML = `
      <div class="card">
        <div class="table-toolbar">
          <div><strong>Session History</strong>${currentPill}</div>
          <div class="toolbar-right">
            <button class="btn btn-secondary btn-sm" onclick="App.goTo('setup')">Back to Setup</button>
          </div>
        </div>
        <p class="entry-note">Select any saved context to prefill setup and continue working from prior classes.</p>
      </div>
      ${sections}
    `;
  }

  // ══════════════════════════════════════════
  //  ROSTER VIEW
  // ══════════════════════════════════════════
  function renderRoster(session, roster) {
    const rows = roster.map((s, i) => `
      <tr>
        <td style="color:var(--text-3);text-align:center">${i + 1}</td>
        <td id="name-cell-${s.id}">${s.name}</td>
        <td style="text-align:right">
          <button class="btn btn-xs btn-secondary" onclick="App.renameStudent('${s.id}')">Rename</button>
          <button class="btn btn-xs btn-danger" onclick="App.removeStudent('${s.id}')">Remove</button>
        </td>
      </tr>
    `).join('');

    main().innerHTML = `
      <div class="card">
        <div class="section-title">Class Roster — <span>${session.cls}</span></div>
        <div class="roster-input-row">
          <input type="text" id="inp-new-student" placeholder="Student full name" 
            onkeydown="if(event.key==='Enter') App.addStudent()">
          <button class="btn btn-primary" onclick="App.addStudent()">+ Add Student</button>
        </div>
        <div class="roster-controls">
          <button class="btn btn-secondary btn-sm" onclick="App.importRoster()">Import JSON</button>
          <button class="btn btn-secondary btn-sm" onclick="App.exportRoster()">Export JSON</button>
          <span class="roster-count">${roster.length} student${roster.length !== 1 ? 's' : ''}</span>
        </div>
        ${roster.length > 0 ? `
          <table class="roster-table">
            <thead><tr><th style="width:44px">#</th><th>Name</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        ` : `
          <div class="empty-state">
            <div class="empty-icon">👥</div>
            <h3>No students yet</h3>
            <p>Add student names above to build the class roster.</p>
          </div>
        `}
        ${roster.length > 0 ? `
          <div class="form-actions">
            <button class="btn btn-primary" onclick="App.goTo('entry')">Go to Marks Entry →</button>
          </div>
        ` : ''}
      </div>
    `;
    const inp = document.getElementById('inp-new-student');
    if (inp) inp.focus();
  }

  // ══════════════════════════════════════════
  //  MARKS ENTRY VIEW
  // ══════════════════════════════════════════
  function renderEntry(session, students, marksMap, subjectOrder) {
    const { cls, term, year } = session;
    const level = CONFIG.classLevel(cls);
    const subjects = Array.isArray(subjectOrder) && subjectOrder.length
      ? subjectOrder
      : (level === 'lower' ? CONFIG.subjects.lower : CONFIG.subjects.upper);

    if (!students.length) {
      main().innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h3>No students in roster</h3>
          <p>Set up your class roster first before entering marks.</p>
          <button class="btn btn-primary" onclick="App.goTo('roster')">Go to Roster</button>
        </div>`;
      return;
    }

    // Build header cells
    let headerCells = '';
    if (level === 'lower') {
      subjects.forEach(s => {
        headerCells += `<th class="subject-col" draggable="true" data-subject="${s}">${s}_MID</th><th class="subject-col" draggable="true" data-subject="${s}">${s}_END</th>`;
      });
      headerCells += `<th>TOTAL_MID</th><th>TOTAL_END</th><th>POSITION</th>`;
    } else {
      subjects.forEach(s => {
        headerCells += `<th class="subject-col" draggable="true" data-subject="${s}">${s}_MID</th><th>${s}_MID_AGG</th><th class="subject-col" draggable="true" data-subject="${s}">${s}_END</th><th>${s}_END_AGG</th>`;
      });
      headerCells += `<th>TOTAL_AGG_MID</th><th>TOTAL_AGG_END</th><th>DIV_MID</th><th>DIV_END</th>`;
    }
    headerCells += `<th>Action</th>`;

    // Build student rows
    const bodyRows = students.map((s, i) => {
      const m = marksMap[s.id] || {};
      return buildEntryRow(s, i, m, level, subjects);
    }).join('');

    main().innerHTML = `
      <div class="card" style="padding:1rem">
        <div class="table-toolbar">
          <div>
            <strong>${cls}</strong>
            <span class="text-muted"> — Term ${term}, ${year} &nbsp;|&nbsp; ${students.length} students</span>
          </div>
          <div class="toolbar-right">
            <button class="btn btn-secondary btn-sm" onclick="App.resetEntrySubjectOrder()" title="Restore the default subject order">↺ Reset Order</button>
            <button class="btn btn-secondary btn-sm" onclick="App.clearClassMarks()" title="Clear all marks for this class/term">🗑 Clear All</button>
            <button class="btn btn-success btn-sm" onclick="App.saveAllMarks()">💾 Save All</button>
            <button class="btn btn-primary btn-sm" onclick="App.goTo('results')">View Results →</button>
          </div>
        </div>
        <p class="entry-note">Marks are auto-calculated as you type. Drag the subject headers to reorder the entry columns. Orange left border = unsaved row.</p>
        <div class="marks-wrap">
          <table class="marks-table" id="marks-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Name</th>
                ${headerCells}
              </tr>
            </thead>
            <tbody id="marks-tbody">
              ${bodyRows}
            </tbody>
          </table>
        </div>
      </div>
    `;
    bindEntryColumnReorder(subjects);
    bindEntryRowReorder();
  }

  function buildEntryRow(student, index, marks, level, subjects) {
    let cells = '';

    if (level === 'lower') {
      subjects.forEach(s => {
        const midVal = marks[`${s}_MID`] ?? '';
        const endVal = marks[`${s}_END`] ?? '';
        cells += `
          <td><input class="mark-input" type="number" min="0" max="100"
            data-sid="${student.id}" data-field="${s}_MID" value="${midVal}"
            oninput="App.onMarkInput(this)" onblur="App.validateInput(this)"></td>
          <td><input class="mark-input" type="number" min="0" max="100"
            data-sid="${student.id}" data-field="${s}_END" value="${endVal}"
            oninput="App.onMarkInput(this)" onblur="App.validateInput(this)"></td>
        `;
      });
      // Calc cells — will be filled by recalcRow
      cells += `
        <td class="calc-cell total" id="calc-${student.id}-TOTAL_MID">—</td>
        <td class="calc-cell total" id="calc-${student.id}-TOTAL_END">—</td>
        <td class="calc-cell" id="calc-${student.id}-POSITION">—</td>
      `;
    } else {
      subjects.forEach(s => {
        const midVal = marks[`${s}_MID`] ?? '';
        const endVal = marks[`${s}_END`] ?? '';
        cells += `
          <td><input class="mark-input" type="number" min="0" max="100"
            data-sid="${student.id}" data-field="${s}_MID" value="${midVal}"
            oninput="App.onMarkInput(this)" onblur="App.validateInput(this)"></td>
          <td class="calc-cell" id="calc-${student.id}-${s}_MID_AGG">—</td>
          <td><input class="mark-input" type="number" min="0" max="100"
            data-sid="${student.id}" data-field="${s}_END" value="${endVal}"
            oninput="App.onMarkInput(this)" onblur="App.validateInput(this)"></td>
          <td class="calc-cell" id="calc-${student.id}-${s}_END_AGG">—</td>
        `;
      });
      cells += `
        <td class="calc-cell total" id="calc-${student.id}-TOTAL_AGG_MID">—</td>
        <td class="calc-cell total" id="calc-${student.id}-TOTAL_AGG_END">—</td>
        <td class="calc-cell" id="calc-${student.id}-DIV_MID">—</td>
        <td class="calc-cell" id="calc-${student.id}-DIV_END">—</td>
      `;
    }

    cells += `
      <td>
        <button class="btn btn-xs btn-secondary" onclick="App.saveStudentMarks('${student.id}')">💾 Save</button>
      </td>
    `;

    return `
      <tr id="row-${student.id}" data-sid="${student.id}" data-rowid="${student.id}">
        <td class="row-no" draggable="true" title="Drag to reorder">${index + 1}</td>
        <td class="name-cell">${student.name}</td>
        ${cells}
      </tr>
    `;
  }

  function bindEntryColumnReorder(subjects) {
    const headers = Array.from(document.querySelectorAll('#marks-table th.subject-col'));
    if (!headers.length) return;

    let draggedSubject = null;

    headers.forEach(header => {
      header.addEventListener('dragstart', (event) => {
        draggedSubject = header.dataset.subject || null;
        header.classList.add('dragging');
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', draggedSubject || '');
        }
      });

      header.addEventListener('dragend', () => {
        header.classList.remove('dragging');
        document.querySelectorAll('#marks-table th.subject-col').forEach(el => el.classList.remove('drag-over'));
      });

      header.addEventListener('dragover', (event) => {
        event.preventDefault();
        header.classList.add('drag-over');
      });

      header.addEventListener('dragleave', () => {
        header.classList.remove('drag-over');
      });

      header.addEventListener('drop', (event) => {
        event.preventDefault();
        header.classList.remove('drag-over');

        const targetSubject = header.dataset.subject;
        const sourceSubject = draggedSubject || (event.dataTransfer && event.dataTransfer.getData('text/plain'));
        if (!sourceSubject || !targetSubject || sourceSubject === targetSubject) return;

        const nextOrder = subjects.filter(subject => subject !== sourceSubject);
        const insertIndex = nextOrder.indexOf(targetSubject);
        nextOrder.splice(insertIndex, 0, sourceSubject);
        App.saveEntrySubjectOrder(nextOrder);
      });
    });
  }

  function bindEntryRowReorder() {
    const rowHandles = Array.from(document.querySelectorAll('#marks-table td.row-no'));
    if (!rowHandles.length) return;

    let draggedRowId = null;

    rowHandles.forEach(handle => {
      handle.addEventListener('dragstart', (event) => {
        const row = handle.closest('tr');
        draggedRowId = row?.dataset.rowid || null;
        handle.classList.add('dragging-row');
        if (row) row.classList.add('row-dragging');
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', draggedRowId || '');
        }
      });

      handle.addEventListener('dragend', () => {
        handle.classList.remove('dragging-row');
        document.querySelectorAll('#marks-table tr').forEach(row => row.classList.remove('row-dragging'));
        document.querySelectorAll('#marks-table tr').forEach(row => row.classList.remove('row-drop-target'));
      });

      const row = handle.closest('tr');
      if (!row) return;

      row.addEventListener('dragover', (event) => {
        event.preventDefault();
        row.classList.add('row-drop-target');
      });

      row.addEventListener('dragleave', (event) => {
        if (!row.contains(event.relatedTarget)) {
          row.classList.remove('row-drop-target');
        }
      });

      row.addEventListener('drop', (event) => {
        event.preventDefault();
        row.classList.remove('row-drop-target');

        const targetRowId = row.dataset.rowid || null;
        const sourceRowId = draggedRowId || (event.dataTransfer && event.dataTransfer.getData('text/plain'));
        if (!sourceRowId || !targetRowId || sourceRowId === targetRowId) return;

        App.reorderEntryStudents(sourceRowId, targetRowId);
      });
    });
  }

  // ── Update calc cells in a row ────────────
  function updateCalcCells(studentId, calc, level, subjects) {
    function set(field, val) {
      const el = document.getElementById(`calc-${studentId}-${field}`);
      if (!el) return;
      if (val === null || val === undefined || val === '') {
        el.innerHTML = '<span style="color:var(--text-3)">—</span>';
        return;
      }
      // Grade badge
      if (typeof val === 'string' && /^[DCP][\d]$|^F9$/.test(val)) {
        el.innerHTML = `<span class="badge badge-${val}">${val}</span>`;
      } else if (typeof val === 'string' && /^[IVU]+$/.test(val)) {
        el.innerHTML = `<span class="badge badge-${val}">${val}</span>`;
      } else {
        el.textContent = val;
      }
    }

    if (level === 'lower') {
      set('TOTAL_MID', calc.TOTAL_MID);
      set('TOTAL_END', calc.TOTAL_END);
      // Position updated by recalcAll
    } else {
      subjects.forEach(s => {
        set(`${s}_MID_AGG`, calc[`${s}_MID_AGG`]);
        set(`${s}_END_AGG`, calc[`${s}_END_AGG`]);
      });
      set('TOTAL_AGG_MID', calc.TOTAL_AGG_MID);
      set('TOTAL_AGG_END', calc.TOTAL_AGG_END);
      set('DIV_MID', calc.DIV_MID);
      set('DIV_END', calc.DIV_END);
    }
  }

  // ── Update all position cells after ranking ─
  function updatePositions(rankedStudents) {
    rankedStudents.forEach(s => {
      const el = document.getElementById(`calc-${s.id}-POSITION`);
      if (!el) return;
      if (s.position) {
        const suffix = s.position === 1 ? 'st' : s.position === 2 ? 'nd' : s.position === 3 ? 'rd' : 'th';
        el.innerHTML = `<span class="badge badge-pos">${s.position}${suffix}</span>`;
      } else {
        el.innerHTML = '<span style="color:var(--text-3)">—</span>';
      }
    });
  }

  // ── Mark row dirty ────────────────────────
  function markRowDirty(studentId) {
    const row = document.getElementById(`row-${studentId}`);
    if (row) row.classList.add('dirty');
  }
  function markRowSaved(studentId) {
    const row = document.getElementById(`row-${studentId}`);
    if (row) {
      row.classList.remove('dirty');
      row.classList.add('saved-flash');
      setTimeout(() => row.classList.remove('saved-flash'), 700);
    }
  }

  // ══════════════════════════════════════════
  //  RESULTS VIEW
  // ══════════════════════════════════════════
  async function renderResults(session, students) {
    const { cls, term, year } = session;
    const level = CONFIG.classLevel(cls);
    const subjects = level === 'lower' ? CONFIG.subjects.lower : CONFIG.subjects.upper;

    await Comments.loadBanks();
    const stats = Logic.classStats(students, level);

    // Stats bar
    let statsHtml = '';
    if (stats) {
      if (level === 'lower') {
        statsHtml = `
          <div class="stats-grid">
            <div class="stat-card"><div class="stat-label">Total Students</div><div class="stat-value">${stats.total}</div></div>
            <div class="stat-card"><div class="stat-label">Completed</div><div class="stat-value">${stats.complete}</div></div>
            <div class="stat-card"><div class="stat-label">Highest</div><div class="stat-value">${stats.highest}</div><div class="stat-sub">Total End marks</div></div>
            <div class="stat-card"><div class="stat-label">Lowest</div><div class="stat-value">${stats.lowest}</div></div>
            <div class="stat-card"><div class="stat-label">Average</div><div class="stat-value">${stats.average}</div></div>
          </div>
        `;
      } else {
        const dc = stats.divCount;
        statsHtml = `
          <div class="stats-grid">
            <div class="stat-card"><div class="stat-label">Total</div><div class="stat-value">${stats.total}</div></div>
            <div class="stat-card"><div class="stat-label">Div I</div><div class="stat-value" style="color:var(--success)">${dc.I}</div></div>
            <div class="stat-card"><div class="stat-label">Div II</div><div class="stat-value" style="color:var(--accent)">${dc.II}</div></div>
            <div class="stat-card"><div class="stat-label">Div III</div><div class="stat-value">${dc.III}</div></div>
            <div class="stat-card"><div class="stat-label">Div IV</div><div class="stat-value" style="color:var(--warn)">${dc.IV}</div></div>
            <div class="stat-card"><div class="stat-label">U</div><div class="stat-value" style="color:var(--danger)">${dc.U}</div></div>
            <div class="stat-card"><div class="stat-label">Best Agg</div><div class="stat-value">${stats.bestAgg}</div></div>
          </div>
        `;
      }
    }

    // Build results table headers
    let headerCells = '<th>No.</th><th>Name</th>';
    if (level === 'lower') {
      subjects.forEach(s => { headerCells += `<th>${s}_MID</th><th>${s}_END</th>`; });
      headerCells += '<th>TOTAL_MID</th><th>TOTAL_END</th><th>POSITION</th>';
    } else {
      subjects.forEach(s => {
        headerCells += `<th>${s}_MID</th><th>${s}_MID_AGG</th><th>${s}_END</th><th>${s}_END_AGG</th>`;
      });
      headerCells += '<th>TOTAL_AGG_MID</th><th>TOTAL_AGG_END</th><th>DIV_MID</th><th>DIV_END</th>';
    }

    // Build results rows
    const bodyRows = students.map((s, i) => {
      const m = s.marks || {};
      const c = s.calc || {};
      let cells = `<td>${i + 1}</td><td class="name-cell">${s.name}</td>`;

      if (level === 'lower') {
        subjects.forEach(subj => {
          cells += `<td>${m[`${subj}_MID`] ?? '—'}</td><td>${m[`${subj}_END`] ?? '—'}</td>`;
        });
        cells += `<td class="calc-cell total">${c.TOTAL_MID ?? '—'}</td>`;
        cells += `<td class="calc-cell total">${c.TOTAL_END ?? '—'}</td>`;
        const pos = s.position;
        const suffix = pos === 1 ? 'st' : pos === 2 ? 'nd' : pos === 3 ? 'rd' : 'th';
        cells += `<td>${pos ? `<span class="badge badge-pos">${pos}${suffix}</span>` : '—'}</td>`;
      } else {
        subjects.forEach(subj => {
          const midAgg = c[`${subj}_MID_AGG`];
          const endAgg = c[`${subj}_END_AGG`];
          cells += `<td>${m[`${subj}_MID`] ?? '—'}</td>`;
          cells += `<td>${midAgg ? `<span class="badge badge-${midAgg}">${midAgg}</span>` : '—'}</td>`;
          cells += `<td>${m[`${subj}_END`] ?? '—'}</td>`;
          cells += `<td>${endAgg ? `<span class="badge badge-${endAgg}">${endAgg}</span>` : '—'}</td>`;
        });
        cells += `<td class="calc-cell total">${c.TOTAL_AGG_MID ?? '—'}</td>`;
        cells += `<td class="calc-cell total">${c.TOTAL_AGG_END ?? '—'}</td>`;
        cells += `<td>${c.DIV_MID ? `<span class="badge badge-${c.DIV_MID}">${c.DIV_MID}</span>` : '—'}</td>`;
        cells += `<td>${c.DIV_END ? `<span class="badge badge-${c.DIV_END}">${c.DIV_END}</span>` : '—'}</td>`;
      }

      return `<tr>${cells}</tr>`;
    }).join('');

    // Comments section — division-locked, non-repeating shuffle + smart subject awareness
    const seed = Storage.loadCommentSeed(cls, term, year);
    const assignedMap = Comments.assignClassComments(students, level, session, seed);
    const savedComments = Storage.loadAllComments(cls, term, year);
    const updatedComments = {};
    let hasAnyManualEdit = false;

    const toOptTag = (c, selected) =>
      `<option value="${escHtml(c)}" ${c === selected ? 'selected' : ''}>${escHtml(c.length > 88 ? c.substring(0, 88) + '…' : c)}</option>`;

    const buildDropdownOpts = (structured, tierLabel, selectedVal) => {
      if (!structured || !structured.all.length) return '';
      const cleanTier = (tierLabel || '').replace('_', ' ');
      if (structured.subject.length > 0 && structured.analysis?.weakSubjects) {
        const subjOpts = structured.subject.map(c => toOptTag(c, selectedVal)).join('');
        const genOpts  = structured.general.map(c => toOptTag(c, selectedVal)).join('');
        return `
          <optgroup label="Subject-Focused (${escHtml(structured.analysis.weakSubjects)}) — ${structured.subject.length}">
            ${subjOpts}
          </optgroup>
          <optgroup label="General ${escHtml(cleanTier)} Comments — ${structured.general.length}">
            ${genOpts}
          </optgroup>
        `;
      }
      return structured.general.map(c => toOptTag(c, selectedVal)).join('');
    };

    const commentsRows = students.map(s => {
      const tier = Comments.getTier(level, s.calc);
      const auto = assignedMap[s.id] || null;
      const prev = savedComments[s.id] || {};

      // If student moved to a different division/tier, auto-refresh to the new division
      const tierChanged = Boolean(prev.tier && tier && prev.tier !== tier);
      const keepManualTeacher = Boolean(!tierChanged && prev.manualTeacher && prev.teacher && !prev.teacher.includes('—'));
      const keepManualHt      = Boolean(!tierChanged && prev.manualHt && prev.ht && !prev.ht.includes('—'));

      const teacherVal = tier
        ? (keepManualTeacher ? prev.teacher : (auto?.teacher || ''))
        : (keepManualTeacher ? prev.teacher : '');
      const htVal = tier
        ? (keepManualHt ? prev.ht : (auto?.ht || ''))
        : (keepManualHt ? prev.ht : '');

      if (keepManualTeacher || keepManualHt) hasAnyManualEdit = true;

      updatedComments[s.id] = {
        teacher: teacherVal,
        ht: htVal,
        tier: tier || null,
        sig: auto?.sig || '',
        manualTeacher: keepManualTeacher,
        manualHt: keepManualHt,
      };

      const teacherStructured = tier ? Comments.getTierOptionsStructured(level, 'teacher', tier, s.marks) : null;
      const htStructured      = tier ? Comments.getTierOptionsStructured(level, 'ht',      tier, s.marks) : null;
      const analysis          = auto?.analysis || teacherStructured?.analysis || null;

      let metaBadges = '';
      if (tier) {
        const tierDisplay = level === 'upper' ? `Div ${s.calc?.DIV_END}` : tier;
        const badgeCls = level === 'upper' ? `badge-${s.calc?.DIV_END}` : 'badge-pos';
        metaBadges += `<span class="badge ${badgeCls}" style="font-size:.7rem;margin-right:.35rem">${escHtml(tierDisplay)}</span>`;
        if (analysis?.hasWeakSubject && !analysis.allPoor) {
          metaBadges += `<span style="font-size:.72rem;color:var(--text-2)" title="Weak area detected for smart comments">Focus: ${escHtml(analysis.weakSubjects)}</span>`;
        } else if (analysis?.allPoor) {
          metaBadges += `<span style="font-size:.72rem;color:var(--text-3)" title="Low marks across most subjects — using general comments">General (all subjects)</span>`;
        }
      }

      return `
        <tr>
          <td style="font-weight:500;white-space:nowrap">
            <div>${escHtml(s.name)}</div>
            ${metaBadges ? `<div style="margin-top:.25rem">${metaBadges}</div>` : ''}
          </td>
          <td>
            <div class="comment-field">
              <select class="suggest-select" onchange="App.applyCommentFromDropdown(this,'${s.id}','teacher')">
                <option value="">— Select ${tier ? escHtml(tier.replace('_', ' ')) : ''} template —</option>
                ${buildDropdownOpts(teacherStructured, tier, teacherVal)}
              </select>
              <textarea id="cmt-teacher-${s.id}" rows="2"
                onchange="App.saveComment('${s.id}','teacher',this.value,true)"
              >${escHtml(teacherVal)}</textarea>
            </div>
          </td>
          <td>
            <div class="comment-field">
              <select class="suggest-select" onchange="App.applyCommentFromDropdown(this,'${s.id}','ht')">
                <option value="">— Select ${tier ? escHtml(tier.replace('_', ' ')) : ''} template —</option>
                ${buildDropdownOpts(htStructured, tier, htVal)}
              </select>
              <textarea id="cmt-ht-${s.id}" rows="2"
                onchange="App.saveComment('${s.id}','ht',this.value,true)"
              >${escHtml(htVal)}</textarea>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    Storage.saveAllComments(cls, term, year, updatedComments);

    main().innerHTML = `
      <div class="card" style="padding:1rem">
        <div class="table-toolbar">
          <strong>${cls} — Term ${term}, ${year} Results</strong>
          <div class="toolbar-right">
            <button class="btn btn-secondary btn-sm" onclick="App.goTo('entry')">← Back to Entry</button>
            <button class="btn btn-success" onclick="App.exportExcel()">⬇ Export Excel</button>
          </div>
        </div>
        ${statsHtml}
        <div class="marks-wrap" style="margin-bottom:1.5rem">
          <table class="marks-table">
            <thead><tr>${headerCells}</tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </div>

        <div class="table-toolbar" style="margin-top:1.5rem;margin-bottom:.75rem">
          <div class="section-title" style="margin:0">Teacher & HT Comments — <span>${cls}</span></div>
          <div class="toolbar-right">
            <button class="btn btn-secondary btn-sm" onclick="App.randomizeComments()" title="Shuffle comments within each student's division/tier (preserves manually edited comments)">🎲 Randomize Comments</button>
            ${hasAnyManualEdit ? `<button class="btn btn-secondary btn-sm" onclick="App.resetCommentsToAuto()" title="Clear manual edits and deal fresh division-matched comments to all students">↺ Reset Manual Edits</button>` : ''}
          </div>
        </div>
        <div class="marks-wrap">
          <table class="comments-table">
            <thead><tr><th>Student</th><th>Teacher Comment</th><th>HT Comment</th></tr></thead>
            <tbody>${commentsRows}</tbody>
          </table>
        </div>

        <div class="form-actions" style="margin-top:1.25rem">
          <button class="btn btn-success" onclick="App.exportExcel()">⬇ Export Excel</button>
        </div>
      </div>
    `;
  }

  function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function formatTime(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
  }

  function bindMobileNav() {
    const menuBtn = document.getElementById('nav-menu-btn');
    const header = document.querySelector('.app-header');
    const nav = document.querySelector('.app-nav');
    if (!menuBtn || !header || !nav) return;

    const closeMenu = () => {
      header.classList.remove('menu-open');
      menuBtn.setAttribute('aria-expanded', 'false');
    };

    menuBtn.addEventListener('click', () => {
      const isOpen = header.classList.toggle('menu-open');
      menuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    nav.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', closeMenu);
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) closeMenu();
    });
  }

  return {
    toast, renderContextBar, setNavActive,
    renderSetup, renderRoster, renderEntry, buildEntryRow,
    updateCalcCells, updatePositions, markRowDirty, markRowSaved,
    renderResults, renderHistory, escHtml, bindMobileNav,
  };
})();
