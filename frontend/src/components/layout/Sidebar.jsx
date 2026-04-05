import { useState, useEffect } from 'react';
import { Search, LogOut } from 'lucide-react';
import { collection, query, where, getDocs, onSnapshot, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';

export default function Sidebar({ currentUser, displayName, activeChat, setActiveChat, logout, setIsSettingsOpen }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [chatsList, setChatsList] = useState([]);
  
  // Realtime load existing chats where current user is a participant
  useEffect(() => {
    if (!currentUser?.uid) return;
    const q = query(
      collection(db, 'chats'), 
      where('participants', 'array-contains', currentUser.uid)
    );
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      let chatsData = [];
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        let chatName = 'Unknown Chat';
        let chatAvatar = 'U';

        if (data.type === 'dm') {
          // Identify the OTHER participant to fetch their name
          const otherId = data.participants.find(p => p !== currentUser.uid);
          if (otherId) {
             const userQuery = query(collection(db, 'users'), where('__name__', '==', otherId));
             const userSnap = await getDocs(userQuery);
             if (!userSnap.empty) {
                const otherUser = userSnap.docs[0].data();
                chatName = otherUser.isAnonymous ? otherUser.anonymousName : otherUser.username;
                chatAvatar = chatName[0] || 'U';
             }
          }
        } else {
           chatName = data.name || 'Group';
           chatAvatar = '#';
        }

        chatsData.push({ id: docSnap.id, ...data, chatName, chatAvatar });
      }
      
      // Sort natively by updatedAt if available
      chatsData.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      setChatsList(chatsData);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  const handleSearch = async (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.length > 2) {
      try {
        const q = query(collection(db, 'users'), where('username', '>=', val), where('username', '<=', val + '\uf8ff'));
        const querySnapshot = await getDocs(q);
        const results = [];
        querySnapshot.forEach((docSnap) => {
           if(docSnap.id !== currentUser.uid) results.push({ id: docSnap.id, ...docSnap.data() });
        });
        setSearchResults(results);
      } catch (err) {
        console.error("Search failed:", err);
      }
    } else {
      setSearchResults([]);
    }
  };

  const startDM = async (user) => {
    // 1. Check if chat already exists
    const q1 = query(collection(db, 'chats'), where('participants', '==', [currentUser.uid, user.id].sort()));
    const existingSnap = await getDocs(q1);

    let finalChatId;
    let finalChatName = user.isAnonymous ? user.anonymousName : user.username;

    if (!existingSnap.empty) {
       finalChatId = existingSnap.docs[0].id;
    } else {
       // 2. Create new DM instance
       const res = await addDoc(collection(db, 'chats'), {
          type: 'dm',
          participants: [currentUser.uid, user.id].sort(),
          updatedAt: new Date().toISOString(),
       });
       finalChatId = res.id;
    }

    setActiveChat({ type: 'dm', id: finalChatId, name: finalChatName });
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className="w-72 bg-surface-container-low border-r border-outline-variant/20 h-full flex flex-col hidden md:flex shrink-0 shadow-2xl relative z-20">
      <div className="p-5 border-b border-outline-variant/20 flex flex-col gap-5">
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 rounded bg-gradient-to-br from-primary to-primary-dim flex items-center justify-center text-black font-display font-bold text-sm shadow-[0_0_10px_rgba(188,19,254,0.3)]">
             S
           </div>
           <span className="font-display font-bold tracking-wide text-[16px]">Synapse</span>
        </div>

        <div className="relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
           <input 
             type="text" 
             value={searchQuery}
             onChange={handleSearch}
             placeholder="Find users..."
             className="w-full bg-black/40 border border-outline-variant/30 rounded-lg py-2.5 pl-10 pr-3 text-sm focus:border-primary/50 outline-none text-white placeholder-gray-500 transition-colors"
           />
           {searchResults.length > 0 && (
             <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-high border border-outline-variant/30 rounded-xl shadow-2xl overflow-hidden z-50">
               {searchResults.map(u => (
                 <div 
                   key={u.id} 
                   onClick={() => startDM(u)}
                   className="px-4 py-3 hover:bg-primary/20 cursor-pointer flex items-center gap-3 transition-colors border-b border-white/5 last:border-0"
                 >
                   <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold uppercase border border-primary/30">
                     {u.username[0]}
                   </div>
                   <span className="text-sm font-medium text-white">{u.isAnonymous ? u.anonymousName : u.username}</span>
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
        <div>
          <h3 className="text-[11px] font-bold text-gray-500 tracking-widest uppercase mb-3 px-3">Communities</h3>
          <div className="space-y-1">
             {/* Stubbing community structure */}
              <div 
                onClick={() => setActiveChat({type: 'community', id: 'general', name: 'General'})}
                className={`px-3 py-2.5 rounded-lg cursor-pointer text-sm font-medium transition-all duration-200 flex items-center gap-3 ${activeChat.id === 'general' ? 'bg-primary/10 text-primary shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
              >
                <span className={`text-lg leading-none ${activeChat.id === 'general' ? 'text-primary' : 'text-gray-600'}`}>#</span> General
              </div>
          </div>
        </div>

        <div>
           <div className="flex items-center justify-between px-3 mb-3">
             <h3 className="text-[11px] font-bold text-gray-500 tracking-widest uppercase">Direct Messages</h3>
           </div>
          <div className="space-y-1">
            {chatsList.length === 0 && <div className="text-[13px] text-gray-600 px-3 font-medium">Search users to chat</div>}
            
            {chatsList.map(chat => (
              <div 
                key={chat.id} 
                onClick={() => setActiveChat({type: chat.type, id: chat.id, name: chat.chatName})}
                className={`px-3 py-3 rounded-lg cursor-pointer text-sm transition-all duration-200 flex items-center gap-3 ${activeChat.id === chat.id ? 'bg-primary/10 text-white shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
              >
                <div className="relative">
                   <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center font-bold uppercase text-gray-300">
                     {chat.chatAvatar?.toUpperCase() || 'U'}
                   </div>
                   <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border border-surface shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                </div>
                <div className="flex-1 overflow-hidden">
                   <div className="font-medium text-white truncate">{chat.chatName}</div>
                   {chat.lastMessage && <div className="text-xs text-gray-500 truncate">{chat.lastMessage}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="p-4 border-t border-outline-variant/20 flex items-center justify-between bg-surface-container-low group hover:bg-black/20 transition-colors cursor-pointer" onClick={() => setIsSettingsOpen(true)}>
        <div className="flex items-center gap-3 max-w-[75%]">
          <div className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center font-bold uppercase text-primary shrink-0 shadow-inner group-hover:border-primary/50 transition-colors">
             {displayName[0]}
          </div>
          <div className="overflow-hidden">
            <div className="text-sm font-medium leading-tight text-white truncate font-display">{displayName}</div>
            <div className="text-[11px] text-primary mt-0.5 font-medium tracking-wide">Settings / Identity</div>
          </div>
        </div>
        <button 
           onClick={(e) => { e.stopPropagation(); logout(); }}
           className="text-gray-500 border border-transparent hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 p-2 rounded-lg transition-all"
           title="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}
