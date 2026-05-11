/**
 * 人员管理页面
 */

import React, { useEffect, useState } from 'react';
import {
  Table, Button, Space, Input, Modal, Form, Select, Tag, message, Popconfirm,
  Typography, Row, Col, Card, Switch
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { memberApi, dictionaryApi } from '../api';
import type { Member, MemberCreate, Dictionaries } from '../types';

const { Title } = Typography;

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
    } catch (error) {
      message.error('操作失败');
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

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '所属单位',
      dataIndex: 'unit',
      key: 'unit',
    },
    {
      title: '联系方式',
      dataIndex: 'contact',
      key: 'contact',
    },
    {
      title: '能力标签',
      dataIndex: 'skill_tags',
      key: 'skill_tags',
      render: (tags: string[]) => (
        <>
          {tags?.map((tag) => (
            <Tag key={tag} color="blue">
              {tag}
            </Tag>
          ))}
        </>
      ),
    },
    {
      title: '骨干',
      dataIndex: 'is_backbone',
      key: 'is_backbone',
      render: (isBackbone: boolean) => (
        <Tag color={isBackbone ? 'gold' : 'default'}>{isBackbone ? '是' : '否'}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '在用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Member) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          {record.status === 'active' && (
            <Popconfirm
              title="确定要停用此人员吗？"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                停用
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>人员管理</Title>

      <Card bordered={false} style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Input.Search
              placeholder="搜索姓名"
              allowClear
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onSearch={handleSearch}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增人员
            </Button>
          </Col>
        </Row>
      </Card>

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
      />

      <Modal
        title={editingId ? '编辑人员' : '新增人员'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item
            name="unit"
            label="所属单位"
            rules={[{ required: true, message: '请输入所属单位' }]}
          >
            <Input placeholder="请输入所属单位" />
          </Form.Item>
          <Form.Item name="contact" label="联系方式">
            <Input placeholder="请输入联系方式" />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item name="skill_tags" label="能力标签">
            <Select mode="multiple" placeholder="请选择能力标签" allowClear>
              {dictionaries?.skill_tag?.map((item) => (
                <Select.Option key={item.value} value={item.value}>
                  {item.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="is_backbone" label="是否骨干" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Members;
