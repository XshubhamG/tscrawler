import { argv } from "node:process";
import { crawlSiteAsync } from "./crawler";

async function main() {
  if (argv.length === 3) {
    const pages = await crawlSiteAsync(argv[2]);
    console.log(pages);
  } else {
    console.error("Unknown number of aruguments");
    process.exit(1);
  }
}

main();
