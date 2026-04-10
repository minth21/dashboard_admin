import { useState, useEffect } from 'react';
import {
    Table,
    Tag,
    Space,
    Button,
    Card,
    Typography,
    message,
    Modal,
    Tooltip,
    theme,
    Avatar,
} from 'antd';
import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    ReloadOutlined,
    UserOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import { useOutletContext } from 'react-router-dom';
import { feedbackApi, type StudentFeedback } from '../services/api';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

export default function ClassFeedbackManagement() {
    const { user } = useOutletContext<{ user: any }>();
    const isTeacher = user?.role === 'TEACHER';
    const isAdmin = user?.role === 'ADMIN';

    const [feedbacks, setFeedbacks] = useState<StudentFeedback[]>([]);
    const [loading, setLoading] = useState(false);
    const { token } = theme.useToken();

    const fetchFeedbacks = async () => {
        setLoading(true);
        try {
            const data = await feedbackApi.list();
            if (data.success) {
                setFeedbacks(data.data);
            }
        } catch (error) {
            console.error('Error fetching feedbacks:', error);
            message.error('Không thể tải danh sách ý kiến');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeedbacks();
    }, []);

    const handleResolve = async (feedback: StudentFeedback) => {
        Modal.confirm({
            title: 'Xác nhận đã xử lý xong',
            content: `Xác nhận bạn đã xem và phản hồi ý kiến của học viên ${feedback.user?.name} tại lớp ${feedback.class?.className}?`,
            okText: 'Xác nhận xử lý',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    const data = await feedbackApi.resolve(feedback.id);
                    if (data.success) {
                        message.success('Đã xử lý ý kiến học viên!');
                        fetchFeedbacks();
                    }
                } catch (error) {
                    console.error('Error resolving feedback:', error);
                    message.error('Có lỗi xảy ra');
                }
            },
        });
    };

    const columns: ColumnsType<StudentFeedback> = [
        {
            title: 'Học viên',
            key: 'user',
            width: 200,
            render: (_, record) => (
                <Space>
                    <Avatar
                        src={record.user?.avatarUrl}
                        icon={<UserOutlined />}
                        style={{ backgroundColor: token.colorPrimary }}
                    />
                    <Space direction="vertical" size={0}>
                        <Text strong>{record.user?.name}</Text>
                        <Text type="secondary" style={{ fontSize: '11px' }}>ID: {record.userId.substring(0, 8)}...</Text>
                    </Space>
                </Space>
            ),
        },
        {
            title: 'Lớp học',
            key: 'class',
            width: 180,
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <Text strong>
                        <TeamOutlined style={{ marginRight: 8, color: '#3B82F6' }} />
                        {record.class?.className}
                    </Text>
                    {record.class?.classCode && (
                        <Tag color="blue" style={{ fontSize: '10px', margin: 0 }}>{record.class.classCode}</Tag>
                    )}
                </Space>
            ),
        },
        {
            title: 'Nội dung ý kiến',
            dataIndex: 'content',
            key: 'content',
            ellipsis: true,
            render: (content: string) => (
                <Tooltip title={content}>
                    <div style={{ maxWidth: 400, whiteSpace: 'pre-wrap' }}>{content}</div>
                </Tooltip>
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 150,
            align: 'center',
            render: (status: string) => {
                const isPending = status === 'PENDING';
                return (
                    <Tag
                        icon={isPending ? <ClockCircleOutlined /> : <CheckCircleOutlined />}
                        color={isPending ? 'gold' : 'success'}
                        style={{ borderRadius: '20px', padding: '2px 12px', fontWeight: 600 }}
                    >
                        {isPending ? 'Đang chờ' : 'Đã phản hồi'}
                    </Tag>
                );
            },
        },
        {
            title: 'Ngày gửi',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 150,
            render: (date: string) => new Date(date).toLocaleString('vi-VN'),
        },
    ];

    if (isTeacher || isAdmin) {
        columns.push({
            title: 'Hành động',
            key: 'actions',
            width: 150,
            align: 'center',
            render: (_, record) => (
                record.status === 'PENDING' ? (
                    <Button
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        onClick={() => handleResolve(record)}
                        style={{ borderRadius: '8px', background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)', border: 'none' }}
                    >
                        Đã xử lý
                    </Button>
                ) : (
                    <Text type="secondary" style={{ fontSize: '12px' }}>Đã hoàn tất lúc {new Date(record.createdAt).toLocaleDateString('vi-VN')}</Text>
                )
            ),
        });
    }

    return (
        <div style={{ padding: '24px', background: token.colorBgLayout, minHeight: '100vh' }}>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <Button
                    icon={<ReloadOutlined />}
                    onClick={fetchFeedbacks}
                    loading={loading}
                    size="large"
                    style={{
                        borderRadius: 10,
                        fontWeight: 600,
                        border: '1px solid var(--border-color)',
                        boxShadow: 'var(--card-shadow)'
                    }}
                >
                    Làm mới
                </Button>
            </div>

            <Card
                style={{
                    borderRadius: 24,
                    boxShadow: 'var(--card-shadow)',
                    border: 'none',
                    overflow: 'hidden'
                }}
                bodyStyle={{ padding: 0 }}
            >
                <Table
                    columns={columns}
                    dataSource={feedbacks}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showTotal: (total) => `Tổng cộng ${total} ý kiến`,
                        style: { padding: '16px 24px' }
                    }}
                />
            </Card>
        </div>
    );
}
