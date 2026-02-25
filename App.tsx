import React, { useState, useEffect, useRef } from 'react';
import { auth } from './services/firebase';
import { onAuthStateChanged, User, signInWithPopup, signOut } from 'firebase/auth';
import { googleProvider } from './services/firebase';
import { analyzeWasteImage } from './services/geminiService';
import { saveScanToFirestore, subscribeToUserHistory } from './services/firestoreService';
import { WasteAnalysis, HistoryItem } from './types';
import GuideCard from './components/GuideCard';

/**
 * Flutter Prototype: EcoTrackApp
 * This component mirrors the structure of a Flutter StatefulWidget.
 */
const EcoTrackApp: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WasteAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [selectedBin, setSelectedBin] = useState<any | null>(null);
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

  const onScanPressed = async () => {
    // Check for camera availability
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some(device => device.kind === 'videoinput');
      
      if (!hasCamera && !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        alert("No camera detected. Please upload an image file instead.");
      }
    } catch (err) {
      console.error("Error checking for camera:", err);
    }
    
    fileInputRef.current?.click();
  };

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

        // Timeout safety: force loading off after 10s
        const timeout = setTimeout(() => setLoading(false), 10000);

        try {
          const data = await analyzeWasteImage(base64);
          clearTimeout(timeout);
          setResult(data);
          setLoading(false);
          
          // Background save to Firestore (non-blocking)
          if (user) {
            saveScanToFirestore(user.uid, base64, data).catch(err => {
              console.error("Background save failed:", err);
            });
          }
        } catch (err: any) {
          clearTimeout(timeout);
          setError(err.message);
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (currentIndex === 2 && !location) {
      detectLocation();
    }
  }, [currentIndex]);

  const detectLocation = () => {
    setIsDetectingLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setIsDetectingLocation(false);
        },
        (error) => {
          console.error("Error detecting location:", error);
          setIsDetectingLocation(false);
        }
      );
    } else {
      setIsDetectingLocation(false);
    }
  };

  const recyclingCenters = [
    { name: 'IPC Shopping Centre RBBC', lat: 3.1578, lng: 101.6119, bins: ['Paper', 'Glass', 'Plastic', 'Metal'] },
    { name: 'PJ Eco Recycling Plaza', lat: 3.0864, lng: 101.6385, bins: ['Paper', 'Plastic', 'Metal', 'E-waste'] },
    { name: 'Cyberjaya Recycling Centre', lat: 2.9220, lng: 101.6560, bins: ['Paper', 'Glass', 'Plastic'] },
    { name: 'Subang Jaya Community RC', lat: 3.0483, lng: 101.5852, bins: ['Paper', 'Metal'] },
    { name: 'Shah Alam Recycling Centre', lat: 3.0733, lng: 101.5185, bins: ['Paper', 'Glass', 'Plastic', 'Metal'] },
    { name: 'Putrajaya RC (Precinct 9)', lat: 2.9431, lng: 101.6765, bins: ['Paper', 'Plastic', 'Metal'] },
  ];

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const sortedCenters = location 
    ? recyclingCenters
        .map(c => ({ ...c, distance: getDistance(location.lat, location.lng, c.lat, c.lng) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3)
    : [];

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
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">EcoTrack</h1>
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
        {currentIndex === 0 && (
          !image ? (
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
                <GuideCard onSelect={setSelectedBin} />
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
                {(loading && !result) && (
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
                    <div className="flex flex-col items-end gap-2">
                      <div className={`px-4 py-2 rounded-full text-[10px] font-black ${result.recyclable ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                        {result.recyclable ? 'RECYCLABLE' : 'RESIDUAL'}
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[8px] font-bold border ${
                        result.hazard_level === 'High' ? 'border-red-200 bg-red-50 text-red-700' : 
                        result.hazard_level === 'Medium' ? 'border-amber-200 bg-amber-50 text-amber-700' : 
                        'border-blue-200 bg-blue-50 text-blue-700'
                      }`}>
                        {result.hazard_level.toUpperCase()} HAZARD
                      </div>
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
          )
        )}

        {currentIndex === 1 && (
          <div className="page-transition space-y-6">
            <h2 className="text-2xl font-black text-gray-900">Scan History</h2>
            {history.length > 0 ? (
              <div className="space-y-3">
                {history.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => { setImage(item.image); setResult(item.result); setCurrentIndex(0); }}
                    className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                      <img src={item.image} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 truncate uppercase tracking-tight">{item.result.material}</h4>
                      <p className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleDateString()}</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${item.result.recyclable ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center text-gray-400">
                <i className="fas fa-history text-4xl mb-4 opacity-20"></i>
                <p>No scans yet. Start identifying waste!</p>
              </div>
            )}
          </div>
        )}

        {currentIndex === 2 && (
          <div className="page-transition space-y-8">
            <h2 className="text-2xl font-black text-gray-900">Nearby Centers</h2>
            
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800">Nearest to You</h3>
                <button 
                  onClick={detectLocation}
                  className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1"
                >
                  <i className={`fas fa-arrows-rotate ${isDetectingLocation ? 'animate-spin' : ''}`}></i>
                  Refresh
                </button>
              </div>

              {isDetectingLocation ? (
                <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-3">
                  <div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div>
                  <p className="text-xs font-bold uppercase tracking-widest">Detecting Location...</p>
                </div>
              ) : location ? (
                <div className="space-y-3">
                  {sortedCenters.map((center, i) => (
                    <div key={i} className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                            <i className="fas fa-location-dot"></i>
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 leading-tight">{center.name}</h4>
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{center.distance.toFixed(1)} KM AWAY</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {center.bins.map(bin => (
                          <span key={bin} className={`px-2 py-1 rounded-md text-[8px] font-black text-white uppercase ${
                            bin === 'Paper' ? 'bg-blue-600' : 
                            bin === 'Glass' ? 'bg-[#5d4037]' : 
                            bin === 'Plastic' || bin === 'Metal' ? 'bg-orange-500' : 
                            'bg-emerald-600'
                          }`}>
                            {bin}
                          </span>
                        ))}
                      </div>

                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(center.name)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center w-full py-3 bg-gray-50 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors gap-2"
                      >
                        <i className="fas fa-map"></i>
                        VIEW ON MAPS
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center bg-gray-50 rounded-[28px] border border-dashed border-gray-200">
                  <p className="text-sm text-gray-500 mb-4 px-8">Enable location access to find recycling centers near you.</p>
                  <button 
                    onClick={detectLocation}
                    className="bg-emerald-600 text-white px-6 py-2 rounded-full text-xs font-bold shadow-md"
                  >
                    ALLOW LOCATION
                  </button>
                </div>
              )}
            </section>

            <section className="space-y-4">
              <h3 className="font-bold text-gray-800">All Centers</h3>
              <div className="space-y-3">
                {[
                  'Subang Jaya Community Recycling Center',
                  'Petaling Jaya Waste Management Hub',
                  'Kuala Lumpur Eco-Park Collection Point',
                  'Shah Alam Green Initiative Center'
                ].map((center, i) => (
                  <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
                        <i className="fas fa-location-dot"></i>
                      </div>
                      <span className="text-sm font-medium text-gray-700">{center}</span>
                    </div>
                    <i className="fas fa-arrow-up-right-from-square text-xs text-gray-300"></i>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {currentIndex === 3 && (
          <div className="page-transition space-y-8">
            <h2 className="text-2xl font-black text-gray-900">My Profile</h2>
            {user ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4 bg-white p-6 rounded-[28px] border border-gray-100">
                  <img 
                    src={user.photoURL || ''} 
                    className="w-20 h-20 rounded-full border-4 border-emerald-50"
                  />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{user.displayName}</h3>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-600 p-6 rounded-[28px] text-white">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Total Scans</p>
                    <p className="text-4xl font-black">{history.length}</p>
                  </div>
                  <div className="bg-white p-6 rounded-[28px] border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Recycled</p>
                    <p className="text-4xl font-black text-emerald-600">
                      {history.filter(item => item.result.recyclable).length}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => signOut(auth)}
                  className="w-full py-4 rounded-2xl border-2 border-red-50 text-red-500 font-bold hover:bg-red-50 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="py-20 text-center">
                <p className="text-gray-500 mb-4">Sign in to track your recycling progress</p>
                <button 
                  onClick={() => signInWithPopup(auth, googleProvider)}
                  className="bg-[#99f6b4] text-[#00210d] px-8 py-3 rounded-full font-bold shadow-lg"
                >
                  SIGN IN
                </button>
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

      {/* Bin Detail Modal */}
      {selectedBin && (
        <div 
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300"
          onClick={() => setSelectedBin(null)}
        >
          <div 
            className="w-full max-w-lg bg-white rounded-[40px] shadow-2xl animate-in slide-in-from-bottom-full duration-500 overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
            style={{ overscrollBehavior: 'contain' }}
          >
            {/* Sticky Header */}
            <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-8 pt-8 pb-4 flex justify-between items-center border-b border-gray-50">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${selectedBin.bg} rounded-2xl flex items-center justify-center border-2 border-white shadow-sm`}>
                  <i className={`fas ${selectedBin.icon} text-xl text-gray-800`}></i>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 leading-none">{selectedBin.title}</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{selectedBin.color} Bin Guide</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedBin(null)}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-8 pt-6">
              <p className="text-gray-500 mb-8 leading-relaxed">Properly sorting your {selectedBin.title.toLowerCase()} helps Malaysia achieve its sustainability goals through the Separation at Source (SAS) policy.</p>

              <div className="grid grid-cols-1 gap-8 mb-10">
                <div className="bg-emerald-50 rounded-[32px] p-8 border border-emerald-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-md">
                      <i className="fas fa-check"></i>
                    </div>
                    <h4 className="font-black text-emerald-900 uppercase tracking-widest text-sm">Dos</h4>
                  </div>
                  <ul className="space-y-4">
                    {selectedBin.details.dos.map((doItem: string, i: number) => (
                      <li key={i} className="text-sm text-emerald-800 flex items-start gap-3 font-medium">
                        <span className="mt-2 w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"></span>
                        {doItem}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-red-50 rounded-[32px] p-8 border border-red-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white shadow-md">
                      <i className="fas fa-xmark"></i>
                    </div>
                    <h4 className="font-black text-red-900 uppercase tracking-widest text-sm">Don'ts</h4>
                  </div>
                  <ul className="space-y-4">
                    {selectedBin.details.donts.map((dontItem: string, i: number) => (
                      <li key={i} className="text-sm text-red-800 flex items-start gap-3 font-medium">
                        <span className="mt-2 w-2 h-2 rounded-full bg-red-400 flex-shrink-0"></span>
                        {dontItem}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <button 
                onClick={() => setSelectedBin(null)}
                className="w-full py-5 bg-gray-900 text-white rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-transform mb-4"
              >
                Got it, thanks!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EcoTrackApp;