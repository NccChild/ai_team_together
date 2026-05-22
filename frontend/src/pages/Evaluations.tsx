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
  EditOutlined, EyeOutlined, ExclamationCircleOutlined, SyncOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { evaluationApi, taskApi, dictionaryApi } from '../api';
import type { Evaluation, Task, Dictionaries } from '../types';

const Evaluations: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [evaluatingId, setEvaluatingId] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [aiPreviewVisible, setAiPreviewVisible] = useState(false);
  const [aiPreviewComment, setAiPreviewComment] = useState('');
  const [aiPreviewScore, setAiPreviewScore] = useState(0);
  const [aiPreviewTaskName, setAiPreviewTaskName] = useState('');
  const [aiDiagnostics, setAiDiagnostics] = useState<any>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedEval, setSelectedEval] = useState<Evaluation | null>(null);
  const [pendingEditVisible, setPendingEditVisible] = useState(false);
  const [pendingEditRecord, setPendingEditRecord] = useState<any>(null);
  const [pendingBonus, setPendingBonus] = useState(0);
  const [form] = Form.useForm();
  const [pendingForm] = Form.useForm();
  const [dictionaries, setDictionaries] = useState<Dictionaries | null>(null);
  const [evaluatedCount, setEvaluatedCount] = useState(0);

  const scoreToLevel = (score: number): string => {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'qualified';
    if (score >= 60) return 'need_revision';
    return 'unqualified';
  };

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
      // 获取已完成和已提交待评价的任务
      const [completedResult, submittedResult] = await Promise.all([
        taskApi.getList({ status: 'completed', page_size: 100 }),
        taskApi.getList({ status: 'submitted', page_size: 100 }),
      ]);
      const completedList = [...(completedResult.items || []), ...(submittedResult.items || [])];

      // 获取已有评价
      const evalResult = await evaluationApi.getList({ page_size: 100 });
      const evalList = evalResult.items || [];

      // 有等级的视为已完成评价，无等级的（AI 生成的草稿）视为待确认
      const effectiveEvals = evalList.filter((e) => e.level);
      const draftEvals = evalList.filter((e) => !e.level);
      const draftEvalByTask: Record<number, Evaluation> = {};
      draftEvals.forEach((e) => { if (e.task_id) draftEvalByTask[e.task_id] = e; });

      const evaluatedTaskIds = new Set(effectiveEvals.map((e) => e.task_id));
      const unevaluated = completedList
        .filter((t) => !evaluatedTaskIds.has(t.id))
        .map((t) => ({
          ...t,
          _eval: draftEvalByTask[t.id] || null,
        }));

      setCompletedTasks(unevaluated);
      setEvaluations(effectiveEvals);
      setEvaluatedCount(effectiveEvals.length);
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAIEvaluate = async (record: Task) => {
    if (!isAdmin) return;
    setEvaluatingId(record.id);
    try {
      const result = await evaluationApi.aiPreview(record.id);
      setAiPreviewTaskName(result.task_name);
      setAiPreviewComment(result.comment);
      setAiPreviewScore(result.score);
      setAiDiagnostics((result as any).diagnostics || null);
      setAiPreviewVisible(true);
      message.success(`AI评价已生成（${result.score}分）并入库`);
      loadData();
    } catch (error: any) {
      message.error(error?.message || 'AI评价调用失败');
    } finally {
      setEvaluatingId(null);
    }
  };

  const handleSyncFromAchievements = async () => {
    setSyncing(true);
    try {
      const result = await evaluationApi.syncFromAchievements();
      if (result.synced_count === 0) {
        message.info('本周成果库为空，没有可同步的内容');
      } else {
        message.success(`成功同步 ${result.synced_count} 条评价记录`);
      }
      loadData();
    } catch (error: any) {
      const msg = error?.message || '同步失败';
      message.error(msg);
    } finally {
      setSyncing(false);
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

  const handlePendingEdit = (record: any) => {
    setPendingEditRecord(record);
    const bonus = record._eval?.bonus_score ?? 0;
    setPendingBonus(bonus);
    pendingForm.setFieldsValue({ bonus_score: bonus });
    setPendingEditVisible(true);
  };

  const handlePendingEditSubmit = async () => {
    try {
      const values = await pendingForm.validateFields();
      const rec = pendingEditRecord;
      if (!rec?._eval) return;
      const baseScore = rec._eval.base_score || 0;
      const bonusScore = values.bonus_score || 0;
      const finalScore = baseScore + bonusScore;
      const level = scoreToLevel(finalScore);

      await evaluationApi.update(rec._eval.id, {
        comment: rec._eval.comment || '',
        base_score: baseScore,
        bonus_score: bonusScore,
        final_score: finalScore,
        level,
      });
      message.success(`评价已更新（${finalScore}分，${getLevelConfig(level).label}）`);
      setPendingEditVisible(false);
      loadData();
    } catch (error: any) {
      if (error?.errorFields) return; // form validation error
      message.error(error?.message || '更新失败');
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
    { title: '任务名称', dataIndex: 'name', key: 'name', width: 200 },
    { title: '责任人', dataIndex: 'assignee_name', key: 'assignee_name', width: 80 },
    {
      title: '等级', dataIndex: ['_eval', 'level'], key: 'level', width: 80,
      render: (_: any, record: any) => {
        const level = record._eval?.level;
        if (!level) return <span className="text-gray-400">-</span>;
        const config = getLevelConfig(level);
        return <Tag style={{ backgroundColor: config.bg, borderColor: config.color, color: config.color }} className="rounded-full text-xs">{config.label}</Tag>;
      },
    },
    {
      title: '评价意见', dataIndex: ['_eval', 'comment'], key: 'comment', width: 200,
      render: (_: any, record: any) => (
        <div className="text-xs text-gray-600 truncate max-w-[200px]" title={record._eval?.comment}>
          {record._eval?.comment || '-'}
        </div>
      ),
    },
    {
      title: '基础分', dataIndex: ['_eval', 'base_score'], key: 'base_score', width: 70,
      render: (_: any, record: any) => (
        <span className={record._eval?.base_score ? 'font-medium' : 'text-gray-400'}>
          {record._eval?.base_score ?? '-'}
        </span>
      ),
    },
    {
      title: '加分', dataIndex: ['_eval', 'bonus_score'], key: 'bonus_score', width: 60,
      render: (_: any, record: any) => (
        <span className={record._eval?.bonus_score ? 'font-medium' : 'text-gray-400'}>
          {record._eval?.bonus_score ?? '-'}
        </span>
      ),
    },
    {
      title: '最终分', dataIndex: ['_eval', 'final_score'], key: 'final_score', width: 70,
      render: (_: any, record: any) => (
        <span className={record._eval?.final_score ? 'font-bold text-amber-500' : 'text-gray-400'}>
          {record._eval?.final_score ?? '-'}
        </span>
      ),
    },
    {
      title: '截止时间', dataIndex: 'deadline', key: 'deadline', width: 100,
      render: (d: string) => d?.split('T')[0],
    },
    {
      title: '操作', key: 'action', width: 170,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            type="primary"
            icon={<RobotOutlined />}
            size="small"
            loading={evaluatingId === record.id}
            onClick={() => handleAIEvaluate(record)}
            className="bg-[#006D4E] rounded-full"
          >
            AI评价
          </Button>
          {record._eval && (
            <Button
              type="default"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handlePendingEdit(record)}
              className="rounded-full"
            >
              编辑
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // 已评价列
  const evaluatedColumns = [
    { title: '任务名称', dataIndex: 'task_name', key: 'task_name', width: 180 },
    { title: '成员', dataIndex: 'member_name', key: 'member_name', width: 80 },
    {
      title: '等级', dataIndex: 'level', key: 'level', width: 80,
      render: (level: string) => {
        const config = getLevelConfig(level);
        return <Tag style={{ backgroundColor: config.bg, borderColor: config.color, color: config.color }} className="rounded-full text-xs">{config.label}</Tag>;
      },
    },
    {
      title: '评价意见', dataIndex: 'comment', key: 'comment', width: 200,
      render: (text: string) => (
        <div className="text-xs text-gray-600 truncate max-w-[200px]" title={text}>
          {text || '-'}
        </div>
      ),
    },
    {
      title: '基础分', dataIndex: 'base_score', key: 'base_score', width: 70,
      render: (score: number) => <span className="font-medium">{score}</span>,
    },
    {
      title: '加分', dataIndex: 'bonus_score', key: 'bonus_score', width: 60,
      render: (score: number) => <span className="font-medium">{score}</span>,
    },
    {
      title: '最终分', dataIndex: 'final_score', key: 'final_score', width: 70,
      render: (score: number) => <span className="font-bold text-amber-500">{score}</span>,
    },
    {
      title: '评价时间', dataIndex: 'evaluated_at', key: 'evaluated_at', width: 150,
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-800">待评价任务</h3>
                <Tag className="bg-orange-100 text-orange-600 border-0">{completedTasks.length}</Tag>
              </div>
              <Button icon={<SyncOutlined />} onClick={handleSyncFromAchievements} loading={syncing}>
                同步成果库
              </Button>
            </div>
          </div>
          <Table
            columns={pendingColumns}
            dataSource={completedTasks}
            rowKey="id"
            loading={loading}
            pagination={false}
            scroll={{ x: 1000 }}
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
          scroll={{ x: 1000 }}
        />
      </div>

      {/* AI评价结果弹窗 */}
      <Modal
        title={`AI评价结果 - ${aiPreviewTaskName}`}
        open={aiPreviewVisible}
        onCancel={() => { setAiPreviewVisible(false); setAiDiagnostics(null); }}
        footer={[
          <Button key="close" type="primary" onClick={() => { setAiPreviewVisible(false); setAiDiagnostics(null); }}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        <div className="flex items-center gap-4 mb-4 mt-4">
          <div className="bg-green-50 rounded-xl px-6 py-3 text-center">
            <div className="text-3xl font-bold text-green-600">{aiPreviewScore}</div>
            <div className="text-xs text-green-500">AI评分 / 100</div>
          </div>
          <div className="flex-1">
            <Tag color="green" className="rounded-full">已写入评价表</Tag>
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-sm text-gray-500 mb-2">评价意见</div>
          <div className="text-base whitespace-pre-wrap">{aiPreviewComment}</div>
        </div>
        {aiDiagnostics && (
          <div className="bg-amber-50 rounded-xl p-4 mt-3">
            <div className="text-sm text-amber-700 font-medium mb-2">诊断信息</div>
            <div className="text-xs text-amber-600 space-y-1">
              <div>成果总数: {aiDiagnostics.total_achievements}</div>
              <div>成果类型列表: {JSON.stringify(aiDiagnostics.all_types)}</div>
              <div>链接列表: {JSON.stringify(aiDiagnostics.all_links)}</div>
              <div>有链接的成果数: {aiDiagnostics.has_link_count}</div>
              <div>匹配为代码成果: {aiDiagnostics.code_matched}</div>
              <div>代码段数: {aiDiagnostics.code_sections_count}</div>
              <div>代码总字节: {aiDiagnostics.total_code_bytes}</div>
              {aiDiagnostics.week_missing && <div className="text-red-600">⚠ 任务未关联周次</div>}
              {aiDiagnostics.week_start && <div>周范围: {aiDiagnostics.week_start} ~ {aiDiagnostics.week_end}</div>}
              {aiDiagnostics.fetch_errors?.length > 0 && (
                <div className="text-red-600">
                  拉取错误:
                  {aiDiagnostics.fetch_errors.map((e: string, i: number) => (
                    <div key={i} className="ml-2">- {e}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* 待评价任务编辑弹窗 */}
      <Modal
        title={pendingEditRecord ? `编辑评价 - ${pendingEditRecord.name}` : '编辑评价'}
        open={pendingEditVisible}
        onOk={handlePendingEditSubmit}
        onCancel={() => setPendingEditVisible(false)}
        width={600}
        okText="确定"
        cancelText="取消"
      >
        {pendingEditRecord?._eval && (
          <div className="mt-4 space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-sm text-gray-500 mb-2">AI评价意见</div>
              <div className="text-sm whitespace-pre-wrap">{pendingEditRecord._eval.comment || '-'}</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-xs text-gray-400">基础分</div>
                <div className="text-xl font-bold">{pendingEditRecord._eval.base_score || 0}</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-xs text-gray-400">最终分预览</div>
                <div className="text-xl font-bold text-amber-500">
                  {(pendingEditRecord._eval.base_score || 0) + pendingBonus}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-xs text-gray-400">等级预览</div>
                {(() => {
                  const fs = (pendingEditRecord._eval.base_score || 0) + pendingBonus;
                  const config = getLevelConfig(scoreToLevel(fs));
                  return <Tag color={config.color}>{config.label}</Tag>;
                })()}
              </div>
            </div>
            <Form
              form={pendingForm}
              layout="vertical"
              onValuesChange={(_, all) => setPendingBonus(all.bonus_score ?? 0)}
            >
              <Form.Item
                name="bonus_score"
                label="加分"
                rules={[
                  { required: true, message: '请输入加分' },
                  { type: 'number', min: 0, message: '加分必须为非负整数' },
                  {
                    validator: (_, value) => {
                      const baseScore = pendingEditRecord._eval.base_score || 0;
                      if (value !== undefined && value !== null && baseScore + value > 100) {
                        return Promise.reject(new Error(`基础分+加分不能超过100（当前基础分：${baseScore}）`));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Select placeholder="加分">
                  {Array.from({ length: 21 }, (_, i) => i).map((n) => (
                    <Select.Option key={n} value={n}>+{n}分</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

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
