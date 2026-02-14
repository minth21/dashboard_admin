import { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Button, Space, Avatar, message, Upload } from 'antd';
import { userApi } from '../services/api';
import {
    LogoutOutlined,
    UserOutlined,
    HomeOutlined,
    DashboardOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    CameraOutlined,
} from '@ant-design/icons';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    avatarUrl?: string;
}

export default function Dashboard() {
    const [user, setUser] = useState<User | null>(null);
    const [collapsed, setCollapsed] = useState(false);
    const [selectedMenu, setSelectedMenu] = useState('1');
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const userData = localStorage.getItem('admin_user');
        if (userData) {
            setUser(JSON.parse(userData));
        } else {
            navigate('/login');
        }
    }, [navigate]);

    // Update selected menu based on current path
    useEffect(() => {
        const path = location.pathname;
        if (path === '/dashboard') {
            setSelectedMenu('1');
        } else if (path === '/users') {
            setSelectedMenu('2');
        } else if (path.startsWith('/exam-bank')) {
            setSelectedMenu('3');
        }
    }, [location.pathname]);

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        message.success('Đã đăng xuất thành công!');
        navigate('/login');
    };

    // Get menu title based on selected menu key
    const getMenuTitle = (menuKey: string): string => {
        const menuTitles: { [key: string]: string } = {
            '1': 'TỔNG QUAN',
            '2': 'QUẢN LÝ NGƯỜI DÙNG',
            '3': 'NGÂN HÀNG ĐỀ THI',
        };
        return menuTitles[menuKey] || 'TỔNG QUAN';
    };

    const handleAvatarUpload = async (file: File) => {
        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const data = await userApi.updateAvatar(formData);

            if (data.success && data.user) {
                // Update user in localStorage and state
                const updatedUser = data.user;
                localStorage.setItem('admin_user', JSON.stringify(updatedUser));
                setUser(updatedUser);
                message.success('Cập nhật avatar thành công!');
            } else {
                message.error(data.message || 'Upload thất bại!');
            }
        } catch (error) {
            console.error('Avatar upload error:', error);
            message.error('Có lỗi xảy ra khi upload avatar!');
        }

        return false; // Prevent default upload behavior
    };

    // Redirect STAFF away from User Management
    useEffect(() => {
        if (location.pathname === '/users' && user?.role !== 'ADMIN') {
            navigate('/dashboard');
            message.warning('Bạn không có quyền truy cập trang này');
        }
    }, [location.pathname, user, navigate]);

    if (!user) return null;

    const handleMenuClick = (key: string) => {
        if (key === '1') navigate('/dashboard');
        if (key === '2') navigate('/users');
        if (key === '3') navigate('/exam-bank');
    };

    return (
        <Layout style={{ minHeight: '100vh', background: '#F0F9FF' }}>
            {/* Sidebar */}
            <Sider
                collapsible
                collapsed={collapsed}
                onCollapse={(value) => setCollapsed(value)}
                trigger={null}
                breakpoint="lg"
                collapsedWidth="80"
                width={260}
                style={{
                    background: '#FFFFFF',
                    borderRight: '1px solid #E0F2FE',
                    position: 'fixed',
                    height: '100vh',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    zIndex: 100,
                    boxShadow: '4px 0 24px rgba(30, 64, 175, 0.02)',
                }}
            >
                <div
                    style={{
                        height: collapsed ? 80 : 120,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: collapsed ? '12px' : '24px',
                        marginBottom: collapsed ? 20 : 10,
                        transition: 'all 0.3s'
                    }}
                >
                    <img
                        src="/toeic-test-logo-transparent.png"
                        alt="TOEIC Test Logo"
                        style={{
                            width: collapsed ? '40px' : '180px',
                            height: 'auto',
                            filter: 'drop-shadow(0 4px 12px rgba(30, 64, 175, 0.12))',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                    />
                </div>
                <Menu
                    theme="light"
                    mode="inline"
                    selectedKeys={[selectedMenu]}
                    onClick={({ key }) => handleMenuClick(key)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '0 12px'
                    }}
                    items={[
                        {
                            key: '1',
                            icon: <DashboardOutlined style={{ fontSize: 20 }} />,
                            label: <span style={{ fontWeight: 800 }}>Tổng quan</span>,
                            style: {
                                borderRadius: 12,
                                marginBottom: 12,
                                height: 54,
                                display: 'flex',
                                alignItems: 'center',
                                fontSize: 15
                            },
                        },
                        ...(user?.role === 'ADMIN' ? [{
                            key: '2',
                            icon: <UserOutlined style={{ fontSize: 20 }} />,
                            label: <span style={{ fontWeight: 800 }}>Quản lý người dùng</span>,
                            style: {
                                borderRadius: 12,
                                marginBottom: 12,
                                height: 54,
                                display: 'flex',
                                alignItems: 'center',
                                fontSize: 15
                            },
                        }] : []),
                        {
                            key: '3',
                            icon: <HomeOutlined style={{ fontSize: 20 }} />,
                            label: <span style={{ fontWeight: 800 }}>Ngân hàng đề thi</span>,
                            style: {
                                borderRadius: 12,
                                marginBottom: 12,
                                height: 54,
                                display: 'flex',
                                alignItems: 'center',
                                fontSize: 15
                            },
                        },
                    ]}
                />
            </Sider>

            <Layout style={{
                marginLeft: collapsed ? 80 : 260,
                transition: 'all 0.2s',
                background: 'transparent'
            }}>
                {/* Floating Header */}
                {/* Floating Header */}
                <Header
                    style={{
                        margin: '16px 24px',
                        padding: '0 24px',
                        background: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(12px)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderRadius: 20,
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        boxShadow: '0 8px 32px rgba(30, 64, 175, 0.08)',
                        height: 70,
                        position: 'sticky',
                        top: 16,
                        zIndex: 90,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <Button
                            type="text"
                            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={() => setCollapsed(!collapsed)}
                            style={{
                                fontSize: '18px',
                                width: 45,
                                height: 45,
                                borderRadius: 12,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#F0F9FF',
                                color: '#1E40AF'
                            }}
                        />
                        <Title level={4} style={{ margin: 0, color: '#1E3A8A', fontWeight: 700, letterSpacing: '-0.5px' }}>
                            {getMenuTitle(selectedMenu)}
                        </Title>
                    </div>

                    <Space size="large">
                        {/* User Info - Compact Version */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Upload
                                beforeUpload={handleAvatarUpload}
                                showUploadList={false}
                                accept="image/*"
                            >
                                <div style={{ position: 'relative', cursor: 'pointer', display: 'flex' }}>
                                    <Avatar
                                        src={
                                            user.avatarUrl
                                                ? user.avatarUrl.startsWith('http')
                                                    ? user.avatarUrl
                                                    : `http://localhost:3000${user.avatarUrl}`
                                                : '/admin.jpg'
                                        }
                                        size={40}
                                        style={{ border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                                        icon={<UserOutlined />}
                                    />
                                    <div
                                        style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            right: 0,
                                            background: '#3B82F6',
                                            borderRadius: '50%',
                                            width: 14,
                                            height: 14,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '2px solid white',
                                        }}
                                    >
                                        <CameraOutlined style={{ fontSize: 8, color: 'white' }} />
                                    </div>
                                </div>
                            </Upload>
                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <span style={{ fontWeight: 700, color: '#1E293B', fontSize: 14, lineHeight: '1.2', marginBottom: 2 }}>
                                    {user.name}
                                </span>
                                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', lineHeight: '1' }}>
                                    {user.role}
                                </span>
                            </div>
                        </div>

                        <Button
                            type="primary"
                            icon={<LogoutOutlined />}
                            onClick={handleLogout}
                            style={{
                                height: 45,
                                borderRadius: 12,
                                fontWeight: 700,
                                background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                                border: 'none',
                                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                            }}
                        >
                            Đăng xuất
                        </Button>
                    </Space>
                </Header>

                {/* Main Content using Outlet */}
                <Content style={{
                    margin: '8px 24px 24px',
                    padding: '0',
                    minHeight: '280px',
                }}>
                    <Outlet context={{ user }} />
                </Content>
            </Layout>
        </Layout>
    );
}
