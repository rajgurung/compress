// Builds sample PDFs from the generated page images, embedding the JPEG bytes as-is.
import { readFileSync, writeFileSync } from "node:fs";
import { PDFDocument, StandardFonts } from "pdf-lib";

const dir = new URL("./samples/", import.meta.url);
// Every page is a distinct image, so tools that store repeated images once get no unfair edge.
const page = (i) => readFileSync(new URL(`pages/unique/p${String(i).padStart(3, "0")}.jpg`, dir));
const A4 = [595.28, 841.89];

async function scanPdf(name, pageCount) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    const img = await doc.embedJpg(page(i));
    doc.addPage(A4).drawImage(img, { x: 0, y: 0, width: A4[0], height: A4[1] });
  }
  const bytes = await doc.save();
  writeFileSync(new URL(name, dir), bytes);
  console.log(name, pageCount, "pages", (bytes.length / 1e6).toFixed(1), "MB");
}

async function textPdf(name, pageCount) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const line = "The tenant shall pay the rent monthly in advance and give written notice. ";
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage(A4);
    for (let y = 780; y > 60; y -= 16) page.drawText(line, { x: 60, y, size: 11, font });
  }
  const bytes = await doc.save();
  writeFileSync(new URL(name, dir), bytes);
  console.log(name, pageCount, "pages", (bytes.length / 1e6).toFixed(1), "MB");
}

await scanPdf("scan-20.pdf", 7);
await scanPdf("scan-100.pdf", 36);
await scanPdf("scan-300.pdf", 107);
await textPdf("text-only.pdf", 50);
