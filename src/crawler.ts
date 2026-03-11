import { URL } from "node:url";
import { JSDOM } from "jsdom";
import { ExtractedPageData } from "./types";

export function normalizeUrl(url: string): string {
  let urlObj = new URL(url);
  let hostname = urlObj.hostname;

  let pathname = urlObj.pathname;
  if (pathname.endsWith("/")) {
    pathname = pathname.slice(0, pathname.length - 1);
  }

  return hostname + pathname;
}

export function getHeadingFromHTML(html: string): string {
  const dom = new JSDOM(html);
  const heading1 = dom.window.document.querySelector("h1")?.textContent;
  const heading2 = dom.window.document.querySelector("h2")?.textContent;
  if (heading1) {
    return heading1;
  } else if (heading2) {
    return heading2;
  } else {
    return "";
  }
}

export function getFirstParagraphFromHTML(html: string): string {
  const dom = new JSDOM(html);
  const main = dom.window.document.querySelector("main");
  if (main) {
    let firstParagraph = main.querySelector("p")?.textContent;
    return firstParagraph!;
  } else {
    let firstParagraph = dom.window.document.querySelector("p")?.textContent;
    return firstParagraph!;
  }
  return "";
}

export function getURLsFromHTML(html: string, baseURL: string): string[] {
  const dom = new JSDOM(html);
  const anchorArr = [...dom.window.document.querySelectorAll("a")];
  const urlArr = anchorArr
    .map((a) => a.getAttribute("href"))
    .map((url) => {
      const u = new URL(url!, baseURL);
      return u.href;
    });

  return [...new Set(urlArr)];
}

export function getImagesFromHTML(html: string, baseURL: string): string[] {
  const dom = new JSDOM(html);
  const imgTags = [...dom.window.document.querySelectorAll("img")];
  const srcArr = imgTags
    .map((h) => h.getAttribute("src"))
    .map((url) => {
      const u = new URL(url!, baseURL);
      return u.href;
    });

  return [...new Set(srcArr)];
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
