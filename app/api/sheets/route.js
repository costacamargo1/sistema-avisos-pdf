import { NextResponse } from 'next/server';
import { JWT } from 'google-auth-library';

export const dynamic = 'force-dynamic';

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';

// Extrai o ID da planilha de uma URL completa do Google Sheets ou aceita o ID puro.
function parseSpreadsheetId(input) {
  if (!input) return null;
  const trimmed = String(input).trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  // Pode já ter sido passado só o ID.
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

// Extrai o nome da aba (?gid=) quando informado; senão usa a primeira aba.
function parseGid(input) {
  const match = String(input || '').match(/[?&#]gid=(\d+)/);
  return match ? match[1] : null;
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
    scopes: [SHEETS_SCOPE],
  });
  return cachedClient;
}

async function resolveSheetTitle(client, spreadsheetId, gid) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`;
  const res = await client.request({ url });
  const sheets = res.data?.sheets || [];
  if (sheets.length === 0) return null;
  if (gid != null) {
    const found = sheets.find(s => String(s.properties?.sheetId) === String(gid));
    if (found) return found.properties.title;
  }
  return sheets[0].properties?.title || null;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const spreadsheetId = parseSpreadsheetId(searchParams.get('url'));

  if (!spreadsheetId) {
    return NextResponse.json({ error: 'URL da planilha inválida.' }, { status: 400 });
  }

  const credentials = loadServiceAccount();
  if (!credentials?.client_email || !credentials?.private_key) {
    return NextResponse.json(
      { error: 'Integração com Google não configurada no servidor.' },
      { status: 503 },
    );
  }

  try {
    const client = getAuthClient(credentials);
    const gid = parseGid(searchParams.get('url'));
    const title = await resolveSheetTitle(client, spreadsheetId, gid);
    if (!title) {
      return NextResponse.json({ error: 'Planilha sem abas legíveis.' }, { status: 404 });
    }

    const range = encodeURIComponent(title);
    const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
    const res = await client.request({ url: valuesUrl });
    const values = res.data?.values || [];

    if (values.length === 0) {
      return NextResponse.json({ headers: [], rows: [], title });
    }

    // Espelho livre: 1ª linha = cabeçalho, demais = dados.
    const headers = values[0].map(h => String(h ?? '').trim());
    const colCount = headers.length;
    const rows = values.slice(1).map(row => {
      const cells = [];
      for (let i = 0; i < colCount; i++) cells.push(String(row[i] ?? ''));
      return cells;
    });

    return NextResponse.json({ headers, rows, title });
  } catch (error) {
    const status = error?.response?.status;
    if (status === 403) {
      return NextResponse.json(
        { error: 'Sem acesso à planilha. Compartilhe-a com o e-mail da conta de serviço.' },
        { status: 403 },
      );
    }
    if (status === 404) {
      return NextResponse.json({ error: 'Planilha não encontrada.' }, { status: 404 });
    }
    console.error('Erro ao ler Google Sheet:', error?.message || error);
    return NextResponse.json({ error: 'Falha ao ler a planilha.' }, { status: 500 });
  }
}
