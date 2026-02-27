import { resolveLocation } from '../rightmove/location.js'
import { searchListings, resolveSortType } from '../rightmove/search.js'
import { formatSearchResults, toJson } from '../output/format.js'

export type SearchArgs = {
  area: string
  minPrice?: number
  maxPrice?: number
  beds?: number
  type: 'rent' | 'buy'
  sort: string
  limit?: number
  page?: number
  json: boolean
}

export async function runSearch(args: SearchArgs): Promise<void> {
  // Resolve area name to location identifier
  const locations = await resolveLocation(args.area)
  if (locations.length === 0) {
    if (args.json) {
      process.stderr.write(`No location found for "${args.area}"\n`)
      process.stdout.write(toJson({ error: `No location found for "${args.area}"`, results: [] }) + '\n')
    } else {
      process.stderr.write(`\x1b[31mNo location found for "${args.area}"\x1b[0m\n`)
      process.stderr.write(`Try a more specific area name (e.g. "Clapham, London" or "SW4").\n`)
    }
    process.exitCode = 1
    return
  }

  const loc = locations[0]
  if (!args.json) {
    process.stderr.write(`\x1b[2mSearching: ${loc.displayName}\x1b[0m\n\n`)
  }

  const pageSize = args.limit ?? 24
  const index = ((args.page ?? 1) - 1) * pageSize

  const { results, total } = await searchListings({
    locationIdentifier: loc.locationIdentifier,
    channel: args.type === 'buy' ? 'BUY' : 'RENT',
    minPrice: args.minPrice,
    maxPrice: args.maxPrice,
    minBedrooms: args.beds,
    maxBedrooms: args.beds,
    sortType: resolveSortType(args.sort),
    index,
    pageSize,
  })

  const limited = args.limit ? results.slice(0, args.limit) : results

  if (args.json) {
    process.stdout.write(toJson({ location: loc.displayName, total, results: limited }) + '\n')
  } else {
    process.stdout.write(formatSearchResults(limited, total))
  }
}
