'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox';
  label: string;
  placeholder: string;
  required: boolean;
  options?: string[]; // for select
}

export interface FormConfig {
  title: string;
  description: string;
  submitText: string;
  successMessage: string;
  fields: FormField[];
  collectAnalytics: boolean;
  enableNotifications: boolean;
}

interface FormBuilderProps {
  onGenerateForm: (config: FormConfig) => void;
}

const fieldTemplates: Array<{ type: FormField['type']; label: string; icon: string; defaultPlaceholder: string }> = [
  { type: 'text', label: 'Full Name', icon: 'user', defaultPlaceholder: 'John Doe' },
  { type: 'email', label: 'Email Address', icon: 'envelope', defaultPlaceholder: 'john@example.com' },
  { type: 'tel', label: 'Phone Number', icon: 'phone', defaultPlaceholder: '+1 (555) 000-0000' },
  { type: 'textarea', label: 'Message', icon: 'comment', defaultPlaceholder: 'Tell us about your project...' },
  { type: 'select', label: 'Budget Range', icon: 'tag', defaultPlaceholder: '' },
  { type: 'checkbox', label: 'Newsletter', icon: 'check-square', defaultPlaceholder: '' },
];

export function FormBuilder({ onGenerateForm }: FormBuilderProps) {
  const [config, setConfig] = useState<FormConfig>({
    title: 'Get in Touch',
    description: 'Fill out the form below and we\'ll get back to you within 24 hours.',
    submitText: 'Send Message',
    successMessage: 'Thanks! We\'ll be in touch soon.',
    fields: [
      { id: '1', type: 'text', label: 'Full Name', placeholder: 'John Doe', required: true },
      { id: '2', type: 'email', label: 'Email Address', placeholder: 'john@example.com', required: true },
      { id: '3', type: 'textarea', label: 'Message', placeholder: 'How can we help?', required: false },
    ],
    collectAnalytics: true,
    enableNotifications: true,
  });

  const addField = (template: typeof fieldTemplates[0]) => {
    const newField: FormField = {
      id: Date.now().toString(),
      type: template.type,
      label: template.label,
      placeholder: template.defaultPlaceholder,
      required: template.type !== 'checkbox',
      options: template.type === 'select' ? ['$1k-5k', '$5k-10k', '$10k-25k', '$25k+'] : undefined,
    };
    setConfig(prev => ({ ...prev, fields: [...prev.fields, newField] }));
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setConfig(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === id ? { ...f, ...updates } : f)
    }));
  };

  const removeField = (id: string) => {
    setConfig(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== id)
    }));
  };

  const moveField = (id: string, direction: 'up' | 'down') => {
    const index = config.fields.findIndex(f => f.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === config.fields.length - 1) return;

    const newFields = [...config.fields];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    setConfig(prev => ({ ...prev, fields: newFields }));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.06]">
        <h3 className="text-[14px] font-bold text-white mb-1">Form Builder</h3>
        <p className="text-[11px] text-white/50">Create lead capture forms in seconds</p>
      </div>

      {/* Form Settings */}
      <div className="p-4 space-y-3 border-b border-white/[0.06]">
        <div>
          <label className="text-[11px] text-white/60 mb-1 block">Form Title</label>
          <input
            type="text"
            value={config.title}
            onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white"
          />
        </div>
        <div>
          <label className="text-[11px] text-white/60 mb-1 block">Description</label>
          <input
            type="text"
            value={config.description}
            onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white"
          />
        </div>
        <div>
          <label className="text-[11px] text-white/60 mb-1 block">Submit Button Text</label>
          <input
            type="text"
            value={config.submitText}
            onChange={(e) => setConfig(prev => ({ ...prev, submitText: e.target.value }))}
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white"
          />
        </div>
      </div>

      {/* Fields List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {config.fields.map((field, index) => (
            <motion.div
              key={field.id}
              layout
              className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <i className={`fa-solid fa-${field.type === 'text' ? 'font' : field.type === 'email' ? 'envelope' : field.type === 'tel' ? 'phone' : field.type === 'textarea' ? 'align-left' : field.type === 'select' ? 'list' : 'check-square'} text-white/40 text-xs`} />
                  <span className="text-[12px] font-medium text-white">{field.label}</span>
                  {field.required && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">Required</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveField(field.id, 'up')}
                    disabled={index === 0}
                    className="p-1 rounded hover:bg-white/10 text-white/40 disabled:opacity-30"
                  >
                    <i className="fa-solid fa-chevron-up text-xs" />
                  </button>
                  <button
                    onClick={() => moveField(field.id, 'down')}
                    disabled={index === config.fields.length - 1}
                    className="p-1 rounded hover:bg-white/10 text-white/40 disabled:opacity-30"
                  >
                    <i className="fa-solid fa-chevron-down text-xs" />
                  </button>
                  <button
                    onClick={() => removeField(field.id)}
                    className="p-1 rounded hover:bg-red-500/10 text-red-400"
                  >
                    <i className="fa-solid fa-trash text-xs" />
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={field.placeholder}
                onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                placeholder="Placeholder text"
                className="w-full bg-black/30 border border-white/[0.06] rounded-lg px-3 py-1.5 text-[11px] text-white/70"
              />
            </motion.div>
          ))}
        </div>

        {config.fields.length === 0 && (
          <div className="text-center py-6">
            <i className="fa-solid fa-clipboard-list text-3xl text-white/20 mb-2" />
            <p className="text-[12px] text-white/50">Add fields to your form</p>
          </div>
        )}
      </div>

      {/* Add Field Buttons */}
      <div className="p-4 border-t border-white/[0.06]">
        <p className="text-[10px] text-white/40 mb-2 uppercase tracking-wider">Add Field</p>
        <div className="flex flex-wrap gap-1.5">
          {fieldTemplates.map((template) => (
            <button
              key={template.type}
              onClick={() => addField(template)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.06] text-[10px] text-white/70 transition-all"
            >
              <i className={`fa-solid fa-${template.icon}`} />
              {template.label}
            </button>
          ))}
        </div>
      </div>

      {/* Settings & Generate */}
      <div className="p-4 border-t border-white/[0.06] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-white/70">Collect analytics</span>
          <button
            onClick={() => setConfig(prev => ({ ...prev, collectAnalytics: !prev.collectAnalytics }))}
            className={`w-10 h-5 rounded-full transition-all ${config.collectAnalytics ? 'bg-emerald-500' : 'bg-white/20'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${config.collectAnalytics ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-white/70">Email notifications</span>
          <button
            onClick={() => setConfig(prev => ({ ...prev, enableNotifications: !prev.enableNotifications }))}
            className={`w-10 h-5 rounded-full transition-all ${config.enableNotifications ? 'bg-emerald-500' : 'bg-white/20'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${config.enableNotifications ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        
        <button
          onClick={() => onGenerateForm(config)}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[12px] font-bold hover:opacity-90 transition-all"
        >
          <i className="fa-solid fa-plus mr-2" />
          Add Form to Website
        </button>
      </div>
    </div>
  );
}
