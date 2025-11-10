'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Upload, Maximize2, Play, Pause,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Monitor
} from 'lucide-react';

export default function PDFAvisoSystem() {
  const searchParams = useSearchParams();

  const [view, setView] = useState('viewer');
  const [file, setFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isUploading, setIsUploading] = useState(false);

  const [autoPlay, setAutoPlay] = useState(false);
  const [autoMs, setAutoMs] = useState(8000); // tempo por página (ms) – TV default 8s

  // TV mode
  const [tvMode, setTvMode] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const hideUiTimerRef = useRef(null);

  const canvasRef = useRef(null);
  const viewerRef = useRef(null);

  // ---- Carrega último PDF do Blob / cache
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/get-pdf', { cache: 'no-store' });
        const data = await res.json();
        if (data?.url) {
          setPdfUrl(data.url);
          localStorage.setItem('lastPdfUrl', data.url);
        } else {
          const cached = localStorage.getItem('lastPdfUrl');
          if (cached) setPdfUrl(cached);
        }
      } catch {
        const cached = localStorage.getItem('lastPdfUrl');
        if (cached) setPdfUrl(cached);
      }
    })();
  }, []);

  // ---- Ativa TV mode por query (?tv=1) ou memória local
  useEffect(() => {
    const q = searchParams.get('tv');
    const stored = localStorage.getItem('tvMode');
    const enabled = q === '1' || stored === '1';
    if (enabled) setTvMode(true);
  }, [searchParams]);

  // ---- Carrega PDF com pdf.js
  useEffect(() => {
    if (!pdfUrl) return;

    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist/build/pdf');
        const workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

        const doc = await pdfjs.getDocument({ url: pdfUrl }).promise;
        if (cancelled) return;

        setPdfDoc(doc);
        setTotalPages(doc.numPages);

        // render inicial com "contain" (caber na largura/altura do container)
        requestAnimationFrame(async () => {
          const s = await fitScaleContain(doc, 1);
          setScale(s);
          await renderPage(doc, 1, s);
          setCurrentPage(1);
        });
      } catch (err) {
        console.error('Erro ao carregar PDF:', err);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfUrl]);

  // ---- Re-render quando scale mudar
  useEffect(() => {
    if (pdfDoc) renderPage(pdfDoc, currentPage, scale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale]);

  // ---- Auto-play (troca de páginas)
  useEffect(() => {
    if (!pdfDoc || totalPages < 1 || !autoPlay) return;
    const id = setInterval(() => {
      setCurrentPage(prev => {
        const next = prev < totalPages ? prev + 1 : 1;
        renderPage(pdfDoc, next, scale);
        return next;
      });
    }, autoMs);
    return () => clearInterval(id);
  }, [pdfDoc, totalPages, autoPlay, autoMs, scale]);

  // ---- TV mode effects: autoplay + fullscreen + esconder UI/cursor
  useEffect(() => {
    localStorage.setItem('tvMode', tvMode ? '1' : '0');

    if (tvMode) {
      setAutoPlay(true);

      // Fullscreen automático
      const el = viewerRef.current;
      if (el && !document.fullscreenElement) {
        el.requestFullscreen?.().catch(() => {});
      }

      // Escala "contain" ao entrar no TV e ao resize
      const applyFit = async () => {
        if (!pdfDoc) return;
        const s = await fitScaleContain(pdfDoc, currentPage);
        setScale(s);
        await renderPage(pdfDoc, currentPage, s);
      };
      applyFit();
      const onResize = () => applyFit();
      window.addEventListener('resize', onResize);

      // Esconder UI após 3s sem movimento
      const onMove = () => {
        setUiVisible(true);
        document.body.classList.remove('cursor-hidden');
        clearTimeout(hideUiTimerRef.current);
        hideUiTimerRef.current = setTimeout(() => {
          setUiVisible(false);
          document.body.classList.add('cursor-hidden');
        }, 3000);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('keydown', onMove);
      onMove(); // inicia timer

      return () => {
        window.removeEventListener('resize', onResize);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('keydown', onMove);
        clearTimeout(hideUiTimerRef.current);
        document.body.classList.remove('cursor-hidden');
      };
    } else {
      setAutoPlay(false);
      setUiVisible(true);
      document.body.classList.remove('cursor-hidden');
    }
  }, [tvMode, pdfDoc, currentPage]);

  // ---- Teclado
  useEffect(() => {
    const onKey = async (e) => {
      if (!pdfDoc) return;
      if (e.key === 'ArrowRight') {
        await goTo(currentPage + 1);
      } else if (e.key === 'ArrowLeft') {
        await goTo(currentPage - 1);
      } else if (e.key.toLowerCase() === ' ') {
        e.preventDefault();
        setAutoPlay(a => !a);
      } else if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      } else if (e.key.toLowerCase() === 't') {
        setTvMode(t => !t);
      } else if (e.key === '+') {
        setScale(s => Math.min(3, s + 0.1));
      } else if (e.key === '-') {
        setScale(s => Math.max(0.5, s - 0.1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, currentPage]);

  // ---- Helpers
  const fitScaleContain = async (doc, pageNum) => {
    const container = viewerRef.current;
    if (!container) return 1;

    const page = await doc.getPage(pageNum);
    const viewport1 = page.getViewport({ scale: 1 });
    const pad = 16; // padding interno do container

    const cw = container.clientWidth - pad * 2;
    const ch = container.clientHeight - pad * 2;
    if (cw <= 0 || ch <= 0) return 1;

    const sx = cw / viewport1.width;
    const sy = ch / viewport1.height;

    return Math.max(0.5, Math.min(3, Math.min(sx, sy)));
  };

  const renderPage = async (doc, pageNum, s) => {
    try {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: s });
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Fundo offwhite
      context.fillStyle = '#FAF9F7';
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: context, viewport }).promise;
    } catch (err) {
      console.error('Falha no render da página:', err);
    }
  };

  const goTo = async (n) => {
    if (!pdfDoc) return;
    const page = Math.max(1, Math.min(totalPages, n));
    setCurrentPage(page);
    await renderPage(pdfDoc, page, scale);
  };

  const toggleFullscreen = () => {
    const el = viewerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  };

  // ---- Upload
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert('Selecione um PDF.');
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/upload-pdf', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.url) {
        setPdfUrl(data.url);
        localStorage.setItem('lastPdfUrl', data.url);
        setView('viewer');
        setFile(null);
        alert('✅ PDF enviado com sucesso!');
      } else {
        throw new Error(data?.error || 'Falha no upload.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('❌ Erro ao enviar PDF: ' + (err.message || 'desconhecido'));
    } finally {
      setIsUploading(false);
    }
  };

  // ---- UI
  const topBarHidden = tvMode && !uiVisible;

  return (
    <main className="min-h-screen px-5 py-6" style={{ background: 'var(--bg, #FAF9F7)' }}>
      {/* Header */}
      <div className={`mx-auto max-w-6xl mb-5 flex items-center justify-between gap-3 ui-fade ${topBarHidden ? 'ui-hidden' : ''}`}>
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text, #333)' }}>
          Sistema de Avisos (PDF)
        </h1>

        <div className="toolbar">
          <button className="btn-secondary" onClick={() => setTvMode(t => !t)} title="Modo TV (T)">
            <Monitor className="w-4 h-4" /> {tvMode ? 'Sair do Modo TV' : 'Modo TV'}
          </button>

          <button className="btn" onClick={() => setView('uploader')}>
            <Upload className="w-4 h-4" /> Enviar PDF
          </button>

          {pdfUrl && (
            <a className="btn-secondary" href={pdfUrl} target="_blank" rel="noreferrer">
              <Download className="w-4 h-4" /> Abrir original
            </a>
          )}
        </div>
      </div>

      {/* Card principal */}
      <div className="mx-auto max-w-6xl card" onDoubleClick={toggleFullscreen}>
        {/* Viewer */}
        {view === 'viewer' && (
          <>
            {!pdfUrl ? (
              <div className="text-center py-16">
                <p className="text-base" style={{ color: 'var(--muted, #6E6E6E)' }}>
                  Nenhum PDF disponível. Envie um arquivo para começar.
                </p>
              </div>
            ) : (
              <>
                {/* Toolbar superior */}
                <div className={`toolbar mb-4 justify-between ui-fade ${topBarHidden ? 'ui-hidden' : ''}`}>
                  <div className="flex items-center gap-2">
                    <button className="btn-secondary" onClick={() => goTo(currentPage - 1)} title="Página anterior (←)">
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <span className="text-sm" style={{ color: 'var(--muted, #6E6E6E)' }}>
                      Página {currentPage} de {totalPages || '–'}
                    </span>

                    <button className="btn-secondary" onClick={() => goTo(currentPage + 1)} title="Próxima página (→)">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm" style={{ color: 'var(--muted, #6E6E6E)' }}>
                      Tempo por página:
                      <select
                        className="ml-2 border rounded-lg px-2 py-1"
                        value={autoMs}
                        onChange={(e) => setAutoMs(Number(e.target.value))}
                        title="Tempo por página (autoplay)"
                      >
                        <option value={5000}>5s</option>
                        <option value={8000}>8s</option>
                        <option value={10000}>10s</option>
                        <option value={15000}>15s</option>
                        <option value={20000}>20s</option>
                      </select>
                    </label>

                    <button className="btn-secondary" onClick={() => setScale(s => Math.max(0.5, s - 0.1))} title="Zoom out (-)">
                      <ZoomOut className="w-5 h-5" />
                    </button>
                    <button className="btn-secondary" onClick={() => setScale(s => Math.min(3, s + 0.1))} title="Zoom in (+)">
                      <ZoomIn className="w-5 h-5" />
                    </button>

                    <button className="btn-secondary" onClick={toggleFullscreen} title="Tela cheia (F)">
                      <Maximize2 className="w-5 h-5" />
                    </button>

                    <button className="btn" onClick={() => setAutoPlay(a => !a)} title="Troca automática de páginas (Espaço)">
                      {autoPlay ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      {autoPlay ? 'Pausar' : 'Auto'}
                    </button>
                  </div>
                </div>

                {/* Área do viewer */}
                <div
                  ref={viewerRef}
                  className="w-full overflow-auto rounded-xl border relative"
                  style={{
                    background: '#F2F2F0',
                    borderColor: '#E6E6E6',
                    padding: 8,
                    // altura maior no TV
                    height: tvMode ? 'calc(100vh - 120px)' : '70vh'
                  }}
                >
                  <canvas ref={canvasRef} id="pdf-canvas" className="mx-auto block" />
                  {/* Indicador flutuante no TV */}
                  {tvMode && (
                    <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-xl text-xs ui-fade ${topBarHidden ? '' : ''}`}
                      style={{ background: 'rgba(0,0,0,.55)', color: '#fff' }}>
                      Página {currentPage}/{totalPages || '–'} • {Math.round(scale * 100)}%
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* Uploader */}
        {view === 'uploader' && (
          <form className="space-y-4" onSubmit={handleUpload}>
            <div className="rounded-xl border p-6" style={{ background: '#F8F7F5', borderColor: '#E6E6E6' }}>
              <p className="mb-3" style={{ color: 'var(--muted, #6E6E6E)' }}>
                Selecione um arquivo PDF para enviar.
              </p>
              <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>

            <div className="flex items-center gap-2">
              <button type="submit" className="btn" disabled={isUploading || !file}>
                <Upload className="w-4 h-4" />
                {isUploading ? 'Enviando...' : 'Enviar PDF'}
              </button>

              <button type="button" className="btn-secondary" onClick={() => setView('viewer')}>
                Voltar ao viewer
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
