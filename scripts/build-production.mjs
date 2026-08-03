import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

const buildEnv = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "verification-anon-key",
  SUPABASE_SERVICE_ROLE_KEY:
    process.env.SUPABASE_SERVICE_ROLE_KEY || "verification-service-key",
};

const commands = [
  ["npm", ["--prefix", "packages/shared", "run", "build"]],
  ["npm", ["--prefix", "apps/web", "run", "build"]],
];

for (const [command, args] of commands) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: buildEnv,
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const root = process.cwd();
const standalone = resolve(root, "apps/web/.next/standalone");
const dist = resolve(root, "dist");

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
const copyResult = spawnSync("cp", ["-aL", `${standalone}/.`, `${dist}/`], {
  cwd: root,
  env: buildEnv,
  stdio: "inherit",
});
if (copyResult.error) throw copyResult.error;
if (copyResult.status !== 0) process.exit(copyResult.status ?? 1);
cpSync(resolve(root, "apps/web/public"), resolve(dist, "apps/web/public"), {
  recursive: true,
});
mkdirSync(resolve(dist, ".openai"), { recursive: true });
cpSync(
  resolve(root, ".openai/hosting.json"),
  resolve(dist, ".openai/hosting.json"),
);
mkdirSync(resolve(dist, "server"), { recursive: true });
cpSync(
  resolve(dist, "apps/web/server.js"),
  resolve(dist, "server/server.cjs"),
);
writeFileSync(
  resolve(dist, "server/index.js"),
  'import { createRequire } from "node:module";\n' +
  'import { existsSync } from "node:fs";\n' +
    'import { resolve } from "node:path";\n' +
    'const cwd = resolve(process.cwd());\n' +
    'const distRoot = existsSync(`${cwd}/dist/server/server.cjs`) ? `${cwd}/dist` : cwd;\n' +
    'globalThis.require = createRequire(`${distRoot}/server/index.js`);\n' +
    'globalThis.__dirname = `${distRoot}/apps/web`;\n' +
    'await import("./server.cjs");\n',
  "utf8",
);
