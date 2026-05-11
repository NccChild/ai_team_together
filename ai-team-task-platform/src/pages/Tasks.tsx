/**
 * 任务管理页面
 */

import React, { useEffect, useState } from 'react';
import {
  Table, Button, Space, Input, Modal, Form, Select, Tag, message, Popconfirm,
  Typography, Row, Col, Card, DatePicker, InputNumber, Drawer, Descriptions, Timeline
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EyeOutlined,
  CheckCircleOutlined, UploadOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { taskApi, memberApi, weekApi, dictionaryApi } from '../api';
import type { Task, TaskCreate, Member, Week, Dictionaries, DeliveryCreate } from '../types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const Tasks: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState<{
    keyword?: string;
    week_id?: number;
    assignee_id?: number;
    status?: string;
    task_type?: string;
  }>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [deliveryModalVisible, setDeliveryModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [dictionaries, setDictionaries] = useState<Dictionaries | null>(null);
  const [form] = Form.useForm();
  const [deliveryForm] = Form.useForm();

  useEffect(() => {
    loadReferenceData();
    loadData();
  }, []);

  const loadReferenceData = async () => {
    try {
      const [memberData, weekData, dictData] = await Promise.all([
        memberApi.getList({ page_size: 100 }),
        weekApi.getList({ page_size: 50 }),
        dictionaryApi.getAll(),
      ]);
      setMembers(memberData.items);
      setWeeks(weekData.items);
      setDictionaries(dictData);
    } catch (error) {
      console.error('加载参考数据失败:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await taskApi.getList({
        ...filters,
        page: pagination.current,
        page_size: pagination.pageSize,
      });
      setData(result.items);
      setPagination((prev) => ({ ...prev, total: result.total }));
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    loadData();
  };

  const handleTableChange = (paginationConfig: any) => {
    setPagination((prev) => ({
      ...prev,
      current: paginationConfig.current,
      pageSize: paginationConfig.pageSize,
    }));
    loadData();
  };

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    const currentWeekId = weeks.find((w) => w.status === 'current')?.id;
    if (currentWeekId) {
      form.setFieldValue('week_id', currentWeekId);
    }
    setModalVisible(true);
  };

  const handleEdit = (record: Task) => {
    setEditingId(record.id);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      task_type: record.task_type,
      difficulty: record.difficulty,
      assignee_id: record.assignee_id,
      collaborator_ids: record.collaborator_ids,
      week_id: record.week_id,
      deadline: record.deadline,
      delivery_requirement: record.delivery_requirement,
    });
    setModalVisible(true);
  };

  const handleView = async (record: Task) => {
    try {
      const detail = await taskApi.getById(record.id);
      setSelectedTask(detail);
      setDetailVisible(true);
    } catch (error) {
      message.error('加载详情失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data: TaskCreate = {
        ...values,
        deadline: values.deadline.format('YYYY-MM-DD'),
      };
      if (editingId) {
        await taskApi.update(editingId, data);
        message.success('更新成功');
      } else {
        await taskApi.create(data);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadData();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await taskApi.delete(id);
      message.success('删除成功');
      loadData();
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await taskApi.updateStatus(id, status);
      message.success('状态更新成功');
      loadData();
    } catch (error) {
      message.error('状态更新失败');
    }
  };

  const handleSubmitDelivery = async () => {
    if (!selectedTask) return;
    try {
      const values = await deliveryForm.validateFields();
      await taskApi.createDelivery(selectedTask.id, {
        ...values,
        task_id: selectedTask.id,
        submitter_id: selectedTask.assignee_id,
      } as DeliveryCreate);
      message.success('成果提交成功');
      setDeliveryModalVisible(false);
      deliveryForm.resetFields();
      // 刷新详情
      const detail = await taskApi.getById(selectedTask.id);
      setSelectedTask(detail);
    } catch (error) {
      message.error('提交失败');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      not_started: 'default',
      in_progress: 'processing',
      submitted: 'warning',
      need_revision: 'error',
      completed: 'success',
      overdue: 'red',
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      not_started: '未开始',
      in_progress: '进行中',
      submitted: '已提交',
      need_revision: '需修改',
      completed: '已完成',
      overdue: '已延期',
    };
    return texts[status] || status;
  };

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Task) => (
        <a onClick={() => handleView(record)}>{text}</a>
      ),
    },
    {
      title: '类型',
      dataIndex: 'task_type',
      key: 'task_type',
      render: (type: string) =>
        dictionaries?.task_type?.find((t) => t.value === type)?.label || type,
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      render: (difficulty: string) => {
        const colors: Record<string, string> = { low: 'green', medium: 'orange', high: 'red' };
        return (
          <Tag color={colors[difficulty]}>
            {dictionaries?.task_difficulty?.find((t) => t.value === difficulty)?.label || difficulty}
          </Tag>
        );
      },
    },
    {
      title: '责任人',
      dataIndex: 'assignee_name',
      key: 'assignee_name',
    },
    {
      title: '周次',
      dataIndex: 'week_name',
      key: 'week_name',
    },
    {
      title: '截止时间',
      dataIndex: 'deadline',
      key: 'deadline',
      render: (date: string, record: Task) => (
        <Space>
          {date?.split('T')[0]}
          {record.is_overdue && <Tag color="red">延期</Tag>}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: Task) => (
        <Tag color={getStatusColor(record.is_overdue ? 'overdue' : status)}>
          {getStatusText(record.is_overdue ? 'overdue' : status)}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Task) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleView(record)}>
            详情
          </Button>
          {record.status !== 'completed' && (
            <>
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                编辑
              </Button>
              {record.status === 'in_progress' && (
                <Button
                  type="link"
                  size="small"
                  icon={<UploadOutlined />}
                  onClick={() => {
                    setSelectedTask(record);
                    setDeliveryModalVisible(true);
                  }}
                >
                  提交
                </Button>
              )}
              {record.status === 'not_started' && (
                <Button
                  type="link"
                  size="small"
                  onClick={() => handleStatusChange(record.id, 'in_progress')}
                >
                  开始
                </Button>
              )}
            </>
          )}
          <Popconfirm
            title="确定要删除此任务吗？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>任务管理</Title>

      <Card bordered={false} style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Input.Search
              placeholder="搜索任务名称"
              allowClear
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              onSearch={handleSearch}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="周次"
              allowClear
              style={{ width: '100%' }}
              value={filters.week_id}
              onChange={(value) => setFilters({ ...filters, week_id: value })}
            >
              {weeks.map((week) => (
                <Select.Option key={week.id} value={week.id}>
                  {week.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="责任人"
              allowClear
              style={{ width: '100%' }}
              value={filters.assignee_id}
              onChange={(value) => setFilters({ ...filters, assignee_id: value })}
            >
              {members.map((member) => (
                <Select.Option key={member.id} value={member.id}>
                  {member.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="状态"
              allowClear
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
            >
              {dictionaries?.task_status?.map((item) => (
                <Select.Option key={item.value} value={item.value}>
                  {item.label}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新建任务
            </Button>
          </Col>
        </Row>
      </Card>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        onChange={handleTableChange}
      />

      {/* 新建/编辑任务弹窗 */}
      <Modal
        title={editingId ? '编辑任务' : '新建任务'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="任务名称"
            rules={[{ required: true, message: '请输入任务名称' }]}
          >
            <Input placeholder="请输入任务名称" />
          </Form.Item>
          <Form.Item name="description" label="任务描述">
            <Input.TextArea rows={3} placeholder="请输入任务描述" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="task_type"
                label="任务类型"
                rules={[{ required: true, message: '请选择任务类型' }]}
              >
                <Select placeholder="请选择任务类型">
                  {dictionaries?.task_type?.map((item) => (
                    <Select.Option key={item.value} value={item.value}>
                      {item.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="difficulty"
                label="任务难度"
                rules={[{ required: true, message: '请选择任务难度' }]}
              >
                <Select placeholder="请选择任务难度">
                  {dictionaries?.task_difficulty?.map((item) => (
                    <Select.Option key={item.value} value={item.value}>
                      {item.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="assignee_id"
                label="责任人"
                rules={[{ required: true, message: '请选择责任人' }]}
              >
                <Select placeholder="请选择责任人">
                  {members.map((member) => (
                    <Select.Option key={member.id} value={member.id}>
                      {member.name} - {member.unit}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="week_id"
                label="所属周次"
                rules={[{ required: true, message: '请选择周次' }]}
              >
                <Select placeholder="请选择周次">
                  {weeks.map((week) => (
                    <Select.Option key={week.id} value={week.id}>
                      {week.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="deadline"
                label="截止时间"
                rules={[{ required: true, message: '请选择截止时间' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="delivery_requirement"
            label="交付物要求"
            rules={[{ required: true, message: '请输入交付物要求' }]}
          >
            <Input.TextArea rows={2} placeholder="请明确需要提交什么成果" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 任务详情抽屉 */}
      <Drawer
        title="任务详情"
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={700}
        extra={
          selectedTask?.status === 'in_progress' && (
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setDeliveryModalVisible(true)}
            >
              提交成果
            </Button>
          )
        }
      >
        {selectedTask && (
          <>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="任务名称" span={2}>
                {selectedTask.name}
              </Descriptions.Item>
              <Descriptions.Item label="任务类型">
                {dictionaries?.task_type?.find((t) => t.value === selectedTask.task_type)?.label}
              </Descriptions.Item>
              <Descriptions.Item label="难度">
                {dictionaries?.task_difficulty?.find((t) => t.value === selectedTask.difficulty)?.label}
              </Descriptions.Item>
              <Descriptions.Item label="责任人">{selectedTask.assignee_name}</Descriptions.Item>
              <Descriptions.Item label="所属周次">{selectedTask.week_name}</Descriptions.Item>
              <Descriptions.Item label="截止时间">
                {selectedTask.deadline?.split('T')[0]}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={getStatusColor(selectedTask.is_overdue ? 'overdue' : selectedTask.status)}>
                  {getStatusText(selectedTask.is_overdue ? 'overdue' : selectedTask.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="交付要求" span={2}>
                {selectedTask.delivery_requirement}
              </Descriptions.Item>
              <Descriptions.Item label="任务描述" span={2}>
                {selectedTask.description || '无'}
              </Descriptions.Item>
            </Descriptions>

            {selectedTask.deliveries && selectedTask.deliveries.length > 0 && (
              <>
                <Title level={5} style={{ marginTop: 24 }}>
                  成果记录
                </Title>
                <Timeline
                  items={selectedTask.deliveries.map((d) => ({
                    color: d.is_latest ? 'blue' : 'gray',
                    children: (
                      <div>
                        <Text strong>{d.name}</Text>
                        <br />
                        <Text type="secondary">{d.description}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          提交人: {d.submitter_name} | 时间:{' '}
                          {d.submitted_at?.replace('T', ' ').split('.')[0]}
                          {d.is_latest && <Tag color="blue" style={{ marginLeft: 8 }}>最新</Tag>}
                        </Text>
                      </div>
                    ),
                  }))}
                />
              </>
            )}

            {selectedTask.evaluations && selectedTask.evaluations.length > 0 && (
              <>
                <Title level={5} style={{ marginTop: 24 }}>
                  评价记录
                </Title>
                {selectedTask.evaluations.map((e) => (
                  <Card key={e.id} size="small" style={{ marginBottom: 8 }}>
                    <Descriptions column={2} size="small">
                      <Descriptions.Item label="评价等级">
                        <Tag color={e.level === 'excellent' ? 'gold' : 'default'}>
                          {dictionaries?.evaluation_level?.find((l) => l.value === e.level)?.label}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="最终积分">{e.final_score} 分</Descriptions.Item>
                      <Descriptions.Item label="评价意见" span={2}>
                        {e.comment}
                      </Descriptions.Item>
                      <Descriptions.Item label="评价人">{e.member_name}</Descriptions.Item>
                      <Descriptions.Item label="评价时间">
                        {e.evaluated_at?.replace('T', ' ').split('.')[0]}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                ))}
              </>
            )}
          </>
        )}
      </Drawer>

      {/* 提交成果弹窗 */}
      <Modal
        title="提交成果"
        open={deliveryModalVisible}
        onOk={handleSubmitDelivery}
        onCancel={() => {
          setDeliveryModalVisible(false);
          deliveryForm.resetFields();
        }}
      >
        <Form form={deliveryForm} layout="vertical">
          <Form.Item
            name="name"
            label="成果名称"
            rules={[{ required: true, message: '请输入成果名称' }]}
          >
            <Input placeholder="请输入成果名称" />
          </Form.Item>
          <Form.Item name="description" label="成果说明" rules={[{ required: true, message: '请输入成果说明' }]}>
            <Input.TextArea rows={3} placeholder="请详细说明成果内容" />
          </Form.Item>
          <Form.Item name="link" label="成果链接">
            <Input placeholder="请输入成果链接（网盘、GitHub等）" />
          </Form.Item>
          <Form.Item name="delivery_type" label="成果类型">
            <Select placeholder="请选择成果类型" allowClear>
              {dictionaries?.delivery_type?.map((item) => (
                <Select.Option key={item.value} value={item.value}>
                  {item.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Tasks;
