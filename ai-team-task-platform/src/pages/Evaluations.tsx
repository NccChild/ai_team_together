/**
 * 周评价页面 - 专班工作台风格
 */

import React, { useEffect, useState } from 'react';
import {
  Table, Button, Card, Tag, Modal, Form, Select, Input, message, Space, Row, Col, Statistic, Badge
} from 'antd';
import { StarOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { evaluationApi, dictionaryApi, memberApi, weekApi } from '../api';
import type { PendingEvaluation, EvaluationCreate, Dictionaries, Week } from '../types';

const Evaluations: React.FC = () => {
  const [pendingTasks, setPendingTasks] = useState<PendingEvaluation[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<PendingEvaluation | null>(null);
  const [form] = Form.useForm();
  const [dictionaries, setDictionaries] = useState<Dictionaries | null>(null);
  const [members, setMembers] = useState<{ id: number; name: string }[]>([]);
  const [stats, setStats] = useState({ pending: 0, evaluated: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pending, dictData, memberData] = await Promise.all([
        evaluationApi.getPending(),
        dictionaryApi.getAll(),
        memberApi.getList({ page_size: 100 }),
      ]);
      setPendingTasks(pending.items || []);
      setDictionaries(dictData);
      setMembers(memberData.items.map((m) => ({ id: m.id, name: m.name })));
      setStats({
        pending: pending.items?.length || 0,
        evaluated: 0,
      });
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = (record: PendingEvaluation) => {
    setSelectedTask(record);
    form.setFieldsValue({
      task_id: record.task_id,
      member_id: record.assignee_id,
      evaluator_id: 1,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await evaluationApi.create(values as EvaluationCreate);
      message.success('评价提交成功');
      setModalVisible(false);
      form.resetFields();
      loadData();
    } catch (error) {
      message.error('评价提交失败');
    }
  };

  const getLevelConfig = (level: string) => {
    const configs: Record<string, any> = {
      excellent: { color: 'bg-amber-100 text-amber-600', label: '优秀', score: '+3分' },
      qualified: { color: 'bg-green-100 text-green-600', label: '合格', score: '+2分' },
      need_revision: { color: 'bg-orange-100 text-orange-600', label: '需修改', score: '+1分' },
      unqualified: { color: 'bg-red-100 text-red-600', label: '不合格', score: '+0分' },
    };
    return configs[level] || { color: 'bg-gray-100 text-gray-600', label: level };
  };

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'task_name',
      key: 'task_name',
      render: (text: string) => (
        <span className="font-medium text-gray-800">{text}</span>
      ),
    },
    {
      title: '责任人',
      dataIndex: 'assignee_name',
      key: 'assignee_name',
      width: 100,
    },
    {
      title: '所属周次',
      dataIndex: 'week_name',
      key: 'week_name',
      width: 120,
    },
    {
      title: '截止时间',
      dataIndex: 'deadline',
      key: 'deadline',
      width: 120,
      render: (date: string) => (
        <span className="text-gray-600">{date?.split('T')[0]}</span>
      ),
    },
    {
      title: '提交时间',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      width: 160,
      render: (date: string) => (
        <span className="text-gray-500">{date?.replace('T', ' ').split('.')[0]}</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: PendingEvaluation) => (
        <Button
          type="primary"
          icon={<StarOutlined />}
          onClick={() => handleEvaluate(record)}
          className="bg-[#006D4E] rounded-full hover:bg-[#005A40]"
        >
          评价
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">周评价</h2>
          <p className="text-sm text-gray-500 mt-1">对已完成的任务进行评价，发放积分</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16}>
        <Col span={8}>
          <div className="bg-orange-50 rounded-xl p-5">
            <Statistic
              title={<span className="text-gray-600">待评价任务</span>}
              value={stats.pending}
              prefix={<WarningOutlined className="text-orange-500" />}
              valueStyle={{ color: '#FA8C16' }}
            />
          </div>
        </Col>
        <Col span={8}>
          <div className="bg-green-50 rounded-xl p-5">
            <Statistic
              title={<span className="text-gray-600">本周已评价</span>}
              value={stats.evaluated}
              prefix={<CheckCircleOutlined className="text-green-500" />}
              valueStyle={{ color: '#52C41A' }}
            />
          </div>
        </Col>
        <Col span={8}>
          <div className="bg-[#E8F5E9] rounded-xl p-5">
            <Statistic
              title={<span className="text-gray-600">累计评价</span>}
              value={stats.pending + stats.evaluated}
              prefix={<StarOutlined className="text-[#006D4E]" />}
              valueStyle={{ color: '#006D4E' }}
            />
          </div>
        </Col>
      </Row>

      {/* 待评价任务列表 */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-800">待评价任务</h3>
            <Badge count={pendingTasks.length} className="bg-[#006D4E]" />
          </div>
        </div>
        <Table
          columns={columns}
          dataSource={pendingTasks}
          rowKey="task_id"
          loading={loading}
          pagination={false}
        />
        {pendingTasks.length === 0 && !loading && (
          <div className="text-center py-12">
            <CheckCircleOutlined className="text-4xl text-green-400 mb-3" />
            <p className="text-gray-400">暂无待评价任务</p>
          </div>
        )}
      </div>

      {/* 评价弹窗 */}
      <Modal
        title="任务评价"
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => { setModalVisible(false); form.resetFields(); }}
        width={600}
        okText="提交评价"
        cancelText="取消"
      >
        {selectedTask && (
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <div className="font-medium text-gray-800 mb-2">{selectedTask.task_name}</div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>责任人: {selectedTask.assignee_name}</span>
              <span>截止: {selectedTask.deadline?.split('T')[0]}</span>
            </div>
          </div>
        )}

        <Form form={form} layout="vertical">
          <Form.Item name="task_id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="member_id" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            name="evaluator_id"
            label="评价人"
            rules={[{ required: true, message: '请选择评价人' }]}
          >
            <Select placeholder="请选择评价人">
              {members.map((m) => (
                <Select.Option key={m.id} value={m.id}>{m.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="level"
            label="评价等级"
            rules={[{ required: true, message: '请选择评价等级' }]}
          >
            <Select placeholder="请选择评价等级">
              {dictionaries?.evaluation_level?.map((item) => {
                const config = getLevelConfig(item.value);
                return (
                  <Select.Option key={item.value} value={item.value}>
                    <Space>
                      <Tag className={`${config.color} border-0 rounded`}>{item.label}</Tag>
                      <span className="text-gray-400">({config.score})</span>
                    </Space>
                  </Select.Option>
                );
              })}
            </Select>
          </Form.Item>
          <Form.Item name="comment" label="评价意见" rules={[{ required: true, message: '请输入评价意见' }]}>
            <Input.TextArea rows={3} placeholder="请详细说明评价理由" />
          </Form.Item>
          <Form.Item name="bonus_score" label="加分项">
            <Select mode="multiple" placeholder="可选择加分项" allowClear>
              {dictionaries?.bonus_item?.map((item) => (
                <Select.Option key={item.value} value={1}>
                  {item.label} (+1分)
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Evaluations;
