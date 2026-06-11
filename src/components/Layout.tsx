// App chrome: a slim brand header and a disclaimer footer wrapped around every
// screen (loading, error, quiz, results).
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col">
      {/* Slim top accent bar (casebasix-style) */}
      <div className="h-1 bg-gradient-to-r from-brand-dark via-brand to-brand-light" />

      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
        {/* Full-bleed bar — logo flush left, nav flush right, like casebasix */}
        <div className="px-6 h-14 flex items-center justify-between">
          <a href="/" className="font-bold tracking-tight text-neutral-900 no-underline">
            Consulting <span className="text-brand">Personality</span> Practice
          </a>
          <nav className="text-sm font-medium text-neutral-500 flex gap-5">
            <a className="hover:text-brand" href="/?quiz-id=personality-test-1.yaml">Test 1</a>
            <a className="hover:text-brand" href="/?quiz-id=personality-test-2.yaml">Test 2</a>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-5 text-xs text-neutral-400">
          Independent practice tool. Not affiliated with or endorsed by Boston Consulting Group or
          SHL. Questions are original practice material modelled on the publicly described format.
        </div>
      </footer>
    </div>
  );
}
