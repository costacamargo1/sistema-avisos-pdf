'use client';

import React, { useRef, useState } from 'react';
import { ImageIcon, Upload, Trash2, RefreshCw } from 'lucide-react';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export default function ImageBoard({ imageUrl, onChange }) {
  const inputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState(null);

  const uploadFile = async (file) => {
    if (!file || isUploading) return;
    if (!file.type || !file.type.startsWith('image/')) {
      setError('O arquivo deve ser uma imagem (PNG, JPG, WebP...).');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError('Imagem muito grande. Limite de 10MB.');
      return;
    }
    setError(null);
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (imageUrl) fd.append('previousUrl', imageUrl);
      const res = await fetch('/api/upload-image', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) throw new Error(data?.error || 'Falha no upload.');
      onChange(data.url);
    } catch (err) {
      setError(err.message || 'Falha no upload da imagem.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    if (!imageUrl || isUploading) return;
    if (!confirm('Remover a imagem deste quadro?')) return;
    fetch('/api/upload-image', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: imageUrl }),
    }).catch(() => {});
    onChange('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    uploadFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div
      className="w-full h-full flex flex-col bg-white"
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { uploadFile(e.target.files?.[0]); e.target.value = ''; }}
      />

      {imageUrl ? (
        <>
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 flex-shrink-0">
            <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[11px] font-medium text-gray-500 flex-1 truncate">
              Esta imagem será exibida em tela cheia na TV
            </span>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isUploading ? 'animate-spin' : ''}`} />
              {isUploading ? 'Enviando…' : 'Trocar imagem'}
            </button>
            <button
              onClick={removeImage}
              disabled={isUploading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium text-gray-500 border border-gray-200 bg-white hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3 h-3" />
              Remover
            </button>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center p-6 bg-gray-50/60">
            <img
              src={imageUrl}
              alt="Imagem do quadro"
              className="max-w-full max-h-full object-contain rounded-md shadow-sm"
            />
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8">
          <button
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className={`w-full max-w-[480px] flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-8 py-14 transition-colors
              ${isDragOver ? 'border-blue-400 bg-blue-50/60' : 'border-gray-200 bg-gray-50/60 hover:border-gray-300 hover:bg-gray-50'}
            `}
          >
            {isUploading ? (
              <>
                <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-[13px] font-medium text-gray-600">Enviando imagem…</span>
              </>
            ) : (
              <>
                <div className="w-11 h-11 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-medium text-gray-700">Clique para enviar ou arraste uma imagem</p>
                  <p className="text-[11px] text-gray-400 mt-1">PNG, JPG ou WebP · até 10MB · exibida em tela cheia na TV</p>
                </div>
              </>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="px-4 py-2 border-t border-red-100 bg-red-50 text-[12px] text-red-600 flex-shrink-0">
          {error}
        </div>
      )}
    </div>
  );
}
