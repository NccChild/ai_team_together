/**
 * 人员管理页面 - 专班工作台风格
 */

import React, { useEffect, useState } from 'react';
import {
  Table, Button, Input, Modal, Form, Select, Tag, message, Popconfirm,
  Row, Col, Badge, Avatar, Space, Checkbox
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  UserOutlined, StarOutlined, TeamOutlined
} from '@ant-design/icons';
import { memberApi, dictionaryApi } from '../api';
import type { Member, MemberCreate, Dictionaries } from '../types';

const Members: React.FC = () => {
  const [data, setData] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [dictionaries, setDictionaries] = useState<Dictionaries | null>(null);

  useEffect(() => {
    loadDictionaries();
    loadData();
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
      const result = await memberApi.getList({
        keyword: searchKeyword || undefined,
        page: pagination.current,
        page_size: pagination.pageSize,
      });
      setData(result.items);
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

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ is_backbone: false });
    setModalVisible(true);
  };

  const handleEdit = (record: Member) => {
    setEditingId(record.id);
    form.setFieldsValue({
      name: record.name,
      unit: record.unit,
      contact: record.contact,
      email: record.email,
      skill_tags: record.skill_tags,
      is_backbone: record.is_backbone,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await memberApi.update(editingId, values);
        message.success('更新成功');
      } else {
        await memberApi.create(values as MemberCreate);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadData();
    } catch (error: any) {
      console.error('创建/更新成员失败:', error);
      const errorMessage =
        error?.response?.data?.message || error?.message || '操作失败';
      message.error(errorMessage);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await memberApi.updateStatus(id, 'inactive');
      message.success('已停用');
      loadData();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2);
  };

  const columns = [
    {
      title: '成员',
      key: 'member',
      render: (_: any, record: Member) => (
        <div className="flex items-center gap-3">
          <Avatar
            size={40}
            style={{
              backgroundColor: record.is_backbone ? '#FA8C16' : '#006D4E',
              fontWeight: 600
            }}
            icon={<UserOutlined />}
          >
            {getInitials(record.name)}
          </Avatar>
          <div>
            <div className="font-medium text-gray-800 flex items-center gap-2">
              {record.name}
              {record.is_backbone && (
                <StarOutlined className="text-amber-500 text-sm" />
              )}
            </div>
            <div className="text-xs text-gray-400">{record.unit}</div>
          </div>
        </div>
      ),
    },
    {
      title: '联系方式',
      dataIndex: 'contact',
      key: 'contact',
      render: (text: string) => text || '-',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (text: string) => (
        <span className="text-gray-600">{text || '-'}</span>
      ),
    },
    {
      title: '能力标签',
      dataIndex: 'skill_tags',
      key: 'skill_tags',
      render: (tags: string[]) => (
        <div className="flex flex-wrap gap-1">
          {tags?.slice(0, 3).map((tag) => (
            <Tag key={tag} className="bg-[#E8F5E9] text-[#006D4E] border-0 rounded-full text-xs">
              {tag}
            </Tag>
          ))}
          {tags && tags.length > 3 && (
            <Tag className="bg-gray-100 text-gray-500 border-0 rounded-full text-xs">
              +{tags.length - 3}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: '角色',
      key: 'role',
      render: (_: any, record: Member) => (
        record.is_backbone ? (
          <Tag className="bg-amber-50 text-amber-600 border-amber-200 rounded-full">骨干成员</Tag>
        ) : (
          <Tag className="bg-gray-50 text-gray-500 border-gray-200 rounded-full">普通成员</Tag>
        )
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        status === 'active' ? (
          <Tag className="bg-green-50 text-green-600 border-green-200 rounded-full">在用</Tag>
        ) : (
          <Tag className="bg-red-50 text-red-600 border-red-200 rounded-full">停用</Tag>
        )
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: Member) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            className="text-[#006D4E]"
          >
            编辑
          </Button>
          {record.status === 'active' && (
            <Popconfirm
              title="确定要停用此人员吗？"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              >
                停用
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">团队管理</h2>
          <p className="text-sm text-gray-500 mt-1">管理团队成员，查看人员信息</p>
        </div>
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          className="bg-[#006D4E] rounded-full hover:bg-[#005A40]"
          onClick={handleAdd}
        >
          新增成员
        </Button>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16}>
        <Col span={8}>
          <div className="bg-[#E8F5E9] rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-[#006D4E]">{data.filter(m => m.status === 'active').length}</div>
                <div className="text-sm text-gray-600 mt-1">在职成员</div>
              </div>
              <TeamOutlined className="text-4xl text-[#006D4E]/30" />
            </div>
          </div>
        </Col>
        <Col span={8}>
          <div className="bg-amber-50 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-amber-600">{data.filter(m => m.is_backbone).length}</div>
                <div className="text-sm text-gray-600 mt-1">骨干成员</div>
              </div>
              <StarOutlined className="text-4xl text-amber-600/30" />
            </div>
          </div>
        </Col>
        <Col span={8}>
          <div className="bg-gray-100 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-600">{data.filter(m => m.status !== 'active').length}</div>
                <div className="text-sm text-gray-600 mt-1">已停用</div>
              </div>
              <UserOutlined className="text-4xl text-gray-400" />
            </div>
          </div>
        </Col>
      </Row>

      {/* 筛选工具栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <Input.Search
            placeholder="搜索成员姓名"
            className="w-64"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onSearch={handleSearch}
            prefix={<SearchOutlined className="text-gray-400" />}
          />
          <div className="flex-1" />
          <Badge count={pagination.total} showZero color="#006D4E">
            <span className="text-gray-500 text-sm">共 {pagination.total} 名成员</span>
          </Badge>
        </div>
      </div>

      {/* 成员列表 */}
      <div className="bg-white rounded-xl shadow-sm">
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          onChange={handleTableChange}
          className="members-table"
        />
      </div>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingId ? '编辑成员' : '新增成员'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
        className="rounded-xl"
        okText="确认"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item name="unit" label="所属单位" rules={[{ required: true, message: '请输入所属单位' }]}>
            <Input placeholder="请输入所属单位" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="contact" label="联系方式">
                <Input placeholder="请输入联系方式" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="邮箱">
                <Input placeholder="请输入邮箱" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="skill_tags" label="能力标签">
            <Select mode="multiple" placeholder="请选择能力标签" allowClear>
              {dictionaries?.skill_tag?.map((item) => (
                <Select.Option key={item.value} value={item.value}>{item.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="is_backbone" valuePropName="checked">
            <Checkbox>骨干成员</Checkbox>
          </Form.Item>
          <div className="text-sm text-gray-500 mb-4">设置为骨干成员将在成员列表中显示特殊标识</div>
        </Form>
      </Modal>
    </div>
  );
};

export default Members;
