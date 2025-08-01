import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import TopNavigation from './TopNavigation';
import BottomNavigation from './BottomNavigation';
import SideNavigation from './SideNavigation';
import ErrorBoundary from '../ErrorBoundary';
import { useUI } from '../../context/UIContext';

const MainLayout: React.FC = () => {
  const location = useLocation();
  const { isHeaderVisible } = useUI();
  
  // Hide bottom navigation on private chat pages
  const isPrivateChat = location.pathname.startsWith('/messages/') && location.pathname !== '/messages';
  
  return (
    <div className="min-h-screen bg-background-dark overflow-x-hidden">
      {/* Top Navigation - Conditionally visible */}
      {isHeaderVisible && <TopNavigation />}
      
      {/* Main Content Area */}
      <div className="flex w-full max-w-full overflow-x-hidden">
        {/* Side Navigation - Hidden on mobile */}
        <SideNavigation />
        
        {/* Main Content */}
        <main className={`flex-1 adaptive-container ${isPrivateChat ? 'pb-0' : 'pb-24'} md:pb-0 md:ml-64`}>
          <div className={`adaptive-content ${isPrivateChat ? 'px-0 py-0' : 'px-4 py-6'}`}>
            <ErrorBoundary
              resetKeys={[location.pathname]}
              maxRetries={3}
              showErrorDetails={process.env.NODE_ENV === 'development'}
            >
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
      
      {/* Bottom Navigation - Mobile only, hidden on private chat */}
      {!isPrivateChat && <BottomNavigation />}
    </div>
  );
};

export default MainLayout; 