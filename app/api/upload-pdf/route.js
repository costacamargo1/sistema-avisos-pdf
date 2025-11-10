import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.formData();
    const file = data.get('file');

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    // Faz upload do arquivo para o storage da Vercel
    const blob = await put(file.name, file, { access: 'public' });

    // Retorna a URL pública do PDF
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('Erro no upload:', error);
    return NextResponse.json({ error: 'Erro interno no upload.' }, { status: 500 });
  }
}

// Bloqueia outros métodos (GET, PUT etc.)
export function GET() {
  return NextResponse.json({ error: 'Método não permitido' }, { status: 405 });
}
