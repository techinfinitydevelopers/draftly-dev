'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface GeneratedContent {
  id: string;
  type: 'email' | 'social' | 'ad' | 'seo';
  title: string;
  content: string;
  platforms?: string[];
}

interface ContentGeneratorProps {
  siteCode: string | null;
  bgImageUrl: string | null;
}

export function ContentGenerator({ siteCode, bgImageUrl }: ContentGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [selectedType, setSelectedType] = useState<'email' | 'social' | 'ad' | 'seo'>('email');

  // Extract business info from site code
  const extractBusinessInfo = (code: string) => {
    const titleMatch = code.match(/<title>([^<]+)<\/title>/i);
    const headingMatch = code.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const descMatch = code.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
    
    return {
      name: titleMatch?.[1] || headingMatch?.[1] || 'Your Business',
      description: descMatch?.[1] || 'AI-powered solutions for modern businesses'
    };
  };

  const generateContent = async () => {
    if (!siteCode) return;
    
    setGenerating(true);
    const info = extractBusinessInfo(siteCode);

    // Simulate AI generation
    setTimeout(() => {
      const newContent: GeneratedContent[] = [];

      if (selectedType === 'email') {
        newContent.push(
          {
            id: 'email-1',
            type: 'email',
            title: 'Welcome Email',
            content: `Subject: Welcome to ${info.name}! 🚀\n\nHi there,\n\nWelcome to ${info.name}! We're excited to have you on board.\n\n${info.description}\n\nHere's what you can do next:\n• Explore our features\n• Book a demo\n• Join our community\n\nNeed help? Just reply to this email.\n\nBest,\nThe ${info.name} Team`
          },
          {
            id: 'email-2',
            type: 'email',
            title: 'Follow-up: Value Proposition',
            content: `Subject: Here's how ${info.name} saves you time\n\nHi there,\n\nI wanted to follow up and share exactly how ${info.name} can help:\n\n✅ Save 5+ hours per week\n✅ Automate repetitive tasks\n✅ Get better results with AI\n\nReady to see it in action?\n\n[Schedule a 15-min demo]\n\nBest,\nThe ${info.name} Team`
          }
        );
      }

      if (selectedType === 'social') {
        newContent.push(
          {
            id: 'social-1',
            type: 'social',
            title: 'LinkedIn Post',
            content: `🚀 Just launched: ${info.name}\n\n${info.description}\n\nAfter months of building, I'm excited to share what we've created:\n\n✨ AI-powered workflows\n✨ 10x faster content creation\n✨ Built for modern teams\n\nCheck it out and let me know what you think! 👇\n\n#AI #Productivity #SaaS #Startup`,
            platforms: ['LinkedIn']
          },
          {
            id: 'social-2',
            type: 'social',
            title: 'Twitter/X Thread',
            content: `🧵 How ${info.name} was built:\n\n1/ I was tired of repetitive tasks\n2/ Wanted AI that actually understands context\n3/ Built a system that learns and improves\n4/ Launched to 500 beta users in 48 hours\n\nHere's what I learned 👇\n\n#buildinpublic #indiehackers`,
            platforms: ['Twitter']
          },
          {
            id: 'social-3',
            type: 'social',
            title: 'Instagram Caption',
            content: `✨ Meet your new AI assistant\n\n${info.description.split('.')[0]}\n\nReady to level up? 🔗 Link in bio\n\n#AI #Tech #Innovation #Business #Growth`,
            platforms: ['Instagram']
          }
        );
      }

      if (selectedType === 'ad') {
        newContent.push(
          {
            id: 'ad-1',
            type: 'ad',
            title: 'Google Search Ad',
            content: `Headline: ${info.name} - AI That Works for You\n\nDescription: ${info.description}. Save 10+ hours/week. Start free trial today.\n\nCTA: Start Free Trial\n\nKeywords: AI tools, automation, productivity software`
          },
          {
            id: 'ad-2',
            type: 'ad',
            title: 'Facebook Ad',
            content: `Primary Text: Tired of manual tasks? ${info.name} uses AI to automate your workflow and boost productivity. Join 1,000+ teams already saving time.\n\nHeadline: Work Smarter with AI\n\nDescription: Start your free trial - no credit card required\n\nCTA: Sign Up`
          }
        );
      }

      if (selectedType === 'seo') {
        newContent.push(
          {
            id: 'seo-1',
            type: 'seo',
            title: 'Blog Post: "10 Ways to Use AI in Your Business"',
            content: `Title: 10 Ways AI Can Transform Your Business in 2024\n\nMeta: Discover how artificial intelligence can automate tasks, improve decision-making, and boost your bottom line.\n\nOutline:\n1. Automate customer support\n2. Personalize marketing\n3. Optimize pricing\n4. Predict inventory needs\n5. Generate content at scale\n6. Analyze competitor data\n7. Improve hiring decisions\n8. Detect fraud\n9. Enhance product recommendations\n10. Streamline operations\n\nFocus keyword: "AI business tools"\nWord count target: 1,500 words`
          },
          {
            id: 'seo-2',
            type: 'seo',
            title: 'FAQ Section for SEO',
            content: `Q: What is ${info.name}?\nA: ${info.description}\n\nQ: How does the AI work?\nA: Our AI uses advanced machine learning to understand your needs and automate tasks intelligently.\n\nQ: Is there a free trial?\nA: Yes! You can try all features free for 14 days.\n\nQ: How much does it cost?\nA: Plans start at $29/month. View pricing for details.\n\nQ: Can I cancel anytime?\nA: Absolutely. No contracts, cancel whenever you want.`
          }
        );
      }

      setGeneratedContent(newContent);
      setGenerating(false);
    }, 1500);
  };

  const contentTypes = [
    { id: 'email', label: 'Email', icon: 'envelope', desc: 'Welcome, nurture, sales sequences' },
    { id: 'social', label: 'Social', icon: 'share-nodes', desc: 'Posts for LinkedIn, Twitter, Instagram' },
    { id: 'ad', label: 'Ads', icon: 'bullhorn', desc: 'Google, Facebook ad copy' },
    { id: 'seo', label: 'SEO', icon: 'magnifying-glass', desc: 'Blog posts, FAQs, meta tags' },
  ] as const;

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    // Could add toast here
  };

  return (
    <div className="space-y-4">
      {/* Content Type Selection */}
      <div className="grid grid-cols-2 gap-2">
        {contentTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => { setSelectedType(type.id); setGeneratedContent([]); }}
            className={`p-3 rounded-lg border text-left transition-all ${
              selectedType === type.id
                ? 'bg-white/10 border-white/30'
                : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <i className={`fa-solid fa-${type.icon} text-white/70`} />
              <span className="text-[12px] font-bold text-white">{type.label}</span>
            </div>
            <p className="text-[9px] text-white/40">{type.desc}</p>
          </button>
        ))}
      </div>

      {/* Generate Button */}
      <button
        onClick={generateContent}
        disabled={generating || !siteCode}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[12px] font-bold hover:opacity-90 transition-all disabled:opacity-50"
      >
        {generating ? (
          <>
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              Generating {selectedType} content...
            </motion.span>
          </>
        ) : (
          <>
            <i className="fa-solid fa-wand-magic-sparkles mr-2" />
            Generate {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Content
          </>
        )}
      </button>

      {!siteCode && (
        <p className="text-[11px] text-white/50 text-center">
          Build your site first to generate relevant content
        </p>
      )}

      {/* Generated Content */}
      {generatedContent.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-bold text-white/60 uppercase">
              Generated ({generatedContent.length})
            </h4>
            <button
              onClick={() => setGeneratedContent([])}
              className="text-[10px] text-white/40 hover:text-white"
            >
              Clear
            </button>
          </div>

          {generatedContent.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-bold text-white">{item.title}</span>
                <button
                  onClick={() => copyToClipboard(item.content)}
                  className="text-[10px] text-white/50 hover:text-white"
                >
                  <i className="fa-regular fa-copy" />
                </button>
              </div>
              
              <div className="bg-black/30 rounded-lg p-2 mb-2 max-h-32 overflow-y-auto">
                <pre className="text-[10px] text-white/70 whitespace-pre-wrap font-mono leading-relaxed">
                  {item.content}
                </pre>
              </div>

              {item.platforms && (
                <div className="flex gap-1">
                  {item.platforms.map((platform) => (
                    <span key={platform} className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                      {platform}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
