import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, getDocs, addDoc, where } from 'firebase/firestore';
import { Search, Hash, Users, Activity, Sparkles, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ExploreCommunities({ currentUser, setActiveTab }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [communities, setCommunities] = useState([]);
  const [myCommunities, setMyCommunities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
     loadExplore();
  }, [currentUser]);

  const loadExplore = async () => {
      if(!currentUser) return;
      setLoading(true);

      // Check what I already joined
      const myMems = await getDocs(query(collection(db, 'community_members'), where('userId', '==', currentUser.uid)));
      const joinedIds = [];
      myMems.forEach(d => joinedIds.push(d.data().communityId));
      setMyCommunities(joinedIds);

      // Load all communities (In production, usually paginated or trend-sorted)
      const cSnap = await getDocs(collection(db, 'communities'));
      const cList = [];
      cSnap.forEach(c => {
         cList.push({ id: c.id, ...c.data(), members: Math.floor(Math.random() * 500) + 1 }); // Mocking members for UI scale
      });
      // Sort by members (simulating trending)
      setCommunities(cList.sort((a,b) => b.members - a.members));
      setLoading(false);
  };

  const joinCommunity = async (commId) => {
      try {
         await addDoc(collection(db, 'community_members'), {
            communityId: commId,
            userId: currentUser.uid,
            role: 'member'
         });
         setMyCommunities(prev => [...prev, commId]);
      } catch(e) { console.error("Error joining", e); }
  };

  const filtered = communities.filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.description?.toLowerCase().includes(searchTerm.toLowerCase()));
  const trending = filtered.slice(0, 3);
  const others = filtered.slice(3);

  return (
    <div className="flex-1 flex flex-col bg-surface overflow-hidden relative">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px] pointer-events-none"></div>

      <header className="h-40 border-b border-white/5 flex flex-col justify-end px-12 pb-6 relative z-10 space-y-4">
         <h1 className="text-4xl font-display font-bold text-white flex items-center gap-3"><Sparkles className="text-primary"/> Discover Communities</h1>
         <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
            <input 
               type="text" 
               placeholder="Search by name or description..." 
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="w-full bg-black/40 border border-outline-variant/30 rounded-full py-3.5 pl-12 pr-6 text-white focus:outline-none focus:border-primary shadow-inner transition-colors"
            />
         </div>
      </header>

      <div className="flex-1 overflow-y-auto p-12 custom-scrollbar relative z-10 space-y-12">
         {loading ? (
             <div className="text-center text-primary font-bold animate-pulse">Syncing Global Hubs...</div>
         ) : (
            <>
               {/* Trending Section */}
               {trending.length > 0 && (
                  <div className="space-y-6">
                     <h2 className="text-xl font-bold flex items-center gap-2"><TrendingUp className="text-secondary"/> Trending Now</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {trending.map(comm => (
                           <CommunityCard 
                              key={comm.id} 
                              community={comm} 
                              isJoined={myCommunities.includes(comm.id)}
                              onJoin={() => joinCommunity(comm.id)}
                              onEnter={() => setActiveTab('communities')}
                           />
                        ))}
                     </div>
                  </div>
               )}

               {/* All Communities Grid */}
               {others.length > 0 && (
                  <div className="space-y-6">
                     <h2 className="text-xl font-bold flex items-center gap-2"><Activity className="text-gray-400"/> New & Rising</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {others.map(comm => (
                           <CommunityCard 
                              key={comm.id} 
                              community={comm} 
                              isJoined={myCommunities.includes(comm.id)}
                              onJoin={() => joinCommunity(comm.id)}
                              onEnter={() => setActiveTab('communities')}
                           />
                        ))}
                     </div>
                  </div>
               )}
            </>
         )}
      </div>
    </div>
  );
}

function CommunityCard({ community, isJoined, onJoin, onEnter }) {
   return (
      <motion.div 
         initial={{ opacity: 0, y: 10 }}
         animate={{ opacity: 1, y: 0 }}
         className="bg-surface-container-low border border-outline-variant/20 hover:border-primary/50 transition-colors p-6 rounded-3xl shadow-lg flex flex-col gap-4 group"
      >
         <div className="flex justify-between items-start">
            <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl border border-white/10 flex items-center justify-center text-2xl font-bold text-white shadow-inner uppercase">
               {community.name?.[0]}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold bg-white/5 px-3 py-1.5 rounded-full text-gray-300">
               <Users size={12}/> {community.members}
            </div>
         </div>
         
         <div>
            <h3 className="text-lg font-bold text-white mb-1 truncate">{community.name}</h3>
            <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">{community.description || "A dedicated Synapse community without a formal description. Join to discover more."}</p>
         </div>

         <div className="mt-auto pt-4 border-t border-white/5 flex items-center gap-3">
            {isJoined ? (
               <button onClick={onEnter} className="flex-1 bg-surface-container hover:bg-surface-container-high py-2.5 rounded-xl font-bold text-sm text-gray-300 transition-colors">
                  Open Hub
               </button>
            ) : (
               <button onClick={onJoin} className="flex-1 bg-primary hover:bg-primary-dim py-2.5 rounded-xl font-bold text-sm text-black shadow-[0_0_15px_rgba(188,19,254,0.3)] transition-all">
                  Join Community
               </button>
            )}
         </div>
      </motion.div>
   );
}
