import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ConcurrentCrawler } from "./crawler";
import { writeJSONReport } from "./report";

import {
  extractPageData,
  getFirstParagraphFromHTML,
  getHeadingFromHTML,
  getImagesFromHTML,
  getURLsFromHTML,
  normalizeUrl,
} from "./utils";

describe("normalizeUrl", () => {
  test.each([
    ["https://www.boot.dev/blog/path/", "www.boot.dev/blog/path"],
    ["https://www.boot.dev/blog/path", "www.boot.dev/blog/path"],
    ["http://www.boot.dev/blog/path", "www.boot.dev/blog/path"],
    ["http://www.boot.dev/blog/path/", "www.boot.dev/blog/path"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeUrl(input)).toBe(expected);
  });
});

describe("ConcurrentCrawler", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("fetches a shared child page only once when discovered concurrently", async () => {
    const pagesByUrl: Record<string, string> = {
      "https://crawler-test.com": `
        <html><body>
          <a href="/page-a">Page A</a>
          <a href="/page-b">Page B</a>
        </body></html>
      `,
      "https://crawler-test.com/page-a": `
        <html><body>
          <a href="/shared">Shared</a>
        </body></html>
      `,
      "https://crawler-test.com/page-b": `
        <html><body>
          <a href="/shared">Shared</a>
        </body></html>
      `,
      "https://crawler-test.com/shared": `
        <html><body>
          <h1>Shared Page</h1>
        </body></html>
      `,
    };
    const fetchCounts: Record<string, number> = {};

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = input instanceof URL ? input.href : String(input);
      fetchCounts[url] = (fetchCounts[url] ?? 0) + 1;

      if (url === "https://crawler-test.com/shared") {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      return new Response(pagesByUrl[url], {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    });

    const crawler = new ConcurrentCrawler("https://crawler-test.com", 4, 10);
    const pages = await crawler.crawl();

    expect(fetchCounts["https://crawler-test.com/shared"]).toBe(1);
    expect(Object.keys(pages).sort()).toEqual([
      "crawler-test.com",
      "crawler-test.com/page-a",
      "crawler-test.com/page-b",
      "crawler-test.com/shared",
    ]);
  });
});

