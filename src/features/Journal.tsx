import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Download,
  Plus,
  Trash2,
  Utensils,
  Weight,
} from 'lucide-react';
import { Modal } from '../components/Modal';
import {
  blankEntry,
  calories,
  download,
  journalCsv,
  localDay,
  MOODS,
  MOOD_LABELS,
  uid,
} from '../lib/space';
import type { Entry, SpaceData, UpdateSpace } from '../lib/space';

function WeightChart({ entries }: { entries: Entry[] }) {
  const values = entries
    .filter((entry) => entry.weight !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);
  if (!values.length)
    return (
      <div className="chart-empty">
        <Weight size={24} strokeWidth={1.3} />
        <p>Start with one entry. Let the picture grow.</p>
      </div>
    );
  const weights = values.map((entry) => entry.weight!);
  const min = Math.min(...weights) - 0.5,
    max = Math.max(...weights) + 0.5;
  const times = values.map((entry) => Date.parse(entry.date));
  const duration = times[times.length - 1] - times[0];
  const points = values.map((entry, index) => ({
    x: duration ? 45 + ((times[index] - times[0]) / duration) * 790 : 440,
    y: 135 - ((entry.weight! - min) / (max - min)) * 105,
    ...entry,
  }));
  return (
    <div className="weight-chart">
      <svg
        viewBox="0 0 880 180"
        role="img"
        aria-label={`Last ${values.length} weight entries, from ${values[0].weight} to ${values[values.length - 1].weight} kilograms`}
      >
        <path d="M40 40H840 M40 90H840 M40 140H840" className="chart-guide" />
        <text x="2" y="44">
          {max.toFixed(1)}
        </text>
        <text x="2" y="144">
          {min.toFixed(1)}
        </text>
        {points.length > 1 && (
          <polyline
            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            className="chart-line"
          />
        )}
        {points.map((point) => (
          <circle key={point.date} cx={point.x} cy={point.y} r={4} className="chart-dot">
            <title>
              {point.date}: {point.weight} kg
            </title>
          </circle>
        ))}
        <text x="40" y="170">
          {values[0].date}
        </text>
        <text x="840" y="170" textAnchor="end">
          {values[values.length - 1].date}
        </text>
      </svg>
      <p className="subtle">Plotted by actual entry dates · kg</p>
    </div>
  );
}

