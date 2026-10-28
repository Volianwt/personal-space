import { useEffect, useState } from 'react';
import { Pause, Play as PlayIcon, RotateCcw } from 'lucide-react';
import { SignalGame } from '../components/SignalGame';

function Bubbles() {
  const [popped, setPopped] = useState<boolean[]>(Array(20).fill(false));
  const count = popped.filter(Boolean).length;
  return (
    <div className="bubble-game">
      <div className="relax-game-heading">
        <div>
          <p className="eyebrow">ONE LITTLE THING AT A TIME</p>
          <h2>
            A little tap.<em> A little release.</em>
          </h2>
        </div>
        <button className="small-button" onClick={() => setPopped(Array(20).fill(false))}>
          <RotateCcw size={14} />
          Another round
        </button>
      </div>
      <div className="bubble-board" role="group" aria-label="Bubble popping game">
        {popped.map((value, index) => (
          <button
            key={index}
            disabled={value}
            className={`bubble bubble-${index % 4} ${value ? 'popped' : ''}`}
            aria-label={`Bubble ${index + 1}${value ? ', popped' : ''}`}
            onClick={() => setPopped((old) => old.map((p, i) => (i === index ? true : p)))}
          >
            <span />
          </button>
        ))}
      </div>
      <p className="relax-caption" aria-live="polite">
        {count === 20
          ? 'That is one little round, let go. Come back for another whenever you like.'
          : `No timer. ${count} / 20 bubbles popped.`}
      </p>
    </div>
  );
}
function Breathing() {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(media.matches);
    const change = () => setReduced(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    if (!playing) return;
    const start = performance.now() - elapsed;
    const interval = setInterval(() => setElapsed(performance.now() - start), 100);
    const visibility = () => {
      if (document.visibilityState === 'hidden') setPlaying(false);
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [playing]);
  const position = elapsed % 10000,
    inhale = position < 4000;
  const scale = reduced
    ? 1
    : inhale
      ? 0.68 + (position / 4000) * 0.32
      : 1 - ((position - 4000) / 6000) * 0.32;
  const seconds = Math.max(1, Math.ceil((inhale ? 4000 - position : 10000 - position) / 1000));
  return (
    <div className="breathing-game">
      <p className="eyebrow">A QUIETER MOMENT</p>
      <h2>
        A moment.<em> A breath.</em>
      </h2>
      <p className="subtle">Follow a comfortable rhythm. Pause whenever you like.</p>
      <div className="breathing-stage">
        <div className="breathing-ring" />
        <div className="breathing-orb" style={{ transform: `scale(${playing ? scale : 0.8})` }} />
        <div className="breathing-words">
          <span>
            {playing
              ? inhale
                ? 'Breathe in'
                : 'Breathe out'
              : elapsed
                ? 'Take a pause'
                : 'Begin when you are ready'}
          </span>
          <strong>{playing ? seconds : '✳'}</strong>
        </div>
      </div>
      <div className="breathing-controls">
        <button className="button primary" onClick={() => setPlaying(!playing)}>
          {playing ? <Pause size={16} /> : <PlayIcon size={16} />} {playing ? 'Pause' : 'Start'}
        </button>
        <button
          className="small-button"
          onClick={() => {
            setPlaying(false);
            setElapsed(0);
          }}
        >
          <RotateCcw size={14} />
          Restart
        </button>
      </div>
      <p className="relax-caption">No score. Nothing to finish.</p>
    </div>
  );
}
export function Play() {
  const [game, setGame] = useState('bubbles');
  return (
    <section className="play-page page-width page-space">
      <div className="section-heading">
        <div>
          <p className="eyebrow">NOT EVERYTHING NEEDS A PURPOSE</p>
          <h1>
            A moment to <em>slow down.</em>
          </h1>
          <p className="page-description">A few small pauses. Pick one and stay a while.</p>
        </div>
        <span className="handwritten">take your time ↙</span>
      </div>
      <div className="game-picker" role="group" aria-label="Choose a relaxing activity">
        {[
          {
            id: 'bubbles',
            number: '01',
            title: 'Bubble break',
            description: 'A little release at your fingertips',
          },
          {
            id: 'signal',
            number: '02',
            title: 'Signal Switch',
            description: 'A small puzzle for your mind',
          },
          {
            id: 'breath',
            number: '03',
            title: 'Just breathe',
            description: 'Back to your own rhythm',
          },
        ].map((item) => (
          <button
            key={item.id}
            className={game === item.id ? 'selected' : ''}
            aria-pressed={game === item.id}
            onClick={() => setGame(item.id)}
          >
            <span>{item.number}</span>
            <strong>{item.title}</strong>
            <small>{item.description}</small>
            <i aria-hidden="true">↗</i>
          </button>
        ))}
      </div>
      <div className={`play-stage stage-${game}`}>
        {game === 'bubbles' ? (
          <Bubbles />
        ) : game === 'breath' ? (
          <Breathing />
        ) : (
          <div className="signal-stage">
            <div>
              <p className="eyebrow">A LITTLE LOGIC</p>
              <h2>
                Nine little squares.
                <br />
                <em>One quiet puzzle.</em>
              </h2>
              <p>
                Tap a square to flip it and its direct neighbours.
                <br />
                Light up all nine to finish the level.
              </p>
              <p className="subtle">
                Three levels · Arrow keys and Space supported
                <br />
                Undo, start again, or ask for a hint.
              </p>
            </div>
            <SignalGame />
          </div>
        )}
      </div>
    </section>
  );
}
