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

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Show loading screen for 2 seconds
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Show loading screen while loading
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#2563EB',
          colorPrimaryHover: '#1D4ED8',
          colorBgLayout: '#F8FAFC',
          colorBgContainer: '#FFFFFF',
          colorText: '#0F172A',
          colorTextSecondary: '#64748B',
          colorBorder: '#E2E8F0',
          colorSuccess: '#16A34A',
          colorWarning: '#F59E0B',
          colorError: '#DC2626',
          borderRadius: 8,
        },
      }}
    >
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
    </ConfigProvider>
  );
}

export default App;
