import { JSDOM } from "jsdom";
import { URL } from "node:url";
import { ExtractedPageData } from "./types";

// Converts a URL into a stable crawl key by dropping the protocol and trimming
// a trailing slash so equivalent pages compare the same way.
export function normalizeUrl(url: string) {
  let urlObj = new URL(url);
  let hostname = urlObj.hostname;

  let pathname = urlObj.pathname;
  if (pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }

  return hostname + pathname;
}

// Returns the most prominent page heading, preferring the first h1 and falling
// back to the first h2 when no h1 is present.
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

// Extracts the first paragraph from the main content area when possible, or
// from the document body as a fallback. Invalid HTML returns an empty string.
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

// Collects all anchor href values, resolves relative links against the page
// URL, and deduplicates the resulting absolute URLs.
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

// Collects all image src values, resolves relative asset paths against the
// page URL, and removes duplicates from the final list.
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

// Builds the crawler's structured page summary by combining the individual HTML
// extraction helpers for text, links, and images.
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
