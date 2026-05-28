'use client';

import React, { useState, useRef } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Bold, Minus, RotateCcw } from 'lucide-react';

const generateId = () => Math.random().toString(36).substr(2, 9);
const MIN_COLUMN_FLEX = 0.6;
const MAX_COLUMN_FLEX = 3.4;
const COLUMN_FLEX_STEP = 0.2;

// Paleta de cores para formatacao de coluna (mesma identidade da lista estruturada).
const CELL_COLOR_PRESETS = [
  { value: '', label: 'Padrão' },
  { value: '#00358E', label: 'Azul' },
  { value: '#111827', label: 'Preto' },
  { value: '#B91C1C', label: 'Vermelho' },
  { value: '#C2410C', label: 'Laranja' },
  { value: '#16A34A', label: 'Verde' },
  { value: '#9333EA', label: 'Roxo' },
];

// Formatacao de coluna fica em headers._fmt[colKey] = { color, bold }.
const getColumnFmt = (headers, key) => (headers?._fmt?.[key]) || {};
const hasManualColumnFlex = (headers, key) =>
  Boolean(headers?._widths && Object.prototype.hasOwnProperty.call(headers._widths, key));

const CELL_INPUT_STYLE = {
  width: '100%', fontSize: '12px', fontFamily: 'var(--font-sans)',
  background: 'none', border: 'none', borderBottom: '0.5px solid transparent',
  outline: 'none', padding: '4px 4px', color: 'var(--color-text-primary)',
  transition: 'border-color 0.15s',
};

// Colunas fixas da planilha de Controle de Ações (Cotação de Preço).
// `label` é apenas o título padrão — o usuário pode renomear cada cabeçalho.
// `flex` controla a largura relativa de cada coluna na TV e no editor.
const COLUMNS = [
  { key: 'orgao',     label: 'ÓRGÃO',                flex: 1.3 },
  { key: 'pregao',    label: 'PREGÃO',               flex: 0.9 },
  { key: 'abertura',  label: 'ABERTURA',             flex: 0.9 },
  { key: 'prazo',     label: 'PRAZO',                flex: 0.9 },
  { key: 'produto',   label: 'PRODUTO',              flex: 1.6 },
  { key: 'acao',      label: 'AÇÃO',                 flex: 1.8 },
  { key: 'ri',        label: 'R.I',                  flex: 1.0 },
  { key: 'retorno',   label: 'RETORNO',              flex: 1.0 },
  { key: 'resultado', label: 'RESULTADO DO PROCESSO', flex: 1.4 },
];

const emptyRow = () =>
  COLUMNS.reduce((acc, c) => ({ ...acc, [c.key]: '' }), { id: generateId() });

const resolveHeaderLabel = (headers, col) => {
  const value = headers?.[col.key];
  return typeof value === 'string' ? value.trim() : '';
};

const headerHasContent = (headers, col) => Boolean(resolveHeaderLabel(headers, col));

const getColumnFlex = (headers, col, rows = []) => {
  const customFlex = Number(headers?._widths?.[col.key]);
  if (Number.isFinite(customFlex) && customFlex > 0) return customFlex;

  const longestCell = rows.reduce((max, row) => {
    const length = String(row?.[col.key] || '').trim().length;
    return Math.max(max, length);
  }, 0);

  if (longestCell === 0) {
    return Math.max(MIN_COLUMN_FLEX, Math.min(col.flex, 0.9));
  }

  let contentFlex = 0.9;
  if (longestCell >= 80) contentFlex = 3.0;
  else if (longestCell >= 56) contentFlex = 2.6;
  else if (longestCell >= 36) contentFlex = 2.2;
  else if (longestCell >= 22) contentFlex = 1.7;
  else if (longestCell >= 14) contentFlex = 1.3;

  return Math.max(MIN_COLUMN_FLEX, Math.min(MAX_COLUMN_FLEX, Math.max(Math.min(col.flex, 1.4), contentFlex)));
};

const gridTemplateFor = (cols, headers, rows) => cols.map(c => `${getColumnFlex(headers, c, rows)}fr`).join(' ');

