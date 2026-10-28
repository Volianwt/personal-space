import type { Connection, Message } from './space';
export type NewsItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string | null;
};
export type NewsResult = { items: NewsItem[]; fetchedAt: string; stale: boolean; warning?: string };
export type Health = { ok: boolean; providers: Record<string, boolean> };

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (location.protocol === 'file:')
    throw new Error(
      'This is an offline preview. Follow the README and run npm start to connect news or AI.',
    );
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error('The local service is not connected. Run npm start in the project folder.');
  }
  if (!response.ok)
    throw new Error((data as { error?: string })?.error || `Request failed (${response.status})`);
  return data as T;
}
export function modelList(connection: Connection, apiKey: string) {
  return request<{ models: string[] }>('/api/models', {
    method: 'POST',
    body: JSON.stringify({ ...connection, apiKey }),
    signal: AbortSignal.timeout(20000),
  });
}
export function askModel(
  connection: Connection,
  apiKey: string,
  messages: Message[],
  signal: AbortSignal,
) {
  return request<{ content: string; model: string }>('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      ...connection,
      apiKey,
      messages: messages.map(({ role, content }) => ({ role, content })),
    }),
    signal,
  });
}
