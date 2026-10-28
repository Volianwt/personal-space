export type Page = 'today' | 'play' | 'journal' | 'chat';
export type Provider = 'ollama' | 'lmstudio' | 'openai' | 'custom';
export type Mood = '轻松' | '平静' | '一般' | '疲惫' | '低落';
export type Meal = { id: string; name: string; calories: number };
export type Entry = {
  date: string;
  text: string;
  mood: Mood | '';
  weight: number | null;
  meals: Meal[];
  updatedAt: string;
};
export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  model?: string;
};
export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: string;
  provider: Provider;
  model: string;
};
export type Connection = {
  provider: Provider;
  baseUrl: string;
  model: string;
  systemPrompt: string;
};
export type SpaceData = {
  version: 2;
  preferences: { name: string; night: boolean; calorieGoal: number | null; connection: Connection };
  entries: Record<string, Entry>;
  conversations: Conversation[];
};
export type UpdateSpace = (update: (current: SpaceData) => SpaceData) => void;
export const SPACE_KEY = 'tao.daily-space.v2';
export const MOODS: Mood[] = ['轻松', '平静', '一般', '疲惫', '低落'];
// Stable stored values preserve existing journals and v2 backups.
export const MOOD_LABELS: Record<Mood, string> = {
  轻松: 'Relaxed',
  平静: 'Calm',
  一般: 'Okay',
  疲惫: 'Tired',
  低落: 'Low',
};
export const DEFAULT_SYSTEM_PROMPT =
  'Speak naturally and concisely in English. Help with my questions without inferring or accessing private records.';
const LEGACY_DEFAULT_PROMPT =
  '请用中文自然、简洁地交流。根据我的问题提供帮助，不要主动读取或猜测私人记录。';
export const PROVIDERS: Record<Provider, { name: string; url: string; local: boolean }> = {
  ollama: { name: 'Ollama · Local model', url: 'http://127.0.0.1:11434', local: true },
  lmstudio: { name: 'LM Studio · Local model', url: 'http://127.0.0.1:1234/v1', local: true },
  openai: { name: 'OpenAI · Cloud API', url: 'https://api.openai.com/v1', local: false },
  custom: { name: 'Other compatible API', url: '', local: false },
};

export function freshSpace(): SpaceData {
  return {
    version: 2,
    preferences: {
      name: 'Max',
      night: false,
      calorieGoal: null,
      connection: {
        provider: 'ollama',
        baseUrl: PROVIDERS.ollama.url,
        model: '',
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
      },
    },
    entries: {},
    conversations: [],
  };
}
export function uid(): string {
  return crypto.randomUUID();
}
export function localDay(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  return ['year', 'month', 'day']
    .map((type) => parts.find((p) => p.type === type)!.value)
    .join('-');
}
export function isDay(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
  );
}
export function blankEntry(date: string): Entry {
  return { date, text: '', mood: '', weight: null, meals: [], updatedAt: new Date().toISOString() };
}
export function calories(entry?: Entry): number {
  return entry?.meals.reduce((sum, meal) => sum + meal.calories, 0) ?? 0;
}
const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;
const timestamp = (v: unknown): v is string =>
  typeof v === 'string' && Number.isFinite(Date.parse(v));
