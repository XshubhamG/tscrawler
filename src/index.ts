import { argv } from "node:process";
import { crawlSiteAsync } from "./crawler";
import { writeJSONReport } from "./report";

async function main() {
  if (argv.length >= 3 && argv.length <= 5) {
    const siteUrl = argv[2];
    const pages = await crawlSiteAsync(siteUrl, +argv[3], +argv[4]);
    console.log(pages);
    console.log("Finished crawling.");
    const reportPath = writeJSONReport(pages, siteUrl);
    console.log(`Report written to ${reportPath}`);
  } else {
    console.error("Unknown number of aruguments");
    process.exit(1);
  }
}

main();
