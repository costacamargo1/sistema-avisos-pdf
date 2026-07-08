'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, CalendarDays, Copy, Check } from 'lucide-react';

const TZ = 'America/Sao_Paulo';

// ─── HELPERS DE DATA (fuso de São Paulo) ───────────────────────────────────────

// Dia (YYYY-MM-DD) de um evento. Eventos de dia inteiro já vêm como YYYY-MM-DD
// e não podem passar por new Date() (viraria véspera por causa do fuso).
function dayKeyOf(event) {
  if (event.allDay) return String(event.start).slice(0, 10);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(event.start));
}

function todayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

function tomorrowKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(Date.now() + 24 * 60 * 60 * 1000));
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
}

function dayLabel(dayKey) {
  if (dayKey === todayKey()) return 'HOJE';
  if (dayKey === tomorrowKey()) return 'AMANHÃ';
  const d = new Date(`${dayKey}T12:00:00-03:00`);
  return d.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: TZ }).toUpperCase();
}

function dayDate(dayKey) {
  const d = new Date(`${dayKey}T12:00:00-03:00`);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: TZ });
}

// Agrupa eventos por dia, preservando a ordem cronológica vinda da API.
function groupByDay(events) {
  const groups = new Map();
  for (const event of events) {
    const key = dayKeyOf(event);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function eventTimeLabel(event) {
  if (event.allDay) return 'Dia todo';
  const start = formatTime(event.start);
  const end = event.end ? formatTime(event.end) : '';
  return end && end !== start ? `${start} – ${end}` : start;
}

// ─── GERENCIADOR — CONEXÃO COM A AGENDA ────────────────────────────────────────

export default function AgendaSync({ initialId = '', onIdChange }) {
  const [calendarId, setCalendarId] = useState(initialId);
  const [status, setStatus] = useState('idle'); // idle | loading | ok | error
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null); // { title, events }
  const [serviceEmail, setServiceEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const saveTimer = useRef(null);

  const persistId = useCallback((value) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onIdChange?.(value), 400);
  }, [onIdChange]);

  const fetchPreview = useCallback(async (value) => {
    const target = (value ?? calendarId).trim();
    if (!target) {
      setStatus('idle');
      setPreview(null);
      setError('');
      return;
    }
    setStatus('loading');
    setError('');
    try {
      const res = await fetch(`/api/calendar?calendar=${encodeURIComponent(target)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus('error');
        setError(data?.error || 'Falha ao ler a agenda.');
        setPreview(null);
        return;
      }
      setStatus('ok');
      setPreview(data);
    } catch {
      setStatus('error');
      setError('Não foi possível conectar ao servidor.');
      setPreview(null);
    }
  }, [calendarId]);

  // Carrega o preview ao montar (se já houver agenda salva) e o e-mail da conta de serviço.
  useEffect(() => {
    if (initialId?.trim()) fetchPreview(initialId);
    fetch('/api/calendar')
      .then(res => res.json())
      .then(data => { if (data?.serviceAccountEmail) setServiceEmail(data.serviceAccountEmail); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (value) => {
    setCalendarId(value);
    persistId(value);
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(serviceEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const grouped = preview?.events?.length ? groupByDay(preview.events) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Barra do ID — padding extra no topo p/ não colidir com os badges flutuantes do quadro */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '48px 16px 12px',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        background: 'var(--color-background-secondary)',
      }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
          background: '#fff',
          border: '1px solid #CBD5E1',
          borderRadius: 'var(--border-radius-md)',
          padding: '0 12px',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}>
          <CalendarDays style={{ width: 15, height: 15, color: '#64748B', flexShrink: 0 }} />
          <input
            value={calendarId}
            onChange={e => handleChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') fetchPreview(); }}
            onFocus={e => {
              const wrap = e.currentTarget.parentElement;
              if (wrap) {
                wrap.style.borderColor = '#00358E';
                wrap.style.boxShadow = '0 0 0 3px rgba(0, 53, 142, 0.15)';
              }
            }}
            onBlur={e => {
              const wrap = e.currentTarget.parentElement;
              if (wrap) {
                wrap.style.borderColor = '#CBD5E1';
                wrap.style.boxShadow = '0 1px 2px rgba(15, 23, 42, 0.04)';
              }
            }}
            placeholder="Cole aqui o ID da agenda (ex.: fulano@gmail.com ou xxx@group.calendar.google.com)…"
            style={{
              flex: 1, fontSize: '13px', fontFamily: 'var(--font-sans)',
              background: 'transparent', border: 'none', outline: 'none',
              padding: '10px 0',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>
        <button
          onClick={() => fetchPreview()}
          disabled={status === 'loading' || !calendarId.trim()}
          title="Atualizar agora"
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: 'var(--border-radius-md)',
            border: 'none', cursor: calendarId.trim() ? 'pointer' : 'default',
            fontSize: '12px', fontWeight: 600,
            background: calendarId.trim() ? '#00358E' : '#E5E7EB',
            color: calendarId.trim() ? '#fff' : '#9CA3AF',
            whiteSpace: 'nowrap',
          }}
        >
          <RefreshCw style={{ width: 14, height: 14 }} className={status === 'loading' ? 'animate-spin' : ''} />
          Atualizar agora
        </button>
      </div>

      {/* Status + e-mail da conta de serviço */}
      <div style={{ padding: '8px 16px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {status === 'idle' && (
          <span style={{ color: 'var(--color-text-tertiary)' }}>
            A TV atualiza a agenda automaticamente a cada 20 minutos e exibe os próximos 7 dias.
          </span>
        )}
        {status === 'loading' && (
          <span style={{ color: 'var(--color-text-tertiary)' }}>Lendo agenda…</span>
        )}
        {status === 'ok' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#16A34A' }}>
            <CheckCircle2 style={{ width: 14, height: 14 }} />
            Conectado — “{preview?.title}” · {preview?.events?.length || 0} evento(s) nos próximos {preview?.days || 7} dias
          </span>
        )}
        {status === 'error' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#B91C1C' }}>
            <AlertCircle style={{ width: 14, height: 14 }} />
            {error}
          </span>
        )}
        {serviceEmail && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-tertiary)', flexWrap: 'wrap' }}>
            O dono da agenda precisa compartilhá-la com:
            <code style={{ fontSize: '11px', background: '#F3F4F6', border: '0.5px solid #E5E7EB', borderRadius: '4px', padding: '1px 6px' }}>
              {serviceEmail}
            </code>
            <button
              onClick={copyEmail}
              title="Copiar e-mail"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                border: 'none', background: 'none', cursor: 'pointer',
                fontSize: '11px', fontWeight: 600, color: copied ? '#16A34A' : '#00358E', padding: 0,
              }}
            >
              {copied ? <Check style={{ width: 12, height: 12 }} /> : <Copy style={{ width: 12, height: 12 }} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </span>
        )}
      </div>

      {/* Preview dos eventos */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 16px 16px' }}>
        {grouped.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {grouped.map(([dayKey, events]) => (
              <div key={dayKey} style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', overflow: 'hidden' }}>
                <div style={{
                  display: 'flex', alignItems: 'baseline', gap: '8px',
                  padding: '6px 10px', background: '#EAF1FB',
                  borderBottom: '0.5px solid #D1D5DB',
                }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#00358E', letterSpacing: '0.03em' }}>
                    {dayLabel(dayKey)}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>{dayDate(dayKey)}</span>
                </div>
                {events.map((event, i) => (
                  <div key={event.id || i} style={{
                    display: 'flex', alignItems: 'baseline', gap: '10px',
                    padding: '6px 10px',
                    borderBottom: i < events.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none',
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#00358E', whiteSpace: 'nowrap', minWidth: '86px' }}>
                      {eventTimeLabel(event)}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                      {event.summary}
                      {event.location && (
                        <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}> · {event.location}</span>
                      )}
                      {event.description && (
                        <span style={{ display: 'block', color: 'var(--color-text-tertiary)', fontWeight: 400, marginTop: '2px' }}>
                          {event.description}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          status !== 'loading' && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', minHeight: 120,
              color: 'var(--color-text-tertiary)', fontSize: '13px', textAlign: 'center',
            }}>
              {status === 'error'
                ? 'Corrija o ID ou o compartilhamento e tente novamente.'
                : status === 'ok'
                  ? 'Agenda conectada, sem eventos nos próximos 7 dias.'
                  : 'Cole o ID da agenda para visualizar os eventos.'}
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ─── TV DISPLAY — AGENDA DOS PRÓXIMOS DIAS ─────────────────────────────────────
// Mesmo cabeçalho/identidade visual do GoogleSheetDisplay (SheetBoard.jsx).

export function AgendaDisplay({ boardTitle, events = [], titleStyle: rawTitleStyle }) {
  const titleStyle = rawTitleStyle ?? {};
  const grouped = groupByDay(events);

  // Escala a fonte conforme o nº de eventos para caber sem rolar na TV.
  const count = events.length || 1;
  let daySize, timeSize, titleSize, descSize, rowPad, dayPad, gap;
  if (count <= 6) {
    daySize = '1.15vw'; timeSize = '1.25vw'; titleSize = '1.4vw'; descSize = '1.05vw'; rowPad = '0.7vw 1.1vw'; dayPad = '0.5vw 1.1vw'; gap = '1.1vw';
  } else if (count <= 12) {
    daySize = '1vw'; timeSize = '1.05vw'; titleSize = '1.15vw'; descSize = '0.9vw'; rowPad = '0.5vw 1vw'; dayPad = '0.4vw 1vw'; gap = '0.9vw';
  } else if (count <= 18) {
    daySize = '0.85vw'; timeSize = '0.9vw'; titleSize = '1vw'; descSize = '0.8vw'; rowPad = '0.36vw 0.9vw'; dayPad = '0.3vw 0.9vw'; gap = '0.7vw';
  } else {
    daySize = '0.75vw'; timeSize = '0.78vw'; titleSize = '0.86vw'; descSize = '0.72vw'; rowPad = '0.26vw 0.8vw'; dayPad = '0.24vw 0.8vw'; gap = '0.55vw';
  }

  const resolvedTitleFontFamily = titleStyle.fontFamily
    ? `'${titleStyle.fontFamily}', sans-serif`
    : "'Aptos', 'Montserrat', sans-serif";

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      backgroundColor: '#fff', position: 'relative',
      fontFamily: "'Aptos', 'Montserrat', sans-serif",
    }}>
      <div style={{ borderBottom: '2px solid #E5E7EB', padding: '1.4vw 3vw 1vw', textAlign: 'center' }}>
        <span style={{
          fontSize: (titleStyle.fontSize && titleStyle.fontSize !== 'auto') ? titleStyle.fontSize : '2.2vw',
          fontWeight: titleStyle.fontWeight ?? 800,
          color: titleStyle.color || '#00358E',
          textTransform: titleStyle.textTransform || 'uppercase',
          letterSpacing: '0.03em',
          fontFamily: resolvedTitleFontFamily,
        }}>
          {boardTitle}
        </span>
      </div>

      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '1.4vw 3vw 4.8vw',
        overscrollBehavior: 'contain',
      }}>
        {grouped.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap }}>
            {grouped.map(([dayKey, dayEvents]) => {
              const isToday = dayKey === todayKey();
              return (
                <div key={dayKey} style={{
                  border: `1px solid ${isToday ? '#00358E' : '#D1D5DB'}`,
                  borderRadius: '6px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'baseline', gap: '0.8vw',
                    padding: dayPad,
                    background: isToday ? '#00358E' : '#EAF1FB',
                    borderBottom: `1px solid ${isToday ? '#00358E' : '#D1D5DB'}`,
                  }}>
                    <span style={{
                      fontSize: daySize, fontWeight: 800, letterSpacing: '0.05em',
                      color: isToday ? '#fff' : '#00358E',
                    }}>
                      {dayLabel(dayKey)}
                    </span>
                    <span style={{ fontSize: daySize, fontWeight: 500, color: isToday ? 'rgba(255,255,255,0.8)' : '#64748B' }}>
                      {dayDate(dayKey)}
                    </span>
                  </div>
                  {dayEvents.map((event, i) => (
                    <div key={event.id || i} style={{
                      display: 'flex', alignItems: 'baseline', gap: '1.2vw',
                      padding: rowPad,
                      borderBottom: i < dayEvents.length - 1 ? '1px solid #E5E7EB' : 'none',
                    }}>
                      <span style={{
                        fontSize: timeSize, fontWeight: 800, color: '#00358E',
                        whiteSpace: 'nowrap', minWidth: '9vw',
                      }}>
                        {eventTimeLabel(event)}
                      </span>
                      <span style={{ fontSize: titleSize, fontWeight: 600, color: '#1F2937', lineHeight: 1.25 }}>
                        {event.summary}
                        {event.location && (
                          <span style={{ color: '#6B7280', fontWeight: 400 }}> · {event.location}</span>
                        )}
                        {event.description && (
                          <span style={{ display: 'block', fontSize: descSize, color: '#6B7280', fontWeight: 400, lineHeight: 1.3, marginTop: '0.15vw' }}>
                            {event.description}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', color: '#9CA3AF', fontSize: '1.4vw',
          }}>
            Sem eventos nos próximos 7 dias.
          </div>
        )}
      </div>
    </div>
  );
}
