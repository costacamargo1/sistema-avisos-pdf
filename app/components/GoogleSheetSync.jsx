'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { RefreshCw, ExternalLink, CheckCircle2, AlertCircle, Link2 } from 'lucide-react';
import { googleCellCss, googleMergeMaps } from './SheetBoard';

const SERVICE_ACCOUNT_HINT = 'Compartilhe a planilha (como Leitor) com o e-mail da conta de serviço do painel.';

export default function GoogleSheetSync({ initialUrl = '', onUrlChange, initialStyle = 'project', onStyleChange }) {
  const [url, setUrl] = useState(initialUrl);
  const [style, setStyle] = useState(initialStyle || 'project'); // project | sheet
  const [status, setStatus] = useState('idle'); // idle | loading | ok | error
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null); // { headers, rows, title, grid }
  const saveTimer = useRef(null);

  const persistUrl = useCallback((value) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onUrlChange?.(value), 400);
  }, [onUrlChange]);

  const fetchPreview = useCallback(async (value) => {
    const target = (value ?? url).trim();
    if (!target) {
      setStatus('idle');
      setPreview(null);
      setError('');
      return;
    }
    setStatus('loading');
    setError('');
    try {
      // O editor sempre pede a formatação: assim alternar o estilo é instantâneo.
      const res = await fetch(`/api/sheets?url=${encodeURIComponent(target)}&format=1`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus('error');
        setError(data?.error || 'Falha ao ler a planilha.');
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
  }, [url]);

  // Carrega o preview ao montar, se já houver URL salva.
  useEffect(() => {
    if (initialUrl?.trim()) fetchPreview(initialUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (value) => {
    setUrl(value);
    persistUrl(value);
  };

  const handleStyleChange = (value) => {
    setStyle(value);
    onStyleChange?.(value);
  };

  const colCount = preview?.headers?.length || 0;

  // Espelho da planilha original — só quando a formatação veio junto.
  const grid = preview?.grid || null;
  const mirror = style === 'sheet' && (grid?.cells?.length || 0) > 0;
  const { anchors, covered } = useMemo(() => googleMergeMaps(grid?.merges), [grid?.merges]);
  const gridTotalWidth = (grid?.cols || []).reduce((sum, w) => sum + w, 0) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* URL bar — padding extra no topo p/ não colidir com os badges flutuantes do quadro */}
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
          <Link2 style={{ width: 15, height: 15, color: '#64748B', flexShrink: 0 }} />
          <input
            value={url}
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
            placeholder="Cole aqui o link da sua planilha do Google Sheets…"
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
          disabled={status === 'loading' || !url.trim()}
          title="Atualizar agora"
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: 'var(--border-radius-md)',
            border: 'none', cursor: url.trim() ? 'pointer' : 'default',
            fontSize: '12px', fontWeight: 600,
            background: url.trim() ? '#00358E' : '#E5E7EB',
            color: url.trim() ? '#fff' : '#9CA3AF',
            whiteSpace: 'nowrap',
          }}
        >
          <RefreshCw style={{ width: 14, height: 14 }} className={status === 'loading' ? 'animate-spin' : ''} />
          Atualizar agora
        </button>
        {url.trim() && (
          <a
            href={url} target="_blank" rel="noreferrer"
            title="Abrir planilha no Google"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34, borderRadius: 'var(--border-radius-md)',
              border: '0.5px solid var(--color-border-secondary)',
              color: 'var(--color-text-tertiary)', flexShrink: 0,
            }}
          >
            <ExternalLink style={{ width: 14, height: 14 }} />
          </a>
        )}
      </div>

      {/* Status line */}
      <div style={{ padding: '8px 16px', fontSize: '12px' }}>
        {status === 'idle' && (
          <span style={{ color: 'var(--color-text-tertiary)' }}>
            A TV atualiza a planilha automaticamente a cada 20 minutos. {SERVICE_ACCOUNT_HINT}
          </span>
        )}
        {status === 'loading' && (
          <span style={{ color: 'var(--color-text-tertiary)' }}>Lendo planilha…</span>
        )}
        {status === 'ok' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#16A34A' }}>
            <CheckCircle2 style={{ width: 14, height: 14 }} />
            Conectado — “{preview?.title}” · {colCount} colunas · {preview?.rows?.length || 0} linhas
            {preview?.sheetTitle && (
              <span style={{ color: 'var(--color-text-tertiary)' }}>
                · linha 1 usada como título na TV: “{preview.sheetTitle}”
              </span>
            )}
          </span>
        )}
        {status === 'error' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#B91C1C' }}>
            <AlertCircle style={{ width: 14, height: 14 }} />
            {error}
          </span>
        )}
      </div>

      {/* Seletor de formatação — como a planilha aparece na TV */}
      <div style={{ padding: '2px 16px 8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>Formatação na TV:</span>
        <div style={{ display: 'inline-flex', border: '1px solid #CBD5E1', borderRadius: 'var(--border-radius-md)', overflow: 'hidden' }}>
          {[
            { id: 'project', label: 'Padrão do painel' },
            { id: 'sheet', label: 'Original da planilha' },
          ].map((opt, i) => {
            const active = style === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleStyleChange(opt.id)}
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
        <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
          {style === 'sheet'
            ? 'Mantém cores, negrito, alinhamento, mesclagens e larguras da planilha.'
            : 'Aplica a identidade visual do painel (cabeçalho azul e colunas padronizadas).'}
        </span>
      </div>

      {/* Preview table */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 16px 16px' }}>
        {mirror ? (
          <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                {grid.cols.map((w, i) => (
                  <col key={i} style={{ width: `${((w / gridTotalWidth) * 100).toFixed(3)}%` }} />
                ))}
              </colgroup>
              <tbody>
                {grid.cells.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => {
                      if (covered.has(`${ri},${ci}`)) return null;
                      const merge = anchors.get(`${ri},${ci}`);
                      return (
                        <td
                          key={ci}
                          rowSpan={merge && merge.rs > 1 ? merge.rs : undefined}
                          colSpan={merge && merge.cs > 1 ? merge.cs : undefined}
                          style={{
                            ...googleCellCss(cell),
                            fontSize: `${Math.max(9, Math.min(20, Math.round((cell?.fs || 10) * 1.15)))}px`,
                            border: '0.5px solid #D8DDE3',
                            padding: '4px 6px',
                            lineHeight: 1.3,
                          }}
                        >
                          {cell?.v ?? ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : colCount > 0 ? (
          <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colCount}, 1fr)` }}>
              {preview.headers.map((h, i) => (
                <div key={i} style={{
                  fontSize: '11px', fontWeight: 700, color: '#00358E',
                  textTransform: 'uppercase', letterSpacing: '0.03em',
                  padding: '8px 10px', background: '#EAF1FB',
                  borderRight: i < colCount - 1 ? '0.5px solid #D1D5DB' : 'none',
                  borderBottom: '0.5px solid #D1D5DB',
                }}>
                  {h}
                </div>
              ))}
            </div>
            {preview.rows.map((row, ri) => (
              <div key={ri} style={{ display: 'grid', gridTemplateColumns: `repeat(${colCount}, 1fr)` }}>
                {preview.headers.map((_, ci) => (
                  <div key={ci} style={{
                    fontSize: '12px', color: 'var(--color-text-primary)',
                    padding: '6px 10px',
                    borderRight: ci < colCount - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none',
                    borderBottom: ri < preview.rows.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {row[ci] ?? ''}
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
              {status === 'error' ? 'Corrija o link ou o compartilhamento e tente novamente.' : 'Cole o link da planilha para visualizar os dados.'}
            </div>
          )
        )}
      </div>
    </div>
  );
}
