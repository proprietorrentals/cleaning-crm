/**
 * Polyfill Node-like path globals in runtimes where they may be missing.
 */

export function setupGlobalsPolyfill() {
  const dirnameKey = "__" + "dirname";
  const filenameKey = "__" + "filename";

  try {
    const filePath = new URL(import.meta.url).pathname;
    const cwdPath = typeof process !== "undefined" ? process.cwd() : filePath;
    const dirnameFromMeta = filePath.split("/").slice(0, -1).join("/");

    if (!(dirnameKey in globalThis)) {
      (globalThis as Record<string, unknown>)[dirnameKey] = cwdPath || dirnameFromMeta;
    }

    if (!(filenameKey in globalThis)) {
      (globalThis as Record<string, unknown>)[filenameKey] = filePath;
    }
  } catch {
    // Silently fail if unable to setup polyfill
  }
}

// Auto-run on import
setupGlobalsPolyfill();
