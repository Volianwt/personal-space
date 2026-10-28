import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, RefreshCw, Newspaper } from 'lucide-react';
import { request } from '../lib/api';
import type { NewsResult } from '../lib/api';
import { readStored, writeStored } from '../lib/storage';

const topics = [
  { id: 'world', label: 'World' },
  { id: 'canada', label: 'Canada' },
  { id: 'tech', label: 'Technology' },
];
function isNews(value: unknown): value is NewsResult {
  const v = value as NewsResult | null;
  return (
    !!v &&
    typeof v.fetchedAt === 'string' &&
    typeof v.stale === 'boolean' &&
    Array.isArray(v.items) &&
    v.items.every(
      (item) =>
        typeof item.title === 'string' &&
        typeof item.url === 'string' &&
        /^https?:\/\//.test(item.url) &&
        typeof item.source === 'string',
    )
  );
}
export function News() {
  const [topic, setTopic] = useState('world');
  const [result, setResult] = useState<NewsResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const load = useCallback(
    async (force = false) => {
      controller.current?.abort();
      const next = new AbortController();
      controller.current = next;
      setBusy(true);
      setError('');
      try {
        const data = await request<NewsResult>(
          `/api/news?topic=${topic}${force ? '&refresh=1' : ''}`,
          { signal: AbortSignal.any([next.signal, AbortSignal.timeout(20000)]) },
        );
        if (!isNews(data)) throw new Error('Invalid news data.');
        setResult(data);
        writeStored(`tao.news.${topic}.v2`, data);
      } catch (e) {
        if (!next.signal.aborted) {
          setError(e instanceof Error ? e.message : 'News cannot be refreshed right now.');
          setResult((old) => (old ? { ...old, stale: true } : null));
        }
      } finally {
        if (!next.signal.aborted) setBusy(false);
      }
    },
    [topic],
  );
  useEffect(() => {
    setResult(
      readStored<NewsResult | null>(
        `tao.news.${topic}.v2`,
        null,
        (value): value is NewsResult | null => value === null || isNews(value),
      ),
    );
    setExpanded(false);
    void load();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 60000);
    const focus = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', focus);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', focus);
      controller.current?.abort();
    };
  }, [topic, load]);
  return (
    <section className="news-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">A WINDOW TO THE WORLD</p>
          <h2>
            A window on <em>today.</em>
          </h2>
        </div>
        <button className="small-button" disabled={busy} onClick={() => void load(true)}>
          <RefreshCw size={14} className={busy ? 'spin' : ''} />
          {busy ? 'Refreshing' : 'Refresh news'}
        </button>
      </div>
      <div className="news-toolbar">
        <div className="pill-tabs" role="group" aria-label="News category">
          {topics.map((item) => (
            <button
              key={item.id}
              aria-pressed={topic === item.id}
              className={topic === item.id ? 'active' : ''}
              onClick={() => setTopic(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <span className="subtle">
          {result
            ? `${result.stale ? 'Last saved' : 'Updated'} ${new Date(result.fetchedAt).toLocaleString('en-CA', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`
            : 'Updated daily · Original stories and sources'}
        </span>
      </div>
      {error && (
        <p className="inline-notice" role="status">
          {error}
          {result?.items.length ? ' Showing the last saved headlines.' : ''}
        </p>
      )}
      {result?.warning && !error && <p className="inline-notice">{result.warning}</p>}
      {result?.items.length ? (
        <div className="news-grid">
          {result.items.slice(0, expanded ? 12 : 6).map((item, i) => (
            <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="news-card">
              <div className="news-meta">
                <span>{item.source}</span>
                <span>
                  {item.publishedAt
                    ? new Date(item.publishedAt).toLocaleDateString('en-CA', {
                        month: '2-digit',
                        day: '2-digit',
                      })
                    : 'No date provided'}
                </span>
              </div>
              <h3>{item.title}</h3>
              <div className="news-bottom">
                <span>{String(i + 1).padStart(2, '0')}</span>
                <span>
                  Read story <ArrowUpRight size={15} />
                </span>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="empty-card news-empty">
          <Newspaper size={30} strokeWidth={1.2} />
          <h3>{busy ? 'Opening a window on today…' : 'The news has not arrived yet.'}</h3>
          <p>
            Connect the local service to get headlines from BBC and CBC.
            <br />
            No news API key is needed. Headlines are fetched from the sources.
          </p>
        </div>
      )}
      {!!result && result.items.length > 6 && (
        <button className="more-news" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Show fewer' : 'A few more stories'} <span>{expanded ? '−' : '+'}</span>
        </button>
      )}
    </section>
  );
}
