"use client";
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
    Upload, Maximize2, Play, Pause,
    ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Monitor, X, RotateCcw,
    Settings, Clock, Check
} from 'lucide-react';

// Variável global simulada para PDF.js. Será preenchida por um script dinâmico.
let pdfjsLib = null;

// --- Funções Auxiliares para Carregamento do PDF.js ---
const loadPdfJs = async () => {
    if (pdfjsLib) return pdfjsLib;

    return new Promise((resolve, reject) => {
        // 1. Carrega a biblioteca principal PDF.js
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.min.mjs';
        script.type = 'module';
        script.onerror = () => reject(new Error("Falha ao carregar o script principal PDF.js."));
        script.onload = async () => {
            if (window.pdfjsLib) {
                pdfjsLib = window.pdfjsLib;
                
                // 3. Define a origem do worker
                const workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.mjs?v=4.5.136`;
                pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
                resolve(pdfjsLib);
            } else {
                 // Tenta o fallback para a versão não-módulo
                const fallbackScript = document.createElement('script');
                fallbackScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.js';
                fallbackScript.onload = () => {
                    if (window.pdfjsLib) {
                        pdfjsLib = window.pdfjsLib;
                        const workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.js?v=4.5.136`;
                        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
                        resolve(pdfjsLib);
                    } else {
                        reject(new Error("Objeto global PDF.js não encontrado."));
                    }
                };
                fallbackScript.onerror = () => reject(new Error("Falha ao carregar o script de fallback PDF.js."));
                document.head.appendChild(fallbackScript);
            }
        };
        document.head.appendChild(script);
    });
};

const INITIAL_SCALE = 1.0;
const TIME_OPTIONS = [5000, 8000, 10000, 15000, 20000];

