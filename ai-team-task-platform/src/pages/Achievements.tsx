/**
 * 成果库页面
 */

import React, { useEffect, useState } from 'react';
import { Card, Typography, Row, Col, Input, Select, Table, Tag, Button, Space, message, Modal } from 'antd';
import { SearchOutlined, StarOutlined, SyncOutlined, TrophyOutlined } from '@ant-design/icons';
import { achievementApi, memberApi, weekApi, dictionaryApi } from '../api';
import type { Achievement, Member, Week, Dictionaries } from '../types';

const { Title, Text } = Typography;

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
          {record.is_excellent && <TrophyOutlined style={{ color: '#faad14' }} />}
          <Text strong={record.is_excellent}>{text}</Text>
        </Space>
      ),
    },
    {
      title: '成果类型',
      dataIndex: 'achievement_type',
      key: 'achievement_type',
      render: (type: string) =>
        dictionaries?.delivery_type?.find((t) => t.value === type)?.label || type || '-',
    },
    {
      title: '提交人',
      dataIndex: 'member_name',
      key: 'member_name',
    },
    {
      title: '来源任务',
      dataIndex: 'task_name',
      key: 'task_name',
      ellipsis: true,
    },
    {
      title: '周次',
      dataIndex: 'week_name',
      key: 'week_name',
    },
    {
      title: '成果说明',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '链接',
      dataIndex: 'link',
      key: 'link',
      render: (link: string) =>
        link ? (
          <a href={link} target="_blank" rel="noopener noreferrer">
            查看
          </a>
        ) : (
          '-'
        ),
    },
    {
      title: '优秀',
      dataIndex: 'is_excellent',
      key: 'is_excellent',
      render: (isExcellent: boolean) => (
        <Tag color={isExcellent ? 'gold' : 'default'}>{isExcellent ? '是' : '否'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Achievement) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<StarOutlined />}
            onClick={() => handleMarkExcellent(record)}
          >
            {record.is_excellent ? '取消优秀' : '标记优秀'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>成果库</Title>

      <Card bordered={false} style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Input.Search
              placeholder="搜索成果名称"
              allowClear
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              onSearch={handleSearch}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="成果类型"
              allowClear
              style={{ width: '100%' }}
              value={filters.achievement_type}
              onChange={(value) => setFilters({ ...filters, achievement_type: value })}
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
            >
              {weeks.map((week) => (
                <Select.Option key={week.id} value={week.id}>
                  {week.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Button icon={<SyncOutlined />} onClick={handleSync}>
              同步成果
            </Button>
          </Col>
        </Row>
      </Card>

      <Table
        columns={columns}
        dataSource={achievements}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        onChange={handleTableChange}
      />
    </div>
  );
};

export default Achievements;
