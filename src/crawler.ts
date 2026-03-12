import { URL } from "node:url";
import pLimit, { LimitFunction } from "p-limit";
import { getURLsFromHTML, normalizeUrl } from "./utils";

/*----------------------------------------------------- */
/* --------- ConcurrentCrawler class ---------------- */
/*----------------------------------------------------- */
export class ConcurrentCrawler {
  private baseUrl: string;
  private pages: Record<string, number>;
  private limit: LimitFunction;

  constructor(baseUrl: string, maxConcurrency: number = 5) {
    this.baseUrl = baseUrl;
    this.pages = {};
    this.limit = pLimit(maxConcurrency);
  }

  private addPageVisit(normalizedURL: string): boolean {
    if (Object.hasOwn(this.pages, normalizedURL)) {
      return true;
    }

    this.pages[normalizedURL] = 1;
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
    let current = new URL(currentURL);
    const base = new URL(this.baseUrl);

    if (base.origin !== current.origin) return;

    const normalizedURL = normalizeUrl(current.href);
    const isVisited = this.addPageVisit(normalizedURL);
    if (isVisited) return;

    let html = "";
    try {
      html = await this.getHTML(currentURL);
      console.log(html);
    } catch (e) {
      console.log(`${(e as Error).message}`);
      return;
    }
    const allUrls = getURLsFromHTML(html, this.baseUrl);
    const input: Promise<void>[] = [];

    for (let nextUrl of allUrls) {
      input.push(this.crawlPage(nextUrl));
    }

    await Promise.all(input);
  }

  async crawl() {
    await this.crawlPage(this.baseUrl);
    return this.pages;
  }
}

/*----------------------------------------------------- */
/* --------- Crawl Site Async Function ---------------- */
/*----------------------------------------------------- */

export async function crawlSiteAsync(baseUrl: string) {
  const siteCrawler = new ConcurrentCrawler(baseUrl, 5);
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
