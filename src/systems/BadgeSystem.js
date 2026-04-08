import { supabase } from './SupabaseClient.js';

/**
 * Badge definitions — each has a type, display name, description,
 * and a check function that returns true if the badge should be awarded.
 */
const BADGE_DEFINITIONS = [
  // --- Race badges ---
  {
    type: 'first_race',
    name: 'First Run',
    description: 'Complete your first race',
    icon: '🎿',
    check: (stats) => stats.totalRaces >= 1,
  },
  {
    type: 'first_win',
    name: 'Winner!',
    description: 'Win your first race',
    icon: '🥇',
    check: (stats) => stats.racesWon >= 1,
  },
  {
    type: 'win_streak_3',
    name: 'On Fire',
    description: 'Win 3 races in a row',
    icon: '🔥',
    check: (stats) => stats.currentWinStreak >= 3,
  },
  {
    type: 'win_streak_5',
    name: 'Unstoppable',
    description: 'Win 5 races in a row',
    icon: '⚡',
    check: (stats) => stats.currentWinStreak >= 5,
  },
  {
    type: 'races_10',
    name: 'Dedicated Skier',
    description: 'Complete 10 races',
    icon: '⛷️',
    check: (stats) => stats.totalRaces >= 10,
  },
  {
    type: 'races_25',
    name: 'Ski Pro',
    description: 'Complete 25 races',
    icon: '🏔️',
    check: (stats) => stats.totalRaces >= 25,
  },
  {
    type: 'clean_run',
    name: 'Clean Run',
    description: 'Finish a race without hitting any obstacles',
    icon: '✨',
    check: (stats) => stats.lastRaceClean === true,
  },
  {
    type: 'clean_runs_5',
    name: 'Smooth Operator',
    description: 'Get 5 clean runs',
    icon: '💎',
    check: (stats) => stats.totalCleanRuns >= 5,
  },

  // --- Math badges ---
  {
    type: 'math_correct_10',
    name: 'Math Starter',
    description: 'Answer 10 math questions correctly',
    icon: '📐',
    check: (stats) => stats.totalMathCorrect >= 10,
  },
  {
    type: 'math_correct_50',
    name: 'Math Whiz',
    description: 'Answer 50 math questions correctly',
    icon: '🧮',
    check: (stats) => stats.totalMathCorrect >= 50,
  },
  {
    type: 'math_correct_100',
    name: 'Math Master',
    description: 'Answer 100 math questions correctly',
    icon: '🎓',
    check: (stats) => stats.totalMathCorrect >= 100,
  },
  {
    type: 'perfect_qualifier',
    name: 'Perfect Score',
    description: 'Get 5/5 stars in a qualifier',
    icon: '⭐',
    check: (stats) => stats.lastQualifierStars === 5,
  },
  {
    type: 'math_streak_5',
    name: 'Hot Streak',
    description: 'Answer 5 math questions correctly in a row',
    icon: '🎯',
    check: (stats) => stats.bestMathStreak >= 5,
  },
  {
    type: 'math_streak_10',
    name: 'Flawless',
    description: '10 correct math answers in a row',
    icon: '💯',
    check: (stats) => stats.bestMathStreak >= 10,
  },

  // --- Tier mastery badges ---
  {
    type: 'tier1_mastery',
    name: 'Bonds to 5',
    description: 'Master Tier 1 — Bonds to 5',
    icon: '🌟',
    check: (stats) => stats.masteredTiers.includes(1),
  },
  {
    type: 'tier2_mastery',
    name: 'Bonds to 10',
    description: 'Master Tier 2 — Bonds to 10',
    icon: '🌟',
    check: (stats) => stats.masteredTiers.includes(2),
  },
  {
    type: 'tier3_mastery',
    name: 'Fact Families',
    description: 'Master Tier 3 — Subtraction & Fact Families',
    icon: '🌟',
    check: (stats) => stats.masteredTiers.includes(3),
  },
  {
    type: 'tier4_mastery',
    name: 'Bonds to 20',
    description: 'Master Tier 4 — Bonds to 20',
    icon: '🌟',
    check: (stats) => stats.masteredTiers.includes(4),
  },

  // --- Daily streak badges ---
  {
    type: 'streak_3_days',
    name: '3-Day Streak',
    description: 'Play 3 days in a row',
    icon: '📅',
    check: (stats) => stats.currentDayStreak >= 3,
  },
  {
    type: 'streak_7_days',
    name: 'Week Warrior',
    description: 'Play 7 days in a row',
    icon: '🗓️',
    check: (stats) => stats.currentDayStreak >= 7,
  },
];

/**
 * BadgeSystem — checks and awards badges after each session
 */
