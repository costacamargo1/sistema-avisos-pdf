import { del } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getActivePdfState, setActivePdfState } from '../_lib/active-pdf';

export async function DELETE(request) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;

    if (!token) {
      return NextResponse.json({
        removed: false,
        warning: 'TOKEN nao configurado. Apenas limpeza local foi aplicada.',
      });
    }

    let requestUrl = null;
    try {
      const body = await request.json();
      if (typeof body?.url === 'string' && body.url.trim()) {
        requestUrl = body.url.trim();
      }
    } catch {
      // Empty body is allowed.
    }

    const active = await getActivePdfState(token);
    const targetUrl = requestUrl || active.url;

    if (targetUrl) {
      try {
        await del(targetUrl, { token });
      } catch (error) {
        // Keep going: we still want the active state cleared for all users.
        console.warn('Falha ao remover blob do PDF ativo:', error);
      }
    }

    await setActivePdfState(null, token);
    return NextResponse.json({ removed: true });
  } catch (error) {
    console.error('Erro ao remover PDF:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao remover PDF.' },
      { status: 500 },
    );
  }
}

