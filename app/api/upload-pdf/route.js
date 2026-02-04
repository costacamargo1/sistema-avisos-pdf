import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.formData();
    const file = data.get('file');

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;

    if (!token) {
      return NextResponse.json({ error: 'TOKEN não configurado.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Adiciona um sufixo aleatório ao nome do arquivo para evitar conflitos
    const blob = await put(file.name, buffer, {
      access: 'public',
      token,
      addRandomSuffix: true
    });

    console.log('Upload concluído →', blob.url);
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('Erro completo no upload:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no upload.' }, { status: 500 });
  }
}
