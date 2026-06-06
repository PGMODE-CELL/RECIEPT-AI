const { createReadStream, createWriteStream, readFileSync } = require("fs");
const { join, relative, sep } = require("path");
const { Readable } = require("stream");
const archiver = require("archiver");

const src = join(__dirname, "dist", "public");
const out = join(__dirname, "deploy.zip");

const output = createWriteStream(out);
const archive = archiver("zip", { zlib: { level: 9 } });

output.on("close", () => console.log(`Zip: ${archive.pointer()} bytes`));
archive.on("error", (err) => { throw err; });

archive.pipe(output);
archive.directory(src, false);
archive.finalize();
