import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Overview from './pages/Overview';
import UserManagement from './pages/UserManagement';
import ExamBank from './pages/ExamBank';
import TestDetail from './pages/TestDetail';
import PartDetail from './pages/PartDetail';
import LoadingScreen from './components/LoadingScreen';
///test commit
function App() {
  const [loading, setLoading] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Show loading screen for 5 seconds
    const timer = setTimeout(() => {
      setIsExiting(true);
      // Wait for exit animation to finish
      setTimeout(() => {
        setLoading(false);
      }, 600);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Inactivity Auto-Logout
  useEffect(() => {
    let inactivityTimer: any;

    const resetInactivityTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);

      // 5 minutes = 300,000ms
      inactivityTimer = setTimeout(() => {
        handleAutoLogout();
      }, 300000);
    };

    const handleAutoLogout = () => {
      const token = localStorage.getItem('admin_token');
      if (token) {
        // Clear session
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');

        // Trigger loading screen for 5 seconds before going back to login
        setIsExiting(false);
        setLoading(true);

        setTimeout(() => {
          setIsExiting(true);
          setTimeout(() => {
            setLoading(false);
            window.location.href = '/login';
          }, 600);
        }, 5000); // 5 seconds loading as requested
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const token = localStorage.getItem('admin_token');
        if (token) {
          handleAutoLogout();
        }
      }
    };

    // Events to track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    // Only track if logged in
    const token = localStorage.getItem('admin_token');
    if (token) {
      events.forEach(event => {
        window.addEventListener(event, resetInactivityTimer);
      });
      window.addEventListener('visibilitychange', handleVisibilityChange);
      resetInactivityTimer();
    }

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      events.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer);
      });
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Show loading screen while loading
  if (loading) {
    return <LoadingScreen isExiting={isExiting} />;
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1E40AF', // Blue 800 - Premium Blue
          colorPrimaryHover: '#1D4ED8', // Blue 700
          colorBgLayout: '#F8FAFC', // Slate 50 - Cleaner background
          colorBgContainer: '#FFFFFF',
          colorText: '#0F172A', // Slate 900 - Better readability
          colorTextSecondary: '#475569', // Slate 600
          colorBorder: '#E2E8F0', // Slate 200 - Softer borders
          colorSuccess: '#10B981',
          colorWarning: '#F59E0B',
          colorError: '#EF4444',
          borderRadius: 16, // More modern generous rounding
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 20px 25px -5px rgba(0, 0, 0, 0.02)',
        },
        components: {
          Card: {
            boxShadowTertiary: '0 10px 15px -3px rgba(30, 64, 175, 0.05), 0 4px 6px -4px rgba(30, 64, 175, 0.03)',
          },
          Button: {
            controlHeight: 44,
            fontWeight: 700,
            borderRadius: 12,
          }
        }
      }}
    >
      {loading && <LoadingScreen isExiting={isExiting} />}

      <div style={{
        opacity: loading ? 0 : 1,
        transition: 'opacity 1s ease-in-out',
        visibility: loading ? 'hidden' : 'visible'
      }}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Dashboard Layout Routes */}
            <Route element={<Dashboard />}>
              {/* Redirect / to /dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              <Route path="/dashboard" element={<Overview />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/exam-bank" element={<ExamBank />} />
              <Route path="/exam-bank/:testId" element={<TestDetail />} />
              <Route path="/exam-bank/:testId/parts/:partId" element={<PartDetail />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </div>
    </ConfigProvider>
  );
}

export default App;
