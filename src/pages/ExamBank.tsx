import { useState, useEffect } from 'react';
import {
    Table,
    Input,
    Select,
    Button,
    Space,
    Tag,
    Modal,
    Form,
    message,
    Card,
    Row,
    Col,
    InputNumber,
} from 'antd';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
    SearchOutlined,
    EditOutlined,
    DeleteOutlined,
    PlusOutlined,
    FileTextOutlined,
    ReloadOutlined,
    BookOutlined,
    LockOutlined,
    UnlockOutlined,
    EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Search } = Input;
const { Option } = Select;
import { testApi } from '../services/api';

interface Exam {
    id: string;
    title: string;
    testType: 'LISTENING' | 'READING';
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    duration: number; // in minutes
    totalQuestions: number;
    listeningQuestions: number;
    readingQuestions: number;
    status: 'LOCKED' | 'UNLOCKED';
    createdAt: string;
    updatedAt: string;
}

export default function ExamBank() {
    const { user } = useOutletContext<{ user: any }>();
    const isReviewer = user?.role === 'REVIEWER';
    const navigate = useNavigate();
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState<string>('ALL');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [editingExam, setEditingExam] = useState<Exam | null>(null);
    const [form] = Form.useForm();
    const [createForm] = Form.useForm();

    // Statistics
    const [stats, setStats] = useState({
        total: 0,
        locked: 0,
        unlocked: 0,
    });

    // Cấu hình bóng đổ hiện đại (Ánh xanh dương cực nhẹ)
    const modernShadow = '0 10px 30px -5px rgba(37, 99, 235, 0.08), 0 4px 10px -6px rgba(37, 99, 235, 0.04)';

    const fetchExams = async () => {
        setLoading(true);
        try {
            const data = await testApi.list(page, pageSize, difficultyFilter, statusFilter, searchText);

            if (data.success) {
                setExams(data.tests);
                setTotal(data.pagination.total);

                setStats({
                    total: data.pagination.total,
                    locked: data.tests.filter((e: Exam) => e.status === 'LOCKED').length,
                    unlocked: data.tests.filter((e: Exam) => e.status === 'UNLOCKED').length,
                });
            } else {
                message.error('Không thể tải danh sách đề thi');
            }
        } catch (error) {
            console.error('Error fetching exams:', error);
            message.error('Có lỗi xảy ra khi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExams();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, pageSize, difficultyFilter, statusFilter, searchText]);

    const handleSearch = (value: string) => {
        setSearchText(value);
        setPage(1);
    };

    const handleEdit = (exam: Exam) => {
        setEditingExam(exam);
        form.setFieldsValue({
            title: exam.title,
            testType: exam.testType,
            difficulty: exam.difficulty,
            duration: exam.duration,
            totalQuestions: exam.totalQuestions,
            status: exam.status,
        });
        setEditModalVisible(true);
    };

    const handleEditSubmit = async (values: any) => {
        if (!editingExam) return;
        try {
            const data = await testApi.update(editingExam.id, values);
            if (data.success) {
                message.success('Cập nhật đề thi thành công!');
                setEditModalVisible(false);
                fetchExams();
            } else {
                message.error(data.message || 'Không thể cập nhật đề thi');
            }
        } catch (error) {
            console.error('Error updating exam:', error);
            message.error('Có lỗi xảy ra khi cập nhật');
        }
    };

    const handleOpenCreateModal = () => {
        createForm.resetFields();
        createForm.setFieldsValue({
            testType: 'LISTENING',
            difficulty: 'MEDIUM',
            status: 'LOCKED',
            duration: 120,
            totalQuestions: 100,
        });
        setCreateModalVisible(true);
    };

    const handleCreateSubmit = async (values: any) => {
        try {
            const payload = { ...values, status: 'LOCKED' };
            const data = await testApi.create(payload);
            if (data.success) {
                message.success('Tạo đề thi thành công!');
                setCreateModalVisible(false);
                fetchExams();
            } else {
                message.error(data.message || 'Không thể tạo đề thi');
            }
        } catch (error) {
            console.error('Error creating exam:', error);
            message.error('Có lỗi xảy ra khi tạo đề thi');
        }
    };

    const handleDelete = async (examId: string, examTitle: string) => {
        Modal.confirm({
            title: 'Xác nhận xóa',
            content: `Bạn có chắc chắn muốn xóa đề thi "${examTitle}"?`,
            okText: 'Xóa',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    const data = await testApi.delete(examId);
                    if (data.success) {
                        message.success('Đã xóa đề thi thành công!');
                        fetchExams();
                    } else {
                        message.error(data.message || 'Không thể xóa đề thi');
                    }
                } catch (error) {
                    console.error('Error deleting exam:', error);
                    message.error('Có lỗi xảy ra khi xóa đề thi');
                }
            },
        });
    };

    const columns: ColumnsType<Exam> = [
        {
            title: 'Tên đề thi',
            dataIndex: 'title',
            key: 'title',
            width: 250,
            render: (title: string) => (
                <div style={{ fontWeight: 700, color: '#1E3A8A', fontSize: '15px' }}>
                    <FileTextOutlined style={{ marginRight: 10, color: '#3B82F6' }} />
                    {title}
                </div>
            ),
        },
        {
            title: 'Loại bài',
            key: 'testType',
            width: 120,
            align: 'center' as const,
            render: (_, record: Exam) => {
                const hasListening = record.listeningQuestions > 0;
                const hasReading = record.readingQuestions > 0;
                let type = 'Full Test';
                let color = 'cyan';
                if (hasListening && !hasReading) { type = 'Listening'; color = 'blue'; }
                else if (!hasListening && hasReading) { type = 'Reading'; color = 'green'; }
                return <Tag color={color} style={{ borderRadius: '6px', fontWeight: 600, padding: '2px 10px' }}>{type}</Tag>;
            },
        },
        {
            title: 'Độ khó',
            dataIndex: 'difficulty',
            key: 'difficulty',
            width: 100,
            align: 'center' as const,
            render: (difficulty: string) => {
                const difficultyConfig: { [key: string]: { color: string; label: string } } = {
                    EASY: { color: 'success', label: 'A1-A2' },
                    MEDIUM: { color: 'warning', label: 'B1-B2' },
                    HARD: { color: 'error', label: 'C1' },
                };
                const config = difficultyConfig[difficulty] || { color: 'default', label: difficulty };
                return <Tag color={config.color} style={{ borderRadius: '6px', fontWeight: 600 }}>{config.label}</Tag>;
            },
        },
        {
            title: 'Thời gian',
            dataIndex: 'duration',
            key: 'duration',
            width: 100,
            align: 'center' as const,
            render: (duration: number) => <span style={{ fontWeight: 600, color: '#475569' }}>{duration} phút</span>,
        },
        {
            title: 'Tổng câu hỏi',
            dataIndex: 'totalQuestions',
            key: 'totalQuestions',
            width: 120,
            align: 'center' as const,
            render: (total: number) => <span style={{ fontWeight: 600, color: '#475569' }}>{total}</span>,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            align: 'center' as const,
            render: (status: string) => {
                const statusConfig: { [key: string]: { color: string; label: string; icon: any; bg: string } } = {
                    LOCKED: { color: '#DC2626', label: 'Khóa', icon: <LockOutlined />, bg: '#FEF2F2' },
                    UNLOCKED: { color: '#059669', label: 'Mở', icon: <UnlockOutlined />, bg: '#ECFDF5' },
                };
                const config = statusConfig[status] || { color: '#64748B', label: status, icon: null, bg: '#F1F5F9' };
                return (
                    <div style={{
                        background: config.bg, color: config.color, padding: '4px 12px',
                        borderRadius: '20px', display: 'inline-flex', alignItems: 'center',
                        fontWeight: 600, gap: '6px', fontSize: '13px'
                    }}>
                        {config.icon} {config.label}
                    </div>
                );
            },
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 120,
            align: 'center' as const,
            render: (date: string) => <span style={{ color: '#64748B' }}>{new Date(date).toLocaleDateString('vi-VN')}</span>,
        },
        {
            title: 'Hành động',
            key: 'actions',
            width: 120,
            align: 'center' as const,
            fixed: 'right' as const,
            render: (_, record) => (
                <Space>
                    <Button
                        type="text"
                        style={{ color: '#2563EB', background: '#DBEAFE', borderRadius: '8px' }}
                        icon={<EyeOutlined />}
                        onClick={() => navigate(`/exam-bank/${record.id}`)}
                    />
                    <Button
                        type="text"
                        style={{ color: '#059669', background: '#D1FAE5', borderRadius: '8px' }}
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    />
                    {!isReviewer && (
                        <Button
                            type="text"
                            danger
                            style={{ background: '#FEE2E2', borderRadius: '8px' }}
                            icon={<DeleteOutlined />}
                            onClick={() => handleDelete(record.id, record.title)}
                        />
                    )}
                </Space>
            ),
        },
    ];

    return (
        // Đổi màu nền wrapper thành xám nhạt để làm nổi bật các Card màu trắng
        <div style={{ padding: '24px', background: '#F8FAFC', minHeight: '100vh' }}>
            
            {/* Thẻ Tiêu đề Trang (Tùy chọn, thêm vào để tăng độ "sang") */}
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#1E293B' }}>Ngân hàng đề thi</h1>
                <p style={{ margin: 0, color: '#64748B', fontSize: 15 }}>Quản lý và cập nhật kho tài liệu TOEIC của hệ thống.</p>
            </div>

            {/* Statistics Cards */}
            <Row gutter={24} style={{ marginBottom: 32 }}>
                {[
                    { title: 'Tổng đề thi', value: stats.total, icon: <BookOutlined />, color: '#1D4ED8', bg: 'linear-gradient(135deg, #DBEAFE 0%, #EFF6FF 100%)' },
                    { title: 'Đã mở', value: stats.unlocked, icon: <UnlockOutlined />, color: '#047857', bg: 'linear-gradient(135deg, #D1FAE5 0%, #ECFDF5 100%)' },
                    { title: 'Đang khóa', value: stats.locked, icon: <LockOutlined />, color: '#B91C1C', bg: 'linear-gradient(135deg, #FEE2E2 0%, #FEF2F2 100%)' },
                ].map((item, index) => (
                    <Col xs={24} sm={12} md={8} key={index}>
                        <Card
                            hoverable
                            style={{
                                borderRadius: 24,
                                border: 'none',
                                background: '#FFFFFF',
                                boxShadow: modernShadow,
                                transition: 'all 0.3s ease'
                            }}
                            bodyStyle={{ padding: '24px' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                                <div style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: 18,
                                    background: item.bg,
                                    color: item.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 28,
                                    boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5)'
                                }}>
                                    {item.icon}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.5px', marginBottom: 4 }}>
                                        {item.title}
                                    </div>
                                    <div style={{ color: '#0F172A', fontWeight: 800, fontSize: 32, lineHeight: 1 }}>
                                        {item.value}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Actions & Filters */}
            <Card
                style={{
                    marginBottom: 24,
                    borderRadius: 20,
                    border: 'none',
                    background: '#FFFFFF',
                    boxShadow: modernShadow
                }}
                bodyStyle={{ padding: '20px 24px' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <Space size="middle" wrap>
                        <Search
                            placeholder="Tìm kiếm đề thi..."
                            allowClear
                            onSearch={handleSearch}
                            style={{ width: 320 }}
                            size="large"
                            prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
                        />
                        <Select
                            size="large"
                            value={difficultyFilter}
                            onChange={(value) => {
                                setDifficultyFilter(value);
                                setPage(1);
                            }}
                            style={{ width: 160 }}
                        >
                            <Option value="ALL">Tất cả độ khó</Option>
                            <Option value="EASY">Dễ (A1-A2)</Option>
                            <Option value="MEDIUM">Trung bình (B1-B2)</Option>
                            <Option value="HARD">Khó (C1)</Option>
                        </Select>
                        <Select
                            size="large"
                            value={statusFilter}
                            onChange={(value) => {
                                setStatusFilter(value);
                                setPage(1);
                            }}
                            style={{ width: 160 }}
                        >
                            <Option value="ALL">Tất cả trạng thái</Option>
                            <Option value="UNLOCKED">Đang mở bài</Option>
                            <Option value="LOCKED">Đang khóa bài</Option>
                        </Select>
                        <Button
                            size="large"
                            icon={<ReloadOutlined />}
                            onClick={fetchExams}
                            loading={loading}
                            style={{ borderRadius: '10px', color: '#475569', fontWeight: 600 }}
                        >
                            Làm mới
                        </Button>
                    </Space>

                    {!isReviewer && (
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleOpenCreateModal}
                            size="large"
                            style={{
                                borderRadius: 12,
                                fontWeight: 700,
                                height: 48,
                                padding: '0 24px',
                                background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                                border: 'none',
                                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                            }}
                        >
                            Thêm đề thi mới
                        </Button>
                    )}
                </div>
            </Card>

            {/* Table */}
            <Card
                style={{
                    borderRadius: 20,
                    border: 'none',
                    boxShadow: modernShadow,
                    overflow: 'hidden'
                }}
                bodyStyle={{ padding: 0 }}
            >
                <Table
                    columns={columns}
                    dataSource={exams}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        current: page,
                        pageSize: pageSize,
                        total: total,
                        showSizeChanger: true,
                        showTotal: (total) => <span style={{ fontWeight: 600 }}>Tổng {total} đề thi</span>,
                        onChange: (page, pageSize) => {
                            setPage(page);
                            setPageSize(pageSize);
                        },
                        style: { padding: '16px 24px', margin: 0 }
                    }}
                    scroll={{ x: 1200 }}
                />
            </Card>

            {/* Edit Modal */}
            <Modal
                title={<div style={{ fontSize: 20, color: '#1E293B', fontWeight: 700 }}>Chỉnh sửa đề thi</div>}
                open={editModalVisible}
                onCancel={() => setEditModalVisible(false)}
                onOk={() => form.submit()}
                okText="Lưu thay đổi"
                cancelText="Hủy"
                width={700}
                centered
                okButtonProps={{ style: { borderRadius: 8, background: '#2563EB' } }}
                cancelButtonProps={{ style: { borderRadius: 8 } }}
            >
                <Form form={form} layout="vertical" onFinish={handleEditSubmit} style={{ marginTop: 24 }}>
                    <Form.Item label={<span style={{ fontWeight: 600 }}>Tên đề thi</span>} name="title" rules={[{ required: true, message: 'Vui lòng nhập tên đề thi' }]}>
                        <Input size="large" style={{ borderRadius: 8 }} />
                    </Form.Item>

                    <Form.Item label={<span style={{ fontWeight: 600 }}>Loại bài</span>} name="testType" rules={[{ required: true, message: 'Vui lòng chọn loại bài' }]}>
                        <Select size="large">
                            <Option value="LISTENING">Listening</Option>
                            <Option value="READING">Reading</Option>
                        </Select>
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label={<span style={{ fontWeight: 600 }}>Độ khó</span>} name="difficulty" rules={[{ required: true, message: 'Vui lòng chọn độ khó' }]}>
                                <Select size="large">
                                    <Option value="EASY">A1-A2</Option>
                                    <Option value="MEDIUM">B1-B2</Option>
                                    <Option value="HARD">C1</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            {!isReviewer && (
                                <Form.Item label={<span style={{ fontWeight: 600 }}>Trạng thái</span>} name="status" rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}>
                                    <Select size="large">
                                        <Option value="LOCKED">Khóa</Option>
                                        <Option value="UNLOCKED">Mở</Option>
                                    </Select>
                                </Form.Item>
                            )}
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label={<span style={{ fontWeight: 600 }}>Thời gian (phút)</span>} name="duration" rules={[{ required: true, message: 'Vui lòng nhập thời gian' }]}>
                                <InputNumber size="large" min={1} style={{ width: '100%', borderRadius: 8 }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label={<span style={{ fontWeight: 600 }}>Tổng câu hỏi</span>} name="totalQuestions" rules={[{ required: true, message: 'Vui lòng nhập tổng câu hỏi' }]}>
                                <InputNumber size="large" min={1} style={{ width: '100%', borderRadius: 8 }} />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>

            {/* Create Modal */}
            <Modal
                title={<div style={{ fontSize: 20, color: '#1E293B', fontWeight: 700 }}>Tạo đề thi mới</div>}
                open={createModalVisible}
                onCancel={() => setCreateModalVisible(false)}
                onOk={() => createForm.submit()}
                okText="Tạo đề thi"
                cancelText="Hủy"
                width={700}
                centered
                okButtonProps={{ style: { borderRadius: 8, background: '#2563EB' } }}
                cancelButtonProps={{ style: { borderRadius: 8 } }}
            >
                <Form form={createForm} layout="vertical" onFinish={handleCreateSubmit} style={{ marginTop: 24 }}>
                    <Form.Item label={<span style={{ fontWeight: 600 }}>Tên đề thi</span>} name="title" rules={[{ required: true, message: 'Vui lòng nhập tên đề thi' }]}>
                        <Input size="large" placeholder="Ví dụ: TOEIC-TEST 1" style={{ borderRadius: 8 }} />
                    </Form.Item>

                    <Form.Item label={<span style={{ fontWeight: 600 }}>Loại bài</span>} name="testType" rules={[{ required: true, message: 'Vui lòng chọn loại bài' }]}>
                        <Select size="large">
                            <Option value="LISTENING">Listening</Option>
                            <Option value="READING">Reading</Option>
                        </Select>
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label={<span style={{ fontWeight: 600 }}>Độ khó</span>} name="difficulty" rules={[{ required: true, message: 'Vui lòng chọn độ khó' }]}>
                                <Select size="large">
                                    <Option value="EASY">A1-A2</Option>
                                    <Option value="MEDIUM">B1-B2</Option>
                                    <Option value="HARD">C1</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label={<span style={{ fontWeight: 600 }}>Thời gian (phút)</span>} name="duration" rules={[{ required: true, message: 'Vui lòng nhập thời gian' }]}>
                                <InputNumber size="large" min={1} style={{ width: '100%', borderRadius: 8 }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label={<span style={{ fontWeight: 600 }}>Tổng câu hỏi</span>} name="totalQuestions" rules={[{ required: true, message: 'Vui lòng nhập tổng câu hỏi' }]}>
                                <InputNumber size="large" min={1} style={{ width: '100%', borderRadius: 8 }} />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>
        </div>
    );
}