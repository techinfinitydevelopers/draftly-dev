'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import GrungeBackground from '@/components/GrungeBackground';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';

interface Preset {
  id: number;
  title: string;
  thumbnail: string;
  prompt: string;
  description: string;
  credits?: string;
  tutorialLink?: string;
  gameLink?: string;
  isPremium?: boolean; // Premium presets require Pro plan
  slides?: string[]; // Multiple images for slideshow
}

const presets: Preset[] = [
  {
    id: 14,
    title: 'paman 3d game',
    thumbnail: '/preset14-paman-3d-game.png',
    isPremium: false,
    description: 'Play the exciting Waddle Box game on Tiny Planet - collect gold coins, avoid red slimes, and eat blue pills!',
    gameLink: 'https://tomclive.github.io/waddle-box/',
    prompt: '',
  },
  {
    id: 13,
    title: 'Hand-Gesture Racing Game',
    thumbnail: '/presets/preset13-gesture-racing.png',
    isPremium: false,
    description:
      'Browser-based 3-lane racing game fully controlled by real-time hand gestures using webcam + MediaPipe or TensorFlow.js',
    prompt: `You are an expert AI game developer. Your job is to build a simple browser-based racing game controlled by real-time hand gestures using a webcam. Use JavaScript + HTML + CSS and provide full working code.



Game Requirements:

1. The game displays a 3-lane road in 3D or simulated 3D with perspective.

2. A player car stays at the bottom center of the screen.

3. Obstacles spawn ahead and move toward the player.

4. If the car collides with an obstacle, game over and restart button appears.

5. Score increases with time survived.



Gesture Control Requirements:

1. Use webcam input.

2. Use MediaPipe Hands or TensorFlow.js hand tracking.

3. Detect left/right hand movement (x-axis).

4. Map hand horizontal movement to car lane switching:

   - Move left → car shifts to left lane

   - Hand center → car stays center lane

   - Move right → car shifts right lane

5. Control must feel responsive and smooth.



Technical Requirements:

1. Entire code must run client-side in browser.

2. Provide:

   - index.html

   - style.css

   - script.js

3. Explain how to run locally.

4. Include comments explaining major sections of the code.

5. Keep code structured: initialization, game loop, rendering, gesture detection, collision logic.

6. Use requestAnimationFrame for smooth animation.

7. Prevent high CPU usage.

8. Write code compatible with Chrome browser.



UI Requirements:

1. Display:

   - score at top

   - lane dividers / road markings

   - obstacles as blocks

   - car as a block rectangle

2. Add start screen + restart button.



Optional Enhancements (if easy):

- acceleration increasing difficulty

- sounds for collision and lane switching



Deliverables:

1. Full code

2. Explanation of how gesture model integrates with movement

3. Step-by-step instructions for running it

4. Troubleshooting section for common bugs`,
  },
  {
    id: 12,
    title: 'Professional Photo Prompts',
    thumbnail: '/presets/photo-prompts-1.png',
    isPremium: false,
    description: 'Three professional photography prompts for creating stunning, realistic photos with AI',
    prompt: `PROMPT 1: Mykonos Vacation Shot

"reference_images_policy": {"images_map": {"1": "MODEL_FACE_REFERENCE","2": "MODEL_FACE_REFERENCE","3": "MODEL_FACE_REFERENCE","4": "MODEL_BODY_REFERENCE","5": "MODEL_BODY_REFERENCE","6": "ATTIRE_REFERENCE_ONLY"},"priority_order": ["MODEL_FACE_REFERENCE","MODEL_BODY_REFERENCE","ATTIRE_REFERENCE_ONLY"],"hard_rules": ["Identity (face + body) MUST be taken ONLY from images 1-5.","Images 1-3 are FACE identity references; images 4-5 are BODY identity references.","Image 6 provides CLOTHING ONLY. Treat any person/mannequin/body parts in image 6 as irrelevant noise.","If there is any conflict between image 6 and images 1-5, ALWAYS follow images 1-5.","Never infer identity, face, skin tone, hair, body shape, pose, or age from image 6."]},"subject": "the exact same woman from images 1-5 (face+body). Do not reinterpret, redesign, beautify, stylize, or drift her identity.","body_type": "LOCKED to images 4-5 (do not change height, weight, proportions, silhouette, bust/waist/hips, limbs, baseline posture)","identity_lock": {"strict_consistency": true,"identity_sources_only": "images 1-5","face_sources_only": "images 1-3","body_sources_only": "images 4-5","instruction": "Maintain STRICT identity consistency with images 1-5 across every generation: identical face AND body. Face must match images 1-3. Body must match images 4-5. Do NOT morph/beautify/stylize. Do NOT borrow any facial/body traits from image 6.","allowed_changes": ["clothing/outfit only (extracted exclusively from image 6)","pose, scene, and camera parameters (when specified)"],"forbid_changes": ["different person","face drift","face swap","using image 6 as identity reference","copying skin tone/hair/face/body from the person wearing the outfit in image 6","adopting pose/body proportions from image 6"]},"attire": {"attire_source": "image 6","attire_extraction_mode": "GARMENT_ONLY","ignore_in_attire_image": ["face","hair","skin","hands","legs","body silhouette","tattoos","jewelry (unless clearly part of the outfit product itself)","pose","background"],"source_rule": "Use ONLY the garments visible in image 6 as the outfit reference.","note": "Apply the outfit to the subject exactly as shown: do not change pieces, colors, prints, materials, or branding. Fit the clothes to the locked body realistically (proper sizing, folds, drape). If an item is not visible/unclear in image 6, do not invent it.","conflict_resolution": "If garment fit conflicts with locked body, adjust garment drape/sizing—not the body."},"render_guardrails": {"negative_influence_block": ["Do not replicate the person from image 6","Do not transfer facial features from image 6","Do not transfer body proportions from image 6","Do not match skin tone/hair from image 6","Do not perform any face swap"],"self_check": {"instruction": "Before finalizing, verify the face matches images 1-3 and the body matches images 4-5. If any resemblance to the person in image 6 appears, discard and regenerate using ONLY images 1-5 for identity."}},"scene": "sunny narrow street in Mykonos, Greece; white-washed houses with blue doors and windows, cobblestone path, hints of the Aegean Sea or marina in the distance, potted bougainvillea and flowers; relaxed vacation atmosphere, Mediterranean island vibe","pose": "walking casually down the cobblestone street, one leg stepping forward, hips and shoulders natural; torso slightly angled toward the camera; arms relaxed at her sides or swinging naturally as she walks","action": "candid vacation moment mid-step, soft natural smile or mid-laughter; she is looking slightly toward the camera as if a friend is walking ahead or stopped to take a quick photo; not posed like a fashion shoot, no selfie, no phone in hand","details": {"lighting": "bright Mediterranean daylight or soft golden hour light; natural sun with gentle shadows; realistic skin texture and minimal retouching","props": ["cobblestone street underfoot","white-washed buildings with blue details (doors, shutters, balconies)","flower pots with bougainvillea or other colorful plants","subtle shop signs or cafe elements appropriate to Mykonos","optional: a distant glimpse of the sea or boats, kept soft in the background"],"people_policy": "Other tourists may appear in the background only as non-identifiable shapes or slightly blurred figures; keep focus and sharpness on the subject."},"background": "iconic Mykonos pedestrian street: white-washed architecture, blue accents, cobblestones, scattered flowers and balconies; some subtle tourist or shop activity in the distance, but not cluttered; believable Greek island setting, not a studio backdrop","overall_vibe": "instagrameable Mykonos vacation photo: casual, sunny, carefree and aspirational; looks like a real tourist snapshot that turned out especially nice, but not like a magazine editorial","photography": {"camera_style": "photorealistic casual smartphone photo (Instagram-style), should be shot in an amateur phone camera style, NOT editorial, NOT magazine","device_feel": "high-end phone camera look (natural HDR, crisp but not over-processed)","angle": "eye-level or slightly above eye-level from in front of her on the street, like a friend walking backward or briefly stopping to take a candid shot","shot_type": "vertical 9:16 full-body or three-quarter body shot; frame includes her from about knees or feet up while capturing enough of the street and buildings to clearly show Mykonos context","aspect_ratio": "9:16","sharpness": "subject and outfit sharp and in focus; background slightly softer due to natural depth of field, not artificial or extreme bokeh","exposure": "balanced natural dynamic range; preserve details in white buildings without blowing out highlights; avoid dramatic spotlighting or heavy vignettes","color": "natural warm Mediterranean tones; clean whites, deep blues, and subtle pops of color from flowers; avoid teal-orange or strong cinematic grading","postprocessing_limits": ["no glamour retouching","no plastic skin","no studio-perfect lighting","no heavy film grain","no dramatic lens flares"],"composition": "subject is primary and centered or slightly off-center; street recedes into the background to create depth; keep composition clean and believable as a spontaneous vacation photo taken by a friend","consistency_notes": "Identity and body are locked to images 1-5 only. Outfit is locked to image 6 only. Background tourists and street scene must not influence identity."}}

---

PROMPT 2: Restaurant Candlelight Portrait

Bathed in a warm amber glow from a flickering pillar candle, a young woman with long, sleek dark hair leans her head gently on her hand, her soft pout expression capturing a moody, relaxed elegance. She wears a form-fitting, off-the-shoulder black long-sleeve top, complemented by simple gold bangles that catch the candlelight subtly. Seated at a dark wooden dining table in an upscale restaurant, the atmosphere hums with intimate sophistication. The table holds a glass of white wine cradled in her hand, a plate of crusty artisan bread with a dollop of butter, and gleaming elegant glassware. The minimalist cream-colored wall behind her, adorned with subtle molding, recedes softly in the low-key illumination. The image bears a gentle film grain overlay, evoking a candid, high-glamour Instagram aesthetic captured with a professional camera. Natural shadows sculpt her facial features, enhancing the mood without overpowering the warm candlelight.

---

PROMPT 3: Bubblegum Close-Up

In soft daylight, a young woman's face fills the entire frame from forehead to chin, captured in an ultra-realistic close-up. Her warm golden skin reveals delicate freckles, subtle pores, and gentle highlights along the forehead and cheekbones. Slightly parted lips cradle a pale, milky-pink bubblegum bubble, its smooth reflective surface taut with natural tension lines. Her green eyes, framed by unstyled lashes and natural brows with visible individual hairs, glance slightly off to the side, conveying a spontaneous, candid mood. Light brown hair with dark blonde sunlit strands frames her face in a slightly tousled, natural manner. The shallow depth of field typical of an iPhone 13 maintains sharp focus on her face while softly blurring the background, all under gentle, diffuse daylight that casts soft shadows around her nose and mouth without stark contrasts. The overall palette harmonizes warm skin tones with soft pink from the bubble and the natural golden hues of her hair, encapsulating a stylish yet effortless moment frozen mid-bubble with textured, unfiltered realism.`,
    slides: ['/presets/photo-prompts-1.png', '/presets/photo-prompts-2.png', '/presets/photo-prompts-3.png']
  },
  {
    id: 11,
    title: 'AI Film Making in Higgsfield',
    thumbnail: '/presets/ai-filmmaking-higgsfield.png',
    isPremium: true,
    description: 'Generate realistic, film-grade shots using Higgsfield AI\'s new Cinematic Mode with virtual cameras, lenses, and lighting setups',
    prompt: `Prompt Section (Higgsfield AI – Cinematic Mode)

AI used: Higgsfield AI
Mode: New Cinematic Mode
Purpose: Generate realistic, film-grade shots using virtual cameras, lenses, and lighting setups

Example prompts to use:

Prompt 1: Ultra cinematic shot from a virtual film camera, 50mm focal length, shallow depth of field, soft anamorphic bokeh, volumetric lighting, dust particles floating, dramatic back light, lens breathing, slow tracking dolly inward, emotional tone like a feature film still frame.

Prompt 2: Dark alley night scene shot on a virtual 35mm cine camera, neon reflections, rain-soaked street surface, slow pull focus from background to subject face, moody noir atmosphere, accurate film grain, light fog, realistic shadows and specular highlights.

Prompt 3: Golden hour desert environment, wide cinematic establishing shot, 24mm lens simulation, long shadows, heat haze, film-grade lighting, detailed terrain texture, camera pans subtly across landscape, dramatic sense of scale and isolation.

Prompt 4: Interior emotional close-up, 85mm portrait lens simulation, soft warm key light, subtle practical lighting in background, natural skin texture, realistic micro-expressions, immersive cinema framing.

Prompt 5: Action scene moment frozen, handheld virtual camera, motion blur, sparks flying through frame, gritty contrast, dramatic tension like a blockbuster hero shot.`,
    credits: 'x/ @EHuanglu',
    tutorialLink: 'https://x.com/EHuanglu/status/2002071279638360418?s=20'
  },
  {
    id: 10,
    title: 'Bird Game - AR Gesture Shooting',
    thumbnail: '/preset-bird-game.jpg',
    isPremium: true,
    description: 'Single-file HTML AR gesture shooting game with hand gesture recognition and flying disc targets',
    prompt: `Please help me write a single-file HTML AR gesture shooting game.

1. Core gameplay:
- Gesture: Recognize a "pistol" hand gesture (index finger aiming, thumb pulling the trigger to shoot).
- Enemies: Flying discs spawn randomly around the edges of the screen and fly toward the center. Keep 4 on screen at all times; when one is shattered, immediately spawn a replacement.
- Experience: Include magnetic aim assist (crosshair snaps/attracts to discs), a laser aiming line, hit impact sound effects, and floating "HIT/MISS" text VFX.

2. Critical anti-crash requirements (must implement):
- Use Three.js and MediaPipe Hands.
- Hard version lock: MediaPipe resources must be loaded from unpkg and pinned to version 0.4.1646424915 to prevent WASM version mismatches that cause crashes.
- Crash-safe loading: Add a full-screen Loading overlay; you must wait until the model finishes downloading before entering the game. The gesture-recognition loop must be wrapped in try-catch for protection.
- Performance: Limit the AI detection frequency, while keeping rendering running at a full 60 FPS.`,
    credits: 'x/ @EHuanglu',
    tutorialLink: 'https://www.instagram.com/reel/DSc8WeAkxV5/?igsh=MWZza2tobXp0Z2k0dQ=='
  },
  {
    id: 9,
    title: 'Bee Navigates Kitchen - Cinematic IMAX',
    thumbnail: '/preset9-1.jpg',
    isPremium: true,
    description: 'Cinematic IMAX-style macro follow-shot of a honeybee flying through a warm kitchen with Higgs field visualization',
    prompt: `Cinematic IMAX-style macro follow-shot of a honeybee flying through a warm kitchen. Camera hovering closely behind the bee, over-the-back perspective, giving the sense that the viewer is riding behind it, seeing the world mostly from the bee's angle. The bee buzzes forward through drifting golden dust particles that visually represent the Higgs field—subtle, swirling quantum energy threads forming in the air, bending around the bee as it moves.

The kitchen is alive with realism: two people cooking at a stove, steam rising, oil simmering, vegetables being chopped. Warm tungsten lights create a yellow–amber glow. Color palette: honey-yellow, caramel brown, dark shadows. Edges of the frame have soft radial blur + shallow depth of field distortion to simulate the bee's limited focus.

Camera movements: fluid, micro-accelerations and tiny shakes matching the bee's flight pattern, smooth forward movement with slow drifting arcs and hovering pauses. Depth transitions are dramatic: sudden rack focus from the bee to objects in the background, then back.

Particles suspended in the air—steam, floating flour, dust—glow from rim lighting, interacting visually with the Higgs field strands. Higgs field visual: semi-transparent filaments like fine shimmering threads or invisible force lines, pulsing gently, reacting as the bee pushes through, representing how mass interacts with the Higgs field.

Audio style: deep IMAX bass bed layered with subtle buzzing, airy ambience, sizzling pan, kitchen dialogue muffled, ASMR-like sound layering.

Shot progression: Bee flies past hanging utensils, steam clouds, then near glowing stove flames. Humans unaware of the bee. Camera occasionally slows and pushes forward through smoke. Light flares bloom, edges vignette.

Mood: surreal scientific wonder blended with domestic intimacy—explaining visually how the Higgs field permeates normal reality but goes unnoticed. Slow pace, tension rising gently, sense of discovery.

Ultra-high quality: 8K texture detail, IMAX aspect ratio, cinematic color grading, film-grain, realistic micro-motion blur, volumetric lighting, high dynamic range, low-contrast soft shadows.`,
    tutorialLink: 'https://www.instagram.com/reel/DRycxfBkUul/?igsh=MWlma3ZmZ2U0ZG1vYg==',
    slides: ['/preset9-1.jpg', '/preset9-2.jpg', '/preset9-3.jpg']
  },
  {
    id: 1,
    title: '3D Particle Playground',
    thumbnail: '/preset1-thumb.png',
    isPremium: true,
    description: 'Real-time hand-gesture controlled particle system with Three.js',
    prompt: `Build a real-time, interactive 3D particle playground using Three.js that uses the camera to detect hand gestures and controls the particle system in real time. Deliver a single-file interactive website (HTML+JS+CSS) with a modern, minimal UI.

Requirements:

Core features

• Real-time hand-gesture input:
  - Use the camera (webcam) and a lightweight hand-pose model. Detect both-hands tension (fingers spread) vs closing (fists) and distance between hands.
  - Map gestures to particle-group scale and expansion:
    * Hands closing → particles contract / scale down.
    * Hands opening / increased tension → particles expand and spread.
    * Move hands closer/further → subtle global scale change.
  - Gesture detection and particle response must be low-latency and fluid (<=100ms perceptual lag).

• Particle engine:
  - Use Three.js Points with a GPU-friendly shader (GLSL) to render thousands of particles at good frame rates.
  - Provide several particle templates: hearts, flowers, saturn (ringed planet), small Buddha statue silhouette, fireworks burst. Templates should be selectable from UI and applied as particle shapes or spawned patterns.
  - Particles must smoothly transition between templates and react dynamically to gesture input (shape, spread, and emission intensity).

• Controls & UI:
  - A clean control panel with:
    * Template selector (grid or icons for hearts/flowers/saturn/Buddha/fireworks).
    * Colour selector (hue+slider or palette) that updates particle color in real-time.
    * Slider toggles for particle count, particle size, and motion noise strength.
    * Toggle to enable/disable camera gesture control and a manual fallback (mouse/touch controls for scale and spread).
  - Minimal, modern design: soft shadows, rounded panels, clear icons, responsive layout for desktop and mobile.

• Interactivity & animation:
  - Particles should respond instantly to gesture changes (scale, spread, emission rate).
  - Add subtle physics: attraction/repulsion, velocity dampening, per-particle noise for organic motion.
  - Fireworks template spawns bursts on gesture 'snap' or quick closing motion.
  - Ensure smooth transitions (use tweening / lerp for parameters) to avoid popping.

• Performance & compatibility:
  - Use requestAnimationFrame and GPU acceleration where possible.
  - Auto-fallback to low particle count / lower resolution on slow devices.
  - Graceful permission request for camera and clear UX when camera denied.

Deliverables & extras

• Single HTML file (or minimal project) that runs locally and on a static host.
• Clear comments for where to swap hand-pose model or tweak gesture thresholds.
• Short README (in-page) explaining gestures, keyboard/mouse fallbacks, and performance tips.
• Optional: little recording/screenshot button to capture the canvas as a short GIF or PNG.

Make the code well-structured and production-ready (modular functions, clear variable names). Prioritize immediate, tactile responsiveness to gestures and a clean, modern interface.`,
    credits: 'x- @EHuanglu',
    tutorialLink: 'https://www.instagram.com/reel/DSABkCqDKIJ/?igsh=MW9ldzlrdThxajRlcg=='
  },
  {
    id: 2,
    title: 'DorkSense - Neobrutalist Webpage',
    thumbnail: '/preset2thum.png',
    description: 'Extremely creative neobrutalist webpage with smooth scroll animations',
    prompt: `Make a neobrutalist webpage, make it extremely creative, as far as possible, push the limits. Add smooth scroll animations, add fancy colors and tailwind css styles. Make it responsive. title of the page is dorksense`,
    credits: 'x- @Dork_sense'
  },
  {
    id: 3,
    title: '3D Particle System',
    thumbnail: '/preset3-thumb.png',
    isPremium: true,
    description: 'Real-time interactive 3D particle system with hand gesture control',
    prompt: `Create a real-time interactive 3D particle system with Three.js.

Requirements:

- Detect both hands through the camera → control particle scaling + expansion by hand tension & closing

- Include a panel to switch templates: hearts / flowers / saturn / fireworks

- Add a color selector to change particle colors

- Particles must react instantly to gesture changes

- UI should be simple, modern, clean`,
    credits: 'x- @EHuanglu',
    tutorialLink: 'https://www.instagram.com/reel/DSABkCqDKIJ/?igsh=MW9ldzlrdThxajRlcg=='
  },
  {
    id: 4,
    title: '3D Office Campus Web App',
    thumbnail: '/preset4-thumb.png',
    description: 'Fully-interactive 3D office building simulator with Tailwind CSS dashboard',
    prompt: `Prompt: 

Build a Fully-Interactive 3D Office Campus Web App

Goal:

Create a polished, futuristic, bright-looking Three.js interactive office building simulator, with a Tailwind CSS dashboard and multiple data-driven modes.

⸻

Technology & UI

	•	Use Three.js for the 3D scene.

	•	Use Tailwind CSS for the UI dashboard (float on the left, compact and dense).

	•	Right side = fullscreen 3D; left = tabs + sliders + toggles.

	•	Visual style: bright, modern, slightly "sci-fi" with bloom/tonemapping.

	•	The environment and main building should appear clearly lit, not dark.

⸻

3D Scene Setup

	•	Procedurally generate a modern office building with interior rooms, partitions, and different functional zones.

	•	Add simple surrounding buildings + roads (low-poly is fine).

	•	Add a lobby on the first floor with:

	•	a reception bar

	•	a central core (elevators + stairs) spanning all floors

	•	Underground parking garage directly beneath the building.

Interior Details

	•	Floor partitions to separate office/meeting/pantry/core/etc.

	•	Office furniture (gray models; white blends too much):

	•	desks, chairs

	•	meeting tables + TV

	•	pantry with water bar

	•	People = red-tinted 3D human proxies

	•	No people in parking

	•	Ensure character feet sit exactly on the floor (no floating).

⸻

Dashboard Controls (Tailwind)

Three Tabs

	1.	People

	2.	Environment

	3.	Energy

24-Hour Time Slider

Controls:

	•	Sun position

	•	Window emissive intensity (night mode)

	•	People distribution per time period

	•	Shows external environmental metrics (simulated is ok):

	•	temperature

	•	humidity

	•	wind speed

	•	solar radiation

View Modes

	1.	Default: PBR realistic materials

	2.	Heatmap: comfort shown as colored volumetric blocks

	3.	People view: highlights human density + zones

⸻

Behavior Logic

People Simulation

	•	Distribution changes visibly with time:

	•	Work hours → more in offices + meeting rooms

	•	Lunch → more in pantry / rest areas

	•	Not just numbers — 3D positions change dynamically

Energy Mode

Show breakdown by:

	•	cooling

	•	heating

	•	lighting

	•	equipment

	•	hot water

Parking energy includes only lighting + equipment.

⸻

Interactive Features

1. Floor "Drawer" Extraction

	•	Clicking a floor pulls it out like a drawer

	•	Extraction direction:

	•	along the short side

	•	rotated 90° clockwise

	•	Extracted floor = opaque, not transparent

	•	Extracted floor = highlighted; other floors dim

2. Room-Level Interaction

	•	Clicking a room should:

	•	highlight only that room

	•	remove previous ugly yellow wireframe

	•	no highlight when nothing is selected

	•	Add toggle buttons to show functional zones using color blocks.

3. Parking Visibility Toggle

	•	Hide the ground plane when viewing the parking garage

	•	Parking features:

	•	painted parking lines

	•	cars placed without overlap

⸻

Environment & Heat-Comfort

	•	Use colored volumetric blocks for comfort visualization

	•	No Z-fighting with floors or ground

	•	Fix overflow bug (Level 1 comfort cube extruding outside the building)

⸻

Visual & Functional Improvements

	•	Scene must be brighter

	•	Remove neighbor building that obstructs floor extraction

	•	People models more red for clarity

	•	No transparency for extracted objects

	•	Furniture uses gray only

	•	Roof splitting bugs fixed

	•	Heat-comfort mode limited properly inside geometry

⸻

Acceptance Checklist

Gemini should generate code that satisfies:

✔ Sun + time slider updates lighting + emissive windows

✔ People distribution changes visibly by time

✔ Heatmap uses volumetric blocks

✔ Floor extraction is correct (short side, 90° CW, opaque)

✔ Room highlights on click only

✔ Parking visible only after hiding ground

✔ Cars do not overlap

✔ Red people models grounded correctly

✔ Energy breakdown fully functional

✔ Bright scene with "cool" futuristic visual style`,
    credits: 'x- @EHuanglu'
  },
  {
    id: 5,
    title: 'Gravity Hands - Physics Game',
    thumbnail: '/preset5-thumb.png',
    isPremium: true,
    description: 'Camera-based hand tracking game with Matter.js physics and cyberpunk aesthetics',
    prompt: `Make a simple web game using camera to track my hand. I'll use my hand to pick up some cubes on the ground, hold it, and place it at other places (eg. on top of other cubes). Add skeleton for the hand please.

Here is the specification and implementation to upgrade your game with a robust physics engine, cyberpunk aesthetics, and an advanced UI.

Specification

Physics Engine Upgrade (Matter.js):
- Replace the custom logic with Matter.js (via CDN) to enable realistic gravity, collisions, tumbling, and stacking.
- Interaction: Implement a physics-based "Hand Proxy". When you pinch, a virtual spring constraint connects your hand coordinates to the targeted block. This allows you to drag, swing, and throw blocks naturally.
- Rotations: Blocks will now rotate and tumble when they fall or hit the ground.

Visual Overhaul (Cyberpunk/Neon):
- Hand: Replace standard skeleton lines with a glowing "digital skeleton". Joints will be neon orbs, and connections will have a gradient pulsing effect.
- Blocks: Render blocks with thick neon borders and semi-transparent fills that rotate with the physics body.
- Video Feed: The camera feed will be rendered in the background with a "scanline" overlay effect to merge it with the game UI.
- Background: An animated, drifting nebula/grid background behind the UI to make the interface feel alive.

UI/UX Redesign:
- Glassmorphism: Use highly translucent, blurred panels for controls.
- Animations: Smooth transitions for buttons and panels.
- Layout: A more immersive full-screen layout with a dedicated "HUD" overlay.

Here is the updated code to match the "Quiet Cubes" / Awwwards aesthetic: minimalist, bold typography, high contrast, and polished interactions.

I have also fixed the "missing cubes" issue by refactoring the physics engine initialization. It no longer destroys the entire world when the window resizes; it only adjusts the walls and floor.

Updated files:

index.html
- Added Space Grotesk and Inter fonts for that clean, modern design agency look.
- Updated global background styles.

constants.ts
- Updated the color palette to a sophisticated "Acid Green" and "Matte Black" theme.
- Refined physics constants.

components/GameCanvas.tsx
Major Fixes:
- Persistence: The Physics Engine is now initialized once. Resizing the window simply moves the walls and floor, preserving your stacked cubes.
- Rendering: Cubes are now rendered as solid, matte "architectural" blocks with soft shadows, rather than wireframes.
- Hand: The hand visualization is cleaner—subtle connection lines with solid white joints.
- Picture-in-Picture: Improved the camera view styling to look like a high-tech widget.

App.tsx
UI Overhaul:
- Hero Typography: Massive, centered title "GRAVITY HANDS" matching the reference style.
- Device Frame: The game canvas is housed in a sleek container that looks like a premium screen.
- Minimalist Controls: Replaced neon buttons with clean, sharp architectural buttons.
- Information Architecture: Cleaned up the layout to focus purely on the interaction.`,
    credits: 'x- @EHuanglu'
  },
  {
    id: 6,
    title: '3D Solar System - Gesture Control',
    thumbnail: '/preset6-thumb.png',
    isPremium: true,
    tutorialLink: 'https://www.instagram.com/reel/DRycxfBkUul/?igsh=MWlma3ZmZ2U0ZG1vYg==',
    description: 'Interactive 3D solar system with hand gesture controls using Three.js and MediaPipe',
    prompt: `Create a single-page web application (HTML, CSS, JavaScript) that renders an interactive, 3D solar system visualization controlled by the user's hand gestures detected via the webcam.

Core Technology Stack:
1. 3D Rendering: Use the Three.js library for rendering the 3D planets.
2. Hand Gesture Recognition: Use MediaPipe Hands (specifically the Hands model from TensorFlow.js or a direct MediaPipe CDN link) for real-time hand detection and landmark tracking.
3. UI/Layout: Use Tailwind CSS or simple vanilla CSS for a modern, dark-themed, space-like aesthetic.

Website Features & Logic:
* Initialization: The webpage must initialize the Three.js scene, renderer, and camera. It must also request and display the webcam feed. The webcam feed should be hidden or overlaid minimally, but its canvas/video element must be available for MediaPipe processing.

* 3D Scene:
  * Render a Sun (as a bright light source/sphere) and four main orbiting planets: Earth, Mars, Jupiter, and Saturn.
  * The planets should have basic textures or colors to distinguish them and must be in continuous, smooth orbit around the Sun.
  * Include a starry background.

* Gesture-to-Action Mapping (The core interaction):
  * Gesture 1 (Open Hand/Palm): When a wide-open palm gesture is detected (e.g., all fingers extended, thumb extended), the application should cycle to the next planet in the sequence (Earth → Mars → Jupiter → Saturn → Earth). The camera should smoothly transition and focus on the currently selected planet.
  * Gesture 2 (Closed Fist): When a closed fist gesture is detected (e.g., all fingers curled in), the camera should zoom in on the currently selected planet, and its rotation speed should increase by 2x.
  * Gesture 3 (Two Fingers Up/Peace Sign): When the index and middle fingers are extended (like a peace sign), the camera should zoom out and the planet's rotation/orbit speed should return to its normal speed.

* User Interface (UI):
  * A prominent, centered label should display the name of the currently focused planet (e.g., "EARTH").
  * A small, persistent "Gesture Guide" panel (like the one in the screenshot) should show:
    * Open Hand: Next Planet
    * Closed Fist: Zoom & Fast Spin
    * Peace Sign: Reset Zoom & Normal Speed
  * Ensure the design uses a dark background with vibrant 3D elements for high contrast.

Implementation Details:
* The output must be a single HTML file containing all the necessary HTML, CSS (in <style> tags or inline for simplicity), and JavaScript (in <script> tags).
* Use CDNs for all external libraries (Three.js, MediaPipe Hands, and any other dependencies).
* Include all necessary boilerplate code for setting up the webcam and the MediaPipe Hands event listeners (onResults).`,
    credits: 'x- @chetaslua'
  },
  {
    id: 7,
    title: 'Heart-Shaped Interactive Dashboard',
    thumbnail: '/preset7-thumb.png',
    isPremium: true,
    description: 'Real-time 3D particle system with hand tracking, multiple templates, and physics controls',
    prompt: `Target Platform: Web Browser (using Three.js for 3D rendering and a Web-based hand-tracking solution).

1. Core System & Technology Requirements

Develop a real-time interactive 3D particle system using Three.js for rendering and MediaPipe Hand Landmarker (or a similar WebGL/WebRTC hand tracking library) for gesture input.

Rendering: Use Three.js for a performant particle system (e.g., using THREE.Points with a custom shader or a specialized library like three-nebula).

Hand Tracking: Integrate a WebCam feed and use a hand-tracking solution to consistently detect the position and landmarks of two hands.

Aesthetics: The final interface must be simple, modern, and high-performance, maintaining a high frame rate (ideally ≥ 60 FPS).

2. Hand Gesture Interaction (The Core Feature)

The particle system's behavior must be dynamically controlled by the relative positions of the user's two hands, detected by the webcam.

Input Metric: Calculate the 'Tension/Distance' metric. This is the 3D distance between a key landmark on the left hand (e.g., the base of the index finger/palm center) and the corresponding key landmark on the right hand.

Dynamic Scaling/Expansion:
- As the hands move apart (increasing distance), the particle group must dynamically expand (increase its bounding radius, scattering the particles).
- As the hands move together (decreasing distance/closing), the particle group must dynamically contract (decrease its bounding radius, making the particles cluster tightly).

Real-Time Response: Particle movement, position, and scale must update instantaneously in response to hand movements.

3. User Interface (GUI) Requirements

Provide a clean, modern graphical user interface (GUI) panel (e.g., using Tweakpane or dat.GUI) with the following controls:

A. Particle Template Selector (Dropdown/Buttons)
Implement a mechanism to instantly switch the visual template of the particle system. Each template should have distinct visual properties (e.g., color, density, texture, movement physics).

Required Templates:
❤️ Hearts: Red/Pink particles with a heart-shaped sprite/texture.
🌸 Flowers: Pastel-colored, low-density particles with a petal sprite.
🪐 Saturn: Particles clustered in a central core with a thin, fast-orbiting ring.
🗿 Buddha Statues: (This implies using a simple 3D model or a dense cluster of particles shaped like the silhouette of a statue, where particles are emitted from its form).
🎆 Fireworks: Rapidly expanding, short-lived, colorful bursts with a distinct trail/fading effect.

B. Color Customization
Implement a color selector for the user to adjust the primary color of the active particle template.

Control: A standard Hex Color Picker (e.g., #FFFFFF).
Application: This color should be applied to the particle material's primary color, allowing the user to select, for example, a blue heart or a green firework.

C. Physics/Visual Toggles (Checkboxes/Sliders)
Include additional controls to fine-tune the particle appearance and behavior.

- Particle Size: Slider to adjust the pixel size of individual particles.
- Particle Count/Density: Slider to adjust the total number of particles rendered.
- Toggle Trails: Checkbox to enable/disable short-lived particle trails/fading.
- Gravity: Slider to adjust the simulated force of gravity on the particles (e.g., 0 to 10).`,
    credits: 'x- @chetaslua'
  },
  {
    id: 8,
    title: 'Game',
    thumbnail: '/preset8-thumb.svg',
    isPremium: true,
    prompt: '',
    description: 'Interactive hexagon game built with Gemini AI',
    credits: 'x- @flavioad',
    gameLink: 'https://gemini-3-hexagon-game.vercel.app/'
  },
];

