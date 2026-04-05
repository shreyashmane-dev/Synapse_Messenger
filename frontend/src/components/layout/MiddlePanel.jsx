import { useState, useEffect } from 'react';
import { Search, Plus, UserPlus, Hash, ChevronLeft, Globe, Zap, Settings as SettingsIcon, Link as LinkIcon, Trash2, ShieldCheck, UserMinus } from 'lucide-react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';

export default function MiddlePanel({ activeTab, currentUser, setActiveChat }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Global Search State
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState({ users: [], chats: [], communities: [] });

  // Community nested view states
  const [activeCommunityContext, setActiveCommunityContext] = useState(null);
  const [channels, setChannels] = useState([]);
  const [communityMembers, setCommunityMembers] = useState([]);
  const [showCommunitySettings, setShowCommunitySettings] = useState(false);

  // Advanced Friends States
  const [friendView, setFriendView] = useState('My Friends'); // 'My Friends', 'Add Network', 'Requests'
  const [globalUsers, setGlobalUsers] = useState([]);
  const [incomingReqs, setIncomingReqs] = useState([]);
  const [outgoingReqs, setOutgoingReqs] = useState([]);
  const [friendList, setFriendList] = useState([]);

  useEffect(() => {
    setActiveCommunityContext(null); // Reset when tab changes
    if (!currentUser) return;

    if (activeTab === 'friends') {
      // Load Global Users Network
      const unsub1 = onSnapshot(collection(db, 'users'), (snap) => {
         const uList = [];
         snap.forEach(d => { if(d.id !== currentUser.uid) uList.push({ id: d.id, ...d.data() }) });
         setGlobalUsers(uList);
         setLoading(false);
      });
      // Load Structured Incoming Rulesets
      const unsubIn = onSnapshot(query(collection(db, 'friend_requests'), where('toUserId', '==', currentUser.uid), where('status', '==', 'pending')), (snap) => {
         const rList = [];
         snap.forEach(d => { rList.push({ id: d.id, ...d.data() }) });
         setIncomingReqs(rList);
      });
      // Load Structured Outgoing Rulesets
      const unsubOut = onSnapshot(query(collection(db, 'friend_requests'), where('fromUserId', '==', currentUser.uid), where('status', '==', 'pending')), (snap) => {
         const rList = [];
         snap.forEach(d => { rList.push({ id: d.id, ...d.data() }) });
         setOutgoingReqs(rList);
      });
      // Load Current Friends Network
      const unsub3 = onSnapshot(query(collection(db, 'friends'), where('participants', 'array-contains', currentUser.uid)), async (snap) => {
         const fList = [];
         snap.forEach(d => fList.push(d.data().participants.find(p => p !== currentUser.uid)));
         setFriendList(fList);
      });
      return () => { unsub1(); unsubIn(); unsubOut(); unsub3(); };
    }

    if (activeTab === 'chats') {
      const q = query(collection(db, 'chats'), where('participants', 'array-contains', currentUser.uid));
      const unsub = onSnapshot(q, async (snapshot) => {
        const cList = [];
        for (const d of snapshot.docs) {
          const dt = d.data();
          let chatName = dt.name || "Unknown Chat";
          let chatAvatar = null;
          
          if (dt.type === 'dm') {
            const otherId = dt.participants.find(id => id !== currentUser.uid);
            if (otherId) {
               const userSnap = await getDocs(query(collection(db, 'users'), where('__name__', '==', otherId)));
               if (!userSnap.empty) {
                  const ot = userSnap.docs[0].data();
                  chatName = ot.isAnonymous ? ot.anonymousName : ot.username;
                  chatAvatar = ot.avatar || chatName[0] || 'U';
               }
            }
          }
          cList.push({ id: d.id, ...dt, chatName, chatAvatar, type: 'dm' });
        }
        setItems(cList.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
        setLoading(false);
      });
      return () => unsub();
    }

    if (activeTab === 'communities') {
      // First, get all communities I'm a member of
      const qMembers = query(collection(db, 'community_members'), where('userId', '==', currentUser.uid));
      const unsubMembers = onSnapshot(qMembers, async (memberSnap) => {
         const cList = [];
         for (const mDoc of memberSnap.docs) {
            const communityId = mDoc.data().communityId;
            const cSnap = await getDocs(query(collection(db, 'communities'), where('__name__', '==', communityId)));
            if (!cSnap.empty) {
               cList.push({ id: communityId, ...cSnap.docs[0].data(), myRole: mDoc.data().role, type: 'community' });
            }
         }
         setItems(cList);
         setLoading(false);
      });
      return () => unsubMembers();
    }

    // Establish Presence Heartbeat
    if (currentUser) {
       const userRef = doc(db, 'users', currentUser.uid);
       updateDoc(userRef, { status: 'online', lastSeen: serverTimestamp() });
       const handleVisible = () => {
          if (document.visibilityState === 'visible') updateDoc(userRef, { status: 'online' });
          else updateDoc(userRef, { status: 'away' });
       };
       document.addEventListener('visibilitychange', handleVisible);
       return () => {
          document.removeEventListener('visibilitychange', handleVisible);
          updateDoc(userRef, { status: 'offline', lastSeen: serverTimestamp() });
       };
    }
  }, [activeTab, currentUser]);

  useEffect(() => {
     if (!searchTerm.trim()) {
        setSearchResults({ users: [], chats: [], communities: [] });
        return;
     }
     const performGlobalSearch = async () => {
        const uRes = globalUsers.filter(u => u.username?.toLowerCase().includes(searchTerm.toLowerCase()));
        const cRes = items.filter(c => (c.chatName || c.name)?.toLowerCase().includes(searchTerm.toLowerCase()));
        setSearchResults({ users: uRes, chats: cRes.filter(c => c.type === 'dm'), communities: cRes.filter(c => c.type === 'community') });
     };
     performGlobalSearch();
  }, [searchTerm, globalUsers, items]);

  // Nested Channel & Member Listener
  useEffect(() => {
     if (activeTab === 'communities' && activeCommunityContext) {
        const qChannels = query(collection(db, 'channels'), where('communityId', '==', activeCommunityContext.id));
        const unsubCh = onSnapshot(qChannels, (snap) => {
           const chs = [];
           snap.forEach(d => chs.push({ id: d.id, ...d.data() }));
           setChannels(chs.sort((a,b) => (a.createdAt || 0) - (b.createdAt || 0)));
        });

        const qMembers = query(collection(db, 'community_members'), where('communityId', '==', activeCommunityContext.id));
        const unsubMem = onSnapshot(qMembers, async (snap) => {
           const mems = [];
           for (const d of snap.docs) {
              const uId = d.data().userId;
              const uSnap = await getDocs(query(collection(db, 'users'), where('__name__', '==', uId)));
              const uData = uSnap.empty ? { username: 'Legacy User' } : uSnap.docs[0].data();
              mems.push({ id: d.id, ...d.data(), ...uData });
           }
           setCommunityMembers(mems);
        });

        return () => { unsubCh(); unsubMem(); };
     }
  }, [activeCommunityContext, activeTab]);

  const startDM = async (targetUserId, targetUsername) => {
    const participants = [currentUser.uid, targetUserId].sort();
    const q = query(collection(db, 'chats'), where('participants', '==', participants));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      setActiveChat({ id: snap.docs[0].id, name: targetUsername, type: 'dm' });
    } else {
      const newChat = await addDoc(collection(db, 'chats'), {
        type: 'dm',
        participants,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setActiveChat({ id: newChat.id, name: targetUsername, type: 'dm' });
    }
  };

  const sendFriendRequest = async (targetUser) => {
     try {
        await addDoc(collection(db, 'friend_requests'), {
           fromUserId: currentUser.uid,
           fromUserName: currentUser.displayName || 'Operator',
           toUserId: targetUser.id,
           toUserName: targetUser.username,
           status: 'pending',
           createdAt: serverTimestamp()
        });
        await addDoc(collection(db, 'notifications'), {
           userId: targetUser.id,
           type: 'friend_request',
           title: 'Friend Request',
           body: `${currentUser.displayName || 'Someone'} requested to connect.`,
           data: { senderId: currentUser.uid },
           isRead: false,
           createdAt: new Date().toISOString()
        });
        alert(`Request dispatched to ${targetUser.username}.`);
     } catch (e) { console.error(e); }
  };

  const acceptRequest = async (req) => {
     try {
        await updateDoc(doc(db, 'friend_requests', req.id), { status: 'accepted' });
        const participants = [currentUser.uid, req.fromUserId].sort();
        await addDoc(collection(db, 'friends'), { participants, createdAt: new Date().toISOString() });
        await addDoc(collection(db, 'chats'), { type: 'dm', participants, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
     } catch (e) { console.error(e); }
  };

  const rejectRequest = async (reqId) => {
     await updateDoc(doc(db, 'friend_requests', reqId), { status: 'rejected' });
  };

  const createCommunity = async () => {
    const name = prompt("Enter new Community Framework name:");
    if (!name) return;
    const desc = prompt("Enter brief description:");
    
    try {
       // Create Community
       const commRef = await addDoc(collection(db, 'communities'), {
          name,
          description: desc || "",
          ownerId: currentUser.uid,
          createdAt: serverTimestamp()
       });

       // Create Owner Role Mapping
       await addDoc(collection(db, 'community_members'), {
          communityId: commRef.id,
          userId: currentUser.uid,
          role: 'owner'
       });

       // Create Default Channels
       await addDoc(collection(db, 'channels'), {
          communityId: commRef.id,
          name: 'announcements',
          type: 'announcement',
          createdAt: new Date().toISOString()
       });
       await addDoc(collection(db, 'channels'), {
          communityId: commRef.id,
          name: 'general',
          type: 'chat',
          createdAt: new Date().toISOString()
       });
       
       alert("Structure Established.");
    } catch (e) {
       console.error("Community deployment failed.", e);
    }
  };

  const createChannel = async () => {
     const name = prompt("Channel Name:");
     if(!name) return;
     const type = confirm("Is this an Announcement channel? (Cancel for Chat)") ? 'announcement' : 'chat';
     await addDoc(collection(db, 'channels'), {
        communityId: activeCommunityContext.id,
        name: name.toLowerCase().replace(/\s+/g, '-'),
        type,
        createdAt: new Date().toISOString()
     });
  };

  const updateMemberRole = async (memberDocId, newRole) => {
     await updateDoc(doc(db, 'community_members', memberDocId), { role: newRole });
  };

  const removeMember = async (memberDocId) => {
     if(confirm("Expel participant?")) {
        await updateDoc(doc(db, 'community_members', memberDocId), { role: 'banned' }); // or deleteDoc
     }
  };

  const deleteCommunity = async () => {
     if(confirm("TERMINATE THIS COMMUNITY? All channels and data will be detached.")) {
        await updateDoc(doc(db, 'communities', activeCommunityContext.id), { status: 'deleted' });
        setActiveCommunityContext(null);
     }
  };

  const generateInvite = () => {
     const link = `${window.location.origin}/join/${activeCommunityContext.id}`;
     navigator.clipboard.writeText(link);
     alert("Invite Link Synchronized to Clipboard.");
  };

  const handleCommunityClick = (comm) => {
     setActiveCommunityContext(comm);
  };

  const handleChannelClick = (channel) => {
     setActiveChat({
        id: channel.id,
        name: channel.name,
        type: 'channel',
        communityId: channel.communityId,
        channelType: channel.type,
        myRole: activeCommunityContext.myRole
     });
  };

  const filteredItems = items.filter(val => {
    return val.chatName?.toLowerCase().includes(searchTerm.toLowerCase()) || val.name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getFriendRenderList = () => {
     if (friendView === 'My Friends') {
        const validatedFriends = globalUsers.filter(u => friendList.includes(u.id));
        return validatedFriends.filter(val => val.username?.toLowerCase().includes(searchTerm.toLowerCase()));
     }
     if (friendView === 'Add Network') {
        return globalUsers.filter(val => 
           !friendList.includes(val.id) && 
           val.username?.toLowerCase().includes(searchTerm.toLowerCase())
        );
     }
     return []; // Requests handles map natively below
  };

  return (
    <div className="w-full bg-surface-container/30 backdrop-blur-3xl border-r border-white/5 flex flex-col relative z-20 h-full overflow-hidden shadow-2xl">
       {/* HEADER - Proper & Rigid */}
       <div className="p-4 md:p-6 bg-surface-container-low/50 backdrop-blur-md border-b border-white/5 z-30 shrink-0">
         
         {activeTab === 'communities' && activeCommunityContext ? (
            <div className="flex items-center justify-between w-full">
               <div className="flex items-center gap-3">
                  <button onClick={() => { setActiveCommunityContext(null); setShowCommunitySettings(false); }} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors">
                     <ChevronLeft size={20} />
                  </button>
                  <div>
                    <h2 className="text-lg font-display font-bold text-white leading-tight truncate max-w-[150px]">{activeCommunityContext.name}</h2>
                    <span className="text-[10px] text-primary/70 font-semibold tracking-widest uppercase">
                       {showCommunitySettings ? 'Administration' : 'Network Active'}
                    </span>
                  </div>
               </div>
               {(activeCommunityContext.myRole === 'owner' || activeCommunityContext.myRole === 'admin') && (
                  <button 
                     onClick={() => setShowCommunitySettings(!showCommunitySettings)}
                     className={`p-2 rounded-xl transition-all ${showCommunitySettings ? 'bg-primary text-black' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                  >
                     <SettingsIcon size={18} />
                  </button>
               )}
            </div>
         ) : (
            <h2 className="text-xl font-display font-bold text-white capitalize flex items-center justify-between">
               {activeTab}
               {activeTab === 'communities' && (
                 <button onClick={createCommunity} className="text-primary hover:text-primary-dim p-2 rounded-xl hover:bg-primary/20 transition-all font-bold group" title="Construct Architecture">
                   <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                 </button>
               )}
            </h2>
         )}
         
         {!activeCommunityContext && (
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                 type="text" 
                 placeholder="Search Matrix..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full bg-black/40 border border-outline-variant/20 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors shadow-inner" 
              />
              {searchTerm && (
                 <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-high border border-outline-variant/30 rounded-2xl shadow-2xl z-50 p-2 max-h-60 overflow-y-auto custom-scrollbar">
                    {searchResults.users.length > 0 && <div className="text-[10px] uppercase font-bold text-gray-500 p-2">Users</div>}
                    {searchResults.users.map(u => (
                       <div key={u.id} onClick={() => { setActiveTab('friends'); setFriendView('Add Network'); setSearchTerm(u.username); }} className="p-2 hover:bg-white/5 rounded-xl cursor-pointer text-xs font-bold text-gray-200">{u.username}</div>
                    ))}
                    {searchResults.chats.length > 0 && <div className="text-[10px] uppercase font-bold text-gray-500 p-2">Chats</div>}
                    {searchResults.chats.map(c => (
                       <div key={c.id} onClick={() => setActiveChat(c)} className="p-2 hover:bg-white/5 rounded-xl cursor-pointer text-xs font-bold text-gray-200">{c.chatName}</div>
                    ))}
                 </div>
              )}
            </div>
         )}
         
         {activeTab === 'friends' && (
            <div className="flex items-center gap-2 mt-4 bg-surface-container-high/50 p-1 rounded-xl border border-outline-variant/10">
               {['My Friends', 'Add Network', 'Requests'].map(t => (
                  <button 
                     key={t} onClick={() => setFriendView(t)} 
                     className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${friendView === t ? 'bg-primary/20 text-primary shadow-sm' : 'text-gray-500 hover:text-white'}`}
                  >
                     {t}
                  </button>
               ))}
            </div>
         )}
       </div>

       {/* LIST - Proper Scrolling */}
       <div className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar pb-24 md:pb-6">
         {loading ? (
             <div className="text-center p-4 text-gray-500 font-medium animate-pulse">Syncing Database...</div>
          ) : activeTab === 'communities' && activeCommunityContext ? (
              // RENDERING CHANNELS VIEW OR SETTINGS
              showCommunitySettings ? (
                 <div className="space-y-6 pt-2">
                    <section className="space-y-3">
                       <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-2">Quick Actions</h3>
                       <div className="grid grid-cols-2 gap-2">
                          <button onClick={createChannel} className="flex items-center justify-center gap-2 bg-surface-container hover:bg-surface-container-high py-3 rounded-2xl text-xs font-bold text-white transition-all border border-white/5">
                             <Plus size={14}/> Channel
                          </button>
                          <button onClick={generateInvite} className="flex items-center justify-center gap-2 bg-surface-container hover:bg-surface-container-high py-3 rounded-2xl text-xs font-bold text-white transition-all border border-white/5">
                             <LinkIcon size={14}/> Invite
                          </button>
                       </div>
                    </section>

                    <section className="space-y-3">
                       <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-2">Member Matrix ({communityMembers.length})</h3>
                       <div className="space-y-2">
                          {communityMembers.map(m => (
                             <div key={m.id} className="flex items-center justify-between p-3 rounded-2xl bg-surface-container/30 border border-white/5">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold uppercase">{m.username[0]}</div>
                                   <div>
                                      <div className="text-xs font-bold text-white">{m.username}</div>
                                      <div className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">{m.role}</div>
                                   </div>
                                </div>
                                {activeCommunityContext.myRole === 'owner' && m.userId !== currentUser.uid && (
                                   <div className="flex gap-1">
                                      {m.role !== 'admin' && (
                                         <button onClick={() => updateMemberRole(m.id, 'admin')} className="p-1.5 hover:bg-green-500/10 text-green-500 rounded-lg transition-colors" title="Promote to Admin">
                                            <ShieldCheck size={14}/>
                                         </button>
                                      )}
                                      <button onClick={() => removeMember(m.id)} className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors">
                                         <UserMinus size={14}/>
                                      </button>
                                   </div>
                                )}
                             </div>
                          ))}
                       </div>
                    </section>

                    {activeCommunityContext.myRole === 'owner' && (
                       <button onClick={deleteCommunity} className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-3 rounded-2xl text-xs font-bold transition-all border border-red-500/20 mt-8">
                          <Trash2 size={14}/> Destruct Network
                       </button>
                    )}
                 </div>
              ) : (
                 <div className="space-y-4">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-2 mb-2">Deployed Channels</div>
                    {channels.map(ch => (
                       <div 
                          key={ch.id} 
                          onClick={() => handleChannelClick(ch)}
                          className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer hover:bg-white/5 transition-all text-gray-300 hover:text-white group"
                       >
                         <div className={`p-2 rounded-xl shadow-inner ${ch.type === 'announcement' ? 'bg-primary/20 text-primary' : 'bg-surface-container-high text-gray-400'}`}>
                            {ch.type === 'announcement' ? <Globe size={16}/> : <Hash size={16} />}
                         </div>
                         <span className="font-semibold text-sm truncate">{ch.name}</span>
                       </div>
                    ))}
                 </div>
              )
          ) : activeTab === 'friends' ? (
             // RENDERING SECURE FRIENDS MATRIX
             friendView === 'Requests' ? (
                <div className="space-y-3">
                   {incomingReqs.map(req => (
                      <div key={req.id} className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/20 shadow-md">
                         <div className="flex items-center justify-between mb-3">
                            <span className="font-bold text-sm text-gray-200">Request from <span className="text-secondary">{req.fromUserName}</span></span>
                         </div>
                         <div className="flex gap-2">
                            <button onClick={() => acceptRequest(req)} className="flex-1 bg-primary hover:bg-primary-dim text-black font-bold py-1.5 rounded-lg text-xs transition-colors">Accept</button>
                            <button onClick={() => rejectRequest(req.id)} className="flex-1 bg-surface-container hover:bg-surface-container-high text-gray-300 font-bold py-1.5 rounded-lg text-xs transition-colors border border-outline-variant/20">Reject</button>
                         </div>
                      </div>
                   ))}
                   {incomingReqs.length === 0 && (
                      <div className="text-center text-gray-500 text-xs mt-10 p-4 border border-dashed border-outline-variant/30 rounded-2xl">No incoming requests.</div>
                   )}
                </div>
             ) : (
                getFriendRenderList().map(item => {
                   const isPending = outgoingReqs.find(r => r.toUserId === item.id) || incomingReqs.find(r => r.fromUserId === item.id);
                   const isFriends = friendList.includes(item.id);
                   
                    return (
                    <div 
                       key={item.id} 
                       onClick={() => {
                          if(friendView === 'My Friends') startDM(item.id, item.username);
                       }}
                       className={`flex items-center gap-4 p-3 rounded-2xl transition-all group ${friendView === 'My Friends' ? 'cursor-pointer hover:bg-surface-container border border-transparent hover:border-white/5' : 'bg-transparent border border-transparent'}`}
                    >
                       <div className="relative">
                          <div className="w-12 h-12 rounded-full shadow-lg bg-surface-container-high border border-outline-variant/30 flex items-center justify-center font-bold uppercase text-gray-300 overflow-hidden">
                             {item.avatar ? <img src={item.avatar} className="w-full h-full object-cover" /> : item.username?.[0] || 'U'}
                          </div>
                          <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-surface shadow-sm ${item.status === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : item.status === 'busy' ? 'bg-red-500' : 'bg-gray-500'}`}></div>
                       </div>
                       
                       <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-[15px] text-gray-100 truncate group-hover:text-primary transition-colors">{item.username}</h4>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{item.status || (item.isAnonymous ? 'Ghost Identity' : 'Offline connection')}</p>
                       </div>
                      
                      {friendView === 'Add Network' && !isFriends && (
                         <button 
                            onClick={(e) => { e.stopPropagation(); if(!isPending) sendFriendRequest(item); }}
                            className={`p-2 rounded-xl text-xs font-bold transition-all shadow-sm ${isPending ? 'bg-surface-container-high text-gray-500' : 'bg-primary/20 text-primary hover:bg-primary/40'}`}
                         >
                            {isPending ? 'Pending' : <UserPlus size={16}/>}
                         </button>
                      )}
                      {friendView === 'My Friends' && (
                         <div className="opacity-0 group-hover:opacity-100 p-2 text-primary bg-primary/10 rounded-xl transition-all shadow-sm"><Zap size={16}/></div>
                      )}
                   </div>
                )})
             )
         ) : (
            // RENDERING CHATS AND COMMUNITIES
            filteredItems.map(item => (
               <div 
                  key={item.id} 
                  onClick={() => {
                     if(activeTab === 'chats') setActiveChat(item);
                     else if(activeTab === 'communities') handleCommunityClick(item);
                  }}
                  className="flex items-center gap-4 p-3 rounded-2xl cursor-pointer hover:bg-surface-container transition-all group border border-transparent hover:border-white/5"
               >
                  <div className="relative">
                     {activeTab === 'communities' ? (
                        <div className="w-12 h-12 rounded-xl bg-surface-container-high shadow-lg border border-outline-variant/30 text-gray-300 flex items-center justify-center font-bold text-xl">{item.name?.[0]?.toUpperCase()}</div>
                     ) : item.chatAvatar && item.chatAvatar?.length > 5 ? (
                        <img src={item.chatAvatar} alt="Avatar" className="w-12 h-12 rounded-full shadow-lg object-cover border border-outline-variant/30" />
                     ) : (
                        <div className="w-12 h-12 rounded-full shadow-lg bg-surface-container-high border border-outline-variant/30 flex items-center justify-center font-bold uppercase text-gray-300">
                           {item.chatAvatar || 'U'}
                        </div>
                     )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                     <h4 className="font-bold text-[15px] text-gray-100 truncate group-hover:text-primary transition-colors">
                        {item.chatName || item.name}
                     </h4>
                     <p className="text-xs text-gray-500 truncate mt-0.5">
                        {item.lastMessage || (activeTab === 'communities' ? 'Structure active' : 'Initiate sequence...')}
                     </p>
                  </div>
               </div>
            ))
         )}
       </div>
    </div>
  );
}
