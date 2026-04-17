/**
 * Architecture Proposal Generator
 * Generates proposed project architecture based on requirements
 */

import { ProjectRequirements } from '@/components/RequirementsForm';

export interface FolderNode {
  type: 'folder';
  name: string;
  children: { [name: string]: FolderNode | FileNode };
}

export interface FileNode {
  type: 'file';
  name: string;
  language: string;
  description: string;
}

export interface ProjectArchitecture {
  framework: string;
  folderStructure: FolderNode;
  dependencies: { [key: string]: string };
  devDependencies: { [key: string]: string };
  pages: PageDefinition[];
  components: ComponentDefinition[];
  apis?: APIDefinition[];
  techStack: string[];
}

export interface PageDefinition {
  name: string;
  route: string;
  description: string;
}

export interface ComponentDefinition {
  name: string;
  type: 'functional' | 'class';
  description: string;
}

export interface APIDefinition {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
}

/**
 * Generate project architecture based on requirements
 */
export function generateArchitecture(requirements: ProjectRequirements): ProjectArchitecture {
  const architecture: ProjectArchitecture = {
    framework: requirements.framework,
    folderStructure: generateFolderStructure(requirements),
    dependencies: generateDependencies(requirements),
    devDependencies: generateDevDependencies(requirements),
    pages: generatePages(requirements),
    components: generateComponents(requirements),
    techStack: generateTechStack(requirements),
  };

  if (requirements.includeBackend) {
    architecture.apis = generateAPIs(requirements);
  }

  return architecture;
}

function generateFolderStructure(requirements: ProjectRequirements): FolderNode {
  const root: FolderNode = {
    type: 'folder',
    name: requirements.projectName,
    children: {},
  };

  switch (requirements.framework) {
    case 'nextjs':
      root.children = {
        'app': {
          type: 'folder',
          name: 'app',
          children: {
            'layout.tsx': {
              type: 'file',
              name: 'layout.tsx',
              language: 'typescript',
              description: 'Root layout component',
            },
            'page.tsx': {
              type: 'file',
              name: 'page.tsx',
              language: 'typescript',
              description: 'Home page',
            },
            'globals.css': {
              type: 'file',
              name: 'globals.css',
              language: 'css',
              description: 'Global styles',
            },
          },
        },
        'components': {
          type: 'folder',
          name: 'components',
          children: {},
        },
        'lib': {
          type: 'folder',
          name: 'lib',
          children: {},
        },
      };

      if (requirements.includeBackend && root.children['app'] && root.children['app'].type === 'folder') {
        root.children['app'].children['api'] = {
          type: 'folder',
          name: 'api',
          children: {},
        };
      }
      break;

    case 'react':
      root.children = {
        'src': {
          type: 'folder',
          name: 'src',
          children: {
            'App.tsx': {
              type: 'file',
              name: 'App.tsx',
              language: 'typescript',
              description: 'Main app component',
            },
            'index.tsx': {
              type: 'file',
              name: 'index.tsx',
              language: 'typescript',
              description: 'Entry point',
            },
            'components': {
              type: 'folder',
              name: 'components',
              children: {},
            },
            'pages': {
              type: 'folder',
              name: 'pages',
              children: {},
            },
            'utils': {
              type: 'folder',
              name: 'utils',
              children: {},
            },
          },
        },
        'public': {
          type: 'folder',
          name: 'public',
          children: {},
        },
      };
      break;

    case 'vue':
      root.children = {
        'src': {
          type: 'folder',
          name: 'src',
          children: {
            'App.vue': {
              type: 'file',
              name: 'App.vue',
              language: 'vue',
              description: 'Main app component',
            },
            'main.ts': {
              type: 'file',
              name: 'main.ts',
              language: 'typescript',
              description: 'Entry point',
            },
            'components': {
              type: 'folder',
              name: 'components',
              children: {},
            },
            'views': {
              type: 'folder',
              name: 'views',
              children: {},
            },
            'router': {
              type: 'folder',
              name: 'router',
              children: {},
            },
          },
        },
      };
      break;

    case 'vanilla':
      root.children = {
        'index.html': {
          type: 'file',
          name: 'index.html',
          language: 'html',
          description: 'Main HTML file',
        },
        'css': {
          type: 'folder',
          name: 'css',
          children: {},
        },
        'js': {
          type: 'folder',
          name: 'js',
          children: {},
        },
        'assets': {
          type: 'folder',
          name: 'assets',
          children: {},
        },
      };
      break;
  }

  // Add common files
  root.children['package.json'] = {
    type: 'file',
    name: 'package.json',
    language: 'json',
    description: 'Project dependencies and scripts',
  };

  root.children['README.md'] = {
    type: 'file',
    name: 'README.md',
    language: 'markdown',
    description: 'Project documentation',
  };

  root.children['.gitignore'] = {
    type: 'file',
    name: '.gitignore',
    language: 'text',
    description: 'Git ignore patterns',
  };

  if (requirements.includeBackend) {
    root.children['.env.example'] = {
      type: 'file',
      name: '.env.example',
      language: 'text',
      description: 'Environment variables template',
    };
  }

  return root;
}

