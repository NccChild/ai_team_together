/**
 * 周计划页面 - 专班工作台风格
 */

import React, { useEffect, useState } from 'react';
import { Table, Button, Card, Tag, message, Row, Col, Modal, Form, Input, DatePicker, Statistic, Space, Badge, Dropdown } from 'antd';
import {
  PlusOutlined, DownloadOutlined, CalendarOutlined, CheckCircleOutlined,
  WarningOutlined, TrophyOutlined, DownOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { weekApi, exportApi } from '../api';
import type { Week, Task, WeekSummary } from '../types';
import dayjs from 'dayjs';

import isoWeek from 'dayjs/plugin/isoWeek';
dayjs.extend(isoWeek);

const Weeks: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<WeekSummary | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [batchForm] = Form.useForm();
  const [generating, setGenerating] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadWeeks();
  }, []);

  const loadWeeks = async () => {
    setLoading(true);
    try {
      const result = await weekApi.getList({ page_size: 50 });
      
      // 1. 按照时间“从前到后”（正序）进行初始排列
      const sortedWeeks = (result.items || []).sort((a, b) => 
        dayjs(a.start_date).valueOf() - dayjs(b.start_date).valueOf()
      );

      setWeeks(sortedWeeks);

      // 2. 智能寻找最适合当前显示的周次（优先显示状态为 current 的周）
      const todayStr = dayjs().format('YYYY-MM-DD');
      let defaultWeek = sortedWeeks.find((w) => w.status === 'current');
      
      // 兜底：如果后端没打 current 标签，拿今天日期去匹配
      if (!defaultWeek) {
        defaultWeek = sortedWeeks.find(w => todayStr >= w.start_date && todayStr <= w.end_date);
      }
      
      // 再次兜底：如果今天不在任何范围内，默认看第一条
      if (!defaultWeek && sortedWeeks.length > 0) {
        defaultWeek = sortedWeeks[0];
      }

      if (defaultWeek) {
        selectWeek(defaultWeek);
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

  const handleBatchGenerate = async () => {
    try {
      const values = await batchForm.validateFields();
      const selectedMonth = values.month;
      if (!selectedMonth) {
        message.error('请选择月份');
        return;
      }

      setGenerating(true);

      const weeksToCreate: { name: string; start_date: string; end_date: string }[] = [];
      const startOfMonth = selectedMonth.startOf('month');
      const endOfMonth = selectedMonth.endOf('month');

      let currentWeekStart = startOfMonth.startOf('isoWeek');

      while (currentWeekStart.isBefore(endOfMonth) || currentWeekStart.isSame(endOfMonth, 'day')) {
        const weekStart = currentWeekStart;
        const weekEnd = currentWeekStart.endOf('isoWeek'); 

        if (weekStart.month() === selectedMonth.month() || weekEnd.month() === selectedMonth.month()) {
          const year = weekStart.year();
          const isoWeekNum = weekStart.isoWeek();
          
          weeksToCreate.push({
            name: `${year}年第${isoWeekNum}周 (${weekStart.format('MM/DD')}-${weekEnd.format('MM/DD')})`,
            start_date: weekStart.format('YYYY-MM-DD'),
            end_date: weekEnd.format('YYYY-MM-DD'),
          });
        }

        currentWeekStart = currentWeekStart.add(1, 'week');
      }

      if (weeksToCreate.length === 0) {
        message.warning('没有计算出符合条件的周次，请检查日期选择');
        setGenerating(false);
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const week of weeksToCreate) {
        try {
          await weekApi.create(week as any);
          successCount++;
        } catch (err) {
          console.error(`周次 [${week.name}] 创建失败:`, err);
          failCount++;
        }
      }

      if (failCount === 0) {
        message.success(`${selectedMonth.format('YYYY年MM月')}所有周次生成成功！共生成 ${successCount} 个周次`);
      } else if (successCount > 0) {
        message.warning(`生成完成。成功 ${successCount} 周，失败 ${failCount} 周（可能由于周次日期在数据库中已存在）`);
      } else {
        message.error(`生成全部失败！共 ${failCount} 周创建异常，请检查控制台或后端日志`);
      }

      setBatchModalVisible(false);
      batchForm.resetFields();
      loadWeeks();
    } catch (error) {
      message.error('特征数据计算发生异常，生成失败');
    } finally {
      setGenerating(false);
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

  // 💡 核心时间锚定与漂移切片逻辑
  const todayStr = dayjs().format('YYYY-MM-DD');
  let currentIndex = weeks.findIndex(w => w.status === 'current');
  
  if (currentIndex === -1) {
    currentIndex = weeks.findIndex(w => todayStr >= w.start_date && todayStr <= w.end_date);
  }
  if (currentIndex === -1) currentIndex = 0;

  // 始终将当前周（或离今天最近的周）作为前排第 1 个，最多往后延展显示 4 个按钮
  const visibleWeeks = weeks.slice(currentIndex, currentIndex + 4);
  
  // 历史过期周次、以及 4 周之后的远期周次，全部优雅地折叠起来
  const hiddenWeeks = [
    ...weeks.slice(0, currentIndex),
    ...weeks.slice(currentIndex + 4)
  ];

  // 校验当前被选中的周是不是正处于“折叠菜单”里面
  const isSelectedWeekHidden = selectedWeek ? hiddenWeeks.some(w => w.id === selectedWeek.id) : false;

  // 映射 Dropdown 的组件格式
  const dropdownItems = hiddenWeeks.map((week) => ({
    key: week.id.toString(),
    label: week.status === 'current' ? `✨ ${week.name} (当前)` : week.name,
    onClick: () => selectWeek(week),
  }));

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
        {isAdmin && (
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            className="bg-[#006D4E] rounded-full hover:bg-[#005A40]"
            onClick={() => setBatchModalVisible(true)}
          >
            周次生成
          </Button>
        )}
      </div>

      {/* 统计数据 */}
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

      {/* 周次标签列表 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {/* 渲染动态筛选后的 4 个当期/近期周次按钮 */}
            {visibleWeeks.map((week) => (
              <Button
                key={week.id}
                type={selectedWeek?.id === week.id ? 'primary' : 'default'}
                className={selectedWeek?.id === week.id ? 'bg-[#006D4E] border-[#006D4E]' : ''}
                onClick={() => selectWeek(week)}
              >
                {week.name} {week.status === 'current' && '(当前)'}
              </Button>
            ))}

            {/* 超出 4 个的周次（包括历史的和更远的未来周次）收纳在下拉菜单中 */}
            {hiddenWeeks.length > 0 && (
              <Dropdown menu={{ items: dropdownItems }} placement="bottomLeft">
                <Button 
                  type={isSelectedWeekHidden ? 'primary' : 'default'}
                  className={isSelectedWeekHidden ? 'bg-[#006D4E] border-[#006D4E]' : ''}
                >
                  <Space>
                    {isSelectedWeekHidden ? `当前已选: ${selectedWeek?.name}` : '查看其他周次'}
                    <DownOutlined />
                  </Space>
                </Button>
              </Dropdown>
            )}
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

      {/* 列表渲染 */}
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

      {/* 创建单周次弹窗 */}
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

      {/* 批量生成弹窗 */}
      <Modal
        title="批量生成周次"
        open={batchModalVisible}
        onOk={handleBatchGenerate}
        onCancel={() => { setBatchModalVisible(false); batchForm.resetFields(); }}
        okText="确认生成"
        cancelText="取消"
        confirmLoading={generating}
      >
        <Form form={batchForm} layout="vertical" className="mt-4">
          <Form.Item
            name="month"
            label="选择月份"
            rules={[{ required: true, message: '请选择月份' }]}
            extra="选择月份后，系统将自动计算该月包含的标准自然周并一次性生成。"
          >
            <DatePicker
              picker="month"
              style={{ width: '100%' }}
              placeholder="请选择月份"
              // 💡 核心：限制最小只能看/选当前月。这样上一年的按钮会直接变灰禁用
              minDate={dayjs().startOf('month')} 
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Weeks;