export function Journal({ data, update }: { data: SpaceData; update: UpdateSpace }) {
  const [date, setDate] = useState(localDay());
  const [search, setSearch] = useState('');
  const [food, setFood] = useState('');
  const [foodCalories, setFoodCalories] = useState('');
  const [deleting, setDeleting] = useState(false);
  const entry = data.entries[date] ?? blankEntry(date);
  const days = Object.values(data.entries).sort((a, b) => b.date.localeCompare(a.date));
  const filteredDays = days.filter((day) =>
    `${day.date} ${day.text}`.toLowerCase().includes(search.toLowerCase()),
  );
  const total = calories(entry);
  const goal = data.preferences.calorieGoal;
  function patch(values: Partial<Entry>) {
    update((old) => ({
      ...old,
      entries: {
        ...old.entries,
        [date]: {
          ...(old.entries[date] ?? blankEntry(date)),
          ...values,
          updatedAt: new Date().toISOString(),
        },
      },
    }));
  }
  function shift(amount: number) {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() + amount);
    setDate(localDay(d));
  }
  return (
    <section className="journal-page page-width page-space">
      <div className="section-heading">
        <div>
          <p className="eyebrow">A PLACE TO REMEMBER</p>
          <h1>
            A place for <em>today.</em>
          </h1>
          <p className="page-description">A few words. A small entry. It all counts.</p>
        </div>
        <button
          className="small-button"
          onClick={() =>
            download(
              `journal-${localDay()}.csv`,
              journalCsv(data.entries),
              'text/csv;charset=utf-8',
            )
          }
        >
          <Download size={15} />
          Export records
        </button>
      </div>
      <div className="journal-layout">
        <aside className="journal-sidebar">
          <button className="today-button" onClick={() => setDate(localDay())}>
            <BookOpen size={16} /> Back to today <ArrowRight size={14} />
          </button>
          <label className="field-label">
            Choose a date
            <input
              aria-label="Journal date"
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
          </label>
          <label className="field-label">
            Find an entry
            <input
              type="search"
              placeholder="Date or words…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="saved-days">
            {filteredDays.length ? (
              filteredDays.map((day) => (
                <button
                  key={day.date}
                  onClick={() => setDate(day.date)}
                  className={date === day.date ? 'selected' : ''}
                >
                  <span>{day.date.slice(5).replace('-', ' / ')}</span>
                  <small>
                    {day.text.trim().slice(0, 25) ||
                      (day.weight ? `${day.weight} kg` : 'A little daily record')}
                  </small>
                  <span className="day-mood">{day.mood ? MOOD_LABELS[day.mood] : '·'}</span>
                </button>
              ))
            ) : (
              <p className="subtle">
                {search ? 'No matching entries.' : 'Your entries will find a home here.'}
              </p>
            )}
          </div>
        </aside>
        <div className="journal-main">
          <div className="day-heading">
            <div>
              <span className="eyebrow">
                {date === localDay() ? 'TODAY' : 'A DAY IN YOUR LIFE'}
              </span>
              <h2>
                {new Date(`${date}T12:00:00`).toLocaleDateString('en-CA', {
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })}
              </h2>
            </div>
            <div className="day-arrows">
              <button className="icon-button" aria-label="Previous day" onClick={() => shift(-1)}>
                <ArrowLeft size={18} />
              </button>
              <button className="icon-button" aria-label="Next day" onClick={() => shift(1)}>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
          <article className="diary-card">
            <div className="diary-heading">
              <h3>How you felt</h3>
              <span className="subtle">Change it anytime</span>
            </div>
            <div className="mood-row">
              {MOODS.map((mood) => (
                <button
                  key={mood}
                  aria-pressed={entry.mood === mood}
                  className={entry.mood === mood ? 'selected' : ''}
                  onClick={() => patch({ mood: entry.mood === mood ? '' : mood })}
                >
                  <span className={`mood-dot mood-${MOODS.indexOf(mood)}`} />
                  {MOOD_LABELS[mood]}
                </button>
              ))}
            </div>
            <label className="sr-only" htmlFor="diary-text">
              Journal for the day
            </label>
            <textarea
              id="diary-text"
              className="diary-text"
              maxLength={50000}
              placeholder="What happened today? Something to remember, or something to leave behind?"
              value={entry.text}
              onChange={(e) => patch({ text: e.target.value })}
            />
            <div className="diary-footer">
              <span>{entry.text.length} characters</span>
              <span>Saved locally as you write</span>
            </div>
          </article>
          <div className="health-grid">
            <article className="health-card">
              <div className="card-kicker">
                <Weight size={17} />
                <span>Weight log</span>
              </div>
              <div className="weight-input">
                <input
                  aria-label="Weight in kilograms"
                  type="number"
                  min="1"
                  max="500"
                  step="0.1"
                  placeholder="—"
                  value={entry.weight ?? ''}
                  onChange={(e) => {
                    const weight = e.target.value === '' ? null : Number(e.target.value);
                    if (
                      weight === null ||
                      (Number.isFinite(weight) && weight >= 1 && weight <= 500)
                    )
                      patch({ weight });
                  }}
                />
                <span>kg</span>
              </div>
              <p className="subtle">Notice the changes, at your own pace.</p>
            </article>
            <article className="health-card calorie-card">
              <div className="card-kicker">
                <Utensils size={17} />
                <span>Food logged</span>
              </div>
              <div className="calorie-number">
                {total.toLocaleString()} <span>kcal</span>
              </div>
              <div className="calorie-track" aria-hidden="true">
                <span style={{ width: goal ? `${Math.min(100, (total / goal) * 100)}%` : '0%' }} />
              </div>
              <span className="subtle">
                {goal
                  ? `Your reference: ${goal.toLocaleString('en-CA')} kcal · For tracking only`
                  : 'Set your own reference in settings'}
              </span>
            </article>
          </div>
          <article className="meal-card">
            <div className="diary-heading">
              <h3>What was on the table?</h3>
              <span className="subtle">Calories entered manually</span>
            </div>
            <form
              className="meal-form"
              onSubmit={(e) => {
                e.preventDefault();
                const kcal = Number(foodCalories);
                if (
                  !food.trim() ||
                  foodCalories === '' ||
                  !Number.isFinite(kcal) ||
                  kcal < 0 ||
                  kcal > 20000
                )
                  return;
                patch({
                  meals: [...entry.meals, { id: uid(), name: food.trim(), calories: kcal }],
                });
                setFood('');
                setFoodCalories('');
              }}
            >
              <input
                aria-label="Food or meal"
                placeholder="For example: lunch, milk…"
                value={food}
                maxLength={200}
                required
                onChange={(e) => setFood(e.target.value)}
              />
              <div className="kcal-field">
                <input
                  aria-label="Calories in kcal"
                  type="number"
                  min="0"
                  max="20000"
                  step="1"
                  required
                  placeholder="Calories"
                  value={foodCalories}
                  onChange={(e) => setFoodCalories(e.target.value)}
                />
                <span>kcal</span>
              </div>
              <button className="button primary" type="submit">
                <Plus size={17} />
                <span>Add</span>
              </button>
            </form>
            <div className="meal-list">
              {entry.meals.length ? (
                entry.meals.map((meal) => (
                  <div key={meal.id}>
                    <span>{meal.name}</span>
                    <strong>
                      {meal.calories} <small>kcal</small>
                    </strong>
                    <button
                      className="icon-button"
                      aria-label={`Remove ${meal.name}`}
                      onClick={() =>
                        patch({ meals: entry.meals.filter((item) => item.id !== meal.id) })
                      }
                    >
                      <XIcon />
                    </button>
                  </div>
                ))
              ) : (
                <p className="subtle meal-empty">
                  Start with one meal. Calories are not estimated automatically.
                </p>
              )}
            </div>
          </article>
          {!!data.entries[date] && (
            <button className="text-danger" onClick={() => setDeleting(true)}>
              <Trash2 size={13} /> Clear this day
            </button>
          )}
        </div>
      </div>
      <section className="weight-history">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE BIGGER PICTURE</p>
            <h2>
              A little more <em>perspective.</em>
            </h2>
          </div>
          <span className="subtle">Last 30 weight entries</span>
        </div>
        <WeightChart entries={days} />
      </section>
      {deleting && (
        <Modal title="Clear this day’s records?" onClose={() => setDeleting(false)}>
          <p className="modal-lead">
            {date} will have its journal, mood, weight, and food records removed. Export a backup
            first if you want to keep them.
          </p>
          <div className="dialog-actions">
            <button className="small-button" onClick={() => setDeleting(false)}>
              Cancel
            </button>
            <button
              className="button danger-button"
              onClick={() => {
                update((old) => {
                  const entries = { ...old.entries };
                  delete entries[date];
                  return { ...old, entries };
                });
                setDeleting(false);
              }}
            >
              Clear records
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
function XIcon() {
  return (
    <span aria-hidden="true" style={{ fontSize: 18 }}>
      ×
    </span>
  );
}
