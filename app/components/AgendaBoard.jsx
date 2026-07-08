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

// Só o horário de início (compacto, para os quadradinhos da grade).
function eventStartLabel(event) {
  return event.allDay ? 'Dia todo' : formatTime(event.start);
}

// ─── HELPERS DE GRADE (semana / mês) ───────────────────────────────────────────

const WEEKDAY_ABBR = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

// Converte uma chave YYYY-MM-DD em Date "ao meio-dia SP" (evita salto de fuso).
function dateFromKey(key) {
  return new Date(`${key}T12:00:00-03:00`);
}

// Chave YYYY-MM-DD de um Date.
function keyFromDate(d) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
}

// Dia da semana (0=Dom … 6=Sáb) de uma chave, no fuso SP.
function weekdayOf(key) {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(dateFromKey(key));
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(wd);
}

// Gera as chaves dos 7 dias da semana que contém `todayKey`, começando na segunda.
function weekKeys() {
  const today = todayKey();
  const wd = weekdayOf(today);            // 0=Dom … 6=Sáb
  const offsetToMonday = wd === 0 ? -6 : 1 - wd;
  const base = dateFromKey(today);
  const keys = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(base.getTime() + (offsetToMonday + i) * 24 * 60 * 60 * 1000);
    keys.push(keyFromDate(d));
  }
  return keys; // SEG … DOM
}

// Gera a grade do mês atual (semanas de segunda a domingo) que contém hoje.
function monthGrid() {
  const today = dateFromKey(todayKey());
  const year = Number(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric' }).format(today));
  const month = Number(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, month: 'numeric' }).format(today));
  const firstKey = `${year}-${String(month).padStart(2, '0')}-01`;
  const wd = weekdayOf(firstKey);          // dia da semana do dia 1
  const offsetToMonday = wd === 0 ? -6 : 1 - wd;
  const gridStart = new Date(dateFromKey(firstKey).getTime() + offsetToMonday * 24 * 60 * 60 * 1000);
  const weeks = [];
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const cur = new Date(gridStart.getTime() + (w * 7 + d) * 24 * 60 * 60 * 1000);
      const key = keyFromDate(cur);
      const inMonth = Number(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, month: 'numeric' }).format(cur)) === month;
      week.push({ key, inMonth });
    }
    weeks.push(week);
    // Para de gerar linhas extras se a última semana já passou do mês.
    const lastKey = week[6].key;
    if (Number(lastKey.slice(5, 7)) !== month && w >= 4) break;
  }
  return { weeks, month, year };
}

function monthLabel(month, year) {
  const d = dateFromKey(`${year}-${String(month).padStart(2, '0')}-01`);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: TZ }).toUpperCase();
}

// Indexa eventos por chave de dia (para lookup rápido na grade).
function indexByDay(events) {
  const map = new Map();
  for (const ev of events) {
    const key = dayKeyOf(ev);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(ev);
  }
  return map;
}

// ─── GERENCIADOR — CONEXÃO COM A AGENDA ────────────────────────────────────────