const number = (v: unknown, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
export const isProvider = (v: unknown): v is Provider =>
  typeof v === 'string' && Object.hasOwn(PROVIDERS, v);

/** Validates and reconstructs imports, dropping unknown fields (including potential API keys). */
export function parseSpace(value: unknown): SpaceData {
  if (
    !object(value) ||
    value.version !== 2 ||
    !object(value.preferences) ||
    !object(value.entries) ||
    !Array.isArray(value.conversations)
  )
    throw new Error('Invalid backup format. Choose a v2 JSON backup exported by this app.');
  const p = value.preferences;
  const c = p.connection;
  if (
    !text(p.name, 40) ||
    typeof p.night !== 'boolean' ||
    !(p.calorieGoal === null || number(p.calorieGoal, 1, 20000)) ||
    !object(c) ||
    !isProvider(c.provider) ||
    !text(c.baseUrl, 500) ||
    !text(c.model, 200) ||
    !text(c.systemPrompt, 5000)
  )
    throw new Error('Settings are incomplete or contain invalid values.');
  const result = freshSpace();
  result.preferences = {
    name: p.name,
    night: p.night,
    calorieGoal: p.calorieGoal as number | null,
    connection: {
      provider: c.provider,
      baseUrl: c.baseUrl,
      model: c.model,
      systemPrompt:
        c.systemPrompt === LEGACY_DEFAULT_PROMPT ? DEFAULT_SYSTEM_PROMPT : c.systemPrompt,
    },
  };
  const entries = Object.entries(value.entries);
  if (entries.length > 10000 || value.conversations.length > 1000)
    throw new Error('The backup contains too many records.');
  for (const [date, entry] of entries) {
    if (
      !isDay(date) ||
      !object(entry) ||
      entry.date !== date ||
      !text(entry.text, 50000) ||
      !(entry.mood === '' || MOODS.includes(entry.mood as Mood)) ||
      !(entry.weight === null || number(entry.weight, 1, 500)) ||
      !timestamp(entry.updatedAt) ||
      !Array.isArray(entry.meals) ||
      entry.meals.length > 100
    )
      throw new Error(`Invalid journal or health record: ${date}`);
    const meals: Meal[] = entry.meals.map((meal) => {
      if (
        !object(meal) ||
        !text(meal.id, 100) ||
        !text(meal.name, 200) ||
        !number(meal.calories, 0, 20000)
      )
        throw new Error('Invalid food record.');
      return { id: meal.id, name: meal.name, calories: meal.calories as number };
    });
    result.entries[date] = {
      date,
      text: entry.text,
      mood: entry.mood as Mood | '',
      weight: entry.weight as number | null,
      meals,
      updatedAt: entry.updatedAt,
    };
  }
  const ids = new Set<string>();
  for (const thread of value.conversations) {
    if (
      !object(thread) ||
      !text(thread.id, 100) ||
      ids.has(thread.id) ||
      !text(thread.title, 200) ||
      !timestamp(thread.updatedAt) ||
      !isProvider(thread.provider) ||
      !text(thread.model, 200) ||
      !Array.isArray(thread.messages) ||
      thread.messages.length > 2000
    )
      throw new Error('Invalid conversation record.');
    ids.add(thread.id);
    const messageIds = new Set<string>();
    const messages: Message[] = thread.messages.map((message) => {
      if (
        !object(message) ||
        !text(message.id, 100) ||
        messageIds.has(message.id) ||
        !['user', 'assistant'].includes(message.role as string) ||
        !text(message.content, 100000) ||
        !timestamp(message.createdAt) ||
        !(message.model === undefined || text(message.model, 200))
      )
        throw new Error('Invalid chat message.');
      messageIds.add(message.id);
      return {
        id: message.id,
        role: message.role as Message['role'],
        content: message.content,
        createdAt: message.createdAt,
        ...(typeof message.model === 'string' ? { model: message.model } : {}),
      };
    });
    result.conversations.push({
      id: thread.id,
      title: thread.title,
      updatedAt: thread.updatedAt,
      provider: thread.provider,
      model: thread.model,
      messages,
    });
  }
  return result;
}

export function loadSpace(): { data: SpaceData; error: string; raw: string | null } {
  try {
    const raw = localStorage.getItem(SPACE_KEY);
    return { data: raw ? parseSpace(JSON.parse(raw)) : freshSpace(), error: '', raw };
  } catch {
    return {
      data: freshSpace(),
      error:
        'Existing records could not be read. Saving is paused to protect the original data. Export the raw data or import a valid backup.',
      raw: (() => {
        try {
          return localStorage.getItem(SPACE_KEY);
        } catch {
          return null;
        }
      })(),
    };
  }
}
export function saveSpace(data: SpaceData): string {
  try {
    localStorage.setItem(SPACE_KEY, JSON.stringify(data));
    return '';
  } catch {
    return 'Local storage is unavailable or full. These changes are not saved. Export a backup before closing the page.';
  }
}
export function download(name: string, data: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function journalCsv(entries: Record<string, Entry>): string {
  const cell = (v: string | number) =>
    `"${String(v)
      .replace(/^(\s*[=+@-])/, "'$1")
      .replaceAll('"', '""')}"`;
  const rows = [
    ['Date', 'Weight kg', 'Intake kcal', 'Mood', 'Journal'],
    ...Object.values(entries)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => [e.date, e.weight ?? '', calories(e), e.mood ? MOOD_LABELS[e.mood] : '', e.text]),
  ];
  return '\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n');
}
