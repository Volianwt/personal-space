export const SIZE = 3;
export const NODE_COUNT = SIZE * SIZE;
export const SOLVED = (1 << NODE_COUNT) - 1;

/** Each move toggles one node and its orthogonal neighbours. */
export function toggleMask(index: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= NODE_COUNT)
    throw new RangeError('Invalid node');
  const row = Math.floor(index / SIZE);
  const col = index % SIZE;
  let mask = 0;
  for (const [dr, dc] of [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) mask |= 1 << (r * SIZE + c);
  }
  return mask;
}

export function toggle(board: number, index: number): number {
  return board ^ toggleMask(index);
}

/** Only 512 move combinations exist on a 3x3 board; exhaustive search is small and deterministic. */
export function solve(board: number): number[] | null {
  let best: number[] | null = null;
  for (let bits = 0; bits <= SOLVED; bits++) {
    let candidate = board;
    const moves: number[] = [];
    for (let i = 0; i < NODE_COUNT; i++)
      if (bits & (1 << i)) {
        candidate = toggle(candidate, i);
        moves.push(i);
      }
    if (candidate === SOLVED && (best === null || moves.length < best.length)) best = moves;
  }
  return best;
}

export const LEVELS = [
  { name: 'First connection', sequence: [0, 4, 8] },
  { name: 'A little interference', sequence: [1, 3, 4, 7] },
  { name: 'Back online', sequence: [0, 2, 3, 4, 7, 8] },
];

export function initialBoard(level: number): number {
  const chosen = LEVELS[((level % LEVELS.length) + LEVELS.length) % LEVELS.length];
  return chosen.sequence.reduce((board, index) => toggle(board, index), SOLVED);
}

export function countOnline(board: number): number {
  let count = 0;
  for (let i = 0; i < NODE_COUNT; i++) if (board & (1 << i)) count++;
  return count;
}
