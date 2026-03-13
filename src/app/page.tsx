'use client';

import { useChat } from '@ai-sdk/react';
import { isToolUIPart, DefaultChatTransport } from 'ai';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import type { ChatAgentUIMessage } from '@/lib/agents/chat-agent';

interface Instance {
  id: number;
  name: string;
}

export default function Page() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingInstances, setLoadingInstances] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedInstanceRef = useRef<Instance | null>(null);

  // Keep ref in sync
  useEffect(() => {
    selectedInstanceRef.current = selectedInstance;
  }, [selectedInstance]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: () => ({
          instanceId: selectedInstanceRef.current?.id,
          instanceName: selectedInstanceRef.current?.name,
        }),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const { messages, sendMessage, status, stop } = useChat<ChatAgentUIMessage>({
    transport,
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  // Load instances on mount
  useEffect(() => {
    setLoadingInstances(true);
    fetch('/api/instances')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setInstances(data);
      })
      .catch(() => {})
      .finally(() => setLoadingInstances(false));
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (status === 'ready') inputRef.current?.focus();
  }, [status]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredInstances = useMemo(() => {
    if (!searchQuery) return instances.slice(0, 50);
    const q = searchQuery.toLowerCase();
    return instances.filter(i => i.name.toLowerCase().includes(q)).slice(0, 50);
  }, [instances, searchQuery]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;
      sendMessage({ text: input });
      setInput('');
    },
    [input, isLoading, sendMessage],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit],
  );

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <span className="logo-text">Humand Agent</span>
          </div>

          {/* Instance selector */}
          <div className="instance-selector" ref={dropdownRef}>
            <button
              className="instance-trigger"
              onClick={() => setShowDropdown(!showDropdown)}
              type="button"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>
                {loadingInstances
                  ? 'Cargando...'
                  : selectedInstance
                    ? selectedInstance.name
                    : 'Seleccionar cliente'}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showDropdown && (
              <div className="instance-dropdown">
                <input
                  className="instance-search"
                  placeholder="Buscar cliente..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <div className="instance-list">
                  {selectedInstance && (
                    <button
                      className="instance-option instance-option-clear"
                      onClick={() => {
                        setSelectedInstance(null);
                        setShowDropdown(false);
                        setSearchQuery('');
                      }}
                      type="button"
                    >
                      Limpiar selección
                    </button>
                  )}
                  {filteredInstances.map(inst => (
                    <button
                      key={inst.id}
                      className={`instance-option ${selectedInstance?.id === inst.id ? 'instance-option-active' : ''}`}
                      onClick={() => {
                        setSelectedInstance(inst);
                        setShowDropdown(false);
                        setSearchQuery('');
                      }}
                      type="button"
                    >
                      <span className="instance-name">{inst.name}</span>
                      <span className="instance-id">#{inst.id}</span>
                    </button>
                  ))}
                  {filteredInstances.length === 0 && (
                    <div className="instance-empty">No se encontraron clientes</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="header-status">
            {isLoading && (
              <span className="status-badge">
                <span className="pulse-dot" />
                {status === 'submitted' ? 'Thinking...' : 'Streaming'}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="messages-container">
        <div className="messages-inner">
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <h2 className="empty-title">Humand Data Agent</h2>
              <p className="empty-subtitle">
                {selectedInstance
                  ? `Consultando datos de ${selectedInstance.name}`
                  : 'Seleccioná un cliente arriba o preguntame directamente'}
              </p>
              <div className="suggestions">
                {(selectedInstance
                  ? [
                      '¿Cuántos DAU tiene este cliente?',
                      'Haceme un análisis descriptivo',
                      '¿Cuál es el mejor momento para publicar?',
                      '¿Cuál es el NPS?',
                    ]
                  : [
                      '¿Cuántos DAU tiene LUZU TV?',
                      'Buscame la instancia de Banco Galicia',
                      '¿Qué clientes hay con más de 1000 usuarios?',
                    ]
                ).map(suggestion => (
                  <button
                    key={suggestion}
                    className="suggestion-chip"
                    onClick={() => sendMessage({ text: suggestion })}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(message => (
            <div
              key={message.id}
              className={`message ${message.role === 'user' ? 'message-user' : 'message-assistant'}`}
            >
              {message.role === 'assistant' && (
                <div className="avatar avatar-assistant">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
              )}
              <div className={`message-content ${message.role === 'user' ? 'message-content-user' : 'message-content-assistant'}`}>
                {message.parts.map((part, i) => {
                  if (part.type === 'text') {
                    // Strip context prefix from display
                    const text = part.text.replace(
                      /\[Contexto: Cliente seleccionado[^\]]*\]\n\n/,
                      '',
                    );
                    if (!text) return null;
                    return (
                      <div key={i} className="text-content markdown-body">
                        <ReactMarkdown>{text}</ReactMarkdown>
                      </div>
                    );
                  }

                  if (isToolUIPart(part)) {
                    return <ToolCard key={part.toolCallId} part={part} />;
                  }

                  return null;
                })}
              </div>
            </div>
          ))}

          {status === 'submitted' && (
            <div className="message message-assistant">
              <div className="avatar avatar-assistant">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="message-content message-content-assistant">
                <div className="thinking-indicator">
                  <span className="thinking-dot" />
                  <span className="thinking-dot" />
                  <span className="thinking-dot" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      <footer className="input-container">
        <form onSubmit={handleSubmit} className="input-form">
          <div className="input-wrapper">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedInstance
                  ? `Preguntá sobre ${selectedInstance.name}...`
                  : 'Preguntá sobre cualquier cliente...'
              }
              disabled={isLoading}
              rows={1}
              className="chat-input"
            />
            {isLoading ? (
              <button type="button" onClick={() => stop()} className="stop-button" title="Detener">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            ) : (
              <button type="submit" disabled={!input.trim()} className="send-button" title="Enviar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            )}
          </div>
        </form>
      </footer>
    </div>
  );
}

function ToolIcon({ name }: { name: string }) {
  switch (name) {
    case 'executeSql':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5V19A9 3 0 0 0 21 19V5" />
          <path d="M3 12A9 3 0 0 0 21 12" />
        </svg>
      );
    case 'queryRedash':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    case 'getWeather':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
        </svg>
      );
    case 'calculate':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="16" height="20" x="4" y="2" rx="2" />
          <line x1="8" x2="16" y1="6" y2="6" />
          <line x1="16" x2="16" y1="14" y2="18" />
          <path d="M16 10h.01" />
          <path d="M12 10h.01" />
          <path d="M8 10h.01" />
          <path d="M12 14h.01" />
          <path d="M8 14h.01" />
          <path d="M12 18h.01" />
          <path d="M8 18h.01" />
        </svg>
      );
    default:
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ToolCard({ part }: { part: any }) {
  const [expanded, setExpanded] = useState(false);

  const toolLabels: Record<string, string> = {
    executeSql: 'SQL Query',
    queryRedash: 'Redash Query',
    getWeather: 'Weather',
    calculate: 'Calculator',
  };

  const label = toolLabels[part.toolName] || part.toolName;

  const isRunning = part.state === 'input-streaming' || part.state === 'input-available';
  const isDone = part.state === 'output-available';

  // Show the description the agent provided
  const hasInput = part.state === 'input-available' || part.state === 'output-available';
  const agentDescription = hasInput && part.input?.description ? part.input.description : null;

  // Fallback subtitle: SQL preview or query ID
  const sqlPreview =
    !agentDescription &&
    part.toolName === 'executeSql' &&
    hasInput &&
    part.input?.sql
      ? part.input.sql.length > 60
        ? part.input.sql.substring(0, 60) + '...'
        : part.input.sql
      : null;

  const queryIdPreview =
    !agentDescription &&
    part.toolName === 'queryRedash' &&
    hasInput &&
    part.input?.queryId
      ? `Query #${part.input.queryId}`
      : null;

  const subtitle = agentDescription || sqlPreview || queryIdPreview;

  // Row count from output
  const rowCount =
    isDone && part.output?.rowCount !== undefined
      ? `${part.output.rowCount} rows`
      : null;

  return (
    <div className={`tool-card ${isDone ? 'tool-done' : 'tool-running'}`}>
      <button
        className="tool-header"
        onClick={() => isDone && setExpanded(!expanded)}
        type="button"
      >
        <div className="tool-header-left">
          <span className="tool-icon-svg">
            <ToolIcon name={part.toolName} />
          </span>
          <div className="tool-info">
            <span className="tool-label">{label}</span>
            {subtitle && (
              <span className={agentDescription ? 'tool-subtitle' : 'tool-subtitle tool-subtitle-code'}>
                {subtitle}
              </span>
            )}
          </div>
        </div>
        <div className="tool-header-right">
          {isRunning && <span className="tool-spinner" />}
          {isDone && rowCount && <span className="tool-row-count">{rowCount}</span>}
          {isDone && (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`chevron ${expanded ? 'chevron-open' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </div>
      </button>

      {expanded && isDone && (
        <div className="tool-body">
          {part.input && (
            <div className="tool-section">
              <span className="tool-section-label">Input</span>
              <pre className="tool-pre">{JSON.stringify(part.input, null, 2)}</pre>
            </div>
          )}
          {part.output && (
            <div className="tool-section">
              <span className="tool-section-label">Output</span>
              <pre className="tool-pre">
                {JSON.stringify(part.output, null, 2).substring(0, 3000)}
                {JSON.stringify(part.output, null, 2).length > 3000 ? '\n... (truncated)' : ''}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
