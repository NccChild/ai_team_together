/**
 * 周计划页面 - 专班工作台风格
 */

import React, { useEffect, useState } from 'react';
import { Table, Button, Card, Tag, message, Row, Col, Modal, Form, Input, DatePicker, Statistic, Space, Badge } from 'antd';
import {
  PlusOutlined, DownloadOutlined, CalendarOutlined, CheckCircleOutlined,
  WarningOutlined, TrophyOutlined, RightOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { weekApi, exportApi } from '../api';
import type { Week, Task, WeekSummary } from '../types';
import dayjs from 'dayjs';

const Weeks: React.FC = () => {
  const navigate = useNavigate();
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<WeekSummary | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadWeeks();
  }, []);

  const loadWeeks = async () => {
    setLoading(true);
    try {
      const result = await weekApi.getList({ page_size: 50 });
      setWeeks(result.items);
      const current = result.items.find((w) => w.status === 'current');
      if (current) {
        selectWeek(current);
      } else if (result.items.length > 0) {
        selectWeek(result.items[0]);
      } else {
        message.info('暂无周次数据，请创建周次');
      }
    } catch (error: any) {
      message.error('加载周次失败: ' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const selectWeek = async (week: Week) => {
    setSelectedWeek(week);
    try {
      const [taskData, summaryData] = await Promise.all([
        weekApi.getTasks(week.id),
        weekApi.getSummary(week.id),
      ]);
      setTasks(taskData.items);
      setSummary(summaryData);
    } catch (error: any) {
      message.error('加载任务失败: ' + (error.message || '未知错误'));
    }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await weekApi.create({
        ...values,
        start_date: values.dateRange[0].format('YYYY-MM-DD'),
        end_date: values.dateRange[1].format('YYYY-MM-DD'),
      } as any);
      message.success('周次创建成功');
      setModalVisible(false);
      form.resetFields();
      loadWeeks();
    } catch (error) {
      message.error('创建失败');
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, any> = {
      not_started: { color: 'bg-gray-100 text-gray-600', label: '未开始' },
      in_progress: { color: 'bg-blue-100 text-blue-600', label: '进行中' },
      submitted: { color: 'bg-orange-100 text-orange-600', label: '待评价' },
      need_revision: { color: 'bg-red-100 text-red-600', label: '需修改' },
      completed: { color: 'bg-green-100 text-green-600', label: '已完成' },
    };
    return configs[status] || { color: 'bg-gray-100 text-gray-600', label: status };
  };

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <span className="font-medium text-gray-800 hover:text-[#006D4E] cursor-pointer">
          {text}
        </span>
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
        <span className={record.is_overdue ? 'text-red-500' : 'text-gray-600'}>
          {date?.split('T')[0]}
          {record.is_overdue && <Tag className="ml-1 bg-red-100 text-red-600 border-0">延期</Tag>}
        </span>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: any, record: Task) => {
        const config = getStatusConfig(record.status);
        return (
          <Tag className={`${config.color} border-0 rounded-full`}>
            {config.label}
          </Tag>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">周计划</h2>
          <p className="text-sm text-gray-500 mt-1">管理每周任务计划，追踪完成进度</p>
        </div>
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          className="bg-[#006D4E] rounded-full hover:bg-[#005A40]"
          onClick={() => setModalVisible(true)}
        >
          创建周次
        </Button>
      </div>

      {/* 周次选择器和统计 */}
      <Row gutter={16}>
        <Col span={6}>
          <div className="bg-[#E8F5E9] rounded-xl p-5">
            <Statistic
              title={<span className="text-gray-600">本周任务总数</span>}
              value={summary?.total_tasks || 0}
              prefix={<CalendarOutlined className="text-[#006D4E]" />}
              valueStyle={{ color: '#006D4E' }}
            />
          </div>
        </Col>
        <Col span={6}>
          <div className="bg-green-50 rounded-xl p-5">
            <Statistic
              title={<span className="text-gray-600">已完成</span>}
              value={summary?.completed_tasks || 0}
              prefix={<CheckCircleOutlined className="text-green-500" />}
              valueStyle={{ color: '#52C41A' }}
            />
          </div>
        </Col>
        <Col span={6}>
          <div className="bg-orange-50 rounded-xl p-5">
            <Statistic
              title={<span className="text-gray-600">延期任务</span>}
              value={summary?.overdue_tasks || 0}
              prefix={<WarningOutlined className="text-orange-500" />}
              valueStyle={{ color: '#FA8C16' }}
            />
          </div>
        </Col>
        <Col span={6}>
          <div className="bg-amber-50 rounded-xl p-5">
            <Statistic
              title={<span className="text-gray-600">总积分</span>}
              value={summary?.total_score || 0}
              prefix={<TrophyOutlined className="text-amber-500" />}
              valueStyle={{ color: '#FA8C16' }}
              suffix="分"
            />
          </div>
        </Col>
      </Row>

      {/* 周次标签选择 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {weeks.slice(0, 8).map((week) => (
              <Button
                key={week.id}
                type={selectedWeek?.id === week.id ? 'primary' : 'default'}
                className={selectedWeek?.id === week.id ? 'bg-[#006D4E] border-[#006D4E]' : ''}
                onClick={() => selectWeek(week)}
              >
                {week.name}
              </Button>
            ))}
          </div>
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => selectedWeek && exportApi.exportWeekPlan(selectedWeek.id)}
            >
              导出周计划
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => selectedWeek && exportApi.exportWeekEvaluation(selectedWeek.id)}
            >
              导出评价汇总
            </Button>
          </Space>
        </div>
      </div>

      {/* 任务列表 */}
      <div className="bg-white rounded-xl shadow-sm">
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
        {tasks.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-400">
            暂无任务数据
          </div>
        )}
      </div>

      {/* 创建周次弹窗 */}
      <Modal
        title="创建周次"
        open={modalVisible}
        onOk={handleCreate}
        onCancel={() => { setModalVisible(false); form.resetFields(); }}
        okText="确认"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="name"
            label="周次名称"
            rules={[{ required: true, message: '请输入周次名称' }]}
          >
            <Input placeholder="例如: 2026年第20周" />
          </Form.Item>
          <Form.Item
            name="dateRange"
            label="周时间范围"
            rules={[{ required: true, message: '请选择周时间范围' }]}
          >
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Weeks;
