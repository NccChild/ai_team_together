/**
 * 首页看板页面
 */

import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Space, Typography, Progress, List, Button } from 'antd';
import {
  ProjectOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { statisticsApi, weekApi, evaluationApi } from '../api';
import type { DashboardStats, MemberRanking, PendingEvaluation } from '../types';

const { Title } = Typography;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [ranking, setRanking] = useState<MemberRanking[]>([]);
  const [pendingEvaluations, setPendingEvaluations] = useState<PendingEvaluation[]>([]);
  const [currentWeek, setCurrentWeek] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [week, dashboard, rankingData, pending] = await Promise.all([
        weekApi.getCurrent(),
        statisticsApi.getDashboard(),
        statisticsApi.getRanking(),
        evaluationApi.getPending(),
      ]);

      setCurrentWeek({ id: week.id, name: week.name });
      setStats(dashboard);
      setRanking(rankingData.items || []);
      setPendingEvaluations(pending.items || []);
    } catch (error) {
      console.error('加载看板数据失败:', error);
    }
  };

  const statCards = [
    {
      title: '本周任务总数',
      value: stats?.total_tasks || 0,
      icon: <ProjectOutlined style={{ fontSize: 24, color: '#1890ff' }} />,
      color: '#e6f7ff',
    },
    {
      title: '已完成任务',
      value: stats?.completed_tasks || 0,
      icon: <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />,
      color: '#f6ffed',
    },
    {
      title: '进行中任务',
      value: stats?.in_progress_tasks || 0,
      icon: <ClockCircleOutlined style={{ fontSize: 24, color: '#faad14' }} />,
      color: '#fffbe6',
    },
    {
      title: '待评价任务',
      value: stats?.pending_evaluation || 0,
      icon: <ExclamationCircleOutlined style={{ fontSize: 24, color: '#722ed1' }} />,
      color: '#f9f0ff',
    },
  ];

  const overdueTasks = stats?.overdue_tasks || 0;
  const completionRate = stats?.total_tasks
    ? Math.round((stats.completed_tasks / stats.total_tasks) * 100)
    : 0;

  const pendingColumns = [
    {
      title: '任务名称',
      dataIndex: 'task_name',
      key: 'task_name',
      render: (text: string, record: PendingEvaluation) => (
        <a onClick={() => navigate(`/tasks/${record.task_id}`)}>{text}</a>
      ),
    },
    {
      title: '责任人',
      dataIndex: 'assignee_name',
      key: 'assignee_name',
    },
    {
      title: '截止时间',
      dataIndex: 'deadline',
      key: 'deadline',
      render: (date: string) => date?.split('T')[0],
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: PendingEvaluation) => (
        <Button type="link" size="small" onClick={() => navigate('/evaluations')}>
          去评价
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>首页看板</Title>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {statCards.map((card, index) => (
          <Col span={6} key={index}>
            <Card bordered={false} style={{ background: card.color }}>
              <Statistic
                title={card.title}
                value={card.value}
                prefix={card.icon}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        {/* 任务完成进度 */}
        <Col span={12}>
          <Card title="本周任务完成进度" bordered={false}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <Progress
                percent={completionRate}
                status="active"
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="延期任务"
                    value={overdueTasks}
                    valueStyle={{ color: overdueTasks > 0 ? '#ff4d4f' : '#52c41a' }}
                    prefix={overdueTasks > 0 ? <WarningOutlined /> : <CheckCircleOutlined />}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="需修改任务"
                    value={stats?.need_revision || 0}
                    valueStyle={{ color: (stats?.need_revision || 0) > 0 ? '#faad14' : '#52c41a' }}
                  />
                </Col>
              </Row>
            </Space>
          </Card>
        </Col>

        {/* 积分排行 */}
        <Col span={12}>
          <Card title="本周积分排行" bordered={false}>
            <List
              size="small"
              dataSource={ranking.slice(0, 5)}
              renderItem={(item, index) => (
                <List.Item>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space>
                      <Tag color={index < 3 ? ['gold', 'silver', 'volcano'][index] : 'default'}>
                        {index + 1}
                      </Tag>
                      <span>{item.member_name}</span>
                    </Space>
                    <Space>
                      <Tag icon={<TrophyOutlined />} color="gold">
                        {item.weekly_score} 分
                      </Tag>
                    </Space>
                  </Space>
                </List.Item>
              )}
            />
            {ranking.length > 5 && (
              <Button type="link" block onClick={() => navigate('/statistics')}>
                查看完整排行
              </Button>
            )}
          </Card>
        </Col>
      </Row>

      {/* 待评价任务 */}
      <Card
        title="待评价任务"
        bordered={false}
        extra={
          <Button type="link" onClick={() => navigate('/evaluations')}>
            查看全部
          </Button>
        }
      >
        <Table
          columns={pendingColumns}
          dataSource={pendingEvaluations}
          rowKey="task_id"
          pagination={false}
          size="small"
        />
        {pendingEvaluations.length === 0 && (
          <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
            暂无待评价任务
          </div>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
