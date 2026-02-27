const RM_BASE = 'https://www.rightmove.co.uk'

export function toInt(val: unknown): number | null {
  if (val == null) return null
  if (typeof val === 'number') return Math.round(val)
  if (typeof val === 'string') {
    const n = parseInt(val.replace(/,/g, ''), 10)
    return isNaN(n) ? null : n
  }
  return null
}

export function parsePrice(display: string): { amount: number; qualifier: string } {
  const lower = display.toLowerCase()
  const digits = display.replace(/[^\d]/g, '')
  const val = parseInt(digits, 10)
  if (isNaN(val)) return { amount: 0, qualifier: '' }

  if (lower.includes('pw')) {
    return { amount: Math.round(val * 52 / 12), qualifier: 'pw' }
  }
  return { amount: val, qualifier: 'pcm' }
}

export function absoluteUrl(val: string | null | undefined): string | null {
  if (!val) return null
  if (val.startsWith('http')) return val
  if (val.startsWith('//')) return `https:${val}`
  if (val.startsWith('/')) return `${RM_BASE}${val}`
  return val
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function extractNextData(html: string): Record<string, unknown> | null {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!m) return null
  try { return JSON.parse(m[1]) } catch { return null }
}

export function extractPageModel(html: string): Record<string, unknown> | null {
  const marker = html.indexOf('window.PAGE_MODEL')
  if (marker === -1) return null
  const start = html.indexOf('{', marker)
  if (start === -1) return null
  let depth = 0, end = start
  for (let i = start; i < Math.min(start + 500_000, html.length); i++) {
    if (html[i] === '{') depth++
    else if (html[i] === '}') { depth--; if (depth === 0) { end = i + 1; break } }
  }
  try { return JSON.parse(html.slice(start, end)) } catch { return null }
}
