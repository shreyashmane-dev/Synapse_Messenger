import { useState, useEffect } from 'react';
import { User, Ghost, Camera, Info, AlertTriangle, Check, X, Sun, Moon } from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from '../../firebase';

export default function ProfileSettings({ currentUser, displayName, onLogout }) {
  const [newUsername, setNewUsername] = useState(displayName);
  const [bio, setBio] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [anonName, setAnonName] = useState('');
  const [localAvatar, setLocalAvatar] = useState(currentUser.photoURL);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Avatar Modal States
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState(null);
  const [avatarError, setAvatarError] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
       const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
       if (userDoc.exists()) {
          const d = userDoc.data();
          setIsAnonymous(d.isAnonymous || false);
          setAnonName(d.anonymousName || `Shadow_${Math.floor(Math.random() * 10000)}`);
          if (d.bio) setBio(d.bio);
          if (d.avatar) setLocalAvatar(d.avatar);
       }
    };
    fetchUser();
  }, [currentUser.uid]);

  const saveProfile = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        username: newUsername,
        bio: bio,
        isAnonymous,
        anonymousName: anonName
      });

      if (newUsername !== displayName) {
         await updateProfile(auth.currentUser, { displayName: newUsername });
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

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
           const dRes = await fetch(`https://api.cloudinary.com/v1_1/${cName}/auto/upload`, { method: 'POST', body: fd });
           if (!dRes.ok) throw new Error("Cloudinary Error");
           resolve(await dRes.json());
         } catch(err) { reject(err); }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (e) => {
     const file = e.target.files[0];
     if (!file) return;

     // Validate format
     const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
     if (!validTypes.includes(file.type)) {
        setAvatarError("Invalid format. Use JPG, PNG, or WEBP.");
        return;
     }

     // Validate File Size (1MB limit)
     if (file.size > 1024 * 1024) {
        setAvatarError("Image must be less than 1 MB");
        return;
     }

     setAvatarError('');
     setPendingAvatarFile(file);
     setPendingAvatarPreview(URL.createObjectURL(file));
     setShowAvatarModal(true);
  };

  const confirmAvatarUpload = async () => {
     if (!pendingAvatarFile) return;

     setAvatarUploading(true);
     try {
       const uploader = await uploadMediaCloudinary(pendingAvatarFile);
       const url = uploader.secure_url;
       
       await updateProfile(auth.currentUser, { photoURL: url });
       await updateDoc(doc(db, 'users', currentUser.uid), { avatar: url });
       
       setLocalAvatar(url);
       setShowAvatarModal(false);
       setPendingAvatarFile(null);
       setPendingAvatarPreview(null);
     } catch (err) {
       console.error("Avatar upload failed", err);
       setAvatarError("Failed to upload. Check console.");
     }
     setAvatarUploading(false);
  };

  const cancelAvatarUpload = () => {
      setShowAvatarModal(false);
      setPendingAvatarFile(null);
      setPendingAvatarPreview(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-12 bg-surface flex flex-col items-center relative">
       
       {/* AVATAR PREVIEW MODAL */}
       {showAvatarModal && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
             <div className="bg-surface-container border border-outline-variant/30 rounded-3xl p-8 max-w-sm w-full shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col items-center">
                <h3 className="text-xl font-display font-bold text-white mb-6">Preview Avatar</h3>
                
                <img src={pendingAvatarPreview} alt="Preview" className="w-48 h-48 rounded-full object-cover border-4 border-primary/50 shadow-xl mb-8" />
                
                {avatarError && (
                   <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-xl mb-6 w-full text-sm font-bold">
                      <AlertTriangle size={16} /> {avatarError}
                   </div>
                )}

                <div className="flex w-full gap-4">
                   <button 
                      onClick={cancelAvatarUpload} 
                      disabled={avatarUploading}
                      className="flex-1 py-3 bg-surface border border-outline-variant/20 rounded-xl text-gray-300 font-semibold hover:bg-white/5 transition-colors disabled:opacity-50"
                   >
                      Cancel
                   </button>
                   <button 
                      onClick={confirmAvatarUpload} 
                      disabled={avatarUploading}
                      className="flex-1 py-3 bg-primary rounded-xl text-black font-extrabold flex items-center justify-center gap-2 hover:bg-primary-dim transition-colors disabled:opacity-50 disabled:bg-primary/50 shadow-lg"
                   >
                      {avatarUploading ? 'Uploading...' : 'Confirm'}
                   </button>
                </div>
             </div>
          </div>
       )}

       <div className="w-full max-w-2xl">
          <h1 className="text-3xl font-display font-bold mb-8">Profile & Platform Settings</h1>

          <div className="bg-surface-container-low border border-outline-variant/10 rounded-3xl p-8 shadow-2xl mb-8">
             
             <div className="flex items-center gap-8 mb-10">
                <div className="relative group">
                   {localAvatar ? (
                      <img src={localAvatar} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-surface-container shadow-xl" />
                   ) : (
                      <div className="w-24 h-24 rounded-full bg-primary/20 border-4 border-primary/30 flex items-center justify-center text-3xl font-bold font-display text-primary shadow-xl uppercase">
                         {displayName[0]}
                      </div>
                   )}
                   <label className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera size={20} className="text-white mb-1" />
                      <span className="text-[10px] text-white font-medium uppercase font-bold">Edit</span>
                      <input type="file" className="hidden" accept="image/jpeg, image/png, image/webp" onChange={handleFileSelect} />
                   </label>
                </div>

                <div>
                   <h2 className="text-2xl font-bold font-display">{displayName}</h2>
                   <div className="text-sm text-gray-400 mt-1">{currentUser.email}</div>
                </div>
             </div>

             {/* Errors strictly handled inline without modal overlap here */}
             {avatarError && !showAvatarModal && (
               <div className="text-red-400 text-sm font-bold bg-red-400/10 p-3 rounded-xl mb-6 flex items-center gap-2">
                  <AlertTriangle size={16} /> {avatarError}
               </div>
             )}

             <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Public Identity / Username</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input 
                       type="text" 
                       value={newUsername}
                       onChange={(e) => setNewUsername(e.target.value)}
                       className="w-full bg-black/40 border border-outline-variant/30 rounded-xl py-4 pl-12 pr-4 text-white focus:border-primary/50 outline-none transition-colors shadow-inner" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Bio Status</label>
                  <div className="relative">
                    <Info className="absolute left-4 top-4 text-gray-500" size={18} />
                    <textarea 
                       value={bio}
                       onChange={(e) => setBio(e.target.value)}
                       placeholder="What's your current status?"
                       className="w-full bg-black/40 border border-outline-variant/30 rounded-xl py-4 pl-12 pr-4 text-white focus:border-primary/50 outline-none transition-colors shadow-inner h-24 resize-none" 
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-5 bg-gradient-to-r from-black/20 to-black/5 border border-outline-variant/20 rounded-xl">
                   <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl shadow-inner ${isAnonymous ? 'bg-primary/20 text-primary' : 'bg-white/5 text-gray-500'}`}>
                        <Ghost size={24} />
                      </div>
                      <div>
                         <h4 className="font-bold text-[15px] text-white">Ghost Architecture (Anonymous Mode)</h4>
                         <p className="text-xs text-gray-400 mt-0.5">Mask your identity instantly across all chats.</p>
                      </div>
                   </div>
                   
                   <label className="relative inline-flex items-center cursor-pointer ml-4">
                     <input type="checkbox" className="sr-only peer" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
                     <div className="w-12 h-7 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-transparent after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                   </label>
                </div>

                {isAnonymous && (
                   <div className="p-5 bg-primary/5 border border-primary/20 rounded-xl">
                     <label className="block text-sm font-bold text-primary mb-2">Your Masked Identity</label>
                     <input type="text" value={anonName} disabled className="w-full bg-black/40 border border-primary/30 rounded-xl py-4 px-4 text-primary font-bold outline-none cursor-not-allowed opacity-80 shadow-inner" />
                   </div>
                )}
                
                <button 
                   onClick={saveProfile}
                   disabled={loading}
                   className={`w-full font-semibold py-4 rounded-xl transition-colors flex items-center justify-center mt-4 shadow-lg ${success ? 'bg-green-500 text-black' : 'bg-primary hover:bg-primary-dim text-black'}`}
                >
                   {loading ? 'Saving Parameters...' : (success ? 'Configuration Saved' : 'Update Global Settings')}
                </button>
             </div>
          </div>

          <div className="bg-surface-container-low border border-outline-variant/10 rounded-3xl p-8 shadow-2xl mb-8">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="p-3 rounded-xl bg-white/5 text-primary shadow-inner">
                      <Sun size={24} />
                   </div>
                   <div>
                      <h4 className="font-bold text-[15px] text-white">Visual Saturation</h4>
                      <p className="text-xs text-gray-400 mt-0.5">Switch between Light and Dark interface modes.</p>
                   </div>
                </div>
                
                <button 
                   onClick={() => document.documentElement.classList.toggle('light-theme')}
                   className="px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/5 rounded-xl text-xs font-bold text-white transition-all shadow-lg"
                >
                   Toggle Theme
                </button>
             </div>
          </div>

          <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-6 flex items-center justify-between shadow-lg">
             <div>
                <h4 className="font-bold text-red-400">Danger Zone</h4>
                <p className="text-xs text-red-500/70 mt-1">Disconnect instantly from Synapse protocol.</p>
             </div>
             <button onClick={onLogout} className="px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-bold transition-colors">
                Terminate Session
             </button>
          </div>
       </div>
    </div>
  );
}
