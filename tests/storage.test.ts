import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readStored, writeStored } from '../src/lib/storage.ts';

const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
afterEach(() => {
  if (original) Object.defineProperty(globalThis, 'localStorage', original);
  else Reflect.deleteProperty(globalThis, 'localStorage');
});
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

test('malformed JSON and unexpected types do not break the interface', () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => '{broken' },
  });
  assert.equal(readStored('theme', false, isBoolean), false);
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => '"not a boolean"' },
  });
  assert.equal(readStored('theme', false, isBoolean), false);
});

test('blocked or unavailable storage degrades gracefully', () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('Storage blocked');
    },
  });
  assert.equal(readStored('theme', false, isBoolean), false);
  assert.equal(writeStored('theme', true), false);
});

test('valid data is read, and successful writes use JSON', () => {
  const values = new Map([['theme', 'true']]);
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  assert.equal(readStored('theme', false, isBoolean), true);
  assert.equal(writeStored('record', { moves: 3 }), true);
  assert.deepEqual(JSON.parse(values.get('record')!), { moves: 3 });
});
