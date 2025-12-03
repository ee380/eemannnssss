import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Check, X, Wand2, ArrowRight, Type, AlignLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingToolbarProps {
  visible: boolean;
  position: { top: number; left: number };
  selectedText: string;
  onClose: () => void;
  onRewrite: (instruction: string) => void;
}

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({ 
  visible, 
  position, 
  selectedText, 
  onClose, 
  onRewrite 
}) => {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'menu' | 'input'>('menu');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible && mode === 'input') {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    if (!visible) {
      setMode('menu');
      setPrompt('');
    }
  }, [visible, mode]);

  // Adjust position to keep it on screen
  const style = {
    top: position.top - 50, // Floating above
    left: Math.max(20, Math.min(window.innerWidth - 320, position.left - 150)),
  };

  const handleQuickAction = (action: string) => {
    onRewrite(action);
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed z-50 flex flex-col items-center"
        style={style}
      >
        <div className="glass-panel shadow-xl rounded-xl overflow-hidden text-sm text-gray-700 bg-white/90 ring-1 ring-black/5 flex flex-col min-w-[300px]">
          
          {mode === 'menu' && (
            <div className="flex items-center p-1 gap-1">
              <button 
                onClick={() => setMode('input')}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gemini-50 rounded-lg text-gemini-600 font-medium transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Ask AI...
              </button>
              <div className="w-[1px] h-6 bg-gray-200 mx-1" />
              <button 
                onClick={() => handleQuickAction("Make this more concise")}
                className="p-2 hover:bg-gray-100 rounded-lg tooltip-trigger" 
                title="Shorten"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleQuickAction("Make this more professional")}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Formal"
              >
                <Type className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleQuickAction("Fix grammar and spelling")}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Fix Grammar"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          )}

          {mode === 'input' && (
            <div className="flex items-center p-2 gap-2 w-full">
              <Sparkles className="w-4 h-4 text-gemini-500 animate-pulse ml-1" />
              <input 
                ref={inputRef}
                type="text" 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && prompt.trim()) {
                    onRewrite(prompt);
                  }
                  if (e.key === 'Escape') {
                    setMode('menu');
                  }
                }}
                placeholder="How should AI change this?"
                className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder-gray-400 text-sm"
              />
              <button 
                onClick={() => prompt.trim() && onRewrite(prompt)}
                className="p-1.5 bg-gemini-500 text-white rounded-md hover:bg-gemini-600 transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
        
        {/* Triangle pointer */}
        <div className="w-4 h-4 bg-white/90 border-b border-r border-black/5 transform rotate-45 -mt-2 z-[-1]" />
      </motion.div>
    </AnimatePresence>
  );
};

export default FloatingToolbar;
