// Lets `node --test` import the app's TypeScript modules directly: Node 24
// strips the types, and this resolves the three things Next resolves for us —
// the `@/` alias, extensionless relative imports and JSON imports. No dependency.
//   node --import ./tests/register.mjs --test "tests/*.test.mjs"
import { registerHooks } from "node:module";

const ROOT = new URL("../", import.meta.url).href;

registerHooks({
  resolve(specifier, context, next) {
    const spec = specifier.startsWith("@/") ? ROOT + specifier.slice(2) : specifier;
    const withJson = (s) => {
      const r = next(s, context);
      return s.endsWith(".json") ? { ...r, importAttributes: { type: "json" } } : r;
    };
    try {
      return withJson(spec);
    } catch (err) {
      // A package subpath without an exports map (next/server) needs its .js.
      if (/^[a-z][\w.-]*\/[\w/-]+$/i.test(spec)) {
        try {
          return withJson(spec + ".js");
        } catch {
          // fall through
        }
      }
      if (/^(\.{1,2}\/|file:)/.test(spec)) {
        for (const ext of [".ts", ".tsx"]) {
          try {
            return withJson(spec + ext);
          } catch {
            // try the next extension
          }
        }
      }
      throw err;
    }
  },
});
