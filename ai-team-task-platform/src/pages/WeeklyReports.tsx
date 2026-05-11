/**
 * 周报分析页面
 */

import React, { useEffect, useState } from 'react';
import { Card, Typography, Row, Col, Form, Input, Button, Space, Table, Tag, Modal, message, Select, Descriptions, Alert } from 'antd';
import { FileTextOutlined, RocketOutlined, WarningOutlined } from '@ant-design/icons';
import { weeklyReportApi, memberApi, weekApi } from '../api';
import type { WeeklyReport, Member, Week } from '../types';

const { Title, Text } = Typography;
const { TextArea } = Input;

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

  useEffect(() => {
    loadReferenceData();
    loadData();
  }, []);

  const loadReferenceData = async () => {
    try {
      const [memberData, weekData] = await Promise.all([
        memberApi.getList({ page_size: 100 }),
        weekApi.getList({ page_size: 50 }),
      ]);
      setMembers(memberData.items);
      setWeeks(weekData.items);
      // 设置默认周次
      const current = weekData.items.find((w) => w.status === 'current');
      if (current) {
        form.setFieldsValue({ week_id: current.id });
      }
    } catch (error) {
      console.error('加载参考数据失败:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const weekId = form.getFieldValue('week_id');
      const result = await weeklyReportApi.getList({ week_id: weekId, page_size: 100 });
      setReports(result.items);
    } catch (error) {
      message.error('加载周报失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await weeklyReportApi.create(values);
      message.success('周报提交成功');
      setModalVisible(false);
      form.resetFields();
      loadData();
    } catch (error) {
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
        // 刷新详情
        const updated = await weeklyReportApi.getById(report.id);
        setSelectedReport(updated);
      } catch (error) {
        message.error('分析失败');
      } finally {
        setAnalyzing(false);
      }
    }
  };

  const columns = [
    {
      title: '成员',
      dataIndex: 'member_name',
      key: 'member_name',
    },
    {
      title: '周次',
      dataIndex: 'week_name',
      key: 'week_name',
    },
    {
      title: '本周工作',
      dataIndex: 'work_content',
      key: 'work_content',
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '主要成果',
      dataIndex: 'main_results',
      key: 'main_results',
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '状态',
      key: 'status',
      render: (_: any, record: WeeklyReport) => (
        record.has_analysis ? (
          <Tag color="green">已分析</Tag>
        ) : (
          <Tag color="orange">待分析</Tag>
        )
      ),
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
      render: (_: any, record: WeeklyReport) => (
        <Button type="link" icon={<RocketOutlined />} onClick={() => handleAnalyze(record)}>
          {record.has_analysis ? '查看分析' : '分析'}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>周报分析</Title>

      <Card bordered={false} style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={4}>
            <Form form={form} layout="vertical">
              <Form.Item name="week_id" label="周次">
                <Select
                  placeholder="选择周次"
                  onChange={loadData}
                >
                  {weeks.map((week) => (
                    <Select.Option key={week.id} value={week.id}>
                      {week.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Form>
          </Col>
          <Col>
            <Button type="primary" icon={<FileTextOutlined />} onClick={() => setModalVisible(true)}>
              提交周报
            </Button>
          </Col>
        </Row>
      </Card>

      <Card title="周报列表" bordered={false}>
        <Table
          columns={columns}
          dataSource={reports}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 提交周报弹窗 */}
      <Modal
        title="提交周报"
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="week_id"
                label="周次"
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
            <Col span={12}>
              <Form.Item
                name="member_id"
                label="成员"
                rules={[{ required: true, message: '请选择成员' }]}
              >
                <Select placeholder="请选择成员">
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
            <TextArea rows={4} placeholder="请详细描述本周完成的工作内容" />
          </Form.Item>
          <Form.Item name="main_results" label="主要成果">
            <TextArea rows={3} placeholder="请列出本周的主要成果和交付物" />
          </Form.Item>
          <Form.Item name="problems" label="存在问题">
            <TextArea rows={2} placeholder="如有阻塞、困难或风险请说明" />
          </Form.Item>
          <Form.Item name="next_week_plan" label="下周计划">
            <TextArea rows={2} placeholder="请列出下周的工作计划" />
          </Form.Item>
          <Form.Item name="raw_text" label="原始文本（可选）">
            <TextArea rows={4} placeholder="如有完整的周报文本，可粘贴在此" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 周报分析详情弹窗 */}
      <Modal
        title="周报分析"
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setSelectedReport(null);
        }}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>,
          !selectedReport?.has_analysis && (
            <Button
              key="analyze"
              type="primary"
              icon={<RocketOutlined />}
              loading={analyzing}
              onClick={() => selectedReport && handleAnalyze(selectedReport)}
            >
              重新分析
            </Button>
          ),
        ]}
        width={800}
      >
        {selectedReport && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="成员">{selectedReport.member_name}</Descriptions.Item>
              <Descriptions.Item label="周次">{selectedReport.week_name}</Descriptions.Item>
              <Descriptions.Item label="提交时间">
                {selectedReport.submitted_at?.replace('T', ' ').split('.')[0]}
              </Descriptions.Item>
              <Descriptions.Item label="分析状态">
                {selectedReport.has_analysis ? (
                  <Tag color="green">已分析</Tag>
                ) : (
                  <Tag color="orange">待分析</Tag>
                )}
              </Descriptions.Item>
            </Descriptions>

            {selectedReport.analysis ? (
              <>
                <Card title="贡献摘要" size="small" style={{ marginBottom: 16 }}>
                  <Text>{selectedReport.analysis.contribution_summary || '暂无'}</Text>
                </Card>

                {selectedReport.analysis.risk_alerts && selectedReport.analysis.risk_alerts.length > 0 && (
                  <Alert
                    type="warning"
                    icon={<WarningOutlined />}
                    message="风险提示"
                    description={
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {selectedReport.analysis.risk_alerts.map((alert, i) => (
                          <li key={i}>{alert}</li>
                        ))}
                      </ul>
                    }
                    style={{ marginBottom: 16 }}
                  />
                )}

                {selectedReport.analysis.main_work && selectedReport.analysis.main_work.length > 0 && (
                  <Card title="本周主要工作" size="small" style={{ marginBottom: 16 }}>
                    <ul>
                      {selectedReport.analysis.main_work.map((work, i) => (
                        <li key={i}>{work}</li>
                      ))}
                    </ul>
                  </Card>
                )}

                {selectedReport.analysis.problems_found && selectedReport.analysis.problems_found.length > 0 && (
                  <Card title="存在问题" size="small" style={{ marginBottom: 16 }}>
                    <ul>
                      {selectedReport.analysis.problems_found.map((problem, i) => (
                        <li key={i}>{problem}</li>
                      ))}
                    </ul>
                  </Card>
                )}

                {selectedReport.analysis.next_week_items && selectedReport.analysis.next_week_items.length > 0 && (
                  <Card title="下周计划" size="small">
                    <ul>
                      {selectedReport.analysis.next_week_items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </Card>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Text type="secondary">暂无分析结果</Text>
                <br />
                <Button
                  type="primary"
                  icon={<RocketOutlined />}
                  loading={analyzing}
                  onClick={() => handleAnalyze(selectedReport)}
                  style={{ marginTop: 16 }}
                >
                  立即分析
                </Button>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

export default WeeklyReports;
