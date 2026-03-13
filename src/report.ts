import { mkdirSync, writeFileSync } from "fs";
import { ExtractedPageData } from "./types";
import { resolve } from "path";

function getReportFilename(siteUrl: string): string {
  try {
    const { hostname } = new URL(siteUrl);
    return `${hostname.replace(/[^a-z0-9.-]/gi, "_").toLowerCase()}.json`;
  } catch {
    return "report.json";
  }
}

export function writeJSONReport(
  pageData: Record<string, ExtractedPageData>,
  siteUrl: string,
): string {
  const sorted = Object.values(pageData).sort((a, b) =>
    a.url.localeCompare(b.url),
  );
  const reportsDir = resolve(process.cwd(), "reports");
  const reportPath = resolve(reportsDir, getReportFilename(siteUrl));
  const json = JSON.stringify(sorted, null, 2);
  mkdirSync(reportsDir, { recursive: true });
  writeFileSync(reportPath, json, "utf-8");
  return reportPath;
}
