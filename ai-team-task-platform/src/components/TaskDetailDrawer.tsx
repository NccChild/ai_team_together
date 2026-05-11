import React, { useEffect, useState } from 'react';
import { Drawer, Descriptions, Tag, Timeline, Card, Typography, message } from 'antd';
import { taskApi } from '../api';
import type { Task, Dictionaries } from '../types';

const { Title, Text } = Typography;

interface TaskDetailDrawerProps {
  taskId: number | null;
  open: boolean;
  onClose: () => void;
  dictionaries?: Dictionaries | null;
}

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

const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({ taskId, open, onClose, dictionaries }) => {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && taskId) {
      loadTask(taskId);
    } else if (!open) {
      setTask(null);
    }
  }, [open, taskId]);

  const loadTask = async (id: number) => {
    setLoading(true);
    try {
      const detail = await taskApi.getById(id);
      setTask(detail);
    } catch {
      message.error('加载任务详情失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      title="任务详情"
      open={open}
      onClose={onClose}
      width={700}
      loading={loading}
    >
      {task && (
        <>
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="任务名称" span={2}>
              {task.name}
            </Descriptions.Item>
            <Descriptions.Item label="任务类型">
              {dictionaries?.task_type?.find((t) => t.value === task.task_type)?.label}
            </Descriptions.Item>
            <Descriptions.Item label="难度">
              {dictionaries?.task_difficulty?.find((t) => t.value === task.difficulty)?.label}
            </Descriptions.Item>
            <Descriptions.Item label="责任人">{task.assignee_name}</Descriptions.Item>
            <Descriptions.Item label="所属周次">{task.week_name}</Descriptions.Item>
            <Descriptions.Item label="截止时间">
              {task.deadline?.split('T')[0]}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={getStatusColor(task.is_overdue ? 'overdue' : task.status)}>
                {getStatusText(task.is_overdue ? 'overdue' : task.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="交付要求" span={2}>
              {task.delivery_requirement}
            </Descriptions.Item>
            <Descriptions.Item label="任务描述" span={2}>
              {task.description || '无'}
            </Descriptions.Item>
          </Descriptions>

          {task.deliveries && task.deliveries.length > 0 && (
            <>
              <Title level={5} style={{ marginTop: 24 }}>成果记录</Title>
              <Timeline
                items={task.deliveries.map((d) => ({
                  color: d.is_latest ? 'blue' : 'gray',
                  children: (
                    <div>
                      <Text strong>{d.name}</Text>
                      <br />
                      <Text type="secondary">{d.description}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        提交人: {d.submitter_name} | 时间: {d.submitted_at?.replace('T', ' ').split('.')[0]}
                        {d.is_latest && <Tag color="blue" style={{ marginLeft: 8 }}>最新</Tag>}
                      </Text>
                    </div>
                  ),
                }))}
              />
            </>
          )}

          {task.evaluations && task.evaluations.length > 0 && (
            <>
              <Title level={5} style={{ marginTop: 24 }}>评价记录</Title>
              {task.evaluations.map((e) => (
                <Card key={e.id} size="small" style={{ marginBottom: 8 }}>
                  <Descriptions column={2} size="small">
                    <Descriptions.Item label="评价等级">
                      <Tag color={e.level === 'excellent' ? 'gold' : 'default'}>
                        {dictionaries?.evaluation_level?.find((l) => l.value === e.level)?.label}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="最终积分">{e.final_score} 分</Descriptions.Item>
                    <Descriptions.Item label="评价意见" span={2}>{e.comment}</Descriptions.Item>
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
  );
};

export default TaskDetailDrawer;
