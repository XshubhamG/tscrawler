import { argv } from "node:process";
import { crawlPage } from "./crawler";

async function main() {
  if (argv.length === 3) {
    const pages = await crawlPage(argv[2]);
    console.log(pages);
  } else {
    console.error("Unknown number of aruguments");
    process.exit(1);
  }
}

main();
