import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { setTimeout } from 'node:timers/promises';

const sha = process.env.VERCEL_GIT_COMMIT_SHA;
if (!/^[a-f0-9]{40}$/.test(sha ?? '') || process.env.VERCEL_ENV !== 'production') process.exit(0);
const release = `https://github.com/kennedy-blip/aether-flow-os/releases/download/android-${sha}`;
for (let attempt = 0; attempt < 30; attempt++) {
  const manifestResponse = await fetch(`${release}/manifest.json`, { signal: AbortSignal.timeout(15000) }).catch(() => null);
  if (manifestResponse?.ok) {
    const manifest = await manifestResponse.json();
    if (manifest.commit !== sha) throw new Error('Android manifest has the wrong source commit');
    const response = await fetch(`${release}/aetherflow-release.apk`, { signal: AbortSignal.timeout(60000) });
    if (response.ok) {
      const apk = Buffer.from(await response.arrayBuffer());
      if (apk.length !== manifest.bytes || createHash('sha256').update(apk).digest('hex') !== manifest.sha256) throw new Error('Android artifact integrity check failed');
      writeFileSync('public/releases/aetherflow-release.apk', apk);
      writeFileSync('public/releases/manifest.json', JSON.stringify(manifest));
      console.log(`Bundled verified Android build for ${sha}`);
      process.exit(0);
    }
  }
  console.log(`Waiting for Android build (${attempt + 1}/30)`);
  if (attempt < 29) await setTimeout(15000);
}
throw new Error('Android release has not been published for this commit. Check GitHub Actions and redeploy after it passes.');
