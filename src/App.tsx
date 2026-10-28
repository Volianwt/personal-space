import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Download,
  Flame,
  Heart,
  Menu,
  MessageCircle,
  Moon,
  Settings2,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';
import { DeskScene } from './components/DeskScene';
import { Chat } from './features/Chat';
import { Journal } from './features/Journal';
import { News } from './features/News';
import { Play } from './features/Play';
import { Settings } from './features/Settings';
import { request } from './lib/api';
import type { Health } from './lib/api';
import { calories, download, loadSpace, localDay, saveSpace } from './lib/space';
import type { Page, SpaceData, UpdateSpace } from './lib/space';
import './styles.css';

const pages: { id: Page; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'play', label: 'Play' },
  { id: 'journal', label: 'Journal' },
  { id: 'chat', label: 'Chat' },
];
function currentPage(): Page {
  const hash = location.hash.slice(1);
  return pages.some((page) => page.id === hash) ? (hash as Page) : 'today';
}
export default function App() {
  const [initial] = useState(loadSpace);
  const [data, setData] = useState(initial.data);
  const ref = useRef(data);
  const [storageError, setStorageError] = useState(initial.error);
  const writeBlocked = useRef(!!initial.error);
  const [page, setPage] = useState<Page>(currentPage);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [clock, setClock] = useState(new Date());
  const heading = useRef<HTMLElement>(null);
  const update: UpdateSpace = useCallback((change) => {
    const next = change(ref.current);
    ref.current = next;
    setData(next);
    if (!writeBlocked.current) setStorageError(saveSpace(next));
  }, []);
  const restore = (incoming: SpaceData) => {
    ref.current = incoming;
    setData(incoming);
    const error = saveSpace(incoming);
    writeBlocked.current = !!error;
    setStorageError(error);
    setModels([]);
    setApiKey('');
  };
  const checkHealth = useCallback(async () => {
    try {
      setHealth(await request<Health>('/api/health', { signal: AbortSignal.timeout(3000) }));
    } catch {
      setHealth(null);
    }
  }, []);
  useEffect(() => {
    void checkHealth();
    const t = setInterval(() => void checkHealth(), 30000);
    return () => clearInterval(t);
  }, [checkHealth]);
  useEffect(() => {
    document.documentElement.dataset.theme = data.preferences.night ? 'night' : 'day';
    document.title = `${data.preferences.name.trim() || 'My space'} · Personal space`;
  }, [data.preferences.night, data.preferences.name]);
  useEffect(() => {
    const change = () => {
      setPage(currentPage());
      setMenuOpen(false);
      window.scrollTo({ top: 0, behavior: 'instant' });
      heading.current?.focus({ preventScroll: true });
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [menuOpen]);
  const today = localDay(clock),
    entry = data.entries[today];
  const hour = clock.getHours();
  const greeting =
    hour < 6
      ? 'A quiet night'
      : hour < 11
        ? 'Good morning'
        : hour < 17
          ? 'Good afternoon'
          : 'Good evening';
  return (
    <>
      <a
        href="#main"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          heading.current?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a className="wordmark" href="#today" aria-label="Back to today">
            {data.preferences.name.trim() || 'my'}
            <span>✳</span>
            <small>the personal corner</small>
          </a>
          <nav
            id="main-nav"
            className={menuOpen ? 'main-nav open' : 'main-nav'}
            aria-label="Main navigation"
          >
            {pages.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                aria-current={page === item.id ? 'page' : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="header-actions">
            <button
              className="icon-button"
              aria-label={
                data.preferences.night ? 'Switch to day theme' : 'Switch to evening theme'
              }
              onClick={() =>
                update((old) => ({
                  ...old,
                  preferences: { ...old.preferences, night: !old.preferences.night },
                }))
              }
            >
              {data.preferences.night ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="icon-button"
              aria-label="Open space settings"
              onClick={() => setSettings(true)}
            >
              <Settings2 size={18} />
            </button>
            <button
              className="icon-button mobile-menu"
              aria-controls="main-nav"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
      </header>
      <div className="status-strip page-width">
        <span>
          <span className={`status-dot ${health?.ok ? '' : 'offline'}`} />
          {health?.ok ? 'Local service connected' : 'Offline mode'}
          <button onClick={() => setSettings(true)} aria-label="View connection settings">
            Connection settings <ArrowUpRight size={11} />
          </button>
        </span>
        <span className={storageError ? 'save-error' : 'save-state'} role="status">
          {storageError ? (
            <span>Changes not saved</span>
          ) : (
            <>
              <Check size={12} />
              Saved on this device
            </>
          )}
        </span>
      </div>
      {storageError && (
        <div className="storage-banner page-width" role="alert">
          <span>{storageError}</span>
          <button
            onClick={() =>
              download(
                `personal-space-recovery-${today}.json`,
                writeBlocked.current && initial.raw ? initial.raw : JSON.stringify(data, null, 2),
              )
            }
          >
            <Download size={14} />
            Export {writeBlocked.current && initial.raw ? 'raw data' : 'current backup'}
          </button>
        </div>
      )}
      <main id="main" tabIndex={-1} ref={heading} className="main-content">
        {page === 'today' && (
          <>
            <section className="hero page-width">
              <div className="hero-copy">
                <div className="intro-label">
                  <span className="status-dot" />
                  {clock
                    .toLocaleDateString('en-CA', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })
                    .toUpperCase()}
                  <span className="intro-divider" />
                  {greeting}, {data.preferences.name.trim() || 'you'}
                </div>
                <h1>
                  A little room
                  <br />
                  for <em>yourself.</em>
                  <span className="hero-asterisk" aria-hidden="true">
                    ✳
                  </span>
                </h1>
                <p className="hero-description">
                  A window to the world. A place for your days.
                  <br />
                  And a little room for moments without a purpose.
                </p>
                <div className="hero-buttons">
                  <a href="#journal" className="button primary">
                    Write about today <ArrowUpRight size={17} />
                  </a>
                  <a href="#play" className="text-link">
                    Take a little break <ArrowRight size={15} />
                  </a>
                </div>
                <p className="hero-footnote">A small corner, at your own pace.</p>
              </div>
              <div className="hero-art">
                <div className="scene-label">
                  <span className="scene-dot" /> A LITTLE ROOM FOR YOURSELF <span>01</span>
                </div>
                <DeskScene night={data.preferences.night} />
                <div className="scene-footer">
                  <span>
                    There is time.
                    <br />
                    Your own pace is enough.
                  </span>
                  <button
                    className="scene-mode"
                    onClick={() =>
                      update((old) => ({
                        ...old,
                        preferences: { ...old.preferences, night: !old.preferences.night },
                      }))
                    }
                  >
                    {data.preferences.night ? <Moon size={14} /> : <Sun size={14} />}{' '}
                    {data.preferences.night ? 'An evening corner' : 'A daylight corner'}
                  </button>
                </div>
                <span className="art-note">make yourself at home ↗</span>
              </div>
            </section>
            <section className="daily-glance page-width" aria-label="My daily overview">
              <a href="#journal">
                <span className="glance-icon">
                  <BookOpen size={19} strokeWidth={1.4} />
                </span>
                <span>
                  <small>Days remembered</small>
                  <strong>
                    {Object.keys(data.entries).length}
                    <em>days</em>
                  </strong>
                </span>
                <ArrowUpRight size={15} />
              </a>
              <a href="#journal">
                <span className="glance-icon">
                  <Heart size={19} strokeWidth={1.4} />
                </span>
                <span>
                  <small>Today’s weight</small>
                  <strong>
                    {entry?.weight ?? '—'}
                    <em>kg</em>
                  </strong>
                </span>
                <ArrowUpRight size={15} />
              </a>
              <a href="#journal">
                <span className="glance-icon">
                  <Flame size={19} strokeWidth={1.4} />
                </span>
                <span>
                  <small>Food logged today</small>
                  <strong>
                    {entry?.meals.length ? calories(entry).toLocaleString() : '—'}
                    <em>kcal</em>
                  </strong>
                </span>
                <ArrowUpRight size={15} />
              </a>
              <a href="#chat">
                <span className="glance-icon">
                  <MessageCircle size={19} strokeWidth={1.4} />
                </span>
                <span>
                  <small>Conversations to return to</small>
                  <strong>
                    {data.conversations.length}
                    <em>threads</em>
                  </strong>
                </span>
                <ArrowUpRight size={15} />
              </a>
            </section>
            <div className="page-width home-news">
              <News />
            </div>
            <section className="home-bottom page-width">
              <a href="#journal" className="little-note">
                <p className="eyebrow">SOMETHING TO KEEP</p>
                <h2>{entry?.text ? 'A few words from today.' : 'What would you like to keep?'}</h2>
                <p>
                  {entry?.text
                    ? entry.text.slice(0, 160)
                    : 'A small moment, a passing feeling, or a meal you enjoyed.'}
                </p>
                <span className="text-link">
                  {entry?.text ? 'Keep writing' : 'Leave a first thought'} <ArrowRight size={15} />
                </span>
              </a>
              <a href="#play" className="little-play">
                <span aria-hidden="true">✳</span>
                <p className="eyebrow">A LITTLE LESS RUSH</p>
                <h2>
                  Give yourself permission
                  <br />
                  <em>to take your time.</em>
                </h2>
                <span className="text-link">
                  Find a little pause <ArrowRight size={15} />
                </span>
              </a>
            </section>
          </>
        )}
        {page === 'play' && <Play />}
        {page === 'journal' && <Journal data={data} update={update} />}
        {page === 'chat' && (
          <Chat
            data={data}
            update={update}
            apiKey={apiKey}
            models={models}
            onSettings={() => setSettings(true)}
            online={!!health?.ok}
          />
        )}
      </main>
      <footer className="site-footer page-width">
        <a className="footer-brand" href="#today">
          a little corner<span>✳</span>
        </a>
        <p>Only at your own pace.</p>
        <button onClick={() => setSettings(true)}>
          <ShieldCheck size={13} />
          Local records & backups
        </button>
      </footer>
      {settings && (
        <Settings
          data={data}
          update={update}
          restore={restore}
          onClose={() => setSettings(false)}
          apiKey={apiKey}
          setApiKey={setApiKey}
          models={models}
          setModels={setModels}
          configured={health?.providers ?? {}}
          onCheck={() => void checkHealth()}
        />
      )}
    </>
  );
}
