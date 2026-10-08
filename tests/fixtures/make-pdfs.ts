// Builds the PDF fixtures. Run with: npx vite-node tests/fixtures/make-pdfs.ts
import { readFileSync, writeFileSync } from "node:fs";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { nodeGs } from "../helpers/gs";

const here = (name: string) => new URL(name, import.meta.url);
const A4: [number, number] = [595.28, 841.89];

const scan = await PDFDocument.create();
for (const name of ["page-a.jpg", "page-b.jpg"]) {
  const image = await scan.embedJpg(readFileSync(here(name)));
  scan.addPage(A4).drawImage(image, { x: 0, y: 0, width: A4[0], height: A4[1] });
}
const scanBytes = await scan.save();
writeFileSync(here("scan.pdf"), scanBytes);

const text = await PDFDocument.create();
const font = await text.embedFont(StandardFonts.TimesRoman);
for (let p = 0; p < 3; p++) {
  const page = text.addPage(A4);
  for (let y = 780; y > 60; y -= 16) page.drawText("The tenant shall pay the rent monthly in advance.", { x: 60, y, size: 11, font });
}
writeFileSync(here("text-only.pdf"), await text.save());

// A copy of the scan that needs a password to open.
const gs = await nodeGs({ stdout: () => {}, stderr: () => {} });
gs.FS.writeFile("/in.pdf", scanBytes);
gs.callMain(["-sDEVICE=pdfwrite", "-dNOPAUSE", "-dBATCH", "-dQUIET", "-sOwnerPassword=owner", "-sUserPassword=open-sesame", "-sOutputFile=/out.pdf", "/in.pdf"]);
writeFileSync(here("locked.pdf"), gs.FS.readFile("/out.pdf"));
console.log("wrote scan.pdf, text-only.pdf, locked.pdf");
