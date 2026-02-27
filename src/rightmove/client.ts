const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
]

const randUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function fetchWithRetry(
  url: string,
  opts?: { params?: Record<string, string>; referer?: string; accept?: string },
): Promise<string | null> {
  const fullUrl = opts?.params ? `${url}?${new URLSearchParams(opts.params)}` : url
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(fullUrl, {
        headers: {
          'User-Agent': randUA(),
          'Accept': opts?.accept ?? 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-GB,en;q=0.9',
          ...(opts?.referer ? { 'Referer': opts.referer } : {}),
        },
        signal: AbortSignal.timeout(15_000),
      })
      if (res.status === 429) { await sleep(2 ** (attempt + 1) * 1000); continue }
      if (res.status === 403) return null
      if (!res.ok) { await sleep(1000 * (attempt + 1)); continue }
      return res.text()
    } catch {
      await sleep(1000 * (attempt + 1))
    }
  }
  return null
}

export function rmFetch(url: string, params?: Record<string, string>) {
  return fetchWithRetry(url, { params, referer: 'https://www.rightmove.co.uk/' })
}
