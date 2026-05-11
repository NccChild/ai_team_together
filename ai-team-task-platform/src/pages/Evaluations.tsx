/**
 * 周评价页面
 */

import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Card, Typography, Tag, Modal, Form, Select, Input, message, Descriptions } from 'antd';
import { StarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { evaluationApi, taskApi, memberApi, weekApi, dictionaryApi } from '../api';
import type { PendingEvaluation, EvaluationCreate, Dictionaries, Week } from '../types';

const { Title, Text } = Typography;

const Evaluations: React.FC = () => {
  const [pendingTasks, setPendingTasks] = useState<PendingEvaluation[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<PendingEvaluation | null>(null);
  const [form] = Form.useForm();
  const [dictionaries, setDictionaries] = useState<Dictionaries | null>(null);
  const [members, setMembers] = useState<{ id: number; name: string }[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pending, dictData, memberData, weekData] = await Promise.all([
        evaluationApi.getPending(),
        dictionaryApi.getAll(),
        memberApi.getList({ page_size: 100 }),
        weekApi.getList({ page_size: 50 }),
      ]);
      setPendingTasks(pending.items || []);
      setDictionaries(dictData);
      setMembers(memberData.items.map((m) => ({ id: m.id, name: m.name })));
      setWeeks(weekData.items);
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
      evaluator_id: 1, // TODO: 实际应为当前登录用户
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

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'task_name',
      key: 'task_name',
      render: (text: string, record: PendingEvaluation) => (
        <a onClick={() => handleEvaluate(record)}>{text}</a>
      ),
    },
    {
      title: '责任人',
      dataIndex: 'assignee_name',
      key: 'assignee_name',
    },
    {
      title: '所属周次',
      dataIndex: 'week_name',
      key: 'week_name',
    },
    {
      title: '截止时间',
      dataIndex: 'deadline',
      key: 'deadline',
      render: (date: string) => date?.split('T')[0],
    },
    {
      title: '提交时间',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      render: (date: string) => date?.replace('T', ' ').split('.')[0],
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: PendingEvaluation) => (
        <Button type="primary" icon={<StarOutlined />} onClick={() => handleEvaluate(record)}>
          评价
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>周评价</Title>

      <Card bordered={false}>
        <Table
          columns={columns}
          dataSource={pendingTasks}
          rowKey="task_id"
          loading={loading}
          locale={{ emptyText: '暂无待评价任务' }}
        />
      </Card>

      <Modal
        title="评价任务"
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        width={600}
      >
        {selectedTask && (
          <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="任务名称" span={2}>
              {selectedTask.task_name}
            </Descriptions.Item>
            <Descriptions.Item label="责任人">{selectedTask.assignee_name}</Descriptions.Item>
            <Descriptions.Item label="截止时间">{selectedTask.deadline?.split('T')[0]}</Descriptions.Item>
          </Descriptions>
        )}

        <Form form={form} layout="vertical">
          <Form.Item name="task_id" label="任务ID" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="member_id" label="被评价人ID" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            name="evaluator_id"
            label="评价人"
            rules={[{ required: true, message: '请选择评价人' }]}
          >
            <Select placeholder="请选择评价人">
              {members.map((m) => (
                <Select.Option key={m.id} value={m.id}>
                  {m.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="level"
            label="评价等级"
            rules={[{ required: true, message: '请选择评价等级' }]}
          >
            <Select placeholder="请选择评价等级">
              {dictionaries?.evaluation_level?.map((item) => (
                <Select.Option key={item.value} value={item.value}>
                  <Space>
                    <Tag color={{ excellent: 'gold', qualified: 'green', need_revision: 'orange', unqualified: 'red' }[item.value]}>
                      {item.label}
                    </Tag>
                    <Text type="secondary">
                      ({{ excellent: '3分', qualified: '2分', need_revision: '1分', unqualified: '0分' }[item.value]})
                    </Text>
                  </Space>
                </Select.Option>
              ))}
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