export default function Presets() {
  const router = useRouter();
  const { isPro } = useSubscription();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const copyPrompt = () => {
    // Check if user is authenticated
    if (!user) {
      void signInWithGoogle();
      return;
    }

    if (selectedPreset) {
      navigator.clipboard.writeText(selectedPreset.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyPromptSection = (promptText: string) => {
    // Check if user is authenticated
    if (!user) {
      void signInWithGoogle();
      return;
    }

    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-obsidian relative">
      <GrungeBackground />
      <div className="relative z-10">
        <Header />
      </div>

      <section className="pt-32 pb-24 px-6 relative z-10">
        <div className="max-w-[1400px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-layer-group text-white text-xl"></i>
              </div>
              <h1 className="font-display text-5xl text-white">Presets</h1>
            </div>
            <p className="text-mist text-lg">
              Explore advanced prompts and see them in action. Copy and use in Gemini, Cursor, or any AI tool.
            </p>
          </motion.div>

          {/* Preset Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {presets.map((preset, i) => {
              const isLocked = preset.isPremium && !isPro;
              return (
                <motion.div
                  key={preset.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => {
                    setSelectedPreset(preset);
                    setCurrentSlide(0);
                  }}
                  className="border border-stone hover:border-white transition-all cursor-pointer group overflow-hidden relative"
                  style={{ background: preset.id === 8 ? '#ff0000' : '#1a1a1a' }}
                >
                  {preset.isPremium && (
                    <div className="absolute top-3 right-3 z-10 bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-3 py-1 rounded-full text-xs font-bold">
                      <i className="fa-solid fa-crown mr-1"></i>PRO
                    </div>
                  )}
                  <div className="aspect-video bg-graphite relative overflow-hidden">
                    <img
                      src={preset.thumbnail}
                      alt={preset.title}
                      className="w-full h-full object-cover"
                    />
                    <div className={`absolute inset-0 ${isLocked ? '' : 'bg-obsidian/0 group-hover:bg-obsidian/60'} transition-colors flex items-center justify-center`}>
                      {!isLocked && (
                        <i className="fa-solid fa-eye text-4xl text-white opacity-0 group-hover:opacity-100 transition-opacity"></i>
                      )}
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-display text-xl text-white mb-2">{preset.title}</h3>
                    <p className="text-mist text-sm mb-4">{preset.description}</p>
                    <div className="flex items-center gap-2 text-xs text-mist">
                      <i className={`fa-solid ${isLocked ? 'fa-lock' : 'fa-code'}`}></i>
                      <span>{isLocked ? 'Upgrade to View' : 'View Prompt'}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Modal */}
      <AnimatePresence>
        {selectedPreset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6"
            onClick={() => {
              setSelectedPreset(null);
              setShowPrompt(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-6xl w-full max-h-[90vh] overflow-y-auto bg-charcoal border border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Thumbnail / Slideshow */}
              <div className="aspect-video bg-black relative">
                {selectedPreset.slides && selectedPreset.slides.length > 1 ? (
                  <>
                    <img
                      src={selectedPreset.slides[currentSlide]}
                      alt={`${selectedPreset.title} - Slide ${currentSlide + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {/* Slideshow Controls */}
                    <button
                      onClick={() => setCurrentSlide((prev) => (prev - 1 + selectedPreset.slides!.length) % selectedPreset.slides!.length)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/70 hover:bg-black/90 rounded-full flex items-center justify-center text-white transition"
                    >
                      <i className="fa-solid fa-chevron-left"></i>
                    </button>
                    <button
                      onClick={() => setCurrentSlide((prev) => (prev + 1) % selectedPreset.slides!.length)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/70 hover:bg-black/90 rounded-full flex items-center justify-center text-white transition"
                    >
                      <i className="fa-solid fa-chevron-right"></i>
                    </button>
                    {/* Slide Indicators */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {selectedPreset.slides.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentSlide(idx)}
                          className={`w-2 h-2 rounded-full transition ${
                            idx === currentSlide ? 'bg-white' : 'bg-white/40'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <img
                    src={selectedPreset.thumbnail}
                    alt={selectedPreset.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* Content */}
              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="font-display text-3xl text-white mb-2">{selectedPreset.title}</h2>
                    <p className="text-mist mb-3">{selectedPreset.description}</p>
                    {selectedPreset.credits && (
                      <div className={`inline-block px-3 py-1 rounded text-sm font-mono ${
                        selectedPreset.id === 1 
                          ? 'bg-white/20 text-white border border-white/30' 
                          : 'bg-white/10 text-mist'
                      }`}>
                        {selectedPreset.credits}
                      </div>
                    )}
                    {selectedPreset.tutorialLink && (
                      <div className="mt-4">
                        <a
                          href={selectedPreset.tutorialLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:from-purple-700 hover:via-pink-700 hover:to-orange-600 rounded-xl text-white font-bold text-lg transition-all hover:scale-105 shadow-lg shadow-pink-500/50"
                        >
                          <i className="fa-brands fa-instagram text-2xl"></i>
                          <span>View on Instagram</span>
                          <i className="fa-solid fa-external-link"></i>
                        </a>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedPreset(null);
                      setShowPrompt(false);
                    }}
                    className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition"
                  >
                    <i className="fa-solid fa-times"></i>
                  </button>
                </div>

                {/* View Prompt Button or Game Button */}
                {!showPrompt && (
                  selectedPreset.gameLink ? (
                    selectedPreset.isPremium && !isPro ? (
                      <button
                        onClick={() => router.push('/pricing')}
                        className="w-full py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black rounded-lg font-display text-lg hover:from-yellow-500 hover:to-orange-600 transition-all hover:scale-105 mb-6 flex items-center justify-center"
                      >
                        <i className="fa-solid fa-crown mr-2"></i>
                        Upgrade to Pro to Play
                      </button>
                    ) : (
                      <a
                        href={selectedPreset.gameLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-4 bg-white text-black rounded-lg font-display text-lg hover:bg-white/90 transition-all hover:scale-105 mb-6 flex items-center justify-center"
                      >
                        <i className="fa-solid fa-gamepad mr-2"></i>
                        Click Here to Play Game
                      </a>
                    )
                  ) : (
                    selectedPreset.isPremium && !isPro ? (
                      <button
                        onClick={() => router.push('/pricing')}
                        className="w-full py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black rounded-lg font-display text-lg hover:from-yellow-500 hover:to-orange-600 transition-all hover:scale-105 mb-6"
                      >
                        <i className="fa-solid fa-crown mr-2"></i>
                        Upgrade to Pro to View Prompt
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowPrompt(true)}
                        className="w-full py-4 bg-white text-black rounded-lg font-display text-lg hover:bg-white/90 transition-all hover:scale-105 mb-6"
                      >
                        <i className="fa-solid fa-eye mr-2"></i>
                        View Full Prompt
                      </button>
                    )
                  )
                )}

                {/* Prompt Display */}
                {showPrompt && (
                  selectedPreset.id === 12 ? (
                    // Special handling for preset 12 with 3 separate prompts (FREE - no Pro required)
                    <div className="space-y-4">
                      {selectedPreset.prompt.split('---').map((promptSection, index) => {
                        const trimmedPrompt = promptSection.trim();
                        if (!trimmedPrompt) return null;
                        
                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="border border-white/20 rounded-lg overflow-hidden"
                          >
                            <div className="bg-graphite p-4 flex items-center justify-between border-b border-white/10">
                              <span className="text-white font-mono text-sm">
                                <i className="fa-solid fa-code mr-2"></i>
                                {trimmedPrompt.split('\n')[0]}
                              </span>
                              <button
                                onClick={() => copyPromptSection(trimmedPrompt)}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-white text-sm transition"
                              >
                                <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'} mr-2`}></i>
                                {copied ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                            <div className="p-6 bg-obsidian max-h-96 overflow-y-auto">
                              <pre className="text-white text-sm font-mono whitespace-pre-wrap leading-relaxed">
                                {trimmedPrompt}
                              </pre>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    // Default single prompt display
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="border border-white/20 rounded-lg overflow-hidden"
                    >
                      <div className="bg-graphite p-4 flex items-center justify-between border-b border-white/10">
                        <span className="text-white font-mono text-sm">
                          <i className="fa-solid fa-code mr-2"></i>
                          Full Prompt
                        </span>
                        {selectedPreset.isPremium && !isPro ? (
                          <button
                            onClick={() => router.push('/pricing')}
                            className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black rounded font-bold text-sm transition hover:from-yellow-500 hover:to-orange-600"
                          >
                            <i className="fa-solid fa-crown mr-2"></i>
                            Upgrade to Copy
                          </button>
                        ) : !user ? (
                          <button
                            onClick={() => { void signInWithGoogle(); }}
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded font-bold text-sm transition hover:from-purple-700 hover:to-pink-700"
                          >
                            <i className="fa-solid fa-sign-in-alt mr-2"></i>
                            Sign In to Copy
                          </button>
                        ) : (
                          <button
                            onClick={copyPrompt}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-white text-sm transition"
                          >
                            <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'} mr-2`}></i>
                            {copied ? 'Copied!' : 'Copy'}
                          </button>
                        )}
                      </div>
                      <div className="p-6 bg-obsidian max-h-96 overflow-y-auto">
                        <pre className="text-white text-sm font-mono whitespace-pre-wrap leading-relaxed">
                          {selectedPreset.prompt}
                        </pre>
                      </div>
                    </motion.div>
                  )
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="py-12 border-t border-stone bg-obsidian">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
          <div>
            <span className="font-display font-bold text-2xl tracking-tight text-white block mb-2">
              DRAFTLY
            </span>
            <p className="text-xs text-ash font-mono">© 2025 DRAFTLY INC. SYSTEM OPERATIONAL.</p>
          </div>
          <div className="flex gap-6">
            <a href="https://x.com/Piyush_Sxt" target="_blank" rel="noopener noreferrer" className="text-ash hover:text-white transition-colors">
              <i className="fa-brands fa-x-twitter"></i>
            </a>
            <a href="https://www.instagram.com/piyush.glitch" target="_blank" rel="noopener noreferrer" className="text-ash hover:text-white transition-colors">
              <i className="fa-brands fa-instagram"></i>
            </a>
            <a href="https://www.linkedin.com/in/piyush-singh-023507359" target="_blank" rel="noopener noreferrer" className="text-ash hover:text-white transition-colors">
              <i className="fa-brands fa-linkedin"></i>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
