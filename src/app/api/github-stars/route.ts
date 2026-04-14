import { NextRequest, NextResponse } from 'next/server'
import { fetchRepositoryStars } from '@/lib/github'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const owner = searchParams.get('owner') || process.env.GITHUB_REPO_OWNER || 'sumandey7684'
    const repo = searchParams.get('repo') || process.env.GITHUB_REPO_NAME || 'portfolio2026'

    const stars = await fetchRepositoryStars(owner, repo)

    if (typeof stars !== 'number' || Number.isNaN(stars) || stars < 0) {
      throw new Error('Invalid stars value')
    }

    return NextResponse.json(
      {
        success: true,
        stars,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )
  } catch (error) {
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

