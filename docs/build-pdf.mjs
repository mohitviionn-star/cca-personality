import { marked } from "marked";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const here = path.dirname(new URL(import.meta.url).pathname);
const docs = [
  { file: "REQUIREMENTS.md" },
  { file: "DESIGN.md" },
];

marked.setOptions({ gfm: true });

const sections = docs
  .map(({ file }) => {
    const md = readFileSync(path.join(here, file), "utf8");
    return `<section class="doc">${marked.parse(md)}</section>`;
  })
  .join('<div class="page-break"></div>');

const css = `
  @page { size: A4; margin: 18mm 16mm 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
    color: #1a2421; font-size: 10.5pt; line-height: 1.5; margin: 0;
  }
  .cover {
    height: 247mm; display: flex; flex-direction: column; justify-content: center;
    page-break-after: always;
  }
  .cover .eyebrow { text-transform: uppercase; letter-spacing: .18em; font-size: 10pt;
    color: #1ea672; font-weight: 700; }
  .cover h1 { font-size: 30pt; margin: 8px 0 4px; letter-spacing: -0.02em; }
  .cover .sub { font-size: 13pt; color: #5b6b66; }
  .cover .meta { margin-top: 28px; font-size: 10pt; color: #5b6b66; }
  .cover .rule { height: 4px; width: 64px; background: #1ea672; margin: 18px 0; border-radius: 2px; }
  .page-break { page-break-before: always; }
  h1 { font-size: 19pt; letter-spacing: -0.01em; border-bottom: 2px solid #1ea672;
    padding-bottom: 5px; margin: 0 0 12px; }
  h2 { font-size: 14pt; margin: 20px 0 8px; color: #0f3d2e; }
  h3 { font-size: 11.5pt; margin: 14px 0 5px; }
  h2, h3 { page-break-after: avoid; }
  p, li { orphans: 3; widows: 3; }
  a { color: #138a5e; text-decoration: none; }
  table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 9.5pt;
    page-break-inside: avoid; }
  th, td { border: 1px solid #cdd8d4; padding: 6px 9px; text-align: left; vertical-align: top; }
  th { background: #eef5f2; font-weight: 700; }
  code { background: #eef2f1; padding: 1px 5px; border-radius: 4px; font-size: 9pt;
    font-family: "SF Mono", "Menlo", monospace; }
  pre { background: #0e1413; color: #e7efec; padding: 12px 14px; border-radius: 8px;
    overflow-x: auto; font-size: 8.6pt; line-height: 1.45; page-break-inside: avoid; }
  pre code { background: none; color: inherit; padding: 0; }
  blockquote { border-left: 3px solid #1ea672; margin: 10px 0; padding: 2px 14px; color: #4a5a55; }
  hr { border: none; border-top: 1px solid #dce5e2; margin: 18px 0; }
  strong { color: #0f3d2e; }
  .doc { page-break-before: always; }
  .doc:first-of-type { page-break-before: avoid; }
`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head>
<body>
  <div class="cover">
    <div class="eyebrow">Consulting Personality Practice</div>
    <h1>Personality Test 1 &amp; 2</h1>
    <div class="sub">Requirements Specification &amp; High-Level Design</div>
    <div class="rule"></div>
    <div class="meta">
      Version 2.1 &nbsp;·&nbsp; 11 June 2026<br/>
      Standalone React + Vite, YAML-driven (Test 1 &amp; Test 2).<br/>
      Covers: requirements, architecture, schema, and scoring algorithms
      (forced-choice + Likert + multi-select, sten report, self-vs-others consistency).
    </div>
  </div>
  ${sections}
</body></html>`;

const htmlPath = path.join(here, "BCG-CCA-Prep-Docs.html");
const pdfPath = path.join(here, "BCG-CCA-Prep-Docs.pdf");
writeFileSync(htmlPath, html);
console.log("wrote", path.basename(htmlPath));

// Locate a Chrome/Chromium binary across platforms (env override wins).
function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  ];
  return candidates.find((p) => existsSync(p));
}

const chrome = findChrome();
if (!chrome) {
  console.error(
    "\nNo Chrome/Chromium found. The HTML was written; open it and print to PDF,\n" +
      "or set CHROME_PATH=/path/to/chrome and re-run `npm run docs:pdf`."
  );
  process.exit(0); // HTML still produced — don't fail the build
}

const res = spawnSync(
  chrome,
  [
    "--headless",
    "--disable-gpu",
    "--no-pdf-header-footer",
    `--print-to-pdf=${pdfPath}`,
    `file://${htmlPath}`,
  ],
  { stdio: ["ignore", "ignore", "ignore"] }
);

if (res.status === 0 && existsSync(pdfPath)) {
  console.log("wrote", path.basename(pdfPath));
} else {
  console.error("Chrome failed to produce the PDF (exit", res.status, ").");
  process.exit(1);
}
