import { del, put } from '@vercel/blob';
import { NextResponse } from 'next/server';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(request) {
  try {
    const data = await request.formData();
    const file = data.get('file');
    const previousUrl = data.get('previousUrl');

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    if (!file.type || !file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'O arquivo deve ser uma imagem (PNG, JPG, WebP...).' }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'Imagem muito grande. Limite de 10MB.' }, { status: 400 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;

    if (!token) {
      return NextResponse.json({ error: 'TOKEN nao configurado.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const blob = await put(`quadro-imagens/${file.name}`, buffer, {
      access: 'public',
      token,
      addRandomSuffix: true,
    });

    // Remove a imagem anterior do quadro para não acumular blobs órfãos.
    if (typeof previousUrl === 'string' && previousUrl.trim()) {
      try {
        await del(previousUrl.trim(), { token });
      } catch (error) {
        console.warn('Falha ao remover imagem anterior:', error);
      }
    }

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('Erro completo no upload de imagem:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno no upload.' },
      { status: 500 },
    );
  }
}

export async function DELETE(request) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;

    if (!token) {
      return NextResponse.json({ removed: false, warning: 'TOKEN nao configurado.' });
    }

    let url = null;
    try {
      const body = await request.json();
      if (typeof body?.url === 'string' && body.url.trim()) {
        url = body.url.trim();
      }
    } catch {
      // Corpo vazio é permitido.
    }

    if (url) {
      try {
        await del(url, { token });
      } catch (error) {
        console.warn('Falha ao remover blob da imagem:', error);
      }
    }

    return NextResponse.json({ removed: true });
  } catch (error) {
    console.error('Erro ao remover imagem:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao remover imagem.' },
      { status: 500 },
    );
  }
}
