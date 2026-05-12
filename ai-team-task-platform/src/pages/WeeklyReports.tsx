/**
 * 周报分析页面
 */

import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Form, Input, Button, Table, Tag, Modal, message, Select, Space, Divider } from 'antd';
import { FileTextOutlined, RocketOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { weeklyReportApi, memberApi, weekApi } from '../api';
import type { WeeklyReport, Member, Week } from '../types';

const { TextArea } = Input;

// 森林绿主题色
const colors = {
  primary: '#006D4E',
  secondary: '#26A67A',
  warning: '#fa8c16',
  success: '#52c41a',
};

const WeeklyReports: React.FC = () => {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [form] = Form.useForm();
  const [selectedWeekId, setSelectedWeekId] = useState<number | undefined>(undefined);

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    if (selectedWeekId !== undefined) {
      loadData(selectedWeekId);
    }
  }, [selectedWeekId]);

  const loadReferenceData = async () => {
    try {
      const [memberData, weekData] = await Promise.all([
        memberApi.getList({ page_size: 100 }),
        weekApi.getList({ page_size: 50 }),
      ]);
      setMembers(memberData.items || []);
      setWeeks(weekData.items || []);
      // 设置默认周次
      const current = (weekData.items || []).find((w) => w.status === 'current');
      if (current) {
        form.setFieldsValue({ week_id: current.id });
        setSelectedWeekId(current.id);
      } else if ((weekData.items || []).length > 0) {
        setSelectedWeekId(weekData.items[0].id);
      }
    } catch (error) {
      console.error('加载参考数据失败:', error);
      message.error('加载参考数据失败');
    }
  };

  const loadData = async (weekId?: number) => {
    setLoading(true);
    try {
      const result = await weeklyReportApi.getList({ week_id: weekId, page_size: 100 });
      setReports(result.items || []);
    } catch (error) {
      console.error('加载周报失败:', error);
      message.error('加载周报失败');
    } finally {
      setLoading(false);
    }
  };

  const handleWeekChange = (value: number) => {
    setSelectedWeekId(value);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await weeklyReportApi.create(values as any);
      message.success('周报提交成功');
      setModalVisible(false);
      form.resetFields();
      loadData(selectedWeekId);
    } catch (error) {
      console.error('提交失败:', error);
      message.error('提交失败');
    }
  };

  const handleAnalyze = async (report: WeeklyReport) => {
    setSelectedReport(report);
    setDetailVisible(true);
    if (!report.has_analysis) {
      setAnalyzing(true);
      try {
        await weeklyReportApi.analyze(report.id);
        message.success('分析完成');
        const updated = await weeklyReportApi.getById(report.id);
        setSelectedReport(updated);
      } catch (error) {
        console.error('分析失败:', error);
        message.error('分析失败');
      } finally {
        setAnalyzing(false);
      }
    }
  };

  const getInitial = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  const columns = [
    {
      title: '成员',
      dataIndex: 'member_name',
      key: 'member_name',
      render: (name: string | null | undefined) => (
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold text-sm mr-2">
            {getInitial(name)}
          </div>
          <span className="font-medium">{name || '-'}</span>
        </div>
      ),
    },
    {
      title: '周次',
      dataIndex: 'week_name',
      key: 'week_name',
      render: (text: string | null | undefined) => text || '-',
    },
    {
      title: '本周工作',
      dataIndex: 'work_content',
      key: 'work_content',
      ellipsis: true,
      render: (text: string | null | undefined) => text || '-',
    },
    {
      title: '主要成果',
      dataIndex: 'main_results',
      key: 'main_results',
      ellipsis: true,
      render: (text: string | null | undefined) => text || '-',
    },
    {
      title: '状态',
      key: 'status',
      render: (_: any, record: WeeklyReport) => (
        record.has_analysis ? (
          <Tag
            className="rounded-full px-3"
            style={{ backgroundColor: '#f6ffed', borderColor: colors.success, color: colors.success }}
          >
            已分析
          </Tag>
        ) : (
          <Tag
            className="rounded-full px-3"
            style={{ backgroundColor: '#fff7e6', borderColor: colors.warning, color: colors.warning }}
          >
            待分析
          </Tag>
        )
      ),
    },
    {
      title: '提交时间',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      render: (date: string | null | undefined) => {
        if (!date) return '-';
        const formatted = date.replace('T', ' ').split('.')[0];
        return <span className="text-gray-500 text-sm">{formatted}</span>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: WeeklyReport) => (
        <Button
          type="primary"
          size="small"
          className="rounded-full"
          icon={record.has_analysis ? <RocketOutlined /> : <FileTextOutlined />}
          onClick={() => handleAnalyze(record)}
        >
          {record.has_analysis ? '查看' : '分析'}
        </Button>
      ),
    },
  ];

  // 统计数据
  const stats = {
    total: reports.length,
    analyzed: reports.filter(r => r?.has_analysis).length,
    pending: reports.filter(r => !r?.has_analysis).length,
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">周报分析</h2>
          <p className="text-gray-500 mt-1">查看团队成员周报并进行智能分析</p>
        </div>
        <Button
          type="primary"
          icon={<FileTextOutlined />}
          className="rounded-full"
          onClick={() => setModalVisible(true)}
          style={{ backgroundColor: colors.primary }}
        >
          提交周报
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">周报总数</p>
              <span className="text-3xl font-bold" style={{ color: colors.primary }}>
                {stats.total}
              </span>
            </div>
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-emerald-100 text-emerald-600">
              <FileTextOutlined />
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">已分析</p>
              <span className="text-3xl font-bold" style={{ color: colors.success }}>
                {stats.analyzed}
              </span>
            </div>
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-green-100 text-green-600">
              <CheckCircleOutlined />
            </div>
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">待分析</p>
              <span className="text-3xl font-bold" style={{ color: colors.warning }}>
                {stats.pending}
              </span>
            </div>
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-amber-100 text-amber-600">
              <ExclamationCircleOutlined />
            </div>
          </div>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <Form form={form} layout="inline">
          <Form.Item name="week_id" className="mb-0">
            <Select
              placeholder="选择周次"
              value={selectedWeekId}
              onChange={handleWeekChange}
              style={{ width: 200 }}
            >
              {weeks.map((week) => (
                <Select.Option key={week.id} value={week.id}>
                  {week.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </div>

      {/* 周报列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center mb-4">
          <div
            className="w-1 h-6 rounded-full mr-3"
            style={{ backgroundColor: colors.primary }}
          />
          <h3 className="text-lg font-semibold text-gray-800">周报列表</h3>
        </div>

        <Table
          columns={columns}
          dataSource={reports}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: '暂无周报数据' }}
        />
      </div>

      {/* 提交周报弹窗 */}
      <Modal
        title={
          <div className="flex items-center">
            <FileTextOutlined className="mr-2" style={{ color: colors.primary }} />
            <span>提交周报</span>
          </div>
        }
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        width={700}
        className="rounded-xl"
        okButtonProps={{ className: 'rounded-full' }}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="week_id"
                label="周次"
                rules={[{ required: true, message: '请选择周次' }]}
              >
                <Select placeholder="请选择周次" className="rounded-lg">
                  {weeks.map((week) => (
                    <Select.Option key={week.id} value={week.id}>
                      {week.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="member_id"
                label="成员"
                rules={[{ required: true, message: '请选择成员' }]}
              >
                <Select placeholder="请选择成员" className="rounded-lg">
                  {members.map((member) => (
                    <Select.Option key={member.id} value={member.id}>
                      {member.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="work_content" label="本周工作">
            <TextArea rows={4} placeholder="请详细描述本周完成的工作内容" className="rounded-lg" />
          </Form.Item>
          <Form.Item name="main_results" label="主要成果">
            <TextArea rows={3} placeholder="请列出本周的主要成果和交付物" className="rounded-lg" />
          </Form.Item>
          <Form.Item name="problems" label="存在问题">
            <TextArea rows={2} placeholder="如有阻塞、困难或风险请说明" className="rounded-lg" />
          </Form.Item>
          <Form.Item name="next_week_plan" label="下周计划">
            <TextArea rows={2} placeholder="请列出下周的工作计划" className="rounded-lg" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 周报分析详情弹窗 */}
      <Modal
        title={
          <div className="flex items-center">
            <RocketOutlined className="mr-2" style={{ color: colors.primary }} />
            <span>周报分析</span>
          </div>
        }
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setSelectedReport(null);
        }}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)} className="rounded-full">
            关闭
          </Button>,
          !selectedReport?.has_analysis && (
            <Button
              key="analyze"
              type="primary"
              icon={<RocketOutlined />}
              loading={analyzing}
              onClick={() => selectedReport && handleAnalyze(selectedReport)}
              className="rounded-full"
              style={{ backgroundColor: colors.primary }}
            >
              重新分析
            </Button>
          ),
        ]}
        width={800}
        className="rounded-xl"
      >
        {selectedReport && (
          <div className="mt-4">
            {/* 基本信息 */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <Row gutter={16}>
                <Col span={6}>
                  <p className="text-gray-500 text-sm">成员</p>
                  <p className="font-semibold">{selectedReport.member_name || '-'}</p>
                </Col>
                <Col span={6}>
                  <p className="text-gray-500 text-sm">周次</p>
                  <p className="font-semibold">{selectedReport.week_name || '-'}</p>
                </Col>
                <Col span={6}>
                  <p className="text-gray-500 text-sm">提交时间</p>
                  <p className="font-semibold text-sm">
                    {selectedReport.submitted_at?.replace('T', ' ').split('.')[0] || '-'}
                  </p>
                </Col>
                <Col span={6}>
                  <p className="text-gray-500 text-sm">分析状态</p>
                  <Tag
                    className="rounded-full px-3"
                    style={{
                      backgroundColor: selectedReport.has_analysis ? '#f6ffed' : '#fff7e6',
                      borderColor: selectedReport.has_analysis ? colors.success : colors.warning,
                      color: selectedReport.has_analysis ? colors.success : colors.warning,
                    }}
                  >
                    {selectedReport.has_analysis ? '已分析' : '待分析'}
                  </Tag>
                </Col>
              </Row>
            </div>

            {/* 周报内容 */}
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-2">本周工作</h4>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                {selectedReport.work_content || '暂无'}
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-2">主要成果</h4>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                {selectedReport.main_results || '暂无'}
              </div>
            </div>

            {/* 分析结果 */}
            {selectedReport.analysis && (
              <>
                <Divider>分析结果</Divider>

                {selectedReport.analysis.contribution_summary && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-700 mb-2 flex items-center">
                      <CheckCircleOutlined className="mr-2" style={{ color: colors.success }} />
                      贡献摘要
                    </h4>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      {selectedReport.analysis.contribution_summary}
                    </div>
                  </div>
                )}

                {selectedReport.analysis.risk_alerts && selectedReport.analysis.risk_alerts.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-700 mb-2 flex items-center">
                      <ExclamationCircleOutlined className="mr-2" style={{ color: colors.warning }} />
                      风险提示
                    </h4>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <ul className="list-disc pl-5 space-y-1">
                        {selectedReport.analysis.risk_alerts.map((alert, i) => (
                          <li key={i}>{alert}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {selectedReport.analysis.problems_found && selectedReport.analysis.problems_found.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-700 mb-2">存在问题</h4>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <ul className="list-disc pl-5 space-y-1 text-red-700">
                        {selectedReport.analysis.problems_found.map((problem, i) => (
                          <li key={i}>{problem}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </>
            )}

            {!selectedReport.has_analysis && (
              <div className="text-center py-8">
                <RocketOutlined className="text-4xl text-gray-300 mb-4" />
                <p className="text-gray-500">暂无分析结果</p>
                <Button
                  type="primary"
                  icon={<RocketOutlined />}
                  loading={analyzing}
                  onClick={() => handleAnalyze(selectedReport)}
                  className="rounded-full mt-4"
                  style={{ backgroundColor: colors.primary }}
                >
                  立即分析
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default WeeklyReports;