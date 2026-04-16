import type { GuessResult, GameState } from '@letreco/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export async function submitGuess(guess: string, playerId: string): Promise<GuessResult> {
  const res = await fetch(`${API_URL}/game/guess`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Player-Id': playerId,
    },
    body: JSON.stringify({ guess }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Erro desconhecido' }));
    throw new Error(error.message || 'Erro ao enviar tentativa');
  }

  return res.json();
}

export async function getGameStatus(playerId: string): Promise<GameState> {
  const res = await fetch(`${API_URL}/game/status?playerId=${playerId}`);
  if (!res.ok) throw new Error('Erro ao buscar status do jogo');
  return res.json();
}
