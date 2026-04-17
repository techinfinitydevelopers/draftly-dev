import { generateApiEasyText } from '@/lib/api-easy-studio';
import { getFullAppTextModelCandidates, shouldTryNextFullAppModel } from '@/lib/full-app-api-models';

export interface ProjectFile {
  path: string;
  content: string;
  type: 'file' | 'directory';
}

export interface GeneratedProject {
  files: ProjectFile[];
  framework: string;
  projectName: string;
  packageJson?: any;
  validation?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  };
  modelUsed?: string;
  tokensUsed?: { input: number; output: number };
}

export async function generateFullApp(
  prompt: string,
  framework: 'react' | 'nextjs' | 'vue' | 'vanilla' = 'nextjs',
  projectName: string = 'my-app',
  customApiKey?: string,
  theme?: string,
  colorScheme?: string
): Promise<GeneratedProject> {
  const models = getFullAppTextModelCandidates();
  if (!models.length) {
    throw new Error('No text models configured for full-app generation.');
  }

  let lastError: unknown = null;
  for (const modelId of models) {
    try {
      console.log(`[full-app] Trying model: ${modelId}`);
      const result = await generateWithModel(modelId, prompt, framework, projectName, theme, colorScheme);
      result.modelUsed = modelId;
      return result;
    } catch (error: unknown) {
      lastError = error;
      const msg = String((error as { message?: string })?.message || error || '');
      console.error(`[full-app] Model ${modelId} failed:`, msg);
      if (shouldTryNextFullAppModel(error)) {
        continue;
      }
      throw error instanceof Error ? error : new Error(msg || 'Full app generation failed');
    }
  }

  const lastMsg = String((lastError as { message?: string })?.message || lastError || 'Unknown error');
  throw new Error(
    `All configured models failed (tried ${models.join(', ')}). Last error: ${lastMsg}`,
  );
}

