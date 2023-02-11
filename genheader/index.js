import fs from "fs";
import path from "path";

export function hexDump(binary, cols = 13) {
  return Array.from(binary)
    .map(
      (byte, i) =>
        `0x${byte.toString(16).padStart(2, "0")}${
          i % cols === cols - 1 ? ",\n" : ", "
        }`
    )
    .join("");
}

function generateHeader(stage) {
  const wasm = fs.readFileSync(path.join("build", `${stage}.wasm`));

  const header = `
    unsigned char wasm[] = {
      ${hexDump(wasm)}
    };
  `;

  fs.writeFileSync(path.join("src", `${stage}.wasm.h`), header);
}

console.log("Generating headers...");

generateHeader("debug");
generateHeader("release");

console.log("Done.");
