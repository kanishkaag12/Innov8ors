import Link from 'next/link';

const footerLinks = [
  { href: '/', label: 'Home' },
  { href: '/dashboard/employer', label: 'Employer Dashboard' },
  { href: '/dashboard/freelancer', label: 'Freelancer Dashboard' },
  { href: '/dashboard/escrow', label: 'Escrow Dashboard' },
  { href: 'https://github.com', label: 'GitHub', external: true }
];

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-slate-950 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.4fr_1fr] md:items-start">
        <div className="max-w-xl space-y-3">
          <h2 className="text-2xl font-bold tracking-tight text-white">SynapEscrow</h2>
          <p className="text-sm leading-6 text-slate-300 sm:text-base">
            AI-powered freelance escrow platform that verifies work and releases payments automatically.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            Quick Links
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {footerLinks.map((link) => {
              const className =
                'inline-flex w-fit rounded-lg px-2 py-1 text-sm text-slate-200 transition-colors duration-200 hover:bg-emerald-500/10 hover:text-emerald-300';

              if (link.external) {
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className={className}
                  >
                    {link.label}
                  </a>
                );
              }

              return (
                <Link key={link.href} href={link.href} className={className}>
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}
