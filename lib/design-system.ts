/**
 * Design System Generator
 * Converts theme and color selections into strict, authoritative design systems
 * that MUST be followed by the AI generation
 */

export interface DesignSystem {
  themeType: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    accent: string;
    surface?: string;
    border?: string;
  };
  typography: {
    fontFamily: string;
    headingFont?: string;
    bodyFont?: string;
    weights: {
      normal: number;
      medium: number;
      bold: number;
      extraBold?: number;
    };
  };
  spacing: {
    scale: number[];
    unit: string;
  };
  borderRadius: {
    small: string;
    medium: string;
    large: string;
  };
  animation: {
    intensity: 'subtle' | 'moderate' | 'intense';
    duration: {
      fast: string;
      normal: string;
      slow: string;
    };
  };
  visualStyle: {
    shadows: boolean;
    gradients: boolean;
    glassmorphism: boolean;
    neon: boolean;
    flat: boolean;
    corporate: boolean;
  };
}

/**
 * Generate a strict design system from theme and color selections
 */
export function generateDesignSystem(
  themeId: string,
  colorSchemeId: string
): DesignSystem {
  const theme = getThemeConfig(themeId);
  const colors = getColorPalette(colorSchemeId);
  
  return {
    themeType: themeId,
    colors: {
      primary: colors.primary,
      secondary: colors.secondary,
      background: colors.background,
      text: colors.text,
      accent: colors.accent,
      surface: colors.surface || colors.secondary,
      border: colors.border || colors.secondary,
    },
    typography: theme.typography,
    spacing: {
      scale: [4, 8, 12, 16, 24, 32, 48, 64, 96, 128],
      unit: 'px',
    },
    borderRadius: theme.borderRadius,
    animation: theme.animation,
    visualStyle: theme.visualStyle,
  };
}

/**
 * Get theme-specific configuration
 */
function getThemeConfig(themeId: string) {
  const themes: { [key: string]: any } = {
    professional: {
      typography: {
        fontFamily: 'Inter, system-ui, sans-serif',
        headingFont: 'Inter, system-ui, sans-serif',
        bodyFont: 'Inter, system-ui, sans-serif',
        weights: { normal: 400, medium: 500, bold: 700, extraBold: 800 },
      },
      borderRadius: { small: '4px', medium: '8px', large: '12px' },
      animation: {
        intensity: 'subtle' as const,
        duration: { fast: '0.2s', normal: '0.3s', slow: '0.5s' },
      },
      visualStyle: {
        shadows: true,
        gradients: false,
        glassmorphism: false,
        neon: false,
        flat: false,
        corporate: true,
      },
    },
    cinematic: {
      typography: {
        fontFamily: 'Montserrat, system-ui, sans-serif',
        headingFont: 'Montserrat, system-ui, sans-serif',
        bodyFont: 'Inter, system-ui, sans-serif',
        weights: { normal: 400, medium: 500, bold: 700, extraBold: 900 },
      },
      borderRadius: { small: '0px', medium: '4px', large: '8px' },
      animation: {
        intensity: 'intense' as const,
        duration: { fast: '0.3s', normal: '0.6s', slow: '1s' },
      },
      visualStyle: {
        shadows: true,
        gradients: true,
        glassmorphism: false,
        neon: false,
        flat: false,
        corporate: false,
      },
    },
    gaming: {
      typography: {
        fontFamily: 'Orbitron, system-ui, sans-serif',
        headingFont: 'Orbitron, system-ui, sans-serif',
        bodyFont: 'Inter, system-ui, sans-serif',
        weights: { normal: 400, medium: 600, bold: 700, extraBold: 900 },
      },
      borderRadius: { small: '8px', medium: '12px', large: '16px' },
      animation: {
        intensity: 'intense' as const,
        duration: { fast: '0.15s', normal: '0.3s', slow: '0.6s' },
      },
      visualStyle: {
        shadows: true,
        gradients: true,
        glassmorphism: false,
        neon: true,
        flat: false,
        corporate: false,
      },
    },
    minimal: {
      typography: {
        fontFamily: 'Inter, system-ui, sans-serif',
        headingFont: 'Inter, system-ui, sans-serif',
        bodyFont: 'Inter, system-ui, sans-serif',
        weights: { normal: 400, medium: 500, bold: 600, extraBold: 700 },
      },
      borderRadius: { small: '2px', medium: '4px', large: '8px' },
      animation: {
        intensity: 'subtle' as const,
        duration: { fast: '0.2s', normal: '0.3s', slow: '0.4s' },
      },
      visualStyle: {
        shadows: false,
        gradients: false,
        glassmorphism: false,
        neon: false,
        flat: true,
        corporate: false,
      },
    },
    luxury: {
      typography: {
        fontFamily: 'Playfair Display, serif',
        headingFont: 'Playfair Display, serif',
        bodyFont: 'Lato, system-ui, sans-serif',
        weights: { normal: 400, medium: 500, bold: 700, extraBold: 900 },
      },
      borderRadius: { small: '8px', medium: '12px', large: '16px' },
      animation: {
        intensity: 'moderate' as const,
        duration: { fast: '0.3s', normal: '0.5s', slow: '0.8s' },
      },
      visualStyle: {
        shadows: true,
        gradients: true,
        glassmorphism: false,
        neon: false,
        flat: false,
        corporate: false,
      },
    },
  };

  return themes[themeId] || themes.professional;
}

