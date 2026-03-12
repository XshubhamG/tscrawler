import { URL } from "node:url";
import { JSDOM } from "jsdom";
import { ExtractedPageData } from "./types";

export function normalizeUrl(url: string) {
  let urlObj = new URL(url);
  let hostname = urlObj.hostname;

  let pathname = urlObj.pathname;
  if (pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }

  return hostname + pathname;
}

export function getHeadingFromHTML(html: string): string {
  const dom = new JSDOM(html);
  const h1 = dom.window.document.querySelector("h1")?.textContent.trim();
  const h2 = dom.window.document.querySelector("h2")?.textContent.trim();
  if (h1) {
    return h1;
  } else if (h2) {
    return h2;
  } else {
    return "";
  }
}

export function getFirstParagraphFromHTML(html: string): string {
  try {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const main = doc.querySelector("main");
    const p = main?.querySelector("p") ?? doc.querySelector("p");
    return (p?.textContent ?? "").trim();
  } catch (err) {
    return "";
  }
}

export function getURLsFromHTML(html: string, baseURL: string): string[] {
  let urls: string[] = [];
  try {
    const dom = new JSDOM(html);
    const anchorArr = [...dom.window.document.querySelectorAll("a")];
    const urlArr = anchorArr
      .map((a) => a.getAttribute("href"))
      .map((url) => {
        const u = new URL(url!, baseURL);
        return u.href;
      });
    urls = [...new Set(urlArr)];
  } catch (err) {
    console.error("failed to parse HTML:", err);
  }

  return urls;
}

export function getImagesFromHTML(html: string, baseURL: string): string[] {
  let images: string[] = [];
  try {
    const dom = new JSDOM(html);
    const imgTags = [...dom.window.document.querySelectorAll("img")];
    const srcArr = imgTags
      .map((h) => h.getAttribute("src"))
      .map((url) => {
        const u = new URL(url!, baseURL);
        return u.href;
      });

    images = [...new Set(srcArr)];
  } catch (err) {
    console.error("failed to parse HTML:", err);
  }

  return images;
}

export function extractPageData(
  html: string,
  pageURL: string,
): ExtractedPageData {
  return {
    url: pageURL,
    heading: getHeadingFromHTML(html),
    firstParagraph: getFirstParagraphFromHTML(html),
    outgoingLinks: getURLsFromHTML(html, pageURL),
    imageUrls: getImagesFromHTML(html, pageURL),
  };
}

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
