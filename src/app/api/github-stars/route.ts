import { NextRequest, NextResponse } from 'next/server'
import { fetchRepositoryStars } from '@/lib/github'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const owner = searchParams.get('owner') || 'sumandey7684'
    const repo = searchParams.get('repo') || 'portfolio2026'

    const result = await fetchRepositoryStars(owner, repo)

    if (result.ok) {
      return NextResponse.json(
        {
          success: true,
          stars: result.stars,
          source: result.source,
        },
        {
          headers: {
            'Cache-Control': 'no-store, max-age=0',
          },
        }
      )
    }

    const rateLimit = result.rateLimit
    const isRateLimited = result.status === 403 && rateLimit?.remaining === 0
    const status = result.status === 0 ? 500 : result.status

    console.error('[github-stars] upstream failure', {
      owner,
      repo,
      status,
      message: result.message,
      rateLimit,
    })

    return NextResponse.json(
      {
        success: false,
        stars: 0,
        error: isRateLimited ? 'GitHub API rate limit exceeded' : result.message,
        status,
        rateLimit,
      },
      {
        status: isRateLimited ? 429 : status,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )
  } catch (error) {
    console.error('[github-stars] unhandled error', error)
    return NextResponse.json(
      {
        success: false,
        stars: 0,
        error: error instanceof Error ? error.message : 'Failed to fetch repository stars',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )
  }
}

