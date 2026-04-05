'use client';

import Image from 'next/image';
import { Menu } from 'lucide-react';

interface MobileHeaderProps {
  portalLabel?: string;
}

export function MobileHeader({ portalLabel = 'Employee Portal' }: MobileHeaderProps) {
  return (
    <header
      className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4"
      style={{
        height: 'var(--we-header-height)',
        background: 'var(--we-navy)',
      }}
    >
      <button
        onClick={() => document.dispatchEvent(new CustomEvent('we:open-sidebar'))}
        className="p-2 -ml-2 rounded-lg transition-colors"
        style={{ color: 'rgba(255, 255, 255, 0.7)' }}
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      <div className="flex items-center gap-2">
        <Image
          src="/WE-logo-SEPT2024v3-WHT.png"
          alt="West End Workforce"
          width={120}
          height={30}
          className="h-6 w-auto"
          priority
        />
      </div>

      <span
        className="text-[10px] font-medium uppercase tracking-wider"
        style={{ color: 'rgba(255, 255, 255, 0.4)' }}
      >
        {portalLabel.split(' ')[0]}
      </span>
    </header>
  );
}
