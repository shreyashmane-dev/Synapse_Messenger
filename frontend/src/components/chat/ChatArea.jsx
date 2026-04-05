import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, FileImage, File, Download, Bot, X, ChevronLeft, Shield, Mic, RefreshCw, Check, Edit2, Volume2, Square } from 'lucide-react';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDoc, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { OpenAI } from 'openai';
import { motion, AnimatePresence } from 'framer-motion';
import CommunitySettings from './CommunitySettings';

export default function ChatArea({ activeChat, currentUser, displayName, onBack }) {
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showAIActions, setShowAIActions] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Advanced AI States
  const [aiTone, setAiTone] = useState('Casual');
  const [aiMode, setAiMode] = useState('Compose'); // 'Suggest' or 'Compose'
  const [aiGeneratedResult, setAiGeneratedResult] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  
  // Real-time Status & Presence
  const [isTyping, setIsTyping] = useState(false);
  const [othersTyping, setOthersTyping] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showGallery, setShowGallery] = useState(false);
  const [editMode, setEditMode] = useState(null); // { id, content }
  const [scheduledTime, setScheduledTime] = useState(null);

  const scrollRef = useRef(null);
  const userId = currentUser?.uid;

  // Derive Read-Only Rules
  const isReadOnly = activeChat.type === 'channel' && activeChat.channelType === 'announcement' && activeChat.myRole !== 'owner' && activeChat.myRole !== 'admin';

  useEffect(() => {
    if (!activeChat?.id) return;
    
    const q = query(collection(db, 'messages'), where('chatId', '==', activeChat.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((docSnap) => msgs.push({ id: docSnap.id, ...docSnap.data() }));
      msgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setMessages(msgs);
      setPinnedMessages(msgs.filter(m => m.isPinned));
      
      // Update 'Read' status for incoming messages
      msgs.forEach(m => {
         if (m.senderId !== userId && m.status !== 'read') {
            updateDoc(doc(db, 'messages', m.id), { status: 'read' });
         }
      });
      scrollToBottom();
    });

    const unsubTyping = onSnapshot(query(collection(db, 'typing'), where('chatId', '==', activeChat.id)), (snap) => {
       const t = [];
       snap.forEach(d => { if(d.id !== userId) t.push(d.data().username) });
       setOthersTyping(t);
    });

    const unsubScheduled = onSnapshot(query(collection(db, 'scheduled_messages'), where('chatId', '==', activeChat.id), where('senderId', '==', userId)), (snap) => {
       snap.forEach(async (d) => {
          const data = d.data();
          if (new Date(data.sendAt) <= new Date()) {
             await addDoc(collection(db, 'messages'), { ...data, status: 'sent', createdAt: new Date().toISOString() });
             await deleteDoc(doc(db, 'scheduled_messages', d.id));
          }
       });
    });

    // Check Mutelist
    const checkMute = async () => {
       const uDoc = await getDoc(doc(db, 'users', userId));
       const mList = uDoc.data()?.mutedChats || [];
       setIsMuted(mList.includes(activeChat.id));
    };
    checkMute();

    return () => { unsubscribe(); unsubTyping(); unsubScheduled(); };
  }, [activeChat?.id]);

  useEffect(() => {
     if(!activeChat?.id || !userId) return;
     if(inputVal.length > 0) {
        setDoc(doc(db, 'typing', userId), { chatId: activeChat.id, username: displayName, timestamp: serverTimestamp() });
     } else {
        deleteDoc(doc(db, 'typing', userId));
     }
  }, [inputVal, activeChat?.id]);

  const scrollToBottom = () => setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

  const uploadMediaCloudinary = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
         try {
           const res = await fetch('/api/upload', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ fileData: e.target.result, fileType: file.type })
           });
           if (res.ok) resolve(await res.json());

           const cName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
           const uPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
           if (!cName || !uPreset) throw new Error("Fallback Env missing");

           const fd = new FormData();
           fd.append('file', file);
           fd.append('upload_preset', uPreset);
           const rType = (file.type.startsWith('application/') || file.type.startsWith('text/')) ? 'raw' : 'auto';
           const dRes = await fetch(`https://api.cloudinary.com/v1_1/${cName}/${rType}/upload`, { method: 'POST', body: fd });
           if (!dRes.ok) throw new Error("Cloudinary Error");
           resolve(await dRes.json());
         } catch(err) { reject(err); }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  };

  const sendMessage = async (overrideText = null) => {
    const finalMsg = typeof overrideText === 'string' ? overrideText : inputVal;
    if (!finalMsg.trim() && !mediaFile) return;

    if (editMode) {
       await updateDoc(doc(db, 'messages', editMode.id), { content: finalMsg, isEdited: true, updatedAt: new Date().toISOString() });
       setEditMode(null);
       setInputVal('');
       return;
    }

    let mediaPack = null;
    let localFile = mediaFile;
    let localMsg = finalMsg;

    if (typeof overrideText !== 'string') setInputVal('');
    setMediaFile(null);
    scrollToBottom();

    try {
      if (localFile) {
         setUploading(true);
          const uploader = await uploadMediaCloudinary(localFile);
          mediaPack = {
             url: uploader.secure_url,
             public_id: uploader.public_id,
             type: uploader.resource_type === 'raw' || !localFile.type.startsWith('image') ? 'raw' : 'image',
             name: localFile.name
          };
          setUploading(false);
      }

      const userDoc = await getDoc(doc(db, 'users', userId));
      const senderResolvedOptions = userDoc.data();
      const finalSenderName = senderResolvedOptions?.isAnonymous ? senderResolvedOptions.anonymousName : displayName;
      const finalSenderAvatar = senderResolvedOptions?.isAnonymous ? null : (currentUser.photoURL || senderResolvedOptions?.avatar || null);

      const messageData = {
        chatId: activeChat.id,
        senderId: userId,
        senderName: finalSenderName,
        senderAvatar: finalSenderAvatar,
        content: localMsg || '',
        mediaData: mediaPack || null,
        status: 'sent',
        createdAt: new Date().toISOString()
      };

      // Handle Scheduling
      if (scheduledTime) {
         await addDoc(collection(db, 'scheduled_messages'), { ...messageData, sendAt: scheduledTime });
         alert("Transmission Scheduled.");
         setScheduledTime(null);
         return;
      }

      // Create Native Notification if DM
      if (activeChat.type === 'dm') {
         const receiverId = activeChat.participants?.find(p => p !== userId);
         if (receiverId) {
            await addDoc(collection(db, 'notifications'), {
               userId: receiverId,
               type: 'message',
               title: 'New Message',
               body: `${finalSenderName}: ${localMsg.substring(0, 40)}${localMsg.length > 40 ? '...' : ''}`,
               data: { chatId: activeChat.id },
               isRead: false,
               createdAt: new Date().toISOString()
            });
         }
      }

      // Create Global Notification for Community Announcements
      if (activeChat.type === 'channel' && activeChat.channelType === 'announcement') {
         const mSnap = await getDocs(query(collection(db, 'community_members'), where('communityId', '==', activeChat.communityId)));
         mSnap.forEach(async (mDoc) => {
            const mId = mDoc.data().userId;
            if (mId !== userId) {
               await addDoc(collection(db, 'notifications'), {
                  userId: mId,
                  type: 'community',
                  title: `Announcement: ${activeChat.name}`,
                  body: `${finalSenderName} posted: ${localMsg.substring(0, 40)}...`,
                  data: { communityId: activeChat.communityId, chatId: activeChat.id },
                  isRead: false,
                  createdAt: new Date().toISOString()
               });
            }
         });
      }

      if (!isMuted) {
         // Standard DM/Channel notifications already handled above
      }

      await addDoc(collection(db, 'messages'), messageData);

      if (activeChat.type === 'dm') {
         await updateDoc(doc(db, 'chats', activeChat.id), {
            lastMessage: localMsg || (mediaPack ? '📎 Attachment' : 'New Message'),
            updatedAt: new Date().toISOString()
         });
      }
    } catch (e) {
      console.error("Error sending message", e);
      setUploading(false);
    }
  };

  const deleteMessage = async (msgId, forEveryone = false) => {
     try {
       const msgRef = doc(db, 'messages', msgId);
       const msgSnap = await getDoc(msgRef);
       if (!msgSnap.exists()) return;
       const msgData = msgSnap.data();

       // Media cleanup protocol
       if (forEveryone && msgData.mediaData?.public_id) {
          try {
             await fetch('/api/delete_media', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ publicId: msgData.mediaData.public_id, resourceType: msgData.mediaData.type })
             });
          } catch (err) { console.error("Cloudinary Cleanup failed", err); }
       }

       if (forEveryone) {
          await updateDoc(msgRef, { 
             content: '🚫 This message was retracted.', 
             mediaData: null, 
             isDeleted: true,
             isRetracted: true 
          });
       } else {
          // Hard delete for local cleanup if needed or soft-hide
          await updateDoc(msgRef, { hiddenFor: [userId] }); 
       }
     } catch (err) { console.error(err); }
  };

  const deleteChat = async () => {
     if(!confirm("TERMINATE THIS CHAT? All messages and attachments will be destroyed.")) return;
     try {
        // 1. Delete all messages associated with the chat
        const q = query(collection(db, 'messages'), where('chatId', '==', activeChat.id));
        const snapshots = await getDocs(q);
        snapshots.forEach(async (d) => {
           const dat = d.data();
           if(dat.mediaData?.public_id) {
              fetch('/api/delete_media', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publicId: dat.mediaData.public_id, resourceType: dat.mediaData.type }) });
           }
           await deleteDoc(doc(db, 'messages', d.id));
        });

        // 2. Delete the chat document itself
        await deleteDoc(doc(db, 'chats', activeChat.id));
        onBack();
     } catch (err) { console.error(err); }
  };

  const togglePin = async (msgId, currentState) => {
     await updateDoc(doc(db, 'messages', msgId), { isPinned: !currentState });
  };

  const toggleMute = async () => {
     const uRef = doc(db, 'users', userId);
     const uDoc = await getDoc(uRef);
     let mList = uDoc.data()?.mutedChats || [];
     if (isMuted) mList = mList.filter(id => id !== activeChat.id);
     else mList.push(activeChat.id);
     await updateDoc(uRef, { mutedChats: mList });
     setIsMuted(!isMuted);
  };

  const execAI = async (promptMsg) => {
      let apiKey = import.meta.env.VITE_OPENAI_API_KEY || "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";
      const isOr = apiKey.startsWith('sk-or-');
      const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true, ...(isOr && { baseURL: 'https://openrouter.ai/api/v1' }) });
      
      const response = await openai.chat.completions.create({
        model: isOr ? "openai/gpt-3.5-turbo" : "gpt-3.5-turbo",
        messages: [{ role: "user", content: promptMsg }],
      });
      return response.choices[0].message.content;
  };

  const handleListen = () => {
     const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
     if (!SpeechRecognition) return alert("Voice recognition not supported in this browser.");
     const rec = new SpeechRecognition();
     setIsListening(true);
     rec.onresult = (e) => setAiPrompt(prev => prev + " " + e.results[0][0].transcript);
     rec.onend = () => setIsListening(false);
     rec.start();
  };

   const handleAIGenerateAction = async (forcedPrompt = null, specialMode = null) => {
     const promptToUse = forcedPrompt || aiPrompt;
     const currentMode = specialMode || aiMode;

     if (currentMode === 'Compose' && !promptToUse.trim()) return;
     
     setIsAiProcessing(true);
     try {
       const recentContext = messages.slice(-10).map(m => `${m.senderName}: ${m.content}`).join('\n');
       const baseRules = `You are a strict, highly capable private assistant helping the user draft messages.
       Tone requested: ${aiTone}.
       Receiver Profile: ${activeChat.name}.
       Rule 1: If using emojis, use them organically.
       Rule 2: Never add explanations, quotation marks around the message, or conversational filler. Output ONLY the exact text payload that the user should send.
       
       Recent Chat History:
       ${recentContext || "No previous history."}`;

       let constructedPrompt = baseRules;
       
       if (currentMode === 'Suggest') {
          constructedPrompt += `\n\nTask: Based strictly on the chat history above, draft a natural reply for the user responding to the current conversation floor.`;
       } else if (currentMode === 'Translate') {
          constructedPrompt += `\n\nTask: Translate the following text to the most appropriate language for the receiver or English if ambiguous: "${promptToUse}"`;
       } else if (currentMode === 'Rewrite') {
          constructedPrompt += `\n\nTask: Rewrite the following message to be more ${aiTone} while preserving core meaning: "${promptToUse}"`;
       } else {
          constructedPrompt += `\n\nTask: The user requests: "${promptToUse}". Draft the exact payload fulfilling this request.`;
       }
       
       const result = await execAI(constructedPrompt);
       setAiGeneratedResult(result.trim());
       if (specialMode) setShowAIActions(true); // Ensure open if triggered from outside
     } catch (err) {
       console.error("AI Error:", err);
       setAiGeneratedResult("System Error: AI generation failed.");
     }
     setIsAiProcessing(false);
  };

  const speakDraft = (text) => {
      window.speechSynthesis.cancel();
      if (speakingId === text) {
         setSpeakingId(null);
         return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);
      setSpeakingId(text);
      window.speechSynthesis.speak(utterance);
  };

  const commitAiInsertAndSend = () => {
      sendMessage(aiGeneratedResult);
      setShowAIActions(false);
      setAiGeneratedResult('');
      setAiPrompt('');
  };

  const commitAiEdit = () => {
      setInputVal(aiGeneratedResult);
      setShowAIActions(false);
      setAiGeneratedResult('');
      setAiPrompt('');
  };

  const toggleReaction = async (msgId, emoji) => {
      const msgRef = doc(db, 'messages', msgId);
      const mDoc = await getDoc(msgRef);
      if(!mDoc.exists()) return;
      const mData = mDoc.data();
      const reacts = mData.reactions || {};
      if (!reacts[emoji]) reacts[emoji] = [];
      
      if (reacts[emoji].includes(userId)) {
         reacts[emoji] = reacts[emoji].filter(id => id !== userId);
         if (reacts[emoji].length === 0) delete reacts[emoji];
      } else {
         reacts[emoji].push(userId);
      }
      await updateDoc(msgRef, { reactions: reacts });
  };

  const analyzeChatHistory = async () => {
      if (messages.length === 0) return;
      setIsAiProcessing(true);
      try {
         const chatLog = messages.slice(-15).map(m => `${m.senderName}: ${m.content}`).join('\n');
         const prompt = `Summarize the intent and status of this chat conversation:\n\n${chatLog}`;
         const summary = await execAI(prompt);
         alert(`AI Summary Analysis:\n\n${summary}`);
      } catch (err) {
         console.error(err);
         alert("AI Analysis Failed.");
      }
      setIsAiProcessing(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-surface relative min-w-0 h-full">
      {showSettings && (
         <CommunitySettings 
            communityId={activeChat.communityId} 
            communityName={activeChat.name} 
            myRole={activeChat.myRole} 
            onClose={() => setShowSettings(false)} 
         />
      )}
      
      <header className="h-16 border-b border-surface-container flex items-center px-4 md:px-8 justify-between bg-surface-container-lowest backdrop-blur-md z-10 shadow-sm">
        <div className="flex items-center gap-3 md:gap-4">
           {onBack && (
              <button onClick={onBack} className="md:hidden p-2 text-primary bg-primary/10 rounded-lg hover:bg-primary/30 mr-2"><ChevronLeft size={20}/></button>
           )}
           {activeChat.type === 'channel' ? <span className="text-gray-500 text-2xl leading-none -mt-1">#</span> : <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>}
           <h2 className="font-display font-bold text-lg md:text-xl text-white truncate max-w-[150px] md:max-w-xs">{activeChat.name}</h2>
           {activeChat.type === 'channel' && (activeChat.myRole === 'owner' || activeChat.myRole === 'admin') && (
              <button onClick={() => setShowSettings(true)} className="ml-1 md:ml-2 text-primary bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded-lg text-[10px] md:text-xs font-bold transition-colors">Manage</button>
           )}
        </div>
        <div className="flex items-center gap-2">
           <button onClick={toggleMute} className={`p-2 rounded-lg transition-colors ${isMuted ? 'text-red-500 bg-red-500/10' : 'text-gray-400 hover:text-white bg-white/5'}`} title={isMuted ? "Unmute Notifications" : "Mute Notifications"}>
              {isMuted ? <Bot size={18} className="opacity-50"/> : <Bot size={18}/>}
           </button>
           <button onClick={() => setShowGallery(!showGallery)} className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-lg transition-colors" title="Media Gallery"><FileImage size={18}/></button>
           <button 
              onClick={analyzeChatHistory}
              disabled={isAiProcessing || messages.length === 0}
              className="flex items-center gap-2 px-4 py-1.5 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              title="Analyze Chat"
           >
              <Bot size={16} /> <span className="hidden md:inline">Analyze</span>
           </button>
        </div>
      </header>

      {pinnedMessages.length > 0 && (
         <div className="bg-primary/10 border-b border-primary/20 px-8 py-2 flex items-center justify-between text-[11px] font-bold text-primary">
            <div className="flex items-center gap-2"><Square className="rotate-45" size={12}/> {pinnedMessages.length} Pinned Intelligence</div>
            <button onClick={() => setPinnedMessages([])} className="hover:underline">Clear View</button>
         </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 flex flex-col custom-scrollbar relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-surface-container-lowest via-surface to-black">
         {showGallery && (
            <div className="absolute top-0 right-0 bottom-0 w-80 bg-surface-container-lowest border-l border-white/5 z-40 p-6 flex flex-col gap-6 animate-in slide-in-from-right duration-300">
               <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white uppercase tracking-widest text-xs">Media Vault</h3>
                  <button onClick={() => setShowGallery(false)}><X size={16}/></button>
               </div>
               <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3 custom-scrollbar">
                  {messages.filter(m => m.mediaData).map(m => (
                     <a key={m.id} href={m.mediaData.url} target="_blank" className="aspect-square bg-white/5 rounded-xl border border-white/5 overflow-hidden group">
                        {m.mediaData.type === 'image' ? <img src={m.mediaData.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform"/> : <div className="w-full h-full flex items-center justify-center"><File size={24}/></div>}
                     </a>
                  ))}
               </div>
            </div>
         )}
        {/* Subtle Background Glow Elements */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-[120px] pointer-events-none"></div>
        {!messages.length && (
           <div className="flex-1 flex items-center justify-center">
             <div className="text-center p-8 bg-surface-container-low border border-outline-variant/10 rounded-3xl max-w-sm w-full shadow-2xl">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary"><Send size={24} className="ml-1" /></div>
                <h3 className="text-lg font-display font-semibold text-white mb-2">No messages yet</h3>
                <p className="text-sm text-gray-500">Send a message to start the secure end-to-end conversation.</p>
             </div>
           </div>
        )}

        <AnimatePresence>
          {messages.map((msg, index) => (
             <motion.div 
               key={msg.id} 
               initial={{ opacity: 0, y: 20, scale: 0.95 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               transition={{ duration: 0.3, delay: index < 10 ? index * 0.05 : 0 }}
               className={`flex gap-4 ${msg.senderId === userId ? 'flex-row-reverse' : ''} group relative z-10`}
             >
               {msg.senderAvatar ? (
                  <img src={msg.senderAvatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover shrink-0 shadow-[0_5px_15px_rgba(0,0,0,0.5)] border border-white/10" />
               ) : (
                  <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-bold shadow-[0_5px_15px_rgba(0,0,0,0.5)] bg-gradient-to-br from-surface-container-high to-surface-container border border-white/10 text-white uppercase">
                    {msg.senderName?.[0] || 'U'}
                  </div>
               )}
               
               <div className={`flex flex-col ${msg.senderId === userId ? 'items-end' : 'items-start'} max-w-[80%] md:max-w-[70%]`}>
                 <div className="flex items-baseline gap-2 mb-1.5 opacity-50 group-hover:opacity-100 transition-opacity px-2">
                   <span className="font-bold text-gray-300 text-[11px] tracking-wide">
                     {msg.senderName || 'User'}
                   </span>
                   <span className="text-[10px] text-gray-500 font-medium">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                 </div>
                              <div className={`px-6 py-4 rounded-3xl text-[15px] leading-relaxed whitespace-pre-wrap backdrop-blur-md shadow-lg relative ${
                    msg.senderId === userId 
                      ? 'bg-gradient-to-br from-primary to-primary-dim text-black font-medium border border-primary/50 text-shadow-sm rounded-tr-sm' 
                      : 'bg-white/5 border border-white/10 text-gray-100 rounded-tl-sm'
                  }`}>
                    {msg.mediaData && (
                       <div className="mb-3 max-w-[300px] w-full">
                         {msg.mediaData.type === 'image' || String(msg.mediaData.url).match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <img src={msg.mediaData.url} alt="Attached" className="w-full rounded-2xl border border-white/10 shadow-[0_5px_15px_rgba(0,0,0,0.3)] object-cover" />
                         ) : (
                            <a href={msg.mediaData.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${msg.senderId === userId ? 'bg-black/20 border-black/10 hover:bg-black/30 text-black' : 'bg-black/40 border-white/5 hover:bg-black/60'}`}>
                               <div className="bg-white/20 p-2 rounded-lg text-current"><File size={20} /></div>
                               <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{msg.mediaData.name || 'Download File'}</div></div>
                               <Download size={16} className="text-current shrink-0 opacity-70" />
                            </a>
                         )}
                       </div>
                    )}
                    {msg.content}
                    
                    <div className={`flex items-center gap-1 mt-1 justify-end opacity-40 text-[9px] font-bold uppercase ${msg.senderId === userId ? 'text-black' : 'text-primary'}`}>
                       {msg.isEdited && <span>Edited</span>}
                       {msg.senderId === userId && (
                          msg.status === 'read' ? <div className="flex"><Check size={10}/><Check size={10} className="-ml-1"/></div> : <Check size={10}/>
                       )}
                                        {/* Only sender can delete for everyone */}
                                 {msg.senderId === userId && !msg.isDeleted && (
                                    <button 
                                       onClick={() => deleteMessage(msg.id, true)} 
                                       className="p-1 hover:bg-red-500/10 text-red-400 rounded transition-colors"
                                       title="Retract Message"
                                    >
                                       <Trash2 size={12} />
                                    </button>
                                 )}
                    </div>

                    {/* Rendered Reactions */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                       <div className="flex flex-wrap gap-1.5 mt-3 relative z-20">
                          {Object.entries(msg.reactions).map(([emoji, usersArr]) => (
                             <button 
                                key={emoji} 
                                onClick={() => toggleReaction(msg.id, emoji)} 
                                className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${usersArr.includes(userId) ? 'bg-primary/20 border-primary text-white shadow-sm scale-105' : 'bg-black/20 border-white/5 hover:bg-black/40 text-gray-300'}`}
                             >
                                {emoji} <span className="opacity-70 ml-1">{usersArr.length}</span>
                             </button>
                          ))}
                       </div>
                    )}
                  </div>

                  {/* Hover Engagement Toolbar */}
                  <div className={`absolute top-4 ${msg.senderId === userId ? 'right-full mr-2' : 'left-full ml-2'} opacity-0 group-hover:opacity-100 transition-all duration-200 bg-surface-container-high/90 backdrop-blur-xl border border-outline-variant/30 rounded-2xl shadow-xl flex items-center p-1 z-30 pointer-events-none group-hover:pointer-events-auto scale-95 group-hover:scale-100 hidden md:flex`}>
                      {['👍', '❤️', '🔥', '😂', '🎉'].map(em => (
                         <button key={em} onClick={() => toggleReaction(msg.id, em)} className="p-1.5 hover:bg-white/10 rounded-lg transition-transform hover:scale-125 text-[15px]">
                            {em}
                         </button>
                      ))}
                      <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
                      {msg.senderId === userId ? (
                         <>
                            <button onClick={() => { setEditMode(msg); setInputVal(msg.content); }} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white" title="Edit Message"><Edit2 size={14}/></button>
                            <button onClick={() => deleteMessage(msg.id, true)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-500" title="Delete Everyone"><Trash2 size={14}/></button>
                         </>
                      ) : (
                         <button onClick={() => handleAIGenerateAction(msg.content, 'Translate')} className="p-1.5 hover:bg-white/10 rounded-lg text-secondary" title="Translate"><Globe size={14}/></button>
                      )}
                      <button onClick={() => togglePin(msg.id, msg.isPinned)} className={`p-1.5 hover:bg-white/10 rounded-lg ${msg.isPinned ? 'text-primary' : 'text-gray-400'}`} title="Pin Message"><Square className="rotate-45" size={14}/></button>
                  </div>
               </div>
             </motion.div>
          ))}
        </AnimatePresence>

        {othersTyping.length > 0 && (
           <div className="flex items-center gap-3 animate-pulse">
              <div className="flex gap-1">
                 <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div>
                 <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-75"></div>
                 <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-150"></div>
              </div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{othersTyping[0]} is formulating thoughts...</span>
           </div>
        )}

        {uploading && (
           <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-surface-container-low shrink-0 flex items-center justify-center text-white border border-outline-variant/30 shadow-lg"><Paperclip size={16} /></div>
              <div className="mt-1 bg-surface-container-low border border-outline-variant/20 backdrop-blur-md px-5 py-4 rounded-3xl rounded-tl-sm h-max w-max flex items-center shadow-sm">
                 <span className="text-[13px] font-semibold text-primary tracking-wide">Transmitting Media to Cloud...</span>
              </div>
           </div>
        )}
        <div ref={scrollRef} />
      </div>

      {showAIActions && (
         <div className="absolute bottom-[90px] right-6 md:right-8 bg-surface-container-high/90 border border-outline-variant/30 p-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 w-[340px] md:w-[400px] backdrop-blur-2xl flex flex-col gap-4">
            
            <div className="flex items-center justify-between text-secondary border-b border-white/5 pb-3">
               <div className="flex items-center justify-center gap-2 text-sm font-bold"><Bot size={18}/> Synthetic Composer</div>
               <button onClick={() => setShowAIActions(false)} className="opacity-50 hover:opacity-100 bg-white/5 p-1.5 rounded-lg"><X size={16}/></button>
            </div>

            {!aiGeneratedResult ? (
               <>
                   <div className="flex bg-surface-container/50 p-1 rounded-xl border border-white/5 mb-3">
                      {['Suggest', 'Compose', 'Rewrite', 'Translate'].map(m => (
                         <button key={m} onClick={() => { setAiMode(m); setAiPrompt(''); }} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${aiMode === m ? 'bg-secondary text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}>
                            {m}
                         </button>
                      ))}
                   </div>

                  <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2">
                     <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold shrink-0">Tone: </span>
                     {['Casual', 'Formal', 'Funny', 'Romantic', 'Professional'].map(t => (
                        <button 
                           key={t} onClick={() => setAiTone(t)} 
                           className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${aiTone === t ? 'bg-secondary/20 border border-secondary/50 text-secondary' : 'bg-surface-container border border-outline-variant/20 text-gray-400 hover:text-white'}`}
                        >
                           {t}
                        </button>
                     ))}
                  </div>

                  <div className="relative">
                     <textarea 
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        disabled={isAiProcessing || aiMode === 'Suggest'}
                        placeholder={aiMode === 'Suggest' ? "AI will read the last 10 messages and suggest a reply..." : "Detail the payload for Synapse..."}
                        className="w-full bg-black/40 border border-outline-variant/20 rounded-xl p-3 pl-4 pr-10 text-sm focus:outline-none focus:border-secondary transition-colors resize-none h-20 text-white placeholder-gray-500 shadow-inner disabled:opacity-50"
                     />
                     <button onClick={handleListen} disabled={aiMode === 'Suggest'} className={`absolute right-3 top-3 p-1.5 rounded-lg transition-all ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'text-gray-400 hover:text-white hover:bg-white/10'} disabled:opacity-50`}>
                        <Mic size={16} />
                     </button>
                  </div>

                  {aiMode === 'Compose' && (
                     <div className="flex flex-wrap gap-2">
                        {["Wish Happy Birthday", "Sincere Apology", "Huge Congrats"].map((quick, i) => (
                           <button key={i} onClick={() => { setAiPrompt(quick); handleAIGenerateAction(quick); }} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[11px] text-gray-300 font-medium transition-colors">
                              {quick}
                           </button>
                        ))}
                     </div>
                  )}

                  <button 
                     onClick={() => handleAIGenerateAction()}
                     disabled={(aiMode === 'Compose' && !aiPrompt.trim()) || isAiProcessing}
                     className="w-full flex items-center justify-center gap-2 bg-secondary text-white py-3 rounded-xl text-sm font-extrabold hover:bg-secondary/80 disabled:opacity-50 transition-colors mt-2 shadow-lg"
                  >
                     {isAiProcessing ? 'Synthesizing...' : (aiMode === 'Suggest' ? 'Generate Smart Reply' : 'Generate Blueprint')}
                  </button>
               </>
            ) : (
               <div className="flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-300">
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center justify-between">
                     Generated Output 
                     <div className="flex gap-2">
                        <button onClick={() => speakDraft(aiGeneratedResult)} className="text-secondary hover:text-white transition-colors" title="Read Aloud Text">
                           {speakingId === aiGeneratedResult ? <Square size={14}/> : <Volume2 size={14}/>}
                        </button>
                        <span className="text-secondary">{aiTone} Tone</span>
                     </div>
                  </div>
                  <textarea 
                     value={aiGeneratedResult}
                     onChange={(e) => setAiGeneratedResult(e.target.value)}
                     className="w-full bg-secondary/5 border border-secondary/20 rounded-xl p-3 text-sm text-gray-100 focus:outline-none focus:border-secondary transition-colors resize-none h-32 shadow-inner"
                  />
                  <div className="flex items-center gap-2">
                     <button onClick={() => { setAiGeneratedResult(''); window.speechSynthesis.cancel(); }} className="flex-1 px-2 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-bold transition-all">
                        Cancel
                     </button>
                     <button onClick={commitAiEdit} className="flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 bg-surface-container border border-outline-variant/30 text-gray-200 hover:text-white hover:bg-white/10 rounded-xl text-xs font-bold transition-all">
                        <Edit2 size={14}/> Edit
                     </button>
                     <button onClick={commitAiInsertAndSend} className="flex flex-[2] items-center justify-center gap-1.5 bg-secondary text-white py-2.5 rounded-xl text-xs font-extrabold hover:bg-secondary/80 transition-colors shadow-lg">
                        <Send size={14}/> Send
                     </button>
                  </div>
               </div>
            )}
         </div>
      )}

      <div className="p-6 bg-surface-container-lowest border-t border-surface-container relative z-10 w-full flex flex-col justify-center items-center pb-8">
         {isReadOnly ? (
            <div className="max-w-5xl mx-auto w-full flex items-center shadow-2xl rounded-2xl bg-black/40 border border-outline-variant/10 px-6 py-5">
               <span className="text-gray-500 text-sm font-bold flex items-center gap-3">
                 <Shield size={18}/> Terminal is read-only. Only Operators may transmit payload in announcements.
               </span>
            </div>
         ) : (
            <>
               {editMode && (
                  <div className="absolute bottom-full left-6 right-6 mb-4 p-4 bg-primary/20 border border-primary/30 rounded-2xl flex items-center justify-between shadow-2xl backdrop-blur-xl z-50">
                     <div className="flex items-center gap-3">
                        <Edit2 size={16} className="text-primary"/>
                        <div className="text-xs font-bold text-white">Editing Transmission...</div>
                     </div>
                     <button onClick={() => { setEditMode(null); setInputVal(''); }} className="text-xs font-bold text-primary hover:underline">Cancel</button>
                  </div>
               )}
               {scheduledTime && (
                  <div className="absolute bottom-full left-6 mb-4 p-3 bg-secondary/20 border border-secondary/30 rounded-xl flex items-center gap-3 backdrop-blur-md z-50">
                     <RefreshCw size={16} className="text-secondary animate-spin"/>
                     <span className="text-[10px] font-bold text-white uppercase tracking-widest">Scheduled for {new Date(scheduledTime).toLocaleTimeString()}</span>
                     <button onClick={() => setScheduledTime(null)} className="text-[10px] font-bold text-red-500 ml-2">Discard</button>
                  </div>
               )}
               {mediaFile && (
                 <div className="absolute bottom-full left-6 mb-4 p-3 bg-surface-container-high border border-outline-variant/30 rounded-xl flex items-center gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md z-50">
                    {mediaFile.type.startsWith('image') ? <FileImage size={20} className="text-primary" /> : <File size={20} className="text-primary" />}
                    <span className="text-sm text-gray-200 font-medium max-w-[200px] truncate">{mediaFile.name}</span>
                    <button 
                       onClick={() => setMediaFile(null)} 
                       className="text-white bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 p-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors shrink-0 ml-3"
                    >
                       Remove
                    </button>
                 </div>
               )}
              <div className="relative max-w-5xl mx-auto w-full flex items-center shadow-2xl rounded-2xl bg-surface-container-low border border-outline-variant/20">
                <label className="cursor-pointer hover:bg-white/5 transition-colors p-4 rounded-l-2xl flex items-center justify-center text-gray-400 hover:text-primary">
                  <Paperclip size={22} />
                  <input type="file" className="hidden" accept="*/*" onChange={(e) => setMediaFile(e.target.files[0])} />
                </label>
                
                <input 
                   type="text" 
                   value={inputVal}
                   onChange={(e) => setInputVal(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                   placeholder={`Message ${activeChat.type === 'channel' ? '#' : ''}${activeChat.name}...`} 
                   className="w-full bg-transparent text-white placeholder-gray-500 px-2 py-4 focus:outline-none transition-all text-[15px]"
                />
                
                <div className="pr-2 flex items-center gap-2">
                   {activeChat.type === 'dm' && (
                      <button 
                         onClick={deleteChat}
                         className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all border border-red-500/20 group"
                         title="Terminate Sequence"
                      >
                         <Trash2 size={18} className="group-hover:scale-110 transition-transform"/>
                      </button>
                   )}
                   <button 
                      onClick={() => setShowAIActions(!showAIActions)}
                      className="p-2 text-secondary bg-secondary/10 hover:bg-secondary/20 rounded-xl transition-all w-10 h-10 flex flex-col items-center justify-center shadow-sm"
                      title="AI Smart Message Generation"
                   >
                      <Bot size={20} />
                   </button>
                   <button 
                      onClick={() => {
                         const time = prompt("Enter scheduled time (e.g., 2026-04-05T15:00:00):");
                         if(time) setScheduledTime(time);
                      }}
                      className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-xl transition-all w-10 h-10 flex items-center justify-center"
                      title="Schedule Transmission"
                   >
                      <RefreshCw size={18} />
                   </button>
                   <button 
                      onClick={sendMessage}
                     disabled={(!inputVal.trim() && !mediaFile) || uploading}
                     className="h-10 px-5 flex items-center justify-center bg-primary text-black font-semibold rounded-xl hover:bg-primary-dim transition-all disabled:opacity-30 hover:scale-105 active:scale-95"
                     title="Send Message"
                  >
                     <Send size={18} fill="currentColor" />
                  </button>
                </div>
              </div>
            </>
         )}
      </div>
    </div>
  );
}
