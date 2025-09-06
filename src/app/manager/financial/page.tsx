// SERVER COMPONENT
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import FinancialClient from './ClientPage';

export default function Page() {
  return <FinancialClient />;
}
