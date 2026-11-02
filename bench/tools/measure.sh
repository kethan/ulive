#!/bin/bash
# usage: measure.sh <src/main.js> <label>
set -e
cd /home/user/ulive
cp "$1" src/main.js
npx rollup --config rollup.config.js --silent >/dev/null 2>&1
node -e '
const fs=require("fs"),z=require("zlib");
const label=process.argv[1]||"";
for(const [n,f] of [["ulive","dist/index.min.js"],["fn","fn/index.min.js"]]){
  const b=fs.readFileSync(f);
  console.log((label+" "+n).padEnd(30),"raw",String(b.length).padStart(5),"gzip",String(z.gzipSync(b).length).padStart(4),"brotli",String(z.brotliCompressSync(b).length).padStart(4));
}' "${2:-variant}"
