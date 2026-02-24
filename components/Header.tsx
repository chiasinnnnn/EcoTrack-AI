
import React from 'react';
import { auth, googleProvider } from '../services/firebase';
import { signInWithPopup, signOut, User } from 'firebase/auth';

interface HeaderProps {
  user: User | null;
}

const Header: React.FC<HeaderProps> = ({ user }) => {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-600 p-2 rounded-xl text-white">
            <i className="fas fa-recycle text-xl"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-none">Kitaro</h1>
            <p className="text-xs text-emerald-600 font-medium tracking-wide uppercase">Malaysia SAS AI</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={handleLogout}
                className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-tighter"
              >
                Sign Out
              </button>
              <img 
                src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                alt="Profile" 
                className="w-9 h-9 rounded-full border-2 border-emerald-100 shadow-sm"
              />
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-colors flex items-center gap-2"
            >
              <i className="fab fa-google"></i>
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
