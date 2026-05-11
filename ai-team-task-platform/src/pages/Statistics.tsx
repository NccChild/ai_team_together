/**
 * 统计汇总页面
 */

import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Table, Tag, Space, Select, Statistic, Progress } from 'antd';
import { TrophyOutlined, TeamOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { statisticsApi, weekApi, memberApi } from '../api';
import type { MemberRanking, Week, MemberStats } from '../types';

const { Title } = Typography;

const Statistics: React.FC = () => {
  const [ranking, setRanking] = useState<MemberRanking[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWeeks();
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedWeek]);

  const loadWeeks = async () => {
    try {
      const result = await weekApi.getList({ page_size: 50 });
      setWeeks(result.items);
      const current = result.items.find((w) => w.status === 'current');
      if (current) {
        setSelectedWeek(current.id);
      }
    } catch (error) {
      console.error('加载周次失败:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await statisticsApi.getRanking(selectedWeek);
      setRanking(result.items || []);
    } catch (error) {
      console.error('加载排行失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '排名',
      key: 'rank',
      render: (_: any, record: MemberRanking) => (
        <Tag
          color={record.rank <= 3 ? ['gold', 'silver', 'volcano'][record.rank - 1] : 'default'}
          style={{ minWidth: 32, textAlign: 'center' }}
        >
          {record.rank}
        </Tag>
      ),
    },
    {
      title: '姓名',
      dataIndex: 'member_name',
      key: 'member_name',
    },
    {
      title: '所属单位',
      dataIndex: 'unit',
      key: 'unit',
    },
    {
      title: '本周积分',
      dataIndex: 'weekly_score',
      key: 'weekly_score',
      render: (score: number) => <Tag color="gold">{score} 分</Tag>,
      sorter: (a: MemberRanking, b: MemberRanking) => a.weekly_score - b.weekly_score,
    },
    {
      title: '累计积分',
      dataIndex: 'total_score',
      key: 'total_score',
      render: (score: number) => <Tag>{score} 分</Tag>,
      sorter: (a: MemberRanking, b: MemberRanking) => a.total_score - b.total_score,
    },
    {
      title: '优秀任务数',
      dataIndex: 'excellent_count',
      key: 'excellent_count',
      render: (count: number) => <Tag color="gold">{count}</Tag>,
    },
  ];

  const totalWeeklyScore = ranking.reduce((sum, r) => sum + r.weekly_score, 0);
  const totalExcellent = ranking.reduce((sum, r) => sum + r.excellent_count, 0);

  return (
    <div>
      <Title level={4}>统计汇总</Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card bordered={false} style={{ background: '#fff7e6' }}>
            <Statistic
              title="本周积分总计"
              value={totalWeeklyScore}
              prefix={<TrophyOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ background: '#f6ffed' }}>
            <Statistic
              title="优秀任务总计"
              value={totalExcellent}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic title="参与人数" value={ranking.length} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <span>选择周次</span>
              <Select
                style={{ width: '100%' }}
                value={selectedWeek}
                onChange={setSelectedWeek}
                placeholder="选择周次"
              >
                {weeks.map((week) => (
                  <Select.Option key={week.id} value={week.id}>
                    {week.name}
                  </Select.Option>
                ))}
              </Select>
            </Space>
          </Card>
        </Col>
      </Row>

      <Card title="个人积分排行" bordered={false}>
        <Table
          columns={columns}
          dataSource={ranking}
          rowKey="member_id"
          loading={loading}
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default Statistics;
