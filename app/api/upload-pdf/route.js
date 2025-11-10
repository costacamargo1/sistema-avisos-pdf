import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.formData();
    const file = data.get('file');

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    // Lê o token da variável de ambiente
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    console.log('TOKEN EXISTE?', !!token); // <- apenas pra debug (mostra true/false nos logs da Vercel)

    if (!token) {
      throw new Error('Token BLOB_READ_WRITE_TOKEN não configurado.');
    }

    // Envia o arquivo para o storage da Vercel
    const blob = await put(file.name, file, {
      access: 'public',
      token
    });

    console.log('BLOB:', blob);

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('Erro no upload:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no upload.' }, { status: 500 });
  }
}
