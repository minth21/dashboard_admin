import { Typography, Card, Space, Spin, Avatar, Tag, Modal, Skeleton, Divider, Empty, Row, Col, Progress, Button } from 'antd';
import {
    FileTextOutlined,
    QuestionCircleOutlined,
    UserOutlined,
    InfoCircleOutlined,
    ReloadOutlined,
    BookOutlined,
    TrophyOutlined,
    CrownOutlined,
    CheckCircleOutlined,
    RiseOutlined,
    FallOutlined,
    MessageOutlined,
} from '@ant-design/icons';
import { useOutletContext, useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { dashboardApi } from '../services/api';
import { useTheme } from '../hooks/useThemeContext';

const { Title, Text } = Typography;

interface TopStudent {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    estimatedScore: number;
    estimatedListening: number;
    estimatedReading: number;
}

interface RecentSubmission {
    id: string;
    userId: string;
    score: number;
    totalQuestions: number;
    toeicScore: number;
    createdAt: string;
    user: { name: string; avatarUrl?: string };
    part: { partName: string; test: { title: string } };
}

interface DashboardStats {
    users: number;
    tests: number;
    classes: number;
    questions: number;
    averageScore: number;
    totalSubmissions: number;
    topStudents: TopStudent[];
    recentSubmissions: RecentSubmission[];
}

interface User {
    name: string;
    email: string;
    role: string;
}

export default function Overview() {
    const { user } = useOutletContext<{ user: User }>();
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Submission Detail Modal States
    const [searchParams, setSearchParams] = useSearchParams();
    const [submissionModalVisible, setSubmissionModalVisible] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
    const [submissionLoading, setSubmissionLoading] = useState(false);

    useEffect(() => {
        // Only fetch stats if user is ADMIN or SPECIALIST
        const canViewDashboard = user.role === 'ADMIN' || user.role === 'SPECIALIST';

        if (!canViewDashboard) {
            setLoading(false);
            return;
        }

        const fetchStats = async () => {
            try {
                const response = await dashboardApi.getStats();
                if (response.success) {
                    setStats(response.data as any);
                }
            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [user.role]);

    // Handle deep linking for submissionId
    useEffect(() => {
        const submissionId = searchParams.get('submissionId');
        if (submissionId) {
            setSubmissionModalVisible(true);
            loadSubmissionDetail(submissionId);
        }
    }, [searchParams]);

    const loadSubmissionDetail = async (id: string) => {
        setSubmissionLoading(true);
        try {
            const response = await dashboardApi.getSubmissionDetail(id);
            if (response.success) {
                setSelectedSubmission(response.data);
            } else {
                setSelectedSubmission(null);
            }
        } catch (error) {
            console.error('Failed to fetch submission detail:', error);
            setSelectedSubmission(null);
        } finally {
            setSubmissionLoading(false);
        }
    };

    const handleCloseModal = () => {
        setSubmissionModalVisible(false);
        // Cleanup URL parameter
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('submissionId');
        setSearchParams(newParams);
        
        // Short delay before clearing data to avoid flicker during close animation
        setTimeout(() => setSelectedSubmission(null), 300);
    };

    if (!user) return null;

    const canViewFullDashboard = user.role === 'ADMIN' || user.role === 'SPECIALIST';

    return (
        <div style={{ padding: '0 0 40px' }}>
            <div style={{ marginBottom: 32 }}>
                <Title level={2} style={{ color: isDark ? '#93C5FD' : '#1E3A8A', margin: 0, fontWeight: 700, letterSpacing: '-1px' }}>
                    Chào mừng trở lại, {user.name}!
                </Title>
                <Text style={{ color: 'var(--text-secondary)', fontSize: 16, fontWeight: 500 }}>
                    Nơi tạo ra và quản lý đề thi TOEIC cho học viên ôn luyện.
                </Text>
            </div>

            <Space direction="vertical" size={32} style={{ width: '100%' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
                    {loading ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
                            <Spin size="large" />
                        </div>
                    ) : stats && (
                        [
                            { title: 'Người dùng', count: (stats?.users ?? 0).toLocaleString(), icon: <UserOutlined />, color: '#3B82F6', bg: isDark ? 'rgba(59, 130, 246, 0.2)' : '#EFF6FF' },
                            { title: 'Đề thi', count: (stats?.tests ?? 0).toLocaleString(), icon: <FileTextOutlined />, color: '#10B981', bg: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5' },
                            { title: 'Lớp học', count: (stats?.classes ?? 0).toLocaleString(), icon: <BookOutlined />, color: '#F43F5E', bg: isDark ? 'rgba(244, 63, 94, 0.2)' : '#FFF1F2' },
                            { title: 'Câu hỏi', count: (stats?.questions ?? 0).toLocaleString(), icon: <QuestionCircleOutlined />, color: '#F59E0B', bg: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FFFBEB' },
                        ].map((item, index) => (
                            <Card
                                key={index}
                                hoverable
                                style={{
                                    border: 'none',
                                    borderRadius: 24,
                                    boxShadow: 'var(--card-shadow)',
                                    transition: 'all 0.3s ease',
                                    background: isDark ? 'rgba(30, 41, 59, 0.7)' : 'linear-gradient(135deg, #FFFFFF 0%, #FAFCFF 100%)',
                                    backdropFilter: isDark ? 'blur(10px)' : 'none',
                                }}
                            >
                                <Space size={20} align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                                    <div>
                                        <Text style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            {item.title}
                                        </Text>
                                        <Title level={2} style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 700 }}>
                                            {item.count}
                                        </Title>
                                    </div>
                                    <div style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 14,
                                        background: item.bg,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 20,
                                        color: item.color
                                    }}>
                                        {item.icon}
                                    </div>
                                </Space>
                            </Card>
                        )))}
                </div>

                {canViewFullDashboard && (
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
                        {/* Leaderboard Section */}
                        <Card
                            title={
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: isDark ? '#334155' : '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDark ? '#FCD34D' : '#D97706' }}>
                                        <TrophyOutlined />
                                    </div>
                                    <span style={{ fontWeight: 800, color: isDark ? '#F1F5F9' : '#1E3A8A', letterSpacing: '-0.5px' }}>BẢNG XẾP HẠNG HỌC VIÊN</span>
                                </div>
                            }
                            style={{
                                borderRadius: 24,
                                border: `1px solid var(--border-color)`,
                                boxShadow: 'var(--card-shadow)',
                                background: isDark ? 'rgba(30, 41, 59, 0.7)' : '#FFFFFF',
                                backdropFilter: isDark ? 'blur(10px)' : 'none',
                            }}
                            bodyStyle={{ padding: '12px 24px' }}
                        >
                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '20px' }}><Spin /></div>
                            ) : (stats?.topStudents || []).length > 0 ? (
                                (stats?.topStudents || []).map((s, i) => {
                                    const rankColor = i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#F1F5F9';
                                    const isTop3 = i < 3;

                                    return (
                                        <div key={s.id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '16px 0',
                                            borderBottom: i === ((stats?.topStudents?.length || 0) - 1) ? 'none' : `1px solid var(--border-color)`,
                                            transition: 'all 0.2s ease',
                                        }}>
                                            <Space size={16}>
                                                <div style={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 800,
                                                    fontSize: 14,
                                                    background: isTop3 ? rankColor : isDark ? '#334155' : '#F8FAFC',
                                                    color: isTop3 ? '#FFF' : 'var(--text-secondary)',
                                                    boxShadow: isTop3 ? `0 4px 10px ${rankColor}44` : 'none',
                                                    border: isTop3 ? 'none' : `1px solid var(--border-color)`
                                                }}>
                                                    {i + 1}
                                                </div>
                                                <div style={{ position: 'relative' }}>
                                                    <Avatar
                                                        src={s.avatarUrl}
                                                        size={44}
                                                        icon={<UserOutlined />}
                                                        style={{ border: isTop3 ? `2px solid ${rankColor}` : '2px solid transparent' }}
                                                    />
                                                    {i === 0 && <CrownOutlined style={{ position: 'absolute', top: -10, left: 14, color: '#FFD700', fontSize: 16 }} />}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>{s.name}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.email}</div>
                                                </div>
                                            </Space>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                                                    <div style={{
                                                        background: isTop3 ? `${rankColor}15` : isDark ? '#334155' : '#F8FAFC',
                                                        color: isTop3 ? (i === 0 ? '#FFD700' : i === 1 ? '#94A3B8' : '#CD7F32') : 'var(--text-primary)',
                                                        padding: '4px 10px',
                                                        borderRadius: 10,
                                                        fontWeight: 800,
                                                        fontSize: 14,
                                                        display: 'inline-block'
                                                    }}>
                                                        {s.estimatedScore} <small style={{ fontSize: 9, fontWeight: 600 }}>PTS</small>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 6, fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                        <span style={{ color: '#3B82F6' }}>L: {s.estimatedListening || 0}</span>
                                                        <span style={{ color: '#F43F5E' }}>R: {s.estimatedReading || 0}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                    Chưa có dữ liệu xếp hạng
                                </div>
                            )}
                        </Card>

                        {/* System Info */}
                        <Card
                            title={
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: isDark ? '#334155' : '#F0F9FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDark ? '#38BDF8' : '#0EA5E9' }}>
                                        <InfoCircleOutlined />
                                    </div>
                                    <span style={{ fontWeight: 600, color: isDark ? '#F1F5F9' : '#1E3A8A' }}>Hệ thống</span>
                                </div>
                            }
                            style={{ 
                                borderRadius: 20, 
                                border: `1px solid var(--border-color)`, 
                                boxShadow: 'var(--card-shadow)',
                                background: isDark ? 'rgba(30, 41, 59, 0.7)' : '#FFFFFF',
                                backdropFilter: isDark ? 'blur(10px)' : 'none',
                            }}
                        >
                            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Text type="secondary" style={{color: 'var(--text-secondary)'}}>Tổng lượt làm bài</Text>
                                    <Text strong style={{color: 'var(--text-primary)'}}>{stats?.totalSubmissions ?? 0}</Text>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Text type="secondary" style={{color: 'var(--text-secondary)'}}>Điểm trung bình</Text>
                                    <Text strong style={{color: 'var(--text-primary)'}}>{stats?.averageScore ?? 0} pts</Text>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Text type="secondary" style={{color: 'var(--text-secondary)'}}>Trạng thái</Text>
                                    <Tag color="success">Hoạt động</Tag>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Text type="secondary" style={{color: 'var(--text-secondary)'}}>Phiên bản</Text>
                                    <Text strong style={{color: 'var(--text-primary)'}}>v2.2.0-RBAC</Text>
                                </div>
                            </Space>
                        </Card>
                    </div>
                )}

                {canViewFullDashboard && (
                    /* Recent Submissions Section */
                    <Card
                        title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: isDark ? '#334155' : '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDark ? '#A78BFA' : '#8B5CF6' }}>
                                    <ReloadOutlined />
                                </div>
                                <span style={{ fontWeight: 600, color: isDark ? '#F1F5F9' : '#1E3A8A' }}>Hoạt động làm bài gần đây</span>
                            </div>
                        }
                        style={{ 
                            borderRadius: 20, 
                            border: `1px solid var(--border-color)`, 
                            boxShadow: 'var(--card-shadow)',
                            background: isDark ? 'rgba(30, 41, 59, 0.7)' : '#FFFFFF',
                            backdropFilter: isDark ? 'blur(10px)' : 'none',
                        }}
                    >
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                            {loading ? <Spin /> : (stats?.recentSubmissions || []).map((sub) => (
                                <div 
                                    key={sub.id} 
                                    onClick={() => navigate(`/dashboard?submissionId=${sub.id}`)}
                                    style={{
                                        padding: '16px',
                                        background: isDark ? '#334155' : '#F8FAFC',
                                        borderRadius: 16,
                                        border: `1px solid var(--border-color)`,
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s, box-shadow 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'none';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                        <Space>
                                            <Avatar size="small" src={sub.user.avatarUrl} icon={<UserOutlined />} />
                                            <Text strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{sub.user.name}</Text>
                                        </Space>
                                        <Text type="secondary" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                            {new Date(sub.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </div>
                                    <div style={{ color: isDark ? '#93C5FD' : '#1E3A8A', fontWeight: 600, fontSize: 14 }}>
                                        {sub.part.test.title}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                                        {sub.part.partName}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Tag color="blue">{sub.score}/{sub.totalQuestions} câu</Tag>
                                        <div style={{ fontWeight: 700, color: '#f50b0bff' }}>+{sub.toeicScore} pts</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </Space >

            {/* Submission Detail Modal */}
            <Modal
                title={
                    <div style={{ borderBottom: `1px solid var(--border-color)`, paddingBottom: 16, marginBottom: 0 }}>
                        <Space size={12}>
                            <Avatar size="large" src={selectedSubmission?.user?.avatarUrl} icon={<UserOutlined />} style={{ backgroundColor: '#3B82F6' }} />
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedSubmission?.user?.name || (submissionLoading ? 'Đang tải...' : 'Không xác định')}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Chi tiết kết quả thực hiện bài thi</div>
                            </div>
                        </Space>
                    </div>
                }
                open={submissionModalVisible}
                onCancel={handleCloseModal}
                footer={[
                    <Button key="close" type="primary" onClick={handleCloseModal} style={{ borderRadius: 8, height: 40, padding: '0 24px' }}>
                        Đóng
                    </Button>
                ]}
                width={800}
                styles={{ body: { overflowY: 'auto', maxHeight: 'calc(100vh - 250px)', padding: '24px' } }}
                centered
            >
                <Skeleton active loading={submissionLoading} avatar paragraph={{ rows: 8 }}>
                    {selectedSubmission ? (
                        <div style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
                            {/* Summary Header Cards */}
                            <Row gutter={[16, 16]}>
                                <Col span={8}>
                                    <Card style={{ textAlign: 'center', background: isDark ? '#334155' : '#F0F9FF', border: 'none', borderRadius: 16 }}>
                                        <Text type="secondary" style={{ fontSize: 12, display: 'block', color: 'var(--text-secondary)' }}>KẾT QUẢ</Text>
                                        <Title level={3} style={{ margin: '8px 0', color: isDark ? '#60A5FA' : '#1E40AF' }}>
                                            {selectedSubmission.correctCount} / {selectedSubmission.totalQuestions}
                                        </Title>
                                        <Tag color="blue" icon={<CheckCircleOutlined />}>Số câu đúng</Tag>
                                    </Card>
                                </Col>
                                <Col span={8}>
                                    <Card style={{ textAlign: 'center', background: isDark ? 'rgba(153, 27, 27, 0.2)' : '#FEF2F2', border: 'none', borderRadius: 16 }}>
                                        <Text type="secondary" style={{ fontSize: 12, display: 'block', color: 'var(--text-secondary)' }}>TỔNG ĐIỂM (EST.)</Text>
                                        <Title level={3} style={{ margin: '8px 0', color: isDark ? '#F87171' : '#991B1B' }}>
                                            {selectedSubmission.totalScore} pts
                                        </Title>
                                        <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>Tương đương mức {selectedSubmission.totalScore >= 700 ? 'Expert' : selectedSubmission.totalScore >= 450 ? 'Intermediate' : 'Beginner'}</div>
                                    </Card>
                                </Col>
                                <Col span={8}>
                                    <Card style={{ textAlign: 'center', background: isDark ? '#1E293B' : '#F8FAFC', border: 'none', borderRadius: 16 }}>
                                        <Text type="secondary" style={{ fontSize: 12, display: 'block', color: 'var(--text-secondary)' }}>THỜI GIAN</Text>
                                        <Title level={3} style={{ margin: '8px 0', color: 'var(--text-primary)' }}>
                                            {Math.floor(selectedSubmission.durationSeconds / 60)}:{String(selectedSubmission.durationSeconds % 60).padStart(2, '0')}
                                        </Title>
                                        <Tag icon={<ReloadOutlined />}>Phút/Giây</Tag>
                                    </Card>
                                </Col>
                            </Row>

                            <Divider orientation={"left" as any} style={{ margin: '32px 0 16px' }}>
                                <Space style={{ color: 'var(--text-primary)' }}><CrownOutlined style={{ color: '#F59E0B' }} /> AI Coach Assessment</Space>
                            </Divider>

                            {/* AI Assessment Integration */}
                            {selectedSubmission.aiAnalysis ? (() => {
                                let analysis: any = {};
                                try {
                                    analysis = typeof selectedSubmission.aiAnalysis === 'string' 
                                        ? JSON.parse(selectedSubmission.aiAnalysis) 
                                        : selectedSubmission.aiAnalysis;
                                } catch (e) {
                                    console.error("AI Analysis Parse Error", e);
                                }

                                return (
                                    <Space direction="vertical" size={20} style={{ width: '100%' }}>
                                        {/* Skill Progress Breakdown */}
                                        {analysis.skills && (
                                            <Card size="small" style={{ borderRadius: 16, border: `1px solid var(--border-color)`, background: isDark ? 'rgba(30, 41, 59, 0.5)' : '#FFFFFF' }}>
                                                <Row gutter={[24, 16]}>
                                                    {Object.entries(analysis.skills).map(([skill, val]: [string, any]) => (
                                                        <Col span={12} key={skill}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                                <Text strong style={{ textTransform: 'capitalize', fontSize: 12, color: 'var(--text-primary)' }}>{skill === 'grammar' ? 'Ngữ pháp' : skill === 'vocabulary' ? 'Từ vựng' : skill === 'inference' ? 'Suy luận' : 'Ý chính'}</Text>
                                                                <Text type="secondary" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{val}/10 pts</Text>
                                                            </div>
                                                            <Progress percent={val * 10} showInfo={false} strokeColor={val >= 7 ? '#10B981' : val >= 5 ? '#F59E0B' : '#EF4444'} />
                                                        </Col>
                                                    ))}
                                                </Row>
                                            </Card>
                                        )}

                                        {/* Strengths and Weaknesses */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                            <div style={{ background: isDark ? 'rgba(16, 185, 129, 0.1)' : '#F0FDF4', padding: '16px', borderRadius: 16 }}>
                                                <div style={{ color: isDark ? '#34D399' : '#166534', fontWeight: 800, fontSize: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <RiseOutlined /> ĐIỂM MẠNH
                                                </div>
                                                <ul style={{ paddingLeft: 16, margin: 0, color: isDark ? '#A7F3D0' : '#166534', fontSize: 13 }}>
                                                    {analysis.strengths?.map((s: string, idx: number) => <li key={idx}>{s}</li>) || <li>Chưa có ghi nhận</li>}
                                                </ul>
                                            </div>
                                            <div style={{ background: isDark ? 'rgba(244, 63, 94, 0.1)' : '#FFF1F2', padding: '16px', borderRadius: 16 }}>
                                                <div style={{ color: isDark ? '#FB7185' : '#9F1239', fontWeight: 800, fontSize: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <FallOutlined /> CẦN CẢI THIỆN
                                                </div>
                                                <ul style={{ paddingLeft: 16, margin: 0, color: isDark ? '#FECDD3' : '#9F1239', fontSize: 13 }}>
                                                    {analysis.weaknesses?.map((w: string, idx: number) => <li key={idx}>{w}</li>) || <li>Chưa có ghi nhận</li>}
                                                </ul>
                                            </div>
                                        </div>

                                        {/* Detailed Feedback */}
                                        <Card 
                                            size="small" 
                                            title={<Space style={{ color: 'var(--text-primary)' }}><MessageOutlined /> Nhận xét chuyên sâu từ AI Coach</Space>}
                                            style={{ borderRadius: 16, border: 'none', background: isDark ? '#334155' : '#F8FAFC' }}
                                        >
                                            <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }} 
                                                 dangerouslySetInnerHTML={{ __html: analysis.detailedAssessment || analysis.shortFeedback || 'Chưa có phân tích chi tiết.' }} 
                                            />
                                        </Card>
                                    </Space>
                                );
                            })() : (
                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span style={{color: 'var(--text-secondary)'}}>AI đang phân tích bài làm của học viên này...</span>} />
                            )}

                            <Divider orientation={"left" as any} style={{ margin: '32px 0 16px' }}>
                                <Space style={{ color: 'var(--text-primary)' }}><FileTextOutlined style={{ color: '#3B82F6' }} /> Thông tin bài thi</Space>
                            </Divider>
                            
                            <div style={{ background: isDark ? '#334155' : '#F8FAFC', padding: '20px', borderRadius: 16, border: `1px solid var(--border-color)` }}>
                                <Row gutter={[24, 12]}>
                                    <Col span={12}>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Đề thi</div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedSubmission.part?.test?.title || 'TOEIC-TEST Official'}</div>
                                    </Col>
                                    <Col span={12}>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Phần thi</div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedSubmission.part?.partName} (Part {selectedSubmission.part?.partNumber})</div>
                                    </Col>
                                    <Col span={12}>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Ngày nộp</div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{new Date(selectedSubmission.createdAt).toLocaleString('vi-VN')}</div>
                                    </Col>
                                    <Col span={12}>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>ID Bài làm</div>
                                        <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)' }}>{selectedSubmission.id}</div>
                                    </Col>
                                </Row>
                            </div>
                        </div>
                    ) : !submissionLoading && (
                        <Empty description={<span style={{color: 'var(--text-secondary)'}}>Không tìm thấy thông tin bài làm này hoặc học viên đã xóa.</span>} />
                    )}
                </Skeleton>
            </Modal>
        </div >
    );
}