export const BadgeSystem = {
  /**
   * Get all badge definitions (for display)
   */
  getAllDefinitions() {
    return BADGE_DEFINITIONS;
  },

  /**
   * Get a badge definition by type
   */
  getDefinition(badgeType) {
    return BADGE_DEFINITIONS.find(b => b.type === badgeType);
  },

  /**
   * Load existing badges for a player from Supabase
   */
  async getPlayerBadges(playerId) {
    const { data, error } = await supabase
      .from('badges')
      .select('*')
      .eq('player_id', playerId)
      .order('earned_at', { ascending: true });

    if (error) {
      console.error('Failed to load badges:', error);
      return [];
    }
    return data;
  },

  /**
   * Check for and award new badges after a session.
   * Returns an array of newly awarded badge definitions.
   *
   * @param {string} playerId
   * @param {Object} sessionData — data about the just-completed session
   * @returns {Array} newly earned badge definitions with { type, name, description, icon }
   */
  async checkAndAward(playerId, sessionData) {
    // 1. Load existing badges to know what the player already has
    const existingBadges = await this.getPlayerBadges(playerId);
    const existingTypes = new Set(existingBadges.map(b => b.badge_type));

    // 2. Build a stats object from session data + aggregated data
    const stats = await this._buildStats(playerId, sessionData);

    // 3. Check each badge definition
    const newBadges = [];
    for (const badge of BADGE_DEFINITIONS) {
      if (existingTypes.has(badge.type)) continue; // already earned
      try {
        if (badge.check(stats)) {
          newBadges.push(badge);
        }
      } catch (e) {
        // Skip badge if check fails (defensive)
        console.warn(`Badge check failed for ${badge.type}:`, e);
      }
    }

    // 4. Insert new badges into Supabase
    if (newBadges.length > 0) {
      const rows = newBadges.map(b => ({
        player_id: playerId,
        badge_type: b.type,
      }));
      const { error } = await supabase.from('badges').insert(rows);
      if (error) {
        console.error('Failed to award badges:', error);
      }
    }

    return newBadges;
  },

  /**
   * Build aggregated stats for badge checks
   * Combines session data with historical data from Supabase
   */
  async _buildStats(playerId, sessionData) {
    // Fetch player record
    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();

    // Fetch tier progress
    const { data: tierProgress } = await supabase
      .from('player_tier_progress')
      .select('*')
      .eq('player_id', playerId);

    // Fetch recent sessions for win streak calculation
    const { data: recentSessions } = await supabase
      .from('sessions')
      .select('finish_position, clean_run')
      .eq('player_id', playerId)
      .order('played_at', { ascending: false })
      .limit(20);

    // Fetch total math correct from question_responses
    const { count: totalMathCorrect } = await supabase
      .from('question_responses')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', playerId)
      .eq('is_correct', true);

    // Calculate best math streak from recent responses
    const { data: recentResponses } = await supabase
      .from('question_responses')
      .select('is_correct')
      .eq('player_id', playerId)
      .order('answered_at', { ascending: false })
      .limit(50);

    // Fetch daily streaks for consecutive day calculation
    const { data: dailyStreaks } = await supabase
      .from('daily_streaks')
      .select('play_date')
      .eq('player_id', playerId)
      .order('play_date', { ascending: false })
      .limit(30);

    // --- Compute derived stats ---

    // Current win streak (count consecutive 1st places from most recent)
    let currentWinStreak = 0;
    if (recentSessions) {
      for (const s of recentSessions) {
        if (s.finish_position === 1) currentWinStreak++;
        else break;
      }
    }

    // Total clean runs
    let totalCleanRuns = 0;
    if (recentSessions) {
      totalCleanRuns = recentSessions.filter(s => s.clean_run).length;
    }

    // Best math streak (consecutive correct)
    let bestMathStreak = 0;
    let currentMathStreak = 0;
    if (recentResponses) {
      for (const r of recentResponses) {
        if (r.is_correct) {
          currentMathStreak++;
          bestMathStreak = Math.max(bestMathStreak, currentMathStreak);
        } else {
          currentMathStreak = 0;
        }
      }
    }

    // Mastered tiers
    const masteredTiers = (tierProgress || [])
      .filter(tp => tp.mastery)
      .map(tp => tp.tier);

    // Current day streak (consecutive days)
    let currentDayStreak = 0;
    if (dailyStreaks && dailyStreaks.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      let checkDate = new Date(today);
      for (const ds of dailyStreaks) {
        const playDate = ds.play_date;
        const expected = checkDate.toISOString().split('T')[0];
        if (playDate === expected) {
          currentDayStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    return {
      // Player stats
      totalRaces: player?.total_races || 0,
      racesWon: player?.races_won || 0,

      // Current session
      lastRaceClean: sessionData.clean_run || false,
      lastQualifierStars: sessionData.qualifier_stars || 0,

      // Aggregated
      currentWinStreak,
      totalCleanRuns,
      totalMathCorrect: totalMathCorrect || 0,
      bestMathStreak,
      masteredTiers,
      currentDayStreak,
    };
  },
};
