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
                    setLoading(false);
                    return;
                }

                // Save token and user
                localStorage.setItem('admin_token', response.token);
                localStorage.setItem('admin_user', JSON.stringify(response.user));

                message.success('Đăng nhập thành công!');
                navigate('/dashboard');
            } else {
                message.error(response.message || 'Đăng nhập thất bại');
                setLoading(false);
            }
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Lỗi kết nối server');
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
                background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Decorative background blobs */}
            <div style={{
                position: 'absolute',
                width: '500px',
                height: '500px',
                background: 'radial-gradient(circle, rgba(37, 99, 235, 0.05) 0%, transparent 70%)',
                top: '-100px',
                right: '-100px',
            }} />
            <div style={{
                position: 'absolute',
                width: '400px',
                height: '400px',
                background: 'radial-gradient(circle, rgba(37, 99, 235, 0.03) 0%, transparent 70%)',
                bottom: '-50px',
                left: '-50px',
            }} />

            <Card
                style={{
                    width: 480,
                    boxShadow: '0 40px 80px -12px rgba(30, 64, 175, 0.15)',
                    borderRadius: 32,
                    border: '1px solid #E0F2FE',
                    background: 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(20px)',
                    padding: '24px 16px'
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <div style={{
                        marginBottom: 32,
                        display: 'inline-block',
                        animation: 'float 6s infinite ease-in-out'
                    }}>
                        <img
                            src="/toeic-test-logo-transparent.png"
                            alt="TOEIC - Test Logo"
                            style={{
                                width: 200,
                                height: 'auto',
                                filter: 'drop-shadow(0 12px 24px rgba(30, 64, 175, 0.12))'
                            }}
                        />
                        <style>
                            {`
                                @keyframes float {
                                    0% { transform: translateY(0px); }
                                    50% { transform: translateY(-10px); }
                                    100% { transform: translateY(0px); }
                                }
                            `}
                        </style>
                    </div>
                    <Title level={2} style={{ marginBottom: 8, color: '#1E3A8A', fontWeight: 800, letterSpacing: '-1px' }}>
                        HỆ THỐNG QUẢN TRỊ
                    </Title>
                    <Text style={{ fontSize: 17, color: '#64748B', fontWeight: 500 }}>
                        Đăng nhập để tiếp tục quản lý
                    </Text>
                </div>

                <Form
                    name="login"
                    onFinish={onFinish}
                    autoComplete="off"
                    size="large"
                    layout="vertical"
                >
                    <Form.Item
                        name="email"
                        rules={[
                            { required: true, message: 'Vui lòng nhập email!' },
                            { type: 'email', message: 'Email không hợp lệ!' },
                        ]}
                    >
                        <Input
                            prefix={<UserOutlined style={{ color: '#2563EB', marginRight: 8 }} />}
                            placeholder="Email quản trị"
                            style={{ borderRadius: 12, height: 50 }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
                    >
                        <Input.Password
                            prefix={<LockOutlined style={{ color: '#2563EB', marginRight: 8 }} />}
                            placeholder="Mật khẩu"
                            style={{ borderRadius: 12, height: 50 }}
                        />
                    </Form.Item>

                    <Form.Item style={{ marginTop: 8 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            loading={loading}
                            icon={<LoginOutlined />}
                            style={{
                                height: 50,
                                fontSize: 16,
                                fontWeight: 700,
                                borderRadius: 12,
                                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                            }}
                        >
                            Vào hệ thống
                        </Button>
                    </Form.Item>
                </Form>

                <div style={{ marginTop: 16, textAlign: 'center' }}>
                    <Text style={{ fontSize: 13, color: '#94A3B8' }}>
                        © 2026 TOEIC-TEST - Admin Panel
                    </Text>
                </div>
            </Card>
        </div>
    );
}