async function generateWithModel(
  modelName: string,
  prompt: string,
  framework: string,
  projectName: string,
  theme?: string,
  colorScheme?: string
): Promise<GeneratedProject> {
  
  const frameworkConfig = getFrameworkConfig(framework, projectName);
  
  let designSystemPrompt = '';
  if (theme && colorScheme) {
    const { generateDesignSystem, designSystemToPrompt } = await import('./design-system');
    const designSystem = generateDesignSystem(theme, colorScheme);
    designSystemPrompt = designSystemToPrompt(designSystem);
  }
  
  const systemPrompt = `You are an elite full-stack developer building production-grade applications like Lovable, Replit, or Vercel. Generate a COMPLETE, END-TO-END functional application that feels like a million-dollar SaaS product — NOT generic AI slop.

═══════════════════════════════════════════════════════════════
PRIMARY USER REQUEST — IMPLEMENT THIS EXACTLY (do not ignore or replace with a generic template)
═══════════════════════════════════════════════════════════════
${prompt}

REPEAT CHECK: Every page, feature, label, flow, and piece of copy visible in the app must reflect the PRIMARY USER REQUEST above. If they named a product, business, or niche, use those real names everywhere—not placeholders like "My App" unless they asked for a generic demo.

PROJECT NAME: ${projectName}
FRAMEWORK: ${frameworkConfig.name}
${designSystemPrompt ? `\n${designSystemPrompt}\n` : ''}

${frameworkConfig.structure}

═══════════════════════════════════════════════════════════════
CRITICAL REQUIREMENTS — LOVABLE/REPLIT QUALITY
═══════════════════════════════════════════════════════════════

1. FOLDER STRUCTURE (strict hierarchy):
   app/
     layout.js          — Root layout, fonts, metadata
     page.js            — Home/landing
     globals.css        — Tailwind + custom CSS variables
     [feature]/page.js   — Feature routes (e.g. dashboard, settings)
     api/               — API route handlers (see below)
       [resource]/route.js
   components/
     ui/                — Reusable primitives (Button, Card, Input)
     layout/            — Header, Footer, Sidebar
     [feature]/         — Feature-specific components
   lib/
     utils.js           — Helper functions
     data.js            — Mock data / in-memory store (CRUD-ready)
     api.js             — fetch wrappers for API calls
   hooks/
     useLocalStorage.js — Custom hooks if needed
   types/               — TypeScript types if using .tsx (optional)

2. BACKEND / API ROUTES (Next.js Route Handlers):
   - For CRUD, forms, or data: create app/api/[resource]/route.js
   - Export GET, POST, PUT, PATCH, DELETE handlers
   - Use in-memory store in lib/data.js (array/object) — no real DB
   - Example: app/api/tasks/route.js with GET (list), POST (create)
   - Frontend: create lib/api.js with fetch wrappers (getTasks, createTask, etc.)
   - PREVIEW FALLBACK: When fetch fails (static preview has no server), fall back to lib/data.js:
     try { const r = await fetch('/api/tasks'); return await r.json(); } catch { return getMockDataFromLib(); }

3. PROFESSIONAL UI — NO AI SLOP:
   - Distinctive design: avoid generic purple gradients, Inter font overload
   - Micro-interactions: hover states, focus rings, loading skeletons
   - Animations: use CSS transitions (transition, transform) or add framer-motion
   - Loading states: skeleton loaders, spinners for async actions
   - Error states: inline validation, toast-style feedback
   - Empty states: friendly "No items yet" with clear CTAs
   - Responsive: mobile-first, breakpoints for tablet/desktop

4. REAL FUNCTIONALITY:
   - Forms: validation, submit handlers, loading/error states
   - Navigation: Next.js Link, active states, mobile menu
   - Data flow: fetch from API routes, update UI on success
   - Lists: filter, sort, pagination if applicable
   - No placeholders: every button, link, form must DO something

5. STYLING (Tailwind):
   - CSS variables in globals.css for theme (--primary, --background)
   - Consistent spacing scale (p-4, gap-6, etc.)
   - Rounded corners, subtle shadows, borders
   - Use <img> and <a> (NOT Next.js Image/Link for compatibility)

6. ASSETS:
   - Placeholders: https://via.placeholder.com/800x600/1a1a2e/eee?text=Image
   - Unsplash: https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=600&fit=crop

7. Next.js:
   - 'use client' only where needed (hooks, event handlers)
   - Server components by default
   - Proper app/ routing

OUTPUT FORMAT — for EVERY file:

FILE: path/to/file.ext
CODE:
[complete file content — NO markdown backticks, NO explanations]

FILE: another/file.ext
CODE:
[complete file content]

MINIMUM FILES:
- package.json (include tailwindcss, postcss, autoprefixer; add framer-motion if animations)
- next.config.js, tailwind.config.js, postcss.config.js, tsconfig.json
- app/layout.js, app/page.js, app/globals.css
- components/ui/ (at least Button, Card, Input)
- components/layout/Header.jsx, Footer.jsx
- 3+ feature components in components/
- lib/utils.js, lib/data.js (mock data store)
- app/api/ route(s) if the app needs CRUD or form submission
- .gitignore, README.md`;

  let text: string;
  try {
    text = await generateApiEasyText({
      prompt: systemPrompt,
      model: modelName,
      maxTokens: 40000,
      temperature: 0.7,
    });
  } catch (e: any) {
    throw new Error(`Model returned no content. ${e?.message || 'Try a different prompt.'}`);
  }
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Model returned empty response. Please try again with a more specific prompt.');
  }

  const files = parseFilesFromResponse(text, frameworkConfig);
  if (!files.length) {
    throw new Error('Could not parse any files from the model response. Please try again with a clearer prompt.');
  }

  const { validateProject } = await import('./code-validator');
  const fileMap: { [path: string]: string } = {};
  files.forEach(f => {
    fileMap[f.path] = f.content;
  });
  
  const validation = validateProject(fileMap);
  
  if (!validation.isValid) {
    console.warn('Generated code has validation errors:', validation.errors);
  }
  
  const packageJson = files.find(f => f.path === 'package.json')?.content;
  let packageData = null;
  if (packageJson) {
    try {
      packageData = JSON.parse(packageJson);
    } catch (e) {
      try {
        const fixed = packageJson.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
        packageData = JSON.parse(fixed);
        const packageIndex = files.findIndex(f => f.path === 'package.json');
        if (packageIndex >= 0) {
          files[packageIndex].content = JSON.stringify(packageData, null, 2);
        }
      } catch (e2) {
        console.error('Could not fix package.json');
      }
    }
  }

  return {
    files,
    framework,
    projectName,
    packageJson: packageData,
    validation,
  };
}

function parseFilesFromResponse(text: string, frameworkConfig: any): ProjectFile[] {
  const files: ProjectFile[] = [];
  
  const filePattern = /FILE:\s*(.+?)\nCODE:\s*([\s\S]*?)(?=FILE:|$)/g;
  let match;

  while ((match = filePattern.exec(text)) !== null) {
    const path = match[1].trim();
    let content = match[2].trim();
    
    // Strip markdown fences that some models add despite instructions
    content = content.replace(/^```\w*\n?/, '').replace(/\n?```$/, '').trim();
    
    if (path && content) {
      files.push({
        path,
        content,
        type: 'file',
      });
    }
  }

  if (files.length === 0) {
    const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
    let codeMatch;
    let fileIndex = 0;
    
    while ((codeMatch = codeBlockPattern.exec(text)) !== null) {
      const language = codeMatch[1] || 'js';
      const code = codeMatch[2].trim();
      
      const defaultPaths = [
        'src/App.js',
        'src/index.js',
        'package.json',
        'README.md',
      ];
      
      files.push({
        path: defaultPaths[fileIndex] || `file${fileIndex}.${getExtension(language)}`,
        content: code,
        type: 'file',
      });
      
      fileIndex++;
    }
  }

  ensureEssentialFiles(files, frameworkConfig);

  return files;
}

