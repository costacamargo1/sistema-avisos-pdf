import { list } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getActivePdfState } from '../_lib/active-pdf';

export async function GET() {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({ url: null });
    }

    const active = await getActivePdfState(token);

    // If the state file exists, it is the single source of truth.
    if (active.exists) {
      return NextResponse.json({ url: active.url });
    }

    // Backward compatibility for older uploads before active state existed.
    const { blobs } = await list({ token });
    if (!blobs || blobs.length === 0) {
      return NextResponse.json({ url: null });
    }

    const lastBlob = blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
    return NextResponse.json({ url: lastBlob.url });
  } catch (error) {
    console.error('Erro ao listar PDFs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

