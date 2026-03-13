# TSCrawler

`tscrawler` is a TypeScript-based website crawler for collecting structured page data from a single site origin. It fetches HTML pages concurrently, extracts useful content, and writes the crawl result to a JSON report.

The crawler is intended for lightweight site analysis, content inspection, and experimentation. It stays within the starting origin, skips non-HTML responses, deduplicates discovered links, and captures a consistent summary for each crawled page.

## Features

- Concurrent crawling with configurable concurrency limits
- Same-origin traversal to avoid leaving the target site
- Maximum page cap to bound crawl size
- Structured extraction for headings, first paragraph, links, and images
- JSON report generation under a local `reports/` directory
- Utility helpers that can be imported directly in TypeScript projects
- Test coverage with `vitest`

## What The Crawler Extracts

For each crawled page, the project stores:

- `url`: the page URL
- `heading`: the first `h1`, or the first `h2` if no `h1` exists
- `firstParagraph`: the first paragraph in `main`, or the first document paragraph as a fallback
- `outgoingLinks`: deduplicated absolute URLs from anchor tags
- `imageUrls`: deduplicated absolute URLs from image tags

## Requirements

- Node.js `20+`
- npm

This project uses modern ESM TypeScript tooling and relies on the runtime `fetch` API.

## Installation

Install dependencies:

```bash
npm install
```

## Usage

### Run The CLI

The project ships with a simple CLI entrypoint:

```bash
npm start -- <site-url> <max-concurrency> <max-pages>
```

Example:

```bash
npm start -- https://example.com 5 50
```

This will:

1. Start crawling from `https://example.com`
2. Crawl up to `50` same-origin pages
3. Limit concurrent fetch operations to `5`
4. Write a JSON report to `reports/example.com.json`

### Example Output

The generated report is an array of page objects similar to:

```json
[
  {
    "url": "https://example.com",
    "heading": "Example Domain",
    "firstParagraph": "This domain is for use in illustrative examples in documents.",
    "outgoingLinks": [
      "https://www.iana.org/domains/example"
    ],
    "imageUrls": []
  }
]
```

## Programmatic API

You can also import the crawler and helper utilities directly.

### Crawl A Site

```ts
import { crawlSiteAsync } from "./src/crawler";

const pages = await crawlSiteAsync("https://example.com", 5, 50);
console.log(pages);
```

### Use The Concurrent Crawler Class

```ts
import { ConcurrentCrawler } from "./src/crawler";

const crawler = new ConcurrentCrawler("https://example.com", 5, 50);
const pages = await crawler.crawl();
console.log(pages);
```

### Use Extraction Helpers

```ts
import {
  extractPageData,
  getFirstParagraphFromHTML,
  getHeadingFromHTML,
  getImagesFromHTML,
  getURLsFromHTML,
  normalizeUrl,
} from "./src/crawler";
```

## Generated Reports

Reports are written into a local `reports/` directory created in the current working directory.

- Filename format: `<hostname>.json`
- Example: `reports/example.com.json`
- Re-running a crawl for the same hostname overwrites the previous report
- Report entries are sorted by page URL before being written

## Crawl Behavior

The current implementation follows these rules:

- Only pages on the same origin as the starting URL are crawled
- Non-HTML responses are skipped
- HTTP and network failures are logged and skipped
- Duplicate URLs are ignored after normalization
- URL normalization removes the protocol and trims a trailing slash for crawl keys

Note that extracted `outgoingLinks` can include external URLs, but the crawler itself will only follow same-origin pages.

## Development

### Run Tests

```bash
npm test
```

### Project Structure

```text
src/
  crawler.ts     Concurrent crawler implementation and exports
  index.ts       CLI entrypoint
  report.ts      JSON report generation
  types.ts       Shared types
  utils.ts       HTML parsing and extraction helpers
  crawler.test.ts  Test suite
```

## Limitations

- Crawling is in-memory for the duration of the run
- There is no retry, backoff, or robots.txt handling
- There is no persistence layer beyond JSON report output
- The CLI expects explicit concurrency and page-limit arguments

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.
