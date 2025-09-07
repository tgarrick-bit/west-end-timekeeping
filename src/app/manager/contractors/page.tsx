// SERVER WRAPPER (no 'use client' here)
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import ContractorsIndexClient from './ClientPage';

export default function Page() {
  return <ContractorsIndexClient />;
}
