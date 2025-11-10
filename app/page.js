'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Upload, Maximize2, Play, Pause,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download
} from 'lucide-react';

export default function PDFAvisoSystem() {
  const [view, setView] = useState('viewer');
  const [file, setFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isUploading, setIsUploading] = useState(false);

  const [autoPlay, setAutoPlay] = useState(false);
  const [autoMs, setAutoMs] = useState(10000); // 10s por página

  const canvasRef = useRef(null);
  const viewerRef = useRef(null);

  // Carregar último PDF salvo do Blob ao iniciar
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
      } catch (e) {
        console.error('Falha ao obter último PDF:', e);
        const cached = localStorage.getItem('lastPdfUrl');
        if (cached) setPdfUrl(cached);
      }
    })();
  }, []);

  // Carregar PDF com pdf.js quando pdfUrl mudar
  useEffect(() => {
    if (!pdfUrl) return;

    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist/build/pdf');
        // worker do pdf.js
        const workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

        const doc = await pdfjs.getDocument({ url: pdfUrl }).promise;
        if (cancelled) return;

        setPdfDoc(doc);
        setTotalPages(doc.numPages);

        // auto ajuste de escala para caber na largura
        requestAnimationFrame(async () => {
          await renderPage(doc, 1, fitScale(doc, 1));
          setCurrentPage(1);
        });
      } catch (err) {
        console.error('Erro ao carregar PDF:', err);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfUrl]);

  // Re-render quando scale mudar
  useEffect(() => {
    if (pdfDoc) renderPage(pdfDoc, currentPage, scale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale]);

  // Auto-play (troca de páginas)
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

  const fitScale = (doc, pageNum) => {
    // calcula escala para caber na largura do container
    const container = viewerRef.current;
    if (!container) return 1;
    const width = container.clientWidth;
    const baseScale = 1;
    return Math.max(0.5, Math.min(3, (width - 32) / 800)) * baseScale; // 800 ~ largura base
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

      // Fundo offwhite por trás do PDF
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

  // Fullscreen
  const toggleFullscreen = () => {
    const el = viewerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  // Upload
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

  return (
    <main className="min-h-screen px-5 py-6" style={{ background: 'var(--bg, #FAF9F7)' }}>
      {/* Header */}
      <div className="mx-auto max-w-6xl mb-5 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text, #333)' }}>
          Sistema de Avisos (PDF)
        </h1>

        <div className="toolbar">
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
      <div className="mx-auto max-w-6xl card">
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
                {/* Toolbar */}
                <div className="toolbar mb-4 justify-between">
                  <div className="flex items-center gap-2">
                    <button className="btn-secondary" onClick={() => goTo(currentPage - 1)}>
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <span className="text-sm" style={{ color: 'var(--muted, #6E6E6E)' }}>
                      Página {currentPage} de {totalPages || '–'}
                    </span>

                    <button className="btn-secondary" onClick={() => goTo(currentPage + 1)}>
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="btn-secondary" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>
                      <ZoomOut className="w-5 h-5" />
                    </button>
                    <button className="btn-secondary" onClick={() => setScale(s => Math.min(3, s + 0.1))}>
                      <ZoomIn className="w-5 h-5" />
                    </button>

                    <button className="btn-secondary" onClick={toggleFullscreen}>
                      <Maximize2 className="w-5 h-5" />
                    </button>

                    <button
                      className="btn"
                      onClick={() => setAutoPlay(a => !a)}
                      title="Troca automática de páginas"
                    >
                      {autoPlay ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      {autoPlay ? 'Pausar' : 'Auto'}
                    </button>
                  </div>
                </div>

                {/* Viewer area */}
                <div
                  ref={viewerRef}
                  className="w-full overflow-auto rounded-xl border"
                  style={{ background: '#F2F2F0', borderColor: '#E6E6E6', padding: 8 }}
                >
                  <canvas ref={canvasRef} id="pdf-canvas" className="mx-auto block" />
                </div>
              </>
            )}
          </>
        )}

        {/* Uploader */}
        {view === 'uploader' && (
          <form className="space-y-4" onSubmit={handleUpload}>
            <div
              className="rounded-xl border p-6"
              style={{ background: '#F8F7F5', borderColor: '#E6E6E6' }}
            >
              <p className="mb-3" style={{ color: 'var(--muted, #6E6E6E)' }}>
                Selecione um arquivo PDF para enviar.
              </p>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
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
