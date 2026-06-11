// App chrome: a slim brand header and a disclaimer footer wrapped around every
// screen (loading, error, quiz, results).
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/85 backdrop-blur">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <a href="/" className="font-bold tracking-tight text-neutral-900 no-underline">
            Consulting <span className="text-brand">Personality</span> Practice
          </a>
          <nav className="text-sm text-neutral-500 flex gap-4">
            <a className="hover:text-brand" href="/?quiz-id=personality-test-1.yaml">Test 1</a>
            <a className="hover:text-brand" href="/?quiz-id=personality-test-2.yaml">Test 2</a>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-neutral-200 bg-white">
        <div className="max-w-2xl mx-auto px-5 py-5 text-xs text-neutral-400">
          Independent practice tool. Not affiliated with or endorsed by Boston Consulting Group or
          SHL. Questions are original practice material modelled on the publicly described format.
        </div>
      </footer>
    </div>
  );
}
