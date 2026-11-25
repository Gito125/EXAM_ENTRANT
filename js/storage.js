// ═══════════════════════════════════════════
//  ACADEX STORAGE — localStorage abstraction
// ═══════════════════════════════════════════

const Storage = (() => {

  const KEYS = {
    session:   'acadex_session',
    sessionHistory: 'acadex_session_history',
    appliedSeed: 'acadex_applied_seed',
    roster:    (cls) => `acadex_roster_${cls}`,
    marks:     (cls, term, year) => `acadex_marks_${cls}_T${term}_${year}`,
    comments:  (cls, term, year) => `acadex_comments_${cls}_T${term}_${year}`,
    commentSeed: (cls, term, year) => `acadex_comment_seed_${cls}_T${term}_${year}`,
    subjectOrder: (cls, term, year) => `acadex_subject_order_${cls}_T${term}_${year}`,
  };

  // ── Helpers ──────────────────────────────
  function save(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); return true; }
    catch (e) { console.error('Storage write error:', e); return false; }
  }
  function load(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }
  function remove(key) {
    try { localStorage.removeItem(key); } catch {}
  }

  // ── Session ──────────────────────────────
  function saveSession(session) { return save(KEYS.session, session); }
  function loadSession() { return load(KEYS.session); }
  function clearSession() { remove(KEYS.session); }

  // ── Session history ─────────────────────
  function makeSessionHistoryId(session) {
    return `${session.cls}_T${session.term}_${session.year}`;
  }

  function loadSessionHistory() {
    const history = load(KEYS.sessionHistory, []);
    if (!Array.isArray(history)) return [];

    return history
      .filter(item => item && item.id && item.cls && item.term && item.year)
      .sort((a, b) => {
        const aTime = Number(a.lastOpenedAt || a.lastSavedAt || a.createdAt || 0);
        const bTime = Number(b.lastOpenedAt || b.lastSavedAt || b.createdAt || 0);
        return bTime - aTime;
      });
  }

  function saveSessionHistory(history) {
    return save(KEYS.sessionHistory, history);
  }

  function upsertSessionHistory(session, reason = 'saved') {
    if (!session || !session.cls || !session.term || !session.year || !session.school) return null;

    const now = Date.now();
    const id = makeSessionHistoryId(session);
    const history = loadSessionHistory();
    const idx = history.findIndex(item => item.id === id);

    const baseItem = {
      id,
      school: String(session.school).trim(),
      cls: session.cls,
      term: Number(session.term),
      year: Number(session.year),
      createdAt: now,
      lastSavedAt: now,
      lastOpenedAt: now,
    };

    if (idx >= 0) {
      const prev = history[idx];
      history[idx] = {
        ...prev,
        ...baseItem,
        createdAt: prev.createdAt || now,
        lastSavedAt: reason === 'opened' ? (prev.lastSavedAt || now) : now,
        lastOpenedAt: now,
      };
    } else {
      history.push(baseItem);
    }

    saveSessionHistory(history);
    return id;
  }

  function getSessionHistoryItem(id) {
    return loadSessionHistory().find(item => item.id === id) || null;
  }

  // ── Roster ───────────────────────────────
  function saveRoster(cls, students) {
    return save(KEYS.roster(cls), students);
  }
  function loadRoster(cls) {
    return load(KEYS.roster(cls), []);
  }
  function addStudent(cls, name) {
    const roster = loadRoster(cls);
    const id = `stu_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    const student = { id, name: name.trim(), cls };
    roster.push(student);
    saveRoster(cls, roster);
    return student;
  }
  function removeStudent(cls, id) {
    const roster = loadRoster(cls).filter(s => s.id !== id);
    saveRoster(cls, roster);
    return roster;
  }
  function renameStudent(cls, id, newName) {
    const roster = loadRoster(cls).map(s =>
      s.id === id ? { ...s, name: newName.trim() } : s
    );
    saveRoster(cls, roster);
    return roster;
  }
  function reorderRoster(cls, fromIdx, toIdx) {
    const roster = loadRoster(cls);
    const [moved] = roster.splice(fromIdx, 1);
    roster.splice(toIdx, 0, moved);
    saveRoster(cls, roster);
    return roster;
  }

  // ── Marks ────────────────────────────────
  // marks stored as { [studentId]: { SUBJ_MID: val, SUBJ_END: val, ... } }
  function loadAllMarks(cls, term, year) {
    return load(KEYS.marks(cls, term, year), {});
  }
  function saveStudentMarks(cls, term, year, studentId, marks) {
    const all = loadAllMarks(cls, term, year);
    all[studentId] = { ...marks };
    return save(KEYS.marks(cls, term, year), all);
  }
  function saveAllMarks(cls, term, year, marksMap) {
    return save(KEYS.marks(cls, term, year), marksMap);
  }
  function loadStudentMarks(cls, term, year, studentId) {
    const all = loadAllMarks(cls, term, year);
    return all[studentId] || {};
  }

  // ── Entry subject order ──────────────────
  function saveEntrySubjectOrder(cls, term, year, order) {
    return save(KEYS.subjectOrder(cls, term, year), order);
  }
  function loadEntrySubjectOrder(cls, term, year) {
    return load(KEYS.subjectOrder(cls, term, year), null);
  }
  function clearEntrySubjectOrder(cls, term, year) {
    remove(KEYS.subjectOrder(cls, term, year));
  }

  // ── Comments ─────────────────────────────
  // comments stored as { [studentId]: { teacher: '...', ht: '...', tier: '...', sig: '...', manualTeacher: bool, manualHt: bool } }
  function loadAllComments(cls, term, year) {
    return load(KEYS.comments(cls, term, year), {});
  }
  function saveStudentComment(cls, term, year, studentId, commentObj) {
    const all = loadAllComments(cls, term, year);
    all[studentId] = { ...commentObj };
    return save(KEYS.comments(cls, term, year), all);
  }
  function saveAllComments(cls, term, year, commentsMap) {
    return save(KEYS.comments(cls, term, year), commentsMap);
  }
  function loadCommentSeed(cls, term, year) {
    return Number(load(KEYS.commentSeed(cls, term, year), 0)) || 0;
  }
  function saveCommentSeed(cls, term, year, seed) {
    return save(KEYS.commentSeed(cls, term, year), Number(seed) || 0);
  }

  // ── Full class data snapshot ──────────────
  // Assembles roster + marks + comments + calc into one array
  function buildClassSnapshot(cls, term, year) {
    const level = CONFIG.classLevel(cls);
    const roster = loadRoster(cls);
    const marksMap = loadAllMarks(cls, term, year);
    const commentsMap = loadAllComments(cls, term, year);

    const students = roster.map(s => ({
      ...s,
      marks: marksMap[s.id] || {},
      comments: commentsMap[s.id] || { teacher: '', ht: '' },
    }));

    return Logic.processAll(students, level);
  }

  // ── Seed Bundle & Full Backup Import/Export ─
  function applySeedBundle(bundle, { overwrite = false } = {}) {
    if (!bundle || !bundle.classes || !bundle.school || !bundle.term || !bundle.year) {
      return { applied: false, classesLoaded: 0 };
    }

    const seedId = bundle.seedId || `${bundle.school}_T${bundle.term}_${bundle.year}`;
    if (!overwrite && load(KEYS.appliedSeed) === seedId) {
      return { applied: false, classesLoaded: 0 };
    }

    const school = String(bundle.school).trim();
    const term = Number(bundle.term);
    const year = Number(bundle.year);
    const classNames = Object.keys(bundle.classes);
    let classesLoaded = 0;

    // Seed rosters, marks, and session history entries in reverse order so P1 sits at top of recent history
    const orderedForHistory = [...classNames].reverse();
    orderedForHistory.forEach((cls, idx) => {
      const clsData = bundle.classes[cls];
      if (!clsData) return;

      if (Array.isArray(clsData.roster)) {
        saveRoster(cls, clsData.roster);
      }
      if (clsData.marks && typeof clsData.marks === 'object') {
        saveAllMarks(cls, term, year, clsData.marks);
      }
      if (clsData.comments && typeof clsData.comments === 'object') {
        saveAllComments(cls, term, year, clsData.comments);
      }

      upsertSessionHistory({ school, cls, term, year }, 'saved');
      // Slight timestamp stagger so P1..P6 order cleanly in Recent Sessions
      const history = loadSessionHistory();
      const itemId = makeSessionHistoryId({ cls, term, year });
      const hIdx = history.findIndex(h => h.id === itemId);
      if (hIdx >= 0) {
        const ts = Date.now() + idx;
        history[hIdx].lastOpenedAt = ts;
        history[hIdx].lastSavedAt = ts;
        saveSessionHistory(history);
      }
      classesLoaded++;
    });

    const currentSession = loadSession();
    const defaultCls = bundle.defaultClass && bundle.classes[bundle.defaultClass]
      ? bundle.defaultClass
      : classNames[0];

    if (overwrite || !currentSession || currentSession.term !== term || currentSession.year !== year) {
      if (defaultCls) {
        saveSession({ school, cls: defaultCls, term, year });
      }
    }

    save(KEYS.appliedSeed, seedId);
    return { applied: true, classesLoaded };
  }

  function exportFullBackup() {
    return {
      format: 'acadex_backup_v1',
      exportedAt: new Date().toISOString(),
      storage: dumpAll(),
    };
  }

  function importFullBackup(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid backup JSON');
    }

    // Support importing a seed bundle (like data/term3_2026_sunlight.json) directly
    if (payload.classes && payload.school && payload.term && payload.year) {
      return applySeedBundle(payload, { overwrite: true });
    }

    // Support importing full localStorage snapshot (acadex_backup_v1)
    const storageMap = payload.format === 'acadex_backup_v1' && payload.storage
      ? payload.storage
      : payload;

    const keys = Object.keys(storageMap).filter(k => k.startsWith('acadex_'));
    if (!keys.length) {
      throw new Error('No Acadex data found in file');
    }

    keys.forEach(k => save(k, storageMap[k]));
    return { applied: true, keysRestored: keys.length };
  }

  // ── Export all data for debugging ────────
  function dumpAll() {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('acadex_')) out[k] = load(k);
    }
    return out;
  }

  return {
    saveSession, loadSession, clearSession,
    loadSessionHistory, upsertSessionHistory, getSessionHistoryItem,
    saveRoster, loadRoster, addStudent, removeStudent, renameStudent, reorderRoster,
    loadAllMarks, saveStudentMarks, saveAllMarks, loadStudentMarks,
    saveEntrySubjectOrder, loadEntrySubjectOrder, clearEntrySubjectOrder,
    loadAllComments, saveStudentComment, saveAllComments,
    loadCommentSeed, saveCommentSeed,
    buildClassSnapshot, applySeedBundle, exportFullBackup, importFullBackup, dumpAll,
  };
})();
