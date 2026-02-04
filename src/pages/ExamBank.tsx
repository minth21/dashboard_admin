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
    Statistic,
    Row,
    Col,
    InputNumber,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import {
    SearchOutlined,
    EditOutlined,
    DeleteOutlined,
    PlusOutlined,
    FileTextOutlined,
    ReloadOutlined,
    BookOutlined,
    CheckCircleOutlined,
    LockOutlined,
    UnlockOutlined,
    EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Search } = Input;
const { Option } = Select;
import api from '../services/api';

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

    // Fetch exams from API
    const fetchExams = async () => {
        setLoading(true);
        try {
            const difficultyParam = difficultyFilter !== 'ALL' ? `&difficulty=${difficultyFilter}` : '';
            const statusParam = statusFilter !== 'ALL' ? `&status=${statusFilter}` : '';
            const searchParam = searchText ? `&search=${searchText}` : '';

            const response = await api.get(`/tests?page=${page}&limit=${pageSize}${difficultyParam}${statusParam}${searchParam}`);
            const data = response.data;

            if (data.success) {
                setExams(data.tests);
                setTotal(data.pagination.total);

                // Calculate stats
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

    // Handle search
    const handleSearch = (value: string) => {
        setSearchText(value);
        setPage(1);
    };

    // Open edit modal
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

    // Submit edit form
    const handleEditSubmit = async (values: any) => {
        if (!editingExam) return;

        try {
            const response = await api.patch(`/tests/${editingExam.id}`, values);
            const data = response.data;

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

    // Open create modal
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

    // Submit create form
    const handleCreateSubmit = async (values: any) => {
        try {
            const response = await api.post('/tests', values);
            const data = response.data;

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

    // Delete exam
    const handleDelete = async (examId: string, examTitle: string) => {
        Modal.confirm({
            title: 'Xác nhận xóa',
            content: `Bạn có chắc chắn muốn xóa đề thi "${examTitle}"?`,
            okText: 'Xóa',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    const response = await api.delete(`/tests/${examId}`);
                    const data = response.data;

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

    // Table columns
    const columns: ColumnsType<Exam> = [
        {
            title: 'Tên đề thi',
            dataIndex: 'title',
            key: 'title',
            width: 250,
            render: (title: string) => (
                <div style={{ fontWeight: 600, color: '#2563EB' }}>
                    <FileTextOutlined style={{ marginRight: 8 }} />
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
                let color = '#8B5CF6'; // Purple

                if (hasListening && !hasReading) {
                    type = 'Listening';
                    color = '#3B82F6'; // Blue
                } else if (!hasListening && hasReading) {
                    type = 'Reading';
                    color = '#10B981'; // Green
                }

                return <Tag color={color}>{type}</Tag>;
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
                    EASY: { color: '#16A34A', label: 'A1-A2' },
                    MEDIUM: { color: '#F59E0B', label: 'B1-B2' },
                    HARD: { color: '#DC2626', label: 'C1' },
                };
                const config = difficultyConfig[difficulty] || { color: 'default', label: difficulty };
                return <Tag color={config.color}>{config.label}</Tag>;
            },
        },
        {
            title: 'Thời gian',
            dataIndex: 'duration',
            key: 'duration',
            width: 100,
            align: 'center' as const,
            render: (duration: number) => `${duration} phút`,
        },
        {
            title: 'Tổng câu hỏi',
            dataIndex: 'totalQuestions',
            key: 'totalQuestions',
            width: 120,
            align: 'center' as const,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            align: 'center' as const,
            render: (status: string) => {
                const statusConfig: { [key: string]: { color: string; label: string; icon: any } } = {
                    LOCKED: { color: '#DC2626', label: 'Khóa', icon: <LockOutlined /> },
                    UNLOCKED: { color: '#16A34A', label: 'Mở', icon: <UnlockOutlined /> },
                };
                const config = statusConfig[status] || { color: 'default', label: status, icon: null };
                return (
                    <Tag color={config.color} icon={config.icon}>
                        {config.label}
                    </Tag>
                );
            },
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 120,
            align: 'center' as const,
            render: (date: string) => new Date(date).toLocaleDateString('vi-VN'),
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
                        type="default"
                        style={{ color: '#1890ff', borderColor: '#1890ff' }}
                        icon={<EyeOutlined />}
                        size="small"
                        onClick={() => navigate(`/exam-bank/${record.id}`)}
                    />
                    <Button
                        type="primary"
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => handleEdit(record)}
                    />
                    <Button
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                        onClick={() => handleDelete(record.id, record.title)}
                    />
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            {/* Statistics Cards */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={8}>
                    <Card>
                        <Statistic
                            title="Tổng đề thi"
                            value={stats.total}
                            prefix={<BookOutlined style={{ color: '#2563EB' }} />}
                            valueStyle={{ color: '#2563EB' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Card>
                        <Statistic
                            title="Đã mở"
                            value={stats.unlocked}
                            prefix={<CheckCircleOutlined style={{ color: '#16A34A' }} />}
                            valueStyle={{ color: '#16A34A' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Card>
                        <Statistic
                            title="Đang khóa"
                            value={stats.locked}
                            prefix={<LockOutlined style={{ color: '#DC2626' }} />}
                            valueStyle={{ color: '#DC2626' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 24 }}>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleOpenCreateModal}
                    size="large"
                >
                    Thêm đề thi mới
                </Button>
            </div>

            {/* Filters */}
            <Space style={{ marginBottom: 16 }} size="middle" wrap>
                <Search
                    placeholder="Tìm theo tên đề thi"
                    allowClear
                    onSearch={handleSearch}
                    style={{ width: 300 }}
                    prefix={<SearchOutlined />}
                />
                <Select
                    value={difficultyFilter}
                    onChange={(value) => {
                        setDifficultyFilter(value);
                        setPage(1);
                    }}
                    style={{ width: 150 }}
                >
                    <Option value="ALL">Tất cả độ khó</Option>
                    <Option value="EASY">A1-A2</Option>
                    <Option value="MEDIUM">B1-B2</Option>
                    <Option value="HARD">C1</Option>
                </Select>
                <Select
                    value={statusFilter}
                    onChange={(value) => {
                        setStatusFilter(value);
                        setPage(1);
                    }}
                    style={{ width: 150 }}
                >
                    <Option value="ALL">Tất cả trạng thái</Option>
                    <Option value="UNLOCKED">Đã mở</Option>
                    <Option value="LOCKED">Đang khóa</Option>
                </Select>
                <Button
                    icon={<ReloadOutlined />}
                    onClick={fetchExams}
                    loading={loading}
                    title="Làm mới danh sách"
                >
                    Làm mới
                </Button>
            </Space>

            {/* Table */}
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
                    showTotal: (total) => `Tổng ${total} đề thi`,
                    onChange: (page, pageSize) => {
                        setPage(page);
                        setPageSize(pageSize);
                    },
                }}
                scroll={{ x: 1200 }}
            />

            {/* Edit Modal */}
            <Modal
                title="Chỉnh sửa đề thi"
                open={editModalVisible}
                onCancel={() => setEditModalVisible(false)}
                onOk={() => form.submit()}
                okText="Lưu"
                cancelText="Hủy"
                width={700}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleEditSubmit}
                >
                    <Form.Item
                        label="Tên đề thi"
                        name="title"
                        rules={[{ required: true, message: 'Vui lòng nhập tên đề thi' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Loại bài"
                        name="testType"
                        rules={[{ required: true, message: 'Vui lòng chọn loại bài' }]}
                    >
                        <Select>
                            <Option value="LISTENING">Listening</Option>
                            <Option value="READING">Reading</Option>
                        </Select>
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label="Độ khó"
                                name="difficulty"
                                rules={[{ required: true, message: 'Vui lòng chọn độ khó' }]}
                            >
                                <Select>
                                    <Option value="EASY">A1-A2</Option>
                                    <Option value="MEDIUM">B1-B2</Option>
                                    <Option value="HARD">C1</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label="Trạng thái"
                                name="status"
                                rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
                            >
                                <Select>
                                    <Option value="LOCKED">Khóa</Option>
                                    <Option value="UNLOCKED">Mở</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item
                                label="Thời gian (phút)"
                                name="duration"
                                rules={[{ required: true, message: 'Vui lòng nhập thời gian' }]}
                            >
                                <InputNumber min={1} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                label="Tổng câu hỏi"
                                name="totalQuestions"
                                rules={[{ required: true, message: 'Vui lòng nhập tổng câu hỏi' }]}
                            >
                                <InputNumber min={1} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>


                </Form>
            </Modal>

            {/* Create Modal */}
            <Modal
                title="Tạo đề thi mới"
                open={createModalVisible}
                onCancel={() => setCreateModalVisible(false)}
                onOk={() => createForm.submit()}
                okText="Tạo"
                cancelText="Hủy"
                width={700}
            >
                <Form
                    form={createForm}
                    layout="vertical"
                    onFinish={handleCreateSubmit}
                >
                    <Form.Item
                        label="Tên đề thi"
                        name="title"
                        rules={[{ required: true, message: 'Vui lòng nhập tên đề thi' }]}
                    >
                        <Input placeholder="Ví dụ: TOEIC Practice Test 1" />
                    </Form.Item>

                    <Form.Item
                        label="Loại bài"
                        name="testType"
                        rules={[{ required: true, message: 'Vui lòng chọn loại bài' }]}
                    >
                        <Select>
                            <Option value="LISTENING">Listening</Option>
                            <Option value="READING">Reading</Option>
                        </Select>
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label="Độ khó"
                                name="difficulty"
                                rules={[{ required: true, message: 'Vui lòng chọn độ khó' }]}
                            >
                                <Select>
                                    <Option value="EASY">A1-A2</Option>
                                    <Option value="MEDIUM">B1-B2</Option>
                                    <Option value="HARD">C1</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label="Trạng thái"
                                name="status"
                                rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
                            >
                                <Select>
                                    <Option value="LOCKED">Khóa</Option>
                                    <Option value="UNLOCKED">Mở</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item
                                label="Thời gian (phút)"
                                name="duration"
                                rules={[{ required: true, message: 'Vui lòng nhập thời gian' }]}
                            >
                                <InputNumber min={1} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                label="Tổng câu hỏi"
                                name="totalQuestions"
                                rules={[{ required: true, message: 'Vui lòng nhập tổng câu hỏi' }]}
                            >
                                <InputNumber min={1} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>


                </Form>
            </Modal>
        </div>
    );
}