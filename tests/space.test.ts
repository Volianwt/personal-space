import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  blankEntry,
  calories,
  DEFAULT_SYSTEM_PROMPT,
  freshSpace,
  isDay,
  journalCsv,
  MOOD_LABELS,
  parseSpace,
} from '../src/lib/space.ts';

test('backup round-trip retains journal, meal, model, and chat data', () => {
  const data = freshSpace();
  const entry = blankEntry('2026-10-27');
  entry.text = '留下一点日常';
  entry.weight = 67.2;
  entry.meals = [{ id: 'm1', name: '午餐', calories: 600 }];
  data.entries[entry.date] = entry;
  data.conversations = [
    {
      id: 't1',
      title: '聊一聊',
      provider: 'ollama',
      model: 'local-model',
      updatedAt: new Date().toISOString(),
      messages: [{ id: 'u1', role: 'user', content: '你好', createdAt: new Date().toISOString() }],
    },
  ];
  assert.deepEqual(parseSpace(JSON.parse(JSON.stringify(data))), data);
  assert.equal(calories(entry), 600);
});
test('import rejects invalid dates, duplicate conversations, and nonfinite weights', () => {
  assert.equal(isDay('2026-02-30'), false);
  assert.equal(isDay('2024-02-29'), true);
  assert.equal(isDay('2026-13-01'), false);
  const data = freshSpace();
  data.entries['2026-10-27'] = { ...blankEntry('2026-10-27'), weight: Infinity };
  assert.throws(() => parseSpace(data));
  const invalid = freshSpace();
  invalid.conversations = [
    {
      id: 'a',
      title: 'test',
      provider: 'ollama',
      model: 'm',
      updatedAt: new Date().toISOString(),
      messages: [],
    },
  ];
  invalid.conversations.push({ ...invalid.conversations[0] });
  assert.throws(() => parseSpace(invalid));
});
test('unknown and secret fields are not restored into persisted state', () => {
  const data = freshSpace();
  const value = {
    ...data,
    apiKey: 'secret',
    preferences: {
      ...data.preferences,
      connection: { ...data.preferences.connection, apiKey: 'secret' },
    },
  };
  const restored = parseSpace(value);
  assert.equal(JSON.stringify(restored).includes('secret'), false);
});
test('CSV quotes multiline content and neutralizes spreadsheet formula prefixes', () => {
  const entry = blankEntry('2026-10-27');
  entry.text = '=HYPERLINK("bad")\n下一行';
  const csv = journalCsv({ [entry.date]: entry });
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes("'=HYPERLINK"));
  assert.ok(csv.includes('""bad""'));
  assert.ok(csv.includes('下一行'));
});

test('English labels preserve stored moods and original personal content', () => {
  const data = freshSpace();
  const entry = { ...blankEntry('2026-10-27'), mood: '平静' as const, text: '今天想保留的原文。' };
  data.entries[entry.date] = entry;
  const loaded = parseSpace(JSON.parse(JSON.stringify(data)));
  assert.equal(loaded.entries[entry.date].mood, '平静');
  assert.equal(loaded.entries[entry.date].text, entry.text);
  assert.equal(MOOD_LABELS[loaded.entries[entry.date].mood || '平静'], 'Calm');
  const csv = journalCsv(loaded.entries);
  assert.ok(csv.includes('"Date","Weight kg","Intake kcal","Mood","Journal"'));
  assert.ok(csv.includes('"Calm"'));
  assert.ok(csv.includes(entry.text));
});

test('only the previous built-in assistant prompt is migrated to English', () => {
  const old = freshSpace();
  old.preferences.connection.systemPrompt =
    '请用中文自然、简洁地交流。根据我的问题提供帮助，不要主动读取或猜测私人记录。';
  assert.equal(parseSpace(old).preferences.connection.systemPrompt, DEFAULT_SYSTEM_PROMPT);
  old.preferences.connection.systemPrompt = '保留我的自定义说明。';
  assert.equal(parseSpace(old).preferences.connection.systemPrompt, '保留我的自定义说明。');
});
