import { Suspense } from 'react';
import ClientApp from '../ClientApp';

export const dynamic = 'force-dynamic';

export default function ContratosPrivPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Carregando…</div>}>
      <ClientApp category="contratospriv" pdfEnabled={false} panelLabel="Contratos Privado" quadroHref="/quadro" />
    </Suspense>
  );
}
