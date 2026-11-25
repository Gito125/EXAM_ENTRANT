// ═══════════════════════════════════════════
//  ACADEX APP — Main Controller
// ═══════════════════════════════════════════

const App = (() => {

  let session     = null;   // { school, cls, term, year }
  let currentView = 'setup';
  let entrySubjectOrder = null;

  // In-memory marks buffer: { [studentId]: { FIELD: value } }
  // Synced with localStorage on save actions
  let marksBuffer = {};

  const DEFAULT_SEED_URL = 'data/term3_2026_sunlight.json';

  async function loadDefaultSeed(overwrite = false) {
    try {
      const res = await fetch(DEFAULT_SEED_URL);
      if (!res.ok) return { applied: false };
      const bundle = await res.json();
      return Storage.applySeedBundle(bundle, { overwrite });
    } catch (e) {
      console.warn('Default seed bundle not loaded:', e);
      return { applied: false };
    }
  }

  // ══════════════════════════════════════════
  //  INIT
  // ══════════════════════════════════════════
  async function init() {
    await Promise.all([
      Comments.loadBanks(),
      loadDefaultSeed(false),
    ]);
    UI.bindMobileNav();

    // Wire nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => goTo(btn.dataset.view));
    });

    // Restore session
    session = Storage.loadSession();
    if (session) {
      Storage.upsertSessionHistory(session, 'opened');
      marksBuffer = Storage.loadAllMarks(session.cls, session.term, session.year);
      goTo('entry');
    } else {
      goTo('setup');
    }
  }

  // ══════════════════════════════════════════
  //  NAVIGATION
  // ══════════════════════════════════════════
  function goTo(view) {
    currentView = view;
    UI.setNavActive(view);
    UI.renderContextBar(session);

    if (view === 'setup') {
      UI.renderSetup(session, Storage.loadSessionHistory());
    } else if (view === 'roster') {
      if (!session) { UI.toast('Please complete setup first.', 'error'); goTo('setup'); return; }
      const roster = Storage.loadRoster(session.cls);
      UI.renderRoster(session, roster);
    } else if (view === 'entry') {
      if (!session) { UI.toast('Please complete setup first.', 'error'); goTo('setup'); return; }
      marksBuffer = Storage.loadAllMarks(session.cls, session.term, session.year);
      renderEntryView();
    } else if (view === 'results') {
      if (!session) { UI.toast('Please complete setup first.', 'error'); goTo('setup'); return; }
      const students = Storage.buildClassSnapshot(session.cls, session.term, session.year);
      UI.renderResults(session, students);
    } else if (view === 'history') {
      UI.renderHistory(Storage.loadSessionHistory(), session);
    }
  }

  function getDefaultEntrySubjectOrder() {
    if (!session) return [];
    const level = CONFIG.classLevel(session.cls);
    return [...(level === 'lower' ? CONFIG.subjects.lower : CONFIG.subjects.upper)];
  }

  function normalizeEntrySubjectOrder(order) {
    const canonical = getDefaultEntrySubjectOrder();
    if (!Array.isArray(order) || !order.length) return canonical;

    const normalized = [];
    order.forEach(subject => {
      if (canonical.includes(subject) && !normalized.includes(subject)) {
        normalized.push(subject);
      }
    });

    canonical.forEach(subject => {
      if (!normalized.includes(subject)) normalized.push(subject);
    });

    return normalized;
  }

  function loadEntrySubjectOrder() {
    if (!session) return [];
    const stored = Storage.loadEntrySubjectOrder(session.cls, session.term, session.year);
    entrySubjectOrder = normalizeEntrySubjectOrder(stored);
    return entrySubjectOrder;
  }

  function saveEntrySubjectOrder(order) {
    if (!session) return;
    entrySubjectOrder = normalizeEntrySubjectOrder(order);
    Storage.saveEntrySubjectOrder(session.cls, session.term, session.year, entrySubjectOrder);
    if (currentView === 'entry') renderEntryView();
  }

  function reorderEntryStudents(fromStudentId, toStudentId) {
    if (!session || fromStudentId === toStudentId) return;

    const roster = Storage.loadRoster(session.cls);
    const fromIndex = roster.findIndex(student => student.id === fromStudentId);
    const toIndex = roster.findIndex(student => student.id === toStudentId);

    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

    const adjustedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
    Storage.reorderRoster(session.cls, fromIndex, adjustedToIndex);
    if (currentView === 'entry') renderEntryView();
    if (currentView === 'roster') UI.renderRoster(session, Storage.loadRoster(session.cls));
    UI.toast('Student order updated.', 'success');
  }

  function resetEntrySubjectOrder() {
    if (!session) return;
    entrySubjectOrder = getDefaultEntrySubjectOrder();
    Storage.clearEntrySubjectOrder(session.cls, session.term, session.year);
    if (currentView === 'entry') renderEntryView();
    UI.toast('Entry column order reset.', 'info');
  }

  function renderEntryView() {
    if (!session) return;
    const roster = Storage.loadRoster(session.cls);
    if (!roster.length) { UI.toast('Add students to the roster first.', 'info'); goTo('roster'); return; }
    const subjects = loadEntrySubjectOrder();
    UI.renderEntry(session, roster, marksBuffer, subjects);
    requestAnimationFrame(() => recalcAll());
  }

  // ══════════════════════════════════════════
  //  SETUP
  // ══════════════════════════════════════════
  function saveSession() {
    const school = document.getElementById('inp-school')?.value?.trim();
    const cls    = document.getElementById('inp-cls')?.value;
    const term   = parseInt(document.getElementById('inp-term')?.value);
    const year   = parseInt(document.getElementById('inp-year')?.value);

    if (!school) { UI.toast('Please enter the school name.', 'error'); return; }
    if (!year || year < 2020) { UI.toast('Please enter a valid year.', 'error'); return; }

    session = { school, cls, term, year };
    Storage.saveSession(session);
    Storage.upsertSessionHistory(session, 'saved');
    marksBuffer = Storage.loadAllMarks(cls, term, year);
    UI.toast('Session saved!', 'success');
    goTo('roster');
  }

  function loadHistorySession(historyId, targetView = 'setup') {
    const item = Storage.getSessionHistoryItem(historyId);
    if (!item) {
      UI.toast('Selected history record was not found.', 'error');
      return;
    }

    session = {
      school: item.school,
      cls: item.cls,
      term: Number(item.term),
      year: Number(item.year),
    };

    Storage.saveSession(session);
    Storage.upsertSessionHistory(session, 'opened');
    marksBuffer = Storage.loadAllMarks(session.cls, session.term, session.year);
    goTo(targetView || 'setup');
    UI.toast(`Loaded ${session.cls} Term ${session.term} ${session.year}.`, 'success');
  }

  function exportFullBackup() {
    const backup = Storage.exportFullBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    const dateTag = new Date().toISOString().slice(0, 10);
    a.href = URL.createObjectURL(blob);
    a.download = `Acadex_Backup_${dateTag}.json`;
    a.click();
    UI.toast('Full backup JSON exported.', 'success');
  }

  function importFullBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          Storage.importFullBackup(data);
          session = Storage.loadSession();
          if (session) {
            marksBuffer = Storage.loadAllMarks(session.cls, session.term, session.year);
          }
          goTo('setup');
          UI.toast('Backup JSON imported successfully!', 'success');
        } catch (err) {
          console.error(err);
          UI.toast('Invalid backup or seed JSON file.', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  async function reloadDefaultSeed() {
    if (!confirm('Reload the official Sunlight Term 3, 2026 dataset (P1–P6 rosters & marks) from disk? Any unsaved changes to Term 3, 2026 marks will be refreshed.')) {
      return;
    }
    const res = await loadDefaultSeed(true);
    if (!res.applied) {
      UI.toast('Could not reload Term 3, 2026 seed file.', 'error');
      return;
    }
    session = Storage.loadSession();
    if (session) {
      marksBuffer = Storage.loadAllMarks(session.cls, session.term, session.year);
    }
    goTo('setup');
    UI.toast('Sunlight Term 3, 2026 data (P1–P6) reloaded!', 'success');
  }

  // ══════════════════════════════════════════
  //  ROSTER
  // ══════════════════════════════════════════
  function addStudent() {
    const inp = document.getElementById('inp-new-student');
    const name = inp?.value?.trim();
    if (!name) { UI.toast('Please enter a student name.', 'error'); return; }

    Storage.addStudent(session.cls, name);
    inp.value = '';
    goTo('roster');
    UI.toast(`${name} added.`, 'success');
  }

  function removeStudent(id) {
    const roster = Storage.loadRoster(session.cls);
    const student = roster.find(s => s.id === id);
    if (!student) return;
    if (!confirm(`Remove "${student.name}" from the roster?`)) return;
    Storage.removeStudent(session.cls, id);
    goTo('roster');
    UI.toast(`${student.name} removed.`, 'info');
  }

  function renameStudent(id) {
    const roster = Storage.loadRoster(session.cls);
    const student = roster.find(s => s.id === id);
    if (!student) return;
    const newName = prompt('New name:', student.name)?.trim();
    if (!newName) return;
    Storage.renameStudent(session.cls, id, newName);
    goTo('roster');
    UI.toast('Student renamed.', 'success');
  }

  function exportRoster() {
    const roster = Storage.loadRoster(session.cls);
    const blob = new Blob([JSON.stringify(roster, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `roster_${session.cls}.json`;
    a.click();
    UI.toast('Roster exported.', 'success');
  }

  function importRoster() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (!Array.isArray(data)) throw new Error('Invalid format');
          Storage.saveRoster(session.cls, data);
          goTo('roster');
          UI.toast(`Imported ${data.length} students.`, 'success');
        } catch {
          UI.toast('Invalid roster file.', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // ══════════════════════════════════════════
  //  MARK ENTRY — live calculation
  // ══════════════════════════════════════════
  function onMarkInput(input) {
    const sid   = input.dataset.sid;
    const field = input.dataset.field;
    const val   = input.value.trim();

    // Update buffer
    if (!marksBuffer[sid]) marksBuffer[sid] = {};
    marksBuffer[sid][field] = val === '' ? '' : Number(val);

    // Mark row dirty (unsaved)
    UI.markRowDirty(sid);

    // Recalc this student
    recalcStudent(sid);

    // Recalc positions for all (ranking changes with each mark entry)
    recalcPositions();
  }

  function validateInput(input) {
    const val = Number(input.value);
    if (input.value !== '' && (isNaN(val) || val < 0 || val > 100)) {
      input.classList.add('invalid');
      UI.toast('Mark must be between 0 and 100.', 'error');
    } else {
      input.classList.remove('invalid');
    }
  }

  function recalcStudent(sid) {
    const level    = CONFIG.classLevel(session.cls);
    const subjects = level === 'lower' ? normalizeEntrySubjectOrder(entrySubjectOrder) : CONFIG.subjects.upper;
    const marks    = marksBuffer[sid] || {};
    const calc     = level === 'lower' ? Logic.calcLower(marks) : Logic.calcUpper(marks);
    UI.updateCalcCells(sid, calc, level, subjects);
  }

  function recalcAll() {
    const roster = Storage.loadRoster(session.cls);
    roster.forEach(s => recalcStudent(s.id));
    recalcPositions();
  }

  function recalcPositions() {
    const level   = CONFIG.classLevel(session.cls);
    const roster  = Storage.loadRoster(session.cls);
    const key     = level === 'lower' ? 'TOTAL_END' : 'TOTAL_AGG_END';

    const students = roster.map(s => {
      const marks = marksBuffer[s.id] || {};
      const calc  = level === 'lower' ? Logic.calcLower(marks) : Logic.calcUpper(marks);
      return { ...s, calc };
    });

    const ranked = Logic.rankStudents(students, level);

    if (level === 'lower') {
      UI.updatePositions(ranked);
    }
    // For upper, positions aren't shown in entry view (only division matters)
  }

  // ══════════════════════════════════════════
  //  SAVE
  // ══════════════════════════════════════════
  function saveStudentMarks(sid) {
    const { cls, term, year } = session;
    Storage.saveStudentMarks(cls, term, year, sid, marksBuffer[sid] || {});
    UI.markRowSaved(sid);
    UI.toast('Student marks saved.', 'success');
  }

  function saveAllMarks() {
    const { cls, term, year } = session;
    Storage.saveAllMarks(cls, term, year, marksBuffer);
    // Flash all rows
    const roster = Storage.loadRoster(cls);
    roster.forEach(s => UI.markRowSaved(s.id));
    UI.toast(`All marks saved for ${cls}.`, 'success');
  }

  function clearClassMarks() {
    const { cls, term, year } = session;
    if (!confirm(`Clear ALL marks for ${cls} Term ${term} ${year}? This cannot be undone.`)) return;
    marksBuffer = {};
    Storage.saveAllMarks(cls, term, year, {});
    goTo('entry');
    UI.toast('All marks cleared.', 'info');
  }

  // ══════════════════════════════════════════
  //  COMMENTS
  // ══════════════════════════════════════════
  function applyCommentFromDropdown(select, sid, role) {
    const val = select.value;
    if (!val) return;
    const textarea = document.getElementById(`cmt-${role}-${sid}`);
    if (textarea) textarea.value = val;
    saveComment(sid, role, val, true);
  }

  function saveComment(sid, role, value, isManual = true) {
    const { cls, term, year } = session;
    const level = CONFIG.classLevel(cls);
    const marks = Storage.loadStudentMarks(cls, term, year, sid);
    const calc = level === 'lower' ? Logic.calcLower(marks) : Logic.calcUpper(marks);
    const tier = Comments.getTier(level, calc);

    const all = Storage.loadAllComments(cls, term, year);
    if (!all[sid]) all[sid] = {};
    all[sid][role] = value;
    all[sid][role === 'teacher' ? 'manualTeacher' : 'manualHt'] = Boolean(isManual);
    if (tier) all[sid].tier = tier;
    Storage.saveAllComments(cls, term, year, all);
  }

  async function randomizeComments() {
    if (!session) return;
    const { cls, term, year } = session;
    const nextSeed = Storage.loadCommentSeed(cls, term, year) + 1;
    Storage.saveCommentSeed(cls, term, year, nextSeed);

    const students = Storage.buildClassSnapshot(cls, term, year);
    await UI.renderResults(session, students);
    UI.toast('Comments shuffled by division (manual edits preserved).', 'success');
  }

  async function resetCommentsToAuto() {
    if (!session) return;
    const { cls, term, year } = session;
    const nextSeed = Storage.loadCommentSeed(cls, term, year) + 1;
    Storage.saveCommentSeed(cls, term, year, nextSeed);
    Storage.saveAllComments(cls, term, year, {});

    const students = Storage.buildClassSnapshot(cls, term, year);
    await UI.renderResults(session, students);
    UI.toast('All comments reset to fresh division-matched suggestions.', 'info');
  }

  // ══════════════════════════════════════════
  //  EXPORT
  // ══════════════════════════════════════════
  function exportExcel() {
    const { cls, term, year } = session;
    const level = CONFIG.classLevel(cls);
    const students = Storage.buildClassSnapshot(cls, term, year);
    const seed = Storage.loadCommentSeed(cls, term, year);
    const assignedMap = Comments.assignClassComments(students, level, session, seed);

    // Pull comments into snapshot
    const commentsMap = Storage.loadAllComments(cls, term, year);
    students.forEach(s => {
      const saved = commentsMap[s.id] || {};
      const auto  = assignedMap[s.id] || {};
      const tier  = Comments.getTier(level, s.calc);
      const tierChanged = Boolean(saved.tier && tier && saved.tier !== tier);
      const sigChanged  = Boolean(saved.sig && auto.sig && saved.sig !== auto.sig);
      const keepTeacher = !tierChanged && (saved.manualTeacher || !sigChanged) && Boolean(saved.teacher);
      const keepHt      = !tierChanged && (saved.manualHt      || !sigChanged) && Boolean(saved.ht);

      s.comments = {
        teacher: keepTeacher ? saved.teacher : (auto.teacher || ''),
        ht:      keepHt      ? saved.ht      : (auto.ht      || ''),
      };

      // Override comment text from DOM if results view is open
      const teacherEl = document.getElementById(`cmt-teacher-${s.id}`);
      const htEl      = document.getElementById(`cmt-ht-${s.id}`);
      if (teacherEl) s.comments.teacher = teacherEl.value;
      if (htEl)      s.comments.ht      = htEl.value;
    });

    Export.exportClass(students, cls, term, year);
  }

  // Public API
  return {
    init, goTo,
    saveSession,
    loadHistorySession,
    exportFullBackup, importFullBackup, reloadDefaultSeed,
    addStudent, removeStudent, renameStudent, exportRoster, importRoster,
    onMarkInput, validateInput, saveStudentMarks, saveAllMarks, clearClassMarks,
    applyCommentFromDropdown, saveComment, randomizeComments, resetCommentsToAuto,
    saveEntrySubjectOrder, resetEntrySubjectOrder, reorderEntryStudents,
    exportExcel,
  };
})();

// ── Bootstrap ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.init());
