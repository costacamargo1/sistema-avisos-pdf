import { NextResponse } from 'next/server';
import { JWT } from 'google-auth-library';

export const dynamic = 'force-dynamic';

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const DAYS_AHEAD = 7;
const TZ = 'America/Sao_Paulo';

// Aceita o ID puro da agenda (ex.: fulano@gmail.com ou xxx@group.calendar.google.com)
// ou uma URL de incorporação do Google Agenda (extrai o parâmetro src=).
function parseCalendarId(input) {
  if (!input) return null;
  const trimmed = String(input).trim();
  const srcMatch = trimmed.match(/[?&]src=([^&]+)/);
  if (srcMatch) {
    try { return decodeURIComponent(srcMatch[1]); } catch { return srcMatch[1]; }
  }
  if (trimmed.includes('@')) return trimmed;
  return null;
}

function loadServiceAccount() {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_B64;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT;
  let json = null;
  if (b64) {
    try { json = Buffer.from(b64, 'base64').toString('utf8'); } catch { json = null; }
  } else if (raw) {
    json = raw;
  }
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    // Normaliza quebras de linha da chave PEM (escapadas em .env viram \n literais).
    if (parsed.private_key) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    return parsed;
  } catch {
    return null;
  }
}

let cachedClient = null;
function getAuthClient(credentials) {
  if (cachedClient) return cachedClient;
  cachedClient = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [CALENDAR_SCOPE],
  });
  return cachedClient;
}

// Data (YYYY-MM-DD) no fuso de São Paulo (UTC-3 fixo, sem horário de verão).
function spDay(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(date);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rawCalendar = searchParams.get('calendar');

  const credentials = loadServiceAccount();
  if (!credentials?.client_email || !credentials?.private_key) {
    return NextResponse.json(
      { error: 'Integração com Google não configurada no servidor.' },
      { status: 503 },
    );
  }

  // Sem parâmetro: retorna só o e-mail da conta de serviço (usado pelo gerenciador
  // para instruir o dono da agenda sobre o compartilhamento).
  if (!rawCalendar) {
    return NextResponse.json({ serviceAccountEmail: credentials.client_email });
  }

  const calendarId = parseCalendarId(rawCalendar);
  if (!calendarId) {
    return NextResponse.json(
      { error: 'ID da agenda inválido. Use o ID exibido nas configurações da agenda (contém @).' },
      { status: 400 },
    );
  }

  try {
    const client = getAuthClient(credentials);

    const now = new Date();
    const timeMin = `${spDay(now)}T00:00:00-03:00`;
    const timeMax = `${spDay(new Date(now.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000))}T23:59:59-03:00`;

    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '100',
      timeZone: TZ,
    });
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`;
    const res = await client.request({ url });

    const items = res.data?.items || [];
    const events = items
      .filter(e => e.status !== 'cancelled')
      .map(e => ({
        id: e.id,
        summary: e.summary || '(Sem título)',
        location: e.location || '',
        description: (e.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
        allDay: Boolean(e.start?.date),
        start: e.start?.dateTime || e.start?.date || null,
        end: e.end?.dateTime || e.end?.date || null,
      }));

    return NextResponse.json({
      title: res.data?.summary || '',
      days: DAYS_AHEAD,
      events,
      serviceAccountEmail: credentials.client_email,
    });
  } catch (error) {
    const status = error?.response?.status;
    // O Google responde 404 tanto para agenda inexistente quanto não compartilhada.
    if (status === 404 || status === 403) {
      return NextResponse.json(
        { error: `Sem acesso à agenda. Peça ao dono para compartilhá-la com ${credentials.client_email} e confira o ID.` },
        { status: 404 },
      );
    }
    console.error('Erro ao ler Google Agenda:', error?.message || error);
    return NextResponse.json({ error: 'Falha ao ler a agenda.' }, { status: 500 });
  }
}
