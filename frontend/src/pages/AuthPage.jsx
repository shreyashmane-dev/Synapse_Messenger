import { useState } from 'react';
import { motion } from 'framer-motion';
import { auth, googleProvider, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', userCred.user.uid), {
          id: userCred.user.uid,
          firebaseUid: userCred.user.uid,
          username: username || email.split('@')[0],
          isAnonymous: false,
          createdAt: new Date().toISOString()
        });
      }
      navigate('/app');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userRef = doc(db, 'users', result.user.uid);
      const docSnap = await getDoc(userRef);
      if (!docSnap.exists()) {
        await setDoc(userRef, {
          id: result.user.uid,
          firebaseUid: result.user.uid,
          username: result.user.displayName || 'Google User',
          avatar: result.user.photoURL,
          isAnonymous: false,
          createdAt: new Date().toISOString()
        });
      }
      navigate('/app');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[30%] h-[30%] rounded-full bg-primary blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[30%] h-[30%] rounded-full bg-primary-dim blur-[150px]" />
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-panel p-8 rounded-2xl w-full max-w-md z-10 border border-outline-variant/30 text-white"
      >
        <div className="flex flex-col items-center mb-8">
           <img src="/logo.png" alt="Synapse" className="w-20 h-20 mb-4 rounded-3xl shadow-[0_10px_40px_rgba(188,19,254,0.4)] border border-primary/20" />
           <h2 className="text-3xl font-display font-black text-white bg-clip-text">
             {isLogin ? 'Operator Ingress' : 'Deploy Identity'}
           </h2>
           <p className="text-[10px] uppercase font-bold text-primary tracking-[0.4em] mt-2 opacity-70">Neural Messaging Matrix</p>
        </div>

        {error && <div className="p-3 rounded bg-red-500/20 border border-red-500/50 text-red-200 text-sm mb-4">{error}</div>}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
              <input 
                type="text" 
                value={username} onChange={(e)=>setUsername(e.target.value)}
                className="w-full bg-black/50 border border-outline-variant/50 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-white placeholder-gray-500"
                placeholder="Enter username"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input 
              type="email" required
              value={email} onChange={(e)=>setEmail(e.target.value)}
              className="w-full bg-black/50 border border-outline-variant/50 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-white placeholder-gray-500"
              placeholder="Enter your email"
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} required
                value={password} onChange={(e)=>setPassword(e.target.value)}
                className="w-full bg-black/50 border border-outline-variant/50 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-primary/50 transition-all text-white placeholder-gray-500"
                placeholder="Enter secure password"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button type="submit" className="w-full primary-gradient-btn py-3 rounded-lg text-lg mt-4 font-semibold text-black">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px bg-outline-variant/30 flex-1"></div>
          <span className="text-gray-500 text-sm">OR</span>
          <div className="h-px bg-outline-variant/30 flex-1"></div>
        </div>

        <button onClick={handleGoogle} className="w-full glass-button py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-white/5 transition-colors">
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>

        <p className="text-center mt-6 text-sm text-gray-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-primary hover:text-primary-dim transition-colors font-medium">
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