function ensureEssentialFiles(files: ProjectFile[], frameworkConfig: any) {
  const existingPaths = files.map(f => f.path);
  
  if (!existingPaths.includes('package.json')) {
    files.push({
      path: 'package.json',
      content: JSON.stringify(frameworkConfig.defaultPackageJson, null, 2),
      type: 'file',
    });
  }

  if (!existingPaths.includes('README.md')) {
    files.push({
      path: 'README.md',
      content: frameworkConfig.defaultReadme,
      type: 'file',
    });
  }

  if (!existingPaths.includes('.gitignore')) {
    files.push({
      path: '.gitignore',
      content: frameworkConfig.defaultGitignore,
      type: 'file',
    });
  }
}

function getExtension(language: string): string {
  const extensions: { [key: string]: string } = {
    'javascript': 'js',
    'typescript': 'ts',
    'jsx': 'jsx',
    'tsx': 'tsx',
    'json': 'json',
    'css': 'css',
    'html': 'html',
    'md': 'md',
  };
  return extensions[language.toLowerCase()] || 'js';
}

function getFrameworkConfig(framework: string, projectName: string) {
  const configs: { [key: string]: any } = {
    nextjs: {
      name: 'Next.js',
      structure: `
PROJECT STRUCTURE (generate ALL these files — Lovable/Replit style):
- package.json (next, react, react-dom, tailwindcss, postcss, autoprefixer, framer-motion)
- next.config.js, tailwind.config.js, postcss.config.js, tsconfig.json (@/* alias)
- .gitignore, README.md
- app/layout.js — root layout, fonts (Google Fonts), metadata
- app/page.js — main page
- app/globals.css — @tailwind + CSS variables (--primary, --background, etc.)
- app/[feature]/page.js — feature routes (dashboard, settings, etc.) if needed
- app/api/[resource]/route.js — API Route Handlers (GET, POST, etc.) for CRUD
- components/ui/Button.jsx, Card.jsx, Input.jsx — reusable primitives
- components/layout/Header.jsx, Footer.jsx
- components/[feature]/ — 3+ feature-specific components
- lib/utils.js — cn(), formatDate(), etc.
- lib/data.js — in-memory store (array/object) for mock CRUD, used by API routes
- lib/api.js — fetch wrappers for /api/* calls from frontend
`,
      defaultPackageJson: {
        name: projectName,
        version: '0.1.0',
        private: true,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
        },
        dependencies: {
          'next': '^14.0.0',
          'react': '^18.2.0',
          'react-dom': '^18.2.0',
          'tailwindcss': '^3.3.0',
          'postcss': '^8.4.0',
          'autoprefixer': '^10.4.0',
          'framer-motion': '^10.16.0',
        },
      },
      defaultReadme: `# ${projectName}\n\nA Next.js application.\n\n## Getting Started\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\nOpen [http://localhost:3000](http://localhost:3000) to view the app.\n`,
      defaultGitignore: `/node_modules\n/.next/\n/out/\n/build\n.DS_Store\n*.pem\nnpm-debug.log*\nyarn-debug.log*\nyarn-error.log*\n.env*.local\n.vercel\n*.tsbuildinfo\nnext-env.d.ts\n`,
    },
    react: {
      name: 'React',
      structure: `
PROJECT STRUCTURE (generate ALL these files):
- package.json
- .gitignore
- README.md
- public/index.html
- src/App.js
- src/index.js
- src/App.css
- src/components/ (reusable components)
- src/utils/ (utilities)
`,
      defaultPackageJson: {
        name: projectName,
        version: '0.1.0',
        private: true,
        scripts: {
          start: 'react-scripts start',
          build: 'react-scripts build',
        },
        dependencies: {
          'react': '^18.2.0',
          'react-dom': '^18.2.0',
          'react-scripts': '5.0.1',
        },
      },
      defaultReadme: `# ${projectName}\n\nA React application.\n\n## Getting Started\n\n\`\`\`bash\nnpm install\nnpm start\n\`\`\`\n`,
      defaultGitignore: `/node_modules\n/coverage\n/build\n.DS_Store\n.env.local\nnpm-debug.log*\nyarn-debug.log*\nyarn-error.log*\n`,
    },
    vue: {
      name: 'Vue.js',
      structure: `
PROJECT STRUCTURE:
- package.json
- .gitignore
- README.md
- index.html
- src/main.js
- src/App.vue
- src/components/ (reusable components)
- src/assets/ (static assets)
`,
      defaultPackageJson: {
        name: projectName,
        version: '0.1.0',
        private: true,
        scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
        dependencies: { 'vue': '^3.3.0' },
        devDependencies: { 'vite': '^4.4.0', '@vitejs/plugin-vue': '^4.3.0' },
      },
      defaultReadme: `# ${projectName}\n\nA Vue.js application.\n\n## Getting Started\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`,
      defaultGitignore: `node_modules\ndist\ndist-ssr\n*.local\n.DS_Store\n`,
    },
  };

  return configs[framework] || configs.nextjs;
}
