import {
  MATH_TIERS,
  QUALIFIER_FORMATS, RACE_FORMATS, FORMAT_WEIGHTS,
  UNKNOWN_POSITIONS, ADAPTIVE, VISUAL_FADING,
  CORRECT_MESSAGES, WRONG_MESSAGES,
} from '../config/mathConfig.js';

/**
 * Number Bonds Math Engine
 * Generates pedagogically sound math questions with adaptive difficulty.
 */

// Track last feedback message to avoid repeating
let lastCorrectMsgIndex = -1;
let lastWrongMsgIndex = -1;

export const MathEngine = {
  /**
   * Generate a question for the given tier and context.
   * @param {number} tier - 1-4
   * @param {'qualifier'|'in_race'} context
   * @param {Array} sessionHistory - previously asked questions this session
   * @param {Object} [options] - { forceFormat, showVisualAid }
   * @returns {Object} question object
   */
  generateQuestion(tier, context, sessionHistory = [], options = {}) {
    const tierConfig = MATH_TIERS[tier];
    if (!tierConfig) throw new Error(`Invalid tier: ${tier}`);

    const formats = context === 'qualifier' ? QUALIFIER_FORMATS : RACE_FORMATS;
    const format = options.forceFormat || this.pickWeightedFormat(formats);
    const timeLimit = context === 'qualifier' ? tierConfig.timeLimit : tierConfig.raceTimeLimit;

    let question;
    let attempts = 0;

    // Generate unique question (no exact repeats in session)
    do {
      question = this._buildQuestion(tier, tierConfig, format, context);
      attempts++;
    } while (attempts < 20 && this._isDuplicate(question, sessionHistory));

    question.timeLimit = timeLimit;
    question.tier = tier;
    question.format = format;
    question.context = context;
    question.showVisualAid = options.showVisualAid !== undefined
      ? options.showVisualAid
      : (context === 'in_race' ? false : true);

    return question;
  },

  /**
   * Build a single question based on tier and format.
   */
  _buildQuestion(tier, tierConfig, format, context) {
    const target = tierConfig.target;

    // Pick operation
    let operation = 'addition';
    if (tierConfig.includeSubtraction && Math.random() < 0.4) {
      operation = 'subtraction';
    }

    // Pick random split
    const partA = Math.floor(Math.random() * (target + 1));
    const partB = target - partA;

    // Skip zero bonds unless explicitly included
    if (!tierConfig.includeZeroBonds && (partA === 0 || partB === 0)) {
      return this._buildQuestion(tier, tierConfig, format, context);
    }

    // Pick unknown position
    const unknownPos = UNKNOWN_POSITIONS[Math.floor(Math.random() * UNKNOWN_POSITIONS.length)];

    // Build the question text and correct answer
    let questionText, correctAnswer, equationParts;

    if (operation === 'subtraction') {
      // Subtraction: target - partA = partB
      switch (unknownPos) {
        case 'result':
          questionText = `${target} - ${partA} = ?`;
          correctAnswer = partB;
          break;
        case 'second_addend':
          questionText = `${target} - ? = ${partB}`;
          correctAnswer = partA;
          break;
        case 'first_addend':
          questionText = `? - ${partA} = ${partB}`;
          correctAnswer = target;
          break;
      }
      equationParts = { whole: target, partA, partB, operation: 'subtraction' };
    } else {
      // Addition: partA + partB = target
      // Misconception-busting: 30% chance to show equals-sign on left (e.g., "10 = 3 + ?")
      const reverseEquals = Math.random() < 0.3;

      switch (unknownPos) {
        case 'result':
          questionText = reverseEquals ? `? = ${partA} + ${partB}` : `${partA} + ${partB} = ?`;
          correctAnswer = target;
          break;
        case 'second_addend':
          questionText = reverseEquals ? `${target} = ${partA} + ?` : `${partA} + ? = ${target}`;
          correctAnswer = partB;
          break;
        case 'first_addend':
          questionText = reverseEquals ? `${target} = ? + ${partB}` : `? + ${partB} = ${target}`;
          correctAnswer = partA;
          break;
      }
      equationParts = { whole: target, partA, partB, operation: 'addition' };
    }

    // Handle True/False format
    if (format === 'true_false') {
      return this._buildTrueFalse(tier, tierConfig, target, partA, partB, equationParts);
    }

    // Always generate MC options so any format can fall back to multiple choice
    const distractors = this.generateDistractors(correctAnswer, target, partA, partB, operation);
    const options = this._shuffleArray([correctAnswer, ...distractors]);

    return {
      questionText,
      correctAnswer,
      options,
      equationParts,
      unknownPos,
      target,
    };
  },

  /**
   * Build a True/False question.
   * Includes misconception-busting: "Is 10 - 7 the same as 7 - 10?"
   */
  _buildTrueFalse(tier, tierConfig, target, partA, partB, equationParts) {
    const isTrue = Math.random() < 0.5;

    // Tier 3+: occasionally test subtraction commutativity misconception
    if (tier >= 3 && Math.random() < 0.25) {
      const a = Math.floor(Math.random() * (target - 1)) + 1;
      return {
        questionText: `Is ${target} - ${a} the same as ${a} - ${target}?`,
        correctAnswer: false,
        options: [true, false],
        equationParts,
        unknownPos: null,
        target,
        isTrueFalse: true,
      };
    }

    if (isTrue) {
      // Show a correct equation
      return {
        questionText: `Is ${partA} + ${partB} = ${target}?`,
        correctAnswer: true,
        options: [true, false],
        equationParts,
        unknownPos: null,
        target,
        isTrueFalse: true,
      };
    } else {
      // Show an incorrect equation (off by 1 or 2)
      const wrongAnswer = target + (Math.random() < 0.5 ? 1 : -1);
      return {
        questionText: `Is ${partA} + ${partB} = ${wrongAnswer}?`,
        correctAnswer: false,
        options: [true, false],
        equationParts,
        unknownPos: null,
        target,
        isTrueFalse: true,
      };
    }
  },

  /**
   * Generate 3 plausible but wrong distractors.
   */
  generateDistractors(correct, target, partA, partB, operation) {
    const distractors = new Set();

    // Off-by-1 (most common error)
    if (correct + 1 <= target + 5) distractors.add(correct + 1);
    if (correct - 1 >= 0) distractors.add(correct - 1);

    // Echo the given part (e.g., for 3 + ? = 10, offer 3)
    if (partA !== correct && partA >= 0) distractors.add(partA);
    if (partB !== correct && partB >= 0) distractors.add(partB);

    // Off-by-2
    if (correct + 2 <= target + 5) distractors.add(correct + 2);
    if (correct - 2 >= 0) distractors.add(correct - 2);

    // Sum instead of difference (for subtraction)
    if (operation === 'subtraction') {
      const sum = partA + partB;
      if (sum !== correct) distractors.add(sum);
    }

    // The "other part" confusion
    const otherPart = target - correct;
    if (otherPart !== correct && otherPart >= 0) distractors.add(otherPart);

    // Remove the correct answer if it snuck in
    distractors.delete(correct);

    // Fill to 3 if needed
    let fill = 1;
    while (distractors.size < 3) {
      const candidate = correct + fill * (fill % 2 === 0 ? 1 : -1);
      if (candidate >= 0 && candidate !== correct) {
        distractors.add(candidate);
      }
      fill++;
      if (fill > 20) break;
    }

    return Array.from(distractors).slice(0, 3);
  },

  /**
   * Pick a format using weighted random selection.
   */
  pickWeightedFormat(formats) {
    const weights = formats.map(f => FORMAT_WEIGHTS[f] || 1);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < formats.length; i++) {
      r -= weights[i];
      if (r <= 0) return formats[i];
    }
    return formats[0];
  },

  /**
   * Check if a question is a duplicate of one already in session history.
   */
  _isDuplicate(question, history) {
    return history.some(h =>
      h.tier === question.tier &&
      h.target === question.target &&
      h.correctAnswer === question.correctAnswer &&
      h.questionText === question.questionText
    );
  },

  /**
   * Determine the visual aid state based on correct streak at this tier.
   * @param {number} correctCount - consecutive correct at this tier
   * @returns {'always'|'optional'|'hidden'}
   */
  getVisualAidState(correctCount) {
    if (correctCount < VISUAL_FADING.ALWAYS_SHOW_THRESHOLD) return 'always';
    if (correctCount < VISUAL_FADING.OPTIONAL_THRESHOLD) return 'optional';
    return 'hidden';
  },

  /**
   * Determine adaptive difficulty action based on recent performance.
   * @param {Object} tierProgress - from player_tier_progress table
   * @param {Array} recentResponses - last N question responses
   * @returns {{ action: string, showVisualAid?: boolean }}
   */
  getAdaptiveState(tierProgress, recentResponses) {
    const total = tierProgress?.total_questions || 0;

    // Check advance (need 20+ questions with 90%+ accuracy and fast responses)
    if (total >= ADAPTIVE.ADVANCE_MIN_QUESTIONS) {
      const last20 = recentResponses.slice(-20);
      if (last20.length >= 20) {
        const accuracy = last20.filter(r => r.is_correct).length / 20;
        const avgTime = last20.reduce((sum, r) => sum + (r.response_time_ms || 0), 0) / 20;
        if (accuracy >= ADAPTIVE.ADVANCE_ACCURACY && avgTime < ADAPTIVE.ADVANCE_MAX_RESPONSE_MS) {
          return { action: 'advance_tier' };
        }
      }
    }

    // Check drop (last 10 below 60%)
    const last10 = recentResponses.slice(-10);
    if (last10.length >= ADAPTIVE.DROP_MIN_QUESTIONS) {
      const accuracy = last10.filter(r => r.is_correct).length / 10;
      if (accuracy < ADAPTIVE.DROP_ACCURACY) {
        return { action: 'drop_tier' };
      }
    }

    // Check 3 wrong in a row
    const lastThree = recentResponses.slice(-3);
    if (lastThree.length === 3 && lastThree.every(r => !r.is_correct)) {
      return { action: 'easier_format', showVisualAid: true };
    }

    return { action: 'continue' };
  },

  /**
   * Generate a set of questions for a qualifier session.
   * @param {number} tier
   * @param {number} count
   * @param {Array} [masteredTiers] - tiers already mastered for review questions
   * @returns {Array}
   */
  generateQualifierSet(tier, count, masteredTiers = []) {
    const questions = [];
    const history = [];

    for (let i = 0; i < count; i++) {
      // 20% chance of review question from a mastered tier
      let questionTier = tier;
      if (masteredTiers.length > 0 && Math.random() < ADAPTIVE.REVIEW_PROBABILITY) {
        questionTier = masteredTiers[Math.floor(Math.random() * masteredTiers.length)];
      }

      const q = this.generateQuestion(questionTier, 'qualifier', history);
      questions.push(q);
      history.push(q);
    }

    return questions;
  },

  /**
   * Generate distance-based trigger points for in-race questions.
   * @param {number} raceDistance - total race distance
   * @param {number} count - number of questions (2-4)
   * @param {number} marginStart - no questions in first N px
   * @param {number} marginEnd - no questions in last N px
   * @returns {Array<number>} array of distance thresholds
   */
  generateRaceTriggers(raceDistance, count, marginStart, marginEnd) {
    const usableDistance = raceDistance - marginStart - marginEnd;
    const spacing = usableDistance / (count + 1);
    const triggers = [];
    for (let i = 1; i <= count; i++) {
      // Add some randomness (±15% of spacing)
      const jitter = (Math.random() - 0.5) * spacing * 0.3;
      triggers.push(Math.round(marginStart + spacing * i + jitter));
    }
    return triggers.sort((a, b) => a - b);
  },

  /**
   * Get a positive feedback message (never repeats consecutively).
   */
  getCorrectMessage() {
    let idx;
    do {
      idx = Math.floor(Math.random() * CORRECT_MESSAGES.length);
    } while (idx === lastCorrectMsgIndex && CORRECT_MESSAGES.length > 1);
    lastCorrectMsgIndex = idx;
    return CORRECT_MESSAGES[idx];
  },

  /**
   * Get a gentle wrong-answer message (never repeats consecutively).
   */
  getWrongMessage() {
    let idx;
    do {
      idx = Math.floor(Math.random() * WRONG_MESSAGES.length);
    } while (idx === lastWrongMsgIndex && WRONG_MESSAGES.length > 1);
    lastWrongMsgIndex = idx;
    return WRONG_MESSAGES[idx];
  },

  /**
   * Generate hint text for a question (3 progressive levels).
   * @param {Object} question
   * @param {number} level - 1, 2, or 3
   * @returns {string}
   */
  getHint(question, level) {
    const { equationParts, correctAnswer, target } = question;
    const { partA, partB, operation } = equationParts;

    switch (level) {
      case 1:
        // Restate in simpler terms
        if (operation === 'subtraction') {
          return `You have ${target}. Take away ${partA}. How many are left?`;
        }
        return `You have ${partA}. How many more do you need to make ${target}?`;

      case 2:
        // Visual hint text (the visual aid will be shown)
        if (operation === 'subtraction') {
          return `Start with ${target} dots. Cross out ${partA}. Count what's left!`;
        }
        return `Fill in ${partA} dots. Count the empty spaces to ${target}!`;

      case 3:
        // Worked example (show the answer)
        return `The answer is ${correctAnswer}! Because ${partA} + ${partB} = ${target}`;

      default:
        return '';
    }
  },

  _shuffleArray(arr) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },
};
