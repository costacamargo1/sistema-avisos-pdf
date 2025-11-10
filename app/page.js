import { Suspense } from 'react';
import ClientApp from './ClientApp';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Carregando…</div>}>
      <ClientApp />
    </Suspense>
  );
}
