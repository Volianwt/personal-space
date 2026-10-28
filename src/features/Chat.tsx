import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Check, Copy, MessageCircle, Plus, Settings2, Square, Trash2 } from 'lucide-react';
import { Modal } from '../components/Modal';
import { askModel } from '../lib/api';
import { PROVIDERS, uid } from '../lib/space';
import type { Conversation, Message, SpaceData, UpdateSpace } from '../lib/space';

export function Chat({
  data,
  update,
  apiKey,
  models,
  onSettings,
  online,
}: {
  data: SpaceData;
  update: UpdateSpace;
  apiKey: string;
  models: string[];
  onSettings: () => void;
  online: boolean;
}) {
  const [activeId, setActiveId] = useState(data.conversations[0]?.id ?? '');
  const [draft, setDraft] = useState('');
  const [pendingId, setPendingId] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState('');
  const request = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const active = data.conversations.find((thread) => thread.id === activeId);
  const connection = data.preferences.connection;
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'nearest' });
  }, [active?.messages.length, pendingId]);
  useEffect(() => {
    if (activeId && !data.conversations.some((thread) => thread.id === activeId))
      setActiveId(data.conversations[0]?.id ?? '');
  }, [data.conversations, activeId]);
  useEffect(() => {
    if (copiedId) {
      const t = setTimeout(() => setCopiedId(''), 2000);
      return () => clearTimeout(t);
    }
  }, [copiedId]);

  async function generate(thread: Conversation) {
    if (!connection.model.trim()) {
      setError('Choose or enter a model name in connection settings first.');
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setPendingId(thread.id);
    setError('');
    const selected = { ...connection };
    try {
      const reply = await askModel(selected, apiKey, thread.messages, controller.signal);
      if (controller.signal.aborted) return;
      const message: Message = {
        id: uid(),
        role: 'assistant',
        content: reply.content,
        model: reply.model,
        createdAt: new Date().toISOString(),
      };
      update((old) => ({
        ...old,
        conversations: old.conversations.map((item) =>
          item.id === thread.id
            ? { ...item, messages: [...item.messages, message], updatedAt: message.createdAt }
            : item,
        ),
      }));
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : 'No reply was received. Please try again.');
    } finally {
      if (request.current === controller) {
        setPendingId('');
        request.current = null;
      }
    }
  }
  function send() {
    if (!draft.trim() || pendingId) return;
    if (!connection.model.trim()) {
      setError('Choose a model first using Connection settings.');
      return;
    }
    const now = new Date().toISOString();
    const message: Message = { id: uid(), role: 'user', content: draft.trim(), createdAt: now };
    const thread: Conversation = active
      ? {
          ...active,
          messages: [...active.messages, message],
          updatedAt: now,
          provider: connection.provider,
          model: connection.model,
        }
      : {
          id: uid(),
          title: draft.trim().replace(/\s+/g, ' ').slice(0, 28),
          messages: [message],
          updatedAt: now,
          provider: connection.provider,
          model: connection.model,
        };
    update((old) => ({
      ...old,
      conversations: [thread, ...old.conversations.filter((item) => item.id !== thread.id)],
    }));
    setActiveId(thread.id);
    setDraft('');
    void generate(thread);
  }
  return (
    <section className="chat-page page-width page-space">
      <div className="section-heading">
        <div>
          <p className="eyebrow">ROOM FOR A CONVERSATION</p>
          <h1>
            Room for <em>a conversation.</em>
          </h1>
          <p className="page-description">
            A place to pick up where you left off. Use a local model or connect your own API.
          </p>
        </div>
        <button className="small-button" onClick={onSettings}>
          <Settings2 size={16} />
          Connection settings
        </button>
      </div>
      <div className="chat-layout">
        <aside className="conversation-sidebar">
          <button
            className="button primary new-chat"
            disabled={!!pendingId}
            onClick={() => {
              setActiveId('');
              setDraft('');
              setError('');
              composer.current?.focus();
            }}
          >
            <Plus size={17} /> New chat
          </button>
          <p className="eyebrow chat-history-label">YOUR CONVERSATIONS</p>
          <div className="conversation-list">
            {data.conversations.length ? (
              data.conversations.map((thread) => (
                <button
                  key={thread.id}
                  className={activeId === thread.id ? 'selected' : ''}
                  onClick={() => {
                    setActiveId(thread.id);
                    setError('');
                  }}
                >
                  <MessageCircle size={15} />
                  <span>
                    {thread.title}
                    <small>
                      {new Date(thread.updatedAt).toLocaleDateString('en-CA', {
                        month: '2-digit',
                        day: '2-digit',
                      })}{' '}
                      · {thread.messages.length} messages
                    </small>
                  </span>
                </button>
              ))
            ) : (
              <p className="subtle">
                Your first conversation
                <br />
                will have a home here.
              </p>
            )}
          </div>
          <p className="sidebar-footnote">
            Conversations stay in this browser.
            <br />
            Export a backup in settings.
          </p>
        </aside>
        <div className="chat-room">
          <div className="chat-room-header">
            <div>
              <span className={`status-dot ${online ? '' : 'offline'}`} />
              <strong>{active?.title || 'A little room for a new thought.'}</strong>
            </div>
            <button
              className="icon-button"
              aria-label="Delete current conversation"
              disabled={!active || !!pendingId}
              onClick={() => setDeleting(true)}
            >
              <Trash2 size={16} />
            </button>
          </div>
          <div
            className="messages"
            aria-label="Conversation history"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {active?.messages.length ? (
              active.messages.map((message) => (
                <article key={message.id} className={`message message-${message.role}`}>
                  <div className="message-meta">
                    <span>
                      {message.role === 'user' ? data.preferences.name || 'You' : 'AI assistant'}
                    </span>
                    <span>
                      {message.role === 'assistant'
                        ? message.model
                        : new Date(message.createdAt).toLocaleTimeString('en-CA', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                    </span>
                  </div>
                  <p>{message.content}</p>
                  {message.role === 'assistant' && (
                    <button
                      className="message-copy"
                      aria-label="Copy this reply"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(message.content);
                          setCopiedId(message.id);
                        } catch {
                          setError('Copy is unavailable. Select the text to copy it manually.');
                        }
                      }}
                    >
                      {copiedId === message.id ? <Check size={12} /> : <Copy size={12} />}{' '}
                      {copiedId === message.id ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </article>
              ))
            ) : (
              <div className="chat-empty">
                <span className="chat-star" aria-hidden="true">
                  ✳
                </span>
                <h2>
                  Where shall we <em>begin?</em>
                </h2>
                <p>
                  Talk about your day, untangle a thought, or ask a little question.
                  <br />
                  Journal and health records are not sent automatically.
                </p>
                <div className="prompt-starters">
                  {[
                    'Help me make today’s to-do list feel more manageable',
                    'Ask me an interesting little question',
                    'I would like to practise a short French conversation',
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => {
                        setDraft(prompt);
                        composer.current?.focus();
                      }}
                    >
                      {prompt} <span>↗</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {pendingId && pendingId === activeId && (
              <div className="thinking" role="status">
                <span />
                <span />
                <span />
                <p>Waiting for the model…</p>
              </div>
            )}
            <div ref={bottom} />
          </div>
          <div className="chat-compose">
            {!error && !pendingId && active?.messages.at(-1)?.role === 'user' && (
              <p className="inline-notice">
                This message has no reply yet.
                <button className="inline-retry" onClick={() => void generate(active)}>
                  Try getting a reply
                </button>
              </p>
            )}
            {error && (
              <p className="inline-notice" role="alert">
                {error}
                {active?.messages.at(-1)?.role === 'user' && !pendingId && (
                  <button className="inline-retry" onClick={() => void generate(active)}>
                    Retry
                  </button>
                )}
              </p>
            )}
            <div className="compose-input">
              <label className="sr-only" htmlFor="chat-message">
                Message to the assistant
              </label>
              <textarea
                id="chat-message"
                ref={composer}
                maxLength={100000}
                rows={3}
                placeholder="Leave a thought here…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              {pendingId ? (
                <button
                  className="send-button stop-button"
                  aria-label="Stop waiting for a reply"
                  onClick={() => {
                    request.current?.abort();
                    setPendingId('');
                    setError('Stopped waiting. Your message is saved and you can retry later.');
                  }}
                >
                  <Square size={16} />
                </button>
              ) : (
                <button
                  className="send-button"
                  aria-label="Send message"
                  disabled={!draft.trim()}
                  onClick={send}
                >
                  <ArrowUp size={19} />
                </button>
              )}
            </div>
            <div className="compose-toolbar">
              <button className="model-label" onClick={onSettings}>
                <span className="status-dot" />
                {connection.model || 'Choose a model'}
                <span>⌄</span>
              </button>
              {models.length > 0 && (
                <select
                  aria-label="Switch chat model"
                  value={models.includes(connection.model) ? connection.model : ''}
                  disabled={!!pendingId}
                  onChange={(e) =>
                    update((old) => ({
                      ...old,
                      preferences: {
                        ...old.preferences,
                        connection: { ...old.preferences.connection, model: e.target.value },
                      },
                    }))
                  }
                >
                  <option value="" disabled>
                    Switch model
                  </option>
                  {models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              )}
              <span className="compose-hint">
                {PROVIDERS[connection.provider].local ? 'Local model' : 'Cloud API'} · Enter to send
                / Shift+Enter for a new line
              </span>
            </div>
          </div>
        </div>
      </div>
      {deleting && active && (
        <Modal title="Delete this conversation?" onClose={() => setDeleting(false)}>
          <p className="modal-lead">
            “{active.title}” and its messages will be removed from this browser. Export a backup
            first if you want to keep them.
          </p>
          <div className="dialog-actions">
            <button className="small-button" onClick={() => setDeleting(false)}>
              Cancel
            </button>
            <button
              className="button danger-button"
              onClick={() => {
                update((old) => ({
                  ...old,
                  conversations: old.conversations.filter((thread) => thread.id !== activeId),
                }));
                setActiveId('');
                setDeleting(false);
              }}
            >
              Delete conversation
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
