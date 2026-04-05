import { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles, Mic, Volume2, MicOff, Square } from 'lucide-react';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { OpenAI } from 'openai';

export default function AIChatArea({ currentUser, displayName }) {
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);

  const userId = currentUser?.uid;

  useEffect(() => {
    const q = query(collection(db, 'ai_history'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const hist = [];
      snapshot.forEach((doc) => {
         const data = doc.data();
         hist.push({ id: doc.id + 'a', role: 'user', content: data.prompt, createdAt: data.createdAt });
         hist.push({ id: doc.id + 'b', role: 'ai', content: data.response, createdAt: data.createdAt });
      });
      hist.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setMessages(hist);
      scrollToBottom();
    });

    // Initialize Web Speech API for dictate
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
       recognitionRef.current = new SpeechRecognition();
       recognitionRef.current.continuous = false;
       recognitionRef.current.interimResults = false;

       recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInputVal(prev => prev + ' ' + transcript);
          setIsListening(false);
       };
       recognitionRef.current.onerror = () => setIsListening(false);
       recognitionRef.current.onend = () => setIsListening(false);
    }

    return () => {
       unsubscribe();
       if (recognitionRef.current) recognitionRef.current.abort();
       window.speechSynthesis.cancel();
    };
  }, [userId]);

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const toggleListen = () => {
     if (isListening) {
        recognitionRef.current?.stop();
        setIsListening(false);
     } else {
        recognitionRef.current?.start();
        setIsListening(true);
     }
  };

  const speakText = (text, id) => {
      window.speechSynthesis.cancel();
      if (speakingId === id) {
         setSpeakingId(null);
         return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);
      setSpeakingId(id);
      window.speechSynthesis.speak(utterance);
  };

  const executeLocalAIFallback = async (promptMsg) => {
    try {
      let apiKey = import.meta.env.VITE_OPENAI_API_KEY || "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";
      const isOr = apiKey.startsWith('sk-or-');
      const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true, ...(isOr && { baseURL: 'https://openrouter.ai/api/v1' }) });
      
      const response = await openai.chat.completions.create({
        model: isOr ? "openai/gpt-3.5-turbo" : "gpt-3.5-turbo",
        messages: [{ role: "user", content: promptMsg }],
      });

      const aiText = response.choices[0].message.content;
      await addDoc(collection(db, 'ai_history'), { userId, threadId: 'ai_pane', prompt: promptMsg, response: aiText, createdAt: new Date().toISOString() });
    } catch (e) {
      console.error(e);
      await addDoc(collection(db, 'ai_history'), { userId, threadId: 'ai_pane', prompt: promptMsg, response: 'System Error. Check Console.', createdAt: new Date().toISOString() });
    }
  };

  const askAi = async () => {
    if (!inputVal.trim()) return;
    const msg = inputVal;
    setInputVal('');
    setIsTyping(true);
    scrollToBottom();
    // Opt update
    setMessages(prev => [...prev, { id: 'opt1', role: 'user', content: msg, createdAt: new Date().toISOString() }]);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: 'ai_pane', prompt: msg, userId, senderName: displayName })
      });
      if (!res.ok) throw new Error("Vercel route failed");
    } catch (err) {
      await executeLocalAIFallback(msg);
    }
    setIsTyping(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-surface relative min-w-0 h-full">
      <header className="h-16 border-b border-surface-container flex items-center px-8 justify-center bg-surface-container-lowest backdrop-blur-md z-10 shadow-sm">
        <div className="flex items-center gap-3">
           <Sparkles size={20} className="text-secondary" />
           <h2 className="font-display font-medium text-lg text-white">Synapse Voice AI</h2>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center custom-scrollbar">
         <div className="w-full max-w-3xl flex flex-col space-y-8 pb-8">
            {!messages.length && !isTyping && (
               <div className="flex flex-col items-center justify-center text-center py-20">
                  <div className="w-20 h-20 bg-secondary/10 border border-secondary/20 rounded-full flex items-center justify-center text-secondary mb-6 shadow-[0_0_30px_rgba(185,10,252,0.15)]">
                     <Mic size={32} />
                  </div>
                  <h1 className="text-2xl font-display font-semibold mb-3">Speak to Synapse AI</h1>
                  <p className="text-sm text-gray-400 max-w-md">I am your private auditory and textual interface. Use the microphone or keyboard to chat.</p>
               </div>
            )}

            {messages.map((msg, index) => (
               <div key={index} className={`flex gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''} group`}>
                 <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center font-bold text-sm shadow-md mt-1 ${msg.role === 'user' ? 'bg-surface-container-high border border-outline-variant/30 text-white' : 'bg-transparent text-secondary'}`}>
                   {msg.role === 'user' ? 'U' : <Bot size={24} />}
                 </div>
                 
                 <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} flex-1`}>
                   
                   <div className={`text-[15.5px] leading-[1.7] whitespace-pre-wrap max-w-[85%] ${
                     msg.role === 'user' 
                       ? 'bg-surface-container px-5 py-3 rounded-2xl rounded-tr-sm text-gray-100 shadow-sm border border-outline-variant/10' 
                       : 'bg-transparent text-gray-300'
                   }`}>
                     {msg.content}
                   </div>
                   
                   {msg.role === 'ai' && (
                      <div className="mt-2 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => speakText(msg.content, msg.id)} className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide hover:text-white transition-colors ${speakingId === msg.id ? 'text-secondary' : ''}`}>
                          {speakingId === msg.id ? <Square size={12} fill="currentColor" /> : <Volume2 size={14} />} 
                          {speakingId === msg.id ? 'Stop Playing' : 'Read Aloud'}
                        </button>
                      </div>
                   )}
                 </div>
               </div>
            ))}

            {isTyping && (
               <div className="flex gap-6">
                  <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center text-secondary mt-1"><Bot size={24} /></div>
                  <div className="mt-1 flex items-center gap-2 p-3">
                     <div className="w-2 h-2 bg-secondary/60 rounded-full animate-bounce"></div>
                     <div className="w-2 h-2 bg-secondary/60 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                     <div className="w-2 h-2 bg-secondary/60 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
               </div>
            )}
            <div ref={scrollRef} />
         </div>
      </div>

      <div className="p-6 bg-transparent relative z-10 w-full flex flex-col justify-center items-center pb-8 border-t border-transparent">
        <div className="relative max-w-3xl mx-auto w-full flex items-center shadow-2xl rounded-2xl bg-surface-container-low border border-outline-variant/30 transition-all">
          <button 
             onClick={toggleListen}
             className={`absolute left-3 w-10 h-10 flex items-center justify-center rounded-xl transition-colors z-20 ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse border border-red-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-primary'}`}
          >
             {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          
          <input 
             type="text" 
             value={inputVal}
             onChange={(e) => setInputVal(e.target.value)}
             onKeyDown={(e) => e.key === 'Enter' && askAi()}
             placeholder={isListening ? "Listening..." : "Message Synapse AI..."} 
             className="w-full bg-transparent text-white placeholder-gray-500 px-6 pl-16 py-4 focus:outline-none text-[15.5px]"
          />
          
          <div className="pr-3 flex items-center">
            <button 
               onClick={askAi}
               disabled={!inputVal.trim() || isTyping}
               className="w-10 h-10 flex items-center justify-center bg-secondary text-white font-semibold rounded-lg hover:bg-secondary/80 disabled:opacity-30 disabled:bg-surface-container disabled:text-gray-500 hover:scale-105 active:scale-95"
            >
               <Send size={16} fill={inputVal.trim() ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
