import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const extensionRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = join(extensionRoot, "dist");

const files = [
  "manifest.json",
  "popup.html",
  "sidepanel.html",
  "src/background.js",
  "src/config.js",
  "src/contentScript.js",
  "src/popup.js",
  // Resolves the server address and the token. background.js importScripts it
  // and both pages load it, so leaving it out of this list ships a dist/ that
  // throws "QuickVoiceServer is not defined" on every call.
  "src/server.js",
  "src/sidepanel.js",
];

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
await cp(join(extensionRoot, "assets"), join(outputRoot, "assets"), { recursive: true });

for (const relativePath of files) {
  const destination = join(outputRoot, relativePath);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, await readFile(join(extensionRoot, relativePath)));
}

console.log(`Built QuickVoice Companion extension at ${outputRoot}`);
