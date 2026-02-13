import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { resolveMessageOfDay } from '../_lib/message-of-day';

const MESSAGES_PATH = path.join(process.cwd(), 'data', 'biblical-messages.json');
const FALLBACK_MESSAGES = [
  {
    id: 1,
    mensagem: 'Tenho-vos dito isto, para que em mim tenhais paz; no mundo tereis aflicoes, mas tende bom animo, eu venci o mundo.',
    referencia: 'Joao 16:33',
  },
];

async function loadMessages() {
  try {
    const raw = await fs.readFile(MESSAGES_PATH, 'utf-8');
    const parsed = JSON.parse(raw.replace(/^\uFEFF/, ''));
    if (!Array.isArray(parsed)) {
      return FALLBACK_MESSAGES;
    }

    const clean = parsed
      .map((item, index) => ({
        id: Number(item?.id) || index + 1,
        mensagem: String(item?.mensagem || '').trim(),
        referencia: String(item?.referencia || '').trim(),
      }))
      .filter((item) => item.mensagem.length > 0 && item.referencia.length > 0);

    return clean.length > 0 ? clean : FALLBACK_MESSAGES;
  } catch {
    return FALLBACK_MESSAGES;
  }
}

export async function GET() {
  try {
    const messages = await loadMessages();
    const timeZone = process.env.MESSAGE_MODE_TIMEZONE || 'America/Sao_Paulo';
    const payload = resolveMessageOfDay(messages, new Date(), timeZone);

    if (!payload) {
      return NextResponse.json({ error: 'Nenhuma mensagem disponivel.' }, { status: 404 });
    }

    return NextResponse.json({
      ...payload,
      totalMessages: messages.length,
      timeZone,
    });
  } catch (error) {
    console.error('Erro ao carregar mensagem do dia:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao carregar mensagem do dia.' },
      { status: 500 },
    );
  }
}
