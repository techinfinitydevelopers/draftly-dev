/**
 * Natural Language Command Interpreter
 * Converts user-friendly commands into structured AI prompts
 */

export interface NLCommand {
  original: string;
  matched: boolean;
  type: 'design' | 'content' | 'conversion' | 'business' | 'unknown';
  prompt: string;
  action: string;
}

const commandPatterns: Array<{
  patterns: string[];
  type: NLCommand['type'];
  promptTemplate: string;
  action: string;
}> = [
  // Design improvements
  {
    patterns: ['make it more premium', 'make this premium', 'looks cheap', 'upgrade design', 'premium feel', 'luxury look'],
    type: 'design',
    promptTemplate: 'Upgrade the design to look premium and high-end. Use sophisticated colors (deep navy, charcoal, gold accents), increase whitespace, use modern typography with better hierarchy, add subtle animations, and ensure all elements feel polished and expensive. Keep the same content but make it visually stunning.',
    action: 'Upgrade to premium design'
  },
  {
    patterns: ['make it modern', 'modern design', 'looks outdated', 'refresh design', 'modern look', 'update style'],
    type: 'design',
    promptTemplate: 'Modernize the design with current 2024 trends: use glassmorphism effects, gradient accents, modern rounded corners, better spacing system, and contemporary typography. Ensure mobile-first responsive design.',
    action: 'Modernize design'
  },
  {
    patterns: ['make it minimal', 'simplify', 'clean design', 'minimalist', 'less clutter', 'simple look'],
    type: 'design',
    promptTemplate: 'Simplify to a minimal, clean design. Remove unnecessary elements, increase whitespace, use a restrained color palette (max 3 colors), focus on typography hierarchy, and ensure every element has a clear purpose.',
    action: 'Simplify to minimal design'
  },
  {
    patterns: ['dark mode', 'make it dark', 'dark theme', 'black background', 'dark design'],
    type: 'design',
    promptTemplate: 'Convert to an elegant dark mode design. Use deep charcoal (#0a0a0a, #121212) backgrounds, pure white text with reduced opacity levels (90%, 70%, 50%), subtle accent colors for CTAs, and ensure proper contrast ratios.',
    action: 'Apply dark theme'
  },
  {
    patterns: ['light mode', 'make it light', 'white background', 'bright design', 'light theme'],
    type: 'design',
    promptTemplate: 'Convert to a clean light mode design. Use white or off-white (#fafafa) backgrounds, dark text (#1a1a1a), subtle shadows for depth, and maintain elegant spacing.',
    action: 'Apply light theme'
  },

  // Content additions
  {
    patterns: ['add testimonials', 'testimonial section', 'customer reviews', 'add reviews', 'social proof'],
    type: 'content',
    promptTemplate: 'Add a compelling testimonials section with 3 customer quotes. Include star ratings, customer photos (placeholder), names, and titles. Use a grid or carousel layout. Place after the hero section.',
    action: 'Add testimonials section'
  },
  {
    patterns: ['add pricing', 'pricing section', 'pricing plans', 'add plans', 'show prices'],
    type: 'business',
    promptTemplate: 'Add a clear 3-tier pricing section (Starter $29/mo, Pro $79/mo, Enterprise $199/mo). Highlight the recommended plan (Pro). Include feature lists, pricing toggle (monthly/yearly), and prominent CTA buttons.',
    action: 'Add pricing section'
  },
  {
    patterns: ['add faq', 'faq section', 'frequently asked questions', 'common questions', 'add questions'],
    type: 'content',
    promptTemplate: 'Add an FAQ section with 5 common questions about the product/service. Use an accordion/expansion layout. Include questions about pricing, features, support, and getting started.',
    action: 'Add FAQ section'
  },
  {
    patterns: ['add contact form', 'contact form', 'lead form', 'signup form', 'capture emails'],
    type: 'business',
    promptTemplate: 'Add a lead capture form with name, email, and message fields. Include a compelling headline, brief value proposition, and privacy assurance. Use validation and a prominent submit button.',
    action: 'Add contact form'
  },
  {
    patterns: ['add team', 'team section', 'show team', 'team members', 'about team'],
    type: 'content',
    promptTemplate: 'Add a team section showing 3-4 team members with photos (placeholders), names, titles, and brief bios. Use a clean grid layout with hover effects.',
    action: 'Add team section'
  },
  {
    patterns: ['add blog', 'blog section', 'latest posts', 'articles', 'content section'],
    type: 'content',
    promptTemplate: 'Add a blog/articles section with 3 featured posts. Include thumbnails, titles, excerpts, read time, and publication dates. Use a card-based grid layout.',
    action: 'Add blog section'
  },
  {
    patterns: ['add footer', 'footer section', 'site footer', 'bottom section'],
    type: 'content',
    promptTemplate: 'Add a comprehensive footer with: logo, quick links, social media icons, newsletter signup, contact info, and copyright. Use a multi-column layout.',
    action: 'Add footer'
  },

  // Conversion optimization
  {
    patterns: ['add cta', 'call to action', 'more ctas', 'signup button', 'get started button'],
    type: 'conversion',
    promptTemplate: 'Add multiple strategic CTAs throughout the page. Include a sticky header CTA, hero CTA, section CTAs, and a final CTA. Use contrasting button colors, action-oriented text ("Get Started", "Start Free Trial"), and urgency elements.',
    action: 'Add CTAs throughout'
  },
  {
    patterns: ['improve conversion', 'increase sales', 'better conversion', 'optimize for sales', 'get more signups'],
    type: 'conversion',
    promptTemplate: 'Optimize for conversions: Add urgency elements (limited time), social proof (user count, testimonials), trust badges (security, guarantees), clear value propositions, risk reversal (free trial, money-back), and reduce form fields.',
    action: 'Optimize for conversion'
  },
  {
    patterns: ['add urgency', 'scarcity', 'limited time', 'countdown timer', 'urgent message'],
    type: 'conversion',
    promptTemplate: 'Add urgency elements: countdown timer for offers, limited spots messaging, flash sale badges, and time-sensitive CTAs. Use red/orange accent colors for urgency.',
    action: 'Add urgency elements'
  },
  {
    patterns: ['add trust badges', 'trust signals', 'security badges', 'guarantee', 'safe checkout'],
    type: 'conversion',
    promptTemplate: 'Add trust elements: security badges (SSL, secure payment), money-back guarantee badges, customer count ("Join 10,000+ users"), featured-in logos, and certification badges.',
    action: 'Add trust badges'
  },

  // Business features
  {
    patterns: ['add newsletter', 'email signup', 'subscribe', 'stay updated', 'email capture'],
    type: 'business',
    promptTemplate: 'Add a newsletter signup section with email input, compelling headline ("Get weekly insights"), value proposition, and privacy assurance. Use a prominent, well-designed form.',
    action: 'Add newsletter signup'
  },
  {
    patterns: ['add features', 'features section', 'what we offer', 'services', 'capabilities'],
    type: 'content',
    promptTemplate: 'Add a features/services section with 6 key offerings. Use icons, clear headings, and concise descriptions. Use a 3x2 grid or feature cards with hover effects.',
    action: 'Add features section'
  },
  {
    patterns: ['add stats', 'numbers', 'show metrics', 'achievements', 'social proof numbers'],
    type: 'content',
    promptTemplate: 'Add a stats/achievements section with 4 impressive numbers (users, customers, years, satisfaction %). Use large typography and brief labels. Include subtle animations.',
    action: 'Add stats section'
  },

  // SEO
  {
    patterns: ['improve seo', 'better seo', 'seo optimization', 'search ranking', 'meta tags'],
    type: 'business',
    promptTemplate: 'Optimize for SEO: Add proper heading hierarchy (H1, H2, H3), meta description, alt text for images, internal linking, schema markup structure, and keyword-rich content sections.',
    action: 'Optimize SEO'
  },
];

