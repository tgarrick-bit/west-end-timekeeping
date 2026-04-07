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
    console.warn('[receiptOCR] GOOGLE_CLOUD_VISION_API_KEY not set — receipt scanning disabled')
    return null
  }

  console.log('[receiptOCR] Starting scan for:', imageUrl.substring(0, 80) + '...')

  // Fetch the image and convert to base64
  let imageResponse: Response
  try {
    imageResponse = await fetch(imageUrl)
  } catch (fetchErr: any) {
    console.error('[receiptOCR] Failed to fetch image URL:', fetchErr?.message)
    return null
  }

  if (!imageResponse.ok) {
    console.error('[receiptOCR] Image fetch returned', imageResponse.status, imageResponse.statusText)
    return null
  }

  const contentType = imageResponse.headers.get('content-type') || ''
  console.log('[receiptOCR] Image fetched, content-type:', contentType, 'size:', imageResponse.headers.get('content-length'))

  const imageBuffer = await imageResponse.arrayBuffer()
  if (imageBuffer.byteLength === 0) {
    console.error('[receiptOCR] Image buffer is empty')
    return null
  }

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
    console.error('[receiptOCR] Vision API HTTP error:', visionResponse.status, errorText.substring(0, 500))
    return null
  }

  const visionResult = await visionResponse.json()

  // Check for per-request errors
  const responseEntry = visionResult.responses?.[0]
  if (responseEntry?.error) {
    console.error('[receiptOCR] Vision API request error:', JSON.stringify(responseEntry.error))
    return null
  }

  const fullText = responseEntry?.textAnnotations?.[0]?.description || ''
  console.log('[receiptOCR] OCR text length:', fullText.length, 'preview:', fullText.substring(0, 200))

  if (!fullText.trim()) {
    console.warn('[receiptOCR] No text detected in image')
    return null
  }

  const parsed = parseReceiptText(fullText)
  console.log('[receiptOCR] Parsed result:', JSON.stringify(parsed))
  return parsed
}

/**
 * Parse raw OCR text from a receipt to extract structured fields.
 */
function parseReceiptText(text: string): ReceiptData {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const result: ReceiptData = {}

  // --- Vendor: usually the first non-empty line (store name) ---
  if (lines.length > 0) {
    // Skip lines that look like addresses, dates, or numbers
    const vendorLine = lines.find(l =>
      l.length > 2 &&
      !/^\d{1,2}[\/\-]/.test(l) &&
      !/^\d+\s+(st|nd|rd|th|ave|blvd)/i.test(l) &&
      !/^(tel|phone|fax)/i.test(l) &&
      !/^#?\d+$/.test(l)
    )
    if (vendorLine) {
      result.vendor = vendorLine.substring(0, 60)
    }
  }

  // --- Amount: look for total patterns ---
  // Search line by line for best "total" match
  let bestAmount: number | null = null

  for (const line of lines) {
    // Lines containing "total" (but not "subtotal")
    if (/\btotal\b/i.test(line) && !/sub\s*total/i.test(line)) {
      const amountMatch = line.match(/\$?\s*([\d,]+\.\d{2})/)
      if (amountMatch) {
        const val = parseFloat(amountMatch[1].replace(/,/g, ''))
        if (!isNaN(val) && val > 0 && (bestAmount === null || val > bestAmount)) {
          bestAmount = val
        }
      }
    }
  }

  // Fallback: look for "amount due", "balance due", etc.
  if (bestAmount === null) {
    const fallbackPatterns = [
      /(?:amount\s*due|balance\s*due|grand\s*total|please\s*pay)\s*:?\s*\$?\s*([\d,]+\.\d{2})/i,
    ]
    for (const pattern of fallbackPatterns) {
      const match = text.match(pattern)
      if (match) {
        const val = parseFloat(match[1].replace(/,/g, ''))
        if (!isNaN(val) && val > 0) {
          bestAmount = val
          break
        }
      }
    }
  }

  // Last resort: find the largest dollar amount on the receipt
  if (bestAmount === null) {
    const allAmounts = [...text.matchAll(/\$\s*([\d,]+\.\d{2})/g)]
    for (const match of allAmounts) {
      const val = parseFloat(match[1].replace(/,/g, ''))
      if (!isNaN(val) && val > 0 && (bestAmount === null || val > bestAmount)) {
        bestAmount = val
      }
    }
  }

  if (bestAmount !== null) {
    result.amount = bestAmount
  }

  // --- Date: look for date patterns ---
  const datePatterns = [
    // MM/DD/YYYY or MM-DD-YYYY or MM/DD/YY
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
    // Month DD, YYYY
    /(\w{3,9})\s+(\d{1,2}),?\s+(\d{4})/,
    // YYYY-MM-DD
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
  ]

  for (const pattern of datePatterns) {
    const match = text.match(pattern)
    if (match) {
      // For MM/DD/YYYY pattern
      if (match[3] && match[1] && match[2]) {
        let year = parseInt(match[3])
        const first = parseInt(match[1])
        const second = parseInt(match[2])

        if (year < 100) year += 2000

        // Determine if it's YYYY-MM-DD or MM/DD/YYYY
        let month: number, day: number
        if (first > 31) {
          // YYYY-MM-DD: first is year
          month = second
          day = parseInt(match[3])
          year = first
        } else if (first > 12) {
          // DD/MM/YYYY
          day = first
          month = second
        } else {
          // MM/DD/YYYY (US format, most common on US receipts)
          month = first
          day = second
        }

        if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2020 && year <= 2030) {
          result.date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          break
        }
      }

      // For "Month DD, YYYY" pattern
      try {
        const parsed = new Date(match[0])
        if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2020 && parsed.getFullYear() <= 2030) {
          result.date = parsed.toISOString().split('T')[0]
          break
        }
      } catch {
        // continue to next pattern
      }
    }
  }

  // --- Description: grab a few descriptive item lines ---
  const itemLines = lines.filter(l =>
    l.length > 3 &&
    l !== result.vendor &&
    !/^(total|subtotal|tax|tip|change|cash|credit|debit|visa|mastercard|amex|balance|thank|have a)/i.test(l) &&
    !/^\$/.test(l) &&
    !/^(tel|phone|fax|www\.|http)/i.test(l) &&
    !/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(l) &&
    !/^#?\d+$/.test(l)
  ).slice(1, 4)

  if (itemLines.length > 0) {
    result.description = itemLines.join(', ').substring(0, 200)
  }

  return result
}
