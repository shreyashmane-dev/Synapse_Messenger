import { useState, useEffect } from 'react';
import { Settings, X, User, Ghost } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';

export default function SettingsModal({ onClose, currentUser, displayName }) {
  const [newUsername, setNewUsername] = useState(displayName);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [anonName, setAnonName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Fetch current user doc to get anonymous state
  useEffect(() => {
    const fetchUser = async () => {
       const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
       if (userDoc.exists()) {
          setIsAnonymous(userDoc.data().isAnonymous || false);
          setAnonName(userDoc.data().anonymousName || `Shadow_${Math.floor(Math.random() * 10000)}`);
       }
    };
    fetchUser();
  }, [currentUser.uid]);

  const saveProfile = async () => {
    setLoading(true);
    setError('');
    
    try {
      if (newUsername !== displayName) {
        // Check uniqueness if changed
        const q = query(collection(db, 'users'), where('username', '==', newUsername));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          let taken = false;
          snap.docs.forEach(d => { if (d.id !== currentUser.uid) taken = true; });
          if (taken) {
             setError('Username is taken.');
             setLoading(false);
             return;
          }
        }
      }

      await updateDoc(doc(db, 'users', currentUser.uid), {
        username: newUsername,
        isAnonymous,
        anonymousName: anonName
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose(); 
      }, 1500);

    } catch (e) {
      console.error(e);
      setError('An error occurred updating the profile.');
    }
    
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-container-high border border-outline-variant/30 w-full max-w-md rounded-2xl p-6 shadow-2xl relative text-white">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors">
           <X size={20} />
        </button>
        
        <h2 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
          <Settings size={20} className="text-primary"/> Profile Settings
        </h2>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 text-sm font-medium">{error}</div>}
        {success && <div className="mb-4 p-3 rounded-lg bg-green-500/20 border border-green-500/50 text-green-200 text-sm font-medium">Successfully updated profile!</div>}

        <div className="space-y-6">
          {/* ANONYMOUS TOGGLE */}
          <div className="flex items-center justify-between p-4 bg-black/40 border border-outline-variant/30 rounded-xl">
            <div className="flex items-center gap-3">
               <div className={`p-2 rounded-lg ${isAnonymous ? 'bg-primary/20 text-primary' : 'bg-surface-container text-gray-500'}`}>
                 <Ghost size={20} />
               </div>
               <div>
                  <h4 className="font-medium text-sm text-gray-200">Anonymous Mode</h4>
                  <p className="text-xs text-gray-500">Hide your real identity in chats</p>
               </div>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
              <div className="w-11 h-6 bg-surface-container border-outline-variant/50 border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* IDENTITY FIELDS */}
          {isAnonymous ? (
             <div>
               <label className="block text-sm font-medium text-primary mb-1">Your Anonymous Target</label>
               <input 
                  type="text" 
                  value={anonName}
                  disabled
                  className="w-full bg-primary/10 border border-primary/30 rounded-xl py-3 px-4 text-primary font-bold outline-none cursor-not-allowed opacity-80" 
               />
             </div>
          ) : (
             <div>
               <label className="block text-sm font-medium text-gray-300 mb-1">Public Unique Username</label>
               <div className="relative">
                 <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                 <input 
                    type="text" 
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full bg-black/50 border border-outline-variant/50 rounded-xl py-3 pl-10 pr-4 text-white focus:border-primary/50 outline-none transition-colors" 
                 />
               </div>
             </div>
          )}
          
          <button 
             onClick={saveProfile}
             disabled={loading}
             className="w-full bg-primary hover:bg-primary-dim text-black font-semibold py-3 rounded-lg transition-colors flex items-center justify-center mt-4"
          >
             {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
