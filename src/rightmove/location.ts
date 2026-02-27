import type { LocationMatch } from './types.js'
import { fetchWithRetry } from './client.js'

const TYPEAHEAD_URL = 'https://los.rightmove.co.uk/typeahead'

export async function resolveLocation(query: string): Promise<LocationMatch[]> {
  const body = await fetchWithRetry(TYPEAHEAD_URL, {
    params: { query, limit: '10' },
    accept: 'application/json',
  })
  if (!body) return []

  try {
    const data = JSON.parse(body) as Record<string, unknown>

    // The API returns { matches: [...] }
    const matches = data.matches
    if (!Array.isArray(matches)) return []

    return matches
      .filter((m: Record<string, unknown>) => m.id && m.type)
      .map((m: Record<string, unknown>) => ({
        displayName: String(m.displayName ?? query),
        locationIdentifier: `${String(m.type)}^${String(m.id)}`,
        normalisedSearchTerm: String(m.displayName ?? ''),
      }))
  } catch {
    return []
  }
}
