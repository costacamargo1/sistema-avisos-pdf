'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Eye, Trash2, FileText, AlertCircle, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react';

export default function PDFAvisoSystem() {
  const [view, setView] = useState('viewer');
  const [file, setFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isUploading, setIsUploading] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null);

  // Carrega PDF salvo ao iniciar
  useEffect(() => {
    loadSavedPDF();
  }, []);

  // Inicializa PDF.js quando houver URL
  useEffect(() => {
    if (pdfUrl && view === 'viewer') {
      loadPDF(pdfUrl);
    }
  }, [pdfUrl, view]);

  const loadSavedPDF = async () => {
    try {
      const response = await fetch('/api/get-pdf');
      const data = await response.json();
      if (data.url) {
        setPdfUrl(data.url);
      }
    } catch (error) {
      console.error('Erro ao carregar PDF:', error);
    }
  };

  const loadPDF = async (url) => {
    try {
      const pdfjsLib = window['pdfjs-dist/build/pdf'];
      if (!pdfjsLib) {
        console.error('PDF.js não carregado');
        return;
      }

      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      const loadingTask = pdfjsLib.getDocument(url);
      const pdf = await loadingTask.promise;
      
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      renderPage(pdf, 1, scale);
    } catch (error) {
      console.error('Erro ao carregar PDF:', error);
    }
  };

  const renderPage = async (pdf, pageNum, scaleValue) => {
    const page = await pdf.getPage(pageNum);
    const canvas = document.getElementById('pdf-canvas');
    
    if (!canvas) return;

    const context = canvas.getContext('2d');
    const viewport = page.getViewport({ scale: scaleValue });

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };

    await page.render(renderContext).promise;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      alert('Por favor, selecione apenas arquivos .pdf');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload-pdf', { 
        method: 'POST', 
        body: formData 
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setPdfUrl(data.url);
        alert('✅ PDF enviado com sucesso!');
        setFile(null);
        setView('viewer');
      } else {
        // Se a resposta não for OK, ou se success for false, mostra o erro do servidor.
        const errorMessage = data.error || 'Ocorreu um erro desconhecido.';
        console.error('Server error:', data);
        alert('❌ Erro ao enviar PDF: ' + data.error);
      }
    } catch (error) {
      // Este erro acontece se a resposta não for JSON (e.g., HTML de erro 404)
      // ou se houver um problema de rede.
      console.error('Upload failed:', error);
      alert('❌ Erro ao enviar: ' + error.message + '. Verifique o console para mais detalhes.');
    } finally {
      setIsUploading(false);
    }
  };

  const nextPage = () => {
    if (pdfDoc && currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      renderPage(pdfDoc, newPage, scale);
    }
  };

  const prevPage = () => {
    if (pdfDoc && currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      renderPage(pdfDoc, newPage, scale);
    }
  };

  const zoomIn = () => {
    const newScale = Math.min(scale + 0.2, 3.0);
    setScale(newScale);
    if (pdfDoc) renderPage(pdfDoc, currentPage, newScale);
  };

  const zoomOut = () => {
    const newScale = Math.max(scale - 0.2, 0.5);
    setScale(newScale);
    if (pdfDoc) renderPage(pdfDoc, currentPage, newScale);
  };

  // Carrega PDF.js via CDN
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-8 h-8" />
            Sistema de Avisos PDF
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setView('viewer')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                view === 'viewer'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Eye className="w-4 h-4" />
              Visualizar
            </button>
            <button
              onClick={() => setView('editor')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                view === 'editor'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Upload className="w-4 h-4" />
              Editar Aviso
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {view === 'viewer' ? (
          <div className="max-w-6xl mx-auto">
            {pdfUrl ? (
              <div className="space-y-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={prevPage}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-lg transition-colors ${
                        currentPage === 1
                          ? 'bg-white/5 text-white/30 cursor-not-allowed'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    
                    <span className="text-white font-medium px-4">
                      Página {currentPage} de {totalPages}
                    </span>
                    
                    <button
                      onClick={nextPage}
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded-lg transition-colors ${
                        currentPage === totalPages
                          ? 'bg-white/5 text-white/30 cursor-not-allowed'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={zoomOut}
                      className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                    >
                      <ZoomOut className="w-5 h-5" />
                    </button>
                    
                    <span className="text-white font-medium px-4">
                      {Math.round(scale * 100)}%
                    </span>
                    
                    <button
                      onClick={zoomIn}
                      className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
>
                      <ZoomIn className="w-5 h-5" />
                    </button>

                    <a
                      href={pdfUrl}
                      download="aviso.pdf"
                      className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors ml-2"
                    >
                      <Download className="w-5 h-5" />
                    </a>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-2xl p-8 flex justify-center overflow-auto max-h-[70vh]">
                  <canvas id="pdf-canvas" className="max-w-full h-auto"></canvas>
                </div>
              </div>
            ) : (
              <div className="text-center text-white py-20">
                <FileText className="w-20 h-20 mx-auto mb-4 opacity-50" />
                <p className="text-xl">Nenhum aviso disponível</p>
                <p className="text-white/60 mt-2">Faça upload de um arquivo PDF na aba "Editar Aviso"</p>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">Upload de Aviso (PDF)</h2>
              
              <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 mb-6 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-100">
                  <p className="font-medium mb-1">Como funciona:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-200/90">
                    <li>Converta sua apresentação (PowerPoint, etc.) para PDF.</li>
                    <li>Envie o arquivo PDF usando o campo abaixo.</li>
                    <li>O arquivo anterior será substituído automaticamente.</li>
                  </ul>
                </div>
              </div>

              <div className="border-2 border-dashed border-white/30 rounded-xl p-8 text-center hover:border-purple-500 transition-colors">
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                  <Upload className="w-16 h-16 text-purple-400 mb-4" />
                  <p className="text-white font-medium mb-2">Clique para selecionar um arquivo</p>
                  <p className="text-white/60 text-sm">Apenas arquivos .pdf</p>
                </label>
              </div>

              {file && (
                <div className="mt-6 bg-white/5 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-purple-400" />
                    <div>
                      <p className="text-white font-medium">{file.name}</p>
                      <p className="text-white/60 text-sm">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setFile(null)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <Trash2 className="w-5 h-5 text-red-400" />
                  </button>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className={`w-full mt-6 py-4 rounded-xl font-bold text-white transition-all ${
                  !file || isUploading
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                }`}
              >
                {isUploading ? 'Enviando...' : 'Substituir Arquivo e Atualizar Aviso'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}