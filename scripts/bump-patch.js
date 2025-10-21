#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, '../package.json');

// Read current package.json
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

// Parse current version and bump patch
const [major, minor, patch] = packageJson.version.split('.').map(Number);
const newVersion = `${major}.${minor}.${patch + 1}`;

// Update package.json
packageJson.version = newVersion;
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`Version bumped to ${newVersion}`);
