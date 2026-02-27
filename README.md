# lettie-cli

Search Rightmove listings from your terminal. Useful for AI agents (JSON output) and humans (pretty cards).

Part of [Lettie](https://lettie.uk) — an AI flat-hunting agent for London rentals.

Zero runtime dependencies. Node 18+.

## Install

```bash
git clone https://github.com/john-ds-mc/lettie-cli.git
cd lettie-cli
npm install
npm run build
```

## Usage

### Search

```bash
# Search rentals in Clapham, 2 beds, max £2500/month
npx tsx src/index.ts search --area "Clapham" --beds 2 --max-price 2500

# Buy instead of rent
npx tsx src/index.ts search --area "Hackney" --type buy --max-price 500000

# Sort by price, limit results
npx tsx src/index.ts search --area "Brixton" --sort price-asc --limit 5

# JSON output for piping
npx tsx src/index.ts search --area "Clapham" --json | jq '.results[0]'
```

### View

```bash
# View full details by listing ID
npx tsx src/index.ts view 171428942

# Or by URL
npx tsx src/index.ts view "https://www.rightmove.co.uk/properties/171428942"

# JSON output
npx tsx src/index.ts view 171428942 --json
```

## Search options

| Flag | Short | Description |
|------|-------|-------------|
| `--area` | `-a` | Area to search (required) |
| `--min-price` | | Minimum price |
| `--max-price` | | Maximum price |
| `--beds` | `-b` | Number of bedrooms |
| `--type` | `-t` | `rent` or `buy` (default: rent) |
| `--sort` | `-s` | `newest`, `price-asc`, `price-desc`, `oldest` |
| `--limit` | `-l` | Max results to show |
| `--page` | `-p` | Page number |
| `--json` | | Output as JSON |

## JSON schema

The `--json` flag outputs structured data:

```json
{
  "location": "Clapham, South West London",
  "total": 337,
  "results": [
    {
      "id": "171428942",
      "url": "https://www.rightmove.co.uk/properties/171428942",
      "title": "Poynders Road",
      "description": "...",
      "price": 2200,
      "priceQualifier": "pcm",
      "bedrooms": 2,
      "bathrooms": 1,
      "propertyType": "Flat",
      "lat": 51.45,
      "lng": -0.13,
      "images": ["..."],
      "agent": "Patrick Henry",
      "agentPhone": "020 3834 8762",
      "addedOn": "2026-01-26T09:39:15Z"
    }
  ]
}
```

## License

MIT
