/**
 * Code Validator for Generated Projects
 * Validates that generated code is runnable and error-free
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Validate generated project files
 */
export function validateProject(files: { [path: string]: string }): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Check for package.json
  if (!files['package.json']) {
    errors.push('Missing package.json file');
  } else {
    try {
      const packageJson = JSON.parse(files['package.json']);
      
      // Check for required dependencies
      if (!packageJson.dependencies) {
        warnings.push('package.json missing dependencies field');
      }
      
      // Check for scripts
      if (!packageJson.scripts) {
        warnings.push('package.json missing scripts field');
      } else {
        if (!packageJson.scripts.dev && !packageJson.scripts.start) {
          warnings.push('package.json missing dev or start script');
        }
      }
    } catch (e) {
      errors.push('package.json is not valid JSON');
    }
  }

  // Check for entry points
  const entryPoints = [
    'app/page.js',
    'app/page.jsx',
    'app/page.tsx',
    'src/App.js',
    'src/App.jsx',
    'src/App.tsx',
    'pages/index.js',
    'pages/index.jsx',
    'index.html',
  ];

  const hasEntryPoint = entryPoints.some(entry => files[entry]);
  if (!hasEntryPoint) {
    errors.push('No entry point found (app/page.js, src/App.js, pages/index.js, or index.html)');
  }

  // Validate imports in JavaScript/TypeScript files
  for (const [path, content] of Object.entries(files)) {
    if (path.endsWith('.js') || path.endsWith('.jsx') || path.endsWith('.ts') || path.endsWith('.tsx')) {
      // Check for broken imports
      const importRegex = /import\s+.*?\s+from\s+['"](.+?)['"]/g;
      let match;
      
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        
        // Skip node_modules and external packages
        if (importPath.startsWith('.') || importPath.startsWith('/') || importPath.startsWith('@/')) {
          // Check if relative import exists
          const resolvedPath = resolveImportPath(path, importPath);
          if (!files[resolvedPath] && !isExternalPackage(importPath)) {
            warnings.push(`Possible broken import in ${path}: ${importPath}`);
          }
        }
      }

      // Check for undefined variables (basic check)
      if (content.includes('undefined') && content.includes('const') === false) {
        // This is a basic check - might have false positives
      }

      // Check for common syntax errors
      const openBraces = (content.match(/{/g) || []).length;
      const closeBraces = (content.match(/}/g) || []).length;
      if (openBraces !== closeBraces) {
        errors.push(`Mismatched braces in ${path}`);
      }

      const openParens = (content.match(/\(/g) || []).length;
      const closeParens = (content.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        errors.push(`Mismatched parentheses in ${path}`);
      }
    }
  }

  // Check for Next.js specific requirements
  if (files['package.json']) {
    try {
      const packageJson = JSON.parse(files['package.json']);
      if (packageJson.dependencies?.next) {
        // Next.js specific checks
        if (!files['next.config.js'] && !files['next.config.mjs']) {
          suggestions.push('Consider adding next.config.js for Next.js configuration');
        }
        
        if (!files['app/layout.js'] && !files['app/layout.jsx'] && !files['app/layout.tsx']) {
          warnings.push('Next.js app should have app/layout.js for root layout');
        }
      }
    } catch (e) {
      // Already handled above
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

function resolveImportPath(fromPath: string, importPath: string): string {
  // Simple path resolution
  if (importPath.startsWith('@/')) {
    // Assume @/ maps to src/ or app/
    return importPath.replace('@/', 'src/').replace('@/', 'app/');
  }
  
  if (importPath.startsWith('./')) {
    const dir = fromPath.substring(0, fromPath.lastIndexOf('/'));
    return `${dir}/${importPath.substring(2)}`;
  }
  
  if (importPath.startsWith('../')) {
    const parts = fromPath.split('/');
    const importParts = importPath.split('/');
    let depth = 0;
    for (const part of importParts) {
      if (part === '..') depth++;
      else break;
    }
    const resolved = parts.slice(0, parts.length - depth - 1).join('/');
    const file = importParts[importParts.length - 1];
    return `${resolved}/${file}`;
  }
  
  return importPath;
}

function isExternalPackage(importPath: string): boolean {
  // Common external packages
  const externalPackages = [
    'react',
    'react-dom',
    'next',
    'vue',
    '@next',
    '@vercel',
    'framer-motion',
    'lucide-react',
  ];
  
  return externalPackages.some(pkg => importPath.startsWith(pkg));
}

