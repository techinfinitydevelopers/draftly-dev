/**
 * CINEMATIC IMMERSIVE WEBSITE GENERATOR V3
 * This file now re-exports from the V3 heavy 3D cinematic system
 * V3 includes heavy animations, Three.js, particles, and fixed navigation
 */
import { generateCinematicWebsiteV3 } from './gemini-cinematic-v3';

/**
 * Wrapper function for backward compatibility
 * Now uses the V3 heavy 3D cinematic generation system
 */
export async function generateAdvanced3DWebsite(
  prompt: string,
  userContext: {
    theme?: string;
    colorScheme?: string;
    businessType?: string;
  },
  customApiKey?: string
) {
  console.log('🎬 Using V3 Heavy 3D Cinematic Generation System');
  return await generateCinematicWebsiteV3(prompt, userContext, customApiKey);
}

export default generateAdvanced3DWebsite;
