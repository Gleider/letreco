import type { GameStats } from '@letreco/shared';

const PLAYER_ID_KEY = 'letreco-player-id';
const STATS_KEY = 'letreco-stats';

export function getPlayerId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

export function getStats(): GameStats {
  if (typeof window === 'undefined') {
    return defaultStats();
  }
  const raw = localStorage.getItem(STATS_KEY);
  if (!raw) return defaultStats();
  return JSON.parse(raw);
}

export function saveStats(stats: GameStats): void {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function updateStatsAfterGame(won: boolean, attempts: number): GameStats {
  const stats = getStats();
  stats.gamesPlayed++;
  if (won) {
    stats.gamesWon++;
    stats.currentStreak++;
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
    stats.distribution[attempts] = (stats.distribution[attempts] || 0) + 1;
  } else {
    stats.currentStreak = 0;
  }
  saveStats(stats);
  return stats;
}

function defaultStats(): GameStats {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
  };
}
