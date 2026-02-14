import { Typography, Card, Space, Spin, message } from 'antd';
import {
    FileTextOutlined,
    QuestionCircleOutlined,
    UserOutlined,
    InfoCircleOutlined,
} from '@ant-design/icons';
import { useOutletContext } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { dashboardApi } from '../services/api';

const { Title, Text } = Typography;

interface User {
    name: string;
    email: string;
}

export default function Overview() {
    const { user } = useOutletContext<{ user: User }>();
    const [stats, setStats] = useState({ users: 0, tests: 0, questions: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await dashboardApi.getStats();
                if (response.success) {
                    setStats(response.data);
                }
            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error);
                message.error('Không thể tải số liệu thống kê');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (!user) return null;

    return (
        <div style={{ padding: '0 0 40px' }}>
            <div style={{ marginBottom: 32 }}>
                <Title level={2} style={{ color: '#1E3A8A', margin: 0, fontWeight: 800, letterSpacing: '-1px' }}>
                    Chào mừng trở lại, {user.name.split(' ')[0]}!
                </Title>
                <Text style={{ color: '#64748B', fontSize: 16, fontWeight: 500 }}>
                    Nơi tạo ra và quản lý đề thi TOEIC cho học viên ôn luyện.
                </Text>
            </div>

            <Space direction="vertical" size={32} style={{ width: '100%' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                    {loading ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
                            <Spin size="large" />
                        </div>
                    ) : (
                        [
                            { title: 'Người dùng', count: stats.users.toLocaleString(), icon: <UserOutlined />, color: '#3B82F6', bg: '#EFF6FF' },
                            { title: 'Đề thi', count: stats.tests.toLocaleString(), icon: <FileTextOutlined />, color: '#10B981', bg: '#ECFDF5' },
                            { title: 'Câu hỏi', count: stats.questions.toLocaleString(), icon: <QuestionCircleOutlined />, color: '#F59E0B', bg: '#FFFBEB' },
                        ].map((item, index) => (
                            <Card
                                key={index}
                                hoverable
                                style={{
                                    border: 'none',
                                    borderRadius: 16,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <Space size={20} align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                                    <div>
                                        <Text style={{ fontSize: 14, color: '#64748B', display: 'block', marginBottom: 4 }}>
                                            {item.title}
                                        </Text>
                                        <Title level={2} style={{ margin: 0, color: '#1E293B', fontWeight: 800 }}>
                                            {item.count}
                                        </Title>
                                    </div>
                                    <div style={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: 16,
                                        background: item.bg,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 24,
                                        color: item.color
                                    }}>
                                        {item.icon}
                                    </div>
                                </Space>
                            </Card>
                        )))}
                </div>

                <Card
                    title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
                                <InfoCircleOutlined />
                            </div>
                            <span style={{ fontWeight: 700, color: '#1E3A8A' }}>Thông tin hệ thống</span>
                        </div>
                    }
                    style={{ borderRadius: 20, border: '1px solid #E0F2FE', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}
                    headStyle={{ borderBottom: '1px solid #F1F5F9' }}
                >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                        <div style={{ padding: '12px 20px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #F1F5F9' }}>
                            <Text type="secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Máy chủ</Text>
                            <div style={{ color: '#1E293B', fontWeight: 600, marginTop: 4 }}>http://localhost:3000</div>
                        </div>
                        <div style={{ padding: '12px 20px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #F1F5F9' }}>
                            <Text type="secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Cơ sở dữ liệu</Text>
                            <div style={{ color: '#1E293B', fontWeight: 600, marginTop: 4 }}>PostgreSQL 16.0</div>
                        </div>
                        <div style={{ padding: '12px 20px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #F1F5F9' }}>
                            <Text type="secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Quản trị viên</Text>
                            <div style={{ color: '#1E293B', fontWeight: 600, marginTop: 4 }}>{user.email}</div>
                        </div>
                    </div>
                </Card>
            </Space >
        </div >
    );
}
