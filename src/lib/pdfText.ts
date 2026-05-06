// Lightweight client-side PDF/text extractor
import * as pdfjsLib from "pdfjs-dist";
// Vite worker import
// @ts-ignore
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerSrc;

export async function extractFileText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || file.type.startsWith("text/")) {
    return (await file.text()).trim();
  }
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let out = "";
    const max = Math.min(pdf.numPages, 30);
    for (let i = 1; i <= max; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((it: any) => it.str).filter(Boolean);
      out += strings.join(" ") + "\n\n";
    }
    return out.replace(/\s+/g, " ").trim();
  }
  return "";
}

export function chunkIntoParagraphs(
  text: string,
  fallbackTitle = "Your notes",
  target = 4
): { title: string; paragraphs: string[] } {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return { title: fallbackTitle, paragraphs: [] };

  // Title: first sentence or first ~60 chars
  const firstStop = clean.search(/[.!?]\s/);
  let title = firstStop > 0 && firstStop < 80 ? clean.slice(0, firstStop).trim() : clean.slice(0, 60).trim();
  if (!title) title = fallbackTitle;

  // Split into sentences
  const sentences = clean.match(/[^.!?]+[.!?]+(\s|$)/g)?.map((s) => s.trim()).filter(Boolean) ?? [clean];

  const paragraphs: string[] = [];
  let cur = "";
  const maxWordsPerPara = Math.max(40, Math.ceil(clean.split(/\s+/).length / target));

  for (const s of sentences) {
    const tentative = cur ? cur + " " + s : s;
    if (tentative.split(/\s+/).length > maxWordsPerPara && cur) {
      paragraphs.push(cur);
      cur = s;
    } else {
      cur = tentative;
    }
  }
  if (cur) paragraphs.push(cur);

  // Cap to ~6 paragraphs to keep session focused
  const capped = paragraphs.slice(0, 6);
  return { title: title.replace(/[.!?]+$/, ""), paragraphs: capped.length ? capped : [clean] };
}