function generateDependencies(requirements: ProjectRequirements): { [key: string]: string } {
  const deps: { [key: string]: string } = {};

  // Framework-specific dependencies
  switch (requirements.framework) {
    case 'nextjs':
      deps['next'] = '^14.2.0';
      deps['react'] = '^18.3.0';
      deps['react-dom'] = '^18.3.0';
      break;
    case 'react':
      deps['react'] = '^18.3.0';
      deps['react-dom'] = '^18.3.0';
      deps['react-router-dom'] = '^6.22.0';
      break;
    case 'vue':
      deps['vue'] = '^3.4.0';
      deps['vue-router'] = '^4.3.0';
      break;
  }

  // Styling dependencies
  switch (requirements.styling) {
    case 'tailwind':
      deps['tailwindcss'] = '^3.4.0';
      deps['autoprefixer'] = '^10.4.0';
      deps['postcss'] = '^8.4.0';
      break;
    case 'styled-components':
      deps['styled-components'] = '^6.1.0';
      break;
  }

  // Feature-specific dependencies
  if (requirements.features.includes('auth')) {
    deps['firebase'] = '^10.8.0';
  }

  if (requirements.features.includes('database')) {
    if (requirements.framework === 'nextjs') {
      deps['@prisma/client'] = '^5.10.0';
    }
  }

  if (requirements.features.includes('payments')) {
    deps['stripe'] = '^14.21.0';
  }

  return deps;
}

function generateDevDependencies(requirements: ProjectRequirements): { [key: string]: string } {
  const devDeps: { [key: string]: string } = {
    'typescript': '^5.3.0',
    '@types/node': '^20.11.0',
    '@types/react': '^18.2.0',
  };

  if (requirements.framework === 'nextjs') {
    devDeps['@types/react-dom'] = '^18.2.0';
  }

  if (requirements.framework === 'vue') {
    devDeps['@vitejs/plugin-vue'] = '^5.0.0';
    devDeps['vite'] = '^5.1.0';
  } else if (requirements.framework === 'react') {
    devDeps['vite'] = '^5.1.0';
    devDeps['@vitejs/plugin-react'] = '^4.2.0';
  }

  return devDeps;
}

function generatePages(requirements: ProjectRequirements): PageDefinition[] {
  const pages: PageDefinition[] = [
    { name: 'Home', route: '/', description: 'Landing page' },
  ];

  if (requirements.features.includes('auth')) {
    pages.push(
      { name: 'Login', route: '/login', description: 'User login page' },
      { name: 'Register', route: '/register', description: 'User registration page' },
    );
  }

  if (requirements.businessType?.toLowerCase().includes('ecommerce') || requirements.features.includes('payments')) {
    pages.push(
      { name: 'Products', route: '/products', description: 'Product listing page' },
      { name: 'Cart', route: '/cart', description: 'Shopping cart page' },
    );
  }

  if (requirements.businessType?.toLowerCase().includes('portfolio')) {
    pages.push(
      { name: 'About', route: '/about', description: 'About page' },
      { name: 'Projects', route: '/projects', description: 'Projects showcase' },
      { name: 'Contact', route: '/contact', description: 'Contact form' },
    );
  }

  return pages;
}

function generateComponents(requirements: ProjectRequirements): ComponentDefinition[] {
  const components: ComponentDefinition[] = [
    { name: 'Header', type: 'functional', description: 'Site header with navigation' },
    { name: 'Footer', type: 'functional', description: 'Site footer' },
  ];

  if (requirements.features.includes('auth')) {
    components.push(
      { name: 'LoginForm', type: 'functional', description: 'Login form component' },
      { name: 'RegisterForm', type: 'functional', description: 'Registration form component' },
    );
  }

  if (requirements.businessType?.toLowerCase().includes('ecommerce')) {
    components.push(
      { name: 'ProductCard', type: 'functional', description: 'Product display card' },
      { name: 'CartItem', type: 'functional', description: 'Shopping cart item' },
    );
  }

  return components;
}

function generateAPIs(requirements: ProjectRequirements): APIDefinition[] {
  const apis: APIDefinition[] = [];

  if (requirements.backendFeatures?.includes('crud')) {
    apis.push(
      { endpoint: '/api/items', method: 'GET', description: 'Get all items' },
      { endpoint: '/api/items', method: 'POST', description: 'Create new item' },
      { endpoint: '/api/items/[id]', method: 'PUT', description: 'Update item' },
      { endpoint: '/api/items/[id]', method: 'DELETE', description: 'Delete item' },
    );
  }

  if (requirements.backendFeatures?.includes('auth-api')) {
    apis.push(
      { endpoint: '/api/auth/login', method: 'POST', description: 'User login' },
      { endpoint: '/api/auth/register', method: 'POST', description: 'User registration' },
      { endpoint: '/api/auth/logout', method: 'POST', description: 'User logout' },
    );
  }

  if (requirements.backendFeatures?.includes('file-api')) {
    apis.push(
      { endpoint: '/api/files/upload', method: 'POST', description: 'Upload file' },
      { endpoint: '/api/files/[id]', method: 'GET', description: 'Get file' },
    );
  }

  return apis;
}

function generateTechStack(requirements: ProjectRequirements): string[] {
  const stack: string[] = [requirements.framework];

  stack.push(requirements.styling);

  if (requirements.includeBackend) {
    stack.push('API Routes');
    if (requirements.framework === 'nextjs') {
      stack.push('Next.js API');
    }
  }

  if (requirements.features.includes('database')) {
    stack.push('Database');
  }

  if (requirements.features.includes('auth')) {
    stack.push('Authentication');
  }

  return stack;
}

