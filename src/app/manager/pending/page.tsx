// SERVER WRAPPER (do not add 'use client' here)
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import PendingIndexClient from './ClientPage';

export default function Page() {
  return <PendingIndexClient />;
}
