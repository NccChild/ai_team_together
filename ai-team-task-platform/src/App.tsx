import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import MainLayout from './components/Layout';
import {
  Dashboard,
  Members,
  Tasks,
  Weeks,
  Evaluations,
  Statistics,
  WeeklyReports,
  Achievements,
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
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="members" element={<Members />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="weeks" element={<Weeks />} />
            <Route path="evaluations" element={<Evaluations />} />
            <Route path="statistics" element={<Statistics />} />
            <Route path="weekly-reports" element={<WeeklyReports />} />
            <Route path="achievements" element={<Achievements />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
