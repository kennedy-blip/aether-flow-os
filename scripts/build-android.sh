#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
rm -f public/releases/aetherflow-release.apk public/releases/manifest.json
npm run build
npx cap sync android
(cd android && ./gradlew --no-daemon assembleDebug)
cp android/app/build/outputs/apk/debug/app-debug.apk public/releases/aetherflow-release.apk
node --input-type=module <<'JS'
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const bytes=readFileSync('public/releases/aetherflow-release.apk');
writeFileSync('public/releases/manifest.json',JSON.stringify({version:'v1.0.0-universal (debug signed)',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()},null,2));
JS
npm run build
