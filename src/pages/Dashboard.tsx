import { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Button, Space, Avatar, message, Upload } from 'antd';
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

        const token = localStorage.getItem('admin_token');

        try {
            const response = await fetch('http://localhost:3000/api/users/avatar', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await response.json();

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
        <Layout style={{ minHeight: '100vh' }}>
            {/* Sidebar */}
            <Sider
                collapsible
                collapsed={collapsed}
                onCollapse={(value) => setCollapsed(value)}
                trigger={null}
                breakpoint="lg"
                collapsedWidth="80"
                width={250}
                style={{
                    background: '#FFFFFF',
                    borderRight: '1px solid #E2E8F0',
                }}
            >
                <div
                    style={{
                        height: 64,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: collapsed ? '4px' : '4px 8px',
                        overflow: 'hidden',
                    }}
                >
                    <img
                        src="/toeic-test-logo-transparent.png"
                        alt="TOEIC Test Logo"
                        style={{
                            maxHeight: collapsed ? '100%' : '200%',
                            maxWidth: collapsed ? '100%' : '200%',
                            objectFit: 'contain',
                            transition: 'all 0.2s',
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                        }}
                    />
                </div>
                <Menu
                    theme="light"
                    mode="inline"
                    selectedKeys={[selectedMenu]}
                    onClick={({ key }) => handleMenuClick(key)}
                    style={{ background: 'transparent', border: 'none' }}
                    items={[
                        {
                            key: '1',
                            icon: <DashboardOutlined />,
                            label: 'Tổng quan',
                            style: { fontSize: 16, fontWeight: 'bold' },
                        },
                        ...(user?.role === 'ADMIN' ? [{
                            key: '2',
                            icon: <UserOutlined />,
                            label: 'Quản lý người dùng',
                            style: { fontSize: 16, fontWeight: 'bold' },
                        }] : []),
                        {
                            key: '3',
                            icon: <HomeOutlined />,
                            label: 'Ngân hàng đề thi',
                            style: { fontSize: 16, fontWeight: 'bold' },
                        },
                    ]}
                />
            </Sider>

            <Layout>
                {/* Header */}
                <Header
                    style={{
                        padding: '0 24px',
                        background: '#fff',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <Button
                            type="text"
                            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={() => setCollapsed(!collapsed)}
                            style={{ fontSize: '16px', width: 40, height: 40 }}
                        />
                        <Title level={4} style={{ margin: 0, fontWeight: 'bold' }}>
                            {getMenuTitle(selectedMenu)}
                        </Title>
                    </div>

                    <Space wrap={false} size="middle" style={{ flexWrap: 'nowrap' }}>
                        <Upload
                            beforeUpload={handleAvatarUpload}
                            showUploadList={false}
                            accept="image/*"
                        >
                            <div style={{ position: 'relative', cursor: 'pointer' }}>
                                <Avatar
                                    src={
                                        user.avatarUrl
                                            ? user.avatarUrl.startsWith('http')
                                                ? user.avatarUrl
                                                : `http://localhost:3000${user.avatarUrl}`
                                            : '/admin.jpg'
                                    }
                                    style={{ flexShrink: 0 }}
                                    size={40}
                                    icon={<UserOutlined />}
                                />
                                <div
                                    style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        right: 0,
                                        background: '#2563EB',
                                        borderRadius: '50%',
                                        width: 16,
                                        height: 16,
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
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            minWidth: 0,
                            flexShrink: 0
                        }}>
                            <div style={{ fontWeight: 600, whiteSpace: 'nowrap', lineHeight: '20px' }}>
                                {user.name}
                            </div>
                        </div>
                        <Button
                            type="primary"
                            danger
                            icon={<LogoutOutlined />}
                            onClick={handleLogout}
                            style={{ flexShrink: 0 }}
                        >
                            Đăng xuất
                        </Button>
                    </Space>
                </Header>

                {/* Main Content using Outlet */}
                <Content style={{ margin: '24px 16px 0' }}>
                    <Outlet context={{ user }} />
                </Content>
            </Layout>
        </Layout>
    );
}
