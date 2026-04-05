import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

const PDF_MIME = 'application/pdf';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const DOC_MIME = 'application/msword';

/**
 * Extracts plain text from a PDF or DOCX/DOC buffer.
 * Throws if the MIME type is unsupported or extraction fails.
 */
export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === PDF_MIME) {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    await parser.destroy();
    return result.text ?? '';
  }

  if (mimeType === DOCX_MIME || mimeType === DOC_MIME) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value ?? '';
  }

  throw new Error(`Unsupported document MIME type for text extraction: ${mimeType}`);
}
