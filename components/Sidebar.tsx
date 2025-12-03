import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Paperclip, X, FileText, Loader2, Sparkles, MessageSquare } from 'lucide-react';
import { Message, FileAttachment } from '../types';
import { motion } from 'framer-motion';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  onSendMessage: (text: string, files: FileAttachment[]) => void;
  isTyping: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  messages, 
  onSendMessage, 
  isTyping 
}) => {
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles: FileAttachment[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const text = await file.text(); // Basic text reading for demo
        newFiles.push({
          name: file.name,
          type: file.type,
          content: text
        });
      }
      setFiles([...files, ...newFiles]);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() && files.length === 0) return;
    onSendMessage(input, files);
    setInput('');
    setFiles([]);
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ x: 350, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 350, opacity: 0 }}
      className="w-[350px] bg-white border-l border-gray-200 h-screen flex flex-col shadow-2xl z-40 fixed right-0 top-0"
    >
      {/* Header */}
      <div className="h-16 border-b border-gray-100 flex items-center justify-between px-6 bg-white/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white">
            <Bot size={18} />
          </div>
          <span className="font-semibold text-gray-800">Lumina Copilot</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/30">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20 px-6">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-blue-200" />
            <p className="text-sm font-medium text-gray-500">I'm your thought partner.</p>
            <p className="text-xs mt-2">Ask me to draft a section, research a topic, or review your writing.</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-white border border-gray-100 text-gray-700 rounded-bl-none'
              }`}
            >
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="mb-2 space-y-1">
                  {msg.attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs bg-white/10 p-1.5 rounded border border-white/20">
                      <FileText size={12} />
                      <span className="truncate max-w-[150px]">{file.name}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none p-4 shadow-sm">
              <Loader2 className="w-5 h-5 animate-spin text-gemini-500" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full border border-gray-200">
                <FileText size={12} />
                <span className="max-w-[100px] truncate">{file.name}</span>
                <button 
                  onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                  className="hover:text-red-500 ml-1"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="relative">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple 
            accept=".txt,.md,.pdf" // PDF strictly for selection, text extraction simulated in basic way
            className="hidden"
          />
          <div className="relative flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all">
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Paperclip size={18} />
            </button>
            <textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Ask for a draft, feedback, or ideas..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 max-h-32 min-h-[44px] py-3 resize-none"
              rows={1}
            />
            <button 
              type="submit"
              disabled={!input.trim() && files.length === 0}
              className="p-2 bg-gray-900 text-white rounded-lg hover:bg-black disabled:opacity-50 disabled:hover:bg-gray-900 transition-colors"
            >
              {isTyping ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </form>
        <div className="text-[10px] text-gray-400 mt-2 text-center flex justify-center gap-3">
          <span>Gemini Pro 1.5 (Preview)</span>
          <span>•</span>
          <span>Context Aware</span>
        </div>
      </div>
    </motion.div>
  );
};

export default Sidebar;
