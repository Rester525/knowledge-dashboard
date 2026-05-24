import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";
import { createCanvas } from "canvas";
import Tesseract from "tesseract.js";

// Pre-load the worker so pdfjs-dist's _setupFakeWorkerGlobal finds it via
// globalThis.pdfjsWorker, avoiding a dynamic import() that Turbopack can't resolve.
(globalThis as Record<string, unknown>).pdfjsWorker = pdfjsWorker;

// Set up pdfjs-dist to use node-canvas for server-side rendering
const CanvasFactory = {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d")!;
    return { canvas, context: ctx };
  },
  reset(ctx: unknown, width: number, height: number) {
    // No-op — canvas handles this internally
  },
  destroy() {},
};

export async function ocrPDF(buffer: Buffer): Promise<string> {
  const data = new Uint8Array(buffer);
  // @ts-expect-error — canvasFactory is valid at runtime but not in pdfjs-dist types
  const doc = await pdfjsLib.getDocument({ data, canvasFactory: CanvasFactory }).promise;

  const texts: string[] = [];
  const numPages = doc.numPages;

  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 }); // 2x for better OCR

    const { canvas } = CanvasFactory.create(viewport.width, viewport.height);
    const ctx = canvas.getContext("2d")!;

    await page.render({
      canvas: canvas as never,
      canvasContext: ctx as never,
      viewport,
    }).promise;

    // Convert canvas to PNG buffer
    const pngBuffer = canvas.toBuffer("image/png");

    // OCR the page
    const { data: ocrResult } = await Tesseract.recognize(pngBuffer, "eng");
    texts.push(ocrResult.text);
  }

  return texts.join("\n\n").trim();
}
