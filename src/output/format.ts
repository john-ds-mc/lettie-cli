import type { SearchResult, DetailResult } from '../rightmove/types.js'

// ANSI codes — no dependency needed
const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'
const RESET = '\x1b[0m'
const GREEN = '\x1b[32m'
const CYAN = '\x1b[36m'
const YELLOW = '\x1b[33m'
const MAGENTA = '\x1b[35m'

function formatMoney(amount: number): string {
  return '\u00a3' + amount.toLocaleString('en-GB')
}

export function formatSearchResults(results: SearchResult[], total: number): string {
  if (results.length === 0) return `${DIM}No results found.${RESET}\n`

  const lines: string[] = []
  lines.push(`${DIM}${total} total results${RESET}\n`)

  for (const r of results) {
    const priceLine = `${GREEN}${formatMoney(r.price)} ${r.priceQualifier}${RESET}`
    const beds = r.bedrooms ? `${r.bedrooms} bed` : ''
    const baths = r.bathrooms ? ` \u00b7 ${r.bathrooms} bath` : ''
    const type = r.propertyType ? ` \u00b7 ${r.propertyType}` : ''
    const meta = `${beds}${baths}${type}`

    lines.push(`${BOLD}${r.title}${RESET}`)
    lines.push(`  ${priceLine}  ${DIM}${meta}${RESET}`)
    if (r.description) {
      const desc = r.description.length > 120 ? r.description.slice(0, 117) + '...' : r.description
      lines.push(`  ${desc}`)
    }
    if (r.agent) lines.push(`  ${MAGENTA}${r.agent}${RESET}${r.agentPhone ? `  ${DIM}${r.agentPhone}${RESET}` : ''}`)
    lines.push(`  ${CYAN}${r.url}${RESET}`)
    lines.push(`  ${DIM}ID: ${r.id}${r.addedOn ? `  \u00b7  ${r.addedOn}` : ''}${RESET}`)
    lines.push('')
  }

  return lines.join('\n')
}

export function formatDetail(d: DetailResult): string {
  const lines: string[] = []

  lines.push(`${BOLD}${d.title}${RESET}`)
  lines.push(`${GREEN}${formatMoney(d.price)} ${d.priceQualifier}${RESET}`)
  lines.push('')

  const meta: string[] = []
  if (d.bedrooms) meta.push(`${d.bedrooms} bedroom${d.bedrooms !== 1 ? 's' : ''}`)
  if (d.bathrooms) meta.push(`${d.bathrooms} bathroom${d.bathrooms !== 1 ? 's' : ''}`)
  if (d.propertyType) meta.push(d.propertyType)
  if (meta.length) lines.push(`${YELLOW}${meta.join(' \u00b7 ')}${RESET}`)

  // Key info
  const info: string[] = []
  if (d.furnishing) info.push(`Furnishing: ${d.furnishing}`)
  if (d.letType) info.push(`Let type: ${d.letType}`)
  if (d.deposit) info.push(`Deposit: ${d.deposit}`)
  if (d.councilTaxBand) info.push(`Council tax: Band ${d.councilTaxBand}`)
  if (d.tenure) info.push(`Tenure: ${d.tenure}`)
  if (d.nearestStation) {
    info.push(`Nearest station: ${d.nearestStation}${d.stationDistance ? ` (${d.stationDistance})` : ''}`)
  }
  if (info.length) {
    lines.push('')
    for (const i of info) lines.push(`  ${i}`)
  }

  // Features
  if (d.features.length) {
    lines.push('')
    lines.push(`${BOLD}Features${RESET}`)
    for (const f of d.features) lines.push(`  \u2022 ${f}`)
  }

  // Description
  if (d.description) {
    lines.push('')
    lines.push(`${BOLD}Description${RESET}`)
    // Word wrap at ~80 chars
    const words = d.description.split(' ')
    let line = ''
    for (const w of words) {
      if (line.length + w.length + 1 > 80) {
        lines.push(`  ${line}`)
        line = w
      } else {
        line = line ? `${line} ${w}` : w
      }
    }
    if (line) lines.push(`  ${line}`)
  }

  // Agent
  if (d.agent) {
    lines.push('')
    lines.push(`${MAGENTA}${d.agent}${RESET}${d.agentPhone ? `  ${DIM}${d.agentPhone}${RESET}` : ''}`)
  }

  lines.push('')
  lines.push(`${CYAN}${d.url}${RESET}`)
  if (d.addedOn) lines.push(`${DIM}Listed: ${d.addedOn}${RESET}`)
  lines.push(`${DIM}ID: ${d.id}${RESET}`)
  lines.push('')

  return lines.join('\n')
}

export function toJson(data: unknown): string {
  return JSON.stringify(data, null, 2)
}
