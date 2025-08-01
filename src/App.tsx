import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoadingSpinner from './components/ui/LoadingSpinner';
import { CityProvider } from './context/CityContext';
import { LoadingProvider } from './context/LoadingContext';
import { UIProvider } from './context/UIContext';
import PageLoader, { TopProgressBar } from './components/ui/PageLoader';
import { useLoading } from './context/LoadingContext';

// Lazy load components
const AuthLayout = lazy(() => import('./components/layout/AuthLayout'));
const MainLayout = lazy(() => import('./components/layout/MainLayout'));
const ProtectedRoute = lazy(() => import('./components/auth/ProtectedRoute'));
const Login = lazy(() => import('./pages/auth/Login'));
const SignUp = lazy(() => import('./pages/auth/SignUp'));
const Home = lazy(() => import('./pages/Home'));
const Search = lazy(() => import('./pages/Search'));
const Recruitment = lazy(() => import('./pages/Recruitment'));
const Matches = lazy(() => import('./pages/Matches'));
const CreateMatch = lazy(() => import('./pages/CreateMatch'));
const Profile = lazy(() => import('./pages/Profile'));
const Messages = lazy(() => import('./pages/Messages'));
const PrivateChatPage = lazy(() => import('./pages/PrivateChatPage'));
const MatchChatPage = lazy(() => import('./pages/MatchChatPage'));

const AppContent: React.FC = () => {
  const { globalLoading } = useLoading();

  return (
    <>
      <TopProgressBar 
        isLoading={globalLoading.isLoading} 
        progress={globalLoading.progress} 
      />
      <PageLoader 
        isLoading={globalLoading.isLoading}
        text={globalLoading.text}
        progress={globalLoading.progress}
      />
      <Router>
        <div className="App w-full max-w-full overflow-x-hidden">
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-background-dark">
              <LoadingSpinner size="lg" text="Loading..." />
            </div>
          }>
            <Routes>
          {/* Auth Routes */}
          <Route path="/auth" element={<AuthLayout />}>
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<SignUp />} />
          </Route>
          
          {/* Redirect old auth paths */}
          <Route path="/login" element={<Navigate to="/auth/login" replace />} />
          <Route path="/signup" element={<Navigate to="/auth/signup" replace />} />
          
          {/* Chat Routes - No MainLayout to hide top nav */}
          <Route
            path="/matches/:matchId/chat"
            element={
              <ProtectedRoute>
                <MatchChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages/:conversationId"
            element={
              <ProtectedRoute>
                <PrivateChatPage />
              </ProtectedRoute>
            }
          />
          
          {/* Protected Routes with Main Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Home />} />
            <Route path="search" element={<Search />} />
            <Route path="recruitment" element={<Recruitment />} />
            <Route path="matches" element={<Matches />} />
            <Route path="create-match" element={<CreateMatch />} />
            <Route path="matches/modify/:matchId" element={<CreateMatch />} />
            <Route path="messages" element={<Messages />} />
            <Route path="profile" element={<Profile />} />
            <Route path="profile/:userId" element={<Profile />} />
          </Route>
          
          {/* Legacy dashboard redirect */}
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/auth/login" replace />} />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </>
  );
};

function App() {
  return (
    <LoadingProvider>
      <CityProvider>
        <UIProvider>
          <AppContent />
        </UIProvider>
      </CityProvider>
    </LoadingProvider>
  );
}

export default App;
