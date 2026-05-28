'use client';

import React, { useState, useRef } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Bold } from 'lucide-react';

const generateId = () => Math.random().toString(36).substr(2, 9);

// Paleta de cores para formatação por célula (mesma identidade da lista estruturada).
const CELL_COLOR_PRESETS = [
  { value: '', label: 'Padrão' },
  { value: '#00358E', label: 'Azul' },
  { value: '#111827', label: 'Preto' },
  { value: '#B91C1C', label: 'Vermelho' },
  { value: '#C2410C', label: 'Laranja' },
  { value: '#16A34A', label: 'Verde' },
  { value: '#9333EA', label: 'Roxo' },
];

// Formatação fica em row._fmt[colKey] = { color, bold } — separada do texto (row[colKey]).
const getCellFmt = (row, key) => (row?._fmt?.[key]) || {};

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

const colHasContent = (rows, key) => rows.some(r => String(r[key] || '').trim());

const resolveHeaderLabel = (headers, col) => {
  const custom = headers?.[col.key];
  return (typeof custom === 'string' && custom.trim()) ? custom : col.label;
};

const gridTemplateFor = (cols) => cols.map(c => `${c.flex}fr`).join(' ');

// ─── TV DISPLAY ──────────────────────────────────────────────────────────────
export function SheetBoardDisplay({ boardTitle, rows = [], headers = {}, logoSrc, titleStyle: rawTitleStyle }) {
  const titleStyle = rawTitleStyle ?? {};
  const validRows = rows.filter(row => COLUMNS.some(c => String(row[c.key] || '').trim()));

  // Mostra apenas as colunas que têm conteúdo em alguma linha.
  const visibleCols = COLUMNS.filter(c => colHasContent(validRows, c.key));
  const gridTemplate = gridTemplateFor(visibleCols);

  // Escala a fonte conforme o número de linhas para evitar transbordo na TV.
  const count = validRows.length;
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
            {validRows.map((row, ri) => (
              <div key={row.id} style={{ display: 'grid', gridTemplateColumns: gridTemplate }}>
                {visibleCols.map((c, ci) => {
                  const fmt = getCellFmt(row, c.key);
                  const defaultBold = c.key === 'orgao' || c.key === 'pregao';
                  const defaultColor = c.key === 'ri' || c.key === 'retorno' ? '#B91C1C' : '#1F2937';
                  return (
                    <div key={c.key} style={{
                      fontSize: cellSize,
                      fontWeight: fmt.bold ? 800 : (defaultBold ? 700 : 500),
                      color: fmt.color || defaultColor,
                      textAlign: c.key === 'acao' || c.key === 'produto' || c.key === 'resultado' ? 'left' : 'center',
                      padding: rowPad,
                      borderBottom: ri < validRows.length - 1 ? '1px solid #1F2937' : 'none',
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

        {validRows.length === 0 && (
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

  const updateHeader = (key, value) => {
    const next = { ...headers, [key]: value };
    setHeaders(next);
    if (headerTimer.current) clearTimeout(headerTimer.current);
    headerTimer.current = setTimeout(() => onHeadersUpdate?.(next), 400);
  };

  const addRow = () => save([...rows, emptyRow()]);

  const updateCell = (id, key, value) => {
    save(rows.map(r => (r.id === id ? { ...r, [key]: value } : r)));
  };

  const updateCellFmt = (id, key, patch) => {
    save(rows.map(r => {
      if (r.id !== id) return r;
      const prevFmt = r._fmt || {};
      const nextCell = { ...(prevFmt[key] || {}), ...patch };
      // Remove chaves "vazias" para não inflar o objeto persistido.
      if (!nextCell.color) delete nextCell.color;
      if (!nextCell.bold) delete nextCell.bold;
      const nextFmt = { ...prevFmt };
      if (Object.keys(nextCell).length === 0) delete nextFmt[key];
      else nextFmt[key] = nextCell;
      return { ...r, _fmt: nextFmt };
    }));
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

  const editorTemplate = `28px ${gridTemplateFor(COLUMNS)} 64px`;

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
        {COLUMNS.map(c => (
          <input
            key={c.key}
            value={headers[c.key] ?? c.label}
            onChange={e => updateHeader(c.key, e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={c.label}
            title="Renomear cabeçalho"
            style={{
              width: '100%', fontSize: '10px', fontWeight: 700,
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase', letterSpacing: '0.04em',
              background: 'none', border: 'none',
              borderBottom: '0.5px solid transparent', outline: 'none',
              padding: '2px 2px', transition: 'border-color 0.15s',
            }}
          />
        ))}
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

            {COLUMNS.map(c => (
              <CellEditor
                key={c.key}
                column={c}
                value={row[c.key] || ''}
                fmt={getCellFmt(row, c.key)}
                placeholder={headers[c.key] ?? c.label}
                onChange={value => updateCell(row.id, c.key, value)}
                onFmtChange={patch => updateCellFmt(row.id, c.key, patch)}
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

// ─── CELL EDITOR (texto + formatação por célula) ─────────────────────────────
function CellEditor({ column, value, fmt, placeholder, onChange, onFmtChange }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);

  const show = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  // Pequeno atraso para permitir clicar nos botões da barra antes de fechar.
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  const defaultBold = column.key === 'orgao' || column.key === 'pregao';
  const defaultColor = column.key === 'ri' || column.key === 'retorno' ? '#B91C1C' : 'var(--color-text-primary)';

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={show}
      onMouseLeave={scheduleClose}
    >
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={e => { e.target.style.borderBottomColor = '#00358e'; show(); }}
        onBlur={e => { e.target.style.borderBottomColor = 'transparent'; scheduleClose(); }}
        placeholder={placeholder}
        style={{
          ...CELL_INPUT_STYLE,
          fontWeight: fmt.bold ? 700 : (defaultBold ? 600 : 400),
          color: fmt.color || defaultColor,
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
            const active = (fmt.color || '') === preset.value;
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
            onClick={() => onFmtChange({ bold: !fmt.bold })}
            title={fmt.bold ? 'Remover negrito' : 'Aplicar negrito'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 24, borderRadius: '6px', cursor: 'pointer',
              border: '0.5px solid #D1D5DB',
              background: fmt.bold ? '#EFF6FF' : '#fff',
              color: fmt.bold ? '#2563EB' : '#6B7280',
            }}
          >
            <Bold style={{ width: 13, height: 13 }} />
          </button>
        </div>
      )}
    </div>
  );
}
