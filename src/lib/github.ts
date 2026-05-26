import { Octokit } from '@octokit/rest'

const token = process.env.GITHUB_TOKEN
const hasToken = typeof token === 'string' && token.length > 0

const octokit = hasToken
  ? new Octokit({
      auth: token,
    })
  : null

export interface GitHubPullRequest {
  id: number
  number: number
  title: string
  body: string | null
  html_url: string
  state: 'open' | 'closed'
  created_at: string
  updated_at: string
  closed_at: string | null
  merged_at: string | null
  user: {
    login: string
    avatar_url: string
    html_url: string
  }
  head: {
    ref: string
    repo: {
      name: string
      full_name: string
      owner: {
        login: string
      }
    }
  }
  base: {
    ref: string
    repo: {
      name: string
      full_name: string
      owner: {
        login: string
      }
    }
  }
}

export interface ProcessedContribution {
  title: string
  description: string
  repository: string
  link: string
  date: string
  type: 'feature' | 'fix' | 'perf' | 'docs' | 'refactor' | 'test' | 'chore'
  state: 'open' | 'closed' | 'merged'
}

// Extract PR type from title (conventional commits)
function extractPRType(title: string): ProcessedContribution['type'] {
  const lowerTitle = title.toLowerCase()
  
  if (lowerTitle.startsWith('feat')) return 'feature'
  if (lowerTitle.startsWith('fix')) return 'fix'
  if (lowerTitle.startsWith('perf')) return 'perf'
  if (lowerTitle.startsWith('docs')) return 'docs'
  if (lowerTitle.startsWith('refactor')) return 'refactor'
  if (lowerTitle.startsWith('test')) return 'test'
  if (lowerTitle.startsWith('chore')) return 'chore'
  
  return 'feature' // default
}


// Format date to year
function formatDate(dateString: string): string {
  return new Date(dateString).getFullYear().toString()
}


export async function fetchUserPullRequests(username: string, limit: number = 50): Promise<ProcessedContribution[]> {
  if (!token) {
    return []
  }

  try {
    // Try the merged search first using advanced search
    const { data } = await octokit.request('GET /search/issues', {
      q: `is:pr author:${username} is:merged`,
      sort: 'updated',
      order: 'desc',
      per_page: limit,
      advanced_search: 'true',
    })
    
    // If no merged PRs found, try finding closed PRs that might be merged
    if (data.total_count === 0) {
      const { data: closedData } = await octokit.request('GET /search/issues', {
        q: `is:pr author:${username} is:closed`,
        sort: 'updated',
        order: 'desc',
        per_page: limit,
        advanced_search: 'true',
      })
      
      // Filter for actually merged PRs from the closed results
      const mergedPRs = closedData.items.filter((item: unknown) => {
        const pr = item as { pull_request?: { merged_at: string | null } }
        return pr.pull_request?.merged_at
      })
      
      const pullRequests = mergedPRs as unknown as GitHubPullRequest[]
      
    const contributions = pullRequests
      .filter(pr => {
        // Extract repository owner from the URL to filter out self repos
        const repoUrl = pr.html_url
        const repoMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull/)
        const repoOwner = repoMatch ? repoMatch[1] : 'unknown'
        
        // Only include PRs from other repositories (not your own)
        return repoOwner !== username
      })
      .map(pr => {
        // Extract repository name from the URL since the search API doesn't include full repo info
        const repoUrl = pr.html_url
        const repoMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull/)
        const repository = repoMatch ? repoMatch[1] : 'unknown'
        
        return {
          title: pr.title,
          description: `Contributed to ${repository}`,
          repository: repository,
          link: pr.html_url,
          date: formatDate(pr.merged_at || pr.created_at),
          type: extractPRType(pr.title),
          state: 'merged' as const,
        }
      })

      return contributions
    }
    
    const pullRequests = data.items as unknown as GitHubPullRequest[]
    
    const contributions = pullRequests
      .filter(pr => {
        // Extract repository owner from the URL to filter out self repos
        const repoUrl = pr.html_url
        const repoMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull/)
        const repoOwner = repoMatch ? repoMatch[1] : 'unknown'
        
        // Only include PRs from other repositories (not your own)
        return repoOwner !== username
      })
      .map(pr => {
        // Extract repository name from the URL since the search API doesn't include full repo info
        const repoUrl = pr.html_url
        const repoMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull/)
        const repository = repoMatch ? repoMatch[1] : 'unknown'
        
        return {
          title: pr.title,
          description: `Contributed to ${repository}`,
          repository: repository, // Only show company/org name
          link: pr.html_url,
          date: formatDate(pr.merged_at || pr.created_at), // Use merged date if available
          type: extractPRType(pr.title),
          state: 'merged' as const,
        }
      })
    
    return contributions
  } catch {
    return []
  }
}

