import React, { useState, useEffect, useRef } from 'react';
import { auth } from './services/firebase.ts';
import { onAuthStateChanged, User, signInWithPopup, signOut } from 'firebase/auth';
import { googleProvider } from './services/firebase.ts';
import { analyzeWasteImage } from './services/geminiService.ts';
import { saveScanToFirestore, subscribeToUserHistory } from './services/firestoreService.ts';
import { WasteAnalysis, HistoryItem } from './types.ts';
import GuideCard from './components/GuideCard.tsx';

/**
 * Flutter Prototype: KitaroApp
 * This component mirrors the structure of a Flutter StatefulWidget.
 */
const KitaroApp: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WasteAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToUserHistory(user.uid, (items) => setHistory(items));
      return () => unsubscribe();
    }
  }, [user]);

  const onScanPressed = () => fileInputRef.current?.click();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setImage(base64);
        setLoading(true);
        setResult(null);
        setError(null);
        try {
          const data = await analyzeWasteImage(base64);
          setResult(data);
          if (user) await saveScanToFirestore(user.uid, base64, data);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // UI Helper: Mapping instruction to M3 Tonal Colors
  const getBinColor = (instruction: string) => {
    const i = instruction.toLowerCase();
    if (i.includes('blue') || i.includes('paper')) return 'bg-blue-600';
    if (i.includes('brown') || i.includes('glass')) return 'bg-[#5d4037]';
    if (i.includes('orange') || i.includes('plastic') || i.includes('metal')) return 'bg-orange-500';
    return 'bg-[#006d3a]';
  };

  /**
   * BUILD METHOD (Simulated)
   */
  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto bg-[#fcfdf7] shadow-2xl relative overflow-hidden">
      
      {/* AppBar Widget */}
      <header className="px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#006d3a] rounded-xl flex items-center justify-center text-white shadow-md">
            <i className="fas fa-recycle text-xl"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Kitaro</h1>
            <p className="text-[10px] font-black text-[#006d3a] uppercase tracking-widest">Prototype v1.0</p>
          </div>
        </div>
        {user ? (
          <img 
            onClick={() => signOut(auth)}
            src={user.photoURL || ''} 
            className="w-10 h-10 rounded-full border-2 border-[#99f6b4] cursor-pointer active:scale-90 transition-transform" 
            title="Sign Out"
          />
        ) : (
          <button 
            onClick={() => signInWithPopup(auth, googleProvider)}
            className="bg-[#99f6b4] text-[#00210d] px-4 py-2 rounded-full text-xs font-bold shadow-sm"
          >
            SIGN IN
          </button>
        )}
      </header>

      {/* Body Widget */}
      <main className="flex-1 px-6 pb-32 overflow-y-auto no-scrollbar">
        {!image ? (
          <div className="page-transition space-y-8">
            {/* Banner Section */}
            <div className="bg-[#e8f5e9] rounded-[28px] p-8 text-center border border-[#c8e6c9]">
              <h2 className="text-2xl font-black text-[#1b5e20] mb-2">Sustainable Malaysia</h2>
              <p className="text-sm text-[#2e7d32] font-medium leading-relaxed">
                Empowering communities with AI-driven Separation at Source (SAS) identification.
              </p>
            </div>

            {/* Dashboard Content */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800">Recycling Guide</h3>
                <i className="fas fa-chevron-right text-xs text-gray-400"></i>
              </div>
              <GuideCard />
            </section>

            {/* Recent Activity List */}
            {history.length > 0 && (
              <section className="space-y-4">
                <h3 className="font-bold text-gray-800">Recent Scans</h3>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 snap-x">
                  {history.slice(0, 5).map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => { setImage(item.image); setResult(item.result); }}
                      className="snap-start flex-shrink-0 w-32 group cursor-pointer"
                    >
                      <div className="aspect-square rounded-3xl overflow-hidden border-2 border-white shadow-md group-hover:scale-105 transition-transform">
                        <img src={item.image} className="w-full h-full object-cover" />
                      </div>
                      <p className="text-[10px] font-black mt-2 truncate text-center uppercase tracking-tighter">{item.result.material}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="page-transition space-y-6">
            <button 
              onClick={() => { setImage(null); setResult(null); setError(null); }}
              className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
            >
              <i className="fas fa-arrow-left px-2"></i>
            </button>

            {/* Preview Widget */}
            <div className="relative rounded-[32px] overflow-hidden shadow-2xl aspect-[4/5] bg-gray-200 border-4 border-white">
              <img src={image} className="w-full h-full object-cover" />
              {loading && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex flex-col items-center justify-center text-white p-8">
                  <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="font-black text-xl tracking-tighter italic uppercase">AI Thinking...</p>
                </div>
              )}
            </div>

            {/* Result Widget */}
            {result && (
              <div className="bg-white rounded-[28px] p-6 border border-gray-100 shadow-sm animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Detected</span>
                    <h3 className="text-3xl font-black text-gray-900 leading-none mt-1">{result.material}</h3>
                  </div>
                  <div className={`px-4 py-2 rounded-full text-[10px] font-black ${result.recyclable ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                    {result.recyclable ? 'RECYCLABLE' : 'RESIDUAL'}
                  </div>
                </div>

                <div className={`${getBinColor(result.instruction)} rounded-2xl p-5 text-white flex gap-4 shadow-lg ring-4 ring-white`}>
                  <i className="fas fa-location-arrow text-2xl opacity-50"></i>
                  <div>
                    <p className="text-[10px] font-black opacity-80 uppercase tracking-widest mb-1">SAS Disposal Action</p>
                    <p className="text-lg font-bold leading-tight">{result.instruction}</p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 p-6 rounded-[28px] text-center border border-red-100">
                <i className="fas fa-circle-exclamation text-2xl text-red-400 mb-2"></i>
                <p className="font-bold text-red-700">{error}</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* FloatingActionButton Widget */}
      {!image && (
        <button 
          onClick={onScanPressed}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#99f6b4] text-[#00210d] w-16 h-16 rounded-[22px] shadow-2xl flex items-center justify-center text-2xl active:scale-90 transition-transform z-50 hover:bg-[#bbf7d3]"
        >
          <i className="fas fa-camera"></i>
        </button>
      )}

      <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFile} capture="environment" />

      {/* NavigationBar Widget */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-[#f0f1eb]/90 backdrop-blur-xl border-t border-gray-100 h-20 flex items-center justify-around px-8 z-40">
        <div 
          onClick={() => setCurrentIndex(0)}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${currentIndex === 0 ? 'text-[#006d3a]' : 'text-gray-400'}`}
        >
          <div className={`px-5 py-1 rounded-full ${currentIndex === 0 ? 'bg-[#99f6b4]/50' : ''}`}>
            <i className="fas fa-house-chimney text-lg"></i>
          </div>
          <span className="text-[10px] font-bold">Home</span>
        </div>
        <div 
          onClick={() => setCurrentIndex(1)}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${currentIndex === 1 ? 'text-[#006d3a]' : 'text-gray-400'}`}
        >
          <div className={`px-5 py-1 rounded-full ${currentIndex === 1 ? 'bg-[#99f6b4]/50' : ''}`}>
            <i className="fas fa-clock-rotate-left text-lg"></i>
          </div>
          <span className="text-[10px] font-bold">History</span>
        </div>
        <div className="w-16"></div> {/* Spacer for FAB */}
        <div 
          onClick={() => setCurrentIndex(2)}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${currentIndex === 2 ? 'text-[#006d3a]' : 'text-gray-400'}`}
        >
          <div className={`px-5 py-1 rounded-full ${currentIndex === 2 ? 'bg-[#99f6b4]/50' : ''}`}>
            <i className="fas fa-location-dot text-lg"></i>
          </div>
          <span className="text-[10px] font-bold">Bins</span>
        </div>
        <div 
          onClick={() => setCurrentIndex(3)}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${currentIndex === 3 ? 'text-[#006d3a]' : 'text-gray-400'}`}
        >
          <div className={`px-5 py-1 rounded-full ${currentIndex === 3 ? 'bg-[#99f6b4]/50' : ''}`}>
            <i className="fas fa-user-gear text-lg"></i>
          </div>
          <span className="text-[10px] font-bold">Profile</span>
        </div>
      </nav>
    </div>
  );
};

export default KitaroApp;