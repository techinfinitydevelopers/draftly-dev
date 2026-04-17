'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export interface ProjectRequirements {
  projectName: string;
  description: string;
  framework: 'nextjs' | 'react' | 'vue' | 'vanilla';
  features: string[];
  styling: 'tailwind' | 'css' | 'styled-components';
  includeBackend: boolean;
  backendFeatures?: string[];
  authentication?: boolean;
  database?: boolean;
  colorTheme?: string;
  businessType?: string;
}

interface RequirementsFormProps {
  onSubmit: (requirements: ProjectRequirements) => void;
  onCancel?: () => void;
  initialData?: Partial<ProjectRequirements>;
}

const AVAILABLE_FEATURES = [
  { id: 'auth', label: 'Authentication', description: 'User login and registration' },
  { id: 'database', label: 'Database', description: 'Data persistence layer' },
  { id: 'api', label: 'API Endpoints', description: 'RESTful API routes' },
  { id: 'payments', label: 'Payments', description: 'Payment processing integration' },
  { id: 'analytics', label: 'Analytics', description: 'Usage tracking and metrics' },
  { id: 'search', label: 'Search', description: 'Search functionality' },
  { id: 'notifications', label: 'Notifications', description: 'Push notifications' },
  { id: 'file-upload', label: 'File Upload', description: 'File upload and storage' },
];

const BACKEND_FEATURES = [
  { id: 'crud', label: 'CRUD Operations', description: 'Create, Read, Update, Delete' },
  { id: 'auth-api', label: 'Auth API', description: 'Authentication endpoints' },
  { id: 'file-api', label: 'File API', description: 'File handling endpoints' },
  { id: 'email', label: 'Email Service', description: 'Email sending functionality' },
];

