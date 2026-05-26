import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const CACHE_TTL_MS = 1000 * 60 * 10
const cache = new Map<string, { updatedAt: number; calendar: Record<string, number> }>()

const query = `
  query userProfileCalendar($username: String!, $year: Int) {
    matchedUser(username: $username) {
      userCalendar(year: $year) {
        submissionCalendar
      }
    }
  }
`

async function fetchCalendar(username: string, year: number) {
  const response = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Referer: 'https://leetcode.com',
    },
    body: JSON.stringify({
      query,
      variables: { username, year },
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`LeetCode API failed with status ${response.status}`)
  }

  const payload = (await response.json()) as {
    data?: {
      matchedUser?: {
        userCalendar?: {
          submissionCalendar?: string
        }
      }
    }
    errors?: Array<{ message?: string }>
  }

  if (payload.errors && payload.errors.length > 0) {
    const message = payload.errors[0]?.message || 'LeetCode API error'
    throw new Error(message)
  }

  const submissionCalendar = payload.data?.matchedUser?.userCalendar?.submissionCalendar
  if (typeof submissionCalendar !== 'string') {
    return null
  }

  const parsed = JSON.parse(submissionCalendar) as Record<string, number>
  return parsed
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username') || 'suman_dey'
    const yearParam = searchParams.get('year')
    const parsedYear = yearParam ? Number(yearParam) : null
    const year = parsedYear && Number.isFinite(parsedYear) ? parsedYear : null
    const cacheKey = `${username}:${year ?? 'last12'}`

    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.updatedAt < CACHE_TTL_MS) {
      return NextResponse.json(
        {
          success: true,
          calendar: cached.calendar,
          source: 'cache',
        },
        {
          headers: {
            'Cache-Control': 'no-store, max-age=0',
          },
        }
      )
    }

    const currentYear = new Date().getFullYear()
    const targetYear = year ?? currentYear
    const fetchYears = year ? [targetYear] : [currentYear, currentYear - 1]

    const results = await Promise.all(fetchYears.map((target) => fetchCalendar(username, target)))
    const calendarByYear = results.filter((calendar) => Boolean(calendar)) as Record<string, number>[]

    if (calendarByYear.length === 0) {
      return NextResponse.json(
        {
          success: false,
          calendar: {},
          error: 'LeetCode user not found',
        },
        {
          status: 404,
          headers: {
            'Cache-Control': 'no-store, max-age=0',
          },
        }
      )
    }

    const merged = calendarByYear.reduce<Record<string, number>>((acc, item) => {
      Object.assign(acc, item)
      return acc
    }, {})

    cache.set(cacheKey, { updatedAt: Date.now(), calendar: merged })

    return NextResponse.json(
      {
        success: true,
        calendar: merged,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )
  } catch (error) {
    console.error('[leetcode-activity] failed to fetch', error)

    return NextResponse.json(
      {
        success: false,
        calendar: {},
        error: error instanceof Error ? error.message : 'Failed to fetch LeetCode activity',
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
