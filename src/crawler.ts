import { URL } from "node:url";
import pLimit, { LimitFunction } from "p-limit";
import { extractPageData, getURLsFromHTML, normalizeUrl } from "./utils";
import { ExtractedPageData } from "./types";

export {
  extractPageData,
  getFirstParagraphFromHTML,
  getHeadingFromHTML,
  getImagesFromHTML,
  getURLsFromHTML,
  normalizeUrl,
} from "./utils";

/*----------------------------------------------------- */
/* --------- ConcurrentCrawler class ---------------- */
/*----------------------------------------------------- */
export class ConcurrentCrawler {
  private baseUrl: string;
  private pages: Record<string, ExtractedPageData>;
  private seenUrls: Set<string>;
  private maxPages: number;
  private shouldStop: boolean;
  private limit: LimitFunction;

  constructor(
    baseUrl: string,
    maxConcurrency: number = 5,
    maxPages: number = 50,
  ) {
    this.baseUrl = baseUrl;
    this.pages = {};
    this.seenUrls = new Set();
    this.shouldStop = false;
    this.maxPages = maxPages;
    this.limit = pLimit(maxConcurrency);
  }

  private addPageVisit(normalizedURL: string): boolean {
    if (this.seenUrls.has(normalizedURL)) {
      return true;
    }
    if (this.shouldStop) return true;

    if (this.seenUrls.size >= this.maxPages) {
      this.shouldStop = true;
      console.log("Reached maximum number of pages to crawl.");
      return true;
    }
    this.seenUrls.add(normalizedURL);
    return false;
  }

  private async getHTML(currentURL: string): Promise<string> {
    return await this.limit(async () => {
      let res;
      try {
        res = await fetch(currentURL, {
          headers: { "User-agent": "TsCrawler/1.0" },
        });
      } catch (err) {
        throw new Error(`Got Network error: ${(err as Error).message}`);
      }

      if (!res.ok) {
        console.log(`Got HTTP error: ${res.status} ${res.statusText}`);
        return "";
      }
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType?.includes("text/html")) {
        console.log(`Got non-HTML response: ${contentType}`);
        return "";
      }

      return res.text();
    });
  }

  private async crawlPage(currentURL: string): Promise<void> {
    if (this.shouldStop) return;

    let current = new URL(currentURL);
    const base = new URL(this.baseUrl);

    if (base.origin !== current.origin) return;

    const normalizedURL = normalizeUrl(current.href);
    const isVisited = this.addPageVisit(normalizedURL);
    if (isVisited) return;

    let html = "";
    try {
      html = await this.getHTML(currentURL);
    } catch (e) {
      console.log(`${(e as Error).message}`);
      return;
    }
    const data = extractPageData(html, currentURL);
    this.pages[normalizedURL] = data;

    await Promise.all(
      data.outgoingLinks.map((nextUrl) => this.crawlPage(nextUrl)),
    );
  }

  async crawl() {
    await this.crawlPage(this.baseUrl);
    return this.pages;
  }
}

/*----------------------------------------------------- */
/* --------- Crawl Site Async Function ---------------- */
/*----------------------------------------------------- */

export async function crawlSiteAsync(
  baseUrl: string,
  maxConcurrency: number,
  maxPages: number,
) {
  const siteCrawler = new ConcurrentCrawler(baseUrl, maxConcurrency, maxPages);
  const finalPages = await siteCrawler.crawl();
  return finalPages;
}

/*
 export async function getHTML(url: string) {
   console.log(url);
   let res;
   try {
     res = await fetch(url, {
       headers: { "User-agent": "TsCrawler/1.0" },
     });
   } catch (err) {
     throw new Error(`Got Network error: ${(err as Error).message}`);
   }

   if (!res.ok) {
     console.log(`Got HTTP error: ${res.status} ${res.statusText}`);
     return "";
   }
   const contentType = res.headers.get("content-type");
   if (!contentType || !contentType?.includes("text/html")) {
     console.log(`Got non-HTML response: ${contentType}`);
     return "";
   }

   return res.text();
 }
*/

/*

export async function crawlPage(
  baseUrl: string,
  currentUrl: string = baseUrl,
  pages: Record<string, number> = {},
) {
  let current = new URL(currentUrl);
  const base = new URL(baseUrl);

  if (base.origin !== current.origin) return pages;

  const normalizedCurrent = normalizeUrl(current.href);
  if (Object.hasOwn(pages, normalizedCurrent)) {
    pages[normalizedCurrent]++;
    return pages;
  }

  pages[normalizedCurrent] = 1;

  console.log(`Current URL: ${currentUrl}`);

  let html = "";
  try {
    html = await getHTML(currentUrl);
    console.log(html);
  } catch (e) {
    console.log(`${(e as Error).message}`);
    return pages;
  }

  const urlsOnCurrentPage = getURLsFromHTML(html, baseUrl);

  for (let i = 0; i < urlsOnCurrentPage.length; i++) {
    pages = await crawlPage(baseUrl, urlsOnCurrentPage[i], pages);
  }
  return pages;
}

*/
