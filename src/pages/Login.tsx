import { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';

const { Title, Text } = Typography;

export default function Login() {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onFinish = async (values: { email: string; password: string }) => {
        setLoading(true);
        try {
            const response = await authApi.login(values);

            if (response.success && response.user && response.token) {
                // Check if user is ADMIN
                if (response.user.role !== 'ADMIN') {
                    message.error('Bạn không có quyền truy cập Trang quản trị!');
                    return;
                }

                // Save token and user
                localStorage.setItem('admin_token', response.token);
                localStorage.setItem('admin_user', JSON.stringify(response.user));

                message.success('Đăng nhập thành công!');
                navigate('/dashboard');
            } else {
                message.error(response.message || 'Đăng nhập thất bại');
            }
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Lỗi kết nối server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#F8FAFC',
            }}
        >
            <Card
                style={{
                    width: 400,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    borderRadius: 16,
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: 30 }}>
                    <div style={{ marginBottom: 16 }}>
                        <img
                            src="/toeic-test-logo-transparent.png"
                            alt="TOEIC - Test Logo"
                            style={{
                                maxHeight: '50%',
                                maxWidth: '50%',
                                filter: 'drop-shadow(0 4px 12px rgba(37, 99, 235, 0.3))'
                            }}
                        />
                    </div>
                    <Title level={2} style={{ marginBottom: 10, color: '#2563EB' }}>
                        Hệ thống quản trị
                    </Title>
                    <Text type="secondary" style={{ fontSize: 16 }}>
                        Đăng nhập để truy cập hệ thống
                    </Text>
                </div>

                <Form
                    name="login"
                    onFinish={onFinish}
                    autoComplete="off"
                    size="large"
                >
                    <Form.Item
                        name="email"
                        rules={[
                            { required: true, message: 'Vui lòng nhập email!' },
                            { type: 'email', message: 'Email không hợp lệ!' },
                        ]}
                    >
                        <Input
                            prefix={<UserOutlined style={{ color: '#2563EB' }} />}
                            placeholder="Email"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
                    >
                        <Input.Password
                            prefix={<LockOutlined style={{ color: '#2563EB' }} />}
                            placeholder="Mật khẩu"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            loading={loading}
                            icon={<LoginOutlined />}
                            style={{
                                height: 48,
                                fontSize: 16,
                                fontWeight: 600,
                                // background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Removed to let type="primary" take effect w/ new theme
                                // border: 'none',
                            }}
                        >
                            Đăng nhập
                        </Button>
                    </Form.Item>
                </Form>

                <div style={{ marginTop: 24, textAlign: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                        💡 Chỉ dành cho Admin
                    </Text>
                </div>
            </Card>
        </div>
    );
}
