#!/usr/bin/env node
// @ts-check
import { mkdir, rm, writeFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "@svgr/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, "..");
const ICONS_DIR = join(PACKAGE_ROOT, "src", "components", "icons");
const SVG_DIR = join(ICONS_DIR, "svg");
const GENERATED_DIR = join(ICONS_DIR, "generated");
const BARREL_PATH = join(ICONS_DIR, "index.ts");

const FIGMA_API = "https://api.figma.com/v1";

// Figma 上のアイコン Component Set の名前。Figma 側でリネームしたらここも合わせる。
const FIGMA_ICONS_NAME = "Icon";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(
      `[sync-icons] 環境変数 ${name} が未設定です。packages/design-system/src/components/icons/README.md を参照してください。`,
    );
    process.exit(1);
  }
  return value;
}

const FIGMA_TOKEN = requireEnv("FIGMA_TOKEN");
const FIGMA_FILE_KEY = requireEnv("FIGMA_FILE_KEY");

async function figmaGet(path) {
  const res = await fetch(`${FIGMA_API}${path}`, {
    headers: { "X-Figma-Token": FIGMA_TOKEN },
  });
  if (!res.ok) {
    throw new Error(`Figma API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

function findComponentSetByName(node, targetName) {
  if (!node) return null;
  if (node.type === "COMPONENT_SET" && node.name === targetName) {
    return node;
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      const found = findComponentSetByName(child, targetName);
      if (found) return found;
    }
  }
  return null;
}

function collectVariants(componentSet) {
  return (componentSet.children ?? [])
    .filter((c) => c.type === "COMPONENT")
    .map((c) => ({ id: c.id, name: c.name }));
}

function stripVariantProperties(name) {
  if (!name.includes("=")) return name;
  return name
    .split(",")
    .map((part) => {
      const idx = part.indexOf("=");
      return idx >= 0 ? part.slice(idx + 1) : part;
    })
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");
}

function toKebabCase(name) {
  return stripVariantProperties(name)
    .replace(/^icon[\s/_-]+/i, "")
    .replace(/[\s/_]+/g, "-")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .toLowerCase()
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function toPascalCase(kebab) {
  return kebab
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

const svgrTemplate = (variables, { tpl }) => {
  return tpl`
${variables.imports};
import type { IconProps } from "../Icon.types";

const ${variables.componentName} = ({ size = "1em", ...props }: IconProps) => (
  ${variables.jsx}
);

${variables.exports};
`;
};

async function svgToTsx(svgString, componentName) {
  return transform(
    svgString,
    {
      plugins: ["@svgr/plugin-svgo", "@svgr/plugin-jsx"],
      typescript: true,
      icon: true,
      svgo: true,
      svgoConfig: {
        plugins: [
          {
            name: "preset-default",
            params: { overrides: { removeViewBox: false } },
          },
        ],
      },
      replaceAttrValues: {
        "#000": "currentColor",
        "#000000": "currentColor",
        black: "currentColor",
      },
      svgProps: {
        width: "{size}",
        height: "{size}",
      },
      expandProps: "end",
      template: svgrTemplate,
      jsxRuntime: "automatic",
    },
    { componentName },
  );
}

async function ensureCleanDir(dir) {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
}

async function listExisting(dir) {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
}

async function main() {
  console.log(`[sync-icons] Figma file: ${FIGMA_FILE_KEY}`);
  console.log(`[sync-icons] target component set: "${FIGMA_ICONS_NAME}"`);

  const previousSvgs = new Set(
    (await listExisting(SVG_DIR)).filter((f) => f.endsWith(".svg")),
  );
  const previousTsx = new Set(
    (await listExisting(GENERATED_DIR)).filter((f) => f.endsWith(".tsx")),
  );

  const file = await figmaGet(`/files/${FIGMA_FILE_KEY}?depth=4`);
  const componentSet = findComponentSetByName(file.document, FIGMA_ICONS_NAME);
  if (!componentSet) {
    console.error(
      `[sync-icons] component set "${FIGMA_ICONS_NAME}" が見つかりません。`,
    );
    process.exit(1);
  }

  const components = collectVariants(componentSet);
  if (components.length === 0) {
    console.error(`[sync-icons] component set "${FIGMA_ICONS_NAME}" 配下にバリアントがありません。`);
    process.exit(1);
  }

  const seen = new Map();
  for (const c of components) {
    const kebab = toKebabCase(c.name);
    if (!kebab) {
      console.error(`[sync-icons] 名前を正規化できないコンポーネント: "${c.name}"`);
      process.exit(1);
    }
    if (seen.has(kebab)) {
      console.error(
        `[sync-icons] 名前衝突: "${c.name}" と "${seen.get(kebab)}" がどちらも "${kebab}" になります。`,
      );
      process.exit(1);
    }
    seen.set(kebab, c.name);
  }

  const ids = components.map((c) => c.id).join(",");
  const images = await figmaGet(
    `/images/${FIGMA_FILE_KEY}?ids=${encodeURIComponent(ids)}&format=svg`,
  );
  if (images.err) {
    throw new Error(`Figma images error: ${images.err}`);
  }

  await ensureCleanDir(SVG_DIR);
  await ensureCleanDir(GENERATED_DIR);

  const exportLines = [];
  const results = await Promise.all(
    components.map(async (c) => {
      const url = images.images[c.id];
      if (!url) throw new Error(`Figma が ${c.name} の画像URLを返しませんでした`);
      const svgRes = await fetch(url);
      if (!svgRes.ok) throw new Error(`SVG fetch failed for ${c.name}: ${svgRes.status}`);
      const svgString = await svgRes.text();

      const kebab = toKebabCase(c.name);
      const pascal = toPascalCase(kebab);
      const componentName = `${pascal}Icon`;

      await writeFile(join(SVG_DIR, `${kebab}.svg`), svgString, "utf8");

      const tsx = await svgToTsx(svgString, componentName);
      await writeFile(join(GENERATED_DIR, `${componentName}.tsx`), tsx, "utf8");

      return { kebab, componentName };
    }),
  );

  results.sort((a, b) => a.componentName.localeCompare(b.componentName));
  for (const { componentName } of results) {
    exportLines.push(`export { default as ${componentName} } from "./generated/${componentName}";`);
  }
  await writeFile(BARREL_PATH, exportLines.join("\n") + "\n", "utf8");

  const newSvgs = new Set(results.map((r) => `${r.kebab}.svg`));
  const newTsx = new Set(results.map((r) => `${r.componentName}.tsx`));
  const added = [...newTsx].filter((f) => !previousTsx.has(f));
  const removed = [...previousTsx].filter((f) => !newTsx.has(f));
  const updated = [...newTsx].filter((f) => previousTsx.has(f));

  console.log(`[sync-icons] done: ${results.length} icons`);
  console.log(`  added:   ${added.length}`);
  console.log(`  updated: ${updated.length}`);
  console.log(`  removed: ${removed.length}`);
  if (added.length) console.log(`    + ${added.join(", ")}`);
  if (removed.length) console.log(`    - ${removed.join(", ")}`);
  void previousSvgs;
  void newSvgs;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
