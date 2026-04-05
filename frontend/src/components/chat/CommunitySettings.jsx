import { useState, useEffect } from 'react';
import { Shield, Trash2, X, Plus, Users, LayoutDashboard } from 'lucide-react';
import { doc, deleteDoc, updateDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

export default function CommunitySettings({ communityId, communityName, myRole, onClose }) {
  const [members, setMembers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [newChannelName, setNewChannelName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
     loadData();
  }, [communityId]);

  const loadData = async () => {
      setLoading(true);
      // load members
      const qM = query(collection(db, 'community_members'), where('communityId', '==', communityId));
      const mSnap = await getDocs(qM);
      const mList = [];
      for (const d of mSnap.docs) {
          const mData = d.data();
          const uDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', mData.userId)));
          if (!uDoc.empty) {
             mList.push({ memberDocId: d.id, ...mData, username: uDoc.docs[0].data().username });
          }
      }
      setMembers(mList);

      // load channels
      const qC = query(collection(db, 'channels'), where('communityId', '==', communityId));
      const cSnap = await getDocs(qC);
      const cList = [];
      cSnap.forEach(c => cList.push({ id: c.id, ...c.data() }));
      setChannels(cList);
      setLoading(false);
  };

  const createChannel = async (type) => {
      if (!newChannelName.trim()) return;
      await addDoc(collection(db, 'channels'), {
          communityId,
          name: newChannelName.toLowerCase().replace(/\s+/g, '-'),
          type,
          createdAt: serverTimestamp()
      });
      setNewChannelName('');
      loadData();
  };

  const deleteChannel = async (chId) => {
      if (!window.confirm("Destroy this channel?")) return;
      await deleteDoc(doc(db, 'channels', chId));
      loadData();
  };

  const promoteUser = async (memberDocId) => {
     await updateDoc(doc(db, 'community_members', memberDocId), { role: 'admin' });
     loadData();
  };

  const kickUser = async (memberDocId) => {
      if (!window.confirm("Remove user from community?")) return;
      await deleteDoc(doc(db, 'community_members', memberDocId));
      loadData();
  };

  const destroyCommunity = async () => {
      if (!window.confirm("FATAL: Destroy whole community? This cannot be undone.")) return;
      try {
          // 1. Purge all channels and their messages
          for (const ch of channels) {
             const qM = query(collection(db, 'messages'), where('chatId', '==', ch.id));
             const mSnap = await getDocs(qM);
             for (const mDoc of mSnap.docs) {
                const mData = mDoc.data();
                if (mData.mediaData?.public_id) {
                   fetch('/api/delete_media', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publicId: mData.mediaData.public_id, resourceType: mData.mediaData.type }) });
                }
                await deleteDoc(doc(db, 'messages', mDoc.id));
             }
             await deleteDoc(doc(db, 'channels', ch.id));
          }

          // 2. Purge all member mappings
          const qMM = query(collection(db, 'community_members'), where('communityId', '==', communityId));
          const mmSnap = await getDocs(qMM);
          for (const mmDoc of mmSnap.docs) {
             await deleteDoc(doc(db, 'community_members', mmDoc.id));
          }

          // 3. Purge community itself
          await deleteDoc(doc(db, 'communities', communityId));
          onClose();
      } catch (err) { console.error("Purge failure", err); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
       <div className="bg-surface-container border border-outline-variant/30 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)]">
          
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
             <div>
                <h2 className="text-2xl font-display font-bold text-white">{communityName} Configuration</h2>
                <div className="text-sm font-semibold text-primary uppercase tracking-widest mt-1 flex items-center gap-2"><Shield size={14}/> Access Level: {myRole}</div>
             </div>
             <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"><X size={20}/></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8 custom-scrollbar">
             
             {/* CHANNELS PANEL */}
             <div className="space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2 text-white border-b border-white/10 pb-2"><LayoutDashboard size={18}/> Architecture Map</h3>
                <div className="space-y-3">
                   {channels.map(ch => (
                      <div key={ch.id} className="flex flex-col bg-black/40 border border-white/5 p-3 rounded-xl shadow-inner">
                         <div className="flex justify-between items-center">
                            <span className="font-semibold text-sm text-gray-300">#{ch.name}</span>
                            <div className="flex items-center gap-2">
                               <span className="text-[10px] font-bold text-primary uppercase bg-primary/10 px-2 py-1 rounded-md">{ch.type}</span>
                               {(myRole === 'owner' || myRole === 'admin') && ch.name !== 'general' && ch.name !== 'announcements' && (
                                  <button onClick={() => deleteChannel(ch.id)} className="text-red-400 hover:text-red-300"><Trash2 size={16}/></button>
                               )}
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
                {(myRole === 'owner' || myRole === 'admin') && (
                   <div className="flex gap-2">
                      <input type="text" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} placeholder="new-channel" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                      <button onClick={() => createChannel('chat')} className="p-2 bg-primary text-black rounded-xl hover:bg-primary-dim"><Plus size={18}/></button>
                      <button onClick={() => createChannel('announcement')} className="p-2 bg-secondary text-black rounded-xl hover:bg-secondary/80 text-xs font-bold">Announce</button>
                   </div>
                )}
             </div>

             {/* MEMBERS PANEL */}
             <div className="space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2 text-white border-b border-white/10 pb-2"><Users size={18}/> Node Operators</h3>
                <div className="space-y-3">
                   {members.map(m => (
                      <div key={m.memberDocId} className="flex justify-between items-center bg-black/40 border border-white/5 p-3 rounded-xl shadow-inner">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-gray-300 uppercase">{m.username[0]}</div>
                           <div>
                              <div className="font-semibold text-sm text-white">{m.username}</div>
                              <div className="text-[10px] text-gray-500 uppercase">{m.role}</div>
                           </div>
                         </div>
                         <div className="flex items-center gap-2">
                            {myRole === 'owner' && m.role === 'member' && <button onClick={() => promoteUser(m.memberDocId)} className="text-xs bg-green-500/20 text-green-400 font-bold px-2 py-1 rounded hover:bg-green-500/30">Promote</button>}
                            {(myRole === 'owner' || (myRole === 'admin' && m.role === 'member')) && m.role !== 'owner' && <button onClick={() => kickUser(m.memberDocId)} className="text-red-400 hover:text-red-300 p-1"><X size={16}/></button>}
                         </div>
                      </div>
                   ))}
                </div>
             </div>

          </div>
          
          {/* FOOTER ACTIONS */}
          {myRole === 'owner' && (
             <div className="p-6 bg-red-500/5 mt-auto border-t border-red-500/20 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-sm">
                   <h4 className="font-bold text-red-500">Nuclear Protocol</h4>
                   <p className="text-xs text-red-500/70">Terminal destruction sequence of entire community.</p>
                </div>
                <button onClick={destroyCommunity} className="px-6 py-3 bg-red-500 border border-red-600 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                   Purge Community
                </button>
             </div>
          )}

       </div>
    </div>
  );
}
