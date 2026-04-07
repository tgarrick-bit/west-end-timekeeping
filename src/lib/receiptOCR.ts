// src/lib/receiptOCR.ts
// Receipt OCR via Google Cloud Vision API (REST, API key auth).
// Free tier: 1,000 images/month, then $1.50/1,000.

export interface ReceiptData {
  vendor?: string
  amount?: number
  date?: string
  description?: string
  category?: string
}

/**
 * Scan a receipt image and extract structured data using Google Cloud Vision OCR.
 *
 * @param imageUrl - Public URL to the receipt image
 * @returns Extracted receipt data, or null if scanning is unavailable
 */
export async function scanReceipt(imageUrl: string): Promise<ReceiptData | null> {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY
  if (!apiKey) {
    console.warn('GOOGLE_CLOUD_VISION_API_KEY not set — receipt scanning disabled')
    return null
  }

  // Fetch the image and convert to base64
  const imageResponse = await fetch(imageUrl)
  if (!imageResponse.ok) {
    console.error('Failed to fetch receipt image:', imageResponse.statusText)
    return null
  }

  const imageBuffer = await imageResponse.arrayBuffer()
  const base64Image = Buffer.from(imageBuffer).toString('base64')

  // Call Google Cloud Vision TEXT_DETECTION
  const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`
  const visionResponse = await fetch(visionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        image: { content: base64Image },
        features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
      }],
    }),
  })

  if (!visionResponse.ok) {
    const errorText = await visionResponse.text()
    console.error('Google Vision API error:', errorText)
    return null
  }

  const visionResult = await visionResponse.json()
  const fullText = visionResult.responses?.[0]?.textAnnotations?.[0]?.description || ''

  if (!fullText.trim()) {
    return null
  }

  return parseReceiptText(fullText)
}

/**
 * Parse raw OCR text from a receipt to extract structured fields.
 */
function parseReceiptText(text: string): ReceiptData {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const result: ReceiptData = {}

  // --- Vendor: usually the first non-empty line (store name) ---
  if (lines.length > 0) {
    // Skip lines that look like addresses or dates for vendor
    const vendorLine = lines.find(l =>
      l.length > 2 &&
      !/^\d{1,2}[\/\-]/.test(l) &&       // not a date
      !/^\d+\s+(st|nd|rd|th|ave|blvd)/i.test(l) && // not an address
      !/^(tel|phone|fax)/i.test(l)
    )
    if (vendorLine) {
      result.vendor = vendorLine.substring(0, 60)
    }
  }

  // --- Amount: look for total patterns ---
  const totalPatterns = [
    /(?:total|amount\s*due|balance\s*due|grand\s*total|amount)\s*:?\s*\$?\s*([\d,]+\.?\d{0,2})/i,
    /\$\s*([\d,]+\.\d{2})\s*$/m,
  ]

  let bestAmount: number | null = null
  for (const pattern of totalPatterns) {
    const matches = text.match(new RegExp(pattern, 'gi'))
    if (matches) {
      for (const match of matches) {
        const numMatch = match.match(/([\d,]+\.?\d{0,2})\s*$/)
        if (numMatch) {
          const val = parseFloat(numMatch[1].replace(/,/g, ''))
          // Take the largest amount (usually the total, not subtotal)
          if (!isNaN(val) && val > 0 && (bestAmount === null || val > bestAmount)) {
            bestAmount = val
          }
        }
      }
    }
  }
  if (bestAmount !== null) {
    result.amount = bestAmount
  }

  // --- Date: look for date patterns ---
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,       // MM/DD/YYYY or MM-DD-YYYY
    /(\w{3,9})\s+(\d{1,2}),?\s+(\d{4})/,              // Month DD, YYYY
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,          // YYYY-MM-DD
  ]

  for (const pattern of datePatterns) {
    const match = text.match(pattern)
    if (match) {
      try {
        const parsed = new Date(match[0])
        if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2020 && parsed.getFullYear() <= 2030) {
          result.date = parsed.toISOString().split('T')[0]
          break
        }
      } catch {
        // Try manual parsing for MM/DD/YYYY
        if (match[3] && match[1] && match[2]) {
          let year = parseInt(match[3])
          if (year < 100) year += 2000
          const month = parseInt(match[1])
          const day = parseInt(match[2])
          if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2020) {
            result.date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            break
          }
        }
      }
    }
  }

  // --- Description: grab a few descriptive item lines ---
  const itemLines = lines.filter(l =>
    l.length > 3 &&
    l !== result.vendor &&
    !/^(total|subtotal|tax|tip|change|cash|credit|debit|visa|mastercard|amex|balance)/i.test(l) &&
    !/^\$/.test(l) &&
    !/^(tel|phone|fax|www\.|http)/i.test(l) &&
    !/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(l)
  ).slice(1, 4) // skip vendor (first), take up to 3 item lines

  if (itemLines.length > 0) {
    result.description = itemLines.join(', ').substring(0, 200)
  }

  return result
}
