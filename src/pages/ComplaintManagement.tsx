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
    Form,
    Input,
    Select
} from 'antd';
import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    ReloadOutlined,
    FileTextOutlined,
    UserOutlined,
    PlusOutlined,
    SendOutlined
} from '@ant-design/icons';
import { useOutletContext } from 'react-router-dom';
import { complaintApi, testApi, type Complaint } from '../services/api';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

export default function ComplaintManagement() {
    const { user } = useOutletContext<{ user: any }>();
    const isAdmin = user?.role === 'ADMIN';
    const isSpecialist = user?.role === 'SPECIALIST';
    const canResolve = isAdmin || isSpecialist;

    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [tests, setTests] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form] = Form.useForm();
    const { token } = theme.useToken();

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

    const fetchTests = async () => {
        if (canResolve) return; // Only teacher needs to load tests for creating complaint
        try {
            const data = await testApi.list(1, 100); // Load enough tests for dropdown
            if (data.success && data.data) {
                setTests(data.data);
            }
        } catch (error) {
            console.error('Error fetching tests:', error);
        }
    };

    useEffect(() => {
        fetchComplaints();
        fetchTests();
    }, []);

    const handleCreateComplaint = async (values: any) => {
        setSubmitting(true);
        try {
            const data = await complaintApi.send(values);
            if (data.success) {
                message.success('Gửi góp ý thành công!');
                setCreateModalVisible(false);
                form.resetFields();
                fetchComplaints();
            } else {
                message.error(data.message || 'Không thể gửi góp ý');
            }
        } catch (error) {
            console.error('Error creating complaint:', error);
            message.error('Có lỗi xảy ra');
        } finally {
            setSubmitting(false);
        }
    };

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
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16 }}>
                {!canResolve && (
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setCreateModalVisible(true)}
                        size="large"
                        style={{
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                            border: 'none',
                            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                            fontWeight: 600,
                        }}
                    >
                        Gửi góp ý bài thi
                    </Button>
                )}
                <Button
                    icon={<ReloadOutlined />}
                    onClick={fetchComplaints}
                    loading={loading}
                    size="large"
                    style={{ 
                        borderRadius: 10, 
                        boxShadow: 'var(--card-shadow)',
                        border: '1px solid var(--border-color)',
                        fontWeight: 600
                    }}
                >
                    Làm mới
                </Button>
            </div>

            <Card
                style={{
                    borderRadius: 20,
                    boxShadow: 'var(--card-shadow)',
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
                        showTotal: (total) => <span style={{ fontWeight: 600 }}>Tổng cộng {total} góp ý</span>,
                        style: { padding: '16px 24px' }
                    }}
                />
            </Card>

            <Modal
                title={
                    <Space>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: 18, boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)'
                        }}>
                            <SendOutlined />
                        </div>
                        <span style={{ fontSize: 18, fontWeight: 700 }}>Gửi Góp Ý Bài Thi</span>
                    </Space>
                }
                open={createModalVisible}
                onCancel={() => {
                    setCreateModalVisible(false);
                    form.resetFields();
                }}
                onOk={() => form.submit()}
                confirmLoading={submitting}
                okText="Gửi góp ý"
                cancelText="Hủy"
                centered
                okButtonProps={{
                    style: {
                        borderRadius: 8,
                        background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                        border: 'none',
                        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                        fontWeight: 600
                    }
                }}
            >
                <div style={{ marginTop: 24 }}>
                    <Form form={form} layout="vertical" onFinish={handleCreateComplaint}>
                        <Form.Item 
                            name="testId" 
                            label={<span style={{ fontWeight: 600 }}>Chọn bài thi cần góp ý</span>} 
                            rules={[{ required: true, message: 'Vui lòng chọn bài thi!' }]}
                        >
                            <Select 
                                size="large" 
                                showSearch 
                                placeholder="Tìm kiếm bài thi..."
                                optionFilterProp="children"
                                filterOption={(input, option: any) =>
                                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                                options={tests.map(t => ({ value: t.id, label: t.title }))}
                                style={{ borderRadius: 8 }}
                            />
                        </Form.Item>
                        <Form.Item 
                            name="content" 
                            label={<span style={{ fontWeight: 600 }}>Nội dung góp ý / báo lỗi</span>} 
                            rules={[{ required: true, message: 'Vui lòng nhập nội dung!' }]}
                        >
                            <Input.TextArea 
                                rows={5} 
                                placeholder="Mô tả chi tiết lỗi (Ví dụ: Câu 5 Part 2 bị sai đáp án...)" 
                                style={{ borderRadius: 8, padding: '12px' }}
                            />
                        </Form.Item>
                    </Form>
                </div>
            </Modal>
        </div>
    );
}
