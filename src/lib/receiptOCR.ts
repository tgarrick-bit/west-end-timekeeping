// src/lib/receiptOCR.ts
// Receipt OCR integration stub.
// Replace the implementation of scanReceipt() with a real OCR provider
// (Google Vision, AWS Textract, Azure Document Intelligence, etc.)
// when ready. The interface and API route are already wired up.

export interface ReceiptData {
  vendor?: string
  amount?: number
  date?: string
  description?: string
}

/**
 * Scan a receipt image and extract structured data.
 *
 * @param imageUrl - Public or signed URL to the receipt image
 * @returns Extracted receipt data, or null if scanning is unavailable
 */
export async function scanReceipt(imageUrl: string): Promise<ReceiptData | null> {
  // TODO: Integrate with OCR service (Google Vision, AWS Textract, etc.)
  //
  // Example implementation with Google Vision:
  //
  //   const vision = require('@google-cloud/vision');
  //   const client = new vision.ImageAnnotatorClient();
  //   const [result] = await client.textDetection(imageUrl);
  //   const text = result.textAnnotations?.[0]?.description || '';
  //   return parseReceiptText(text);
  //
  // For now, return null to indicate scanning is not available.
  return null
}
