import type { DetailResult } from './types.js'
import { rmFetch } from './client.js'
import { toInt, parsePrice, absoluteUrl, extractPageModel, extractNextData, stripHtml } from './parse.js'

const RM_BASE = 'https://www.rightmove.co.uk'

function resolveListingUrl(idOrUrl: string): string {
  // Full URL
  if (idOrUrl.startsWith('http')) return idOrUrl
  // Bare ID
  if (/^\d+$/.test(idOrUrl)) return `${RM_BASE}/property-to-rent/property-${idOrUrl}.html`
  // Path
  if (idOrUrl.startsWith('/')) return `${RM_BASE}${idOrUrl}`
  return idOrUrl
}

export async function fetchDetail(idOrUrl: string): Promise<DetailResult | null> {
  const url = resolveListingUrl(idOrUrl)
  const html = await rmFetch(url)
  if (!html) return null

  // Try PAGE_MODEL first (detail pages usually use this)
  const pageModel = extractPageModel(html)
  if (pageModel) {
    return parseFromPageModel(pageModel, url)
  }

  // Fallback to __NEXT_DATA__
  const nd = extractNextData(html)
  if (nd) {
    return parseFromNextData(nd, url)
  }

  return null
}

function parseFromPageModel(pm: Record<string, unknown>, url: string): DetailResult | null {
  const pd = (typeof pm.propertyData === 'object' && pm.propertyData
    ? pm.propertyData : {}) as Record<string, unknown>

  const id = String(pd.id ?? '')
  if (!id) return null

  // Price
  const prices = pd.prices as Record<string, unknown> | undefined
  let price = 0
  let priceQualifier = 'pcm'
  if (prices) {
    const primary = prices.primaryPrice as string | undefined
    if (primary) {
      const parsed = parsePrice(primary)
      price = parsed.amount
      priceQualifier = parsed.qualifier || priceQualifier
    }
  }

  // Text
  const textModel = pd.text as Record<string, unknown> | undefined
  const description = stripHtml(String(textModel?.description ?? pd.fullDescription ?? ''))

  // Location
  const loc = pd.location as Record<string, unknown> | undefined

  // Images
  const imgs: string[] = []
  if (Array.isArray(pd.images)) {
    for (const img of pd.images as Record<string, unknown>[]) {
      const resized = img.resizedImageUrls as Record<string, string> | undefined
      const u = absoluteUrl(String(img.url ?? resized?.size656x437 ?? resized?.size476x317 ?? ''))
      if (u) imgs.push(u)
    }
  }

  // Floorplan
  let floorplan: string | null = null
  if (Array.isArray(pd.floorplans) && (pd.floorplans as Record<string, unknown>[]).length > 0) {
    const fp = (pd.floorplans as Record<string, unknown>[])[0]
    floorplan = absoluteUrl(String(fp.url ?? ''))
  }

  // Key features
  const features: string[] = []
  if (Array.isArray(pd.keyFeatures)) {
    for (const f of pd.keyFeatures) features.push(String(f))
  }

  // Agent
  const customer = (typeof pd.customer === 'object' && pd.customer ? pd.customer : {}) as Record<string, unknown>

  // Lettings info
  const lettings = pd.lettings as Record<string, unknown> | undefined

  // Nearest stations
  const stations = Array.isArray(pd.nearestStations) ? pd.nearestStations as Record<string, unknown>[] : []
  let nearestStation: string | null = null
  let stationDistance: string | null = null
  if (stations.length > 0) {
    nearestStation = String(stations[0].name ?? '')
    stationDistance = String(stations[0].distance ?? '')
    const unit = String(stations[0].unit ?? 'miles')
    if (stationDistance && unit) stationDistance = `${stationDistance} ${unit}`
  }

  // EPC
  const epc = pd.epc as Record<string, unknown> | undefined
  let epcRating: string | null = null
  if (epc) {
    epcRating = absoluteUrl(String(epc.url ?? '')) ?? (String(epc.currentEnergyRating ?? '') || null)
  }

  return {
    id,
    url,
    title: String((pd.address as Record<string, unknown> | undefined)?.displayAddress ?? pd.displayAddress ?? ''),
    description,
    price,
    priceQualifier,
    bedrooms: toInt(pd.bedrooms) ?? 0,
    bathrooms: toInt(pd.bathrooms),
    propertyType: String(pd.propertySubType ?? pd.propertyType ?? ''),
    lat: typeof loc?.latitude === 'number' ? loc.latitude : null,
    lng: typeof loc?.longitude === 'number' ? loc.longitude : null,
    images: imgs,
    agent: String(customer.companyTradingName ?? customer.branchDisplayName ?? customer.branchName ?? '') || null,
    agentPhone: String(customer.contactTelephone ?? customer.telephone ?? '') || null,
    addedOn: String((pd.listingHistory as Record<string, unknown> | undefined)?.listingUpdateDate ?? pd.firstVisibleDate ?? '') || null,
    floorplan,
    features,
    tenure: String((pd.tenure as Record<string, unknown> | undefined)?.tenureType ?? '') || null,
    furnishing: String(lettings?.furnishType ?? '') || null,
    letType: String(lettings?.letType ?? '') || null,
    deposit: String(lettings?.deposit ?? '') || null,
    councilTaxBand: String(pd.councilTaxBand ?? '') || null,
    epc: epcRating,
    nearestStation,
    stationDistance,
  }
}

function parseFromNextData(nd: Record<string, unknown>, url: string): DetailResult | null {
  const props = nd.props as Record<string, unknown> | undefined
  const pageProps = props?.pageProps as Record<string, unknown> | undefined
  if (!pageProps) return null

  const pd = (pageProps.propertyData ?? pageProps) as Record<string, unknown>
  const id = String(pd.id ?? pd.propertyId ?? '')
  if (!id) return null

  let price = 0
  let priceQualifier = 'pcm'
  const priceObj = pd.prices as Record<string, unknown> | undefined
  if (priceObj?.primaryPrice) {
    const parsed = parsePrice(String(priceObj.primaryPrice))
    price = parsed.amount
    priceQualifier = parsed.qualifier || priceQualifier
  }

  const textModel = pd.text as Record<string, unknown> | undefined
  const description = stripHtml(String(textModel?.description ?? pd.description ?? ''))

  const loc = pd.location as Record<string, unknown> | undefined

  return {
    id,
    url,
    title: String(pd.displayAddress ?? ''),
    description,
    price,
    priceQualifier,
    bedrooms: toInt(pd.bedrooms) ?? 0,
    bathrooms: toInt(pd.bathrooms),
    propertyType: String(pd.propertySubType ?? pd.propertyType ?? ''),
    lat: typeof loc?.latitude === 'number' ? loc.latitude : null,
    lng: typeof loc?.longitude === 'number' ? loc.longitude : null,
    images: [],
    agent: null,
    agentPhone: null,
    addedOn: null,
    floorplan: null,
    features: Array.isArray(pd.keyFeatures) ? (pd.keyFeatures as string[]) : [],
    tenure: null,
    furnishing: null,
    letType: null,
    deposit: null,
    councilTaxBand: null,
    epc: null,
    nearestStation: null,
    stationDistance: null,
  }
}
