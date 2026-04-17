/**
 * Preview Generator for Full App Builder
 * Creates previewable HTML from generated multi-file projects.
 * Bundles all React/Next.js components into a single runnable HTML page.
 */

export interface PreviewOptions {
  files: { [path: string]: string };
  framework: string;
  projectName: string;
}

export function generatePreviewHTML(options: PreviewOptions): string {
  const { files, framework, projectName } = options;

  const entryPoint = findEntryPoint(files, framework);
  
  if (!entryPoint) {
    return createErrorPreview('No entry point found');
  }

  switch (framework) {
    case 'nextjs':
      return generateNextJSPreview(files, entryPoint, projectName);
    case 'react':
      return generateReactPreview(files, entryPoint, projectName);
    case 'vue':
      return generateVuePreview(files, entryPoint, projectName);
    default:
      return generateVanillaPreview(files, entryPoint, projectName);
  }
}

function findEntryPoint(files: { [path: string]: string }, framework: string): string | null {
  const entryPoints = [
    'app/page.js', 'app/page.jsx', 'app/page.tsx', 'app/page.ts',
    'src/App.js', 'src/App.jsx', 'src/App.tsx',
    'src/main.js', 'src/main.jsx',
    'pages/index.js', 'pages/index.jsx',
    'index.html', 'public/index.html',
  ];

  for (const entry of entryPoints) {
    if (files[entry]) return entry;
  }

  for (const path in files) {
    if (path.endsWith('.html') || files[path].includes('<!DOCTYPE')) return path;
  }

  for (const path in files) {
    if (path.includes('page.') || path.includes('App.') || path.includes('index.')) return path;
  }

  return null;
}

/**
 * Collects all React component files and inlines them into a single script.
 * Resolves import paths to match component definitions.
 */
