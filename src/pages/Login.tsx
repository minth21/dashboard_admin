import { useState } from 'react';
import { Form, Input, Button, Card, message, Typography, ConfigProvider, theme as antdTheme } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';

const { Title, Text } = Typography;

export default function Login() {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onFinish = async (values: { username: string; password: string }) => {
        setLoading(true);
        try {
            const response = await authApi.login(values);

            if (response.success && response.user && response.token) {
                // Allow ADMIN, SPECIALIST, REVIEWER and TEACHER
                const allowedRoles = ['ADMIN', 'SPECIALIST', 'REVIEWER', 'TEACHER'];
                if (!allowedRoles.includes(response.user.role)) {
                    message.error('Bạn không có quyền truy cập Trang quản trị!');
                    setLoading(false);
                    return;
                }

                // Save token and user
                localStorage.setItem('admin_token', response.token);
                localStorage.setItem('admin_user', JSON.stringify(response.user));

                message.success('Đăng nhập thành công!');
                
                // Redirect based on role
                if (response.user.role === 'ADMIN') {
                    navigate('/dashboard');
                } else if (response.user.role === 'TEACHER') {
                    navigate('/teacher/classes');
                } else {
                    navigate('/exam-bank');
                }
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
        <ConfigProvider 
            theme={{ 
                algorithm: antdTheme.defaultAlgorithm,
                token: {
                    colorBgContainer: '#FFFFFF',
                    colorText: '#1E293B',
                    colorTextPlaceholder: '#94A3B8',
                    colorBorder: '#E2E8F0',
                },
                components: {
                    Input: {
                        activeShadow: '0 0 0 2px rgba(37, 99, 235, 0.1)',
                        controlHeight: 50,
                    }
                }
            }}
        >
            <style>
                {`
                    .login-input {
                        background-color: #FFFFFF !important;
                        color: #1E293B !important;
                        border-color: #E2E8F0 !important;
                    }
                    .login-input:hover, .login-input:focus {
                        border-color: #3B82F6 !important;
                    }
                    /* Ensure global dark mode doesn't leak into these specific inputs */
                    [data-theme='dark'] .login-input {
                        background-color: #FFFFFF !important;
                        color: #1E293B !important;
                    }
                `}
            </style>
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
                            name="username"
                            rules={[
                                { required: true, message: 'Vui lòng nhập Tên đăng nhập!' },
                            ]}
                        >
                            <Input
                                className="login-input"
                                prefix={<UserOutlined style={{ color: '#2563EB', marginRight: 8 }} />}
                                placeholder="Tên đăng nhập (admin, GV001...)"
                                style={{ borderRadius: 12, height: 50 }}
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
                        >
                            <Input.Password
                                className="login-input"
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
        </ConfigProvider>
    );
}
