import { fetchDetail } from '../rightmove/detail.js'
import { formatDetail, toJson } from '../output/format.js'

export type ViewArgs = {
  idOrUrl: string
  json: boolean
}

export async function runView(args: ViewArgs): Promise<void> {
  const detail = await fetchDetail(args.idOrUrl)

  if (!detail) {
    if (args.json) {
      process.stderr.write(`Could not fetch listing "${args.idOrUrl}"\n`)
      process.stdout.write(toJson({ error: `Could not fetch listing "${args.idOrUrl}"` }) + '\n')
    } else {
      process.stderr.write(`\x1b[31mCould not fetch listing "${args.idOrUrl}"\x1b[0m\n`)
      process.stderr.write(`Check the ID or URL and try again.\n`)
    }
    process.exitCode = 1
    return
  }

  if (args.json) {
    process.stdout.write(toJson(detail) + '\n')
  } else {
    process.stdout.write(formatDetail(detail))
  }
}
