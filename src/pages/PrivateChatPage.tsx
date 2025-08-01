import React, { useState, useEffect } from 'react';
import PrivateChat from '../components/messages/PrivateChat';
import { auth } from '../lib/supabase';

const PrivateChatPage: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Mobile viewport fix for conversation page
  useEffect(() => {
    // Ensure proper viewport on mobile devices
    const handleViewportFix = () => {
      if (window.innerWidth <= 768) {
        // Reset any potential zoom issues
        window.scrollTo(0, 0);
        
        // Ensure viewport is properly set
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
        }
      }
    };

    handleViewportFix();
    
    // Handle orientation changes
    const handleOrientationChange = () => {
      setTimeout(handleViewportFix, 100);
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { user } = await auth.getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error getting current user:', error);
      } finally {
        setLoading(false);
      }
    };

    getCurrentUser();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-orange"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background-dark overflow-hidden">
      <PrivateChat currentUser={currentUser} />
    </div>
  );
};

export default PrivateChatPage; 