export default function RequirementsForm({ onSubmit, onCancel, initialData }: RequirementsFormProps) {
  const [requirements, setRequirements] = useState<ProjectRequirements>({
    projectName: initialData?.projectName || '',
    description: initialData?.description || '',
    framework: initialData?.framework || 'nextjs',
    features: initialData?.features || [],
    styling: initialData?.styling || 'tailwind',
    includeBackend: initialData?.includeBackend || false,
    backendFeatures: initialData?.backendFeatures || [],
    authentication: initialData?.authentication || false,
    database: initialData?.database || false,
    colorTheme: initialData?.colorTheme || '',
    businessType: initialData?.businessType || '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!requirements.projectName.trim()) {
      newErrors.projectName = 'Project name is required';
    }

    if (!requirements.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (requirements.description.length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(requirements);
    }
  };

  const toggleFeature = (featureId: string) => {
    setRequirements(prev => {
      const features = prev.features.includes(featureId)
        ? prev.features.filter(f => f !== featureId)
        : [...prev.features, featureId];
      
      // Auto-enable related options
      const authentication = features.includes('auth') || prev.authentication;
      const database = features.includes('database') || prev.database;
      
      return { ...prev, features, authentication, database };
    });
  };

  const toggleBackendFeature = (featureId: string) => {
    setRequirements(prev => ({
      ...prev,
      backendFeatures: prev.backendFeatures?.includes(featureId)
        ? prev.backendFeatures.filter(f => f !== featureId)
        : [...(prev.backendFeatures || []), featureId],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Project Name */}
      <div>
        <label className="block text-white font-mono text-sm mb-2">
          Project Name <span className="text-orange-500">*</span>
        </label>
        <input
          type="text"
          value={requirements.projectName}
          onChange={(e) => setRequirements(prev => ({ ...prev, projectName: e.target.value }))}
          className="w-full bg-charcoal border-2 border-orange-500/30 rounded-lg px-4 py-3 text-white font-mono focus:border-orange-500 focus:outline-none"
          placeholder="my-awesome-app"
        />
        {errors.projectName && (
          <p className="text-red-400 text-xs mt-1">{errors.projectName}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-white font-mono text-sm mb-2">
          Project Description <span className="text-orange-500">*</span>
        </label>
        <textarea
          value={requirements.description}
          onChange={(e) => setRequirements(prev => ({ ...prev, description: e.target.value }))}
          rows={4}
          className="w-full bg-charcoal border-2 border-orange-500/30 rounded-lg px-4 py-3 text-white font-mono focus:border-orange-500 focus:outline-none resize-none"
          placeholder="Describe what you want to build. Be specific about features, target audience, and functionality..."
        />
        {errors.description && (
          <p className="text-red-400 text-xs mt-1">{errors.description}</p>
        )}
        <p className="text-mist/60 text-xs mt-1">
          {requirements.description.length}/20 characters minimum
        </p>
      </div>

      {/* Framework Selection */}
      <div>
        <label className="block text-white font-mono text-sm mb-3">
          Framework <span className="text-orange-500">*</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['nextjs', 'react', 'vue', 'vanilla'] as const).map((fw) => (
            <button
              key={fw}
              type="button"
              onClick={() => setRequirements(prev => ({ ...prev, framework: fw }))}
              className={`p-4 border-2 rounded-lg transition ${
                requirements.framework === fw
                  ? 'border-orange-500 bg-orange-500/20 text-white'
                  : 'border-stone hover:border-orange-400 text-mist hover:text-white'
              }`}
            >
              <div className="font-mono text-sm font-bold capitalize">{fw}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Styling Preference */}
      <div>
        <label className="block text-white font-mono text-sm mb-3">
          Styling Framework
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(['tailwind', 'css', 'styled-components'] as const).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => setRequirements(prev => ({ ...prev, styling: style }))}
              className={`p-3 border-2 rounded-lg transition ${
                requirements.styling === style
                  ? 'border-orange-500 bg-orange-500/20 text-white'
                  : 'border-stone hover:border-orange-400 text-mist hover:text-white'
              }`}
            >
              <div className="font-mono text-xs capitalize">{style}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Features */}
      <div>
        <label className="block text-white font-mono text-sm mb-3">
          Features
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {AVAILABLE_FEATURES.map((feature) => (
            <button
              key={feature.id}
              type="button"
              onClick={() => toggleFeature(feature.id)}
              className={`p-3 border-2 rounded-lg text-left transition ${
                requirements.features.includes(feature.id)
                  ? 'border-orange-500 bg-orange-500/20'
                  : 'border-stone hover:border-orange-400'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="checkbox"
                  checked={requirements.features.includes(feature.id)}
                  onChange={() => {}}
                  className="w-4 h-4 text-orange-500"
                />
                <span className="text-white font-mono text-xs font-bold">{feature.label}</span>
              </div>
              <p className="text-mist/70 text-xs">{feature.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Backend Options */}
      <div>
        <label className="flex items-center gap-2 text-white font-mono text-sm mb-3">
          <input
            type="checkbox"
            checked={requirements.includeBackend}
            onChange={(e) => setRequirements(prev => ({ ...prev, includeBackend: e.target.checked }))}
            className="w-4 h-4 text-orange-500"
          />
          Include Backend Functionality
        </label>

        {requirements.includeBackend && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 space-y-3"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {BACKEND_FEATURES.map((feature) => (
                <button
                  key={feature.id}
                  type="button"
                  onClick={() => toggleBackendFeature(feature.id)}
                  className={`p-3 border-2 rounded-lg text-left transition ${
                    requirements.backendFeatures?.includes(feature.id)
                      ? 'border-orange-500 bg-orange-500/20'
                      : 'border-stone hover:border-orange-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="checkbox"
                      checked={requirements.backendFeatures?.includes(feature.id)}
                      onChange={() => {}}
                      className="w-4 h-4 text-orange-500"
                    />
                    <span className="text-white font-mono text-xs">{feature.label}</span>
                  </div>
                  <p className="text-mist/70 text-xs">{feature.description}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Business Type & Color Theme */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-white font-mono text-sm mb-2">
            Business Type (Optional)
          </label>
          <input
            type="text"
            value={requirements.businessType}
            onChange={(e) => setRequirements(prev => ({ ...prev, businessType: e.target.value }))}
            className="w-full bg-charcoal border-2 border-orange-500/30 rounded-lg px-4 py-3 text-white font-mono focus:border-orange-500 focus:outline-none"
            placeholder="e.g., SaaS, E-commerce, Portfolio"
          />
        </div>

        <div>
          <label className="block text-white font-mono text-sm mb-2">
            Color Theme (Optional)
          </label>
          <input
            type="text"
            value={requirements.colorTheme}
            onChange={(e) => setRequirements(prev => ({ ...prev, colorTheme: e.target.value }))}
            className="w-full bg-charcoal border-2 border-orange-500/30 rounded-lg px-4 py-3 text-white font-mono focus:border-orange-500 focus:outline-none"
            placeholder="e.g., Dark, Blue, Purple"
          />
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-mono font-bold py-3 px-6 rounded-lg hover:from-orange-600 hover:to-orange-700 transition shadow-lg shadow-orange-500/30"
        >
          Generate Architecture Proposal
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border-2 border-stone text-mist font-mono rounded-lg hover:border-orange-400 hover:text-white transition"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

