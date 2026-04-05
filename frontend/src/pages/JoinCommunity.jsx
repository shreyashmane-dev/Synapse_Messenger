import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ArrowRight, Loader2, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

export default function JoinCommunity() {
   const { id } = useParams();
   const { currentUser } = useAuth();
   const navigate = useNavigate();
   const [community, setCommunity] = useState(null);
   const [status, setStatus] = useState('loading'); // loading, joining, error, already_joined
   const [errorMsg, setErrorMsg] = useState('');

   useEffect(() => {
      if(!id || !currentUser) return;
      verifyCommunity();
   }, [id, currentUser]);

   const verifyCommunity = async () => {
       try {
          const cR = doc(db, 'communities', id);
          const cS = await getDoc(cR);
          if(!cS.exists()) {
             setStatus('error');
             setErrorMsg("Infrastructure Not Found. The unique link may have expired or the community was decommissioned.");
             return;
          }
          setCommunity({ id: cS.id, ...cS.data() });

          // Check membership
          const mQ = query(collection(db, 'community_members'), where('communityId', '==', id), where('userId', '==', currentUser.uid));
          const mS = await getDocs(mQ);
          if(!mS.empty) {
             setStatus('already_joined');
          } else {
             setStatus('ready');
          }
       } catch (e) { setStatus('error'); setErrorMsg("Matrix Connection Failure."); }
   };

   const initiateEntry = async () => {
       setStatus('joining');
       try {
          await addDoc(collection(db, 'community_members'), {
             communityId: id,
             userId: currentUser.uid,
             role: 'member'
          });
          navigate('/app');
       } catch(e) { setStatus('error'); setErrorMsg("Deployment Blocked."); }
   };

   return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
         {/* Background Ambience */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] pointer-events-none"></div>

         <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-surface-container/50 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-2xl text-center relative z-10"
         >
            {status === 'loading' || status === 'joining' ? (
               <div className="space-y-6">
                  <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto opacity-50" />
                  <h2 className="text-xl font-bold text-white uppercase tracking-widest">{status === 'loading' ? 'Syncing ID...' : 'Establishing Link...'}</h2>
               </div>
            ) : status === 'error' ? (
               <div className="space-y-6">
                  <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto"><ShieldCheck /></div>
                  <h2 className="text-xl font-bold text-white">{errorMsg}</h2>
                  <button onClick={() => navigate('/app')} className="text-sm font-bold text-primary hover:underline">Back to Core</button>
               </div>
            ) : (
               <div className="space-y-8">
                  <div className="space-y-2">
                     <span className="text-[10px] text-primary font-extrabold uppercase tracking-[0.3em] bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20">Incoming Invitation</span>
                     <h1 className="text-4xl font-display font-black text-white pt-4">{community?.name}</h1>
                     <p className="text-gray-400 text-sm leading-relaxed">{community?.description || "A dedicated Synapse community."}</p>
                  </div>

                  <div className="flex flex-col gap-4">
                     {status === 'already_joined' ? (
                        <button 
                           onClick={() => navigate('/app')} 
                           className="w-full bg-surface-container-high hover:bg-white/10 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all border border-white/5"
                        >
                           Re-enter Hub <Globe size={18}/>
                        </button>
                     ) : (
                        <button 
                           onClick={initiateEntry} 
                           className="w-full bg-primary hover:bg-primary-dim text-black font-extrabold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-[0_0_25px_rgba(188,19,254,0.4)]"
                        >
                           Establish Connection <ArrowRight size={18}/>
                        </button>
                     )}
                     <button onClick={() => navigate('/')} className="text-xs font-bold text-gray-500 hover:text-white transition-colors">Discard Link</button>
                  </div>
               </div>
            )}
         </motion.div>
      </div>
   );
}
