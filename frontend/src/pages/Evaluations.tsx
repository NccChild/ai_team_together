/**
 * 周评价页面 - AI生成评价
 * admin: 对已完成任务发起AI评价，可编辑评价结果
 * member: 只读查看评价结果
 */

import React, { useEffect, useState } from 'react';
import {
  Table, Button, Tag, Modal, Form, Select, Input, message, Space, Row, Col, Drawer
} from 'antd';
import {
  StarOutlined, CheckCircleOutlined, RobotOutlined,
  EditOutlined, EyeOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { evaluationApi, taskApi, dictionaryApi } from '../api';
import type { Evaluation, Task, Dictionaries } from '../types';

const Evaluations: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedEval, setSelectedEval] = useState<Evaluation | null>(null);
  const [form] = Form.useForm();
  const [dictionaries, setDictionaries] = useState<Dictionaries | null>(null);
  const [evaluatedCount, setEvaluatedCount] = useState(0);

  useEffect(() => {
    loadData();
    loadDictionaries();
  }, []);

  const loadDictionaries = async () => {
    try {
      const dicts = await dictionaryApi.getAll();
      setDictionaries(dicts);
    } catch (error) {
      console.error('加载字典失败:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // 获取已完成待评价的任务
      const tasksResult = await taskApi.getList({ status: 'completed', page_size: 100 });
      const completedList = tasksResult.items || [];

      // 获取已有评价
      const evalResult = await evaluationApi.getList({ page_size: 100 });
      const evalList = evalResult.items || [];

      // 过滤出未评价的已完成任务
      const evaluatedTaskIds = new Set(evalList.map((e) => e.task_id));
      const unevaluated = completedList.filter((t) => !evaluatedTaskIds.has(t.id));

      setCompletedTasks(unevaluated);
      setEvaluations(evalList);
      setEvaluatedCount(evalList.length);
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAIEvaluate = async (record: Task) => {
    if (!isAdmin) return;
    setEvaluating(true);
    try {
      await evaluationApi.create({
        task_id: record.id,
        evaluator_id: user?.id || 1,
        member_id: record.assignee_id,
        level: 'qualified', // AI会覆盖
        bonus_score: 0,
      });
      message.success('AI评价完成');
      loadData();
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || '评价失败';
      message.error(msg);
    } finally {
      setEvaluating(false);
    }
  };

  const handleEdit = (record: Evaluation) => {
    setSelectedEval(record);
    form.setFieldsValue({
      level: record.level,
      comment: record.comment,
      bonus_score: record.bonus_score,
    });
    setEditModalVisible(true);
  };

  const handleEditSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (selectedEval) {
        await evaluationApi.update(selectedEval.id, values);
        message.success('评价更新成功');
        setEditModalVisible(false);
        loadData();
      }
    } catch (error) {
      message.error('更新失败');
    }
  };

  const handleViewDetail = (record: Evaluation) => {
    setSelectedEval(record);
    setDetailDrawerVisible(true);
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

  // 待评价任务列
  const pendingColumns = [
    { title: '任务名称', dataIndex: 'name', key: 'name' },
    { title: '责任人', dataIndex: 'assignee_name', key: 'assignee_name', width: 100 },
    {
      title: '截止时间', dataIndex: 'deadline', key: 'deadline', width: 120,
      render: (d: string) => d?.split('T')[0],
    },
    {
      title: '操作', key: 'action', width: 100,
      render: (_: any, record: Task) => (
        <Button
          type="primary"
          icon={<RobotOutlined />}
          loading={evaluating}
          onClick={() => handleAIEvaluate(record)}
          className="bg-[#006D4E] rounded-full"
        >
          AI评价
        </Button>
      ),
    },
  ];

  // 已评价列
  const evaluatedColumns = [
    { title: '任务名称', dataIndex: 'task_name', key: 'task_name' },
    { title: '成员', dataIndex: 'member_name', key: 'member_name', width: 100 },
    {
      title: '等级', dataIndex: 'level', key: 'level', width: 100,
      render: (level: string) => {
        const config = getLevelConfig(level);
        return <Tag style={{ backgroundColor: config.bg, borderColor: config.color, color: config.color }} className="rounded-full">{config.label}</Tag>;
      },
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
      title: '操作', key: 'action', width: 120,
      render: (_: any, record: Evaluation) => (
        <Space size="small">
          <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            查看
          </Button>
          {isAdmin && (
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
              编辑
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">周评价</h2>
          <p className="text-sm text-gray-500 mt-1">
            {isAdmin ? 'AI自动评价已完成任务，可手动调整' : '查看任务评价结果'}
          </p>
        </div>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16}>
        <Col span={8}>
          <div className="bg-orange-50 rounded-xl p-5">
            <div className="text-3xl font-bold text-orange-500">{completedTasks.length}</div>
            <div className="text-sm text-gray-600 mt-1">待评价任务</div>
          </div>
        </Col>
        <Col span={8}>
          <div className="bg-green-50 rounded-xl p-5">
            <div className="text-3xl font-bold text-green-500">{evaluatedCount}</div>
            <div className="text-sm text-gray-600 mt-1">已评价</div>
          </div>
        </Col>
        <Col span={8}>
          <div className="bg-amber-50 rounded-xl p-5">
            <div className="text-3xl font-bold text-amber-500">
              {evaluations.filter((e) => e.level === 'excellent').length}
            </div>
            <div className="text-sm text-gray-600 mt-1">优秀评价</div>
          </div>
        </Col>
      </Row>

      {/* Admin: 待评价任务 */}
      {isAdmin && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-800">待评价任务</h3>
              <Tag className="bg-orange-100 text-orange-600 border-0">{completedTasks.length}</Tag>
            </div>
          </div>
          <Table
            columns={pendingColumns}
            dataSource={completedTasks}
            rowKey="id"
            loading={loading}
            pagination={false}
          />
          {completedTasks.length === 0 && !loading && (
            <div className="text-center py-12">
              <CheckCircleOutlined className="text-4xl text-green-400 mb-3" />
              <p className="text-gray-400">暂无待评价任务</p>
            </div>
          )}
        </div>
      )}

      {/* 已评价列表 */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-800">评价记录</h3>
            <Tag className="bg-green-100 text-green-600 border-0">{evaluations.length}</Tag>
          </div>
        </div>
        <Table
          columns={evaluatedColumns}
          dataSource={evaluations}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </div>

      {/* 编辑评价弹窗 */}
      <Modal
        title="编辑评价"
        open={editModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => setEditModalVisible(false)}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="level" label="评价等级" rules={[{ required: true }]}>
            <Select placeholder="请选择评价等级">
              {dictionaries?.evaluation_level?.map((item) => (
                <Select.Option key={item.value} value={item.value}>{item.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="comment" label="评价意见">
            <Input.TextArea rows={4} placeholder="评价意见" />
          </Form.Item>
          <Form.Item name="bonus_score" label="加分">
            <Select placeholder="加分">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <Select.Option key={n} value={n}>+{n}分</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 评价详情抽屉 */}
      <Drawer
        title="评价详情"
        open={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
        width={500}
      >
        {selectedEval && (
          <div>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="text-sm text-gray-500 mb-1">任务</div>
              <div className="font-semibold">{selectedEval.task_name}</div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-400">成员</div>
                <div className="font-medium">{selectedEval.member_name}</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-400">等级</div>
                <Tag style={{ backgroundColor: getLevelConfig(selectedEval.level).bg, color: getLevelConfig(selectedEval.level).color }} className="border-0 rounded-full">
                  {getLevelConfig(selectedEval.level).label}
                </Tag>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-400">基础分</div>
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
                <div className="text-xs text-gray-400">评价人</div>
                <div className="font-medium">{selectedEval.evaluator_name || '-'}</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-400">评价时间</div>
                <div className="text-sm">{selectedEval.evaluated_at?.replace('T', ' ').split('.')[0]}</div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-sm text-gray-500 mb-2">评价意见</div>
              <div>{selectedEval.comment || '暂无'}</div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Evaluations;