export const App = () => {
    // --- View State ---
    const [view, setView] = useState('viewer'); // 'viewer', 'uploader', 'settings'
    const [pdfUrl, setPdfUrl] = useState(null);
    
    // --- PDF State ---
    const [pdfDoc, setPdfDoc] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [scale, setScale] = useState(INITIAL_SCALE);
    const [isLoadingPdf, setIsLoadingPdf] = useState(false);

    // --- Control State ---
    const [autoPlay, setAutoPlay] = useState(false);
    const [autoMs, setAutoMs] = useState(8000);
    const [tvMode, setTvMode] = useState(false);
    const [uiVisible, setUiVisible] = useState(true);

    // --- Upload State ---
    const [fileToUpload, setFileToUpload] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);

    // --- Refs ---
    const canvasRef = useRef(null);
    const viewerRef = useRef(null);
    const hideUiTimerRef = useRef(null);
    const pdfLoadingTaskRef = useRef(null);
    const renderTaskRef = useRef(null); // Referência para a tarefa de renderização atual

    // --- Initial PDF Load & Settings Hydration ---
    useEffect(() => {
        const fetchLatestPdf = async () => {
            try {
                const res = await fetch('/api/get-pdf');
                if (!res.ok) {
                    // A 404 is expected if no PDF has been uploaded yet.
                    if (res.status === 404) {
                        console.log('Nenhum PDF encontrado no servidor.');
                        return;
                    }
                    throw new Error(`Erro ao buscar PDF: ${res.statusText}`);
                }
                const data = await res.json();
                if (data.url) {
                    setPdfUrl(data.url);
                }
            } catch (error) {
                console.error('Falha ao carregar o PDF inicial:', error);
                // Optionally set an error state to show in the UI
            }
        };

        fetchLatestPdf();

        // Load user settings from localStorage
        const savedAutoMs = localStorage.getItem('autoMs');
        if (savedAutoMs) {
            setAutoMs(Number(savedAutoMs));
        }

        const savedTvMode = localStorage.getItem('tvMode');
        if (savedTvMode) {
            setTvMode(savedTvMode === '1');
        }
    }, []); // Runs only once on component mount

    // --- Handlers: Rendering and Scaling ---

    const fitScaleContain = useCallback(async (doc, pageNum) => {
        const container = viewerRef.current;
        if (!container || !doc) return INITIAL_SCALE;

        const page = await doc.getPage(pageNum);
        
        // CORREÇÃO: Passar explicitamente a rotação do documento para o cálculo do viewport
        const viewport1 = page.getViewport({ scale: 1, rotation: page.rotate });
        const pad = 16 * 2; // Tailwind p-4 (16px) on container and p-4 (16px) padding inside

        const cw = container.clientWidth - pad;
        const ch = container.clientHeight - pad;
        if (cw <= 0 || ch <= 0) return INITIAL_SCALE;

        const sx = cw / viewport1.width;
        const sy = ch / viewport1.height;

        return Math.max(0.25, Math.min(3, Math.min(sx, sy)));
    }, []);

    const renderPage = useCallback(async (doc, pageNum, s) => {
        if (!doc || !canvasRef.current) return;
        
        // 1. Cancelar a tarefa de renderização anterior para evitar conflitos no canvas.
        if (renderTaskRef.current) {
            try {
                // Cancelar é mais seguro do que apenas confiar na conclusão
                renderTaskRef.current.cancel(); 
                // console.log("Tarefa de renderização anterior cancelada.");
            } catch (e) {
                // console.warn("Erro ao cancelar tarefa de renderização anterior:", e);
            }
        }

        try {
            const page = await doc.getPage(pageNum);
            
            // CORREÇÃO: Passar explicitamente a rotação para a renderização, garantindo que a transformação seja aplicada.
            const viewport = page.getViewport({ scale: s, rotation: page.rotate });
            const canvas = canvasRef.current;
            const context = canvas.getContext("2d");

            // Reset transform and clear
            context.setTransform(1, 0, 0, 1, 0, 0);
            context.clearRect(0, 0, canvas.width, canvas.height);

            // Update physical dimensions
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            // Update CSS/style dimensions
            canvas.style.width = `${viewport.width}px`;
            canvas.style.height = `${viewport.height}px`;

            // Draw neutral background for contrast
            context.fillStyle = "white"; 
            context.fillRect(0, 0, canvas.width, canvas.height);

            const renderContext = { canvasContext: context, viewport };
            
            // 2. Iniciar a nova tarefa de renderização e armazenar a promessa.
            const renderTask = page.render(renderContext);
            renderTaskRef.current = renderTask; // Armazena a tarefa ativa
            
            await renderTask.promise;

            // 3. Limpar a referência após a conclusão bem-sucedida.
            if (renderTaskRef.current === renderTask) {
                renderTaskRef.current = null;
            }
        } catch (err) {
            // Se o erro for devido ao cancelamento, ignoramos.
            if (err.name === 'RenderingCancelledException') {
                console.log("Renderização cancelada com sucesso.");
                return;
            }
            console.error("Falha ao renderizar a página:", err);
            // Certifica-se de que a referência é limpa mesmo em caso de erro
            renderTaskRef.current = null;
            // Opcionalmente, exibir uma mensagem de erro no canvas
        }
    }, []);

    const goTo = useCallback(async (n, forceScaleRecalculation = false) => {
        if (!pdfDoc) return;
        const page = Math.max(1, Math.min(totalPages, n));
        
        let newScale = scale;
        if (forceScaleRecalculation || tvMode) {
            newScale = await fitScaleContain(pdfDoc, page);
            setScale(newScale); // Define a escala apenas se for recalculada
        }

        setCurrentPage(page);
        // A chamada a renderPage irá lidar com o cancelamento da tarefa anterior.
        await renderPage(pdfDoc, page, newScale); 
    }, [pdfDoc, totalPages, renderPage, scale, fitScaleContain, tvMode]);

    // --- Efeito de Carregamento do PDF ---
    useEffect(() => {
        if (!pdfUrl) return;

        // Aborta a tarefa de carregamento anterior, se estiver em execução
        if (pdfLoadingTaskRef.current && pdfLoadingTaskRef.current.destroy) {
            pdfLoadingTaskRef.current.destroy();
            pdfLoadingTaskRef.current = null;
        }
        
        setPdfDoc(null);
        setTotalPages(0);
        setCurrentPage(1);
        setIsLoadingPdf(true);

        const loadDocument = async () => {
            try {
                const lib = await loadPdfJs();
                pdfLoadingTaskRef.current = lib.getDocument({ url: pdfUrl });
                const doc = await pdfLoadingTaskRef.current.promise;
                
                setPdfDoc(doc);
                setTotalPages(doc.numPages);
                
                // Recalcula a escala e renderiza a página 1 após o carregamento
                const initialScale = await fitScaleContain(doc, 1);
                setScale(initialScale);
                // NOTA: O goTo fará a primeira renderização e definição de página
                // await renderPage(doc, 1, initialScale); // Removido, goTo fará isso
                // setCurrentPage(1); // Removido, goTo fará isso
                await goTo(1, true); // Usa goTo para garantir o fluxo de renderização
                
                console.log('✅ PDF carregado e renderizado:', pdfUrl);
            } catch (err) {
                console.error('❌ Erro ao carregar PDF:', err);
                // Substituí alert() por um console.log para evitar interrupções no iframe
                console.log(`Erro ao carregar PDF. Certifique-se de que o link está acessível. (${err.message})`);
                setPdfUrl(null); // Limpa a URL em caso de erro fatal
            } finally {
                setIsLoadingPdf(false);
            }
        };
        loadDocument();

        // Cleanup: Cancela o carregamento do documento se o componente for desmontado
        return () => {
            if (pdfLoadingTaskRef.current && pdfLoadingTaskRef.current.destroy) {
                pdfLoadingTaskRef.current.destroy();
            }
        };
    }, [pdfUrl, fitScaleContain, goTo]); // Adicionado goTo para garantir que o efeito chame a função mais recente

    // --- Re-renderizar na Mudança de Escala ---
    useEffect(() => {
        // Usa goTo para garantir que a página correta seja renderizada com a nova escala
        if (pdfDoc) goTo(currentPage, false); 
    }, [scale]); // Removido pdfDoc, currentPage, renderPage, e dependências, pois goTo os contém

    // --- Efeito Autoplay ---
    useEffect(() => {
        if (!pdfDoc || totalPages < 1 || !autoPlay) return;

        const id = setInterval(() => {
            setCurrentPage(prev => {
                const next = prev < totalPages ? prev + 1 : 1;
                // Usa goTo para garantir o fluxo de renderização com cancelamento
                goTo(next, false); 
                return next;
            });
        }, autoMs);

        return () => clearInterval(id);
    }, [pdfDoc, totalPages, autoPlay, autoMs, goTo]); // Atualizado para usar goTo

    // --- Efeito Modo TV/Tela Cheia e Ocultação da UI ---
    useEffect(() => {
        localStorage.setItem('tvMode', tvMode ? '1' : '0');

        const el = viewerRef.current;
        if (!el) return;

        if (tvMode) {
            setAutoPlay(true);
            
            // Entrar em Tela Cheia
            if (el && !document.fullscreenElement) {
                 el.requestFullscreen?.().catch(() => console.warn('Tela cheia negada.'));
            }

            // Ajustar na mudança de tamanho
            // A chamada goTo(currentPage, true) garante que a escala seja recalculada para o novo tamanho
            const onResize = () => goTo(currentPage, true);
            window.addEventListener('resize', onResize);

            // Ocultar UI na inatividade
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
            onMove(); // Chamada inicial para definir a visibilidade

            return () => {
                window.removeEventListener('resize', onResize);
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('keydown', onMove);
                clearTimeout(hideUiTimerRef.current);
                document.body.classList.remove('cursor-hidden');

                // Sair da Tela Cheia, se necessário (por exemplo, ao sair do tvMode)
                if (document.fullscreenElement) document.exitFullscreen?.();
            };
        } else {
            // Limpeza ao sair do Modo TV
            setAutoPlay(false);
            setUiVisible(true);
            document.body.classList.remove('cursor-hidden');
            if (document.fullscreenElement) document.exitFullscreen?.();
        }
        
    }, [tvMode, pdfDoc, currentPage, goTo]);
    
    // --- Atalhos de Teclado ---
    useEffect(() => {
        const onKey = async (e) => {
            if (!pdfDoc) return;
            // Previne interferência com campos de entrada
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

            const key = e.key.toLowerCase();
            
            if (key === 'arrowright' || key === 'd') {
                await goTo(currentPage + 1);
            } else if (key === 'arrowleft' || key === 'a') {
                await goTo(currentPage - 1);
            } else if (key === ' ' || key === 'p') {
                e.preventDefault(); // Previne o scroll na barra de espaço
                setAutoPlay(a => !a);
            } else if (key === 'f') {
                toggleFullscreen();
            } else if (key === 't') {
                setTvMode(t => !t);
            } else if (key === '+' || key === '=') {
                setScale(s => Math.min(3, s + 0.1));
            } else if (key === '-' || key === '_') {
                setScale(s => Math.max(0.5, s - 0.1));
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [pdfDoc, currentPage, goTo]);


    // --- Outros Handlers ---

    const toggleFullscreen = () => {
        const el = viewerRef.current;
        if (!el) return;
        if (document.fullscreenElement) document.exitFullscreen?.();
        else el.requestFullscreen?.();
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!fileToUpload) {
            console.log('Selecione um PDF.');
            setUploadError('Por favor, selecione um arquivo PDF para enviar.');
            return;
        }

        setIsUploading(true);
        setUploadError(null);

        const formData = new FormData();
        formData.append('file', fileToUpload);

        try {
            const res = await fetch('/api/upload-pdf', {
                method: 'POST',
                body: formData
            });

            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error(`Resposta inválida do servidor: ${text}`);
            }

            if (!res.ok) throw new Error(data.error || `Erro HTTP ${res.status}`);

            setPdfUrl(data.url);
            console.log(`✅ PDF enviado com sucesso! URL: ${data.url}`);
            alert(`✅ PDF enviado com sucesso!`);
            
            setView('viewer');
            setFileToUpload(null);

        } catch (err) {
            console.error('Erro ao enviar PDF:', err);
            setUploadError(err.message);
            alert(`❌ Erro ao enviar PDF: ${err.message}`);
        } finally {
            setIsUploading(false);
        }
    };
    
    // --- Valores Calculados e Estilos ---
    const topBarHidden = tvMode && !uiVisible;
    const isReady = pdfDoc && totalPages > 0;

    const Button = ({ children, onClick, title = "", variant = "primary", className = "", disabled = false, type = "button" }) => {
        const base = "px-3 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed";
        const variants = {
            primary: "bg-indigo-600 text-white hover:bg-indigo-700",
            secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200",
            icon: "bg-gray-100 text-gray-700 hover:bg-gray-200 p-2"
        };
        return (
            <button onClick={onClick} title={title} className={`${base} ${variants[variant]} ${className}`} disabled={disabled} type={type}>
                {children}
            </button>
        );
    };

    const StatusIndicator = ({ status, isReady }) => {
        if (isLoadingPdf) {
            return (
                <div className="flex items-center text-sm text-yellow-600 animate-pulse">
                    <RotateCcw className="w-4 h-4 mr-1" /> Carregando PDF...
                </div>
            );
        }
        if (isReady) {
            return (
                <div className="flex items-center text-sm text-green-600">
                    <Check className="w-4 h-4 mr-1" /> Pronto
                </div>
            );
        }
        return (
            <div className="flex items-center text-sm text-red-600">
                <X className="w-4 h-4 mr-1" /> Nenhum arquivo.
            </div>
        );
    };
    
    // --- Component JSX ---

    const renderViewer = () => (
        <>
            {/* Barra de Controle (Topo) */}
            <div className={`flex justify-between items-center p-4 bg-white border-b border-gray-200 transition-opacity duration-300 ${topBarHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                
                {/* Controles de Navegação */}
                <div className="flex items-center gap-4">
                    <Button variant="icon" onClick={() => goTo(currentPage - 1)} title="Página anterior (←/A)" disabled={!isReady || currentPage === 1}>
                        <ChevronLeft className="w-5 h-5" />
                    </Button>

                    <span className="text-lg font-mono text-gray-700">
                        {currentPage} / {totalPages || '–'}
                    </span>

                    <Button variant="icon" onClick={() => goTo(currentPage + 1)} title="Próxima página (→/D)" disabled={!isReady || currentPage === totalPages}>
                        <ChevronRight className="w-5 h-5" />
                    </Button>
                </div>

                {/* Controles de Zoom e Autoplay */}
                <div className="flex items-center gap-4">
                    <span className="text-gray-500 font-mono text-sm">{Math.round(scale * 100)}%</span>
                    
                    <Button variant="icon" onClick={() => setScale(s => Math.max(0.5, s - 0.1))} title="Zoom Out (-)">
                        <ZoomOut className="w-5 h-5" />
                    </Button>
                    <Button variant="icon" onClick={() => setScale(s => Math.min(3, s + 0.1))} title="Zoom In (+)">
                        <ZoomIn className="w-5 h-5" />
                    </Button>
                    
                    <Button 
                        variant={autoPlay ? "secondary" : "primary"} 
                        onClick={() => setAutoPlay(a => !a)} 
                        title="Troca automática de páginas (Espaço/P)" 
                        disabled={!isReady}
                    >
                        {autoPlay ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        {autoPlay ? 'Pausar' : 'Auto Play'}
                    </Button>
                </div>
            </div>

            {/* Área do Visualizador */}
            <div
                ref={viewerRef}
                className="w-full overflow-hidden relative flex justify-center items-center rounded-b-xl"
                style={{
                    background: tvMode ? '#1f2937' : '#EAECEF', // Fundo escuro para o Modo TV
                    height: tvMode ? 'calc(100vh - 72px)' : '70vh', // Altura ajustada para o Modo TV
                    transition: 'all 0.3s ease-in-out'
                }}
                onDoubleClick={toggleFullscreen}
            >
                {isLoadingPdf && (
                    <div className="text-white flex flex-col items-center">
                        <svg className="animate-spin h-8 w-8 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="mt-4 text-sm text-gray-400">Carregando PDF...</p>
                    </div>
                )}
                
                <div className="p-4 overflow-auto w-full h-full flex justify-center items-center">
                    {/* O container do canvas para centralização */}
                    <div style={{ boxShadow: isReady ? '0 10px 30px rgba(0,0,0,0.15)' : 'none', transition: 'box-shadow 0.3s' }}>
                        <canvas ref={canvasRef} id="pdf-canvas" className="block mx-auto" />
                    </div>
                </div>

                {/* Sobreposição do Modo TV */}
                {tvMode && (
                    <div 
                        className={`absolute bottom-0 left-0 right-0 p-4 transition-opacity duration-300 
                            ${uiVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0))' }}
                    >
                        <div className="flex justify-between items-end text-white">
                            <div className="text-lg font-semibold tracking-wide">
                                {pdfDoc ? 'Visualizando Apresentação' : 'Aguardando PDF'}
                            </div>
                            <div className="flex items-center text-sm font-mono">
                                <span className="mr-3">Escala: {Math.round(scale * 100)}%</span>
                                <span className="mr-3">{autoPlay ? <Play className="w-4 h-4 inline mr-1" /> : <Pause className="w-4 h-4 inline mr-1" />} {autoMs / 1000}s/slide</span>
                                
                                <span className="text-xl font-bold p-1 rounded bg-indigo-600">
                                    {currentPage} / {totalPages || '–'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );

    const renderUploader = () => (
        <form className="p-8 space-y-6" onSubmit={handleUpload}>
            <h2 className="text-2xl font-semibold text-gray-800">Enviar Novo PDF</h2>
            <p className="text-gray-600">
                Selecione um arquivo PDF do seu computador para enviar para a nuvem. O novo arquivo substituirá o aviso atual.
            </p>

            {uploadError && (
                <div className="p-4 bg-red-100 text-red-700 border border-red-200 rounded-lg">
                    <p className="font-bold">Erro no Upload</p>
                    <p>{uploadError}</p>
                </div>
            )}

            <div className="p-6 border-2 border-dashed border-indigo-300 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors">
                <input 
                    type="file" 
                    accept="application/pdf" 
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200"
                    onChange={(e) => {
                        setFileToUpload(e.target.files?.[0] ?? null);
                        setUploadError(null); // Clear error when a new file is selected
                    }} 
                />
                {fileToUpload && (
                    <p className="mt-3 text-sm text-gray-700">Arquivo selecionado: <span className="font-bold">{fileToUpload.name}</span></p>
                )}
            </div>

            <div className="flex items-center gap-3">
                <Button type="submit" disabled={isUploading || !fileToUpload}>
                    <Upload className="w-4 h-4" />
                    {isUploading ? 'Enviando...' : 'Enviar para a Nuvem'}
                </Button>

                <Button type="button" variant="secondary" onClick={() => { setView('viewer'); setUploadError(null); }}>
                    <X className="w-4 h-4" /> Cancelar
                </Button>
            </div>
        </form>
    );
    
    const renderSettings = () => (
        <div className="p-8 space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
                <Settings className="w-6 h-6 text-indigo-600" /> Configurações
            </h2>
            <div className="space-y-4">
                <div className="border-b pb-4">
                    <h3 className="text-xl font-medium text-gray-700 flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5" /> Auto Play
                    </h3>
                    <p className="text-gray-600 mb-3">Defina o tempo de exibição para cada slide em milissegundos.</p>
                    <label className="block">
                        <span className="text-sm font-medium text-gray-500">Tempo por Página (ms):</span>
                        <select
                            className="mt-1 block w-full md:w-1/2 rounded-lg border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition-all duration-150 p-2"
                            value={autoMs}
                            onChange={(e) => {
                                const newMs = Number(e.target.value);
                                setAutoMs(newMs);
                                localStorage.setItem('autoMs', newMs);
                            }}
                            title="Tempo por página (autoplay)"
                        >
                            {TIME_OPTIONS.map(ms => (
                                <option key={ms} value={ms}>{ms / 1000} segundos</option>
                            ))}
                        </select>
                    </label>
                </div>
                
                <div className="pt-4">
                    <h3 className="text-xl font-medium text-gray-700 flex items-center gap-2 mb-2">
                         <Monitor className="w-5 h-5" /> Modo TV
                    </h3>
                    <p className="text-gray-600 mb-3">O Modo TV habilita a tela cheia, o auto-play e esconde a UI em inatividade.</p>
                    <Button 
                        onClick={() => setTvMode(t => !t)}
                        variant={tvMode ? "primary" : "secondary"}
                    >
                        {tvMode ? 'Ativado' : 'Desativado'}
                    </Button>
                </div>
            </div>
             <Button type="button" variant="secondary" onClick={() => setView('viewer')}>
                <ChevronLeft className="w-4 h-4" /> Voltar ao Viewer
            </Button>
        </div>
    );
    
    // --- Layout Principal ---
    return (
        <div className="min-h-screen bg-gray-50 font-sans antialiased text-gray-900">
            {/* Cabeçalho Global */}
            <header className="bg-white shadow-sm transition-opacity duration-300" 
                    style={{ opacity: topBarHidden ? 0 : 1, pointerEvents: topBarHidden ? 'none' : 'auto' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-extrabold tracking-tight text-indigo-600">
                            Avisos Licitação
                        </h1>
                        <StatusIndicator isReady={isReady} />
                    </div>

                    <div className="flex items-center gap-3">
                        {isReady && pdfUrl && (
                            <a href={pdfUrl} target="_blank" rel="noreferrer">
                                <Button variant="secondary" title="Abrir original (Download)">
                                    <Download className="w-4 h-4" /> Download
                                </Button>
                            </a>
                        )}
                        
                        <Button variant="secondary" onClick={() => setView('settings')} title="Configurações">
                            <Settings className="w-4 h-4" /> Configurações
                        </Button>
                        
                        <Button onClick={() => setView('uploader')} title="Enviar Novo PDF">
                            <Upload className="w-4 h-4" /> Enviar PDF
                        </Button>
                        
                        <Button variant="icon" onClick={() => setTvMode(t => !t)} title="Alternar Modo TV (T)">
                            <Monitor className="w-5 h-5" />
                        </Button>
                        <Button variant="icon" onClick={toggleFullscreen} title="Tela Cheia (F)">
                            <Maximize2 className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Área de Conteúdo Principal */}
            <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                <div className={`bg-white rounded-xl shadow-2xl overflow-hidden ${!pdfUrl && view === 'viewer' ? 'border-4 border-dashed border-gray-200' : 'border border-gray-200'}`}>
                    {view === 'viewer' && renderViewer()}
                    {view === 'uploader' && renderUploader()}
                    {view === 'settings' && renderSettings()}
                </div>
            </main>
        </div>
    );
}

export default App;