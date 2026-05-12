/**
 * 成果库页面
 */

import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Input, Select, Table, Tag, Button, Space, message } from 'antd';
import { SearchOutlined, StarOutlined, SyncOutlined, TrophyOutlined, FileTextOutlined, LinkOutlined } from '@ant-design/icons';
import { achievementApi, memberApi, weekApi, dictionaryApi } from '../api';
import type { Achievement, Member, Week, Dictionaries } from '../types';

// 森林绿主题色
const colors = {
  primary: '#006D4E',
  secondary: '#26A67A',
  gold: '#D4AF37',
  warning: '#fa8c16',
};

const Achievements: React.FC = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [dictionaries, setDictionaries] = useState<Dictionaries | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState<{
    keyword?: string;
    achievement_type?: string;
    member_id?: number;
    week_id?: number;
    is_excellent?: boolean;
  }>({});

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
      const result = await achievementApi.getList({
        ...filters,
        page: pagination.current,
        page_size: pagination.pageSize,
      });
      setAchievements(result.items);
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

  const handleSync = async () => {
    try {
      const result = await achievementApi.sync();
      message.success(`成功同步 ${result.synced_count} 条成果`);
      loadData();
    } catch (error) {
      message.error('同步失败');
    }
  };

  const handleMarkExcellent = async (record: Achievement) => {
    try {
      await achievementApi.markExcellent(record.id, !record.is_excellent);
      message.success(record.is_excellent ? '已取消优秀标记' : '已标记为优秀');
      loadData();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns = [
    {
      title: '成果名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Achievement) => (
        <Space>
          {record.is_excellent && (
            <TrophyOutlined className="text-yellow-500 text-lg" />
          )}
          <span className={`font-medium ${record.is_excellent ? 'text-gray-800' : 'text-gray-600'}`}>
            {text || '未命名成果'}
          </span>
        </Space>
      ),
    },
    {
      title: '成果类型',
      dataIndex: 'achievement_type',
      key: 'achievement_type',
      width: 120,
      render: (type: string) => (
        <Tag
          className="rounded-full px-3"
          style={{ backgroundColor: '#e6f7ff', borderColor: '#91d5ff', color: '#1890ff' }}
        >
          {dictionaries?.delivery_type?.find((t) => t.value === type)?.label || type || '其他'}
        </Tag>
      ),
    },
    {
      title: '提交人',
      dataIndex: 'member_name',
      key: 'member_name',
      width: 100,
      render: (name: string) => (
        <div className="flex items-center">
          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold text-xs mr-2">
            {name?.charAt(0) || '-'}
          </div>
          <span className="text-sm">{name || '-'}</span>
        </div>
      ),
    },
    {
      title: '来源任务',
      dataIndex: 'task_name',
      key: 'task_name',
      ellipsis: true,
      render: (text: string) => (
        <span className="text-gray-600 text-sm">{text || '-'}</span>
      ),
    },
    {
      title: '周次',
      dataIndex: 'week_name',
      key: 'week_name',
      width: 100,
    },
    {
      title: '成果说明',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      width: 200,
      render: (text: string) => (
        <span className="text-gray-500 text-sm" title={text}>
          {text || '-'}
        </span>
      ),
    },
    {
      title: '链接',
      dataIndex: 'link',
      key: 'link',
      width: 80,
      render: (link: string) =>
        link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-blue-500 hover:text-blue-700"
          >
            <LinkOutlined />
          </a>
        ) : (
          <span className="text-gray-300">-</span>
        ),
    },
    {
      title: '优秀',
      dataIndex: 'is_excellent',
      key: 'is_excellent',
      width: 80,
      render: (isExcellent: boolean) => (
        isExcellent ? (
          <Tag
            className="rounded-full px-3"
            style={{ backgroundColor: '#fff7e6', borderColor: colors.gold, color: colors.gold }}
          >
            是
          </Tag>
        ) : (
          <Tag
            className="rounded-full px-3"
            style={{ backgroundColor: '#f5f5f5', borderColor: '#d9d9d9', color: '#666' }}
          >
            否
          </Tag>
        )
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: Achievement) => (
        <Button
          type="text"
          size="small"
          icon={<StarOutlined />}
          onClick={() => handleMarkExcellent(record)}
          className="rounded-full"
        >
          {record.is_excellent ? '取消' : '优秀'}
        </Button>
      ),
    },
  ];

  // 统计数据
  const stats = {
    total: pagination.total,
    excellent: achievements.filter(a => a.is_excellent).length,
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">成果库</h2>
          <p className="text-gray-500 mt-1">管理团队工作成果和交付物</p>
        </div>
        <Button
          icon={<SyncOutlined />}
          onClick={handleSync}
          className="rounded-full"
        >
          同步成果
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-emerald-50 rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">成果总数</p>
              <span className="text-3xl font-bold" style={{ color: colors.primary }}>
                {pagination.total}
              </span>
            </div>
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-emerald-100 text-emerald-600">
              <FileTextOutlined />
            </div>
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">优秀成果</p>
              <span className="text-3xl font-bold" style={{ color: colors.gold }}>
                {stats.excellent}
              </span>
            </div>
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-amber-100 text-amber-600">
              <TrophyOutlined />
            </div>
          </div>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Input.Search
              placeholder="搜索成果名称"
              allowClear
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              onSearch={handleSearch}
              prefix={<SearchOutlined />}
              className="rounded-lg"
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="成果类型"
              allowClear
              style={{ width: '100%' }}
              value={filters.achievement_type}
              onChange={(value) => setFilters({ ...filters, achievement_type: value })}
              className="rounded-lg"
            >
              {dictionaries?.delivery_type?.map((item) => (
                <Select.Option key={item.value} value={item.value}>
                  {item.label}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="提交人"
              allowClear
              style={{ width: '100%' }}
              value={filters.member_id}
              onChange={(value) => setFilters({ ...filters, member_id: value })}
              className="rounded-lg"
            >
              {members.map((member) => (
                <Select.Option key={member.id} value={member.id}>
                  {member.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="周次"
              allowClear
              style={{ width: '100%' }}
              value={filters.week_id}
              onChange={(value) => setFilters({ ...filters, week_id: value })}
              className="rounded-lg"
            >
              {weeks.map((week) => (
                <Select.Option key={week.id} value={week.id}>
                  {week.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Button
              type="primary"
              onClick={handleSearch}
              className="rounded-full"
              style={{ backgroundColor: colors.primary }}
            >
              搜索
            </Button>
          </Col>
        </Row>
      </div>

      {/* 成果列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center mb-4">
          <div
            className="w-1 h-6 rounded-full mr-3"
            style={{ backgroundColor: colors.primary }}
          />
          <h3 className="text-lg font-semibold text-gray-800">成果列表</h3>
          <span className="ml-2 text-gray-400 text-sm">共 {pagination.total} 条</span>
        </div>

        <Table
          columns={columns}
          dataSource={achievements}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total: number) => `共 ${total} 条`,
          }}
          onChange={handleTableChange}
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

export default Achievements;