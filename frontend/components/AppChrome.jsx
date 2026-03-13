'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';
import Navbar from './Navbar';

export default function AppChrome({ children }) {
  const pathname = usePathname();
  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/onboarding')) {
    return <main>{children}</main>;
  }

  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
