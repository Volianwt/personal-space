import { useEffect, useState } from 'react';
import { ArrowRight, Lightbulb, RotateCcw, Undo2 } from 'lucide-react';
import {
  countOnline,
  initialBoard,
  LEVELS,
  NODE_COUNT,
  SIZE,
  SOLVED,
  solve,
  toggle,
} from '../lib/game';
import { readStored, writeStored } from '../lib/storage';

type Scores = Record<string, number>;
const isScores = (v: unknown): v is Scores =>
  typeof v === 'object' &&
  v !== null &&
  !Array.isArray(v) &&
  Object.entries(v).every(
    ([key, score]) => /^[0-2]$/.test(key) && Number.isInteger(score) && (score as number) > 0,
  );

export function SignalGame() {
  const [level, setLevel] = useState(0);
  const [board, setBoard] = useState(initialBoard(0));
  const [history, setHistory] = useState<number[]>([]);
  const [hint, setHint] = useState<number | null>(null);
  const [assisted, setAssisted] = useState(false);
  const [scores, setScores] = useState(() =>
    readStored<Scores>('tao.signal-scores.v1', {}, isScores),
  );
  const [saved, setSaved] = useState(true);
  const won = board === SOLVED;
  const online = countOnline(board);

  useEffect(() => {
    if (!won || assisted || history.length === 0) return;
    if (!scores[level] || history.length < scores[level]) {
      const next = { ...scores, [level]: history.length };
      setScores(next);
      setSaved(writeStored('tao.signal-scores.v1', next));
    }
  }, [won, assisted, history.length, level, scores]);

  function reset(nextLevel = level) {
    setLevel(nextLevel);
    setBoard(initialBoard(nextLevel));
    setHistory([]);
    setHint(null);
    setAssisted(false);
  }
  function move(index: number) {
    if (won) return;
    setHistory((previous) => [...previous, board]);
    setBoard(toggle(board, index));
    setHint(null);
  }
  function showHint() {
    setAssisted(true);
    setHint(solve(board)?.[0] ?? null);
  }

  return (
    <div className="game-shell">
      <div className="game-top">
        <span>
          <span className="status-dot" />
          SIGNAL SWITCH
        </span>
        <span>LEVEL 0{level + 1}</span>
      </div>
      <div className="game-description">
        <h3>
          {won
            ? 'All lit up.'
            : ['First connection', 'A little interference', 'Back to the light'][level]}
        </h3>
        <p>Tap a square to flip its neighbours. Light up all nine.</p>
      </div>
      <div
        className="game-grid"
        role="group"
        aria-label="Signal Switch puzzle. Arrow keys move focus. Enter or Space switches a node."
      >
        {Array.from({ length: NODE_COUNT }, (_, index) => {
          const on = Boolean(board & (1 << index));
          return (
            <button
              key={index}
              className={`signal-node ${on ? 'online' : ''} ${hint === index ? 'hinted' : ''}`}
              aria-label={`Node ${index + 1}, ${on ? 'online' : 'offline'}${hint === index ? ', suggested move' : ''}`}
              aria-pressed={on}
              aria-disabled={won}
              onClick={() => move(index)}
              onKeyDown={(event) => {
                const offsets: Record<string, number> = {
                  ArrowRight: 1,
                  ArrowLeft: -1,
                  ArrowDown: SIZE,
                  ArrowUp: -SIZE,
                };
                if (offsets[event.key] !== undefined) {
                  event.preventDefault();
                  const next = (index + offsets[event.key] + NODE_COUNT) % NODE_COUNT;
                  (event.currentTarget.parentElement?.children[next] as HTMLElement)?.focus();
                }
              }}
            >
              <span className="node-light" />
              <span className="node-number">0{index + 1}</span>
            </button>
          );
        })}
      </div>
      <div className="game-stats" aria-live="polite" aria-atomic="true">
        <span>
          <strong>{online}/9</strong> online
        </span>
        <span>
          <strong>{history.length}</strong> moves
        </span>
        <span>
          <strong>{scores[level] ?? '—'}</strong> best
        </span>
      </div>
      <div className="game-controls">
        <button className="game-button" onClick={() => reset()} aria-label="Restart this level">
          <RotateCcw size={15} /> Restart
        </button>
        <button
          className="game-button"
          disabled={!history.length || won}
          onClick={() => {
            setBoard(history[history.length - 1]);
            setHistory(history.slice(0, -1));
            setHint(null);
          }}
        >
          <Undo2 size={15} /> Undo
        </button>
        <button className="game-button" disabled={won} onClick={showHint}>
          <Lightbulb size={15} /> Hint
        </button>
      </div>
      <div className="game-bottom" aria-live="polite">
        {won ? (
          <button className="next-level" onClick={() => reset((level + 1) % LEVELS.length)}>
            Next puzzle <ArrowRight size={16} />
          </button>
        ) : (
          <span>
            {hint !== null
              ? `Try square ${hint + 1}. Hint-assisted rounds do not set records.`
              : 'No timer. Take your time.'}
          </span>
        )}
      </div>
      {!saved && (
        <p className="storage-note">
          Browser storage is unavailable. You can still play; records last for this visit.
        </p>
      )}
    </div>
  );
}
