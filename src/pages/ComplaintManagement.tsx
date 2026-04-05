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
} from 'antd';
import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    ReloadOutlined,
    FileTextOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { useOutletContext } from 'react-router-dom';
import { complaintApi, type Complaint } from '../services/api';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

export default function ComplaintManagement() {
    const { user } = useOutletContext<{ user: any }>();
    const isAdmin = user?.role === 'ADMIN';
    const isSpecialist = user?.role === 'SPECIALIST';
    const canResolve = isAdmin || isSpecialist;

    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(false);
    const { token } = theme.useToken();

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const modernShadow = isDark
        ? `0 10px 30px -5px rgba(0, 0, 0, 0.5)`
        : '0 10px 30px -5px rgba(37, 99, 235, 0.08)';

    const fetchComplaints = async () => {
        setLoading(true);
        try {
            const data = await complaintApi.list();
            if (data.success) {
                setComplaints(data.data);
            }
        } catch (error) {
            console.error('Error fetching complaints:', error);
            message.error('Không thể tải danh sách góp ý');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComplaints();
    }, []);

    const handleResolve = async (complaint: Complaint) => {
        Modal.confirm({
            title: 'Xác nhận xử lý xong',
            content: `Bạn xác nhận đã sửa lỗi bài thi "${complaint.test?.title}" theo góp ý này? Thông báo sẽ được gửi lại cho Giáo viên.`,
            okText: 'Xác nhận xong',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    const data = await complaintApi.resolve(complaint.id);
                    if (data.success) {
                        message.success('Đã xử lý góp ý thành công!');
                        fetchComplaints();
                    }
                } catch (error) {
                    console.error('Error resolving complaint:', error);
                    message.error('Có lỗi xảy ra');
                }
            },
        });
    };

    const columns: ColumnsType<Complaint> = [
        {
            title: 'Bài thi',
            key: 'test',
            width: 250,
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <Text strong style={{ fontSize: '15px' }}>
                        <FileTextOutlined style={{ marginRight: 8, color: token.colorPrimary }} />
                        {record.test?.title}
                    </Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>ID: {record.testId}</Text>
                </Space>
            ),
        },
        {
            title: 'Người gửi',
            key: 'user',
            width: 180,
            render: (_, record) => (
                <Space>
                    <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: token.colorBgLayout, display: 'flex',
                        alignItems: 'center', justifyContent: 'center'
                    }}>
                        <UserOutlined style={{ color: token.colorPrimary }} />
                    </div>
                    <Space direction="vertical" size={0}>
                        <Text strong>{record.user?.name}</Text>
                        <Tag color="blue" style={{ fontSize: '10px', margin: 0 }}>{record.user?.role}</Tag>
                    </Space>
                </Space>
            ),
        },
        {
            title: 'Nội dung góp ý',
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
                        {isPending ? 'Đang chờ' : 'Đã xử lý'}
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

    if (canResolve) {
        columns.push({
            title: 'Hành động',
            key: 'actions',
            width: 120,
            align: 'center',
            render: (_, record) => (
                record.status === 'PENDING' ? (
                    <Button
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        onClick={() => handleResolve(record)}
                        style={{ borderRadius: '8px' }}
                    >
                        Xử lý xong
                    </Button>
                ) : (
                    <Text type="secondary">Hoàn tất</Text>
                )
            ),
        });
    }

    return (
        <div style={{ padding: '24px', background: token.colorBgLayout, minHeight: '100vh' }}>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <Button
                    icon={<ReloadOutlined />}
                    onClick={fetchComplaints}
                    loading={loading}
                    size="large"
                    style={{ borderRadius: 10 }}
                >
                    Làm mới
                </Button>
            </div>

            <Card
                style={{
                    borderRadius: 20,
                    boxShadow: modernShadow,
                    border: 'none',
                    overflow: 'hidden'
                }}
                bodyStyle={{ padding: 0 }}
            >
                <Table
                    columns={columns}
                    dataSource={complaints}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showTotal: (total) => `Tổng cộng ${total} góp ý`,
                        style: { padding: '16px 24px' }
                    }}
                />
            </Card>
        </div>
    );
}
