import { supabase } from './SupabaseClient.js';
import { DIFFICULTY_PROGRESSION } from '../config/gameConfig.js';

// In-memory cache of the current player
let currentPlayer = null;

export const PlayerManager = {
  /**
   * Load all players from Supabase
   * @returns {Array} players
   */
  async loadAllPlayers() {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to load players:', error);
      return [];
    }
    return data;
  },

  /**
   * Validate a player's PIN
   * @param {string} playerId
   * @param {string} pin - 4-digit PIN string
   * @returns {boolean}
   */
  async validatePin(playerId, pin) {
    const { data, error } = await supabase
      .from('players')
      .select('pin')
      .eq('id', playerId)
      .single();

    if (error || !data) return false;
    return data.pin === pin;
  },

  /**
   * Set the current player in memory
   * @param {Object} player
   */
  setCurrentPlayer(player) {
    currentPlayer = player;
  },

  /**
   * Get the current player
   * @returns {Object|null}
   */
  getCurrentPlayer() {
    return currentPlayer;
  },

  /**
   * Create a new player with initial tier progress
   * @param {string} name
   * @param {string} pin - 4-digit string
   * @param {string} avatar - color key
   * @returns {Object|null} the created player
   */
  async createPlayer(name, pin, avatar) {
    const { data: player, error } = await supabase
      .from('players')
      .insert({ name, pin, avatar })
      .select()
      .single();

    if (error) {
      console.error('Failed to create player:', error);
      return null;
    }

    // Initialize tier progress rows (tiers 1-4)
    const tierRows = [1, 2, 3, 4].map(tier => ({
      player_id: player.id,
      tier,
    }));
    await supabase.from('player_tier_progress').insert(tierRows);

    return player;
  },

  /**
   * Update player stats after a race
   * @param {string} playerId
   * @param {Object} updates - fields to update
   */
  async updatePlayerStats(playerId, updates) {
    const { error } = await supabase
      .from('players')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', playerId);

    if (error) {
      console.error('Failed to update player stats:', error);
    }
  },

  /**
   * Get tier progress for a player
   * @param {string} playerId
   * @returns {Array}
   */
  async getTierProgress(playerId) {
    const { data, error } = await supabase
      .from('player_tier_progress')
      .select('*')
      .eq('player_id', playerId)
      .order('tier', { ascending: true });

    if (error) {
      console.error('Failed to load tier progress:', error);
      return [];
    }
    return data;
  },

  /**
   * Save a race session and all question responses
   * @param {Object} sessionData
   * @param {Array} questionResponses
   * @returns {string|null} session id
   */
  async saveSession(sessionData, questionResponses = []) {
    // Insert session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert(sessionData)
      .select('id')
      .single();

    if (sessionError) {
      console.error('Failed to save session:', sessionError);
      return null;
    }

    // Batch insert question responses with session_id
    if (questionResponses.length > 0) {
      const rows = questionResponses.map(qr => ({
        ...qr,
        session_id: session.id,
      }));
      const { error: qrError } = await supabase
        .from('question_responses')
        .insert(rows);

      if (qrError) {
        console.error('Failed to save question responses:', qrError);
      }
    }

    // Update daily streak
    const today = new Date().toISOString().split('T')[0];
    await supabase
      .from('daily_streaks')
      .upsert(
        {
          player_id: sessionData.player_id,
          play_date: today,
          races_played: 1,
          questions_answered: questionResponses.length,
        },
        { onConflict: 'player_id,play_date' }
      );

    return session.id;
  },

  /**
   * Update tier progress with session results
   */
  async updateTierProgress(playerId, tier, sessionResponses) {
    const tierResponses = sessionResponses.filter(r => r.tier === tier);
    if (tierResponses.length === 0) return;

    const correct = tierResponses.filter(r => r.is_correct).length;

    const { data: progress } = await supabase
      .from('player_tier_progress')
      .select('*')
      .eq('player_id', playerId)
      .eq('tier', tier)
      .single();

    if (!progress) return;

    // Compute streak
    let streak = progress.current_streak || 0;
    for (const r of tierResponses) {
      streak = r.is_correct ? streak + 1 : 0;
    }

    const newTotal = (progress.total_questions || 0) + tierResponses.length;
    const newCorrect = (progress.correct_answers || 0) + correct;

    await supabase
      .from('player_tier_progress')
      .update({
        total_questions: newTotal,
        correct_answers: newCorrect,
        current_streak: streak,
        best_streak: Math.max(progress.best_streak || 0, streak),
        updated_at: new Date().toISOString(),
      })
      .eq('player_id', playerId)
      .eq('tier', tier);
  },

  /**
   * Fetch recent question responses for a tier (for adaptive state)
   */
  async getRecentResponses(playerId, tier, limit = 20) {
    const { data, error } = await supabase
      .from('question_responses')
      .select('is_correct, response_time_ms')
      .eq('player_id', playerId)
      .eq('tier', tier)
      .order('answered_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch recent responses:', error);
      return [];
    }
    return (data || []).reverse();
  },

  /**
   * Advance player to next tier, mark old tier as mastered
   */
  async advanceTier(playerId, currentTier) {
    const newTier = Math.min(currentTier + 1, 4);
    if (newTier === currentTier) return null;

    await supabase
      .from('player_tier_progress')
      .update({ mastery: true })
      .eq('player_id', playerId)
      .eq('tier', currentTier);

    await this.updatePlayerStats(playerId, { current_tier: newTier });

    if (currentPlayer) currentPlayer.current_tier = newTier;
    return newTier;
  },

  /**
   * Drop player to previous tier
   */
  async dropTier(playerId, currentTier) {
    if (currentTier <= 1) return null;
    const newTier = currentTier - 1;

    await this.updatePlayerStats(playerId, { current_tier: newTier });

    if (currentPlayer) currentPlayer.current_tier = newTier;
    return newTier;
  },

  /**
   * Delete a player and all their data (CASCADE handles related rows)
   * @param {string} playerId
   */
  async deletePlayer(playerId) {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId);

    if (error) {
      console.error('Failed to delete player:', error);
      return false;
    }
    return true;
  },

  /**
   * Course difficulty to race at (1-4), independent of the maths tier.
   *
   * race_difficulty is NULL by default, meaning "auto": follow current_tier,
   * which is the historical behaviour. A parent can pin it so a child who is
   * strong at maths but struggling on the slope isn't forced onto the hardest
   * course by their maths progress.
   */
  getRaceDifficulty(player) {
    const explicit = player?.race_difficulty;
    if (explicit >= 1 && explicit <= 4) return explicit;
    return Math.min(Math.max(player?.current_tier || 1, 1), 4);
  },

  /** Silent comeback assist, 0-3. See updateAssistLevel(). */
  getAssistLevel(player) {
    return Math.min(Math.max(player?.assist_level || 0, 0), 3);
  },

  /**
   * Pin the course difficulty, or pass null to return it to auto.
   *
   * Stamps difficulty_changed_at so the auto-adaptation windows in
   * updateAssistLevel() and updateRaceDifficulty() start counting fresh
   * from here: a parent's manual change invalidates the race history that
   * led up to it, exactly like an automatic promotion/demotion does.
   */
  async setRaceDifficulty(playerId, difficulty) {
    const changedAt = new Date().toISOString();
    await this.updatePlayerStats(playerId, {
      race_difficulty: difficulty,
      difficulty_changed_at: changedAt,
    });
    if (currentPlayer && currentPlayer.id === playerId) {
      currentPlayer.race_difficulty = difficulty;
      currentPlayer.difficulty_changed_at = changedAt;
    }
  },

  /**
   * Silently adjust the comeback assist level (0-3) after a race, based on
   * the player's last 3 sessions across BOTH games (frustration on the ski
   * hill and the go-kart track isn't game-specific) — but only sessions
   * played since the last race_difficulty change (difficulty_changed_at).
   * A level change invalidates the evidence that led to it: the races just
   * before a demotion are the very struggles that caused it, and races just
   * before a promotion were raced against the OLD, easier course, so
   * counting either here would let the assist immediately re-fire before
   * the player has raced even once at the new level.
   *
   * This is deliberately never surfaced to the player — a child shown
   * "difficulty lowered" learns the wrong lesson. It's a quiet nudge only:
   * two or more bottom-of-the-pack finishes (position >= 3) in the last 3
   * qualifying races raises the assist by one level, and it's handed back
   * automatically (lowered by one) once they start winning again (two or
   * more 1st-place finishes in the last 3). Anything in between leaves it
   * alone.
   *
   * @param {string} playerId
   * @returns {number} the assist level now in effect (0-3)
   */
  async updateAssistLevel(playerId) {
    // Read the authoritative current level from the DB (not the in-memory
    // cache, which may be stale) — this is also what we return if there's
    // not enough race history yet to act on. Fetched before the sessions
    // query below because that query needs difficulty_changed_at to filter
    // on.
    const { data: playerRow } = await supabase
      .from('players')
      .select('assist_level, difficulty_changed_at')
      .eq('id', playerId)
      .single();

    if (!playerRow) return 0;

    const current = Math.min(Math.max(playerRow.assist_level || 0, 0), 3);

    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('finish_position')
      .eq('player_id', playerId)
      .not('finish_position', 'is', null)
      .gt('played_at', playerRow.difficulty_changed_at)
      .order('played_at', { ascending: false })
      .limit(3);

    // A new player, or one who just changed level, shouldn't get assisted
    // off two races — straight after a change there are zero qualifying
    // sessions, so this returns current unchanged until enough races have
    // been played at the new level.
    if (error || !sessions || sessions.length < 3) {
      return current;
    }

    const strugglingFinishes = sessions.filter(s => s.finish_position >= 3).length;
    const winningFinishes = sessions.filter(s => s.finish_position === 1).length;

    let next = current;
    if (strugglingFinishes >= 2) {
      next = Math.min(current + 1, 3);
    } else if (winningFinishes >= 2) {
      next = Math.max(current - 1, 0);
    }

    if (next === current) return current;

    await this.updatePlayerStats(playerId, { assist_level: next });
    if (currentPlayer && currentPlayer.id === playerId) {
      currentPlayer.assist_level = next;
    }
    return next;
  },

  /**
   * Silently move the course difficulty level (1-4) up or down after a race
   * — the upward half of the assist system.
   *
   * updateAssistLevel() above absorbs a rough patch within a level, but it
   * only ever makes things easier, so a player who has genuinely outgrown
   * their course would be stuck there forever. This moves the level itself,
   * but only once the assist has already had its say, so the two can't
   * fight each other:
   *
   *   PROMOTE — the assist needed no help at all (assistLevel is at or below
   *   PROMOTE_MAX_ASSIST) AND at least PROMOTE_WINS of the last
   *   PROMOTE_WINDOW finishes were 1st place.
   *
   *   DEMOTE — the assist is already maxed out (assistLevel is at or above
   *   DEMOTE_MIN_ASSIST) AND at least DEMOTE_STRUGGLES of the last
   *   DEMOTE_WINDOW finishes were 3rd/4th place.
   *
   * Both windows only count races played since the last race_difficulty
   * change (difficulty_changed_at). A level change invalidates the evidence
   * that led to it: the wins that just promoted a player were raced against
   * the OLD, easier course, and the losses that just demoted them are
   * exactly what caused the demotion — counting either here would let a
   * promotion snap straight back, or a demotion cascade straight through
   * further levels, before the player has raced even once at the new
   * level. The exact-length window checks below already return "no change"
   * until enough qualifying races exist.
   *
   * Every level change resets assist_level to ASSIST_AFTER_CHANGE. That's
   * both a cushion at the new level and the hysteresis for this function —
   * it's far from both the 0 and 3 triggers above, so neither promotion nor
   * demotion can re-fire for several races right after a change.
   *
   * @param {string} playerId
   * @param {number} assistLevel - the assist level already in effect this
   *   race (the return value of updateAssistLevel), so both decisions are
   *   made from the same, freshly-computed reading.
   * @returns {number|null} the race_difficulty now in effect (1-4), or null
   *   if there wasn't enough data (missing sessions/player row) to evaluate.
   */
  async updateRaceDifficulty(playerId, assistLevel) {
    // Fetched before the sessions query below because that query needs
    // difficulty_changed_at to filter on.
    const { data: playerRow } = await supabase
      .from('players')
      .select('race_difficulty, current_tier, difficulty_changed_at')
      .eq('id', playerId)
      .single();

    if (!playerRow) return null;

    // getRaceDifficulty() materialises a NULL race_difficulty into a
    // concrete level — the first move a player makes locks that in.
    const current = this.getRaceDifficulty(playerRow);

    const window = Math.max(
      DIFFICULTY_PROGRESSION.PROMOTE_WINDOW,
      DIFFICULTY_PROGRESSION.DEMOTE_WINDOW
    );
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('finish_position')
      .eq('player_id', playerId)
      .not('finish_position', 'is', null)
      .gt('played_at', playerRow.difficulty_changed_at)
      .order('played_at', { ascending: false })
      .limit(window);

    if (error || !sessions) return null;

    // Sessions are newest-first, so the first N entries are the N most
    // recent — no re-sorting needed.
    const promoteSlice = sessions.slice(0, DIFFICULTY_PROGRESSION.PROMOTE_WINDOW);
    const demoteSlice = sessions.slice(0, DIFFICULTY_PROGRESSION.DEMOTE_WINDOW);

    let next = current;
    if (
      assistLevel <= DIFFICULTY_PROGRESSION.PROMOTE_MAX_ASSIST &&
      promoteSlice.length === DIFFICULTY_PROGRESSION.PROMOTE_WINDOW &&
      promoteSlice.filter(s => s.finish_position === 1).length >= DIFFICULTY_PROGRESSION.PROMOTE_WINS
    ) {
      next = Math.min(current + 1, DIFFICULTY_PROGRESSION.MAX_LEVEL);
    } else if (
      assistLevel >= DIFFICULTY_PROGRESSION.DEMOTE_MIN_ASSIST &&
      demoteSlice.length === DIFFICULTY_PROGRESSION.DEMOTE_WINDOW &&
      demoteSlice.filter(s => s.finish_position >= 3).length >= DIFFICULTY_PROGRESSION.DEMOTE_STRUGGLES
    ) {
      next = Math.max(current - 1, DIFFICULTY_PROGRESSION.MIN_LEVEL);
    }

    // Covers no trigger firing at all, and also a promote/demote trigger
    // firing right at the MAX_LEVEL cap / MIN_LEVEL floor — either way,
    // nothing to persist.
    if (next === current) return current;

    const changedAt = new Date().toISOString();
    await this.updatePlayerStats(playerId, {
      race_difficulty: next,
      assist_level: DIFFICULTY_PROGRESSION.ASSIST_AFTER_CHANGE,
      difficulty_changed_at: changedAt,
    });
    if (currentPlayer && currentPlayer.id === playerId) {
      currentPlayer.race_difficulty = next;
      currentPlayer.assist_level = DIFFICULTY_PROGRESSION.ASSIST_AFTER_CHANGE;
      currentPlayer.difficulty_changed_at = changedAt;
    }
    return next;
  },
};
