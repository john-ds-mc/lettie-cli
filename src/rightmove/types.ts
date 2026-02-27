export type SearchResult = {
  id: string
  url: string
  title: string
  description: string
  price: number
  priceQualifier: string // "pcm", "pw", etc.
  bedrooms: number
  bathrooms: number | null
  propertyType: string
  lat: number | null
  lng: number | null
  images: string[]
  agent: string | null
  agentPhone: string | null
  addedOn: string | null
}

export type DetailResult = SearchResult & {
  floorplan: string | null
  features: string[]
  tenure: string | null
  furnishing: string | null
  letType: string | null
  deposit: string | null
  councilTaxBand: string | null
  epc: string | null
  nearestStation: string | null
  stationDistance: string | null
}

export type LocationMatch = {
  displayName: string
  locationIdentifier: string
  normalisedSearchTerm: string
}
