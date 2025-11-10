'use client';
import { useState } from 'react';

export default function UploadPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [error, setError] = useState('');

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

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
      alert(`✅ PDF enviado com sucesso!`);
    } catch (err) {
      console.error('Erro ao enviar PDF:', err);
      setError(err.message);
      alert(`❌ Erro ao enviar PDF: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <h1>Upload de PDF</h1>
      <input type="file" accept="application/pdf" onChange={handleUpload} disabled={isUploading} />

      {isUploading && <p>Enviando...</p>}
      {error && <p style={{ color: 'red' }}>Erro: {error}</p>}

      {pdfUrl && (
        <iframe
          src={pdfUrl}
          width="80%"
          height="600px"
          style={{ border: 'none', marginTop: '20px' }}
        />
      )}
    </div>
  );
}
