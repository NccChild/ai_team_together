/**
 * 任务管理页面 - 专班工作台风格
 */

import React, { useEffect, useState } from 'react';
import {
  Table, Button, Input, Modal, Form, Select, Tag, message, Popconfirm,
  Drawer, Descriptions, Timeline, Space, Row, Col, Badge, DatePicker
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EyeOutlined,
  CheckCircleOutlined, UploadOutlined, FilterOutlined, AppstoreOutlined, UnorderedListOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { taskApi, memberApi, weekApi, dictionaryApi } from '../api';
import type { Task, TaskCreate, Member, Week, Dictionaries, DeliveryCreate } from '../types';
import dayjs, { Dayjs } from 'dayjs';

import locale from 'antd/es/date-picker/locale/zh_CN';
import 'dayjs/locale/zh-cn';

dayjs.locale('zh-cn');

const Tasks: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

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
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [selectedWeekInfo, setSelectedWeekInfo] = useState<Week | null>(null);

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
      const params: any = {
        ...filters,
        page: pagination.current,
        page_size: pagination.pageSize,
      };
      // 成员只能看自己的任务
      if (!isAdmin && user?.id) {
        params.assignee_id = user.id;
      }
      const result = await taskApi.getList(params);
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
    setSelectedWeekInfo(null);
    form.resetFields();
    const currentWeek = weeks.find((w) => w.status === 'current');
    if (currentWeek) {
      form.setFieldValue('week_id', currentWeek.id);
      setSelectedWeekInfo(currentWeek);
    }
    setModalVisible(true);
  };

  const handleEdit = (record: Task) => {
    setEditingId(record.id);
    const weekInfo = weeks.find((w) => w.id === record.week_id) || null;
    setSelectedWeekInfo(weekInfo);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      task_type: record.task_type,
      difficulty: record.difficulty,
      assignee_id: record.assignee_id,
      collaborator_ids: record.collaborator_ids,
      week_id: record.week_id,
      deadline: record.deadline ? dayjs(record.deadline.split('T')[0]) : null,
      delivery_requirement: record.delivery_requirement,
    });
    setModalVisible(true);
  };

  // 处理周次变更，约束截止时间
  const handleWeekChange = (weekId: number | null) => {
    if (!weekId) {
      setSelectedWeekInfo(null);
      form.setFieldValue('week_id', undefined);
      return;
    }
    const week = weeks.find((w) => w.id === weekId);
    if (week) {
      // 检查当前截止时间是否在周次范围内
      const currentDeadline = form.getFieldValue('deadline');
      if (currentDeadline) {
        const deadlineDate = dayjs(currentDeadline).startOf('day');
        const weekStart = dayjs(week.start_date).startOf('day');
        const weekEnd = dayjs(week.end_date).endOf('day');
        if (deadlineDate.isBefore(weekStart) || deadlineDate.isAfter(weekEnd)) {
          form.setFieldValue('deadline', null);
          message.warning('当前截止时间不在所选周次范围内，已清空截止时间，请重新选择');
        }
      }
      setSelectedWeekInfo(week);
      form.setFieldValue('week_id', weekId);
    }
  };

  // 获取截止时间的可选范围（只能在周次范围内）
  const getDeadlineDisabledDate = (current: Dayjs) => {
    if (!selectedWeekInfo) return false;
    const weekStart = dayjs(selectedWeekInfo.start_date).startOf('day');
    const weekEnd = dayjs(selectedWeekInfo.end_date).endOf('day');
    // 截止时间只能在周次的开始和结束日期之间
    if (current.isBefore(weekStart) || current.isAfter(weekEnd)) return true;
    return false;
  };

  // 获取可选的周次列表（当前周 + 之后3周，按日期排序）
  const getSelectableWeeks = () => {
    // 1. 先按开始日期升序排列，确保时间轴是正序的
    const sortedWeeks = [...weeks].sort((a, b) =>
      dayjs(a.start_date).valueOf() - dayjs(b.start_date).valueOf()
    );
    
    // 2. 找到状态为 'current' 的当前周
    const currentWeekIndex = sortedWeeks.findIndex((w) => w.status === 'current');
    
    // 3. 兜底策略：如果因为后端数据没打 'current' 标签而找不到当前周，就按今天的时间去匹配
    if (currentWeekIndex === -1) {
      const today = dayjs();
      const matchedIndex = sortedWeeks.findIndex((w) => {
        const start = dayjs(w.start_date).startOf('day');
        const end = dayjs(w.end_date).endOf('day');
        return (today.isAfter(start) || today.isSame(start)) && (today.isBefore(end) || today.isSame(end));
      });
      
      // 如果按时间匹配到了，返回该周及后续3周
      if (matchedIndex !== -1) {
        return sortedWeeks.slice(matchedIndex, matchedIndex + 4);
      }
      // 实在找不到，就默认返回最后4个周次
      return sortedWeeks.slice(-4);
    }
    
    // 4. 正常匹配到 'current'，返回当前周加上后面的3周（共4周）
    return sortedWeeks.slice(currentWeekIndex, currentWeekIndex + 4);
  };

  // 格式化周次显示（周次名称 + 起止日期）
  const formatWeekOption = (week: Week) => {
    return week.name;
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
      // 处理 deadline，可能是 dayjs 对象或字符串
      let deadlineStr: string | undefined;
      if (values.deadline) {
        if (dayjs.isDayjs(values.deadline)) {
          deadlineStr = values.deadline.format('YYYY-MM-DD');
        } else if (typeof values.deadline === 'string') {
          deadlineStr = values.deadline.includes('T') ? values.deadline.split('T')[0] : values.deadline;
        }
      }
      const data: TaskCreate = {
        ...values,
        deadline: deadlineStr,
      };
      if (editingId) {
        await taskApi.update(editingId, data);
        message.success('更新成功');
      } else {
        await taskApi.create(data);
        message.success('创建成功');
      }
      setModalVisible(false);
      setSelectedWeekInfo(null);
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
        submitter_id: user?.id || selectedTask.assignee_id,
      } as DeliveryCreate);
      message.success('成果提交成功');
      setDeliveryModalVisible(false);
      deliveryForm.resetFields();
      const detail = await taskApi.getById(selectedTask.id);
      setSelectedTask(detail);
      loadData(); // 刷新主列表，使状态同步更新
    } catch (error) {
      message.error('提交失败');
    }
  };

  const getStatusConfig = (status: string, isOverdue: boolean, record?: Task) => {
    const configs: Record<string, any> = {
      not_started: { color: 'bg-gray-100 text-gray-600', label: '未开始' },
      in_progress: { color: 'bg-blue-100 text-blue-600', label: '进行中' },
      submitted: { color: 'bg-orange-100 text-orange-600', label: '已提交' },
      need_revision: { color: 'bg-red-100 text-red-600', label: '需修改' },
      completed: { color: 'bg-green-100 text-green-600', label: '已完成' },
    };
    if (isOverdue && status !== 'completed') {
      return { color: 'bg-red-100 text-red-600', label: '已延期' };
    }
    return configs[status] || { color: 'bg-gray-100 text-gray-600', label: status };
  };

  const getDifficultyConfig = (difficulty: string) => {
    const configs: Record<string, any> = {
      low: { color: 'bg-green-100 text-green-600', label: '低' },
      medium: { color: 'bg-orange-100 text-orange-600', label: '中' },
      high: { color: 'bg-red-100 text-red-600', label: '高' },
    };
    return configs[difficulty] || { color: 'bg-gray-100 text-gray-600', label: difficulty };
  };

  const getTaskTypeConfig = (type: string) => {
    const configs: Record<string, any> = {
      key_task: { color: 'bg-[#E8F5E9] text-[#006D4E]', label: '重点攻关' },
      support_task: { color: 'bg-purple-100 text-purple-600', label: '支撑服务' },
      skill_task: { color: 'bg-blue-100 text-blue-600', label: '能力提升' },
      temp_task: { color: 'bg-gray-100 text-gray-600', label: '临时协同' },
    };
    return configs[type] || { color: 'bg-gray-100 text-gray-600', label: type };
  };

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Task) => (
        <div>
          <div className="font-medium text-gray-800 hover:text-[#006D4E] cursor-pointer" onClick={() => handleView(record)}>
            {text}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {dictionaries?.task_type?.find((t) => t.value === record.task_type)?.label}
          </div>
        </div>
      ),
    },
    {
      title: '责任人',
      dataIndex: 'assignee_name',
      key: 'assignee_name',
      width: 100,
    },
    {
      title: '截止时间',
      dataIndex: 'deadline',
      key: 'deadline',
      width: 120,
      render: (date: string, record: Task) => (
        <div className={record.is_overdue ? 'text-red-500' : 'text-gray-600'}>
          {date?.split('T')[0]}
          {record.is_overdue && <Tag className="ml-1 bg-red-100 text-red-600 border-0">延期</Tag>}
        </div>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: any, record: Task) => {
        const config = getStatusConfig(record.status, record.is_overdue, record);
        return (
          <Tag className={`${config.color} border-0 rounded-full`}>
            {config.label}
          </Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: isAdmin ? 180 : 200,
      render: (_: any, record: Task) => (
        <Space size="small">
          <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => handleView(record)}>
            详情
          </Button>
          {isAdmin ? (
            <>
              {record.status !== 'completed' && (
                <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                  编辑
                </Button>
              )}
              <Popconfirm title="确定要删除此任务吗？" onConfirm={() => handleDelete(record.id)}>
                <Button type="text" size="small" danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            </>
          ) : (
            <>
              {['in_progress', 'submitted', 'need_revision'].includes(record.status) && (
                <Button type="text" size="small" icon={<UploadOutlined />} onClick={() => { setSelectedTask(record); setDeliveryModalVisible(true); }}>
                  提交成果
                </Button>
              )}
              {record.status === 'not_started' && (
                <Button type="text" size="small" onClick={() => handleStatusChange(record.id, 'in_progress')} className="text-blue-500">
                  开始
                </Button>
              )}
              {record.status === 'submitted' && (
                <Popconfirm
                  title="确认提前完成此任务？完成后可以继续上传成果"
                  onConfirm={() => handleStatusChange(record.id, 'completed')}
                >
                  <Button type="default" size="small" icon={<CheckCircleOutlined />} className="text-green-600 border-green-500">
                    提前完成
                  </Button>
                </Popconfirm>
              )}
              {record.status === 'in_progress' && (
                <Button type="default" size="small" icon={<CheckCircleOutlined />} disabled className="text-gray-300 border-gray-300">
                  提前完成
                </Button>
              )}
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">任务中心</h2>
          <p className="text-sm text-gray-500 mt-1">
            {isAdmin ? '管理团队所有任务，跟踪进度和交付' : '查看我的任务，提交成果和完成任务'}
          </p>
        </div>
        {isAdmin && (
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            className="bg-[#006D4E] rounded-full hover:bg-[#005A40]"
            onClick={handleAdd}
          >
            新建任务
          </Button>
        )}
      </div>

      {/* 筛选工具栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-4 flex-wrap">
          <Input.Search
            placeholder="搜索任务名称"
            className="w-64"
            value={filters.keyword}
            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
            onSearch={handleSearch}
            prefix={<SearchOutlined className="text-gray-400" />}
          />
          <Select
            placeholder="周次"
            className="w-40"
            allowClear
            value={filters.week_id}
            onChange={(value) => setFilters({ ...filters, week_id: value })}
          >
            {weeks.map((week) => (
              <Select.Option key={week.id} value={week.id}>{week.name}</Select.Option>
            ))}
          </Select>
          <Select
            placeholder="责任人"
            className="w-36"
            allowClear
            value={filters.assignee_id}
            onChange={(value) => setFilters({ ...filters, assignee_id: value })}
          >
            {members.map((member) => (
              <Select.Option key={member.id} value={member.id}>{member.name}</Select.Option>
            ))}
          </Select>
          <Select
            placeholder="状态"
            className="w-32"
            allowClear
            value={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value })}
          >
            {dictionaries?.task_status?.map((item) => (
              <Select.Option key={item.value} value={item.value}>{item.label}</Select.Option>
            ))}
          </Select>
          <Button icon={<FilterOutlined />} onClick={handleSearch}>筛选</Button>
          <div className="flex-1" />
          <Space>
            <Badge count={pagination.total} showZero color="#006D4E">
              <span className="text-gray-500 text-sm">共 {pagination.total} 个任务</span>
            </Badge>
          </Space>
        </div>
      </div>

      {/* 任务列表 */}
      <div className="bg-white rounded-xl shadow-sm">
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            className: 'px-4'
          }}
          onChange={handleTableChange}
          className="task-table"
        />
      </div>

      {/* 新建/编辑任务弹窗 */}
      <Modal
        title={editingId ? '编辑任务' : '新建任务'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={700}
        className="rounded-xl"
        okText="确认"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="name" label="任务名称" rules={[{ required: true, message: '请输入任务名称' }]}>
            <Input placeholder="请输入任务名称" />
          </Form.Item>
          <Form.Item name="description" label="任务描述">
            <Input.TextArea rows={3} placeholder="请输入任务描述" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="task_type" label="任务类型" rules={[{ required: true, message: '请选择任务类型' }]}>
                <Select placeholder="请选择任务类型">
                  {dictionaries?.task_type?.map((item) => (
                    <Select.Option key={item.value} value={item.value}>{item.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="difficulty" label="任务难度" rules={[{ required: true, message: '请选择任务难度' }]}>
                <Select placeholder="请选择任务难度">
                  {dictionaries?.task_difficulty?.map((item) => (
                    <Select.Option key={item.value} value={item.value}>{item.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="assignee_id" label="责任人" rules={[{ required: true, message: '请选择责任人' }]}>
                <Select placeholder="请选择责任人">
                  {members.map((member) => (
                    <Select.Option key={member.id} value={member.id}>{member.name} - {member.unit}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="week_id" label="所属周次" rules={[{ required: true, message: '请选择周次' }]}>
                <Select placeholder="请选择周次" onChange={handleWeekChange}>
                  {getSelectableWeeks().map((week) => (
                    <Select.Option key={week.id} value={week.id}>{formatWeekOption(week)}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="deadline" label="截止时间" rules={[{ required: true, message: '请选择截止时间' }]}
            tooltip="截止时间必须在所选周次的范围内">
            <DatePicker
              className="w-full"
              placeholder="请选择截止时间"
              disabledDate={getDeadlineDisabledDate}
              format="YYYY-MM-DD"
            />
          </Form.Item>
          <Form.Item name="delivery_requirement" label="交付物要求" rules={[{ required: true, message: '请输入交付物要求' }]}>
            <Input.TextArea rows={2} placeholder="请明确需要提交什么成果" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 任务详情抽屉 */}
      <Drawer
        title="任务详情"
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={600}
        className="task-drawer"
        extra={
          !isAdmin && selectedTask && ['not_started', 'in_progress', 'submitted'].includes(selectedTask.status) && (
            <Button type="primary" icon={<UploadOutlined />} onClick={() => setDeliveryModalVisible(true)}>
              提交成果
            </Button>
          )
        }
      >
        {selectedTask && (
          <>
            <Descriptions column={2} bordered size="small" className="mb-6">
              <Descriptions.Item label="任务名称" span={2}>{selectedTask.name}</Descriptions.Item>
              <Descriptions.Item label="任务类型">
                <Tag className={`${getTaskTypeConfig(selectedTask.task_type).color} border-0`}>
                  {dictionaries?.task_type?.find((t) => t.value === selectedTask.task_type)?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="难度">
                <Tag className={`${getDifficultyConfig(selectedTask.difficulty).color} border-0`}>
                  {dictionaries?.task_difficulty?.find((t) => t.value === selectedTask.difficulty)?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="责任人">{selectedTask.assignee_name}</Descriptions.Item>
              <Descriptions.Item label="所属周次">{selectedTask.week_name}</Descriptions.Item>
              <Descriptions.Item label="截止时间">
                <span className={selectedTask.is_overdue ? 'text-red-500' : ''}>
                  {selectedTask.deadline?.split('T')[0]}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag className={`${getStatusConfig(selectedTask.status, selectedTask.is_overdue).color} border-0 rounded-full`}>
                  {getStatusConfig(selectedTask.status, selectedTask.is_overdue).label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="交付要求" span={2}>{selectedTask.delivery_requirement}</Descriptions.Item>
              <Descriptions.Item label="任务描述" span={2}>{selectedTask.description || '无'}</Descriptions.Item>
            </Descriptions>

            {selectedTask.deliveries && selectedTask.deliveries.length > 0 && (
              <>
                <h4 className="font-semibold text-gray-800 mb-3">成果记录</h4>
                <Timeline
                  items={selectedTask.deliveries.map((d) => ({
                    color: d.is_latest ? 'green' : 'gray',
                    children: (
                      <div>
                        <div className="font-medium">{d.name}</div>
                        <div className="text-sm text-gray-500">{d.description}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          提交人: {d.submitter_name} | 时间: {d.submitted_at?.replace('T', ' ').split('.')[0]}
                          {d.is_latest && <Tag className="ml-2 bg-green-100 text-green-600 border-0">最新</Tag>}
                        </div>
                      </div>
                    ),
                  }))}
                />
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
        onCancel={() => { setDeliveryModalVisible(false); deliveryForm.resetFields(); }}
      >
        <Form form={deliveryForm} layout="vertical" className="mt-4">
          <Form.Item name="name" label="成果名称" rules={[{ required: true, message: '请输入成果名称' }]}>
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
                <Select.Option key={item.value} value={item.value}>{item.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Tasks;
