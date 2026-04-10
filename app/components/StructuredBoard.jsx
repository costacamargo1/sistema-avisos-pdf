'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Bold, CaseSensitive } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'none',     label: 'Sem status',     color: '#6B7280', bg: '#F3F4F6', border: '#D1D5DB' },
  { value: 'monit',   label: 'Monitorando',     color: '#185FA5', bg: '#E6F1FB', border: '#B5D4F4' },
  { value: 'atencao', label: 'Atenção',          color: '#854F0B', bg: '#FAEEDA', border: '#FAC775' },
  { value: 'feito',   label: 'Feito',            color: '#3B6D11', bg: '#EAF3DE', border: '#C0DD97' },
  { value: 'urgente', label: 'Urgente',          color: '#A32D2D', bg: '#FCEBEB', border: '#F7C1C1' },
  { value: 'aguard',  label: 'Aguardando',       color: '#534AB7', bg: '#EEEDFE', border: '#CECBF6' },
];

const STATUS_MAP = Object.fromEntries(STATUS_OPTIONS.map(s => [s.value, s]));

const generateId = () => Math.random().toString(36).substr(2, 9);

const emptyItem = () => ({
  id: generateId(),
  process: '',
  product: '',
  action: '',
  observation: '',
  status: 'none',
});

// ─── TV DISPLAY ──────────────────────────────────────────────────────────────
export function StructuredBoardDisplay({ boardTitle, items = [], logoSrc, titleStyle: rawTitleStyle }) {
  const titleStyle = rawTitleStyle ?? {};
  const validItems = items.filter(i => i.process || i.product || i.action);

  // Dynamic font scaling based on item count — smaller sizes to prevent wrapping
  const count = validItems.length;
  let titleSize, itemSize, gap;

  if (count <= 3) {
    titleSize = '2.8vw';
    itemSize  = '1.8vw';
    gap       = '2.4vw';
  } else if (count <= 5) {
    titleSize = '2.4vw';
    itemSize  = '1.55vw';
    gap       = '1.8vw';
  } else if (count <= 7) {
    titleSize = '2.2vw';
    itemSize  = '1.35vw';
    gap       = '1.3vw';
  } else {
    titleSize = '2vw';
    itemSize  = '1.15vw';
    gap       = '1vw';
  }

  // Merge user title style with dynamic defaults
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
      {/* Title bar */}
      <div style={{
        borderBottom: '2px solid #E5E7EB',
        padding: '1.6vw 3vw 1.2vw',
        textAlign: 'center',
      }}>
        <span style={{
          fontSize: (titleStyle.fontSize && titleStyle.fontSize !== 'auto') ? titleStyle.fontSize : titleSize,
          fontWeight: titleStyle.fontWeight ?? 800,
          color: titleStyle.color || '#00358E',
          textTransform: titleStyle.textTransform || 'uppercase',
          letterSpacing: '0.04em',
          fontFamily: resolvedTitleFontFamily,
        }}>
          {boardTitle}
        </span>
      </div>

      {/* Items */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: validItems.length > 0 ? 'center' : 'flex-start',
        padding: `${gap} 3vw`,
        gap: gap,
        overflowY: 'hidden',
      }}>
        {validItems.map((item, idx) => {
          const st = STATUS_MAP[item.status] || STATUS_MAP.none;
          const hasTag = item.status && item.status !== 'none';
          const hasObs = Boolean(item.observation?.trim());
          return (
            <div key={item.id}>
              {/* Main row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6vw',
                lineHeight: 1.3,
                flexWrap: 'nowrap',
                minWidth: 0,
              }}>
                {/* Number */}
                <span style={{
                  fontSize: itemSize,
                  fontWeight: 800,
                  color: '#00358E',
                  minWidth: '2vw',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}>
                  {idx + 1}.
                </span>

                {/* Process */}
                {item.process && (
                  <span style={{
                    fontSize: itemSize,
                    fontWeight: 800,
                    color: '#00358E',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}>
                    {item.process}
                  </span>
                )}

                {/* Arrow + Product */}
                {item.product && (
                  <>
                    <span style={{ fontSize: itemSize, color: '#9CA3AF', fontWeight: 400, flexShrink: 0 }}>→</span>
                    <span style={{
                      fontSize: itemSize,
                      fontWeight: 800,
                      color: '#C2410C',
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                    }}>
                      {item.product}
                    </span>
                  </>
                )}

                {/* Dash + Action */}
                {item.action && (
                  <>
                    <span style={{ fontSize: itemSize, color: '#9CA3AF', flexShrink: 0 }}>—</span>
                    <span style={{
                      fontSize: itemSize,
                      fontWeight: 700,
                      color: '#111827',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      minWidth: 0,
                    }}>
                      {item.action}
                    </span>
                  </>
                )}

                {/* Status tag */}
                {hasTag && (
                  <span style={{
                    fontSize: `calc(${itemSize} * 0.78)`,
                    fontWeight: 700,
                    color: st.color,
                    backgroundColor: st.bg,
                    border: `1px solid ${st.border}`,
                    borderRadius: '4px',
                    padding: '0.15vw 0.5vw',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    marginLeft: '0.3vw',
                  }}>
                    {st.label.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Observation line */}
              {hasObs && (
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '0.4vw',
                  paddingLeft: '2.6vw',
                  marginTop: '0.2vw',
                }}>
                  <span style={{
                    fontSize: `calc(${itemSize} * 0.85)`,
                    color: '#6B7280',
                    flexShrink: 0,
                  }}>↳</span>
                  <span style={{
                    fontSize: `calc(${itemSize} * 0.85)`,
                    fontWeight: 600,
                    color: '#374151',
                  }}>
                    {item.observation}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {validItems.length === 0 && (
          <div style={{ color: '#9CA3AF', fontSize: '1.8vw', textAlign: 'center', padding: '4vw 0' }}>
            Nenhum item cadastrado
          </div>
        )}
      </div>

      {/* Logo watermark */}
      {logoSrc && (
        <div style={{
          position: 'absolute', bottom: '1.5vw', right: '2vw',
          pointerEvents: 'none', userSelect: 'none',
        }}>
          <img src={logoSrc} alt="Logo" style={{ height: '3.5vw', width: 'auto', objectFit: 'contain' }} />
        </div>
      )}
    </div>
  );
}

// ─── TITLE STYLE CONFIG ──────────────────────────────────────────────────────
const TITLE_FONT_OPTIONS = [
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Aptos', label: 'Aptos' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Arial', label: 'Arial' },
];

const TITLE_SIZE_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: '1.6vw', label: 'Pequeno' },
  { value: '2vw', label: 'Médio' },
  { value: '2.4vw', label: 'Padrão' },
  { value: '2.8vw', label: 'Grande' },
  { value: '3.2vw', label: 'Extra Grande' },
  { value: '3.8vw', label: 'Máximo' },
];

const TITLE_COLOR_PRESETS = [
  '#00358E', '#000000', '#2563EB', '#C2410C', '#16A34A', '#854F0B', '#9333EA',
];

const DEFAULT_TITLE_STYLE = {
  fontFamily: 'Montserrat',
  fontSize: 'auto',
  color: '#00358E',
  fontWeight: 800,
  textTransform: 'uppercase',
};

// ─── EDITOR ──────────────────────────────────────────────────────────────────
export default function StructuredBoard({ initialItems = [], boardTitle = '', onUpdate, titleStyle: initialTitleStyle, onTitleStyleUpdate }) {
  const [items, setItems] = useState(() =>
    initialItems.length > 0 ? initialItems : [emptyItem()]
  );
  const [titleStyle, setTitleStyle] = useState(() => ({
    ...DEFAULT_TITLE_STYLE,
    ...(initialTitleStyle || {}),
  }));
  const saveTimer = useRef(null);
  const titleStyleTimer = useRef(null);
  const lastInputRef = useRef(null);

  const save = (newItems) => {
    setItems(newItems);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onUpdate?.(newItems), 400);
  };

  const updateTitleStyle = (updates) => {
    const newStyle = { ...titleStyle, ...updates };
    setTitleStyle(newStyle);
    if (titleStyleTimer.current) clearTimeout(titleStyleTimer.current);
    titleStyleTimer.current = setTimeout(() => onTitleStyleUpdate?.(newStyle), 300);
  };

  const addItem = () => {
    const item = emptyItem();
    const newItems = [...items, item];
    save(newItems);
    // Focus the new process input after render
    setTimeout(() => {
      const inputs = document.querySelectorAll('[data-struct-process]');
      inputs[inputs.length - 1]?.focus();
    }, 50);
  };

  const updateField = (id, field, value) => {
    save(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const removeItem = (id) => {
    const newItems = items.filter(i => i.id !== id);
    save(newItems.length > 0 ? newItems : [emptyItem()]);
  };

  const moveItem = (id, dir) => {
    const idx = items.findIndex(i => i.id === id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= items.length) return;
    const arr = [...items];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    save(arr);
  };

  const isBold = titleStyle.fontWeight >= 700;
  const isUppercase = titleStyle.textTransform === 'uppercase';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Title style controls */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '7px 16px',
        borderBottom: '0.5px solid #E5E7EB',
        background: '#F9FAFB',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '10px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: '2px' }}>
          Título
        </span>

        {/* Font Family */}
        <select
          value={titleStyle.fontFamily}
          onChange={(e) => updateTitleStyle({ fontFamily: e.target.value })}
          style={{
            fontSize: '11px', fontWeight: 500, padding: '3px 8px',
            border: '0.5px solid #D1D5DB', borderRadius: '6px',
            background: '#fff', cursor: 'pointer', outline: 'none',
            minWidth: '110px', color: '#374151',
          }}
        >
          {TITLE_FONT_OPTIONS.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        {/* Font Size */}
        <select
          value={titleStyle.fontSize || 'auto'}
          onChange={(e) => updateTitleStyle({ fontSize: e.target.value })}
          style={{
            fontSize: '11px', fontWeight: 500, padding: '3px 8px',
            border: '0.5px solid #D1D5DB', borderRadius: '6px',
            background: '#fff', cursor: 'pointer', outline: 'none',
            minWidth: '90px', color: '#374151',
          }}
        >
          {TITLE_SIZE_OPTIONS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        {/* Separator */}
        <div style={{ width: '1px', height: '18px', background: '#E5E7EB' }} />

        {/* Color presets */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {TITLE_COLOR_PRESETS.map(color => (
            <button
              key={color}
              onClick={() => updateTitleStyle({ color })}
              style={{
                width: 18, height: 18, borderRadius: '50%',
                backgroundColor: color,
                border: titleStyle.color === color ? '2px solid #3B82F6' : '1px solid #D1D5DB',
                cursor: 'pointer', padding: 0,
                outline: titleStyle.color === color ? '2px solid #BFDBFE' : 'none',
                outlineOffset: '1px',
                transition: 'all 0.1s',
              }}
              title={color}
            />
          ))}
        </div>

        {/* Separator */}
        <div style={{ width: '1px', height: '18px', background: '#E5E7EB' }} />

        {/* Bold toggle */}
        <button
          onClick={() => updateTitleStyle({ fontWeight: isBold ? 400 : 800 })}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: '6px',
            border: '0.5px solid #D1D5DB', cursor: 'pointer',
            background: isBold ? '#EFF6FF' : '#fff',
            color: isBold ? '#2563EB' : '#6B7280',
            transition: 'all 0.1s',
          }}
          title={isBold ? 'Remover negrito' : 'Aplicar negrito'}
        >
          <Bold style={{ width: 14, height: 14 }} />
        </button>

        {/* Uppercase toggle */}
        <button
          onClick={() => updateTitleStyle({ textTransform: isUppercase ? 'none' : 'uppercase' })}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: 28, padding: '0 8px', borderRadius: '6px',
            border: '0.5px solid #D1D5DB', cursor: 'pointer',
            background: isUppercase ? '#EFF6FF' : '#fff',
            color: isUppercase ? '#2563EB' : '#6B7280',
            fontSize: '10px', fontWeight: 600, letterSpacing: '0.04em',
            transition: 'all 0.1s',
          }}
          title={isUppercase ? 'Texto normal' : 'MAIÚSCULAS'}
        >
          AA
        </button>

        {/* Preview */}
        <span style={{
          marginLeft: 'auto',
          fontSize: '12px',
          fontFamily: `'${titleStyle.fontFamily}', sans-serif`,
          fontWeight: titleStyle.fontWeight,
          color: titleStyle.color,
          textTransform: titleStyle.textTransform,
          opacity: 0.8,
          maxWidth: '200px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {boardTitle || 'Título'}
        </span>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '28px 24px 1fr 1fr 1.2fr 1fr 140px 56px',
        gap: '8px',
        padding: '8px 16px 6px',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        background: 'var(--color-background-secondary)',
      }}>
        {['', '#', 'Processo / Tarefa', 'Produto', 'Ação / Descrição', 'Observação', 'Status', ''].map((h, i) => (
          <div key={i} style={{
            fontSize: '10px', fontWeight: 500, color: 'var(--color-text-tertiary)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            display: 'flex', alignItems: 'center',
          }}>{h}</div>
        ))}
      </div>

      {/* Item rows */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 16px 12px' }}>
        {items.map((item, idx) => (
          <ItemRow
            key={item.id}
            item={item}
            index={idx}
            total={items.length}
            onUpdate={updateField}
            onRemove={removeItem}
            onMove={moveItem}
          />
        ))}

        {/* Add row */}
        <button
          onClick={addItem}
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
          Adicionar item
        </button>
      </div>
    </div>
  );
}

function ItemRow({ item, index, total, onUpdate, onRemove, onMove }) {
  const st = STATUS_MAP[item.status] || STATUS_MAP.none;

  const inputStyle = {
    width: '100%', fontSize: '13px', fontFamily: 'var(--font-sans)',
    background: 'none', border: 'none', borderBottom: '0.5px solid transparent',
    outline: 'none', padding: '2px 4px', color: 'var(--color-text-primary)',
    transition: 'border-color 0.15s',
  };

  const focusStyle = { borderBottomColor: '#00358e' };
  const blurStyle = { borderBottomColor: 'transparent' };

  const handleFocus = e => Object.assign(e.target.style, focusStyle);
  const handleBlur = e => Object.assign(e.target.style, blurStyle);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '28px 24px 1fr 1fr 1.2fr 1fr 140px 56px',
      gap: '8px', alignItems: 'center',
      padding: '6px 12px',
      marginBottom: '4px',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-md)',
      background: 'var(--color-background-primary)',
      transition: 'border-color 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-border-secondary)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border-tertiary)'}
    >
      {/* Drag handle (visual only) */}
      <div style={{ color: 'var(--color-text-tertiary)', cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <GripVertical style={{ width: 14, height: 14 }} />
      </div>

      {/* Number */}
      <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
        {index + 1}
      </div>

      {/* Process */}
      <input
        data-struct-process
        value={item.process}
        onChange={e => onUpdate(item.id, 'process', e.target.value)}
        onFocus={handleFocus} onBlur={handleBlur}
        placeholder="Ex: SESA RJ PE 0058/2026"
        style={{ ...inputStyle, fontWeight: 600, color: '#00358E' }}
      />

      {/* Product */}
      <input
        value={item.product}
        onChange={e => onUpdate(item.id, 'product', e.target.value)}
        onFocus={handleFocus} onBlur={handleBlur}
        placeholder="Medicamento / item"
        style={{ ...inputStyle, fontWeight: 600, color: '#C2410C' }}
      />

      {/* Action */}
      <input
        value={item.action}
        onChange={e => onUpdate(item.id, 'action', e.target.value)}
        onFocus={handleFocus} onBlur={handleBlur}
        placeholder="Descreva a ação necessária..."
        style={inputStyle}
      />

      {/* Observation */}
      <input
        value={item.observation || ''}
        onChange={e => onUpdate(item.id, 'observation', e.target.value)}
        onFocus={handleFocus} onBlur={handleBlur}
        placeholder="Observação opcional..."
        style={{ ...inputStyle, fontSize: '12px', color: '#374151' }}
      />

      {/* Status */}
      <select
        value={item.status}
        onChange={e => onUpdate(item.id, 'status', e.target.value)}
        style={{
          fontSize: '11px', fontFamily: 'var(--font-sans)',
          fontWeight: 600, padding: '3px 6px',
          borderRadius: '20px',
          border: `0.5px solid ${st.border}`,
          background: st.bg, color: st.color,
          cursor: 'pointer', outline: 'none',
          width: '100%',
        }}
      >
        {STATUS_OPTIONS.map(s => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '2px', justifyContent: 'flex-end' }}>
        <button
          onClick={() => onMove(item.id, -1)}
          disabled={index === 0}
          title="Mover para cima"
          style={{
            width: 22, height: 22, border: 'none', background: 'none', cursor: index === 0 ? 'default' : 'pointer',
            borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: index === 0 ? 'var(--color-border-secondary)' : 'var(--color-text-tertiary)',
          }}
        >
          <ChevronUp style={{ width: 13, height: 13 }} />
        </button>
        <button
          onClick={() => onMove(item.id, 1)}
          disabled={index === total - 1}
          title="Mover para baixo"
          style={{
            width: 22, height: 22, border: 'none', background: 'none', cursor: index === total - 1 ? 'default' : 'pointer',
            borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: index === total - 1 ? 'var(--color-border-secondary)' : 'var(--color-text-tertiary)',
          }}
        >
          <ChevronDown style={{ width: 13, height: 13 }} />
        </button>
        <button
          onClick={() => onRemove(item.id)}
          title="Excluir"
          style={{
            width: 22, height: 22, border: 'none', background: 'none', cursor: 'pointer',
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
  );
}
