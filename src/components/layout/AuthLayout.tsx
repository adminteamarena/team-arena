import { FC } from 'react';
import { Outlet } from 'react-router-dom';
import Logo from '../ui/Logo';

const AuthLayout: FC = () => {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-orange via-primary-pink to-secondary-purple relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full animate-pulse"></div>
          <div className="absolute top-40 right-32 w-24 h-24 bg-white/10 rounded-full animate-bounce"></div>
          <div className="absolute bottom-32 left-32 w-40 h-40 bg-white/10 rounded-full animate-ping"></div>
          <div className="absolute bottom-20 right-20 w-28 h-28 bg-white/10 rounded-full animate-pulse"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12">
          <div className="text-center max-w-md">
            <Logo size="lg" showTagline={true} />
            <h1 className="text-4xl font-bold mt-8 mb-4">
              Where Champions Connect
            </h1>
            <p className="text-xl text-white/80 leading-relaxed">
              Join the ultimate sports community. Share your victories, connect with fellow athletes, and build your legacy in Team Arena.
            </p>
            
            {/* Feature Highlights */}
            <div className="mt-12 space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🏆</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Track Achievements</h3>
                  <p className="text-white/70">Celebrate your wins and milestones</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">👥</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Build Teams</h3>
                  <p className="text-white/70">Connect with like-minded athletes</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📈</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Share Progress</h3>
                  <p className="text-white/70">Document your journey to greatness</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Forms */}
      <div className="w-full lg:w-1/2 bg-background-dark flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>

      {/* Mobile Branding */}
      <div className="lg:hidden absolute top-4 left-4 z-20">
        <Logo size="sm" showTagline={false} />
      </div>
    </div>
  );
};

export default AuthLayout; 