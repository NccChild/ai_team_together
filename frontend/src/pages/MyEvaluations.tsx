/**
 * 我的评价页面 - 成员查看自己的任务评价
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Tag, Drawer, Select, Row, Col, message
} from 'antd';
import {
  EyeOutlined, ClockCircleOutlined, CheckCircleOutlined, TrophyOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { evaluationApi, taskApi, weekApi } from '../api';
import type { Evaluation, Task, Week } from '../types';

const MyEvaluations: React.FC = () => {
  const { user } = useAuth();

  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedEval, setSelectedEval] = useState<Evaluation | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<number | undefined>();

  // 统计数据
  const [pendingCount, setPendingCount] = useState(0);
  const [evaluatedCount, setEvaluatedCount] = useState(0);
  const [excellentCount, setExcellentCount] = useState(0);

  useEffect(() => {
    loadWeeks();
  }, []);

  useEffect(() => {
    if (selectedWeekId !== undefined) {
      loadData();
    }
  }, [selectedWeekId]);

  const loadWeeks = async () => {
    try {
      const result = await weekApi.getList({ page_size: 100 });
      const allWeeks = result.items || [];
      setWeeks(allWeeks);

      // 默认选中当前周
      const current = allWeeks.find((w) => w.status === 'current');
      if (current) {
        setSelectedWeekId(current.id);
      } else if (allWeeks.length > 0) {
        setSelectedWeekId(allWeeks[0].id);
      }
    } catch (error) {
      message.error('加载周次列表失败');
    }
  };

  const loadData = async () => {
    if (!user || !selectedWeekId) return;
    setLoading(true);
    try {
      const [evalResult, tasksResult] = await Promise.all([
        evaluationApi.getList({
          member_id: user.id,
          week_id: selectedWeekId,
          page_size: 100,
        }),
        taskApi.getList({
          assignee_id: user.id,
          week_id: selectedWeekId,
          status: 'completed',
          page_size: 100,
        }),
      ]);

      const evalList = evalResult.items || [];
      setEvaluations(evalList);

      // 待评价：已完成但未评价的任务
      const evaluatedTaskIds = new Set(evalList.map((e) => e.task_id));
      const completedTasks = tasksResult.items || [];
      setPendingCount(completedTasks.filter((t) => !evaluatedTaskIds.has(t.id)).length);

      setEvaluatedCount(evalList.length);
      setExcellentCount(evalList.filter((e) => e.level === 'excellent').length);
    } catch (error) {
      message.error('加载评价数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (record: Evaluation) => {
    setSelectedEval(record);
    setDetailDrawerVisible(true);
  };

  const handleWeekChange = (weekId: number) => {
    setSelectedWeekId(weekId);
  };

  const getLevelConfig = (level: string) => {
    const configs: Record<string, any> = {
      excellent: { color: '#D4AF37', bg: '#FFF7E6', label: '优秀' },
      qualified: { color: '#52C41A', bg: '#F6FFED', label: '合格' },
      need_revision: { color: '#FA8C16', bg: '#FFF7E6', label: '需修改' },
      unqualified: { color: '#FF4D4F', bg: '#FFF2F0', label: '不合格' },
    };
    return configs[level] || { color: '#666', bg: '#F5F5F5', label: level };
  };

  const columns = [
    { title: '任务名称', dataIndex: 'task_name', key: 'task_name' },
    {
      title: '等级', dataIndex: 'level', key: 'level', width: 100,
      render: (level: string) => {
        const config = getLevelConfig(level);
        return <Tag style={{ backgroundColor: config.bg, borderColor: config.color, color: config.color }} className="rounded-full">{config.label}</Tag>;
      },
    },
    {
      title: '基础积分', dataIndex: 'base_score', key: 'base_score', width: 100,
      render: (score: number) => <span className="text-gray-600">{score}</span>,
    },
    {
      title: '加分', dataIndex: 'bonus_score', key: 'bonus_score', width: 80,
      render: (score: number) => <span className="text-green-500">+{score}</span>,
    },
    {
      title: '最终积分', dataIndex: 'final_score', key: 'final_score', width: 100,
      render: (score: number) => <span className="font-bold text-amber-500">{score}</span>,
    },
    {
      title: '评价时间', dataIndex: 'evaluated_at', key: 'evaluated_at', width: 160,
      render: (d: string) => d?.replace('T', ' ').split('.')[0],
    },
    {
      title: '操作', key: 'action', width: 80,
      render: (_: any, record: Evaluation) => (
        <button
          type="button"
          className="text-blue-500 hover:text-blue-700 cursor-pointer bg-transparent border-none p-0"
          onClick={() => handleViewDetail(record)}
        >
          <EyeOutlined className="mr-1" />
          查看
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">我的评价</h2>
          <p className="text-sm text-gray-500 mt-1">查看个人任务的评价结果</p>
        </div>
        <Select
          value={selectedWeekId}
          onChange={handleWeekChange}
          style={{ width: 200 }}
          placeholder="选择周次"
        >
          {weeks.map((w) => (
            <Select.Option key={w.id} value={w.id}>
              {w.name} {w.status === 'current' ? '(当前)' : ''}
            </Select.Option>
          ))}
        </Select>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16}>
        <Col span={8}>
          <div className="bg-orange-50 rounded-xl p-5">
            <div className="text-3xl font-bold text-orange-500">{pendingCount}</div>
            <div className="text-sm text-gray-600 mt-1">
              <ClockCircleOutlined className="mr-1" />待评价
            </div>
          </div>
        </Col>
        <Col span={8}>
          <div className="bg-green-50 rounded-xl p-5">
            <div className="text-3xl font-bold text-green-500">{evaluatedCount}</div>
            <div className="text-sm text-gray-600 mt-1">
              <CheckCircleOutlined className="mr-1" />已评价
            </div>
          </div>
        </Col>
        <Col span={8}>
          <div className="bg-amber-50 rounded-xl p-5">
            <div className="text-3xl font-bold text-amber-500">{excellentCount}</div>
            <div className="text-sm text-gray-600 mt-1">
              <TrophyOutlined className="mr-1" />优秀评价
            </div>
          </div>
        </Col>
      </Row>

      {/* 评价列表 */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">评价记录</h3>
        </div>
        <Table
          columns={columns}
          dataSource={evaluations}
          rowKey="id"
          loading={loading}
          pagination={evaluations.length > 20 ? { pageSize: 20 } : false}
        />
        {evaluations.length === 0 && !loading && (
          <div className="text-center py-12">
            <CheckCircleOutlined className="text-4xl text-gray-300 mb-3" />
            <p className="text-gray-400">暂无评价记录</p>
          </div>
        )}
      </div>

      {/* 评价详情抽屉 */}
      <Drawer
        title="评价详情"
        open={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
        width={480}
      >
        {selectedEval && (
          <div>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="text-sm text-gray-500 mb-1">任务</div>
              <div className="font-semibold">{selectedEval.task_name}</div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-400">评价等级</div>
                <Tag style={{
                  backgroundColor: getLevelConfig(selectedEval.level).bg,
                  color: getLevelConfig(selectedEval.level).color,
                }} className="border-0 rounded-full mt-1">
                  {getLevelConfig(selectedEval.level).label}
                </Tag>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-400">评价人</div>
                <div className="font-medium mt-1">{selectedEval.evaluator_name || '-'}</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-400">基础积分</div>
                <div className="font-medium">{selectedEval.base_score}</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-400">加分</div>
                <div className="font-medium">+{selectedEval.bonus_score}</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-400">最终积分</div>
                <div className="font-bold text-amber-500">{selectedEval.final_score}</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-400">评价时间</div>
                <div className="text-sm">{selectedEval.evaluated_at?.replace('T', ' ').split('.')[0]}</div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-sm text-gray-500 mb-2">评价意见</div>
              <div className="text-gray-800 whitespace-pre-wrap">{selectedEval.comment || '暂无'}</div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default MyEvaluations;
