import { argv } from "node:process";
import { crawlSiteAsync } from "./crawler";

async function main() {
  if (argv.length >= 3 && argv.length <= 5) {
    const pages = await crawlSiteAsync(argv[2], +argv[3], +argv[4]);
    console.log(pages);
    console.log("Finished crawling.");
    const firstPage = Object.values(pages)[0];
    if (firstPage) {
      console.log(
        `First page record: ${firstPage["url"]} - ${firstPage["heading"]}`,
      );
    }
  } else {
    console.error("Unknown number of aruguments");
    process.exit(1);
  }
}

main();
