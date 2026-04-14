import { NextRequest, NextResponse } from 'next/server'
import { fetchRepositoryStars } from '@/lib/github'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const owner = searchParams.get('owner') || 'Atharvsinh-codez'
    const repo = searchParams.get('repo') || 'portfolio'

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
  } catch {
    return NextResponse.json(
      {
        success: false,
        stars: 0,
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

