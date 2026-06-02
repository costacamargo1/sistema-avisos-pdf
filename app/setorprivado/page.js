import { Suspense } from 'react';
import ClientApp from '../ClientApp';

export const dynamic = 'force-dynamic';

export default function SetorPrivadoPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Carregando…</div>}>
      <ClientApp category="setorprivado" pdfEnabled={false} panelLabel="Setor Privado" quadroHref="/quadro" />
    </Suspense>
  );
}