function collectComponentCode(files: { [path: string]: string }): string {
  const componentFiles: { path: string; code: string }[] = [];
  const processedPaths = new Set<string>();
  
  // Build an import-name → component-code map
  const componentMap = new Map<string, string>();
  
  for (const [path, content] of Object.entries(files)) {
    if (!path.match(/\.(jsx?|tsx?)$/)) continue;
    if (path === 'package.json' || path.endsWith('.config.js') || path.endsWith('.config.ts')) continue;
    if (path.includes('node_modules')) continue;
    if (path.startsWith('app/api/')) continue; // API routes run on server, not in preview
    if (processedPaths.has(path)) continue;
    processedPaths.add(path);
    
    let code = content;
    
    // Strip directives
    code = code.replace(/['"]use client['"];?\s*/g, '');
    code = code.replace(/['"]use server['"];?\s*/g, '');
    
    // Strip all import statements (we'll inline everything)
    code = code.replace(/^import\s+.*?(?:from\s+['"].*?['"])?;?\s*$/gm, '');
    
    // Strip export default and export keywords but keep the function/const
    code = code.replace(/export\s+default\s+/g, '');
    code = code.replace(/export\s+(?=function|const|class|let|var)/g, '');
    
    // Strip TypeScript type annotations (basic)
    code = code.replace(/:\s*(?:React\.)?(?:FC|FunctionComponent|ReactNode|JSX\.Element|string|number|boolean|any|void|null|undefined)(?:<[^>]*>)?/g, '');
    code = code.replace(/interface\s+\w+\s*{[^}]*}/g, '');
    code = code.replace(/type\s+\w+\s*=\s*[^;]+;/g, '');
    
    if (code.trim()) {
      componentFiles.push({ path, code: `// --- ${path} ---\n${code}` });
    }
  }
  // Order: lib/ first (utils, data, api), then components, then app (so dependencies resolve)
  componentFiles.sort((a, b) => {
    const order = (p: string) => p.startsWith('lib/') ? 0 : p.startsWith('components/') ? 1 : 2;
    return order(a.path) - order(b.path) || a.path.localeCompare(b.path);
  });
  return componentFiles.map(x => x.code).join('\n\n');
}

function generateNextJSPreview(
  files: { [path: string]: string },
  entryPoint: string,
  projectName: string
): string {
  // Collect all CSS
  const cssFiles: string[] = [];
  for (const [path, content] of Object.entries(files)) {
    if (path.endsWith('.css')) {
      const cleaned = content
        .replace(/@tailwind\s+.*?;/g, '')
        .replace(/@apply\s+[\w\s-/]+;/g, '')
        .replace(/@import\s+.*?;/g, '');
      cssFiles.push(`/* ${path} */\n${cleaned}`);
    }
  }
  
  const hasTailwind = Object.keys(files).some(p => p.includes('tailwind.config'));
  const allCSS = cssFiles.join('\n');
  const allComponentCode = collectComponentCode(files);

  // Find the layout component for wrapping
  const layoutPath = Object.keys(files).find(p => p.includes('layout.'));
  let layoutCode = '';
  if (layoutPath && files[layoutPath]) {
    let lc = files[layoutPath];
    lc = lc.replace(/['"]use client['"];?\s*/g, '');
    lc = lc.replace(/^import\s+.*?(?:from\s+['"].*?['"])?;?\s*$/gm, '');
    lc = lc.replace(/export\s+(?:const\s+)?metadata\s*=\s*{[^}]*};?\s*/g, '');
    const layoutMatch = lc.match(/(?:export\s+default\s+)?function\s+(\w+)\s*\([^)]*\)\s*{([\s\S]*)$/);
    if (layoutMatch) {
      layoutCode = `function RootLayout({ children }) {${layoutMatch[2]}`;
      // Replace {children} reference to render the page
      layoutCode = layoutCode.replace(/{children}/g, '{children}');
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName} - Preview</title>
  ${hasTailwind ? '<script src="https://cdn.tailwindcss.com"></script>' : ''}
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/framer-motion@10/dist/framer-motion.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; }
    ${allCSS}
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-type="module">
    const { useState, useEffect, useRef, useCallback, useMemo, useContext, createContext, Fragment } = React;

    // Stub Next.js specific APIs
    const useRouter = () => ({ push: (p) => { window.location.hash = p; }, back: () => window.history.back(), pathname: window.location.hash.slice(1) || '/' });
    const usePathname = () => window.location.hash.slice(1) || '/';
    const useSearchParams = () => new URLSearchParams(window.location.search);
    const Link = ({ href, children, ...props }) => React.createElement('a', { href: href || '#', ...props }, children);
    const Image = ({ src, alt, width, height, ...props }) => React.createElement('img', { src, alt, width, height, style: { maxWidth: '100%', height: 'auto' }, ...props });
    const motion = (typeof Motion !== 'undefined' && Motion.motion) ? Motion.motion : (() => {
      const m = (tag) => (props) => React.createElement(tag || 'div', props);
      return new Proxy(m, { get: (_, k) => m(k) });
    })();

    ${allComponentCode}

    try {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      // Try to find and render the page component
      const PageComponent = typeof Page !== 'undefined' ? Page
        : typeof Home !== 'undefined' ? Home
        : typeof App !== 'undefined' ? App
        : typeof Index !== 'undefined' ? Index
        : typeof Main !== 'undefined' ? Main
        : null;

      if (PageComponent) {
        ${layoutCode ? `
        root.render(React.createElement(RootLayout, null, React.createElement(PageComponent)));
        ` : `
        root.render(React.createElement(PageComponent));
        `}
      } else {
        root.render(React.createElement('div', {
          style: { padding: '40px', textAlign: 'center', fontFamily: 'sans-serif', color: '#888' }
        }, 'No renderable component found. Check the generated code.'));
      }
    } catch (err) {
      document.getElementById('root').innerHTML = '<div style="padding:40px;text-align:center;color:#ff4444;font-family:sans-serif"><h2>Preview Error</h2><pre style="text-align:left;max-width:600px;margin:20px auto;padding:20px;background:#1a1a1a;color:#ff8888;border-radius:8px;overflow:auto">' + (err?.message || err) + '</pre></div>';
    }
  </script>
</body>
</html>`;
}

function generateReactPreview(
  files: { [path: string]: string },
  entryPoint: string,
  projectName: string
): string {
  const cssFiles: string[] = [];
  for (const [path, content] of Object.entries(files)) {
    if (path.endsWith('.css')) {
      cssFiles.push(content.replace(/@tailwind\s+.*?;/g, '').replace(/@apply\s+[\w\s-/]+;/g, ''));
    }
  }
  
  const allComponentCode = collectComponentCode(files);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName} - Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    ${cssFiles.join('\n')}
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } = React;

    ${allComponentCode}

    try {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      const AppComponent = typeof App !== 'undefined' ? App : typeof Page !== 'undefined' ? Page : typeof Home !== 'undefined' ? Home : null;
      if (AppComponent) {
        root.render(React.createElement(AppComponent));
      }
    } catch (err) {
      void err;
    }
  </script>
</body>
</html>`;
}

function generateVuePreview(
  files: { [path: string]: string },
  entryPoint: string,
  projectName: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName} - Preview</title>
  <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="app"></div>
  <script>
    ${files[entryPoint]}
  </script>
</body>
</html>`;
}

function generateVanillaPreview(
  files: { [path: string]: string },
  entryPoint: string,
  projectName: string
): string {
  const content = files[entryPoint];
  
  if (content.includes('<!DOCTYPE') || content.includes('<html')) {
    return content;
  }
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName} - Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  ${content}
</body>
</html>`;
}

function createErrorPreview(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview Error</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; background: #1a1a1a; color: #fff;
      text-align: center; padding: 20px;
    }
    .error-box { background: #2a2a2a; padding: 40px; border-radius: 12px; border: 2px solid #ff4444; max-width: 600px; }
    h1 { color: #ff4444; margin-bottom: 16px; }
    p { color: #ccc; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="error-box">
    <h1>Preview Unavailable</h1>
    <p>${message}</p>
    <p style="margin-top: 20px; font-size: 14px; color: #888;">
      The generated code will be available in the downloaded ZIP file.
    </p>
  </div>
</body>
</html>`;
}
