import Head from 'next/head';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <div className="min-h-screen">
      <Head>
        <title>SynapEscrow – Autonomous AI Escrow Platform</title>
        <meta
          name="description"
          content="SynapEscrow is an autonomous AI escrow platform for freelance project workflows, milestone verification, and intelligent payment release."
        />
      </Head>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Component {...pageProps} />
      </main>
      <Footer />
    </div>
  );
}
