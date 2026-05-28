'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshCw, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';

const SERVICE_ACCOUNT_HINT = 'Compartilhe a planilha (como Leitor) com o e-mail da conta de serviço do painel.';

export default function GoogleSheetSync({ initialUrl = '', onUrlChange }) {
  const [url, setUrl] = useState(initialUrl);
  const [status, setStatus] = useState('idle'); // idle | loading | ok | error
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null); // { headers, rows, title }
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
      const res = await fetch(`/api/sheets?url=${encodeURIComponent(target)}`, { cache: 'no-store' });
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

  const colCount = preview?.headers?.length || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* URL bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '12px 16px',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        background: 'var(--color-background-secondary)',
      }}>
        <input
          value={url}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') fetchPreview(); }}
          placeholder="Cole o link da planilha do Google Sheets…"
          style={{
            flex: 1, fontSize: '13px', fontFamily: 'var(--font-sans)',
            background: 'var(--color-background-primary)',
            border: '0.5px solid var(--color-border-secondary)',
            borderRadius: 'var(--border-radius-md)',
            outline: 'none', padding: '8px 10px',
            color: 'var(--color-text-primary)',
          }}
        />
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
          </span>
        )}
        {status === 'error' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#B91C1C' }}>
            <AlertCircle style={{ width: 14, height: 14 }} />
            {error}
          </span>
        )}
      </div>

      {/* Preview table */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 16px 16px' }}>
        {colCount > 0 ? (
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
