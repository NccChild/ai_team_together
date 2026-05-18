/**
 * 首页看板 - 角色区分视图
 * admin: 专班任务概览（全量统计）
 * member: 我的任务清单（个人统计）
 */

import React, { useEffect, useState } from 'react';
import { Row, Col, Table, Tag, List, Button, Progress } from 'antd';
import {
  ProjectOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  TrophyOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { statisticsApi, weekApi, evaluationApi, taskApi, achievementApi } from '../api';
import type { Achievement, DashboardStats, MemberRanking, PendingEvaluation, Task } from '../types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [ranking, setRanking] = useState<MemberRanking[]>([]);
  const [pendingEvaluations, setPendingEvaluations] = useState<PendingEvaluation[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
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

      // 根据角色加载不同任务
      const taskParams: any = { week_id: week.id, page: 1, page_size: 5 };
      if (!isAdmin) {
        taskParams.assignee_id = user?.id;
      }
      const [taskResult, achievementResult] = await Promise.all([
        taskApi.getList(taskParams),
        achievementApi.getList({ page: 1, page_size: 5 }),
      ]);

      setTasks(taskResult.items || []);
      setAchievements(achievementResult.items || []);
    } catch (error) {
      console.error('加载看板数据失败:', error);
    }
  };

  const completionRate = stats?.total_tasks
    ? Math.round((stats.completed_tasks / stats.total_tasks) * 100)
    : 0;

  const topScore = ranking.length ? ranking[0].weekly_score : 0;
  const topRankName = ranking.length ? ranking[0].member_name : '暂无数据';

  const statCards = isAdmin
    ? [
        {
          title: '本周总任务',
          value: stats?.total_tasks || 0,
          suffix: '项',
          trend: `已完成 ${stats?.completed_tasks || 0} 项`,
          icon: <ProjectOutlined />,
          color: '#006D4E',
          bgColor: 'bg-[#E8F5E9]',
        },
        {
          title: '待评价任务',
          value: pendingEvaluations.length,
          suffix: '项',
          trend: '需要及时处理',
          icon: <ExclamationCircleOutlined />,
          color: '#FA8C16',
          bgColor: 'bg-orange-50',
        },
        {
          title: '超期任务',
          value: stats?.overdue_tasks || 0,
          suffix: '项',
          trend: '需要关注',
          icon: <ClockCircleOutlined />,
          color: '#FF4D4F',
          bgColor: 'bg-red-50',
        },
        {
          title: '本周完成率',
          value: completionRate,
          suffix: '%',
          trend: `${stats?.completed_tasks || 0}/${stats?.total_tasks || 0}`,
          icon: <CheckCircleOutlined />,
          color: '#52C41A',
          bgColor: 'bg-green-50',
        },
      ]
    : [
        {
          title: '我的任务',
          value: tasks.length,
          suffix: '项',
          trend: `当前周：${currentWeek?.name || '未知周'}`,
          icon: <ProjectOutlined />,
          color: '#006D4E',
          bgColor: 'bg-[#E8F5E9]',
        },
        {
          title: '已完成',
          value: tasks.filter((t) => t.status === 'completed').length,
          suffix: '项',
          trend: '本周已完成任务',
          icon: <CheckCircleOutlined />,
          color: '#52C41A',
          bgColor: 'bg-green-50',
        },
        {
          title: '进行中',
          value: tasks.filter((t) => ['not_started', 'in_progress', 'submitted'].includes(t.status)).length,
          suffix: '项',
          trend: '需要继续推进',
          icon: <ClockCircleOutlined />,
          color: '#FA8C16',
          bgColor: 'bg-orange-50',
        },
        {
          title: '我的积分',
          value: ranking.find((r) => r.member_id === user?.id)?.weekly_score || 0,
          suffix: '分',
          trend: '本周积分',
          icon: <TrophyOutlined />,
          color: '#FA8C16',
          bgColor: 'bg-amber-50',
        },
      ];

  const statusColor: Record<string, string> = {
    not_started: '#8C8C8C',
    in_progress: '#006D4E',
    submitted: '#FA8C16',
    completed: '#52C41A',
    need_revision: '#FF4D4F',
    overdue: '#FF4D4F',
  };

  const statusLabel: Record<string, string> = {
    not_started: '未开始',
    in_progress: '进行中',
    submitted: '已提交',
    completed: '已完成',
    need_revision: '需修改',
    overdue: '已超期',
  };

  return (
    <div className="space-y-6">
      {/* 顶部横幅 */}
      <div className="bg-[#006D4E] rounded-2xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold mb-1">
              {isAdmin ? '专班任务概览' : `欢迎回来，${user?.name || ''}`}
            </h2>
            <p className="text-white/70 text-sm">
              {isAdmin ? '全局任务管理，及时完成评价' : '查看我的任务，按时提交成果'}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              size="large"
              className="bg-white text-[#006D4E] border-0 rounded-full font-medium hover:bg-white/90"
              onClick={() => navigate('/tasks')}
            >
              {isAdmin ? '任务分配' : '我的任务'}
            </Button>
            {!isAdmin && (
              <Button
                size="large"
                className="bg-[#FA8C16] border-0 rounded-full font-medium text-white hover:bg-[#E07B15]"
                onClick={() => navigate('/weekly-reports')}
              >
                提交周报
              </Button>
            )}
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

      <Row gutter={16}>
        {/* 左侧 - 任务列表 */}
        <Col span={isAdmin ? 16 : 24}>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {isAdmin ? '本周任务列表' : '我的任务清单'}
              </h3>
              <Button type="link" className="text-[#006D4E]" onClick={() => navigate('/tasks')}>
                查看全部 <RightOutlined />
              </Button>
            </div>

            <div className="space-y-3">
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => navigate('/tasks')}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium text-gray-800">{task.name}</span>
                        {isAdmin && (
                          <span className="text-sm text-gray-500">— {task.assignee_name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>截止：{new Date(task.deadline).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Tag
                        color={statusColor[task.status] || '#8C8C8C'}
                        className="rounded-full"
                      >
                        {statusLabel[task.status] || task.status}
                      </Tag>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-gray-500">当前暂无任务</div>
              )}
            </div>
          </div>
        </Col>

        {/* 右侧 - admin专属 */}
        {isAdmin && (
          <Col span={8}>
            {/* 待评价列表 */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">待评价任务</h3>
                <Button type="link" className="text-[#006D4E] text-sm" onClick={() => navigate('/evaluations')}>
                  去评价
                </Button>
              </div>
              <div className="space-y-3">
                {pendingEvaluations.length > 0 ? (
                  pendingEvaluations.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-800 text-sm">{item.task_name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {item.assignee_name} · 截止 {item.deadline}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-400 text-sm">暂无待评价任务</div>
                )}
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

            {/* 最新成果 */}
            <div className="bg-white rounded-xl p-5 shadow-sm mt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">最新成果</h3>
                <Button type="link" className="text-[#006D4E] text-sm" onClick={() => navigate('/achievements')}>
                  查看全部
                </Button>
              </div>
              <List
                size="small"
                dataSource={achievements}
                renderItem={(item) => (
                  <List.Item className="px-0 border-0">
                    <div className="w-full">
                      <div className="font-medium text-gray-800">{item.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {item.member_name || '未知'} · {item.week_name || '未知周'}
                      </div>
                    </div>
                  </List.Item>
                )}
                locale={{ emptyText: '暂无成果记录' }}
              />
            </div>
          </Col>
        )}
      </Row>
    </div>
  );
};

export default Dashboard;
