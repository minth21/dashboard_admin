import React, { useState, useEffect, useCallback } from 'react';
import { Timeline, Card, Tag, Typography, Empty, Spin, Button, Space, Badge, Divider, Row, Col, Statistic } from 'antd';
import { 
    BarChartOutlined, 
    BulbOutlined, 
    BookOutlined, 
    ArrowUpOutlined, 
    ArrowDownOutlined, 
    LineOutlined,
    ClockCircleOutlined,
    FlagOutlined,
    TrophyOutlined,
    FireOutlined
} from '@ant-design/icons';
import { aiApi, userApi } from '../services/api';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { Line } from '@ant-design/plots';

const { Text, Title, Paragraph } = Typography;

interface AiTimelineViewProps {
    userId: string;
    isDark: boolean;
}

const ASSESSMENT_THEMES: Record<string, { color: string; icon: React.ReactNode; label: string; bg: string }> = {
    PERFORMANCE: {
        color: '#3B82F6',
        icon: <BarChartOutlined />,
        label: 'ĐÁNH GIÁ KẾT QUẢ',
        bg: 'rgba(59, 130, 246, 0.1)'
    },
    COACHING: {
        color: '#F59E0B',
        icon: <BulbOutlined />,
        label: 'LỜI KHUYÊN HỌC TẬP',
        bg: 'rgba(245, 158, 11, 0.1)'
    },
    EXPLANATION: {
        color: '#8B5CF6',
        icon: <BookOutlined />,
        label: 'GIẢI THÍCH CHUYÊN SÂU',
        bg: 'rgba(139, 92, 246, 0.1)'
    }
};

const TREND_THEMES: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
    UP: { color: '#10B981', icon: <ArrowUpOutlined />, text: 'Tiến bộ' },
    DOWN: { color: '#EF4444', icon: <ArrowDownOutlined />, text: 'Giảm sút' },
    STABLE: { color: '#64748B', icon: <LineOutlined />, text: 'Ổn định' }
};

