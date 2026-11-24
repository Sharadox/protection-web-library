import { mergeConfig } from "vitest/config";
import { defineLibraryTest } from "@sharadox/vitest-configuration-web-library/library-test";

// Each test starts its own Postgres in memory (PGlite), which takes a few seconds when many start at once.
export default mergeConfig(defineLibraryTest({ root: new URL("./", import.meta.url) }), {
  test: { testTimeout: 30_000 },
});
