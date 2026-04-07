import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { scanReceipt } from '@/lib/receiptOCR'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    // Verify authentication
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { imageUrl } = body

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid imageUrl' },
        { status: 400 }
      )
    }

    // Check if API key is configured
    if (!process.env.GOOGLE_CLOUD_VISION_API_KEY) {
      return NextResponse.json({
        success: false,
        message: 'Receipt scanning is not configured. Please enter details manually.',
        data: null,
      })
    }

    const result = await scanReceipt(imageUrl)

    if (!result) {
      return NextResponse.json({
        success: false,
        message: 'Could not read this receipt. Please enter details manually.',
        data: null,
      })
    }

    // Check if we actually extracted anything useful
    const hasData = result.vendor || result.amount || result.date || result.description
    if (!hasData) {
      return NextResponse.json({
        success: false,
        message: 'No text found on receipt. Please enter details manually.',
        data: null,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Receipt scanned successfully.',
      data: result,
    })
  } catch (error: any) {
    console.error('Receipt scan error:', error)
    return NextResponse.json({
      success: false,
      message: 'Receipt scan failed. Please enter details manually.',
      data: null,
    })
  }
}
