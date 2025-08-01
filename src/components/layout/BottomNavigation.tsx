import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, Trophy, User, Megaphone } from 'lucide-react';

const navItems = [
  { id: 'home', icon: Home, label: 'Home', path: '/' },
  { id: 'search', icon: Search, label: 'Discover', path: '/search' },
  { id: 'recruitment', icon: Megaphone, label: 'Recruit', path: '/recruitment' },
  { id: 'matches', icon: Trophy, label: 'Matches', path: '/matches' },
  { id: 'profile', icon: User, label: 'Profile', path: '/profile' }
];

const BottomNavigation: React.FC = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background-dark/90 backdrop-blur-lg border-t border-white/10">
      <div className="flex">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-3 px-2 transition-all duration-200 ${
                isActive
                  ? 'text-primary-orange'
                  : 'text-white/60 hover:text-white/80'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`relative ${isActive ? 'scale-110' : ''} transition-transform duration-200`}>
                  <item.icon size={24} />
                  {isActive && (
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-orange rounded-full"></div>
                  )}
                </div>
                <span className={`text-xs mt-1 ${isActive ? 'font-semibold' : 'font-normal'}`}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNavigation; 