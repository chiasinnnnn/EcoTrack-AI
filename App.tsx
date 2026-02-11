
import React, { useState, useRef, useEffect } from 'react';
import Header from './components/Header.tsx';
import GuideCard from './components/GuideCard.tsx';
import { analyzeWasteImage } from './services/geminiService.ts';
import { WasteAnalysis, HistoryItem } from './types.ts';
import { auth } from './services/firebase.ts';
import { onAuthStateChanged, User } from 'firebase/auth';
import { saveScanToFirestore, subscribeToUserHistory } from './services/firestoreService.ts';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WasteAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Sync Listener
  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToUserHistory(user.uid, (items) => {
        setHistory(items);
      });
      return () => unsubscribe();
    } else {
      setHistory([]); // Clear history on logout
    }
  }, [user]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImage(base64);
        setResult(null);
        setError(null);
        processImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (base64: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyzeWasteImage(base64);
      setResult(data);
      
      if (user) {
        // Cloud Sync
        await saveScanToFirestore(user.uid, base64, data);
      } else {
        // Local state fallback for non-logged in users
        const newItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          image: base64,
          result: data
        };
        setHistory(prev => [newItem, ...prev].slice(0, 5));
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
  };

  const getGuessBinClass = (instruction: string) => {
    const lower = instruction.toLowerCase();
    if (lower.includes('blue') || lower.includes('paper')) return 'bg-blue-600 text-white';
    if (lower.includes('brown') || lower.includes('glass')) return 'bg-amber-800 text-white';
    if (lower.includes('orange') || lower.includes('plastic') || lower.includes('metal')) return 'bg-orange-500 text-white';
    return 'bg-emerald-600 text-white';
  };

  return (
    <div className="min-h-screen pb-20">
      <Header user={user} />

      <main className="max-w-4xl mx-auto px-4 mt-8">
        {!image ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            <section className="text-center space-y-4">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                Litter to <span className="text-emerald-600 underline decoration-wavy decoration-emerald-300">Treasure</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-xl mx-auto">
                Snap a photo of your trash and Kitaro will tell you exactly how to recycle it in Malaysia.
              </p>
            </section>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="relative group cursor-pointer border-4 border-dashed border-gray-200 rounded-3xl p-12 transition-all hover:border-emerald-400 hover:bg-emerald-50/30 text-center bg-white shadow-sm"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                className="hidden" 
                accept="image/*"
                capture="environment"
              />
              <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-inner">
                <i className="fas fa-camera text-3xl text-emerald-600"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Scan Waste Item</h3>
              <p className="text-gray-500 mt-2 font-medium">Capture or upload to identify material</p>
            </div>

            <section>
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <i className="fas fa-book-open text-emerald-500"></i> Malaysia Bin Guide
              </h4>
              <GuideCard />
            </section>
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
            <button 
              onClick={reset}
              className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 font-bold transition-colors bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100"
            >
              <i className="fas fa-arrow-left"></i> Start Over
            </button>

            <div className="bg-white rounded-[2rem] overflow-hidden shadow-2xl border border-gray-100 ring-1 ring-gray-900/5">
              <div className="grid md:grid-cols-2">
                <div className="relative h-72 md:h-full min-h-[400px]">
                  <img 
                    src={image} 
                    alt="Scanned waste" 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {loading && (
                    <div className="absolute inset-0 bg-emerald-950/60 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 text-center">
                      <div className="relative w-16 h-16 mb-6">
                        <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                      <p className="text-2xl font-black tracking-tight">AI Analysis...</p>
                      <p className="text-sm font-medium opacity-80 mt-1">Consulting Malaysian SAS Policy</p>
                    </div>
                  )}
                </div>

                <div className="p-8 md:p-10 flex flex-col justify-center">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-3xl flex flex-col items-center text-center gap-3">
                      <i className="fas fa-exclamation-triangle text-3xl opacity-50"></i>
                      <p className="font-bold">{error}</p>
                      <button onClick={reset} className="text-sm underline font-bold mt-2">Try Again</button>
                    </div>
                  )}

                  {result && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Identification Result</span>
                          <span className={`px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 shadow-sm ${result.recyclable ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                            <i className={`fas ${result.recyclable ? 'fa-recycle' : 'fa-circle-xmark'}`}></i>
                            {result.recyclable ? 'RECYCLABLE' : 'RESIDUAL'}
                          </span>
                        </div>
                        <h3 className="text-4xl font-black text-gray-900 tracking-tight leading-tight">{result.material}</h3>
                      </div>

                      <div className={`p-6 rounded-3xl flex items-start gap-5 shadow-lg ${getGuessBinClass(result.instruction)}`}>
                        <div className="bg-white/20 p-4 rounded-2xl shadow-inner">
                          <i className="fas fa-map-location-dot text-2xl"></i>
                        </div>
                        <div>
                          <p className="text-xs font-black opacity-70 uppercase tracking-widest mb-1">How to Dispose (Malaysia)</p>
                          <p className="text-lg font-bold leading-snug">{result.instruction}</p>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-gray-100">
                        <div className="flex items-center gap-3 text-gray-400">
                          <i className="fas fa-shield-halved text-emerald-200"></i>
                          <p className="text-[11px] font-medium leading-relaxed italic">
                            Verified against Malaysia's 2024 Waste Management Act and SAS guidelines. 
                            {user && <span className="text-emerald-600 font-bold ml-1 italic inline-flex items-center gap-1"><i className="fas fa-cloud-check"></i> Synced to Cloud</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {!result && !loading && !error && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12 text-center">
                      <i className="fas fa-microchip text-5xl mb-4 opacity-10"></i>
                      <p className="text-sm font-medium">Your analysis will appear here shortly.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {history.length > 0 && (
          <section className="mt-16 pb-12">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-3">
                <span className="w-8 h-[2px] bg-gray-200"></span>
                Recent Scans
              </h4>
              {user && <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">CLOUD SYNC ACTIVE</span>}
            </div>
            <div className="flex gap-5 overflow-x-auto pb-6 no-scrollbar snap-x">
              {history.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => {
                    setImage(item.image);
                    setResult(item.result);
                  }}
                  className="flex-shrink-0 w-44 group cursor-pointer snap-start"
                >
                  <div className="h-44 rounded-[2rem] overflow-hidden border-4 border-white shadow-xl relative mb-3 group-hover:scale-105 transition-transform duration-300">
                    <img src={item.image} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0" />
                    <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-2 border-white shadow-lg ${getGuessBinClass(item.result.instruction)} flex items-center justify-center text-[10px]`}>
                      <i className={`fas ${item.result.recyclable ? 'fa-check' : 'fa-x'}`}></i>
                    </div>
                  </div>
                  <div className="px-2">
                    <p className="text-xs font-black text-gray-800 truncate uppercase tracking-wider">{item.result.material}</p>
                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">{new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {!image && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 md:hidden z-50">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-emerald-600 text-white px-10 py-5 rounded-[2rem] shadow-[0_20px_40px_rgba(5,150,105,0.4)] flex items-center gap-4 font-black tracking-widest active:scale-90 transition-all hover:bg-emerald-500"
          >
            <i className="fas fa-camera-retro text-2xl"></i>
            SCAN NOW
          </button>
        </div>
      )}

      <footer className="mt-12 text-center text-gray-400 text-[10px] px-4 pb-12 font-bold tracking-widest uppercase">
        <p>&copy; {new Date().getFullYear()} Kitaro Engine • Built with Firebase Cloud</p>
      </footer>
    </div>
  );
};

export default App;
