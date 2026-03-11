import { argv } from "node:process";

function main() {
  if (argv.length === 3) {
    getHTML(argv[2]);
  } else {
    console.error("Unknown number of aruguments");
    process.exit(1);
  }
}

main();

async function getHTML(url: string) {
  try {
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`HTTP error: ${res.status}`);
    }

    const html = await res.text();
    console.log(html);
  } catch (e) {
    console.error(`Error: `, e);
  }
}