describe("writeJSONReport", () => {
  test("writes reports/<hostname>.json and overwrites the same site report on rerun", () => {
    const originalCwd = process.cwd();
    const tempDir = mkdtempSync(join(tmpdir(), "tscrawler-report-"));

    process.chdir(tempDir);

    try {
      const reportPath = writeJSONReport(
        {
          b: {
            url: "https://example.com/b",
            heading: "B",
            firstParagraph: "Second",
            outgoingLinks: [],
            imageUrls: [],
          },
          a: {
            url: "https://example.com/a",
            heading: "A",
            firstParagraph: "First",
            outgoingLinks: [],
            imageUrls: [],
          },
        },
        "https://example.com",
      );

      expect(reportPath).toBe(join(tempDir, "reports", "example.com.json"));
      expect(existsSync(reportPath)).toBe(true);
      expect(JSON.parse(readFileSync(reportPath, "utf-8"))).toEqual([
        {
          url: "https://example.com/a",
          heading: "A",
          firstParagraph: "First",
          outgoingLinks: [],
          imageUrls: [],
        },
        {
          url: "https://example.com/b",
          heading: "B",
          firstParagraph: "Second",
          outgoingLinks: [],
          imageUrls: [],
        },
      ]);

      writeJSONReport(
        {
          c: {
            url: "https://example.com/c",
            heading: "C",
            firstParagraph: "Updated",
            outgoingLinks: [],
            imageUrls: [],
          },
        },
        "https://example.com",
      );

      expect(JSON.parse(readFileSync(reportPath, "utf-8"))).toEqual([
        {
          url: "https://example.com/c",
          heading: "C",
          firstParagraph: "Updated",
          outgoingLinks: [],
          imageUrls: [],
        },
      ]);
    } finally {
      process.chdir(originalCwd);
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe("getHeadingFromHTML", () => {
  test.each([
    [
      "returns the h1 text",
      `<html><body><h1>Test Title</h1></body></html>`,
      "Test Title",
    ],
    [
      "falls back to h2 when h1 is missing",
      `<html><body><h2>Secondary Title</h2></body></html>`,
      "Secondary Title",
    ],
    [
      "prefers h1 when both h1 and h2 exist",
      `<html><body><h2>Secondary Title</h2><h1>Primary Title</h1></body></html>`,
      "Primary Title",
    ],
    [
      "returns an empty string when no headings exist",
      `<html><body><p>No headings here.</p></body></html>`,
      "",
    ],
  ])("%s", (_label, inputBody, expected) => {
    expect(getHeadingFromHTML(inputBody)).toEqual(expected);
  });
});

describe("getFirstParagraphFromHTML", () => {
  test.each([
    [
      "prioritizes the first paragraph inside main",
      `
        <html><body>
          <p>Outside paragraph.</p>
          <main>
            <p>Main paragraph.</p>
          </main>
        </body></html>
      `,
      "Main paragraph.",
    ],
    [
      "returns the first paragraph in the document when main is missing",
      `
        <html><body>
          <p>First paragraph.</p>
          <p>Second paragraph.</p>
        </body></html>
      `,
      "First paragraph.",
    ],
    [
      "returns the first nested paragraph inside main",
      `
        <html><body>
          <main>
            <section>
              <p>Nested main paragraph.</p>
            </section>
            <p>Another main paragraph.</p>
          </main>
        </body></html>
      `,
      "Nested main paragraph.",
    ],
    [
      "ignores paragraphs outside main when main exists",
      `
        <html><body>
          <p>Outside paragraph.</p>
          <main>
            <article>
              <p>Inside main paragraph.</p>
            </article>
          </main>
        </body></html>
      `,
      "Inside main paragraph.",
    ],
  ])("%s", (_label, inputBody, expected) => {
    expect(getFirstParagraphFromHTML(inputBody)).toEqual(expected);
  });
});

describe("getURLsFromHTML", () => {
  test.each([
    [
      "converts a relative path into an absolute URL",
      "https://crawler-test.com",
      `<html><body><a href="/path/one"><span>Boot.dev</span></a></body></html>`,
      ["https://crawler-test.com/path/one"],
    ],
    [
      "keeps an absolute URL on the same origin unchanged",
      "https://crawler-test.com",
      `<html><body><a href="https://crawler-test.com/path/two">Docs</a></body></html>`,
      ["https://crawler-test.com/path/two"],
    ],
    [
      "keeps an absolute URL on a different origin unchanged",
      "https://crawler-test.com",
      `<html><body><a href="https://blog.crawler-test.com/articles/one">Blog</a></body></html>`,
      ["https://blog.crawler-test.com/articles/one"],
    ],
    [
      "preserves query parameters and hash fragments for absolute URLs",
      "https://crawler-test.com",
      `<html><body><a href="https://crawler-test.com/search?q=vitest#results">Search</a></body></html>`,
      ["https://crawler-test.com/search?q=vitest#results"],
    ],
    [
      "deduplicates repeated absolute URLs",
      "https://crawler-test.com",
      `
        <html><body>
          <a href="https://crawler-test.com/path/three">One</a>
          <a href="https://crawler-test.com/path/three">Two</a>
        </body></html>
      `,
      ["https://crawler-test.com/path/three"],
    ],
  ])("%s", (_label, inputURL, inputBody, expected) => {
    expect(getURLsFromHTML(inputBody, inputURL)).toEqual(expected);
  });
});

describe("getImagesFromHTML", () => {
  test.each([
    [
      "converts a relative image source into an absolute URL",
      "https://crawler-test.com",
      `<html><body><img src="/logo.png" alt="Logo"></body></html>`,
      ["https://crawler-test.com/logo.png"],
    ],
    [
      "keeps an absolute image URL on the same origin unchanged",
      "https://crawler-test.com",
      `<html><body><img src="https://crawler-test.com/images/hero.png" alt="Hero"></body></html>`,
      ["https://crawler-test.com/images/hero.png"],
    ],
    [
      "keeps an absolute image URL on a different origin unchanged",
      "https://crawler-test.com",
      `<html><body><img src="https://cdn.crawler-test.com/assets/banner.jpg" alt="Banner"></body></html>`,
      ["https://cdn.crawler-test.com/assets/banner.jpg"],
    ],
    [
      "deduplicates repeated image URLs",
      "https://crawler-test.com",
      `
        <html><body>
          <img src="/shared.png" alt="One">
          <img src="https://crawler-test.com/shared.png" alt="Two">
        </body></html>
      `,
      ["https://crawler-test.com/shared.png"],
    ],
  ])("%s", (_label, inputURL, inputBody, expected) => {
    expect(getImagesFromHTML(inputBody, inputURL)).toEqual(expected);
  });
});

describe("extractPageData", () => {
  test.each([
    [
      "extracts heading, first paragraph, outgoing links, and image URLs",
      "https://crawler-test.com",
      `
        <html><body>
          <h1>Test Title</h1>
          <p>This is the first paragraph.</p>
          <a href="/link1">Link 1</a>
          <img src="/image1.jpg" alt="Image 1">
        </body></html>
      `,
      {
        url: "https://crawler-test.com",
        heading: "Test Title",
        firstParagraph: "This is the first paragraph.",
        outgoingLinks: ["https://crawler-test.com/link1"],
        imageUrls: ["https://crawler-test.com/image1.jpg"],
      },
    ],
  ])("%s", (_label, inputURL, inputBody, expected) => {
    expect(extractPageData(inputBody, inputURL)).toEqual(expected);
  });
});
