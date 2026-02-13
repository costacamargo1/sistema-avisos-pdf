import { del } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function DELETE(request) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;

    if (!token) {
      return NextResponse.json({
        removed: false,
        warning: 'TOKEN nao configurado. Apenas limpeza local foi aplicada.',
      });
    }

    let url = null;
    try {
      const body = await request.json();
      if (typeof body?.url === 'string' && body.url.trim()) {
        url = body.url.trim();
      }
    } catch {
      // Accept empty body and keep url as null.
    }

    if (!url) {
      return NextResponse.json({ error: 'URL do PDF nao informada.' }, { status: 400 });
    }

    await del(url, { token });
    return NextResponse.json({ removed: true });
  } catch (error) {
    console.error('Erro ao remover PDF:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao remover PDF.' },
      { status: 500 },
    );
  }
}
