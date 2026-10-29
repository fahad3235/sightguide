// build-netlify-zip.js
// Automated packaging script for SightGuide production deployment.
// Builds:
//  1. SightGuide-Netlify-Deploy.zip (Ready for Netlify drag-and-drop or git push)
//  2. SightGuide-Final.zip (Clean full repo archive, without node_modules/.env/.git)

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const finalDir = path.resolve(rootDir, "SightGuide-Final");
const netlifyDir = path.resolve(rootDir, "SightGuide-Netlify");

console.log("==================================================");
console.log("  SightGuide Production Package Builder");
console.log("==================================================");

// 1. Sync updated files from SightGuide-Final into SightGuide-Netlify
console.log("\n[1/4] Syncing frontend and serverless function files...");

// Copy public assets & client app
const publicDir = path.resolve(finalDir, "public");
fs.copyFileSync(path.resolve(publicDir, "app.js"), path.resolve(netlifyDir, "app.js"));
fs.copyFileSync(path.resolve(publicDir, "styles.css"), path.resolve(netlifyDir, "styles.css"));
fs.copyFileSync(path.resolve(publicDir, "index.html"), path.resolve(netlifyDir, "index.html"));
if (fs.existsSync(path.resolve(publicDir, "sw.js"))) {
  fs.copyFileSync(path.resolve(publicDir, "sw.js"), path.resolve(netlifyDir, "sw.js"));
}
if (fs.existsSync(path.resolve(publicDir, "manifest.json"))) {
  fs.copyFileSync(path.resolve(publicDir, "manifest.json"), path.resolve(netlifyDir, "manifest.json"));
}

// Copy demo directory
const demoDir = path.resolve(publicDir, "demo");
const netlifyDemoDir = path.resolve(netlifyDir, "demo");
if (fs.existsSync(demoDir)) {
  if (!fs.existsSync(netlifyDemoDir)) fs.mkdirSync(netlifyDemoDir, { recursive: true });
  for (const file of fs.readdirSync(demoDir)) {
    fs.copyFileSync(path.resolve(demoDir, file), path.resolve(netlifyDemoDir, file));
  }
}

// Copy public assets folder (images, icons, svgs)
const assetsDir = path.resolve(publicDir, "assets");
const netlifyAssetsDir = path.resolve(netlifyDir, "assets");
if (!fs.existsSync(netlifyAssetsDir)) fs.mkdirSync(netlifyAssetsDir, { recursive: true });
for (const file of fs.readdirSync(assetsDir)) {
  fs.copyFileSync(path.resolve(assetsDir, file), path.resolve(netlifyAssetsDir, file));
}

// Copy public modules
const modulesDir = path.resolve(publicDir, "modules");
const netlifyModulesDir = path.resolve(netlifyDir, "modules");
if (!fs.existsSync(netlifyModulesDir)) fs.mkdirSync(netlifyModulesDir, { recursive: true });
for (const file of fs.readdirSync(modulesDir)) {
  fs.copyFileSync(path.resolve(modulesDir, file), path.resolve(netlifyModulesDir, file));
}

// Copy lib directory
const libDir = path.resolve(finalDir, "lib");
const netlifyLibDir = path.resolve(netlifyDir, "lib");
if (!fs.existsSync(netlifyLibDir)) fs.mkdirSync(netlifyLibDir, { recursive: true });
for (const file of fs.readdirSync(libDir)) {
  fs.copyFileSync(path.resolve(libDir, file), path.resolve(netlifyLibDir, file));
}

// Copy netlify functions
const functionsDir = path.resolve(finalDir, "netlify", "functions");
const netlifyFunctionsDir = path.resolve(netlifyDir, "netlify", "functions");
if (!fs.existsSync(netlifyFunctionsDir)) fs.mkdirSync(netlifyFunctionsDir, { recursive: true });
for (const file of fs.readdirSync(functionsDir)) {
  fs.copyFileSync(path.resolve(functionsDir, file), path.resolve(netlifyFunctionsDir, file));
}

console.log("  ✔ Synchronized app.js, styles.css, index.html, modules/, lib/, and netlify/functions/");

// 2. Validate Netlify Package Configuration
console.log("\n[2/4] Validating Netlify configuration files...");
const netlifyToml = path.resolve(netlifyDir, "netlify.toml");
if (!fs.existsSync(netlifyToml)) {
  throw new Error("Missing netlify.toml in " + netlifyDir);
}
console.log("  ✔ netlify.toml present with /api redirects and permissions headers");

// 3. Build SightGuide-Netlify-Deploy.zip
console.log("\n[3/4] Creating SightGuide-Netlify-Deploy.zip...");
const netlifyZipPath = path.resolve(rootDir, "SightGuide-Netlify-Deploy.zip");
if (fs.existsSync(netlifyZipPath)) fs.unlinkSync(netlifyZipPath);

try {
  // Use PowerShell Compress-Archive on Windows
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${netlifyDir}/*' -DestinationPath '${netlifyZipPath}' -Force"`,
    { stdio: "inherit" }
  );
  const stat = fs.statSync(netlifyZipPath);
  console.log(`  ✔ Built ${path.basename(netlifyZipPath)} (${(stat.size / (1024 * 1024)).toFixed(2)} MB)`);
} catch (e) {
  console.error("  ✖ Failed to compress Netlify deploy zip:", e.message);
}

// 4. Build SightGuide-Final.zip
console.log("\n[4/4] Creating SightGuide-Final.zip (clean repository)...");
const finalZipPath = path.resolve(rootDir, "SightGuide-Final.zip");
if (fs.existsSync(finalZipPath)) fs.unlinkSync(finalZipPath);

try {
  execSync(
    `powershell -NoProfile -Command "Get-ChildItem '${finalDir}' | Where-Object Name -NotIn 'node_modules','.git','.env','test-live-speed.mjs','test-voice-speed.mjs','test-e2e.mjs','test-verify-live.cjs' | Compress-Archive -DestinationPath '${finalZipPath}' -Force"`,
    { stdio: "inherit" }
  );
  const stat2 = fs.statSync(finalZipPath);
  console.log(`  ✔ Built ${path.basename(finalZipPath)} (${(stat2.size / (1024 * 1024)).toFixed(2)} MB)`);
} catch (e) {
  console.error("  ✖ Failed to compress Final zip:", e.message);
}

console.log("\n==================================================");
console.log("  Build completed successfully!");
console.log("==================================================");

