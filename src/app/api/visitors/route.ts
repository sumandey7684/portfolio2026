import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { trackVisit, generateVisitorId, getVisitorStats } from '@/lib/visitors'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 30
const requestLog = new Map<string, { count: number; windowStart: number }>()

function getClientIP(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  return realIP || null
}

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const existing = requestLog.get(key)

  if (!existing || now - existing.windowStart >= RATE_LIMIT_WINDOW_MS) {
    requestLog.set(key, { count: 1, windowStart: now })
    return false
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true
  }

  existing.count += 1
  requestLog.set(key, existing)
  return false
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const fingerprint = body.fingerprint as string | undefined
    
    const headersList = await headers()
    const userAgent = headersList.get('user-agent')
    const ip = getClientIP(request)

    const rateLimitKey = `${ip || 'unknown'}:${userAgent || 'unknown'}`
    if (isRateLimited(rateLimitKey)) {
      return NextResponse.json({
        success: false,
        uniqueVisitors: 0,
        error: 'Too many requests'
      }, { status: 429 })
    }

    if (typeof fingerprint !== 'undefined' && (typeof fingerprint !== 'string' || fingerprint.length > 128)) {
      return NextResponse.json({
        success: false,
        uniqueVisitors: 0,
        error: 'Invalid fingerprint'
      }, { status: 400 })
    }
    
    const visitorId = generateVisitorId(ip, userAgent, fingerprint)
    const data = await trackVisit(visitorId)
    
    return NextResponse.json({
      success: true,
      uniqueVisitors: data.uniqueVisitors
    })
  } catch (error) {
    console.error('Error tracking visitor:', error)
    
    try {
      const stats = await getVisitorStats()
      return NextResponse.json({
        success: true,
        ...stats
      })
    } catch {
      return NextResponse.json({
        success: false,
        uniqueVisitors: 0,
        error: 'Failed to track visitor'
      }, { status: 500 })
    }
  }
}

export async function GET() {
  try {
    const stats = await getVisitorStats()
    return NextResponse.json({
      success: true,
      ...stats
    })
  } catch {
    return NextResponse.json({
      success: false,
      uniqueVisitors: 0,
      error: 'Failed to get visitor stats'
    }, { status: 500 })
  }
}

