import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import LeftSidebar from '../components/layout/LeftSidebar';
import MiddlePanel from '../components/layout/MiddlePanel';
import ChatArea from '../components/chat/ChatArea';
import AIChatArea from '../components/chat/AIChatArea';
import ProfileSettings from '../components/profile/ProfileSettings';
import ExploreCommunities from '../components/layout/ExploreCommunities';
import NotificationPanel from '../components/layout/NotificationPanel';

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  
  // Navigation State
  const [activeTab, setActiveTab] = useState('chats'); // 'chats', 'friends', 'communities', 'ai', 'settings'
  const [activeChat, setActiveChat] = useState({ id: null, name: 'Select a chat...', type: null });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  // Main display resolver
  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || "User";

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-surface text-white overflow-hidden text-sm md:text-base pb-16 md:pb-0 relative">
      
      {/* Mobile Top Header */}
      <div className="md:hidden h-14 bg-surface/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 shrink-0 z-40">
         <div className="flex items-center gap-3">
            <img src="/logo.png" alt="S" className="w-8 h-8 rounded-lg" />
            <span className="font-display font-black tracking-widest text-xs">SYNAPSE</span>
         </div>
         <div className="flex items-center gap-4">
            <button onClick={() => setNotificationsOpen(true)} className="p-2 text-gray-400"><Bell size={20}/></button>
         </div>
      </div>

      {/* Notifications Top Layer */}
      <AnimatePresence>
         {notificationsOpen && (
            <NotificationPanel 
               currentUser={currentUser}
               onClose={() => setNotificationsOpen(false)}
               onNavigate={(tab, chatData) => {
                  setActiveTab(tab);
                  if(chatData) setActiveChat(chatData);
               }}
            />
         )}
      </AnimatePresence>

      {/* 1. Nav (Bottom Mobile / Left Desktop) */}
      <LeftSidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => { setActiveTab(tab); setActiveChat({id: null, type: null}); }} 
        currentUser={currentUser} 
        displayName={displayName}
        notificationsOpen={notificationsOpen}
        onToggleNotifications={() => setNotificationsOpen(!notificationsOpen)}
        onLogout={logout}
      />

      {/* 2. Middle Panel (Lists / Discovery) */}
      {(activeTab === 'chats' || activeTab === 'friends' || activeTab === 'communities') && (
         <div className={`w-full md:w-80 shrink-0 h-full ${activeChat.id ? 'hidden md:block' : 'block'}`}>
            <MiddlePanel 
              activeTab={activeTab} 
              activeChat={activeChat} 
              setActiveChat={setActiveChat} 
              currentUser={currentUser}
              displayName={displayName}
            />
         </div>
      )}

      {/* 3. Main/Right Panel (Active Content) */}
      <div className={`flex-1 flex flex-col bg-surface-container-lowest h-full relative transition-all min-w-0 ${!activeChat && ['chats','friends','communities'].includes(activeTab) ? 'hidden md:flex' : 'flex'}`}>
          {(activeTab === 'chats' || activeTab === 'communities') && activeChat ? (
             <ChatArea 
               activeChat={activeChat}
               currentUser={currentUser}
               displayName={displayName}
               onBack={() => setActiveChat(null)}
             />
          ) : activeTab === 'chats' && !activeChat ? (
             <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-4">💬</div>
                <h3 className="text-lg font-bold text-white mb-1">Your Messages</h3>
                <p>Select a chat from the menu or start a new conversation.</p>
             </div>
          ) : null}

          {activeTab === 'ai' && (
             <AIChatArea 
                currentUser={currentUser} 
                displayName={displayName} 
             />
          )}

          {activeTab === 'explore' && (
             <ExploreCommunities 
                currentUser={currentUser} 
                setActiveTab={setActiveTab}
             />
          )}

          {activeTab === 'settings' && (
             <ProfileSettings 
                currentUser={currentUser} 
                displayName={displayName}
                onLogout={logout}
             />
          )}

          {activeTab === 'friends' && !activeChat && (
             <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-4">👥</div>
                <h3 className="text-lg font-bold text-white mb-1">Friends System</h3>
                <p>Search users in the middle panel to send friend requests!</p>
             </div>
          )}
      </div>

    </div>
  );
}
