#!/usr/bin/env node
import { readCatalog, resolveContent } from './lib/content.mjs';

const catalog = readCatalog();
for (const [type, entry] of Object.entries(catalog.types)) {
  console.log(`\n${entry.label} (${type})`);
  for (const format of Object.keys(entry.formats)) {
    const { recipe } = resolveContent({ type, format }, catalog);
    console.log(`  ${format}: ${recipe.label}\n    ${recipe.structure.join(' → ')}`);
  }
}