// ─── TV DISPLAY ──────────────────────────────────────────────────────────────
export function SheetBoardDisplay({ boardTitle, rows = [], headers = {}, logoSrc, titleStyle: rawTitleStyle }) {
  const titleStyle = rawTitleStyle ?? {};

  // Coluna aparece no quadro quando o cabecalho esta preenchido.
  const visibleCols = COLUMNS.filter(c => headerHasContent(headers, c));
  const rowsWithContent = rows.filter(row => visibleCols.some(c => String(row[c.key] || '').trim()));
  const displayRows = rowsWithContent.length > 0
    ? rowsWithContent
    : (visibleCols.length > 0 ? (rows.length > 0 ? rows : [{ id: 'empty-display-row' }]) : []);
  const gridTemplate = gridTemplateFor(visibleCols, headers, displayRows);

  // Escala a fonte conforme o número de linhas para evitar transbordo na TV.
  const count = displayRows.length;
  let cellSize, headSize, rowPad;
  if (count <= 6) {
    cellSize = '1.15vw'; headSize = '1.0vw'; rowPad = '0.7vw 0.6vw';
  } else if (count <= 10) {
    cellSize = '0.95vw'; headSize = '0.85vw'; rowPad = '0.5vw 0.55vw';
  } else if (count <= 14) {
    cellSize = '0.82vw'; headSize = '0.75vw'; rowPad = '0.38vw 0.5vw';
  } else {
    cellSize = '0.72vw'; headSize = '0.68vw'; rowPad = '0.3vw 0.45vw';
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
      {/* Title */}
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

      {/* Table */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '1.2vw 2.2vw' }}>
        {visibleCols.length > 0 && (
          <div style={{ border: '1px solid #1F2937', borderRadius: '4px', overflow: 'hidden' }}>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: gridTemplate }}>
              {visibleCols.map((c, i) => (
                <div key={c.key} style={{
                  fontSize: headSize, fontWeight: 800, color: '#00358E',
                  textAlign: 'center', padding: rowPad,
                  borderBottom: '1px solid #1F2937',
                  borderRight: i < visibleCols.length - 1 ? '1px solid #1F2937' : 'none',
                  background: '#EAF1FB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1.15,
                }}>
                  {resolveHeaderLabel(headers, c)}
                </div>
              ))}
            </div>

            {/* Data rows */}
            {displayRows.map((row, ri) => (
              <div key={row.id} style={{ display: 'grid', gridTemplateColumns: gridTemplate }}>
                {visibleCols.map((c, ci) => {
                  const columnFmt = getColumnFmt(headers, c.key);
                  const defaultBold = c.key === 'orgao' || c.key === 'pregao';
                  const defaultColor = c.key === 'ri' || c.key === 'retorno' ? '#B91C1C' : '#1F2937';
                  return (
                    <div key={c.key} style={{
                      fontSize: cellSize,
                      fontWeight: columnFmt.bold ? 800 : (defaultBold ? 700 : 500),
                      color: columnFmt.color || defaultColor,
                      textAlign: c.key === 'acao' || c.key === 'produto' || c.key === 'resultado' ? 'left' : 'center',
                      padding: rowPad,
                      borderBottom: ri < displayRows.length - 1 ? '1px solid #1F2937' : 'none',
                      borderRight: ci < visibleCols.length - 1 ? '1px solid #1F2937' : 'none',
                      display: 'flex', alignItems: 'center',
                      justifyContent: c.key === 'acao' || c.key === 'produto' || c.key === 'resultado' ? 'flex-start' : 'center',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.2,
                    }}>
                      {row[c.key]}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {visibleCols.length === 0 && (
          <div style={{ color: '#9CA3AF', fontSize: '1.6vw', textAlign: 'center', padding: '4vw 0' }}>
            Nenhuma linha cadastrada
          </div>
        )}
      </div>

      {logoSrc && (
        <div style={{ position: 'absolute', bottom: '1.2vw', right: '1.8vw', pointerEvents: 'none', userSelect: 'none' }}>
          <img src={logoSrc} alt="Logo" style={{ height: '3vw', width: 'auto', objectFit: 'contain' }} />
        </div>
      )}
    </div>
  );
}

// ─── TV DISPLAY — ESPELHO LIVRE DO GOOGLE SHEETS ───────────────────────────────
// Renderiza exatamente as colunas (headers) e linhas (rows) recebidas da planilha,
// sem o esquema fixo de 9 colunas. Mesmo visual da SheetBoardDisplay.
// Normaliza o nome do cabeçalho p/ casar regras (sem acento, sem pontuação, minúsculo).
function normalizeHeader(label) {
  return String(label ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Regras fixas de cor/peso por coluna, casadas pelo nome do cabeçalho.
// Mesma identidade visual do modo Planilha manual.
function freeColumnStyle(headerLabel) {
  const key = normalizeHeader(headerLabel);
  if (key === 'orgao' || key === 'pregao') return { color: '#1F2937', bold: true };
  if (key === 'ri') return { color: '#B91C1C', bold: true };
  if (key === 'retorno') return { color: '#B91C1C', bold: false };
  return { color: '#1F2937', bold: false };
}

// Largura relativa de cada coluna no espelho livre, calculada pelo conteúdo.
// Considera o maior texto entre cabeçalho e células daquela coluna.
function freeColumnFlex(headers, rows, colIndex) {
  let longest = String(headers[colIndex] ?? '').trim().length;
  for (const row of rows) {
    const len = String(row?.[colIndex] ?? '').trim().length;
    if (len > longest) longest = len;
  }
  if (longest === 0) return 0.7;
  if (longest >= 80) return 3.0;
  if (longest >= 56) return 2.6;
  if (longest >= 36) return 2.2;
  if (longest >= 22) return 1.7;
  if (longest >= 14) return 1.3;
  if (longest >= 8) return 1.0;
  return 0.8;
}

export function GoogleSheetDisplay({ boardTitle, headers = [], rows = [], logoSrc, titleStyle: rawTitleStyle }) {
  const titleStyle = rawTitleStyle ?? {};
  const colCount = headers.length;
  const gridTemplate = colCount > 0
    ? headers.map((_, i) => `${freeColumnFlex(headers, rows, i)}fr`).join(' ')
    : '1fr';

  // Escala a fonte conforme o nº de linhas para caber sem rolar na TV.
  const count = rows.length || 1;
  let cellSize, headSize, rowPad;
  if (count <= 6) {
    cellSize = '1.1vw'; headSize = '0.95vw'; rowPad = '0.6vw 0.55vw';
  } else if (count <= 10) {
    cellSize = '0.9vw'; headSize = '0.82vw'; rowPad = '0.42vw 0.5vw';
  } else if (count <= 14) {
    cellSize = '0.75vw'; headSize = '0.72vw'; rowPad = '0.3vw 0.45vw';
  } else if (count <= 18) {
    cellSize = '0.64vw'; headSize = '0.64vw'; rowPad = '0.22vw 0.4vw';
  } else {
    cellSize = '0.56vw'; headSize = '0.58vw'; rowPad = '0.16vw 0.35vw';
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

      <div style={{ flex: 1, overflow: 'hidden', padding: '1.2vw 2.2vw' }}>
        {colCount > 0 ? (
          <div style={{ border: '1px solid #1F2937', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: gridTemplate }}>
              {headers.map((h, i) => (
                <div key={i} style={{
                  fontSize: headSize, fontWeight: 800, color: '#00358E',
                  textAlign: 'center', padding: rowPad,
                  borderBottom: '1px solid #1F2937',
                  borderRight: i < colCount - 1 ? '1px solid #1F2937' : 'none',
                  background: '#EAF1FB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1.15, textTransform: 'uppercase',
                }}>
                  {h}
                </div>
              ))}
            </div>

            {rows.map((row, ri) => (
              <div key={ri} style={{ display: 'grid', gridTemplateColumns: gridTemplate }}>
                {headers.map((h, ci) => {
                  const wide = freeColumnFlex(headers, rows, ci) >= 1.7;
                  const colStyle = freeColumnStyle(h);
                  return (
                    <div key={ci} style={{
                      fontSize: cellSize,
                      fontWeight: colStyle.bold ? 800 : 500,
                      color: colStyle.color,
                      textAlign: wide ? 'left' : 'center', padding: rowPad,
                      borderBottom: ri < rows.length - 1 ? '1px solid #1F2937' : 'none',
                      borderRight: ci < colCount - 1 ? '1px solid #1F2937' : 'none',
                      display: 'flex', alignItems: 'center',
                      justifyContent: wide ? 'flex-start' : 'center',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.2,
                    }}>
                      {row[ci] ?? ''}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#9CA3AF', fontSize: '1.6vw', textAlign: 'center', padding: '4vw 0' }}>
            Nenhum dado da planilha
          </div>
        )}
      </div>

      {logoSrc && (
        <div style={{ position: 'absolute', bottom: '1.2vw', right: '1.8vw', pointerEvents: 'none', userSelect: 'none' }}>
          <img src={logoSrc} alt="Logo" style={{ height: '3vw', width: 'auto', objectFit: 'contain' }} />
        </div>
      )}
    </div>
  );
}

// ─── EDITOR ──────────────────────────────────────────────────────────────────
export default function SheetBoard({ initialRows = [], initialHeaders = {}, onUpdate, onHeadersUpdate }) {
  const [rows, setRows] = useState(() => (initialRows.length > 0 ? initialRows : [emptyRow()]));
  const [headers, setHeaders] = useState(() => ({ ...(initialHeaders || {}) }));
  const saveTimer = useRef(null);
  const headerTimer = useRef(null);

  const save = (newRows) => {
    setRows(newRows);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onUpdate?.(newRows), 400);
  };

  const saveHeaders = (next) => {
    setHeaders(next);
    if (headerTimer.current) clearTimeout(headerTimer.current);
    headerTimer.current = setTimeout(() => onHeadersUpdate?.(next), 400);
  };

  const updateHeader = (key, value) => {
    saveHeaders({ ...headers, [key]: value });
  };

  const updateColumnFmt = (key, patch) => {
    const prevFmt = headers._fmt || {};
    const nextColumn = { ...(prevFmt[key] || {}), ...patch };
    if (!nextColumn.color) delete nextColumn.color;
    if (!nextColumn.bold) delete nextColumn.bold;

    const nextFmt = { ...prevFmt };
    if (Object.keys(nextColumn).length === 0) delete nextFmt[key];
    else nextFmt[key] = nextColumn;

    const next = { ...headers };
    if (Object.keys(nextFmt).length === 0) delete next._fmt;
    else next._fmt = nextFmt;

    saveHeaders(next);
  };

  const addRow = () => save([...rows, emptyRow()]);

  const updateCell = (id, key, value) => {
    save(rows.map(r => (r.id === id ? { ...r, [key]: value } : r)));
  };

  const removeRow = (id) => {
    const next = rows.filter(r => r.id !== id);
    save(next.length > 0 ? next : [emptyRow()]);
  };

  const moveRow = (id, dir) => {
    const idx = rows.findIndex(r => r.id === id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= rows.length) return;
    const arr = [...rows];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    save(arr);
  };

  const updateColumnWidth = (key, value) => {
    const prevWidths = headers._widths || {};
    const nextWidths = { ...prevWidths };

    if (value == null) {
      delete nextWidths[key];
    } else {
      const nextValue = Math.max(MIN_COLUMN_FLEX, Math.min(MAX_COLUMN_FLEX, value));
      nextWidths[key] = Number(nextValue.toFixed(1));
    }

    const next = { ...headers };
    if (Object.keys(nextWidths).length === 0) delete next._widths;
    else next._widths = nextWidths;

    saveHeaders(next);
  };

  const editorTemplate = `28px ${gridTemplateFor(COLUMNS, headers, rows)} 64px`;

  const handleFocus = e => { e.target.style.borderBottomColor = '#00358e'; };
  const handleBlur = e => { e.target.style.borderBottomColor = 'transparent'; };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Editable column headers */}
      <div style={{
        display: 'grid', gridTemplateColumns: editorTemplate, gap: '6px',
        padding: '8px 16px 6px',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        background: 'var(--color-background-secondary)',
      }}>
        <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--color-text-tertiary)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>#</div>
        {COLUMNS.map((c, index) => {
          const columnPlaceholder = `Coluna ${index + 1}`;
          return (
            <HeaderEditor
              key={c.key}
              value={headers[c.key] ?? ''}
              placeholder={columnPlaceholder}
              columnFmt={getColumnFmt(headers, c.key)}
              columnFlex={getColumnFlex(headers, c, rows)}
              hasCustomWidth={hasManualColumnFlex(headers, c.key)}
              onChange={value => updateHeader(c.key, value)}
              onFmtChange={patch => updateColumnFmt(c.key, patch)}
              onWidthChange={value => updateColumnWidth(c.key, value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          );
        })}
        <div />
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflow: 'auto', padding: '6px 16px 12px' }}>
        {rows.map((row, idx) => (
          <div key={row.id} style={{
            display: 'grid', gridTemplateColumns: editorTemplate, gap: '6px', alignItems: 'center',
            padding: '4px 8px', marginBottom: '4px',
            border: '0.5px solid var(--color-border-tertiary)',
            borderRadius: 'var(--border-radius-md)',
            background: 'var(--color-background-primary)',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
              {idx + 1}
            </div>

            {COLUMNS.map((c, columnIndex) => (
              <CellEditor
                key={c.key}
                column={c}
                value={row[c.key] || ''}
                columnFmt={getColumnFmt(headers, c.key)}
                placeholder={headers[c.key] || `Coluna ${columnIndex + 1}`}
                onChange={value => updateCell(row.id, c.key, value)}
              />
            ))}

            <div style={{ display: 'flex', gap: '2px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => moveRow(row.id, -1)} disabled={idx === 0} title="Mover para cima"
                style={{
                  width: 20, height: 20, border: 'none', background: 'none',
                  cursor: idx === 0 ? 'default' : 'pointer', borderRadius: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: idx === 0 ? 'var(--color-border-secondary)' : 'var(--color-text-tertiary)',
                }}
              >
                <ChevronUp style={{ width: 13, height: 13 }} />
              </button>
              <button
                onClick={() => moveRow(row.id, 1)} disabled={idx === rows.length - 1} title="Mover para baixo"
                style={{
                  width: 20, height: 20, border: 'none', background: 'none',
                  cursor: idx === rows.length - 1 ? 'default' : 'pointer', borderRadius: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: idx === rows.length - 1 ? 'var(--color-border-secondary)' : 'var(--color-text-tertiary)',
                }}
              >
                <ChevronDown style={{ width: 13, height: 13 }} />
              </button>
              <button
                onClick={() => removeRow(row.id)} title="Excluir linha"
                style={{
                  width: 20, height: 20, border: 'none', background: 'none', cursor: 'pointer',
                  borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--color-text-tertiary)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#FCEBEB'; e.currentTarget.style.color = '#A32D2D'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--color-text-tertiary)'; }}
              >
                <Trash2 style={{ width: 12, height: 12 }} />
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={addRow}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            width: '100%', marginTop: '6px', padding: '9px 12px',
            border: '0.5px dashed var(--color-border-secondary)',
            borderRadius: 'var(--border-radius-md)',
            background: 'none', cursor: 'pointer',
            color: 'var(--color-text-tertiary)', fontSize: '13px',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-background-secondary)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--color-text-tertiary)'; }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          Adicionar linha
        </button>
      </div>
    </div>
  );
}

function HeaderEditor({
  value,
  placeholder,
  columnFmt,
  columnFlex,
  hasCustomWidth,
  onChange,
  onFmtChange,
  onWidthChange,
  onFocus,
  onBlur,
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);

  const show = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={show}
      onMouseLeave={scheduleClose}
    >
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={e => { onFocus(e); show(); }}
        onBlur={e => { onBlur(e); scheduleClose(); }}
        placeholder={placeholder}
        title="Renomear cabecalho"
        style={{
          width: '100%', fontSize: '10px', fontWeight: 700,
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase', letterSpacing: '0.04em',
          background: 'none', border: 'none',
          borderBottom: '0.5px solid transparent', outline: 'none',
          padding: '2px 2px', transition: 'border-color 0.15s',
        }}
      />

      {open && (
        <div
          onMouseEnter={show}
          onMouseLeave={scheduleClose}
          style={{
            position: 'absolute', top: 'calc(100% + 2px)', left: 0, zIndex: 30,
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '4px 6px', borderRadius: '8px',
            background: '#fff', border: '0.5px solid #E5E7EB',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          }}
        >
          {CELL_COLOR_PRESETS.map(preset => {
            const active = (columnFmt.color || '') === preset.value;
            const swatch = preset.value || '#9CA3AF';
            return (
              <button
                key={preset.value || 'default'}
                onMouseDown={e => e.preventDefault()}
                onClick={() => onFmtChange({ color: preset.value })}
                title={preset.label}
                style={{
                  width: 16, height: 16, borderRadius: '50%', padding: 0, cursor: 'pointer',
                  background: preset.value
                    ? swatch
                    : 'linear-gradient(135deg, #fff 45%, #9CA3AF 46%, #9CA3AF 54%, #fff 55%)',
                  border: active ? '2px solid #3B82F6' : '1px solid #D1D5DB',
                  outline: active ? '1px solid #BFDBFE' : 'none', outlineOffset: '1px',
                }}
              />
            );
          })}

          <div style={{ width: 1, height: 16, background: '#E5E7EB', margin: '0 2px' }} />

          <button
            onMouseDown={e => e.preventDefault()}
            onClick={() => onFmtChange({ bold: !columnFmt.bold })}
            title={columnFmt.bold ? 'Remover negrito da coluna' : 'Aplicar negrito na coluna'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 24, borderRadius: '6px', cursor: 'pointer',
              border: '0.5px solid #D1D5DB',
              background: columnFmt.bold ? '#EFF6FF' : '#fff',
              color: columnFmt.bold ? '#2563EB' : '#6B7280',
            }}
          >
            <Bold style={{ width: 13, height: 13 }} />
          </button>

          <div style={{ width: 1, height: 16, background: '#E5E7EB', margin: '0 2px' }} />

          <button
            onMouseDown={e => e.preventDefault()}
            onClick={() => onWidthChange(columnFlex - COLUMN_FLEX_STEP)}
            title="Reduzir largura da coluna"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 24, borderRadius: '6px', cursor: 'pointer',
              border: '0.5px solid #D1D5DB',
              background: '#fff',
              color: '#6B7280',
            }}
          >
            <Minus style={{ width: 13, height: 13 }} />
          </button>

          <button
            onMouseDown={e => e.preventDefault()}
            onClick={() => onWidthChange(null)}
            title="Voltar largura automatica"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 24, borderRadius: '6px', cursor: 'pointer',
              border: '0.5px solid #D1D5DB',
              background: hasCustomWidth ? '#fff' : '#F9FAFB',
              color: hasCustomWidth ? '#6B7280' : '#9CA3AF',
            }}
          >
            <RotateCcw style={{ width: 13, height: 13 }} />
          </button>

          <button
            onMouseDown={e => e.preventDefault()}
            onClick={() => onWidthChange(columnFlex + COLUMN_FLEX_STEP)}
            title="Aumentar largura da coluna"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 24, borderRadius: '6px', cursor: 'pointer',
              border: '0.5px solid #D1D5DB',
              background: '#fff',
              color: '#6B7280',
            }}
          >
            <Plus style={{ width: 13, height: 13 }} />
          </button>
        </div>
      )}
    </div>
  );
}

function CellEditor({ column, value, columnFmt, placeholder, onChange }) {
  const defaultBold = column.key === 'orgao' || column.key === 'pregao';
  const defaultColor = column.key === 'ri' || column.key === 'retorno' ? '#B91C1C' : 'var(--color-text-primary)';

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={e => { e.target.style.borderBottomColor = '#00358e'; }}
        onBlur={e => { e.target.style.borderBottomColor = 'transparent'; }}
        placeholder={placeholder}
        style={{
          ...CELL_INPUT_STYLE,
          fontWeight: columnFmt.bold ? 700 : (defaultBold ? 600 : 400),
          color: columnFmt.color || defaultColor,
        }}
      />
    </div>
  );
}