/**
 * Get color palette for color scheme
 */
function getColorPalette(colorSchemeId: string) {
  const palettes: { [key: string]: any } = {
    dark: {
      primary: '#1a1a1a',
      secondary: '#2d2d2d',
      background: '#0f0f0f',
      text: '#ffffff',
      accent: '#4a90e2',
      surface: '#1a1a1a',
      border: '#333333',
    },
    blue: {
      primary: '#0066cc',
      secondary: '#e6f2ff',
      background: '#ffffff',
      text: '#001a33',
      accent: '#00aaff',
      surface: '#f0f8ff',
      border: '#cce5ff',
    },
    purple: {
      primary: '#6b46c1',
      secondary: '#f3f0ff',
      background: '#ffffff',
      text: '#2d1b4e',
      accent: '#9f7aea',
      surface: '#faf5ff',
      border: '#e9d5ff',
    },
    green: {
      primary: '#059669',
      secondary: '#ecfdf5',
      background: '#ffffff',
      text: '#064e3b',
      accent: '#10b981',
      surface: '#f0fdf4',
      border: '#d1fae5',
    },
    orange: {
      primary: '#ea580c',
      secondary: '#fff7ed',
      background: '#ffffff',
      text: '#7c2d12',
      accent: '#fb923c',
      surface: '#fff7ed',
      border: '#fed7aa',
    },
  };

  return palettes[colorSchemeId] || palettes.dark;
}

/**
 * Convert design system to strict Gemini prompt format
 */
export function designSystemToPrompt(designSystem: DesignSystem): string {
  return `
🚨 CRITICAL DESIGN SYSTEM - YOU MUST FOLLOW THIS EXACTLY 🚨

THEME TYPE: ${designSystem.themeType}
This theme is AUTHORITATIVE - not a suggestion. You MUST follow it.

COLOR PALETTE (USE THESE EXACT HEX CODES - NO SUBSTITUTIONS):
- PRIMARY: ${designSystem.colors.primary} (Use for headers, buttons, primary actions)
- SECONDARY: ${designSystem.colors.secondary} (Use for cards, sections, backgrounds)
- BACKGROUND: ${designSystem.colors.background} (Use for page background)
- TEXT: ${designSystem.colors.text} (Use for all text content)
- ACCENT: ${designSystem.colors.accent} (Use for highlights, hover states)
- SURFACE: ${designSystem.colors.surface} (Use for elevated surfaces)
- BORDER: ${designSystem.colors.border} (Use for borders, dividers)

TYPOGRAPHY (USE THESE EXACT FONTS):
- Font Family: ${designSystem.typography.fontFamily}
- Heading Font: ${designSystem.typography.headingFont || designSystem.typography.fontFamily}
- Body Font: ${designSystem.typography.bodyFont || designSystem.typography.fontFamily}
- Font Weights: Normal ${designSystem.typography.weights.normal}, Medium ${designSystem.typography.weights.medium}, Bold ${designSystem.typography.weights.bold}${designSystem.typography.weights.extraBold ? `, Extra Bold ${designSystem.typography.weights.extraBold}` : ''}

VISUAL STYLE RULES:
- Shadows: ${designSystem.visualStyle.shadows ? 'YES - Use subtle shadows for depth' : 'NO - Flat design only'}
- Gradients: ${designSystem.visualStyle.gradients ? 'YES - Use gradients for backgrounds and buttons' : 'NO - Solid colors only'}
- Glassmorphism: ${designSystem.visualStyle.glassmorphism ? 'YES - Use backdrop blur effects' : 'NO'}
- Neon Effects: ${designSystem.visualStyle.neon ? 'YES - Use glowing, neon effects' : 'NO'}
- Flat Design: ${designSystem.visualStyle.flat ? 'YES - Minimal, flat design' : 'NO'}
- Corporate Style: ${designSystem.visualStyle.corporate ? 'YES - Professional, structured layouts' : 'NO'}

BORDER RADIUS:
- Small: ${designSystem.borderRadius.small}
- Medium: ${designSystem.borderRadius.medium}
- Large: ${designSystem.borderRadius.large}

ANIMATION INTENSITY: ${designSystem.animation.intensity}
- Fast: ${designSystem.animation.duration.fast}
- Normal: ${designSystem.animation.duration.normal}
- Slow: ${designSystem.animation.duration.slow}

⚠️ STRICT ENFORCEMENT RULES:
1. You MUST use the exact hex codes provided above - NO substitutions
2. You MUST use the specified fonts - NO font changes
3. You MUST follow the visual style rules - NO deviations
4. You MUST maintain consistency - same theme should produce similar layouts
5. If the user selects the same theme again, output MUST be visually consistent
6. DO NOT invent new colors, fonts, or layouts
7. DO NOT reset the design system unless explicitly instructed

FAILURE CONDITIONS (DO NOT DO THESE):
- Using different colors than specified
- Using different fonts than specified
- Changing visual style randomly
- Producing same layout across different themes
- Ignoring the design system constraints

This design system is NON-NEGOTIABLE. Violating these rules is a failure.
`;
}

