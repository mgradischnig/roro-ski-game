/**
 * Number Bonds Math Configuration
 * Tiers 1-4 implementing pedagogically sound progression
 */

export const MATH_TIERS = {
  1: {
    name: 'Bonds to 5',
    target: 5,
    description: 'Addition pairs that make 5',
    visualAid: 'five-frame',
    timeLimit: 12000,       // ms per question in qualifier
    raceTimeLimit: 10000,   // ms per question during race
    operations: ['addition'],
    includeSubtraction: false,
    includeZeroBonds: true,
  },
  2: {
    name: 'Bonds to 10',
    target: 10,
    description: 'Addition pairs that make 10',
    visualAid: 'ten-frame',
    timeLimit: 10000,
    raceTimeLimit: 8000,
    operations: ['addition'],
    includeSubtraction: false,
    includeZeroBonds: true,
  },
  3: {
    name: 'Subtraction & Fact Families',
    target: 10,
    description: 'Subtraction from 10 and fact families',
    visualAid: 'ten-frame',
    timeLimit: 10000,
    raceTimeLimit: 8000,
    operations: ['addition', 'subtraction'],
    includeSubtraction: true,
    includeZeroBonds: false,
  },
  4: {
    name: 'Bonds to 20',
    target: 20,
    description: 'Addition and subtraction to 20 with bridging through 10',
    visualAid: 'double-ten-frame',
    timeLimit: 8000,
    raceTimeLimit: 8000,
    operations: ['addition', 'subtraction'],
    includeSubtraction: true,
    includeZeroBonds: false,
  },
};

// Question formats available in each context
export const QUALIFIER_FORMATS = [
  'fill_blank',       // 7 + ___ = 10
  'multiple_choice',  // Pick from 4 options
  'true_false',       // Is 6 + 5 = 10?
  'part_whole',       // Cherry diagram with missing part
];

export const RACE_FORMATS = [
  'multiple_choice',  // Only MC during race (fast answers needed)
];

// Format weights for qualifier (higher = more likely)
export const FORMAT_WEIGHTS = {
  fill_blank: 3,
  multiple_choice: 4,
  true_false: 2,
  part_whole: 2,
};

// Unknown position types
export const UNKNOWN_POSITIONS = ['result', 'second_addend', 'first_addend'];

// Adaptive difficulty thresholds
export const ADAPTIVE = {
  ADVANCE_ACCURACY: 0.9,       // 90% over last 20 to advance
  ADVANCE_MIN_QUESTIONS: 20,
  ADVANCE_MAX_RESPONSE_MS: 5000,
  DROP_ACCURACY: 0.5,          // Below 50% over last 10 to drop
  DROP_MIN_QUESTIONS: 10,
  WRONG_STREAK_THRESHOLD: 3,   // 3 wrong in a row → easier format
  TARGET_ACCURACY: 0.85,       // Ideal success rate
  REVIEW_PROBABILITY: 0.2,     // 20% review questions from mastered tiers
};

// Visual aid fading rule
export const VISUAL_FADING = {
  ALWAYS_SHOW_THRESHOLD: 5,    // Always show visual for first 5 correct
  OPTIONAL_THRESHOLD: 10,      // Optional after 5, hidden after 10
};

// Qualifier settings
export const QUALIFIER = {
  QUESTIONS_PER_SESSION: 5,
  STAR_THRESHOLDS: {
    // Stars based on correct answers out of QUESTIONS_PER_SESSION
    5: { shield: true },
    4: { shield: false },
    3: { shield: false },
    2: { shield: false },
    1: { shield: false },
    0: { shield: false },
  },
};

// In-race math settings (optional math zones)
export const RACE_MATH = {
  // Zone spawning
  ZONE_COUNT_MIN: 3,            // minimum zones per race
  ZONE_COUNT_MAX: 4,            // maximum zones per race
  ZONE_SLOW_FACTOR: 0.6,       // Game speed during question (60% — gentler than before)
  ZONE_TIMER: 5000,             // 5 second timer (shorter, snappier)
  ZONE_COINS: 3,                // coins for correct answer (higher reward since optional)
  ZONE_WIDTH: 80,               // zone sprite width
  ZONE_HEIGHT: 60,              // zone sprite height

  // Boost/penalty settings
  BOOST_DURATION_FAST: 3000,    // ms boost for correct + fast answer
  BOOST_DURATION: 3000,         // ms boost for correct answer (same — reward generously)
  FAST_ANSWER_THRESHOLD: 3000,  // ms — "fast" if answered under this

  // No penalty for wrong answers (reward-only approach)
  NO_PENALTY: true,             // wrong answer = no slowdown, just show correct answer

  // Zone placement
  MIN_DISTANCE_BETWEEN: 800,    // min distance between zones
  MARGIN_START: 600,            // no zones in first 600px
  MARGIN_END: 600,              // no zones in last 600px
};

// Coins
export const COINS = {
  QUALIFIER_CORRECT: 1,
  RACE_CORRECT: 3,       // increased — reward for choosing to do math
  RACE_WIN: 5,
  CLEAN_RUN: 3,
};

// Positive feedback messages (rotate, never repeat consecutively)
export const CORRECT_MESSAGES = [
  'Great!', 'Nice one!', 'Amazing!', 'Super!',
  'Brilliant!', 'You got it!', 'Awesome!', 'Perfect!',
];

export const WRONG_MESSAGES = [
  'Almost!', 'Good try!', "Let's keep going!", 'Not quite!',
  'So close!', 'Try the next one!',
];
