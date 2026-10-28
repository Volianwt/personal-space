import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  countOnline,
  initialBoard,
  LEVELS,
  SOLVED,
  solve,
  toggle,
  toggleMask,
} from '../src/lib/game.ts';

test('corner moves affect three nodes; centre moves affect five; rows do not wrap', () => {
  assert.equal(toggleMask(0), (1 << 0) | (1 << 1) | (1 << 3));
  assert.equal(toggleMask(4), (1 << 4) | (1 << 1) | (1 << 3) | (1 << 5) | (1 << 7));
  assert.equal(toggleMask(2) & (1 << 3), 0);
  assert.throws(() => toggleMask(-1), RangeError);
  assert.throws(() => toggleMask(9), RangeError);
});

test('each move is reversible for every board state', () => {
  for (let board = 0; board <= SOLVED; board++)
    for (let index = 0; index < 9; index++)
      assert.equal(toggle(toggle(board, index), index), board);
});

test('every shipped level begins unsolved and has a valid solution', () => {
  LEVELS.forEach((_, level) => {
    const board = initialBoard(level);
    assert.notEqual(board, SOLVED);
    const answer = solve(board);
    assert.ok(answer?.length);
    assert.equal(
      answer.reduce((current, index) => toggle(current, index), board),
      SOLVED,
    );
  });
  assert.equal(initialBoard(LEVELS.length), initialBoard(0));
  assert.equal(countOnline(SOLVED), 9);
  assert.equal(countOnline(0), 0);
});

test('hint solutions have the shortest length, checked against independent breadth-first distances', () => {
  const distances = new Map<number, number>([[SOLVED, 0]]);
  const queue = [SOLVED];
  for (let position = 0; position < queue.length; position++) {
    const current = queue[position];
    for (let index = 0; index < 9; index++) {
      const next = toggle(current, index);
      if (!distances.has(next)) {
        distances.set(next, distances.get(current)! + 1);
        queue.push(next);
      }
    }
  }
  for (let board = 0; board <= SOLVED; board++) {
    const answer = solve(board);
    if (!distances.has(board)) assert.equal(answer, null);
    else {
      assert.ok(answer);
      assert.equal(answer.length, distances.get(board));
    }
  }
});
