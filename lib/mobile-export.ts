/**
 * Mobile (App Store / Play Store) export helpers.
 * Adds Capacitor config and static export support for iOS/Android publishing.
 */

const APP_ID_PLACEHOLDER = 'com.yourcompany.yourapp';
const APP_NAME_PLACEHOLDER = 'My App';

export function getCapacitorConfigJson(projectName: string): string {
  const appId = APP_ID_PLACEHOLDER.replace('yourapp', projectName.toLowerCase().replace(/\s+/g, ''));
  const appName = projectName || APP_NAME_PLACEHOLDER;
  return JSON.stringify(
    {
      appId,
      appName,
      webDir: 'out',
      server: {
        androidScheme: 'https',
      },
    },
    null,
    2
  );
}

export function getMobilePublishingReadme(projectName: string): string {
  return `# Publish "${projectName}" to App Store & Play Store

This project is ready to be wrapped as iOS and Android apps using Capacitor.

## Quick steps

1. **Install dependencies and build**
   \`\`\`bash
   npm install
   npm run build
   \`\`\`

2. **Add Capacitor**
   \`\`\`bash
   npm install @capacitor/core @capacitor/cli
   npx cap init
   npx cap add ios
   npx cap add android
   \`\`\`
   When prompted, set **web asset directory** to \`out\`.

3. **Sync and open**
   \`\`\`bash
   npx cap sync
   npx cap open ios    # Mac + Xcode required
   npx cap open android
   \`\`\`

4. **Publish**
   - **iOS**: Apple Developer Program ($99/yr), then Archive in Xcode and upload to App Store Connect.
   - **Android**: Google Play Console ($25 one-time), then build signed bundle in Android Studio and upload.

For the full step-by-step guide (accounts, signing, store listing), see:
**Draftly docs**: \`docs/APP-STORE-PLAY-STORE-PUBLISHING.md\`
**Capacitor**: https://capacitorjs.com/docs
`;
}

/**
 * Ensure next.config.js has output: 'export' for static export (required for Capacitor).
 * Patches in place if missing; leaves content unchanged if already present.
 */
export function ensureNextStaticExport(nextConfigContent: string): string {
  if (!nextConfigContent || typeof nextConfigContent !== 'string') {
    return nextConfigContent;
  }
  if (/output\s*:\s*['"]export['"]/.test(nextConfigContent)) {
    return nextConfigContent;
  }
  // Try to add output: 'export' to the config object
  // Match module.exports = { ... } or const nextConfig = { ... }; module.exports = nextConfig
  const withExport = nextConfigContent.replace(
    /(const nextConfig\s*=\s*\{)\s*/,
    "$1\n  output: 'export',\n  "
  );
  if (withExport !== nextConfigContent) return withExport;
  return nextConfigContent.replace(
    /(module\.exports\s*=\s*\{)\s*/,
    "$1\n  output: 'export',\n  "
  );
}
