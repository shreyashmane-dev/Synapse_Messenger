import { useState, useEffect } from 'react';
import { Home, MessageSquare, Users, Settings, LogOut, Bot, Bell, Shield, User, Circle, Compass, Sun, Globe } from 'lucide-react';
import { db } from '../../firebase';
import { doc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';

export default function LeftSidebar({ activeTab, setActiveTab, currentUser, displayName, onLogout, onToggleNotifications, notificationsOpen }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('online');

  useEffect(() => {
     if(!currentUser) return;
     const q = query(collection(db, 'notifications'), where('userId', '==', currentUser.uid), where('isRead', '==', false));
     const unsub = onSnapshot(q, snap => setUnreadCount(snap.docs.length));
     return () => unsub();
  }, [currentUser]);

  const updateStatus = async (status) => {
     setCurrentStatus(status);
     setShowStatusMenu(false);
     if (currentUser) {
        await updateDoc(doc(db, 'users', currentUser.uid), { status });
     }
  };
  
  const tabs = [
    { id: 'chats', icon: <MessageSquare size={22} />, label: 'Chats' },
    { id: 'friends', icon: <Users size={22} />, label: 'Friends' },
    { id: 'communities', icon: <Globe size={22} />, label: 'Communities' },
    { id: 'explore', icon: <Compass size={22} />, label: 'Explore' },
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full md:relative md:w-20 bg-surface-container-low border-t md:border-t-0 md:border-r border-outline-variant/10 h-16 md:h-full flex flex-row md:flex-col items-center justify-around md:justify-start py-0 md:py-6 shrink-0 z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.5)] md:shadow-2xl">
      {/* Brand Icon */}
      <img 
         src="/logo.png" 
         alt="Synapse" 
         onClick={() => setActiveTab('chats')}
         className="hidden md:block w-12 h-12 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_0_20px_rgba(188,19,254,0.3)] mb-8 cursor-pointer hover:scale-110 transition-all object-contain p-1" 
      />

      {/* Main Tabs */}
      <div className="flex flex-row md:flex-col gap-2 md:gap-6 w-full md:px-3 justify-center md:flex-1 h-full md:h-auto items-center">
         {tabs.map((tab) => (
            <button
               key={tab.id}
               onClick={() => { setActiveTab(tab.id); if(notificationsOpen) onToggleNotifications(); }}
               title={tab.label}
               className={`relative flex items-center justify-center h-12 w-12 md:w-full md:aspect-square md:h-auto rounded-2xl transition-all duration-300 group ${activeTab === tab.id && !notificationsOpen ? 'bg-primary text-black shadow-[0_0_15px_rgba(188,19,254,0.4)]' : 'text-gray-500 hover:bg-surface-container hover:text-white'}`}
            >
               {tab.icon}
            </button>
         ))}

         <button
            onClick={onToggleNotifications}
            title="Notification Center"
            className={`hidden md:flex relative items-center justify-center h-12 w-12 md:w-full md:aspect-square md:h-auto rounded-2xl transition-all duration-300 group ${notificationsOpen ? 'bg-secondary text-black shadow-[0_0_15px_rgba(188,19,254,0.4)]' : 'text-gray-500 hover:bg-surface-container hover:text-white'}`}
         >
            <Bell size={22} />
            {unreadCount > 0 && (
               <span className="absolute top-2 right-2 md:top-3 md:right-3 w-3 h-3 bg-red-500 rounded-full border-2 border-surface animate-pulse"></span>
            )}
         </button>
      </div>

      {/* Bottom/Right Tabs */}
      <div className="flex flex-row md:flex-col gap-2 md:gap-6 w-auto md:w-full md:px-3 md:mt-auto items-center justify-center pr-2 md:pr-0">
         <button
            onClick={() => setActiveTab('ai')}
            title="Synapse AI Assistant"
            className={`relative flex items-center justify-center h-12 w-12 md:w-full md:aspect-square md:h-auto rounded-2xl transition-all duration-300 group ${activeTab === 'ai' ? 'bg-secondary-container/40 text-secondary border border-secondary/50 shadow-[0_0_15px_rgba(185,10,252,0.3)]' : 'text-gray-500 hover:bg-secondary-container/20 hover:text-secondary'}`}
         >
            <Bot size={22} />
         </button>

         <button
            onClick={() => setActiveTab('settings')}
            title="Profile & Settings"
            className={`relative flex items-center justify-center h-12 w-12 md:w-full md:aspect-square md:h-auto rounded-2xl transition-all duration-300 group ${activeTab === 'settings' ? 'bg-white/10 text-white' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}
         >
            {activeTab === 'settings' ? (
              currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="Avatar" className="w-8 h-8 rounded-full object-cover shadow-sm" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">{displayName?.[0]?.toUpperCase()}</div>
              )
            ) : (
              <Settings size={22} />
            )}
         </button>
      </div>

      {/* User & Status */}
      <div className="relative p-4 border-t border-white/5 bg-black/20 hidden md:block w-full">
         {showStatusMenu && (
            <div className="absolute bottom-full left-4 mb-2 w-48 bg-surface-container-high border border-outline-variant/30 rounded-2xl shadow-2xl p-2 z-50 animate-in slide-in-from-bottom-2 duration-200">
               <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest p-2 border-b border-white/5 mb-1">Set Presence</div>
               {[
                  { id: 'online', label: 'Active', color: 'bg-green-500' },
                  { id: 'busy', label: 'Do Not Disturb', color: 'bg-red-500' },
                  { id: 'invisible', label: 'Stealth Mode', color: 'bg-gray-500' }
               ].map(s => (
                  <button 
                     key={s.id} 
                     onClick={() => updateStatus(s.id)}
                     className="w-full flex items-center gap-3 p-2.5 hover:bg-white/5 rounded-xl transition-all"
                  >
                     <div className={`w-3 h-3 rounded-full ${s.color}`}></div>
                     <span className="text-xs font-bold text-gray-200">{s.label}</span>
                  </button>
               ))}
            </div>
         )}
         
         <div className="flex items-center justify-between">
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="flex items-center gap-3 group relative"
            >
              <div className="relative">
                 {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-outline-variant shadow-lg" />
                 ) : (
                    <div className="w-10 h-10 rounded-full bg-surface-container-high border-2 border-outline-variant flex items-center justify-center font-bold text-gray-300">
                       {currentUser?.displayName?.[0] || 'U'}
                    </div>
                 )}
                 <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-surface shadow-sm ${currentStatus === 'online' ? 'bg-green-500' : currentStatus === 'busy' ? 'bg-red-500' : 'bg-gray-500'}`}></div>
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-bold text-white truncate max-w-[100px] leading-tight capitalize">{currentUser?.displayName || 'User'}</p>
                <p className="text-[10px] text-primary font-bold uppercase tracking-tighter opacity-70">Identity Verified</p>
              </div>
            </button>
            <button 
              onClick={onLogout}
              className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
              title="Terminate Session"
            >
              <LogOut size={20} />
            </button>
         </div>
      </div>
    </div>
  );
}
