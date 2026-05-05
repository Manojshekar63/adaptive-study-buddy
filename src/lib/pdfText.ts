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
