import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/Layout';
import {
  Dashboard,
  Members,
  Tasks,
  Weeks,
  Evaluations,
  MyEvaluations,
  Statistics,
  WeeklyReports,
  Achievements,
  Login,
  Unauthorized,
} from './pages';

const App: React.FC = () => {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1890ff',
        },
      }}
    >
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* 登录路由 */}
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* 受保护的路由 */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="members" element={<Members />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="weeks" element={<Weeks />} />
              <Route path="evaluations" element={<ProtectedRoute requiredRoles={['admin']}><Evaluations /></ProtectedRoute>} />
              <Route path="my-evaluations" element={<MyEvaluations />} />
              <Route path="statistics" element={<Statistics />} />
              <Route path="weekly-reports" element={<WeeklyReports />} />
              <Route path="achievements" element={<Achievements />} />
            </Route>

            {/* 未匹配的路由 */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
};

export default App;
