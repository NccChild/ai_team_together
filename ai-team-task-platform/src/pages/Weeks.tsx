/**
 * 周计划页面
 */

import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Card, Typography, Row, Col, Tag, DatePicker, Modal, Form, Input, message, Statistic } from 'antd';
import { PlusOutlined, DownloadOutlined, CalendarOutlined } from '@ant-design/icons';
import { weekApi, taskApi, exportApi } from '../api';
import TaskDetailDrawer from '../components/TaskDetailDrawer';
import type { Week, Task, WeekSummary } from '../types';
import dayjs from 'dayjs';

const { Title } = Typography;

const Weeks: React.FC = () => {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<WeekSummary | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [drawerTaskId, setDrawerTaskId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    loadWeeks();
  }, []);

  const loadWeeks = async () => {
    setLoading(true);
    try {
      console.log('开始加载周次数据...');
      const result = await weekApi.getList({ page_size: 50 });
      console.log('周次数据:', result);
      setWeeks(result.items);
      // 默认选中当前周
      const current = result.items.find((w) => w.status === 'current');
      if (current) {
        selectWeek(current);
      } else if (result.items.length > 0) {
        selectWeek(result.items[0]);
      } else {
        message.info('暂无周次数据，请创建周次');
      }
    } catch (error: any) {
      console.error('加载周次失败:', error);
      message.error('加载周次失败: ' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const selectWeek = async (week: Week) => {
    setSelectedWeek(week);
    try {
      console.log('加载周次任务:', week.id);
      const [taskData, summaryData] = await Promise.all([
        weekApi.getTasks(week.id),
        weekApi.getSummary(week.id),
      ]);
      console.log('任务数据:', taskData);
      console.log('汇总数据:', summaryData);
      setTasks(taskData.items);
      setSummary(summaryData);
    } catch (error: any) {
      console.error('加载周任务失败:', error);
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      not_started: 'default',
      in_progress: 'processing',
      submitted: 'warning',
      need_revision: 'error',
      completed: 'success',
    };
    return colors[status] || 'default';
  };

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Task) => (
        <a onClick={() => { setDrawerTaskId(record.id); setDrawerOpen(true); }}>{text}</a>
      ),
    },
    {
      title: '类型',
      dataIndex: 'task_type',
      key: 'task_type',
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
      render: (date: string, record: Task) => {
        return (
          <Space>
            {date?.split('T')[0]}
            {record.is_overdue && <Tag color="red">延期</Tag>}
          </Space>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {{ not_started: '未开始', in_progress: '进行中', submitted: '已提交', need_revision: '需修改', completed: '已完成' }[status] || status}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>周计划</Title>

      {weeks.length === 0 && !loading ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ fontSize: 16, color: '#999', marginBottom: 16 }}>
              暂无周次数据
            </p>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
              创建第一个周次
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card bordered={false} style={{ background: '#e6f7ff' }}>
                <Statistic
                  title="本周任务总数"
                  value={summary?.total_tasks || 0}
                  prefix={<CalendarOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card bordered={false} style={{ background: '#f6ffed' }}>
                <Statistic
                  title="已完成"
                  value={summary?.completed_tasks || 0}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card bordered={false} style={{ background: '#fffbe6' }}>
                <Statistic title="延期任务" value={summary?.overdue_tasks || 0} valueStyle={{ color: '#faad14' }} />
              </Card>
            </Col>
            <Col span={6}>
              <Card bordered={false} style={{ background: '#fff7e6' }}>
                <Statistic title="总积分" value={summary?.total_score || 0} valueStyle={{ color: '#fa8c16' }} />
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col>
              <Space>
                {weeks.slice(0, 8).map((week) => (
                  <Button
                    key={week.id}
                    type={selectedWeek?.id === week.id ? 'primary' : 'default'}
                    onClick={() => selectWeek(week)}
                  >
                    {week.name}
                  </Button>
                ))}
                <Button icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
                  创建周次
                </Button>
              </Space>
            </Col>
            <Col style={{ marginLeft: 'auto' }}>
              <Space>
                <Button icon={<DownloadOutlined />} onClick={() => selectedWeek && exportApi.exportWeekPlan(selectedWeek.id)}>
                  导出周计划
                </Button>
                <Button icon={<DownloadOutlined />} onClick={() => selectedWeek && exportApi.exportWeekEvaluation(selectedWeek.id)}>
                  导出评价汇总
                </Button>
              </Space>
            </Col>
          </Row>

          <Table
            columns={columns}
            dataSource={tasks}
            rowKey="id"
            loading={loading}
            pagination={false}
          />

          <Modal
            title="创建周次"
            open={modalVisible}
            onOk={handleCreate}
            onCancel={() => {
              setModalVisible(false);
              form.resetFields();
            }}
          >
            <Form form={form} layout="vertical">
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

          <TaskDetailDrawer
            taskId={drawerTaskId}
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
          />
        </>
      )}
    </div>
  );
};

export default Weeks;
