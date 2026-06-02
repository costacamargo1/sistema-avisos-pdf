'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, LayoutTemplate, FileText, Building2 } from 'lucide-react';

const OPTIONS = [
  {
    href: '/quadro/pregao',
    title: 'AVISOS\nPREGÃO\nELETRÔNICO',
    icon: FileText,
  },
  {
    href: '/quadro/cotacao',
    title: 'AVISOS\nCOTAÇÃO',
    icon: LayoutTemplate,
  },
  {
    href: '/quadro/setorprivado',
    title: 'AVISOS\nSETOR\nPRIVADO',
    icon: Building2,
  },
];

export default function QuadroSelectPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="h-[52px] bg-white border-b border-gray-100 px-5 flex items-center gap-3 sticky top-0 z-50 flex-shrink-0">
        <Link href="/" className="w-7 h-7 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <span className="text-[14px] font-medium tracking-tight text-gray-900">Gerenciador de Avisos</span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <h1 className="text-[22px] font-semibold tracking-tight text-gray-900 mb-1">Selecione o quadro</h1>
        <p className="text-[13px] text-gray-500 mb-10">Escolha qual painel de avisos deseja gerenciar.</p>

        <div className="flex flex-wrap items-stretch justify-center gap-8">
          {OPTIONS.map(({ href, title, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group w-[260px] h-[220px] rounded-2xl border-2 border-red-500 bg-white flex flex-col items-center justify-center gap-4 text-red-600 transition-all duration-150 hover:bg-red-50 hover:shadow-lg hover:-translate-y-0.5"
            >
              <Icon className="w-10 h-10 opacity-80 group-hover:opacity-100 transition-opacity" />
              <span className="text-[22px] font-medium text-center leading-snug whitespace-pre-line">
                {title}
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
