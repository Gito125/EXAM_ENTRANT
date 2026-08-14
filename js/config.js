// ═══════════════════════════════════════════
//  ACADEX CONFIG — Subjects, Grading, Divisions
// ═══════════════════════════════════════════

const CONFIG = {

  classes: ['P1','P2','P3','P4','P5','P6', 'P7'],

  classLevel: (cls) => parseInt(cls.replace('P','')) <= 3 ? 'lower' : 'upper',

  subjects: {
    lower: ['ENG','MTC','LITI','LITII','RE'],
    upper: ['ENG','MTC','SCI','SST'],
  },

  subjectLabels: {
    ENG: 'English', MTC: 'Mathematics',
    LITI: 'Literacy I', LITII: 'Literacy II',
    RE: 'Religious Education', SCI: 'Science', SST: 'SST',
  },

  maxMark: 100,

  // P4–P6 grading scale
  gradingScale: [
    { min: 90, max: 100, grade: 'D1', agg: 1 },
    { min: 80, max: 89,  grade: 'D2', agg: 2 },
    { min: 70, max: 79,  grade: 'C3', agg: 3 },
    { min: 60, max: 69,  grade: 'C4', agg: 4 },
    { min: 50, max: 59,  grade: 'C5', agg: 5 },
    { min: 44, max: 49,  grade: 'C6', agg: 6 },
    { min: 37, max: 43,  grade: 'P7', agg: 7 },
    { min: 30, max: 36,  grade: 'P8', agg: 8 },
    { min: 0,  max: 29,  grade: 'F9', agg: 9 },
  ],

  // P4–P6 division thresholds (based on total aggregates)
  divisionScale: [
    { max: 12,  div: 'I'   },
    { max: 24,  div: 'II'  },
    { max: 28,  div: 'III' },
    { max: 32,  div: 'IV'  },
    { max: 999, div: 'U'   },
  ],

  terms: [1, 2, 3],
};
