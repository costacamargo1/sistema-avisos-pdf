'use client';

import React from 'react';
import { Bold } from 'lucide-react';

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

// Resolve o estilo atual aplicando defaults; useEffect-style merge sem hooks (componente puro).
export function resolveTitleStyle(style) {
  return { ...DEFAULT_TITLE_STYLE, ...(style || {}) };
}

export default function TitleStyleBar({ titleStyle, onChange }) {
  const style = resolveTitleStyle(titleStyle);
  const isBold = style.fontWeight >= 700;
  const isUppercase = style.textTransform === 'uppercase';

  const update = (patch) => onChange?.({ ...style, ...patch });

  return (
    <div
      // Mantém o foco "vivo" no campo do título quando o usuário clica nos controles.
      onMouseDown={(e) => e.preventDefault()}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '6px 10px',
        background: '#fff',
        border: '1px solid #E5E7EB',
        borderTop: 'none',
        borderRadius: '0 0 8px 8px',
        boxShadow: '0 4px 10px rgba(15,23,42,0.05)',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: '10px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Estilo
      </span>

      {/* Fonte */}
      <select
        value={style.fontFamily}
        onChange={(e) => update({ fontFamily: e.target.value })}
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

      {/* Tamanho */}
      <select
        value={style.fontSize || 'auto'}
        onChange={(e) => update({ fontSize: e.target.value })}
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

      <div style={{ width: 1, height: 18, background: '#E5E7EB' }} />

      {/* Cores */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {TITLE_COLOR_PRESETS.map(color => (
          <button
            key={color}
            type="button"
            onClick={() => update({ color })}
            style={{
              width: 18, height: 18, borderRadius: '50%',
              backgroundColor: color,
              border: style.color === color ? '2px solid #3B82F6' : '1px solid #D1D5DB',
              cursor: 'pointer', padding: 0,
              outline: style.color === color ? '2px solid #BFDBFE' : 'none',
              outlineOffset: '1px',
              transition: 'all 0.1s',
            }}
            title={color}
          />
        ))}
      </div>

      <div style={{ width: 1, height: 18, background: '#E5E7EB' }} />

      {/* Negrito */}
      <button
        type="button"
        onClick={() => update({ fontWeight: isBold ? 400 : 800 })}
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

      {/* Maiúsculas */}
      <button
        type="button"
        onClick={() => update({ textTransform: isUppercase ? 'none' : 'uppercase' })}
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
    </div>
  );
}
