/**
 * 统计汇总页面
 */

import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Table, Tag, Select } from 'antd';
import { TrophyOutlined, TeamOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { statisticsApi, weekApi } from '../api';
import type { MemberRanking, Week } from '../types';

const { Title, Text } = Typography;

// 森林绿主题色
const colors = {
  primary: '#006D4E',
  secondary: '#26A67A',
  gold: '#D4AF37',
  silver: '#A8A8A8',
  bronze: '#CD7F32',
};

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

  // 排名样式
  const getRankStyle = (rank: number) => {
    const colors: Record<number, string> = {
      1: '#D4AF37',
      2: '#A8A8A8',
      3: '#CD7F32',
    };
    return colors[rank] || '#666';
  };

  const columns = [
    {
      title: '排名',
      key: 'rank',
      width: 80,
      render: (_: any, record: MemberRanking) => (
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
          style={{ backgroundColor: getRankStyle(record.rank) }}
        >
          {record.rank}
        </div>
      ),
    },
    {
      title: '姓名',
      dataIndex: 'member_name',
      key: 'member_name',
      render: (name: string) => (
        <Text strong className="text-base">{name}</Text>
      ),
    },
    {
      title: '所属单位',
      dataIndex: 'unit',
      key: 'unit',
      render: (unit: string) => (
        <span className="text-gray-600">{unit || '-'}</span>
      ),
    },
    {
      title: '本周积分',
      dataIndex: 'weekly_score',
      key: 'weekly_score',
      sorter: (a: MemberRanking, b: MemberRanking) => a.weekly_score - b.weekly_score,
      render: (score: number) => (
        <span className="text-lg font-bold" style={{ color: colors.gold }}>
          {score}
        </span>
      ),
    },
    {
      title: '累计积分',
      dataIndex: 'total_score',
      key: 'total_score',
      sorter: (a: MemberRanking, b: MemberRanking) => a.total_score - b.total_score,
      render: (score: number) => (
        <span className="text-base font-semibold" style={{ color: colors.primary }}>
          {score}
        </span>
      ),
    },
    {
      title: '优秀任务',
      dataIndex: 'excellent_count',
      key: 'excellent_count',
      render: (count: number) => (
        <Tag
          className="rounded-full px-3"
          style={{ backgroundColor: '#FFF7E6', borderColor: colors.gold, color: colors.gold }}
        >
          {count} 个
        </Tag>
      ),
    },
  ];

  const totalWeeklyScore = ranking.reduce((sum, r) => sum + r.weekly_score, 0);
  const totalExcellent = ranking.reduce((sum, r) => sum + r.excellent_count, 0);

  // 统计卡片数据
  const statCards = [
    {
      label: '本周积分总计',
      value: totalWeeklyScore,
      icon: <TrophyOutlined />,
      color: colors.gold,
      bgColor: 'bg-amber-50',
    },
    {
      label: '优秀任务总计',
      value: totalExcellent,
      icon: <CheckCircleOutlined />,
      color: colors.primary,
      bgColor: 'bg-emerald-50',
    },
    {
      label: '参与人数',
      value: ranking.length,
      icon: <TeamOutlined />,
      color: colors.secondary,
      bgColor: 'bg-teal-50',
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">统计汇总</h2>
          <p className="text-gray-500 mt-1">查看团队成员积分排名</p>
        </div>
        <Select
          className="w-48"
          placeholder="选择周次"
          value={selectedWeek}
          onChange={setSelectedWeek}
          style={{ borderRadius: 20 }}
        >
          {weeks.map((week) => (
            <Select.Option key={week.id} value={week.id}>
              {week.name}
            </Select.Option>
          ))}
        </Select>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className={`${card.bgColor} rounded-xl p-5 shadow-sm border border-gray-100`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm mb-1">{card.label}</p>
                <span className="text-3xl font-bold" style={{ color: card.color }}>
                  {card.value}
                </span>
              </div>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${card.color}20`, color: card.color }}
              >
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 排行榜 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center mb-4">
          <div
            className="w-1 h-6 rounded-full mr-3"
            style={{ backgroundColor: colors.primary }}
          />
          <h3 className="text-lg font-semibold text-gray-800">个人积分排行</h3>
        </div>

        <Table
          columns={columns}
          dataSource={ranking}
          rowKey="member_id"
          loading={loading}
          pagination={false}
          className="custom-table"
        />
      </div>

      <style>{`
        .custom-table .ant-table-thead > tr > th {
          background-color: #f8faf9;
          color: #666;
          font-weight: 500;
        }
        .custom-table .ant-table-tbody > tr:hover > td {
          background-color: #f0fdf4;
        }
      `}</style>
    </div>
  );
};

export default Statistics;