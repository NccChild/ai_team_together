/**
 * 主布局组件
 */

import React, { useState, useEffect } from 'react';
import { Layout, Menu, theme, Typography, Space, Dropdown, Avatar, Tag } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  ProjectOutlined,
  CalendarOutlined,
  StarOutlined,
  BarChartOutlined,
  FileTextOutlined,
  TrophyOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import type { MenuProps } from 'antd';
import { weekApi } from '../api';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [currentWeek, setCurrentWeek] = useState<{ id: number; name: string } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  useEffect(() => {
    loadCurrentWeek();
  }, []);

  const loadCurrentWeek = async () => {
    try {
      const week = await weekApi.getCurrent();
      setCurrentWeek({ id: week.id, name: week.name });
    } catch (error) {
      console.error('获取当前周失败:', error);
    }
  };

  const menuItems: MenuProps['items'] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '首页看板',
    },
    {
      key: '/members',
      icon: <TeamOutlined />,
      label: '人员管理',
    },
    {
      key: '/tasks',
      icon: <ProjectOutlined />,
      label: '任务管理',
    },
    {
      key: '/weeks',
      icon: <CalendarOutlined />,
      label: '周计划',
    },
    {
      key: '/evaluations',
      icon: <StarOutlined />,
      label: '周评价',
    },
    {
      key: '/statistics',
      icon: <BarChartOutlined />,
      label: '统计汇总',
    },
    {
      key: '/weekly-reports',
      icon: <FileTextOutlined />,
      label: '周报分析',
    },
    {
      key: '/achievements',
      icon: <TrophyOutlined />,
      label: '成果库',
    },
  ];

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
    },
  ];

  const getSelectedKey = () => {
    const path = location.pathname;
    const item = menuItems?.find((item) => item?.key === path);
    return item?.key as string || '/dashboard';
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={220}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          background: '#001529',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: collapsed ? 14 : 16,
            fontWeight: 'bold',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {collapsed ? 'AI专班' : '人工智能专班工具'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 220, transition: 'margin-left 0.2s' }}>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <Space>
            <div
              onClick={() => setCollapsed(!collapsed)}
              style={{ cursor: 'pointer', fontSize: 18 }}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </div>
            {currentWeek && (
              <Tag color="blue" style={{ marginLeft: 16 }}>
                {currentWeek.name}
              </Tag>
            )}
          </Space>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar style={{ backgroundColor: '#1890ff' }} icon={<UserOutlined />} />
              <Text>管理员</Text>
            </Space>
          </Dropdown>
        </Header>
        <Content
          style={{
            margin: 16,
            padding: 24,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            minHeight: 280,
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
