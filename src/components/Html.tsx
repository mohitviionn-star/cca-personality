// Renders authored HTML coming from the YAML `text`/`explanation` fields.
// Content is author-controlled (loaded from the app's own /quizzes), not user
// input, so dangerouslySetInnerHTML is acceptable here.
export default function Html({ html, className = "" }: { html: string; className?: string }) {
  return <div className={`qhtml ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
