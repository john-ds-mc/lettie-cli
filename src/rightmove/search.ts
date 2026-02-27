import type { SearchResult } from './types.js'
import { rmFetch } from './client.js'
import { toInt, parsePrice, absoluteUrl, extractNextData } from './parse.js'

const SEARCH_PAGE_URL = 'https://www.rightmove.co.uk/property-to-rent/find.html'
const SEARCH_BUY_URL = 'https://www.rightmove.co.uk/property-for-sale/find.html'
const SEARCH_API_URL = 'https://www.rightmove.co.uk/api/_search'

export type SearchOptions = {
  locationIdentifier: string
  channel: 'RENT' | 'BUY'
  minPrice?: number
  maxPrice?: number
  minBedrooms?: number
  maxBedrooms?: number
  sortType?: string // 6=newest, 1=price-asc, 10=price-desc, 2=oldest
  index?: number
  pageSize?: number
}

const SORT_MAP: Record<string, string> = {
  newest: '6',
  'price-asc': '1',
  'price-desc': '10',
  oldest: '2',
}

export function resolveSortType(sort: string): string {
  return SORT_MAP[sort] ?? '6'
}

function parseSearchProp(prop: Record<string, unknown>): SearchResult | null {
  const id = String(prop.id ?? '')
  if (!id) return null

  const price = (typeof prop.price === 'object' && prop.price ? prop.price : {}) as Record<string, unknown>
  const location = (typeof prop.location === 'object' && prop.location ? prop.location : {}) as Record<string, unknown>
  const customer = (typeof prop.customer === 'object' && prop.customer ? prop.customer : {}) as Record<string, unknown>

  // Price
  let amount = 0
  let qualifier = 'pcm'
  const displayPrices = Array.isArray(price.displayPrices) ? price.displayPrices : []
  if (displayPrices.length > 0) {
    const first = displayPrices[0] as Record<string, unknown>
    const parsed = parsePrice(String(first?.displayPrice ?? ''))
    amount = parsed.amount
    qualifier = parsed.qualifier || qualifier
  }
  if (!amount) {
    const raw = toInt(price.amount) ?? 0
    const isWeekly = String(price.frequency ?? '').toLowerCase().includes('week')
    amount = isWeekly ? Math.round(raw * 52 / 12) : raw
    if (isWeekly) qualifier = 'pw'
  }

  // Images
  let imageModels = Array.isArray(prop.images)
    ? prop.images
    : (prop.propertyImages as Record<string, unknown> | undefined)?.images
  if (!Array.isArray(imageModels)) imageModels = []
  const images = (imageModels as Record<string, unknown>[])
    .map(img => absoluteUrl(String(img.srcUrl ?? img.url ?? '')))
    .filter(Boolean) as string[]

  const listingUrl = String(prop.propertyUrl ?? `/property-to-rent/property-${id}.html`)

  // Added date
  const addedOrReduced = String(prop.addedOrReduced ?? (prop.listingUpdate as Record<string, unknown> | undefined)?.listingUpdateReason ?? '')
  const firstVisibleDate = String(prop.firstVisibleDate ?? '')
  const addedOn = firstVisibleDate || addedOrReduced || null

  return {
    id,
    url: absoluteUrl(listingUrl) ?? '',
    title: String(prop.displayAddress ?? prop.heading ?? ''),
    description: String(prop.summary ?? ''),
    price: amount,
    priceQualifier: qualifier,
    bedrooms: toInt(prop.bedrooms) ?? 0,
    bathrooms: toInt(prop.bathrooms),
    propertyType: String(prop.propertySubType ?? prop.propertyType ?? ''),
    lat: typeof location.latitude === 'number' ? location.latitude : null,
    lng: typeof location.longitude === 'number' ? location.longitude : null,
    images,
    agent: String(customer.brandTradingName ?? customer.branchDisplayName ?? customer.branchName ?? '') || null,
    agentPhone: String(customer.contactTelephone ?? customer.telephone ?? '') || null,
    addedOn,
  }
}

export async function searchListings(opts: SearchOptions): Promise<{ results: SearchResult[]; total: number }> {
  const baseUrl = opts.channel === 'BUY' ? SEARCH_BUY_URL : SEARCH_PAGE_URL
  const params: Record<string, string> = {
    locationIdentifier: opts.locationIdentifier,
    sortType: opts.sortType ?? '6',
    channel: opts.channel,
  }
  if (opts.minPrice) params.minPrice = String(opts.minPrice)
  if (opts.maxPrice) params.maxPrice = String(opts.maxPrice)
  if (opts.minBedrooms) params.minBedrooms = String(opts.minBedrooms)
  if (opts.maxBedrooms) params.maxBedrooms = String(opts.maxBedrooms)
  if (opts.index) params.index = String(opts.index)

  // Tier 1: __NEXT_DATA__ from search page
  const html = await rmFetch(baseUrl, params)
  if (html) {
    const nd = extractNextData(html)
    if (nd) {
      const props = nd.props as Record<string, unknown> | undefined
      const pageProps = props?.pageProps as Record<string, unknown> | undefined
      const searchResults = pageProps?.searchResults as Record<string, unknown> | undefined
      const items = Array.isArray(searchResults?.properties) ? searchResults!.properties : []
      const total = toInt(searchResults?.resultCount ?? searchResults?.totalAvailableProperties) ?? items.length
      if (items.length > 0) {
        const results = (items as Record<string, unknown>[])
          .map(parseSearchProp)
          .filter(Boolean) as SearchResult[]
        return { results, total }
      }
    }

    // Tier 2: PAGE_MODEL from search page (legacy)
    const pmMarker = html.indexOf('window.PAGE_MODEL')
    if (pmMarker !== -1) {
      const start = html.indexOf('{', pmMarker)
      if (start !== -1) {
        let depth = 0, end = start
        for (let i = start; i < Math.min(start + 500_000, html.length); i++) {
          if (html[i] === '{') depth++
          else if (html[i] === '}') { depth--; if (depth === 0) { end = i + 1; break } }
        }
        try {
          const pm = JSON.parse(html.slice(start, end)) as Record<string, unknown>
          const sr = pm.searchResults as Record<string, unknown> | undefined
          const items = Array.isArray(sr?.properties) ? sr!.properties : []
          const total = toInt(sr?.resultCount) ?? items.length
          if (items.length > 0) {
            const results = (items as Record<string, unknown>[])
              .map(parseSearchProp)
              .filter(Boolean) as SearchResult[]
            return { results, total }
          }
        } catch { /* fall through */ }
      }
    }
  }

  // Tier 3: Legacy API fallback
  const apiParams: Record<string, string> = {
    ...params,
    numberOfPropertiesPerPage: String(opts.pageSize ?? 24),
    index: String(opts.index ?? 0),
    includeSSTC: 'false',
  }
  const data = await rmFetch(SEARCH_API_URL, apiParams)
  if (!data) return { results: [], total: 0 }
  try {
    const json = JSON.parse(data) as Record<string, unknown>
    const items = Array.isArray(json.properties) ? json.properties : []
    const total = toInt(json.resultCount ?? json.totalAvailableProperties) ?? items.length
    const results = (items as Record<string, unknown>[])
      .map(parseSearchProp)
      .filter(Boolean) as SearchResult[]
    return { results, total }
  } catch {
    return { results: [], total: 0 }
  }
}
