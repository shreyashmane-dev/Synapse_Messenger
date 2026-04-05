import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { MessageSquare, Shield, Bot, Globe, Send, Ghost, Eye, EyeOff } from 'lucide-react';
import { HeroSphere } from '../components/canvas/HeroSphere'; // Continue leveraging 3D engine

export default function FloatingLandingPage() {
  const { scrollYProgress, scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
     const unsub = scrollY.on('change', (v) => setIsScrolled(v > 50));
     return () => unsub();
  }, [scrollY]);
  
  // Parallax mappings
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -300]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -600]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, -150]);
  
  const opacityFade = useTransform(scrollYProgress, [0, 0.2, 0.4], [1, 0.5, 0]);

  // Privacy Toggle State
  const [isAnonymous, setIsAnonymous] = useState(false);

  // AI Demo State
  const [demoInput, setDemoInput] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiOutput, setAiOutput] = useState('');

  const submitDemoAi = (e) => {
      e.preventDefault();
      if (!demoInput.trim()) return;
      setIsAiProcessing(true);
      setTimeout(() => {
          setAiOutput("I've securely synthesized your request. Deployment is ready.");
          setIsAiProcessing(false);
      }, 1500);
  };

  return (
    <div className="h-screen bg-surface text-white font-sans overflow-y-auto overflow-x-hidden relative selection:bg-primary/30 snap-y snap-mandatory scroll-smooth custom-scrollbar">
       
       {/* Deep Space Background Effects */}
       <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 rounded-full bg-primary/10 blur-[200px]"></div>
          <div className="absolute bottom-1/4 right-1/4 w-1/2 h-1/2 rounded-full bg-secondary/10 blur-[200px]"></div>
          {/* Subtle Grid */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')]"></div>
       </div>

       {/* Persistent 3D Core Layer */}
       <div className="fixed inset-0 z-0 flex items-center justify-center opacity-60 pointer-events-none mix-blend-screen scale-125">
          <Canvas>
             <HeroSphere />
          </Canvas>
       </div>

       {/* Top Navbar - Floating Pill */}
       <div className="fixed top-8 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <nav className={`pointer-events-auto flex items-center gap-8 px-8 py-3 rounded-2xl transition-all duration-700 border border-white/5 shadow-2xl ${isScrolled ? 'bg-surface/60 backdrop-blur-3xl w-[90%] md:w-auto scale-100 shadow-[0_20px_50px_rgba(0,0,0,0.5)]' : 'bg-white/5 backdrop-blur-xl w-[95%] md:w-auto scale-95'}`}>
             <div className="flex items-center gap-3 pr-6 border-r border-white/10">
                <img src="/logo.png" alt="S" className="w-10 h-10 rounded-xl" />
                <span className="hidden sm:block font-display font-black tracking-widest text-sm text-white">SYNAPSE</span>
             </div>
             
             <div className="hidden md:flex items-center gap-8 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                <a href="#ai" className="hover:text-primary transition-colors cursor-pointer">Intelligence</a>
                <a href="#features" className="hover:text-primary transition-colors cursor-pointer">Topology</a>
                <a href="#privacy" className="hover:text-primary transition-colors cursor-pointer">Anonymity</a>
             </div>
             
             <div className="pl-6 border-l border-white/10">
                <Link to="/auth" className="px-6 py-2 bg-primary text-black rounded-xl font-black text-xs transition-all hover:scale-110 active:scale-95 shadow-[0_0_20px_rgba(188,19,254,0.3)] whitespace-nowrap">
                   Access Node
                </Link>
             </div>
          </nav>
       </div>

       {/* SCROLLABLE INTERFACE LAYERS */}
       <main className="relative z-10 w-full h-full">

          {/* 1. HERO - Center Floating Matrix */}
          <section className="h-screen w-full flex items-center justify-center sticky top-0 snap-start shrink-0">
             <motion.div style={{ opacity: opacityFade }} className="text-center z-20">
                <h1 className="text-6xl md:text-8xl font-display font-black tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500 drop-shadow-2xl">
                   Conversations,<br/>Reinvented.
                </h1>
                <p className="text-xl text-primary/80 font-medium tracking-wide">Scroll into the architecture.</p>
             </motion.div>

             {/* Floating Abstract UI Nodes visible explicitly in Hero bounds */}
             <motion.div style={{ y: y1 }} className="absolute top-[20%] left-[10%] w-64 bg-surface-container/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-xl hidden md:block">
                <div className="flex items-center gap-3 mb-3">
                   <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30"><Shield size={14}/></div>
                   <div className="text-xs font-bold text-gray-300">End-to-End Handshake Complete</div>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden"><div className="w-3/4 h-full bg-blue-400 rounded-full"></div></div>
             </motion.div>

             <motion.div style={{ y: y2 }} className="absolute bottom-[20%] right-[10%] w-72 bg-gradient-to-br from-primary/10 to-transparent backdrop-blur-xl border border-primary/20 rounded-3xl p-5 shadow-[0_0_40px_rgba(188,19,254,0.2)] hidden md:block">
                <div className="flex items-start gap-4">
                   <div className="w-10 h-10 rounded-full bg-primary/20 shrink-0" />
                   <div>
                      <div className="w-20 h-2 bg-white/20 rounded-full mb-2"></div>
                      <div className="w-32 h-2 bg-white/10 rounded-full"></div>
                   </div>
                </div>
             </motion.div>
          </section>

          {/* 2. THE AI INTELLIGENCE LAYER */}
          <section id="ai" className="h-screen w-full flex items-center justify-center relative z-30 snap-start shrink-0">
             <motion.div 
               initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }}
               className="w-full max-w-2xl bg-surface-container-high/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative"
             >
                <div className="absolute -top-12 -left-12 w-24 h-24 bg-secondary/20 blur-[40px] rounded-full"></div>
                <h3 className="text-2xl font-display font-bold mb-8 flex items-center gap-3">
                   <div className="p-2 bg-secondary/20 text-secondary rounded-xl"><Bot size={24}/></div>
                   Embedded Intelligence Layer
                </h3>
                
                <div className="space-y-6">
                   <div className="bg-black/40 border border-white/5 rounded-2xl p-5">
                      <form onSubmit={submitDemoAi} className="flex gap-3">
                         <input type="text" value={demoInput} onChange={(e)=>setDemoInput(e.target.value)} disabled={isAiProcessing} placeholder="e.g., Translate intent into a request..." className="flex-1 bg-transparent text-white focus:outline-none text-lg placeholder-gray-600"/>
                         <button type="submit" className="p-3 bg-secondary hover:bg-secondary/80 text-black rounded-xl transition-colors"><Send size={20}/></button>
                      </form>
                   </div>
                   
                   <div className="flex flex-col gap-3 min-h-[80px]">
                      {isAiProcessing && (
                         <div className="self-start px-5 py-3 bg-secondary/10 border border-secondary/20 text-secondary rounded-2xl rounded-tl-sm animate-pulse flex gap-2">
                           Processing Context <div className="w-4 flex flex-col justify-end gap-1"><div className="h-1 bg-secondary rounded-full"></div></div>
                         </div>
                      )}
                      {aiOutput && !isAiProcessing && (
                         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="self-start px-5 py-4 bg-surface-container border border-outline-variant/30 text-gray-200 rounded-2xl rounded-tl-sm shadow-lg max-w-[80%]">
                           {aiOutput}
                         </motion.div>
                      )}
                   </div>
                </div>
             </motion.div>
          </section>

          {/* 3. COMMUNITY NETWORK VISUAL */}
          <section id="features" className="h-screen w-full flex items-center justify-center relative overflow-hidden z-20 snap-start shrink-0">
             <div className="absolute inset-0 flex items-center justify-center">
                <svg width="100%" height="100%" className="opacity-20 drop-shadow-[0_0_15px_rgba(188,19,254,0.5)]">
                   <motion.path d="M 100,500 Q 400,100 800,500 T 1500,500" stroke="url(#grad1)" strokeWidth="3" fill="transparent"
                      initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} transition={{ duration: 2, ease: "easeInOut" }} viewport={{ once: true }} />
                   <motion.path d="M 200,800 Q 600,400 1000,800 T 1800,700" stroke="url(#grad2)" strokeWidth="2" fill="transparent"
                      initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} transition={{ duration: 2.5, ease: "easeInOut", delay: 0.5 }} viewport={{ once: true }} />
                   
                   <defs>
                      <linearGradient id="grad1"><stop offset="0%" stopColor="#bc13fe" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient>
                      <linearGradient id="grad2"><stop offset="0%" stopColor="#bc13fe" /><stop offset="100%" stopColor="transparent" /></linearGradient>
                   </defs>
                </svg>
             </div>
             
             <motion.div initial={{ scale: 0 }} whileInView={{ scale: 1 }} transition={{ type: 'spring', delay: 1 }} className="absolute z-10 w-32 h-32 bg-surface-container rounded-full border border-primary/40 flex items-center justify-center shadow-[0_0_50px_rgba(188,19,254,0.3)]">
                <Globe size={40} className="text-primary"/>
             </motion.div>
             <motion.div style={{ y: y3 }} className="absolute z-10 -ml-64 mt-32 w-24 h-24 bg-surface-container rounded-full border border-blue-500/40 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)] text-blue-400 font-bold">Node 1</motion.div>
             <motion.div style={{ y: y1 }} className="absolute z-10 ml-80 -mt-20 w-28 h-28 bg-surface-container rounded-full border border-secondary/40 flex items-center justify-center shadow-[0_0_40px_rgba(188,19,254,0.3)] text-secondary font-bold text-center leading-tight">Synapse<br/>Core</motion.div>
             
             <div className="absolute bottom-20 text-center pointer-events-auto">
                <h3 className="text-3xl font-display font-bold">Unbound Topology.</h3>
                <p className="text-gray-400 mt-2">Map relationships without rigid architectures.</p>
             </div>
          </section>

          {/* 4. PRIVACY EXPERIENCE LAYER */}
          <section id="privacy" className="h-screen w-full flex items-center justify-center relative z-30 snap-start shrink-0">
             <div className="w-full max-w-sm">
                <div className="text-center mb-10">
                   <h3 className="text-3xl font-display font-bold mb-3">Absolute Anonymity.</h3>
                   <p className="text-gray-400 text-sm">Disrupt metadata tracking instantly.</p>
                </div>

                <motion.div 
                   animate={{ scale: isAnonymous ? 0.95 : 1, y: isAnonymous ? 5 : 0 }}
                   className={`p-6 rounded-3xl border backdrop-blur-xl shadow-2xl transition-all duration-500 ${isAnonymous ? 'bg-primary/5 border-primary/30' : 'bg-surface-container-low border-white/10'}`}
                >
                   <div className="flex items-center gap-5 border-b border-white/10 pb-6 mb-6">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 ${isAnonymous ? 'bg-primary border-transparent' : 'bg-white/10 border-2 border-white/20'}`}>
                         {isAnonymous ? <Ghost size={30} className="text-black" /> : <div className="text-2xl font-bold uppercase text-gray-300">UX</div>}
                      </div>
                      <div className="flex-1">
                         <div className={`text-lg font-bold transition-all duration-500 ${isAnonymous ? 'text-primary blur-sm' : 'text-white'}`}>
                            {isAnonymous ? 'Ghost_#591204' : 'John Doe'}
                         </div>
                         <div className={`text-xs mt-1 transition-all duration-500 ${isAnonymous ? 'text-primary/50' : 'text-gray-500'}`}>
                            Connection Active
                         </div>
                      </div>
                   </div>

                   <button 
                      onClick={() => setIsAnonymous(!isAnonymous)}
                      className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold transition-all duration-300 ${isAnonymous ? 'bg-surface border border-primary/20 text-primary hover:bg-white/5' : 'bg-primary hover:bg-primary-dim text-black'}`}
                   >
                      {isAnonymous ? <><Eye size={18}/> Restore Identity</> : <><EyeOff size={18}/> Engage Ghost Mode</>}
                   </button>
                </motion.div>
             </div>
          </section>

          {/* 5. FINAL TERMINAL / CTA */}
          <section className="h-screen w-full flex items-center justify-center relative z-30 snap-start shrink-0">
             <div className="text-center">
                <motion.h2 
                   initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }}
                   className="text-5xl md:text-7xl font-display font-black mb-12 tracking-tight text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                >
                   Start talking differently.
                </motion.h2>

                <Link to="/auth" className="relative group inline-block">
                   <div className="absolute inset-0 bg-primary/40 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                   <div className="relative z-10 px-12 py-5 bg-white text-black font-extrabold text-xl tracking-widest rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                      Enter Synapse
                   </div>
                </Link>
             </div>
          </section>

       </main>
    </div>
  );
}
