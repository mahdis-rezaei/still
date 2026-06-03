// Pull plain text out of richer document formats *in the browser*, so the
// import API contract stays "rawText in" — no binary upload, nothing new for the
// server to decrypt or store. The heavy parsers (pdf.js, mammoth) live in this
// module on purpose: import.tsx loads it with a dynamic import() only when
// someone actually picks a PDF or .docx, so Vite code-splits them out of the
// main bundle.
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import * as mammoth from "mammoth/mammoth.browser";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

async function fromPdf(file: File): Promise<string> {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const line = content.items
      .map((it) => ("str" in it ? it.str : ""))
      .join(" ")
      .replace(/[ \t]+/g, " ")
      .trim();
    pages.push(line);
  }
  // Blank pages between blocks help the importer split entries.
  return pages.filter(Boolean).join("\n\n");
}

async function fromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

// Returns extracted plain text. Throws a friendly Error if the format can't be
// read as text (e.g. a scanned PDF with no text layer, or an old binary .doc).
export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  let text: string;
  if (name.endsWith(".pdf")) {
    text = await fromPdf(file);
  } else if (name.endsWith(".docx")) {
    text = await fromDocx(file);
  } else {
    text = await file.text();
  }
  if (!text.trim()) {
    throw new Error(
      "Couldn't find any text in that file. If it's a scanned image or photo, try pasting the words instead.",
    );
  }
  return text;
}
