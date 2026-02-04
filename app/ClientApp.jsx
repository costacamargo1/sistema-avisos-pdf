'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Upload, Maximize2, Play, Pause,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Monitor, X
} from 'lucide-react';

export default function ClientApp() {
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
  const [autoMs, setAutoMs] = useState(8000); // 8 segundos padrão

  const [tvMode, setTvMode] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const hideUiTimerRef = useRef(null);

  const canvasRef = useRef(null);
  const viewerRef = useRef(null);

  const fitScaleContain = async (doc, pageNum, isTv = false) => {
    const container = viewerRef.current;
    if (!container) return 1;

    const page = await doc.getPage(pageNum);
    const viewport1 = page.getViewport({ scale: 1 });
    // No modo TV, removemos o padding para ser edge-to-edge
    const pad = isTv ? 0 : 32;

    const cw = container.clientWidth - pad * 2;
    const ch = container.clientHeight - pad * 2;
    if (cw <= 0 || ch <= 0) return 1;

    const sx = cw / viewport1.width;
    const sy = ch / viewport1.height;

    return Math.max(0.5, Math.min(3, Math.min(sx, sy)));
  };

  const renderPage = useCallback(async (doc, pageNum, s) => {
    try {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: s, rotation: 0 });
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.style.transform = 'none';
      canvas.style.rotate = '0deg';

      const context = canvas.getContext("2d");
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Fundo branco puro para o papel do PDF
      context.fillStyle = "#FFFFFF";
      context.fillRect(0, 0, canvas.width, canvas.height);

      const ua = navigator.userAgent;
      const isBuggyDevice = /Samsung|Tizen|SmartTV/i.test(ua) || /Windows/i.test(ua);
      if (isBuggyDevice) {
        context.setTransform(1, 0, 0, 1, 0, 0);
      }

      await page.render({ canvasContext: context, viewport }).promise;
    } catch (err) {
      console.error("Falha no render da página:", err);
    }
  }, []);

  const goTo = useCallback(async (n) => {
    if (!pdfDoc) return;
    const page = Math.max(1, Math.min(totalPages, n));
    setCurrentPage(page);
    await renderPage(pdfDoc, page, scale);
  }, [pdfDoc, totalPages, scale, renderPage]);

  const toggleFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  }, []);

  const handleUpload = useCallback(async (e) => {
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
        setTvMode(true); // Autostart TV
        alert('✅ PDF carregado com sucesso!');
      } else {
        throw new Error(data?.error || 'Falha no upload.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      // Fallback para dev local / offline
      if (file) {
        const localUrl = URL.createObjectURL(file);
        setPdfUrl(localUrl);
        setView('viewer');
        setFile(null);
        setTvMode(true); // Autostart TV on fallback too
        alert('⚠️ Modo Offline: PDF carregado localmente.');
      } else {
        alert('❌ Erro: ' + (err.message || 'desconhecido'));
      }
    } finally {
      setIsUploading(false);
    }
  }, [file]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && pdfDoc) {
        renderPage(pdfDoc, currentPage, scale);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pdfDoc, currentPage, scale, renderPage]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/get-pdf', { cache: 'no-store' });
        const data = await res.json();
        if (data?.url) {
          setPdfUrl(data.url);
          localStorage.setItem('lastPdfUrl', data.url);
          setTvMode(true);
        } else {
          const cached = localStorage.getItem('lastPdfUrl');
          if (cached) {
            setPdfUrl(cached);
            setTvMode(true);
          }
        }
      } catch {
        const cached = localStorage.getItem('lastPdfUrl');
        if (cached) {
          setPdfUrl(cached);
          setTvMode(true);
        }
      }
    })();
  }, []);

  useEffect(() => {
    const q = searchParams.get('tv');
    const stored = localStorage.getItem('tvMode');
    if (q === '1' || stored === '1') setTvMode(true);
  }, [searchParams]);

  useEffect(() => {
    if (!pdfUrl) return;
    let cancelled = false;

    (async () => {
      try {
        const isTv = /Tizen|Web0S|SmartTV|NetCast|TV/i.test(navigator.userAgent);
        let pdfjsLib;

        if (isTv && window.pdfjsLib) {
          pdfjsLib = window.pdfjsLib;
        } else {
          pdfjsLib = await import('pdfjs-dist');
          await import('pdfjs-dist/build/pdf.worker.mjs');
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
        }

        const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
        const doc = await loadingTask.promise;
        if (cancelled) return;

        setPdfDoc(doc);
        setTotalPages(doc.numPages);

        requestAnimationFrame(async () => {
          // Assume TV mode on first load for better UX if needed, or pass true if we know it defaults to TV
          const s = await fitScaleContain(doc, 1, true);
          setScale(s);
          await renderPage(doc, 1, s);
          setCurrentPage(1);
        });

      } catch (err) {
        console.error('❌ Erro ao carregar PDF:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [pdfUrl, renderPage]);

  useEffect(() => {
    if (pdfDoc) renderPage(pdfDoc, currentPage, scale);
  }, [scale, pdfDoc, currentPage, renderPage]);

  useEffect(() => {
    if (!pdfDoc || totalPages < 1 || !autoPlay) return;
    const id = setInterval(() => {
      setCurrentPage(prev => (prev < totalPages ? prev + 1 : 1));
    }, autoMs);
    return () => clearInterval(id);
  }, [pdfDoc, totalPages, autoPlay, autoMs]);

  // Efeito para redimensionamento e renderização ao mudar página ou entrar em TV mode
  useEffect(() => {
    if (!tvMode || !pdfDoc) return;
    const applyFit = async () => {
      const s = await fitScaleContain(pdfDoc, currentPage, true);
      setScale(s);
      await renderPage(pdfDoc, currentPage, s);
    };
    applyFit();
  }, [tvMode, pdfDoc, currentPage, renderPage]);

  // Efeito de gerenciamento de estado do MODO TV (Listeners, Fullscreen, Autoplay)
  useEffect(() => {
    localStorage.setItem('tvMode', tvMode ? '1' : '0');

    if (tvMode) {
      setAutoPlay(true);

      // Auto Fullscreen após 3s se não estiver em tela cheia
      const fsTimer = setTimeout(() => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.().catch(() => { });
        }
      }, 3000);

      const onResize = async () => {
        if (pdfDoc) {
          const s = await fitScaleContain(pdfDoc, currentPage, true);
          setScale(s);
          await renderPage(pdfDoc, currentPage, s);
        }
      };
      window.addEventListener('resize', onResize);

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

      // Inicialmente esconde UI para evitar flicker, o timer ou movimento ativam se necessário
      setUiVisible(false);
      document.body.classList.add('cursor-hidden');

      return () => {
        clearTimeout(fsTimer);
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

      // Re-fit normal quando sai do modo TV
      const applyFitNormal = async () => {
        if (!pdfDoc) return;
        const s = await fitScaleContain(pdfDoc, currentPage, false);
        setScale(s);
        await renderPage(pdfDoc, currentPage, s);
      };
      applyFitNormal();
    }
  }, [tvMode]); // Roda apenas ao mudar o modo TV, não na troca de páginas!

  // Handle Keyboard shortcuts
  useEffect(() => {
    const onKey = async (e) => {
      if (!pdfDoc) return;
      if (e.key === 'ArrowRight') await goTo(currentPage + 1);
      else if (e.key === 'ArrowLeft') await goTo(currentPage - 1);
      else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        setAutoPlay(a => !a);
      }
      else if (e.key.toLowerCase() === 'f') toggleFullscreen();
      else if (e.key.toLowerCase() === 't') setTvMode(t => !t);
      else if (e.key === '+') setScale(s => Math.min(3, s + 0.1));
      else if (e.key === '-') setScale(s => Math.max(0.5, s - 0.1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pdfDoc, currentPage, goTo, toggleFullscreen]);

  const topBarHidden = tvMode && !uiVisible;

  // --- UI Components ---

  if (view === 'uploader') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 animate-enter">
        <div className="card w-full max-w-lg p-8 relative">
          <button
            onClick={() => setView('viewer')}
            className="absolute top-4 right-4 btn-ghost p-2 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold tracking-tight mb-2">Enviar PDF</h2>
            <p className="text-sm text-gray-500">
              Selecione o arquivo que será exibido no painel.
            </p>
          </div>

          <form onSubmit={handleUpload} className="space-y-6">
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group relative">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="p-4 bg-white rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6 text-blue-500" />
              </div>
              <p className="font-medium text-gray-700">
                {file ? file.name : 'Clique ou arraste o PDF aqui'}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="btn w-full py-3 text-base shadow-lg shadow-blue-500/20"
                disabled={isUploading || !file}
              >
                {isUploading ? 'Enviando...' : 'Confirmar Envio'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- Viewer Mode ---

  return (
    <main className="relative min-h-screen overflow-hidden flex flex-col">
      {/* Header Overlay */}
      <header className={`absolute top-0 left-0 right-0 z-10 p-4 ui-fade ${topBarHidden ? 'ui-hidden' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center overflow-hidden p-1">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">Avisos Licitação</h1>
              <p className="text-xs text-gray-500">Grupo FFontana</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!tvMode && (
              <>
                <button className="btn-secondary" onClick={() => setView('uploader')}>
                  <Upload className="w-4 h-4" /> <span className="hidden sm:inline">Trocar PDF</span>
                </button>
                {pdfUrl && (
                  <a className="btn-secondary" href={pdfUrl} target="_blank" rel="noreferrer">
                    <Download className="w-4 h-4" />
                  </a>
                )}
              </>
            )}
            <button
              className="btn-secondary"
              onClick={toggleFullscreen}
              title="Tela Cheia"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              className={`btn-secondary ${tvMode ? 'bg-blue-50 text-blue-600 border-blue-200' : ''}`}
              onClick={() => setTvMode(t => !t)}
            >
              {tvMode ? 'Sair do modo TV' : 'Modo TV'}
            </button>
          </div>
        </div>
      </header>

      {/* Canvas Area */}
      <div
        ref={viewerRef}
        className="flex-1 w-full h-screen relative flex items-center justify-center bg-transparent"
        onDoubleClick={toggleFullscreen}
      >
        {!pdfUrl && (
          <div className="text-center animate-enter">
            <p className="text-gray-400 text-lg mb-4">Nenhum PDF em exibição</p>
            <button className="btn" onClick={() => setView('uploader')}>
              Carregar Arquivo
            </button>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className={`transition-transform duration-300 ease-out ${tvMode ? 'block' : 'shadow-2xl rounded-sm max-w-[95%] max-h-[90vh]'}`}
          style={{
            maxHeight: tvMode ? '100vh' : '85vh',
            maxWidth: tvMode ? '100vw' : undefined,
            opacity: pdfUrl ? 1 : 0
          }}
        />
      </div>

      {/* Floating Control Bar */}
      {pdfUrl && (
        <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-20 ui-fade ${topBarHidden ? 'ui-hidden' : ''}`}>
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-2 flex items-center gap-1 transition-all hover:scale-105 hover:bg-white">

            {/* Page Nav */}
            <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
              <button className="btn-ghost p-2 rounded-xl" onClick={() => goTo(currentPage - 1)}>
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-xs font-medium font-mono min-w-12 text-center text-gray-600">
                {currentPage} / {totalPages || '-'}
              </span>
              <button className="btn-ghost p-2 rounded-xl" onClick={() => goTo(currentPage + 1)}>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Playback */}
            <div className="flex items-center gap-1 px-2 border-r border-gray-200">
              <button
                className={`p-2 rounded-xl transition-colors ${autoPlay ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 text-gray-700'}`}
                onClick={() => setAutoPlay(a => !a)}
                title="Autoplay"
              >
                {autoPlay ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>

              <select
                className="bg-transparent border-none text-xs font-medium text-gray-600 focus:ring-0 cursor-pointer py-1 pr-6"
                value={autoMs}
                onChange={(e) => setAutoMs(Number(e.target.value))}
              >
                <option value={5000}>5s</option>
                <option value={8000}>8s</option>
                <option value={10000}>10s</option>
                <option value={15000}>15s</option>
              </select>
            </div>

            {/* Zoom & Screen */}
            <div className="flex items-center gap-1 pl-2">
              <button className="btn-ghost p-2 rounded-xl" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>
                <ZoomOut className="w-4 h-4" />
              </button>
              <button className="btn-ghost p-2 rounded-xl" onClick={() => setScale(s => Math.min(3, s + 0.1))}>
                <ZoomIn className="w-4 h-4" />
              </button>
              <button className="btn-ghost p-2 rounded-xl ml-1" onClick={toggleFullscreen}>
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

    </main>
  );
}
