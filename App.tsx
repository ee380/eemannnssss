import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import FloatingToolbar from './components/FloatingToolbar';
import { generateDraft, inlineEdit, proactiveReview } from './services/geminiService';
import { Message, FileAttachment } from './types';
import { PanelRight, FileText, Search, Settings, Wand2, Sparkles, Check, X } from 'lucide-react';

const DEBOUNCE_TIME = 2000;

function App() {
  const [content, setContent] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [selection, setSelection] = useState<{ text: string, top: number, left: number, start: number, end: number } | null>(null);
  
  // Proactive suggestions
  const [isReviewing, setIsReviewing] = useState(false);
  const [suggestion, setSuggestion] = useState<{ text: string; explanation: string; originalText: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef(content); // To track latest content for race conditions

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
    contentRef.current = content;
  }, [content]);

  // Handle Text Selection
  const handleMouseUp = (e: React.MouseEvent) => {
    const el = textareaRef.current;
    if (!el) return;
    if (el.selectionStart !== el.selectionEnd) {
      const text = el.value.substring(el.selectionStart, el.selectionEnd);
      if (text.trim().length > 0) {
        setSelection({
          text,
          top: e.clientY,
          left: e.clientX,
          start: el.selectionStart,
          end: el.selectionEnd
        });
      }
    } else {
      setSelection(null);
    }
  };

  // Proactive Review Logic (Debounced)
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setContent(newText);
    setSuggestion(null); // Clear old suggestions on type
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(async () => {
      // Trigger proactive review on the current paragraph
      const cursor = e.target.selectionStart;
      
      // Find current paragraph
      const before = newText.substring(0, cursor).lastIndexOf('\n') + 1;
      let after = newText.indexOf('\n', cursor);
      if (after === -1) after = newText.length;
      
      const paragraph = newText.substring(before, after).trim();
      
      if (paragraph.length > 50) {
        setIsReviewing(true);
        const result = await proactiveReview(paragraph);
        setIsReviewing(false);

        // Check if content has changed while we were waiting for AI
        if (contentRef.current !== newText) return;

        if (result.hasSuggestion && result.suggestion) {
          setSuggestion({
            text: result.suggestion,
            explanation: result.explanation || "Better flow",
            originalText: paragraph
          });
        }
      }
    }, DEBOUNCE_TIME);
  };

  const handleAcceptSuggestion = () => {
    if (!suggestion) return;
    // Replace the first occurrence of originalText
    const newContent = content.replace(suggestion.originalText, suggestion.text);
    setContent(newContent);
    setSuggestion(null);
  };

  const handleDismissSuggestion = () => {
    setSuggestion(null);
  };

  const handleSendMessage = async (text: string, files: FileAttachment[]) => {
    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      attachments: files
    };
    
    setMessages(prev => [...prev, newUserMsg]);
    setIsTyping(true);

    try {
      const responseText = await generateDraft(text, content, files);
      
      const newAiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: responseText,
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, newAiMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        content: "I encountered an error. Please try again.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleInlineRewrite = async (instruction: string) => {
    if (!selection) return;

    setSelection(null); 
    setIsReviewing(true); 

    try {
      const rewritten = await inlineEdit(selection.text, instruction, content);
      
      const newContent = 
        content.substring(0, selection.start) + 
        rewritten + 
        content.substring(selection.end);
      
      setContent(newContent);
    } catch (e) {
      alert("Failed to rewrite content");
    } finally {
      setIsReviewing(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F9F9F9] font-sans overflow-hidden">
      
      {/* Left Navigation (Minimal) */}
      <nav className="w-16 border-r border-gray-200 flex flex-col items-center py-6 gap-6 bg-white z-20">
        <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center font-bold font-serif text-xl shadow-lg">L</div>
        <div className="flex-1 flex flex-col items-center gap-6 mt-4">
          <button className="p-2.5 rounded-xl bg-blue-50 text-blue-600 transition-all shadow-sm ring-1 ring-blue-100">
            <FileText size={20} />
          </button>
          <button className="p-2.5 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-all">
            <Search size={20} />
          </button>
        </div>
        <button className="p-2.5 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-all">
          <Settings size={20} />
        </button>
      </nav>

      {/* Main Editor Area */}
      <main className="flex-1 relative flex flex-col h-screen overflow-hidden">
        
        {/* Top Bar */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-gray-100 bg-white/50 backdrop-blur-sm z-10">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Drafting</span>
            <input 
              type="text" 
              defaultValue="The Future of AI Writing" 
              className="font-serif text-lg font-bold bg-transparent border-none outline-none text-gray-800 placeholder-gray-300"
            />
          </div>
          
          <div className="flex items-center gap-3">
            {isReviewing && (
              <div className="flex items-center gap-2 text-xs font-medium text-gemini-600 bg-gemini-50 px-3 py-1.5 rounded-full animate-pulse">
                <Wand2 size={12} />
                <span>AI is thinking...</span>
              </div>
            )}
            
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-2 rounded-lg transition-colors ${isSidebarOpen ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:bg-gray-50'}`}
            >
              <PanelRight size={20} />
            </button>
          </div>
        </header>

        {/* Writing Surface */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          <div className="max-w-3xl mx-auto py-16 px-12 pb-40 min-h-[calc(100vh-4rem)]">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleChange}
              onMouseUp={handleMouseUp}
              placeholder="Start writing... Use the sidebar to brainstorm or draft with Gemini."
              className="w-full resize-none border-none outline-none bg-transparent font-serif text-lg leading-loose text-gray-800 placeholder:text-gray-300 min-h-[60vh] overflow-hidden"
              spellCheck={false}
            />
            
            {/* Proactive Suggestion Bubble */}
            {suggestion && (
              <div className="mt-6 p-4 rounded-xl border border-blue-100 bg-blue-50/50 flex flex-col gap-3 animate-fade-in group hover:bg-blue-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-blue-100 rounded-lg shrink-0">
                    <Sparkles size={14} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-blue-900 mb-1">Suggestion: {suggestion.explanation}</p>
                    <p className="text-sm text-blue-800/80 leading-relaxed italic">"{suggestion.text}"</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-[38px]">
                  <button 
                    onClick={handleAcceptSuggestion}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                  >
                    <Check size={12} />
                    Accept Change
                  </button>
                  <button 
                    onClick={handleDismissSuggestion}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 text-xs font-medium rounded-lg transition-colors"
                  >
                    <X size={12} />
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {content.length === 0 && (
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none opacity-40">
                <Wand2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-medium text-gray-400">Magic Canvas</h3>
                <p className="text-sm text-gray-300 mt-2">Type anywhere, or ask Gemini to write for you.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Floating Toolbar for Selection */}
      <FloatingToolbar 
        visible={!!selection}
        position={selection ? { top: selection.top, left: selection.left } : { top: 0, left: 0 }}
        selectedText={selection?.text || ''}
        onClose={() => setSelection(null)}
        onRewrite={handleInlineRewrite}
      />

      {/* Right Sidebar (AI Copilot) */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        messages={messages}
        onSendMessage={handleSendMessage}
        isTyping={isTyping}
      />
    </div>
  );
}

export default App;