type GitHubRateLimit = {
  limit?: number
  remaining?: number
  reset?: number
}

type GitHubStarsResult =
  | { ok: true; stars: number; source: 'octokit' | 'rest' }
  | { ok: false; status: number; message: string; rateLimit?: GitHubRateLimit }

function parseRateLimit(headers: Headers): GitHubRateLimit {
  const limit = Number(headers.get('x-ratelimit-limit') ?? '')
  const remaining = Number(headers.get('x-ratelimit-remaining') ?? '')
  const reset = Number(headers.get('x-ratelimit-reset') ?? '')

  return {
    limit: Number.isNaN(limit) ? undefined : limit,
    remaining: Number.isNaN(remaining) ? undefined : remaining,
    reset: Number.isNaN(reset) ? undefined : reset,
  }
}

function normalizeRepoParts(owner: string, repo: string): { owner: string; repo: string } | null {
  const normalizedOwner = owner?.trim()
  const normalizedRepo = repo?.trim()

  if (!normalizedOwner || !normalizedRepo) {
    return null
  }

  return { owner: normalizedOwner, repo: normalizedRepo }
}

export async function fetchRepositoryStars(owner: string, repo: string): Promise<GitHubStarsResult> {
  const normalized = normalizeRepoParts(owner, repo)
  if (!normalized) {
    return { ok: false, status: 400, message: 'Owner and repo are required' }
  }

  if (octokit) {
    try {
      const { data } = await octokit.repos.get({
        owner: normalized.owner,
        repo: normalized.repo,
      })

      if (typeof data.stargazers_count !== 'number') {
        return { ok: false, status: 502, message: 'Invalid stargazers_count from GitHub' }
      }

      return { ok: true, stars: data.stargazers_count, source: 'octokit' }
    } catch (error) {
      const status = typeof (error as { status?: unknown })?.status === 'number'
        ? (error as { status: number }).status
        : 500

      const message = typeof (error as { message?: unknown })?.message === 'string'
        ? (error as { message: string }).message
        : 'GitHub API request failed'

      if (status === 401 || status === 403 || status === 404) {
        // Fall through to REST API for public repo access or clearer errors.
      } else if (status >= 500) {
        // Fall through to REST API as a recovery path.
      } else {
        return { ok: false, status, message }
      }
    }
  }

  const response = await fetch(`https://api.github.com/repos/${normalized.owner}/${normalized.repo}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      ...(hasToken ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    let message = `GitHub API failed with status ${response.status}`
    try {
      const data = (await response.json()) as { message?: unknown }
      if (typeof data.message === 'string' && data.message.length > 0) {
        message = data.message
      }
    } catch {
      // Ignore JSON parse errors; fall back to generic message.
    }

    return {
      ok: false,
      status: response.status,
      message,
      rateLimit: parseRateLimit(response.headers),
    }
  }

  const data = (await response.json()) as { stargazers_count?: unknown }
  if (typeof data.stargazers_count !== 'number') {
    return { ok: false, status: 502, message: 'Invalid stargazers_count from GitHub' }
  }

  return { ok: true, stars: data.stargazers_count, source: 'rest' }
}

// Fallback data in case API fails
export const fallbackContributions: ProcessedContribution[] = [
  {
    title: "feat(mem0): add complete mcp server with mem0 API integration",
    description: "Added mem0 MCP integration to the Klavis AI ecosystem, contributing to tools that other developers actually use.",
    repository: "Klavis-AI",
    link: "https://github.com/Klavis-AI/klavis/pull/251",
    date: "2025",
    type: "feature",
    state: "merged"
  },
  {
    title: "feat: add express.js support to CLI",
    description: "Added express.js support to the billingsdk CLI, contributing to tools that other developers actually use.",
    repository: "dodopayments",
    link: "https://github.com/dodopayments/billingsdk/pull/103",
    date: "2025",
    type: "feature",
    state: "merged"
  },
  {
    title: "feat: interactive component playground",
    description: "Added an interactive component playground to the Dodopayments billingsdk.",
    repository: "dodopayments",
    link: "https://github.com/dodopayments/billingsdk/pull/96",
    date: "2025",
    type: "feature",
    state: "merged"
  }
]
