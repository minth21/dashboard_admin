import { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Button, Space, Avatar, message, Upload, Modal } from 'antd';
import { userApi } from '../services/api';
import {
    LogoutOutlined,
    UserOutlined,
    HomeOutlined,
    DashboardOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    CameraOutlined,
    BookOutlined,
    TeamOutlined,
    SunOutlined,
    MoonOutlined,
    FlagOutlined,
    MessageOutlined,
} from '@ant-design/icons';
import { useTheme } from '../hooks/useThemeContext';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import ChangePasswordModal from '../components/ChangePasswordModal';
import NotificationCenter from '../components/NotificationCenter';
import { Dropdown } from 'antd';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    avatarUrl?: string;
    isFirstLogin: boolean;
}

const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'Admin',
    SPECIALIST: 'Chuyên viên',
    TEACHER: 'Giáo viên',
    STUDENT: 'Học viên',
};

export default function Dashboard() {
    const [user, setUser] = useState<User | null>(null);
    const [collapsed, setCollapsed] = useState(false);
    const [selectedMenu, setSelectedMenu] = useState('1');
    const [isPassModalVisible, setIsPassModalVisible] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    useEffect(() => {
        const userData = localStorage.getItem('admin_user');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            
            // Tự động bật Modal đổi mật khẩu nếu là lần đầu đăng nhập (Ngoại trừ ADMIN)
            if (parsedUser.isFirstLogin && parsedUser.role !== 'ADMIN') {
                setIsPassModalVisible(true);
            }
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
        } else if (path === '/classes') {
            setSelectedMenu('4');
        } else if (path === '/teacher/classes') {
            setSelectedMenu('5');
        } else if (path.startsWith('/exam-bank')) {
            setSelectedMenu('3');
        } else if (path === '/teacher/materials') {
            setSelectedMenu('3');
        } else if (path === '/profile') {
            setSelectedMenu('6');
        } else if (path === '/complaints') {
            setSelectedMenu('7');
        } else if (path === '/class-feedback') {
            setSelectedMenu('8');
        }
    }, [location.pathname]);

    // ============================================
    // STRICT ROLE-BASED ACCESS CONTROL (RBAC)
    // ============================================
    useEffect(() => {
        if (!user) return;
        
        const path = location.pathname;
        const role = user.role;
        
        if (role === 'TEACHER') {
            const allowedPaths = ['/teacher/classes', '/teacher/materials', '/profile', '/dashboard', '/complaints', '/class-feedback'];
            const isAllowed = allowedPaths.some(p => path.startsWith(p));
            
            if (!isAllowed && path !== '/') {
                message.error('Bạn không có quyền truy cập trang này. Chuyển về Bài giảng và bài tập.');
                navigate('/teacher/materials', { replace: true });
            }
            // Redirect from / or /dashboard to /teacher/materials for Teachers
            if (path === '/' || path === '/dashboard' || path === '/exam-bank') navigate('/teacher/materials', { replace: true });
        }
        
        // 2. SPECIALIST (CV) Guard
        if (role === 'SPECIALIST') {
            const forbiddenPaths = ['/users', '/classes', '/teacher/classes'];
            const isForbidden = forbiddenPaths.some(p => path.startsWith(p));
            
            if (isForbidden) {
                message.error('Chuyên viên không có quyền quản lý Người dùng/Lớp học/Học viên. Chuyển về Ngân hàng đề.');
                navigate('/exam-bank', { replace: true });
            }
            // Redirect from / or /dashboard to /exam-bank for Specialists
            if (path === '/' || path === '/dashboard') navigate('/exam-bank', { replace: true });
        }

        // 3. Prevent unauthorized direct access to sensitive paths (for other potential roles)
        if (role === 'STUDENT' && path === '/dashboard') {
             navigate('/exam-bank', { replace: true });
        }
    }, [location.pathname, user?.role, navigate]);

    const handleLogout = () => {
        Modal.confirm({
            title: 'Xác nhận đăng xuất',
            content: 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?',
            okText: 'Đăng xuất',
            cancelText: 'Hủy',
            okButtonProps: { 
                danger: true,
                style: { borderRadius: '8px', fontWeight: 600 }
            },
            cancelButtonProps: {
                style: { borderRadius: '8px' }
            },
            onOk: () => {
                localStorage.removeItem('admin_token');
                localStorage.removeItem('admin_user');
                message.success('Đã đăng xuất thành công!');
                navigate('/login');
            }
        });
    };

    // Get menu title based on selected menu key
    const getMenuTitle = (menuKey: string): string => {
        const role = user?.role;
        const menuTitles: { [key: string]: string } = {
            '1': 'TỔNG QUAN',
            '2': 'QUẢN LÝ NGƯỜI DÙNG',
            '3': role === 'TEACHER' ? 'BÀI GIẢNG VÀ BÀI TẬP' : 'NGÂN HÀNG ĐỀ THI',
            '4': 'QUẢN LÝ LỚP HỌC',
            '5': 'LỚP HỌC CỦA TÔI',
            '6': 'HỒ SƠ CÁ NHÂN',
            '7': 'QUẢN LÝ GÓP Ý',
            '8': 'Ý KIẾN HỌC VIÊN',
        };
        return menuTitles[menuKey] || 'TỔNG QUAN';
    };

    const handleAvatarUpload = async (file: File) => {
        const formData = new FormData();
        formData.append('image', file);

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


    if (!user) return null;

    const handleMenuClick = (key: string) => {
        if (key === '1') navigate('/dashboard');
        if (key === '2') navigate('/users');
        if (key === '3') {
            if (user?.role === 'TEACHER') navigate('/teacher/materials');
            else navigate('/exam-bank');
        }
        if (key === '4') navigate('/classes');
        if (key === '5') navigate('/teacher/classes');
        if (key === '6') navigate('/profile');
        if (key === '7') navigate('/complaints');
        if (key === '8') navigate('/class-feedback');
    };

    // ============================================
    // DYNAMIC MENU ITEMS BASED ON ROLE
    // ============================================
    const getMenuItems = () => {
        const role = user.role;
        const items = [];

        // 1. Dashboard (Overview) - Admin only
        if (role === 'ADMIN') {
            items.push({
                key: '1',
                icon: <DashboardOutlined style={{ fontSize: 20 }} />,
                label: <span style={{ fontWeight: 600 }}>Tổng quan</span>,
                style: { borderRadius: 12, marginBottom: 12, height: 54, display: 'flex', alignItems: 'center', fontSize: 15 },
            });
        }

        // 2. User Management - Admin only
        if (role === 'ADMIN') {
            items.push({
                key: '2',
                icon: <UserOutlined style={{ fontSize: 20 }} />,
                label: <span style={{ fontWeight: 600 }}>Quản lý người dùng</span>,
                style: { borderRadius: 12, marginBottom: 12, height: 54, display: 'flex', alignItems: 'center', fontSize: 15 },
            });
        }

        // 3. Class Management - Admin only
        if (role === 'ADMIN') {
            items.push({
                key: '4',
                icon: <BookOutlined style={{ fontSize: 20 }} />,
                label: <span style={{ fontWeight: 600 }}>Quản lý lớp học</span>,
                style: { borderRadius: 12, marginBottom: 12, height: 54, display: 'flex', alignItems: 'center', fontSize: 15 },
            });
        }

        // 4. Exam Bank - All management roles
        items.push({
            key: '3',
            icon: <HomeOutlined style={{ fontSize: 20 }} />,
            label: <span style={{ fontWeight: 600 }}>{role === 'TEACHER' ? 'Bài giảng và bài tập' : 'Ngân hàng đề thi'}</span>,
            style: { borderRadius: 12, marginBottom: 12, height: 54, display: 'flex', alignItems: 'center', fontSize: 15 },
        });
        // 5. My Classes - Teacher only
        if (role === 'TEACHER') {
            items.push({
                key: '5',
                icon: <TeamOutlined style={{ fontSize: 20 }} />,
                label: <span style={{ fontWeight: 600 }}>Lớp học của tôi</span>,
                style: { borderRadius: 12, marginBottom: 12, height: 54, display: 'flex', alignItems: 'center', fontSize: 15 },
            });
        }

        // 6. Profile - All users
        items.push({
            key: '6',
            icon: <UserOutlined style={{ fontSize: 20 }} />,
            label: <span style={{ fontWeight: 600 }}>Hồ sơ cá nhân</span>,
            style: { borderRadius: 12, marginBottom: 12, height: 54, display: 'flex', alignItems: 'center', fontSize: 15 },
        });

        // 7. Complaints - All management roles + Teacher
        items.push({
            key: '7',
            icon: <FlagOutlined style={{ fontSize: 20 }} />,
            label: <span style={{ fontWeight: 600 }}>Góp ý & Khiếu nại</span>,
            style: { borderRadius: 12, marginBottom: 12, height: 54, display: 'flex', alignItems: 'center', fontSize: 15 },
        });

        // 8. Student Feedback - Teacher only
        if (role === 'TEACHER') {
            items.push({
                key: '8',
                icon: <MessageOutlined style={{ fontSize: 20 }} />,
                label: <span style={{ fontWeight: 600 }}>Ý kiến học viên</span>,
                style: { borderRadius: 12, marginBottom: 12, height: 54, display: 'flex', alignItems: 'center', fontSize: 15 },
            });
        }

        return items;
    };

    return (
        <Layout style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
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
                    background: 'var(--sidebar-bg)',
                    borderRight: `1px solid var(--border-color)`,
                    position: 'fixed',
                    height: '100vh',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    zIndex: 100,
                    boxShadow: 'var(--card-shadow)',
                    transition: 'all 0.3s ease'
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
                    onClick={({ key }) => {
                        setSelectedMenu(key);
                        handleMenuClick(key);
                    }}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '0 12px'
                    }}
                    items={getMenuItems()}
                />
            </Sider>

            <Layout style={{
                marginLeft: collapsed ? 80 : 260,
                transition: 'all 0.2s',
                background: 'transparent'
            }}>
                <Header
                    style={{
                        margin: '16px 24px',
                        padding: '0 24px',
                        background: 'var(--header-bg)',
                        backdropFilter: 'blur(12px)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderRadius: 20,
                        border: `1px solid var(--border-color)`,
                        boxShadow: 'var(--card-shadow)',
                        height: 70,
                        position: 'sticky',
                        top: 16,
                        zIndex: 90,
                        transition: 'all 0.3s ease'
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
                                background: isDark ? '#334155' : '#F0F9FF',
                                color: isDark ? '#F1F5F9' : '#1E40AF'
                            }}
                        />
                        <Title level={4} style={{ margin: 0, color: isDark ? '#F1F5F9' : '#1E3A8A', fontWeight: 700, letterSpacing: '-0.5px' }}>
                            {getMenuTitle(selectedMenu)}
                        </Title>
                    </div>

                    <Space size="large">
                        <Button
                            type="text"
                            icon={isDark ? <SunOutlined /> : <MoonOutlined />}
                            onClick={toggleTheme}
                            style={{
                                width: 45,
                                height: 45,
                                borderRadius: 12,
                                fontSize: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: isDark ? '#334155' : '#F0F9FF',
                                color: isDark ? '#FCD34D' : '#1E40AF', // Warm yellow for sun, blue for moon
                                border: 'none'
                            }}
                        />

                        <NotificationCenter />

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {/* Avatar section - Trực tiếp click để upload */}
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
                                        size={45}
                                        style={{ border: '2px solid #fff', boxShadow: '0 4px 12px rgba(30, 64, 175, 0.15)' }}
                                        icon={<UserOutlined />}
                                    />
                                    <div
                                        style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            right: 0,
                                            background: '#3B82F6',
                                            borderRadius: '50%',
                                            width: 16,
                                            height: 16,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '2px solid white',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                        }}
                                    >
                                        <CameraOutlined style={{ fontSize: 9, color: 'white' }} />
                                    </div>
                                </div>
                            </Upload>

                            {/* User Info & Settings Dropdown */}
                            <Dropdown
                                menu={{
                                    items: [
                                        {
                                            key: 'profile',
                                            label: <span style={{ fontWeight: 600 }}>👤 Hồ sơ cá nhân</span>,
                                            onClick: () => navigate('/profile')
                                        },
                                        ...(user.role !== 'ADMIN' ? [{
                                            key: 'change_password',
                                            label: <span style={{ fontWeight: 600 }}>🔒 Đổi mật khẩu</span>,
                                            onClick: () => setIsPassModalVisible(true)
                                        }] : []),
                                    ]
                                }}
                                trigger={['click']}
                                disabled={user.role === 'ADMIN'} // Admin không có đổi mật khẩu thì disable dropdown
                            >
                                <div style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    justifyContent: 'center',
                                    cursor: user.role !== 'ADMIN' ? 'pointer' : 'default'
                                }}>
                                    <span style={{ fontWeight: 800, color: isDark ? '#F1F5F9' : '#1E3A8A', fontSize: 15, lineHeight: '1.2', marginBottom: 2 }}>
                                        {user.name}
                                    </span>
                                    <span style={{ fontSize: 11, color: '#3B82F6', fontWeight: 700, textTransform: 'uppercase', lineHeight: '1', letterSpacing: '0.5px' }}>
                                        {ROLE_LABELS[user.role] || user.role}
                                    </span>
                                </div>
                            </Dropdown>
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
                                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
                                padding: '0 20px'
                            }}
                        >
                            Đăng xuất
                        </Button>
                    </Space>
                </Header>

                <ChangePasswordModal
                    visible={isPassModalVisible}
                    isForced={user.isFirstLogin}
                    onCancel={() => {
                        if (user.isFirstLogin && user.role !== 'ADMIN') {
                            handleLogout();
                        } else {
                            setIsPassModalVisible(false);
                        }
                    }}
                    onSuccess={() => {
                        setIsPassModalVisible(false);
                        handleLogout();
                    }}
                />

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
