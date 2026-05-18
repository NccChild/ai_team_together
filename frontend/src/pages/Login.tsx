import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import styles from './Login.module.css';

interface LoginFormValues {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      message.warning('请输入用户名');
      return;
    }
    if (!password) {
      message.warning('请输入密码');
      return;
    }
    try {
      setLoading(true);
      await login(username, password);
      message.success('登录成功');
      navigate('/dashboard');
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || '登录失败，请检查用户名和密码';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* 左侧品牌面板 */}
      <aside className={styles.brandPanel}>
        <div className={styles.brandDecor} />
        <div className={styles.brandContent}>
          <div className={styles.logo}>
            <span>AI</span>
          </div>
          <h1 className={styles.title}>人工智能专班</h1>
          <h2 className={styles.subtitle}>任务管理平台</h2>
          <p className={styles.desc}>任务牵引 · 交付评价 · 能力沉淀</p>
        </div>
        <div className={styles.brandFooter}>
          <span>周计划 → 周交付 → 周评价</span>
        </div>
      </aside>

      {/* 右侧登录表单 */}
      <main className={styles.formPanel}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h3>欢迎登录</h3>
            <p>请输入您的账号密码</p>
          </div>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>用户名</label>
              <Input
                size="large"
                placeholder="请输入用户名"
                prefix={<UserOutlined className={styles.inputIcon} />}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className={styles.input}
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>密码</label>
              <Input.Password
                size="large"
                placeholder="请输入密码"
                prefix={<LockOutlined className={styles.inputIcon} />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className={styles.input}
              />
            </div>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              className={styles.submitBtn}
            >
              登 录
            </Button>
          </form>
        </div>
        <p className={styles.copyright}>内部使用平台</p>
      </main>
    </div>
  );
};

export default Login;