export function interpretCommand(userInput: string): NLCommand {
  const lowerInput = userInput.toLowerCase().trim();

  // Check for command patterns
  for (const command of commandPatterns) {
    for (const pattern of command.patterns) {
      if (lowerInput.includes(pattern)) {
        return {
          original: userInput,
          matched: true,
          type: command.type,
          prompt: command.promptTemplate,
          action: command.action
        };
      }
    }
  }

  // No pattern matched - return as-is
  return {
    original: userInput,
    matched: false,
    type: 'unknown',
    prompt: userInput,
    action: 'Custom request'
  };
}

export function getAvailableCommands(): Array<{ category: string; commands: string[] }> {
  return [
    {
      category: 'Design',
      commands: [
        'make it more premium',
        'make it modern',
        'make it minimal',
        'dark mode',
        'light mode'
      ]
    },
    {
      category: 'Content',
      commands: [
        'add testimonials',
        'add pricing',
        'add FAQ',
        'add contact form',
        'add team',
        'add blog',
        'add features',
        'add stats'
      ]
    },
    {
      category: 'Conversion',
      commands: [
        'add CTA buttons',
        'improve conversion',
        'add urgency',
        'add trust badges'
      ]
    },
    {
      category: 'Business',
      commands: [
        'add newsletter',
        'improve SEO',
        'add footer'
      ]
    }
  ];
}
