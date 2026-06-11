// Affiliation disclaimer, surfaced on the start and results screens (and the
// footer) to make the independent, unaffiliated nature clear and prominent.
export default function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs text-neutral-500 ${className}`}>
      Independent practice tool — <strong>not affiliated with or endorsed by Boston Consulting Group
      (BCG) or SHL</strong>. BCG, SHL, OPQ, and Consulting Career Assessment are trademarks of their
      respective owners, used here only to describe what this tool helps you practise for. All
      questions and interpretations are original practice material.
    </p>
  );
}
