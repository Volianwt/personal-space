import { useRef, useState } from 'react';
import { Download, RefreshCw, Upload } from 'lucide-react';
import { Modal } from '../components/Modal';
import { modelList } from '../lib/api';
import { download, localDay, parseSpace, PROVIDERS } from '../lib/space';
import type { Provider, SpaceData, UpdateSpace } from '../lib/space';

export function Settings({
  data,
  update,
  restore,
  onClose,
  apiKey,
  setApiKey,
  models,
  setModels,
  configured,
  onCheck,
}: {
  data: SpaceData;
  update: UpdateSpace;
  restore: (value: SpaceData) => void;
  onClose: () => void;
  apiKey: string;
  setApiKey: (value: string) => void;
  models: string[];
  setModels: (value: string[]) => void;
  configured: Record<string, boolean>;
  onCheck: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [incoming, setIncoming] = useState<SpaceData | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const connection = data.preferences.connection;
  function patchConnection(values: Partial<typeof connection>) {
    update((old) => ({
      ...old,
      preferences: { ...old.preferences, connection: { ...old.preferences.connection, ...values } },
    }));
  }
  async function fetchModels() {
    setBusy(true);
    setMessage('');
    try {
      const result = await modelList(connection, apiKey);
      setModels(result.models);
      if (result.models.length && !connection.model) patchConnection({ model: result.models[0] });
      setMessage(
        result.models.length
          ? `Found ${result.models.length} models. Choose one that supports chat.`
          : 'Connected, but no models were returned. Download or load a model first, or enter its ID manually.',
      );
      onCheck();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Cannot read the model list.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Make this space your own." onClose={onClose}>
      {incoming ? (
        <div className="import-confirm">
          <p className="modal-lead">
            This backup contains {Object.keys(incoming.entries).length} journal days and{' '}
            {incoming.conversations.length} conversations. Importing replaces the records in this
            browser.
          </p>
          <p className="subtle">
            Export your current data first. API keys are not included in backups.
          </p>
          <div className="dialog-actions">
            <button className="small-button" onClick={() => setIncoming(null)}>
              Cancel
            </button>
            <button
              className="small-button"
              onClick={() =>
                download(`personal-space-${localDay()}.json`, JSON.stringify(data, null, 2))
              }
            >
              Export current data first
            </button>
            <button
              className="button primary"
              onClick={() => {
                restore(incoming);
                setIncoming(null);
                setMessage('Backup loaded. Check the save status at the top of the page.');
              }}
            >
              Replace records
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="settings-section">
            <p className="eyebrow">JUST YOURS</p>
            <div className="settings-two">
              <label className="field-label">
                What should we call you?
                <input
                  maxLength={40}
                  value={data.preferences.name}
                  onChange={(e) =>
                    update((old) => ({
                      ...old,
                      preferences: { ...old.preferences, name: e.target.value },
                    }))
                  }
                />
              </label>
              <label className="field-label">
                Calorie reference · Optional
                <div className="input-unit">
                  <input
                    type="number"
                    min="1"
                    max="20000"
                    placeholder="Not set"
                    value={data.preferences.calorieGoal ?? ''}
                    onChange={(e) => {
                      const goal = e.target.value === '' ? null : Number(e.target.value);
                      if (goal === null || (Number.isFinite(goal) && goal > 0 && goal <= 20000))
                        update((old) => ({
                          ...old,
                          preferences: { ...old.preferences, calorieGoal: goal },
                        }));
                    }}
                  />
                  <span>kcal</span>
                </div>
              </label>
            </div>
          </div>
          <div className="settings-section">
            <p className="eyebrow">YOUR AI CONNECTION</p>
            <label className="field-label">
              Model provider
              <select
                value={connection.provider}
                onChange={(e) => {
                  const provider = e.target.value as Provider;
                  patchConnection({ provider, baseUrl: PROVIDERS[provider].url, model: '' });
                  setApiKey('');
                  setModels([]);
                  setMessage('');
                }}
              >
                {Object.entries(PROVIDERS).map(([id, provider]) => (
                  <option key={id} value={id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Service base URL
              <input
                type="url"
                value={connection.baseUrl}
                disabled={connection.provider === 'openai'}
                placeholder={
                  connection.provider === 'custom' ? 'https://your-provider.example/v1' : ''
                }
                onChange={(e) => {
                  patchConnection({ baseUrl: e.target.value });
                  setModels([]);
                }}
              />
            </label>
            <p className="field-help">
              {PROVIDERS[connection.provider].local
                ? 'Start your local model service first. Ollama uses port 11434; LM Studio typically uses port 1234 with its local server enabled.'
                : 'Requests go to the selected service. Only the current chat is sent; journal and weight records are not attached automatically.'}
            </p>
            <label className="field-label">
              API key · For this visit only
              <input
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={apiKey}
                placeholder={
                  configured[connection.provider] ||
                  (configured.local && PROVIDERS[connection.provider].local)
                    ? 'Configured in local .env; leave blank'
                    : PROVIDERS[connection.provider].local
                      ? 'Leave blank if your local service needs no key'
                      : 'Enter your own API key'
                }
                onChange={(e) => setApiKey(e.target.value)}
              />
            </label>
            <p className="field-help">
              Keys are not saved in browser records or backups. For regular use, configure your
              local .env file.
            </p>
            <div className="model-fetch-row">
              <label className="field-label">
                Model name
                <input
                  list="available-models"
                  value={connection.model}
                  maxLength={200}
                  placeholder="Fetch models or enter an ID"
                  onChange={(e) => patchConnection({ model: e.target.value })}
                />
                <datalist id="available-models">
                  {models.map((model) => (
                    <option key={model} value={model} />
                  ))}
                </datalist>
              </label>
              <button className="small-button" disabled={busy} onClick={() => void fetchModels()}>
                <RefreshCw size={14} className={busy ? 'spin' : ''} />
                {busy ? 'Connecting' : 'Fetch models'}
              </button>
            </div>
            <details className="assistant-instructions">
              <summary>Adjust the assistant’s style</summary>
              <label className="field-label">
                Assistant instructions
                <textarea
                  rows={3}
                  maxLength={5000}
                  value={connection.systemPrompt}
                  onChange={(e) => patchConnection({ systemPrompt: e.target.value })}
                />
              </label>
            </details>
          </div>
          <div className="settings-section backup-section">
            <p className="eyebrow">KEEP A COPY</p>
            <p className="field-help">
              Journal and chat records stay in this browser. Clearing site data removes them, and
              other browsers keep separate records. Export a backup regularly.
            </p>
            <div className="backup-actions">
              <button
                className="small-button"
                onClick={() =>
                  download(`personal-space-${localDay()}.json`, JSON.stringify(data, null, 2))
                }
              >
                <Download size={15} />
                Export full backup
              </button>
              <button className="small-button" onClick={() => file.current?.click()}>
                <Upload size={15} />
                Import backup
              </button>
              <input
                className="sr-only"
                ref={file}
                aria-label="Choose a personal space backup"
                type="file"
                accept=".json,application/json"
                onChange={async (e) => {
                  const selected = e.target.files?.[0];
                  e.target.value = '';
                  if (!selected) return;
                  try {
                    if (selected.size > 20 * 1024 * 1024)
                      throw new Error('The backup file is too large.');
                    setIncoming(parseSpace(JSON.parse(await selected.text())));
                    setMessage('');
                  } catch (error) {
                    setMessage(error instanceof Error ? error.message : 'Cannot read the backup.');
                  }
                }}
              />
            </div>
          </div>
        </>
      )}
      {message && (
        <p className="inline-notice settings-message" role="status">
          {message}
        </p>
      )}
      <div className="settings-done">
        <button className="button primary" onClick={onClose}>
          Back to my space
        </button>
      </div>
    </Modal>
  );
}
