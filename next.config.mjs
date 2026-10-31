import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const parent = new URL("../../package.json", import.meta.url);
const workspace =
  existsSync(parent) &&
  JSON.parse(readFileSync(parent, "utf8")).name === "headstarter-projects";
export default {
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  outputFileTracingRoot: fileURLToPath(
    new URL(workspace ? "../../" : ".", import.meta.url),
  ),
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
