import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { relative, resolve } from "node:path";

const buildEnv = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "verification-anon-key",
  SUPABASE_SERVICE_ROLE_KEY:
    process.env.SUPABASE_SERVICE_ROLE_KEY || "verification-service-key",
};

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const commands = [
  [npmCommand, ["--prefix", "packages/shared", "run", "build"]],
  [npmCommand, ["--prefix", "apps/web", "run", "build"]],
];

for (const [command, args] of commands) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: buildEnv,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const root = process.cwd();
const nextOutput = resolve(root, "apps/web/.next");
const dist = resolve(root, "dist");

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(resolve(nextOutput, "static"), resolve(dist, "_next/static"), {
  recursive: true,
});
const publicOutput = resolve(root, "apps/web/public");
for (const entry of readdirSync(publicOutput)) {
  cpSync(resolve(publicOutput, entry), resolve(dist, entry), { recursive: true });
}

const appOutput = resolve(nextOutput, "server/app");
function stageRenderedPages(sourceDir) {
  for (const entry of readdirSync(sourceDir)) {
    const sourcePath = resolve(sourceDir, entry);
    const metadata = statSync(sourcePath);
    if (metadata.isDirectory()) {
      stageRenderedPages(sourcePath);
      continue;
    }
    if (!entry.endsWith(".html")) continue;
    const route = relative(appOutput, sourcePath)
      .replaceAll("\\", "/")
      .replace(/^_not-found\.html$/, "404.html");
    const target = resolve(dist, route);
    mkdirSync(resolve(target, ".."), { recursive: true });
    cpSync(sourcePath, target);
  }
}
stageRenderedPages(appOutput);

mkdirSync(resolve(dist, ".openai"), { recursive: true });
cpSync(
  resolve(root, ".openai/hosting.json"),
  resolve(dist, ".openai/hosting.json"),
);
mkdirSync(resolve(dist, "server"), { recursive: true });
writeFileSync(
  resolve(dist, "server/index.js"),
  'const html = (path) => path === "/" ? "/index.html" : `${path.replace(/\\/$/, "")}.html`;\n' +
    'const asset = (request, env, path) => env.ASSETS.fetch(new Request(new URL(path, request.url), request));\n' +
    'export default {\n' +
    '  async fetch(request, env) {\n' +
    '    const url = new URL(request.url);\n' +
    '    if (url.pathname.startsWith("/_next/") || url.pathname.includes(".")) return asset(request, env, url.pathname);\n' +
    '    const direct = await asset(request, env, html(url.pathname));\n' +
    '    return direct.status === 404 ? asset(request, env, "/404.html") : direct;\n' +
    '  },\n' +
    '};\n',
  "utf8",
);
