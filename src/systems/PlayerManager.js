import { supabase } from './SupabaseClient.js';

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
};
