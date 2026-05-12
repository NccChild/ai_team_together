/**
 * 首页看板页面 - 专班工作台风格
 */

import React, { useEffect, useState } from 'react';
import { Row, Col, Table, Tag, Space, List, Button, Progress, Badge } from 'antd';
import {
  ProjectOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  TrophyOutlined,
  RightOutlined,
  AlertOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { statisticsApi, weekApi, evaluationApi } from '../api';
import type { DashboardStats, MemberRanking, PendingEvaluation } from '../types';

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

  // 计算完成率
  const completionRate = stats?.total_tasks
    ? Math.round((stats.completed_tasks / stats.total_tasks) * 100)
    : 0;

  // 统计卡片数据
  const statCards = [
    {
      title: '进行中任务',
      value: stats?.in_progress_tasks || 0,
      suffix: '项',
      trend: '较上周增加 2 项',
      icon: <ClockCircleOutlined />,
      color: '#006D4E',
      bgColor: 'bg-[#E8F5E9]',
    },
    {
      title: '待提交交付物',
      value: 3,
      suffix: '项',
      trend: '最近截止：明日 18:00',
      icon: <ExclamationCircleOutlined />,
      color: '#FA8C16',
      bgColor: 'bg-orange-50',
    },
    {
      title: '本周完成率',
      value: completionRate,
      suffix: '%',
      trend: '目标：100%',
      icon: <CheckCircleOutlined />,
      color: '#52C41A',
      bgColor: 'bg-green-50',
    },
    {
      title: '个人贡献积分',
      value: 186,
      suffix: '分',
      trend: '队内排名第 3',
      icon: <TrophyOutlined />,
      color: '#FA8C16',
      bgColor: 'bg-amber-50',
    },
  ];

  // 待办事项
  const todoItems = [
    {
      type: 'warning',
      title: '待提交任务',
      content: '提交样本治理规则初稿',
      time: '今日 18:00',
      priority: 'urgent',
    },
    {
      type: 'error',
      title: '关键修改建议',
      task: '修改模型测试记录',
      feedback: '评价结果：需修改',
      priority: 'reform',
    },
    {
      type: 'info',
      title: '提醒事项',
      content: '参加周五的成果分享会',
      topic: '提示词模板复用',
    },
  ];

  const getPriorityTag = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Tag className="bg-orange-500 text-white border-0">待提交</Tag>;
      case 'reform':
        return <Tag className="bg-red-500 text-white border-0">整改</Tag>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* 顶部横幅 */}
      <div className="bg-[#006D4E] rounded-2xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold mb-1">欢迎回来，张三</h2>
            <p className="text-white/70 text-sm">专注任务，高效协同</p>
          </div>
          <div className="flex gap-3">
            <Button
              size="large"
              className="bg-white text-[#006D4E] border-0 rounded-full font-medium hover:bg-white/90"
              onClick={() => navigate('/tasks')}
            >
              领取任务
            </Button>
            <Button
              size="large"
              type="primary"
              className="bg-[#FA8C16] border-0 rounded-full font-medium hover:bg-[#E07B15]"
            >
              提交进度
            </Button>
          </div>
        </div>
      </div>

      {/* 统计指标卡片 */}
      <Row gutter={16}>
        {statCards.map((card, index) => (
          <Col span={6} key={index}>
            <div className={`${card.bgColor} rounded-xl p-5 shadow-sm`}>
              <div className="flex justify-between items-start mb-3">
                <span className="text-3xl font-bold" style={{ color: card.color }}>
                  {card.value}
                  <span className="text-base font-normal ml-1">{card.suffix}</span>
                </span>
                <span className="text-2xl" style={{ color: card.color }}>
                  {card.icon}
                </span>
              </div>
              <div className="text-sm font-medium text-gray-700 mb-1">{card.title}</div>
              <div className="text-xs text-gray-400">{card.trend}</div>
            </div>
          </Col>
        ))}
      </Row>

      {/* 主要内容区域 */}
      <Row gutter={16}>
        {/* 左侧 - 我的任务清单 */}
        <Col span={16}>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">我的任务清单</h3>
              <Button type="link" className="text-[#006D4E]" onClick={() => navigate('/tasks')}>
                查看全部 <RightOutlined />
              </Button>
            </div>

            <div className="space-y-3">
              {/* 任务项1 */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-medium text-gray-800">大模型应用场景案例拆解</span>
                    <Tag className="bg-[#E8F5E9] text-[#006D4E] border-0 rounded-full text-xs">能力提升</Tag>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>截止：5月2日</span>
                    <span>责任人：张三</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress percent={60} size="small" className="w-24" strokeColor="#006D4E" />
                  <Tag className="bg-blue-100 text-blue-600 border-0 rounded-full">进行中</Tag>
                </div>
              </div>

              {/* 任务项2 */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-medium text-gray-800">样本治理规则初稿整理</span>
                    <Tag className="bg-purple-100 text-purple-600 border-0 rounded-full text-xs">支撑服务</Tag>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>截止：4月30日</span>
                    <span>责任人：张三</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress percent={0} size="small" className="w-24" strokeColor="#FA8C16" />
                  <Tag className="bg-orange-100 text-orange-600 border-0 rounded-full">待提交</Tag>
                </div>
              </div>

              {/* 任务项3 */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-medium text-gray-800">工具链复现测试记录</span>
                    <Tag className="bg-[#E8F5E9] text-[#006D4E] border-0 rounded-full text-xs">能力提升</Tag>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>截止：5月3日</span>
                    <span>责任人：张三</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress percent={80} size="small" className="w-24" strokeColor="#006D4E" />
                  <Tag className="bg-blue-100 text-blue-600 border-0 rounded-full">进行中</Tag>
                </div>
              </div>
            </div>
          </div>
        </Col>

        {/* 右侧 - 待办事项 */}
        <Col span={8}>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">待办事项</h3>
              <Badge count={2} className="bg-[#006D4E]" />
            </div>

            <div className="space-y-4">
              {todoItems.map((item, index) => (
                <div key={index} className="relative pl-4 pb-4 border-l-2 border-gray-200 last:pb-0">
                  <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-orange-500" />
                  <div className="text-xs text-gray-400 mb-1">{item.title}</div>
                  <div className="font-medium text-gray-800 mb-1">{item.content || item.task}</div>
                  {item.feedback && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">反馈：{item.feedback}</span>
                      {getPriorityTag(item.priority)}
                    </div>
                  )}
                  {item.time && (
                    <div className="text-xs text-orange-500 font-medium mt-1">{item.time}</div>
                  )}
                  {item.topic && (
                    <div className="text-xs text-gray-400 mt-1">主题：{item.topic}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 积分排行 */}
          <div className="bg-white rounded-xl p-5 shadow-sm mt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">积分排行</h3>
              <Button type="link" className="text-[#006D4E] text-sm" onClick={() => navigate('/statistics')}>
                查看全部
              </Button>
            </div>

            <List
              size="small"
              dataSource={ranking.slice(0, 5)}
              renderItem={(item, index) => (
                <List.Item className="px-0 border-0">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          index === 0
                            ? 'bg-amber-500'
                            : index === 1
                            ? 'bg-gray-400'
                            : index === 2
                            ? 'bg-orange-400'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <span className="text-sm text-gray-700">{item.member_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrophyOutlined className="text-amber-500" />
                      <span className="text-sm font-medium text-gray-800">{item.weekly_score} 分</span>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
