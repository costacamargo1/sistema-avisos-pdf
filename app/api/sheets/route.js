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

// Teto de linhas lidas com formatação (protege o payload em planilhas grandes).
const MAX_GRID_ROWS = 300;

// Só os campos de formatação que o painel usa — mantém a resposta enxuta.
const GRID_FIELDS = 'sheets(merges,data(columnMetadata(pixelSize),rowData(values(formattedValue,effectiveFormat(backgroundColor,horizontalAlignment,verticalAlignment,wrapStrategy,textFormat)))))';

// Índice 0 → "A", 25 → "Z", 26 → "AA".
function colLetter(index) {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

// Notação A1 com o nome da aba entre aspas (aspas internas são duplicadas).
function a1Range(title, ref) {
  return `'${String(title).replace(/'/g, "''")}'!${ref}`;
}

// Cor do Sheets ({red,green,blue} de 0 a 1) → hex. Canal ausente = 0.
function hexColor(color) {
  if (!color) return null;
  const channel = (v) => Math.round(Math.max(0, Math.min(1, Number(v) || 0)) * 255);
  return `#${[channel(color.red), channel(color.green), channel(color.blue)]
    .map(v => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

// Célula compacta: chaves curtas e só o que difere do padrão (payload menor).
// v=valor b=negrito i=itálico u=sublinhado s=riscado fs=corpo ff=fonte
// bg=fundo fg=cor do texto ha/va=alinhamento w=quebra de linha
function compactCell(cell) {
  const out = { v: cell?.formattedValue ?? '' };
  const format = cell?.effectiveFormat;
  if (!format) return out;

  const background = hexColor(format.backgroundColor);
  if (background && background !== '#ffffff') out.bg = background;

  const text = format.textFormat || {};
  const foreground = hexColor(text.foregroundColor);
  if (foreground && foreground !== '#000000') out.fg = foreground;
  if (text.bold) out.b = 1;
  if (text.italic) out.i = 1;
  if (text.underline) out.u = 1;
  if (text.strikethrough) out.s = 1;
  if (text.fontSize) out.fs = text.fontSize;
  if (text.fontFamily) out.ff = text.fontFamily;

  if (format.horizontalAlignment) out.ha = format.horizontalAlignment;
  if (format.verticalAlignment) out.va = format.verticalAlignment;
  if (format.wrapStrategy === 'WRAP') out.w = 1;
  return out;
}

// Lê a mesma faixa de dados novamente, agora com a formatação original da planilha.
// `skip` pula as linhas do topo que viraram título do quadro.
// Retorna null em qualquer falha: o painel simplesmente cai no estilo do projeto.
async function fetchGrid(client, spreadsheetId, title, rowCount, colCount, skip = 0) {
  try {
    const ref = `A${skip + 1}:${colLetter(colCount - 1)}${Math.min(rowCount, skip + MAX_GRID_ROWS)}`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`
      + `?includeGridData=true&ranges=${encodeURIComponent(a1Range(title, ref))}`
      + `&fields=${encodeURIComponent(GRID_FIELDS)}`;
    const res = await client.request({ url });

    const sheet = res.data?.sheets?.[0];
    const data = sheet?.data?.[0];
    if (!data) return null;

    const cells = (data.rowData || []).map(row => {
      const values = row?.values || [];
      const line = [];
      for (let i = 0; i < colCount; i++) line.push(compactCell(values[i]));
      return line;
    });

    const cols = [];
    for (let i = 0; i < colCount; i++) cols.push(data.columnMetadata?.[i]?.pixelSize || 100);

    // Merges vêm em coordenadas absolutas da aba; desloca pelas linhas puladas.
    const merges = (sheet.merges || [])
      .filter(m => m.startRowIndex >= skip && m.startRowIndex - skip < cells.length && m.startColumnIndex < colCount)
      .map(m => ({
        r: m.startRowIndex - skip,
        c: m.startColumnIndex,
        rs: Math.min(m.endRowIndex - skip, cells.length) - (m.startRowIndex - skip),
        cs: Math.min(m.endColumnIndex, colCount) - m.startColumnIndex,
      }))
      .filter(m => m.rs > 0 && m.cs > 0 && (m.rs > 1 || m.cs > 1));

    return { cols, merges, cells };
  } catch (error) {
    console.error('Erro ao ler formatação da planilha:', error?.message || error);
    return null;
  }
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
    // A API corta células vazias no fim de cada linha (ex.: título mesclado em
    // A1:G1 volta como 1 valor só), então a largura vem da linha mais longa.
    const colCount = values.reduce((max, row) => Math.max(max, row?.length || 0), 0);

    // Linha 1 com um único texto (título mesclado) seguida de uma linha com
    // vários campos: a linha 1 vira o título do quadro na TV (sheetTitle) e sai
    // da tabela nos dois modos; o cabeçalho real passa a ser a linha 2.
    const filled = (row) => (row || []).filter(v => String(v ?? '').trim()).length;
    const headerIndex = colCount > 1 && filled(values[0]) === 1 && filled(values[1]) > 1 ? 1 : 0;
    const sheetTitle = headerIndex === 1
      ? String(values[0].find(v => String(v ?? '').trim())).trim()
      : null;

    const headers = [];
    for (let i = 0; i < colCount; i++) headers.push(String(values[headerIndex][i] ?? '').trim());
    const rows = values.slice(headerIndex + 1).map(row => {
      const cells = [];
      for (let i = 0; i < colCount; i++) cells.push(String(row[i] ?? ''));
      return cells;
    });

    // A formatação original só é buscada sob demanda (?format=1) — é uma
    // requisição a mais e o estilo do projeto não precisa dela.
    const wantsFormat = searchParams.get('format') === '1';
    const grid = wantsFormat
      ? await fetchGrid(client, spreadsheetId, title, values.length, colCount, headerIndex)
      : null;

    const payload = { headers, rows, title };
    if (sheetTitle) payload.sheetTitle = sheetTitle;
    if (grid) payload.grid = grid;
    return NextResponse.json(payload);
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
