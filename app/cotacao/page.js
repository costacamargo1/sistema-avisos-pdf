import { Suspense } from 'react';
import ClientApp from '../ClientApp';

export const dynamic = 'force-dynamic';

export default function CotacaoPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Carregando…</div>}>
      <ClientApp category="cotacao" pdfEnabled={false} panelLabel="Cotação" quadroHref="/quadro" />
    </Suspense>
  );
}
