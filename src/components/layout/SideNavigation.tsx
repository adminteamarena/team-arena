import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, Trophy, User, Megaphone, LogOut } from 'lucide-react';
import { auth } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

const navItems = [
  { id: 'home', icon: Home, label: 'Home', path: '/' },
  { id: 'search', icon: Search, label: 'Discover', path: '/search' },
  { id: 'recruitment', icon: Megaphone, label: 'Recruit', path: '/recruitment' },
  { id: 'matches', icon: Trophy, label: 'Matches', path: '/matches' },
  { id: 'profile', icon: User, label: 'Profile', path: '/profile' }
];

const SideNavigation: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/auth/login');
  };

  return (
    <nav className="hidden md:flex fixed left-0 top-16 bottom-0 w-64 bg-background-dark/50 backdrop-blur-lg border-r border-white/10 flex-col">
      <div className="flex-1 p-6">
        <div className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-primary-orange/20 to-primary-pink/20 text-primary-orange border border-primary-orange/30'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={24} className={isActive ? 'text-primary-orange' : ''} />
                  <span className={`font-medium ${isActive ? 'text-primary-orange' : ''}`}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
      
      {/* Logout Button */}
      <div className="p-6 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 px-4 py-3 w-full text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200"
        >
          <LogOut size={24} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default SideNavigation; 