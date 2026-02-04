import { list } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      // Local dev fallback: return null to silence errors
      return NextResponse.json({ url: null });
    }

    const { blobs } = await list();

    if (!blobs || blobs.length === 0) {
      return NextResponse.json({ url: null });
    }

    // Pega o mais recente
    const lastBlob = blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];

    return NextResponse.json({ url: lastBlob.url });
  } catch (error) {
    console.error('Erro ao listar PDFs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
