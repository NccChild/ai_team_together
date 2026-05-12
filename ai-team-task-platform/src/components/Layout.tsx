/**
 * 主布局组件 - 专班工作台风格
 */

import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Badge, Dropdown, Avatar, Space, Button } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  ProjectOutlined,
  CalendarOutlined,
  StarOutlined,
  BarChartOutlined,
  FileTextOutlined,
  TrophyOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  BellOutlined,
  RobotOutlined,
} from '@ant-design/icons';

interface MainLayoutProps {
  children?: React.ReactNode;
}

type RoleType = 'member' | 'leader' | 'admin';

const MainLayout: React.FC<MainLayoutProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentWeek, setCurrentWeek] = useState<{ id: number; name: string } | null>(null);
  const [role, setRole] = useState<RoleType>('member');

  useEffect(() => {
    // 模拟获取当前周次数据
    setCurrentWeek({ id: 1, name: '2026年第18周' });
  }, []);

  const handleRoleChange = (newRole: RoleType) => {
    console.log('角色切换:', role, '->', newRole);
    setRole(newRole);
  };

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '个人工作台' },
    { key: '/tasks', icon: <ProjectOutlined />, label: '任务中心' },
    { key: '/members', icon: <TeamOutlined />, label: '团队管理' },
    { key: '/weeks', icon: <CalendarOutlined />, label: '周计划' },
    { key: '/evaluations', icon: <StarOutlined />, label: '周评价' },
    { key: '/statistics', icon: <BarChartOutlined />, label: '统计分析' },
    { key: '/weekly-reports', icon: <FileTextOutlined />, label: '周报管理' },
    { key: '/achievements', icon: <TrophyOutlined />, label: '成果库' },
  ];

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: '个人中心' },
    { key: 'settings', icon: <SettingOutlined />, label: '系统设置' },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录' },
  ];

  const getSelectedKey = () => {
    return location.pathname;
  };

  // 角色配置
  const roleOptions = [
    { key: 'member' as RoleType, label: '队员', icon: '👤' },
    { key: 'leader' as RoleType, label: '队长', icon: '👑' },
    { key: 'admin' as RoleType, label: '管理员', icon: '🔐' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 左侧导航栏 - 森林绿主题 */}
      <aside className="w-56 bg-[#006D4E] flex flex-col">
        {/* Logo区域 */}
        <div className="h-16 flex items-center px-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <RobotOutlined className="text-white text-lg" />
            </div>
            <span className="text-white font-semibold text-sm">专班工作台</span>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 py-4 px-2">
          {menuItems.map((item) => {
            const isActive = getSelectedKey() === item.key;
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* 底部提示 */}
        <div className="p-4 border-t border-white/10">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-white/80 text-xs font-medium mb-1">本周运行重点</p>
            <p className="text-white/60 text-xs">周计划 → 周交付 → 周评价</p>
          </div>
        </div>
      </aside>

      {/* 右侧主内容区 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部状态栏 */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            {/* 周次标签 */}
            {currentWeek && (
              <div className="bg-[#E8F5E9] text-[#006D4E] px-4 py-1.5 rounded-full text-sm font-medium">
                {currentWeek.name}
              </div>
            )}
            
            {/* 角色切换按钮组 */}
            <div className="flex items-center bg-gray-100 rounded-full p-1">
              {roleOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => handleRoleChange(option.key)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    role === option.key
                      ? 'bg-[#006D4E] text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span className="mr-1">{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>
            
            {/* 当前角色显示（调试用） */}
            <span className="text-xs text-gray-400">
              当前: {role === 'member' ? '队员' : role === 'leader' ? '队长' : '管理员'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* AI视角切换 */}
            <Button
              icon={<RobotOutlined />}
              className="border-[#006D4E] text-[#006D4E] hover:bg-[#E8F5E9]"
            >
              AI视角
            </Button>

            {/* 消息通知 */}
            <Badge count={3} size="small">
              <Button type="text" icon={<BellOutlined />} className="text-gray-500" />
            </Badge>

            {/* 用户菜单 */}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space className="cursor-pointer hover:bg-gray-50 px-2 py-1 rounded-lg">
                <Avatar size={32} style={{ backgroundColor: '#006D4E' }} icon={<UserOutlined />} />
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-700">张三</div>
                  <div className="text-xs text-gray-400">研发部</div>
                </div>
              </Space>
            </Dropdown>
          </div>
        </header>

        {/* 页面内容 */}
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;