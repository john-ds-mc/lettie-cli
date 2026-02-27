#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { runSearch } from './commands/search.js'
import { runView } from './commands/view.js'

const HELP = `
lettie — Search Rightmove from your terminal

Usage:
  lettie search --area "Clapham" [options]
  lettie view <id-or-url> [options]

Commands:
  search    Search for rental or sale listings
  view      View full details for a listing

Search options:
  -a, --area <name>       Area to search (required)
      --min-price <n>     Minimum price
      --max-price <n>     Maximum price
  -b, --beds <n>          Number of bedrooms
  -t, --type <rent|buy>   Listing type (default: rent)
  -s, --sort <mode>       Sort: newest, price-asc, price-desc, oldest (default: newest)
  -l, --limit <n>         Max results to show
  -p, --page <n>          Page number (default: 1)
      --json              Output as JSON

View options:
      --json              Output as JSON

General:
  -h, --help              Show this help
      --version           Show version
`.trim()

function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  if (!command || command === '--help' || command === '-h') {
    console.log(HELP)
    return
  }

  if (command === '--version') {
    console.log('0.1.0')
    return
  }

  const rest = args.slice(1)

  if (command === 'search') {
    const { values } = parseArgs({
      args: rest,
      options: {
        area:       { type: 'string', short: 'a' },
        'min-price': { type: 'string' },
        'max-price': { type: 'string' },
        beds:       { type: 'string', short: 'b' },
        type:       { type: 'string', short: 't', default: 'rent' },
        sort:       { type: 'string', short: 's', default: 'newest' },
        limit:      { type: 'string', short: 'l' },
        page:       { type: 'string', short: 'p' },
        json:       { type: 'boolean', default: false },
        help:       { type: 'boolean', short: 'h', default: false },
      },
      strict: true,
    })

    if (values.help) {
      console.log(HELP)
      return
    }

    if (!values.area) {
      process.stderr.write('Error: --area is required\n\n')
      console.log(HELP)
      process.exitCode = 1
      return
    }

    runSearch({
      area: values.area,
      minPrice: values['min-price'] ? parseInt(values['min-price'], 10) : undefined,
      maxPrice: values['max-price'] ? parseInt(values['max-price'], 10) : undefined,
      beds: values.beds ? parseInt(values.beds, 10) : undefined,
      type: (values.type as 'rent' | 'buy') ?? 'rent',
      sort: values.sort ?? 'newest',
      limit: values.limit ? parseInt(values.limit, 10) : undefined,
      page: values.page ? parseInt(values.page, 10) : undefined,
      json: values.json ?? false,
    }).catch(err => {
      process.stderr.write(`Error: ${err}\n`)
      process.exitCode = 1
    })
  } else if (command === 'view') {
    const { values, positionals } = parseArgs({
      args: rest,
      options: {
        json: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
      allowPositionals: true,
      strict: true,
    })

    if (values.help) {
      console.log(HELP)
      return
    }

    const idOrUrl = positionals[0]
    if (!idOrUrl) {
      process.stderr.write('Error: listing ID or URL is required\n\n')
      console.log(HELP)
      process.exitCode = 1
      return
    }

    runView({
      idOrUrl,
      json: values.json ?? false,
    }).catch(err => {
      process.stderr.write(`Error: ${err}\n`)
      process.exitCode = 1
    })
  } else {
    process.stderr.write(`Unknown command: ${command}\n\n`)
    console.log(HELP)
    process.exitCode = 1
  }
}

main()
