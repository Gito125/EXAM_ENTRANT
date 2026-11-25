// ═══════════════════════════════════════════
//  ACADEX COMMENTS — Load, Smart Subject & Division Shuffle Engine
// ═══════════════════════════════════════════

const Comments = (() => {

  let lowerBank = null;
  let upperBank = null;

  const SUBJECT_NAMES = {
    ENG: 'English',
    MTC: 'Mathematics',
    SCI: 'Science',
    SST: 'Social Studies',
    LITI: 'Literacy I',
    LITII: 'Literacy II',
    RE: 'Religious Education',
  };

  async function loadBanks() {
    if (lowerBank && upperBank) return;
    try {
      const [r1, r2] = await Promise.all([
        fetch('comments_p1p3.json'),
        fetch('comments_p4p6.json'),
      ]);
      lowerBank = (await r1.json()).lower;
      upperBank = (await r2.json()).upper;
    } catch (e) {
      console.error('Failed to load comment banks:', e);
    }
  }

  // ── Determine tier for lower (P1–P3) ─────
  function getLowerTier(totalEnd) {
    if (totalEnd === null || totalEnd === undefined) return null;
    if (!lowerBank) return null;

    // Primary mode: explicit TOTAL_END bands from JSON.
    for (const tier of lowerBank.tiers) {
      if (tier.min_total !== undefined && tier.max_total !== undefined) {
        if (totalEnd >= tier.min_total && totalEnd <= tier.max_total) return tier.label;
      }
    }

    // Fallback mode: legacy percentage bands.
    const maxPossible = lowerMaxEnd('lower');
    const pct = (totalEnd / maxPossible) * 100;
    for (const tier of lowerBank.tiers) {
      if (tier.min_pct !== undefined && tier.max_pct !== undefined && pct >= tier.min_pct && pct <= tier.max_pct) {
        return tier.label;
      }
    }
    return 'NeedsSupport';
  }

  // ── Determine tier for upper (P4–P7) ─────
  function getUpperTier(divEnd) {
    if (!divEnd || !upperBank) return null;
    for (const tier of upperBank.tiers) {
      if (tier.divs.includes(divEnd)) return tier.label;
    }
    return null;
  }

  // ── Unified tier lookup ──────────────────
  function getTier(level, calc) {
    if (!calc) return null;
    return level === 'lower'
      ? getLowerTier(calc.TOTAL_END)
      : getUpperTier(calc.DIV_END);
  }

  // ── Deterministic signature of end-of-term marks ─
  function getMarksSignature(marks, level) {
    const subjects = (level === 'lower' ? CONFIG.subjects.lower : CONFIG.subjects.upper) || [];
    const m = marks || {};
    return subjects.map(s => `${s}:${m[`${s}_END`] ?? ''}`).join('|');
  }

  // ── Smart subject performance analysis ───
  // Identifies if a student is poor across the board, balanced, or has 1–2 specific weak subjects.
  function analyzeStudentSubjects(marks, level) {
    const subjects = (level === 'lower' ? CONFIG.subjects.lower : CONFIG.subjects.upper) || [];
    const m = marks || {};
    const entries = [];

    for (let i = 0; i < subjects.length; i++) {
      const code = subjects[i];
      const raw = m[`${code}_END`];
      if (raw === '' || raw === null || raw === undefined) {
        return {
          complete: false,
          allPoor: false,
          hasWeakSubject: false,
          weakSubject: null,
          weakSubjects: null,
          bestSubject: null,
        };
      }
      const num = Number(raw);
      if (Number.isNaN(num) || num < 0 || num > 100) {
        return {
          complete: false,
          allPoor: false,
          hasWeakSubject: false,
          weakSubject: null,
          weakSubjects: null,
          bestSubject: null,
        };
      }
      entries.push({
        code,
        label: SUBJECT_NAMES[code] || CONFIG.subjectLabels?.[code] || code,
        mark: num,
        order: i,
      });
    }

    if (entries.length < 2) {
      return {
        complete: false,
        allPoor: false,
        hasWeakSubject: false,
        weakSubject: null,
        weakSubjects: null,
        bestSubject: null,
      };
    }

    // Sort ascending by mark (lowest first; preserve subject order on ties)
    const sorted = [...entries].sort((a, b) => (a.mark - b.mark) || (a.order - b.order));
    const bestEntry = sorted[sorted.length - 1];
    const lowestEntry = sorted[0];

    // Check "poor across the board":
    // 3+ of 4 subjects in Upper Primary, or 4+ of 5 subjects in Lower Primary below 58%
    const poorThresholdCount = level === 'lower' ? 4 : 3;
    const poorCount = entries.filter(e => e.mark < 58).length;

    if (poorCount >= poorThresholdCount || bestEntry.mark < 55) {
      return {
        complete: true,
        allPoor: true,
        hasWeakSubject: false,
        weakSubject: null,
        weakSubjects: null,
        bestSubject: null,
      };
    }

    // Mean of the student's other subjects (excluding the lowest subject)
    const otherMarks = sorted.slice(1);
    const topMean = otherMarks.reduce((sum, e) => sum + e.mark, 0) / otherMarks.length;

    // A subject qualifies as a specific weak subject if:
    // - It is below 60% (credit/pass boundary), OR
    // - It lags at least 12 marks behind the mean of the student's other subjects.
    // It must also be at least 8 marks lower than the student's best subject so we never flag balanced marks.
    const candidates = sorted.slice(0, 2).filter(e => {
      if (e.code === bestEntry.code) return false;
      if ((bestEntry.mark - e.mark) < 8) return false;
      return e.mark < 60 || (topMean - e.mark) >= 12;
    });

    if (!candidates.length) {
      return {
        complete: true,
        allPoor: false,
        hasWeakSubject: false,
        weakSubject: null,
        weakSubjects: null,
        bestSubject: bestEntry.label,
      };
    }

    const weak1 = candidates[0];
    let weak2 = null;
    if (candidates.length > 1) {
      const second = candidates[1];
      // Include a 2nd weak subject if it is also < 60 or within 8 marks of the lowest subject
      if (second.mark < 60 || (second.mark - weak1.mark) <= 8) {
        weak2 = second;
      }
    }

    const weakSubject = weak1.label;
    const weakSubjects = weak2 ? `${weak1.label} and ${weak2.label}` : weak1.label;

    return {
      complete: true,
      allPoor: false,
      hasWeakSubject: true,
      weakSubject,
      weakSubjects,
      bestSubject: bestEntry.label,
    };
  }

  // ── Fill subject placeholders in a template ─
  function fillSubjectTemplate(template, analysis) {
    if (!template || !analysis || !analysis.hasWeakSubject) return template || '';
    return template
      .replace(/\{weak_subjects\}/g, analysis.weakSubjects || analysis.weakSubject || '')
      .replace(/\{weak_subject\}/g, analysis.weakSubject || '')
      .replace(/\{best_subject\}/g, analysis.bestSubject || '');
  }

  // ── Seeded PRNG & Fisher-Yates shuffle ───
  function hashSeed(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function createPrng(seedStr) {
    let state = hashSeed(seedStr) || 1;
    return function nextRand() {
      // Mulberry32
      state = (state + 0x6D2B79F5) >>> 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffleArray(arr, prng) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(prng() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  // ── Assign non-repeating division-matched comments across a class ─
  // Guarantees:
  // 1. Every student gets a comment strictly from their current division/tier.
  // 2. Within each division/tier, general and subject pools are shuffled without duplicates.
  // 3. Students who are poor across all subjects or balanced get 100% general comments.
  // 4. Students with 1–2 weak subjects get a ~50/50 balanced mix of subject-specific and general comments.
  function assignClassComments(students, level, session = {}, shuffleSeed = 0) {
    const bank = level === 'lower' ? lowerBank : upperBank;
    const result = {};
    if (!bank || !Array.isArray(students)) return result;

    const sessionKey = `${session?.cls || ''}_T${session?.term || ''}_Y${session?.year || ''}_S${shuffleSeed}`;
    const byTier = {};

    students.forEach(s => {
      const tier = getTier(level, s.calc);
      if (!tier) return;
      if (!byTier[tier]) byTier[tier] = [];
      const analysis = analyzeStudentSubjects(s.marks, level);
      const sig = getMarksSignature(s.marks, level);
      byTier[tier].push({ student: s, tier, analysis, sig });
    });

    for (const [tierLabel, group] of Object.entries(byTier)) {
      const assignedForTier = {};
      group.forEach(item => {
        assignedForTier[item.student.id] = {
          tier: tierLabel,
          sig: item.sig,
          analysis: item.analysis,
          teacher: '',
          ht: '',
        };
      });

      ['teacher', 'ht'].forEach(role => {
        const generalRaw = bank[role]?.[tierLabel] || [];
        const subjectRaw = bank[`${role}_subject`]?.[tierLabel] || [];
        if (!generalRaw.length) return;

        const prng = createPrng(`${sessionKey}_${tierLabel}_${role}`);
        const generalPool = shuffleArray(generalRaw, prng);
        const subjectPool = subjectRaw.length ? shuffleArray(subjectRaw, prng) : [];

        const generalOnly = [];
        const weakEligible = [];

        group.forEach(item => {
          if (item.analysis.hasWeakSubject && !item.analysis.allPoor && subjectPool.length > 0) {
            weakEligible.push(item);
          } else {
            generalOnly.push(item);
          }
        });

        let genIdx = 0;
        let subjIdx = 0;

        // Shuffle order of weak-eligible students so ~50% receive smart subject comments
        // and ~50% receive general division comments
        const shuffledWeak = shuffleArray(weakEligible, prng);
        const startParity = prng() < 0.5 ? 0 : 1;

        shuffledWeak.forEach((item, idx) => {
          const useSubjectComment = ((idx + startParity) % 2 === 0);
          if (useSubjectComment && subjectPool.length > 0) {
            const tmpl = subjectPool[subjIdx % subjectPool.length];
            subjIdx++;
            assignedForTier[item.student.id][role] = fillSubjectTemplate(tmpl, item.analysis);
          } else {
            assignedForTier[item.student.id][role] = generalPool[genIdx % generalPool.length];
            genIdx++;
          }
        });

        // General-only students (balanced marks or poor across all subjects) always get general comments
        const shuffledGeneralOnly = shuffleArray(generalOnly, prng);
        shuffledGeneralOnly.forEach(item => {
          assignedForTier[item.student.id][role] = generalPool[genIdx % generalPool.length];
          genIdx++;
        });
      });

      Object.assign(result, assignedForTier);
    }

    return result;
  }

  // ── Get single suggested comment (fallback helper) ─
  function suggest(level, role, tierLabel, studentId, studentMarks = null, session = {}, shuffleSeed = 0) {
    const bank = level === 'lower' ? lowerBank : upperBank;
    if (!bank || !tierLabel) return '';
    const generalPool = bank[role]?.[tierLabel] || [];
    if (!generalPool.length) return '';

    const analysis = studentMarks ? analyzeStudentSubjects(studentMarks, level) : null;
    const subjectPool = bank[`${role}_subject`]?.[tierLabel] || [];
    const sessionKey = `${session?.cls || ''}_${session?.term || ''}_${session?.year || ''}_${shuffleSeed}`;
    const prng = createPrng(`${studentId || ''}_${role || ''}_${tierLabel}_${sessionKey}`);

    if (analysis && analysis.hasWeakSubject && !analysis.allPoor && subjectPool.length > 0 && prng() < 0.5) {
      const idx = Math.floor(prng() * subjectPool.length);
      return fillSubjectTemplate(subjectPool[idx], analysis);
    }

    const index = Math.floor(prng() * generalPool.length);
    return generalPool[index];
  }

  // ── Get structured comments for a tier (for dropdown) ─
  // Returns { general: string[], subject: string[], all: string[], analysis }
  function getTierOptionsStructured(level, role, tierLabel, studentMarks = null) {
    const bank = level === 'lower' ? lowerBank : upperBank;
    if (!bank || !tierLabel) return { general: [], subject: [], all: [], analysis: null };

    const general = [...(bank[role]?.[tierLabel] || [])];
    const analysis = studentMarks ? analyzeStudentSubjects(studentMarks, level) : null;
    let subject = [];

    if (analysis && analysis.hasWeakSubject && !analysis.allPoor) {
      const rawTemplates = bank[`${role}_subject`]?.[tierLabel] || [];
      subject = rawTemplates.map(tmpl => fillSubjectTemplate(tmpl, analysis));
    }

    return {
      general,
      subject,
      all: [...subject, ...general],
      analysis,
    };
  }

  // ── Get all comments for a tier (flat array for dropdown) ─
  function getAllForTier(level, role, tierLabel, studentMarks = null) {
    return getTierOptionsStructured(level, role, tierLabel, studentMarks).all;
  }

  // ── Get ALL comments for a role (flattened for full dropdown) ─
  function getAll(level, role) {
    const bank = level === 'lower' ? lowerBank : upperBank;
    if (!bank) return [];
    const out = [];
    const tiers = bank.tiers || [];
    for (const tier of tiers) {
      const pool = bank[role]?.[tier.label] || [];
      pool.forEach(c => out.push({ tier: tier.label, comment: c }));
    }
    return out;
  }

  // ── Check if a comment text exists in a tier's valid options ─
  function isCommentInTier(level, role, tierLabel, commentText, studentMarks = null) {
    if (!commentText || !tierLabel) return false;
    const { all } = getTierOptionsStructured(level, role, tierLabel, studentMarks);
    return all.includes(commentText);
  }

  // ── Max possible end marks for lower ─────
  function lowerMaxEnd(level, subjects) {
    // 5 subjects × 100 each = 500
    return (subjects || CONFIG.subjects.lower).length * 100;
  }

  return {
    loadBanks,
    getLowerTier,
    getUpperTier,
    getTier,
    getMarksSignature,
    analyzeStudentSubjects,
    fillSubjectTemplate,
    assignClassComments,
    suggest,
    getTierOptionsStructured,
    getAllForTier,
    getAll,
    isCommentInTier,
    lowerMaxEnd,
  };
})();