export default function AiTimelineView({ userId, isDark }: AiTimelineViewProps) {
    const [loading, setLoading] = useState(true);
    const [assessments, setAssessments] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const fetchTimeline = useCallback(async (pageNum: number, isLoadMore: boolean = false) => {
        if (!userId) return;
        
        if (!isLoadMore) setLoading(true);
        try {
            const [timelineRes, userRes] = await Promise.all([
                aiApi.getAiTimeline(userId, pageNum),
                pageNum === 1 ? userApi.getUserById(userId) : Promise.resolve(null)
            ]);

            if (timelineRes.success) {
                if (isLoadMore) {
                    setAssessments(prev => [...prev, ...timelineRes.data]);
                } else {
                    setAssessments(timelineRes.data);
                }
                setHasMore(pageNum < timelineRes.meta.lastPage);
            }

            if (userRes && userRes.success) {
                setUser(userRes.user);
            }
        } catch (error) {
            console.error('Error fetching AI data:', error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchTimeline(1);
    }, [fetchTimeline]);

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchTimeline(nextPage, true);
    };

    // Prepare chart data for Burn Down Chart
    const getChartData = () => {
        if (!user || assessments.length === 0) return [];
        
        const target = user.targetScore || 990;
        
        // Filter assessments that have scores and sort by date ascending for chart
        const scoredAssessments = [...assessments]
            .filter(a => a.score !== null)
            .sort((a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix());

        if (scoredAssessments.length === 0) return [];

        const data: any[] = [];
        
        // Initial point (Start of timeline or account creation)
        const firstDate = dayjs(user.createdAt).format('DD/MM/YYYY');
        data.push({
            date: firstDate,
            remaining: target,
            type: 'Khoảng cách mục tiêu'
        });

        // Points during timeline
        scoredAssessments.forEach(item => {
            const currentScore = item.score || 0;
            const remaining = Math.max(0, target - currentScore);
            data.push({
                date: dayjs(item.createdAt).format('DD/MM/YYYY'),
                remaining: remaining,
                type: 'Khoảng cách mục tiêu'
            });
        });

        return data;
    };

    const chartConfig = {
        data: getChartData(),
        xField: 'date',
        yField: 'remaining',
        seriesField: 'type',
        smooth: true,
        animation: {
            appear: {
                animation: 'path-in',
                duration: 1500,
            },
        },
        color: ['#F43F5E'], // Rose color for "burning" effect
        point: {
            size: 5,
            shape: 'diamond',
            style: {
                fill: 'white',
                stroke: '#F43F5E',
                lineWidth: 2,
            },
        },
        yAxis: {
            title: { text: 'Điểm còn thiếu' },
            min: 0,
        },
        tooltip: {
            showMarkers: false,
        },
        interactions: [{ type: 'marker-active' }],
    };

    if (loading && assessments.length === 0) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <Spin size="large" tip="Đang tải lộ trình AI..." />
            </div>
        );
    }

    // Group assessments by date
    const grouped = assessments.reduce((acc: any, item: any) => {
        const date = dayjs(item.createdAt).locale('vi').format('DD MMMM, YYYY');
        if (!acc[date]) acc[date] = [];
        acc[date].push(item);
        return acc;
    }, {});

    const targetScore = user?.targetScore || 0;
    const currentScore = user?.estimatedScore || 0;
    const remainingScore = Math.max(0, targetScore - currentScore);

    return (
        <div style={{ padding: '10px 20px' }}>
            {/* Header Statistics & Burn Down Chart */}
            <Card 
                style={{ 
                    marginBottom: 32, 
                    borderRadius: 24, 
                    border: 'none', 
                    background: isDark ? '#1E293B' : '#FFFFFF',
                    boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 30px rgba(0,0,0,0.05)'
                }}
                bodyStyle={{ padding: '24px 32px' }}
            >
                <Row gutter={[32, 32]}>
                    <Col xs={24} md={8}>
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Title level={4} style={{ color: isDark ? '#F1F5F9' : '#0F172A', marginBottom: 24 }}>
                                <FireOutlined style={{ color: '#F43F5E', marginRight: 10 }} />
                                TOEIC Burn Down
                            </Title>
                            
                            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                                <Statistic 
                                    title="Mục tiêu của bạn" 
                                    value={targetScore} 
                                    suffix="PTS" 
                                    prefix={<FlagOutlined />} 
                                    valueStyle={{ color: '#3B82F6', fontWeight: 800 }}
                                />
                                <Statistic 
                                    title="Khoảng cách còn lại" 
                                    value={remainingScore} 
                                    suffix="PTS" 
                                    prefix={<TrophyOutlined />} 
                                    valueStyle={{ color: '#F43F5E', fontWeight: 800 }}
                                />
                            </Space>
                            
                            <div style={{ marginTop: 24 }}>
                                <Tag color={remainingScore === 0 ? 'success' : 'processing'} style={{ borderRadius: 20, padding: '4px 15px', fontWeight: 600 }}>
                                    {remainingScore === 0 ? 'Đã chinh phục mục tiêu! 🎉' : `Cần thêm ${remainingScore} điểm nữa`}
                                </Tag>
                            </div>
                        </div>
                    </Col>
                    
                    <Col xs={24} md={16}>
                        <div style={{ height: 250 }}>
                            {getChartData().length > 1 ? (
                                <Line {...chartConfig} />
                            ) : (
                                <Empty description="Cần ít nhất 2 bài kiểm tra để vẽ biểu đồ tiến độ" style={{ marginTop: 40 }} />
                            )}
                        </div>
                    </Col>
                </Row>
            </Card>

            <Divider orientation={"left" as any} style={{ borderTopColor: isDark ? '#334155' : '#E2E8F0' }}>
                <Text strong style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 13, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Chi tiết lộ trình luyện tập
                </Text>
            </Divider>

            {assessments.length === 0 ? (
                <Empty 
                    image={Empty.PRESENTED_IMAGE_SIMPLE} 
                    description={<Text type="secondary">Chưa có nhận xét nào từ AI cho học viên này.</Text>}
                    style={{ padding: '40px 0' }}
                />
            ) : (
                <Timeline mode="left" style={{ marginTop: 32 }}>
                    {Object.keys(grouped).map((date) => (
                        <React.Fragment key={date}>
                            <Timeline.Item 
                                dot={<ClockCircleOutlined style={{ fontSize: '18px', color: isDark ? '#94A3B8' : '#64748B' }} />}
                                label={<Text strong style={{ color: isDark ? '#94A3B8' : '#64748B' }}>{date}</Text>}
                            >
                                <div style={{ marginBottom: 32 }}>
                                    {grouped[date].map((item: any) => {
                                        const theme = ASSESSMENT_THEMES[item.type] || ASSESSMENT_THEMES.PERFORMANCE;
                                        const trend = item.trend ? TREND_THEMES[item.trend] : null;

                                        return (
                                            <Card
                                                key={item.id}
                                                style={{
                                                    marginBottom: 20,
                                                    borderRadius: 20,
                                                    background: isDark ? '#1E293B' : '#FFFFFF',
                                                    border: isDark ? '1px solid #334155' : '1px solid #F1F5F9',
                                                    boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.2)' : '0 4px 12px rgba(0,0,0,0.03)',
                                                    overflow: 'hidden',
                                                    transition: 'all 0.3s ease'
                                                }}
                                                bodyStyle={{ padding: '20px 24px' }}
                                                className="assessment-card"
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                                    <Space size="middle">
                                                        <div style={{
                                                            width: 44,
                                                            height: 44,
                                                            borderRadius: 12,
                                                            background: theme.bg,
                                                            color: theme.color,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: 22
                                                        }}>
                                                            {theme.icon}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: 10, fontWeight: 800, color: theme.color, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 2 }}>
                                                                  {theme.label}
                                                            </div>
                                                            <Text strong style={{ fontSize: 16, color: isDark ? '#F1F5F9' : '#0F172A' }}>
                                                                {item.title}
                                                            </Text>
                                                        </div>
                                                    </Space>
                                                    
                                                    {trend && (
                                                        <Tag 
                                                            color={trend.color === '#10B981' ? 'success' : trend.color === '#EF4444' ? 'error' : 'default'}
                                                            icon={trend.icon}
                                                            style={{ borderRadius: 8, fontWeight: 700, border: 'none', padding: '4px 12px' }}
                                                        >
                                                            {trend.text}
                                                        </Tag>
                                                    )}
                                                </div>

                                                <Paragraph 
                                                    ellipsis={{ rows: 3, expandable: true, symbol: 'Xem thêm' }}
                                                    style={{ 
                                                        color: isDark ? '#CBD5E1' : '#475569', 
                                                        fontSize: 14, 
                                                        marginBottom: 16,
                                                        lineHeight: '1.7'
                                                    }}
                                                >
                                                    {item.summary || item.content?.detailedAssessment || 'Học viên đã hoàn thành tốt bài luyện tập này.'}
                                                </Paragraph>

                                                <div style={{ 
                                                    display: 'flex', 
                                                    justifyContent: 'space-between', 
                                                    alignItems: 'center',
                                                    marginTop: 12,
                                                    paddingTop: 16,
                                                    borderTop: isDark ? '1px solid #334155' : '1px solid #F1F5F9'
                                                }}>
                                                    <Space size="large">
                                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                                            {dayjs(item.createdAt).format('HH:mm')} • {item.testAttempt?.test?.title || 'Luyện tập'}
                                                        </Text>
                                                        {item.score !== null && (
                                                            <Tag color="blue" bordered={false} style={{ borderRadius: 4, fontWeight: 600 }}>
                                                                Đạt mức: {item.score} PTS
                                                            </Tag>
                                                        )}
                                                    </Space>
                                                    <Badge 
                                                        status="processing" 
                                                        color={theme.color} 
                                                        text={<span style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#64748B', fontWeight: 500 }}>Phân tích bởi AI Coach</span>} 
                                                    />
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </Timeline.Item>
                        </React.Fragment>
                    ))}
                </Timeline>
            )}

            {hasMore && assessments.length > 0 && (
                <div style={{ textAlign: 'center', marginTop: 32, marginBottom: 40 }}>
                    <Button 
                        onClick={handleLoadMore} 
                        loading={loading}
                        style={{ borderRadius: 12, height: 44, padding: '0 40px', fontWeight: 600 }}
                    >
                        Tải thêm lộ trình
                    </Button>
                </div>
            )}
        </div>
    );
}