export default function AgendaSync({ initialId = '', onIdChange, initialView = 'list', onViewChange }) {
  const [calendarId, setCalendarId] = useState(initialId);
  const [view, setView] = useState(initialView || 'list'); // list | week | month
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

  const handleViewChange = (value) => {
    setView(value);
    onViewChange?.(value);
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

      {/* Seletor de visualização — como a agenda aparece na TV */}
      <div style={{ padding: '2px 16px 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>Exibição na TV:</span>
        <div style={{ display: 'inline-flex', border: '1px solid #CBD5E1', borderRadius: 'var(--border-radius-md)', overflow: 'hidden' }}>
          {[
            { id: 'list', label: 'Lista' },
            { id: 'week', label: 'Semana' },
            { id: 'month', label: 'Mês' },
          ].map((opt, i) => {
            const active = view === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleViewChange(opt.id)}
                style={{
                  padding: '5px 12px', fontSize: '12px', fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                  borderLeft: i > 0 ? '1px solid #CBD5E1' : 'none',
                  background: active ? '#00358E' : '#fff',
                  color: active ? '#fff' : '#475569',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
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

export function AgendaDisplay({ boardTitle, events = [], titleStyle: rawTitleStyle, viewMode = 'list' }) {
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
        padding: viewMode === 'list' ? '1.4vw 3vw 4.8vw' : '1.2vw 2vw 2vw',
        overscrollBehavior: 'contain',
      }}>
        {viewMode === 'week'
          ? <WeekGrid events={events} />
          : viewMode === 'month'
            ? <MonthGrid events={events} />
            : (
              grouped.length > 0 ? (
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
              )
            )}
      </div>
    </div>
  );
}

// ─── GRADE SEMANAL (7 colunas SEG–DOM) ─────────────────────────────────────────

function WeekGrid({ events }) {
  const keys = weekKeys();
  const byDay = indexByDay(events);
  const today = todayKey();

  // Fonte escala pelo dia mais cheio da semana (evita estourar as colunas).
  const maxPerDay = Math.max(1, ...keys.map(k => (byDay.get(k) || []).length));
  let evSize, timeSize, descSize;
  if (maxPerDay <= 3) { evSize = '0.95vw'; timeSize = '0.85vw'; descSize = '0.72vw'; }
  else if (maxPerDay <= 6) { evSize = '0.8vw'; timeSize = '0.72vw'; descSize = '0.62vw'; }
  else { evSize = '0.68vw'; timeSize = '0.62vw'; descSize = '0.55vw'; }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5vw', height: '100%' }}>
      {keys.map((key) => {
        const isToday = key === today;
        const dayEvents = byDay.get(key) || [];
        const wd = weekdayOf(key);
        return (
          <div key={key} style={{
            display: 'flex', flexDirection: 'column',
            border: `1px solid ${isToday ? '#00358E' : '#D1D5DB'}`,
            borderRadius: '6px', overflow: 'hidden', minHeight: 0,
          }}>
            <div style={{
              textAlign: 'center', padding: '0.5vw 0.3vw',
              background: isToday ? '#00358E' : '#EAF1FB',
              borderBottom: `1px solid ${isToday ? '#00358E' : '#D1D5DB'}`,
            }}>
              <div style={{ fontSize: '0.85vw', fontWeight: 800, letterSpacing: '0.04em', color: isToday ? '#fff' : '#00358E' }}>
                {WEEKDAY_ABBR[wd]}
              </div>
              <div style={{ fontSize: '0.75vw', fontWeight: 500, color: isToday ? 'rgba(255,255,255,0.85)' : '#64748B' }}>
                {dayDate(key)}
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.35vw', padding: '0.4vw' }}>
              {dayEvents.map((event, i) => (
                <div key={event.id || i} style={{
                  background: '#F8FAFC', borderLeft: '2px solid #00358E', borderRadius: '3px',
                  padding: '0.3vw 0.4vw',
                }}>
                  <div style={{ fontSize: timeSize, fontWeight: 800, color: '#00358E' }}>{eventStartLabel(event)}</div>
                  <div style={{ fontSize: evSize, fontWeight: 600, color: '#1F2937', lineHeight: 1.2 }}>{event.summary}</div>
                  {event.description && (
                    <div style={{ fontSize: descSize, color: '#6B7280', lineHeight: 1.25, marginTop: '0.1vw' }}>{event.description}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── GRADE MENSAL (estilo Google Agenda) ───────────────────────────────────────

function MonthGrid({ events }) {
  const { weeks, month, year } = monthGrid();
  const byDay = indexByDay(events);
  const today = todayKey();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.4vw' }}>
      <div style={{ textAlign: 'center', fontSize: '1.1vw', fontWeight: 800, color: '#00358E', letterSpacing: '0.04em' }}>
        {monthLabel(month, year)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.3vw' }}>
        {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.75vw', fontWeight: 700, color: '#64748B', padding: '0.2vw 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateRows: `repeat(${weeks.length}, 1fr)`, gap: '0.3vw' }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.3vw', minHeight: 0 }}>
            {week.map(({ key, inMonth }) => {
              const isToday = key === today;
              const dayEvents = byDay.get(key) || [];
              return (
                <div key={key} style={{
                  border: `1px solid ${isToday ? '#00358E' : '#E5E7EB'}`,
                  borderRadius: '4px', overflow: 'hidden',
                  display: 'flex', flexDirection: 'column', minHeight: 0,
                  background: inMonth ? '#fff' : '#F8FAFC',
                  opacity: inMonth ? 1 : 0.55,
                }}>
                  <div style={{
                    fontSize: '0.7vw', fontWeight: 700, padding: '0.15vw 0.35vw',
                    color: isToday ? '#fff' : '#334155',
                    background: isToday ? '#00358E' : 'transparent',
                  }}>
                    {Number(key.slice(8, 10))}
                  </div>
                  <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.12vw', padding: '0 0.25vw 0.2vw' }}>
                    {dayEvents.map((event, i) => (
                      <div key={event.id || i} style={{
                        fontSize: '0.62vw', lineHeight: 1.15, color: '#1F2937',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        background: '#EAF1FB', borderRadius: '2px', padding: '0.05vw 0.25vw',
                      }}>
                        <span style={{ fontWeight: 800, color: '#00358E' }}>{event.allDay ? '' : `${formatTime(event.start)} `}</span>
                        {event.summary}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
