import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { Bell, MessageSquare, UserPlus, Globe, X, Check, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationPanel({ currentUser, onClose, onNavigate }) {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'notifications'), where('userId', '==', currentUser.uid));
    const unsub = onSnapshot(q, (snap) => {
       const notifs = [];
       snap.forEach(d => notifs.push({ id: d.id, ...d.data() }));
       notifs.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
       setNotifications(notifs);
    });
    return () => unsub();
  }, [currentUser]);

  const markAsRead = async (id) => {
     await updateDoc(doc(db, 'notifications', id), { isRead: true });
  };

  const markAllRead = async () => {
     const batch = writeBatch(db);
     notifications.filter(n => !n.isRead).forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { isRead: true });
     });
     await batch.commit();
  };

  const handleClick = (notif) => {
     markAsRead(notif.id);
     if (notif.type === 'message') {
        onNavigate('chats', { id: notif.data.chatId, type: 'dm' });
     } else if (notif.type === 'friend_request') {
        onNavigate('friends', null);
     } else if (notif.type === 'community') {
        onNavigate('communities', null);
     }
     onClose();
  };

  const filtered = notifications.filter(n => {
     if (filter === 'All') return true;
     if (filter === 'Messages') return n.type === 'message';
     if (filter === 'Requests') return n.type === 'friend_request';
     if (filter === 'Communities') return n.type === 'community';
     return true;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="absolute top-0 left-full md:left-[80px] h-full w-full md:w-[400px] bg-surface-container-low/95 backdrop-blur-3xl border-r border-white/10 shadow-[20px_0_50px_rgba(0,0,0,0.8)] z-50 flex flex-col pt-[calc(env(safe-area-inset-top)+10px)]"
    >
      <header className="px-6 py-6 border-b border-white/5 flex items-center justify-between shrink-0">
         <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary/20 text-secondary rounded-xl"><Bell size={20}/></div>
            <h2 className="text-xl font-display font-bold text-white">Notifications</h2>
         </div>
         <div className="flex items-center gap-2">
            <button onClick={markAllRead} className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors" title="Mark visible as read"><CheckCircle2 size={18}/></button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors md:hidden"><X size={20}/></button>
         </div>
      </header>

      <div className="px-6 py-4 flex gap-2 overflow-x-auto custom-scrollbar shrink-0 border-b border-white/5">
         {['All', 'Messages', 'Requests', 'Communities'].map(f => (
            <button 
               key={f} onClick={() => setFilter(f)}
               className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${filter === f ? 'bg-secondary text-black shadow-lg shadow-secondary/20' : 'bg-surface-container border border-outline-variant/30 text-gray-400 hover:text-white'}`}
            >
               {f}
            </button>
         ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3 custom-scrollbar">
         <AnimatePresence>
            {filtered.length === 0 ? (
               <div className="text-center p-8 text-gray-500 flex flex-col items-center">
                  <Bell size={32} className="opacity-20 mb-3"/>
                  <span className="font-bold">No active notifications.</span>
                  <span className="text-xs mt-1">You are all caught up!</span>
               </div>
            ) : filtered.map(notif => (
               <motion.div 
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => handleClick(notif)}
                  className={`relative p-4 rounded-2xl cursor-pointer transition-all border outline outline-2 outline-transparent hover:outline-white/10 ${notif.isRead ? 'bg-surface-container/50 border-transparent opacity-70' : 'bg-surface-container hover:bg-surface-container-high border-outline-variant/20 shadow-md'}`}
               >
                  {!notif.isRead && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(188,19,254,0.8)]"></div>}
                  <div className="flex gap-4 items-start">
                     <div className={`p-2.5 rounded-xl text-white shadow-sm shrink-0 ${notif.type==='message' ? 'bg-blue-500' : notif.type==='friend_request' ? 'bg-primary' : 'bg-green-500'}`}>
                        {notif.type === 'message' && <MessageSquare size={18}/>}
                        {notif.type === 'friend_request' && <UserPlus size={18}/>}
                        {notif.type === 'community' && <Globe size={18}/>}
                     </div>
                     <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex justify-between items-baseline mb-1">
                           <h4 className={`text-sm font-bold truncate pr-3 ${notif.isRead ? 'text-gray-300' : 'text-white'}`}>{notif.title}</h4>
                           <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap shrink-0">{new Date(notif.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className={`text-xs line-clamp-2 leading-relaxed ${notif.isRead ? 'text-gray-500' : 'text-gray-300'}`}>{notif.body}</p>
                     </div>
                  </div>
               </motion.div>
            ))}
         </AnimatePresence>
      </div>
    </motion.div>
  );
}
