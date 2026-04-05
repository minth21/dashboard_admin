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
import TeacherClasses from './pages/TeacherClasses';
import ClassManagement from './pages/ClassManagement';
import Profile from './pages/Profile';
import ComplaintManagement from './pages/ComplaintManagement';
import ClassFeedbackManagement from './pages/ClassFeedbackManagement';
import LoadingScreen from './components/LoadingScreen';
import { ThemeProvider, useTheme } from './hooks/useThemeContext';
import { theme as antdTheme } from 'antd'; // Import theme from antd for algorithm selection

const AppContent = ({ loading, isExiting }: { loading: boolean, isExiting: boolean }) => {
  const { theme } = useTheme();
  
  const isDark = theme === 'dark';

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#3B82F6', 
          colorPrimaryHover: '#2563EB',
          colorBgLayout: isDark ? '#0F172A' : '#F8FAFC', 
          colorBgContainer: isDark ? '#1E293B' : '#FFFFFF',
          colorText: isDark ? '#F1F5F9' : '#0F172A', 
          colorTextSecondary: isDark ? '#94A3B8' : '#475569',
          colorBorder: isDark ? '#334155' : '#E2E8F0',
          borderRadius: 20, 
          boxShadow: isDark 
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 20px 25px -5px rgba(0, 0, 0, 0.3)' 
            : '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 20px 25px -5px rgba(0, 0, 0, 0.02)',
        },
        components: {
          Card: {
            boxShadowTertiary: isDark
              ? '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3)'
              : '0 10px 15px -3px rgba(30, 64, 175, 0.05), 0 4px 6px -4px rgba(30, 64, 175, 0.03)',
          },
          Button: {
            controlHeight: 44,
            fontWeight: 700,
            borderRadius: 12,
          },
          Layout: {
            headerBg: isDark ? '#1E293B' : 'rgba(255, 255, 255, 0.8)',
            siderBg: isDark ? '#1E293B' : '#FFFFFF',
          },
          Menu: {
            itemBg: 'transparent',
            itemColor: isDark ? '#94A3B8' : '#475569',
            itemSelectedColor: '#3B82F6',
            itemHoverColor: '#3B82F6',
          }
        }
      }}
    >
      {loading && <LoadingScreen isExiting={isExiting} />}

      <div style={{
        opacity: loading ? 0 : 1,
        transition: 'opacity 1s ease-in-out',
        visibility: loading ? 'hidden' : 'visible',
        background: isDark ? '#0F172A' : '#F8FAFC',
        minHeight: '100vh'
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
              <Route path="/classes" element={<ClassManagement />} />
              <Route path="/teacher/classes" element={<TeacherClasses />} />
              <Route path="/exam-bank" element={<ExamBank />} />
              <Route path="/exam-bank/:testId" element={<TestDetail />} />
              <Route path="/exam-bank/:testId/parts/:partId" element={<PartDetail />} />
              <Route path="/complaints" element={<ComplaintManagement />} />
              <Route path="/class-feedback" element={<ClassFeedbackManagement />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </div>
    </ConfigProvider>
  );
};

function App() {
  const [loading, setLoading] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(() => {
    const userData = localStorage.getItem('admin_user');
    return userData ? JSON.parse(userData).id : undefined;
  });

  useEffect(() => {
    const handleUserChange = () => {
      const userData = localStorage.getItem('admin_user');
      setUserId(userData ? JSON.parse(userData).id : undefined);
    };

    window.addEventListener('storage', handleUserChange);
    window.addEventListener('user-login', handleUserChange);

    return () => {
      window.removeEventListener('storage', handleUserChange);
      window.removeEventListener('user-login', handleUserChange);
    };
  }, []);

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
        window.dispatchEvent(new Event('user-login'));

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
    <ThemeProvider userId={userId} key={userId || 'guest'}>
      <AppContent loading={loading} isExiting={isExiting} />
    </ThemeProvider>
  );
}

export default App;
