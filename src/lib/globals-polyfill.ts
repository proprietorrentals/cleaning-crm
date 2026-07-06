/**
 * Polyfill for __dirname and __filename in Edge Runtime environments
 * This ensures compatibility with dependencies that may reference these globals
 */

export function setupGlobalsPolyfill() {
  if (typeof __dirname === "undefined") {
    try {
      const __filename = new URL(import.meta.url).pathname;
      const __dirnamePath = __filename.split("/").slice(0, -1).join("/");
      // @ts-ignore
      globalThis.__dirname = __dirnamePath;
    } catch (e) {
      // Silently fail if unable to setup polyfill
    }
  }

  if (typeof __filename === "undefined") {
    try {
      // @ts-ignore
      globalThis.__filename = new URL(import.meta.url).pathname;
    } catch (e) {
      // Silently fail if unable to setup polyfill
    }
  }
}

// Auto-run on import
setupGlobalsPolyfill();
