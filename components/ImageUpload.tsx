'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageUploadProps {
  onImageUpload: (file: File, type: 'logo' | 'product') => void;
  uploadedImages: { [key: string]: string }; // path -> base64
}

export default function ImageUpload({ onImageUpload, uploadedImages }: ImageUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File, type: 'logo' | 'product') => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      // Store in localStorage with a unique key
      const key = `${type}_${Date.now()}_${file.name}`;
      localStorage.setItem(`draftly_image_${key}`, base64);
      onImageUpload(file, type);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent, type: 'logo' | 'product') => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file, type);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'product') => {
    const file = e.target.files?.[0];
    if (file) handleFile(file, type);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 text-xs text-white bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 rounded transition font-mono flex items-center gap-2"
        title="Upload images or logos"
      >
        <i className="fa-solid fa-image"></i>
        <span>Images</span>
      </button>

      <div className="relative">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full mt-2 right-0 w-80 bg-charcoal border-2 border-orange-500/30 rounded-lg p-4 z-50 shadow-xl"
            >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-display text-sm">Upload Images</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/60 hover:text-white transition"
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            {/* Logo Upload */}
            <div className="mb-4">
              <label className="text-white/70 text-xs mb-2 block">Logo</label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => handleDrop(e, 'logo')}
                className={`border-2 border-dashed rounded-lg p-4 text-center transition ${
                  dragActive
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-orange-500/30 hover:border-orange-500/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileInput(e, 'logo')}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <i className="fa-solid fa-cloud-arrow-up text-2xl text-orange-400"></i>
                  <span className="text-white/70 text-xs">Click or drag logo here</span>
                </label>
              </div>
            </div>

            {/* Product Image Upload */}
            <div>
              <label className="text-white/70 text-xs mb-2 block">Product Images</label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => handleDrop(e, 'product')}
                className={`border-2 border-dashed rounded-lg p-4 text-center transition ${
                  dragActive
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-orange-500/30 hover:border-orange-500/50'
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileInput(e, 'product')}
                  className="hidden"
                  id="product-upload"
                  multiple
                />
                <label
                  htmlFor="product-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <i className="fa-solid fa-images text-2xl text-orange-400"></i>
                  <span className="text-white/70 text-xs">Click or drag images here</span>
                </label>
              </div>
            </div>

            {/* Uploaded Images Preview */}
            {Object.keys(uploadedImages).length > 0 && (
              <div className="mt-4 pt-4 border-t border-orange-500/20">
                <p className="text-white/70 text-xs mb-2">Uploaded ({Object.keys(uploadedImages).length})</p>
                <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                  {Object.entries(uploadedImages).map(([key, base64]) => (
                    <div key={key} className="relative group">
                      <img
                        src={base64}
                        alt="Uploaded"
                        className="w-full h-16 object-cover rounded border border-orange-500/30"
                      />
                      <button
                        onClick={() => {
                          localStorage.removeItem(`draftly_image_${key}`);
                          // Trigger re-render by calling onImageUpload with null
                        }}
                        className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                      >
                        <i className="fa-solid fa-times text-[8px] text-white"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

