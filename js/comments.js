// ═══════════════════════════════════════════
//  ACADEX COMMENTS — Load & Suggest Engine
// ═══════════════════════════════════════════

const Comments = (() => {

  let lowerBank = null;
  let upperBank = null;

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
  function getLowerTier(totalEnd, maxPossible = 500) {
    if (totalEnd === null || totalEnd === undefined) return null;
    const pct = (totalEnd / maxPossible) * 100;
    if (!lowerBank) return null;
    for (const tier of lowerBank.tiers) {
      if (pct >= tier.min_pct && pct <= tier.max_pct) return tier.label;
    }
    return 'NeedsSupport';
  }

  // ── Determine tier for upper (P4–P6) ─────
  function getUpperTier(divEnd) {
    if (!divEnd || !upperBank) return null;
    for (const tier of upperBank.tiers) {
      if (tier.divs.includes(divEnd)) return tier.label;
    }
    return null;
  }

  // ── Get suggested comment ─────────────────
  function suggest(level, role, tierLabel, studentId) {
    const bank = level === 'lower' ? lowerBank : upperBank;
    if (!bank || !tierLabel) return '';
    const pool = bank[role]?.[tierLabel];
    if (!pool || !pool.length) return '';
    // Deterministic pick based on studentId hash so same student gets same suggestion
    const hash = studentId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return pool[hash % pool.length];
  }

  // ── Get all comments for a tier (for dropdown) ─
  function getAllForTier(level, role, tierLabel) {
    const bank = level === 'lower' ? lowerBank : upperBank;
    if (!bank || !tierLabel) return [];
    return bank[role]?.[tierLabel] || [];
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

  // ── Max possible end marks for lower ─────
  function lowerMaxEnd(level, subjects) {
    // 5 subjects × 100 each = 500
    return (subjects || CONFIG.subjects.lower).length * 100;
  }

  return { loadBanks, getLowerTier, getUpperTier, suggest, getAllForTier, getAll, lowerMaxEnd };
})();
