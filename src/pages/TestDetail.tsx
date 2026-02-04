import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Card,
    Button,
    Table,
    Modal,
    Form,
    Input,
    InputNumber,
    message,
    Tag,
    Space,
    Descriptions,
    Popconfirm,
    Select,
    Progress,
} from 'antd';
import {
    ArrowLeftOutlined,
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    FileTextOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import ReactQuill from 'react-quill-new';
import 'quill/dist/quill.snow.css';
import api from '../services/api';

const { Option } = Select;

interface Test {
    id: string;
    title: string;
    testType: 'LISTENING' | 'READING';
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    status: 'LOCKED' | 'UNLOCKED';
    duration: number;
    totalQuestions: number;
    createdAt: string;
    updatedAt: string;
}

interface Part {
    id: string;
    testId: string;
    partNumber: number;
    partName: string;
    totalQuestions: number;
    instructions?: string;
    status: string;
    orderIndex: number;
    completedQuestions: number;
    createdAt: string;
    updatedAt: string;
    timeLimit?: number; // in minutes
}

// Auto-fill configuration for parts
const PART_CONFIG: Record<number, { name: string; totalQuestions: number; timeLimit: number }> = {
    1: { name: 'Part 1: Photographs', totalQuestions: 6, timeLimit: 5 },
    2: { name: 'Part 2: Question-Response', totalQuestions: 25, timeLimit: 8 },
    3: { name: 'Part 3: Conversations', totalQuestions: 39, timeLimit: 17 },
    4: { name: 'Part 4: Talks', totalQuestions: 30, timeLimit: 15 },
    5: { name: 'Part 5: Incomplete Sentences', totalQuestions: 30, timeLimit: 10 },
    6: { name: 'Part 6: Text Completion', totalQuestions: 16, timeLimit: 8 },
    7: { name: 'Part 7: Reading Comprehension', totalQuestions: 54, timeLimit: 54 },
};

export default function TestDetail() {
    const { testId } = useParams<{ testId: string }>();
    const navigate = useNavigate();
    const [test, setTest] = useState<Test | null>(null);
    const [parts, setParts] = useState<Part[]>([]);
    const [loading, setLoading] = useState(false);
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingPart, setEditingPart] = useState<Part | null>(null);
    const [form] = Form.useForm();
    const [createForm] = Form.useForm();

    // Create/Edit Instructions State
    const [createInstructions, setCreateInstructions] = useState('');
    const [editInstructions, setEditInstructions] = useState('');

    // Bulk Actions State
    const [selectedPartIds, setSelectedPartIds] = useState<string[]>([]);

    useEffect(() => {
        if (testId) {
            fetchTest();
            fetchParts();
        }
    }, [testId]);

    const fetchTest = async () => {
        try {
            const response = await api.get(`/tests/${testId}`);
            if (response.data.success) {
                setTest(response.data.data);
            }
        } catch (error) {
            message.error('Không thể tải thông tin đề thi');
        }
    };

    const fetchParts = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/tests/${testId}/parts`);
            if (response.data.success) {
                setParts(response.data.parts || []);
            }
        } catch (error) {
            message.error('Không thể tải danh sách Parts');
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePart = async (values: any) => {
        // Validate instructions
        if (!createInstructions || createInstructions.trim() === '') {
            message.error('Vui lòng nhập hướng dẫn cho Part này');
            return;
        }

        try {
            const response = await api.post(`/tests/${testId}/parts`, {
                ...values,
                instructions: createInstructions,
                status: 'INACTIVE', // Default to inactive when creating
            });

            if (response.data.success) {
                message.success('Tạo Part thành công!');
                setCreateModalVisible(false);
                createForm.resetFields();
                setCreateInstructions('');
                fetchParts();
            } else {
                message.error(response.data.message || 'Không thể tạo Part');
            }
        } catch (error) {
            message.error('Có lỗi xảy ra khi tạo Part');
        }
    };

    const handleEdit = (part: Part) => {
        setEditingPart(part);
        setEditInstructions(part.instructions || '');
        form.setFieldsValue({
            partNumber: part.partNumber,
            partName: part.partName,
            totalQuestions: part.totalQuestions,
            timeLimit: part.timeLimit || 10,
            orderIndex: part.orderIndex,
            status: part.status,
        });
        setEditModalVisible(true);
    };

    const handleUpdatePart = async (values: any) => {
        if (!editingPart) return;

        // Validate instructions
        if (!editInstructions || editInstructions.trim() === '') {
            message.error('Vui lòng nhập hướng dẫn cho Part này');
            return;
        }

        try {
            const response = await api.patch(`/parts/${editingPart.id}`, {
                ...values,
                instructions: editInstructions,
            });

            if (response.data.success) {
                message.success('Cập nhật Part thành công!');
                setEditModalVisible(false);
                setEditingPart(null);
                setEditInstructions('');
                form.resetFields();
                fetchParts();
            } else {
                message.error(response.data.message || 'Không thể cập nhật Part');
            }
        } catch (error) {
            message.error('Có lỗi xảy ra khi cập nhật Part');
        }
    };

    const handleViewDetails = (part: Part) => {
        navigate(`/exam-bank/${testId}/parts/${part.id}`);
    };

    const handleBulkActivate = async () => {
        if (selectedPartIds.length === 0) {
            message.warning('Vui lòng chọn ít nhất một Part');
            return;
        }

        try {
            const promises = selectedPartIds.map(partId =>
                api.patch(`/parts/${partId}`, { status: 'ACTIVE' })
            );

            await Promise.all(promises);
            message.success(`Đã kích hoạt ${selectedPartIds.length} Part`);
            setSelectedPartIds([]);
            fetchParts();
        } catch (error) {
            message.error('Có lỗi xảy ra khi kích hoạt hàng loạt');
        }
    };

    const handleBulkDeactivate = async () => {
        if (selectedPartIds.length === 0) {
            message.warning('Vui lòng chọn ít nhất một Part');
            return;
        }

        try {
            const promises = selectedPartIds.map(partId =>
                api.patch(`/parts/${partId}`, { status: 'INACTIVE' })
            );

            await Promise.all(promises);
            message.success(`Đã vô hiệu hóa ${selectedPartIds.length} Part`);
            setSelectedPartIds([]);
            fetchParts();
        } catch (error) {
            message.error('Có lỗi xảy ra khi vô hiệu hóa hàng loạt');
        }
    };

    const handleDelete = async (partId: string) => {
        try {
            // First, check how many questions this Part has
            const questionsResponse = await api.get(`/parts/${partId}/questions`);
            const questionCount = questionsResponse.data.questions?.length || 0;

            if (questionCount > 0) {
                // Part has questions - show warning and redirect to question management
                const partToDelete = parts.find(p => p.id === partId);
                Modal.warning({
                    title: 'Không thể xóa Part',
                    content: `Part này có ${questionCount} câu hỏi. Bạn cần xóa câu hỏi trước khi xóa Part.`,
                    okText: 'Quản lý câu hỏi',
                    onOk: () => {
                        // Redirect to the new Part Detail page
                        if (partToDelete) {
                            navigate(`/exam-bank/${testId}/parts/${partToDelete.id}`);
                        }
                    },
                });
            } else {
                // No questions - just delete the Part
                const response = await api.delete(`/parts/${partId}`);

                if (response.data.success) {
                    message.success('Xóa Part thành công!');
                    fetchParts();
                } else {
                    message.error(response.data.message || 'Không thể xóa Part');
                }
            }
        } catch (error) {
            message.error('Có lỗi xảy ra khi xóa Part');
        }
    };

    const columns: ColumnsType<Part> = [
        {
            title: 'Part',
            dataIndex: 'partNumber',
            key: 'partNumber',
            width: 100,
            align: 'center',
            render: (partNumber) => `Part ${partNumber}`,
        },
        {
            title: 'Tên',
            dataIndex: 'partName',
            key: 'partName',
            width: 250,
            render: (partName) => partName.replace(/^Part \d+: /, ''),
        },
        {
            title: 'Tổng số câu',
            dataIndex: 'totalQuestions',
            key: 'totalQuestions',
            width: 120,
            align: 'center',
        },
        {
            title: 'Thời gian làm bài',
            dataIndex: 'timeLimit',
            key: 'timeLimit',
            width: 150,
            align: 'center',
            render: (timeLimit) => timeLimit ? `${timeLimit}` : '-',
        },
        {
            title: 'Tiến độ',
            key: 'progress',
            width: 200,
            align: 'center',
            render: (_, record) => (
                <div>
                    <Progress
                        percent={Math.round((record.completedQuestions / record.totalQuestions) * 100)}
                        size="small"
                        status={record.completedQuestions === record.totalQuestions ? 'success' : 'active'}
                    />
                    <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                        {record.completedQuestions}/{record.totalQuestions} câu hỏi
                    </div>
                </div>
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 140,
            align: 'center',
            render: (_, record) => (
                <Tag color={record.status === 'ACTIVE' ? 'green' : 'red'}>
                    {record.status === 'ACTIVE' ? 'Mở' : 'Khóa'}
                </Tag>
            ),
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 180,
            align: 'center',
            render: (_, record) => (
                <Space>
                    <Button
                        type="default"
                        icon={<FileTextOutlined />}
                        size="small"
                        onClick={() => handleViewDetails(record)}
                        title="Xem chi tiết & Import đề thi"
                    />
                    <Button
                        type="primary"
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => handleEdit(record)}
                    />
                    <Popconfirm
                        title="Xóa Part này?"
                        description="Bạn có chắc chắn muốn xóa Part này không?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                    >
                        <Button
                            type="default"
                            danger
                            icon={<DeleteOutlined />}
                            size="small"
                        />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const getDifficultyLabel = (difficulty: string) => {
        const map: any = {
            EASY: 'A1-A2',
            MEDIUM: 'B1-B2',
            HARD: 'C1',
        };
        return map[difficulty] || difficulty;
    };

    const renderInstructionsField = (isCreate: boolean) => {
        const content = isCreate ? createInstructions : editInstructions;
        const setContent = isCreate ? setCreateInstructions : setEditInstructions;

        const quillModules = {
            toolbar: [
                ['bold', 'italic', 'underline'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['clean']
            ]
        };

        const quillFormats = [
            'bold', 'italic', 'underline',
            'list', 'bullet'
        ];

        return (
            <>
                <div style={{ marginBottom: 16 }}>
                    <p style={{ color: '#666', marginBottom: 8 }}>
                        Viết hướng dẫn cho học viên khi làm bài Part này.
                    </p>
                </div>

                <ReactQuill
                    theme="snow"
                    value={content}
                    onChange={setContent}
                    modules={quillModules}
                    formats={quillFormats}
                    placeholder="Nhập hướng dẫn cho Part này..."
                    style={{ backgroundColor: '#fff', minHeight: '200px' }}
                />
            </>
        );
    };

    return (
        <div style={{ padding: 24 }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/exam-bank')}
                    style={{ marginBottom: 16 }}
                >
                    Quay lại
                </Button>

                {test && (
                    <Card>
                        <Descriptions title="Thông tin đề thi" column={2}>
                            <Descriptions.Item label="Tiêu đề">{test.title}</Descriptions.Item>
                            <Descriptions.Item label="Loại đề">
                                {test.testType === 'LISTENING' ? 'Listening' : 'Reading'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Độ khó">
                                <Tag color={test.difficulty === 'EASY' ? 'green' : test.difficulty === 'MEDIUM' ? 'orange' : 'red'}>
                                    {getDifficultyLabel(test.difficulty)}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Trạng thái">
                                <Tag color={test.status === 'UNLOCKED' ? 'green' : 'red'}>
                                    {test.status === 'UNLOCKED' ? 'Mở khóa' : 'Khóa'}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Thời gian">{test.duration} phút</Descriptions.Item>
                            <Descriptions.Item label="Tổng số câu">{test.totalQuestions} câu</Descriptions.Item>
                        </Descriptions>
                    </Card>
                )}
            </div>

            {/* Parts Table */}
            <Card
                title="Danh sách Parts"
                extra={
                    <Space>
                        {selectedPartIds.length > 0 && (
                            <>
                                <Button
                                    type="default"
                                    onClick={handleBulkActivate}
                                    disabled={selectedPartIds.length === 0}
                                >
                                    Kích hoạt ({selectedPartIds.length})
                                </Button>
                                <Button
                                    type="default"
                                    danger
                                    onClick={handleBulkDeactivate}
                                    disabled={selectedPartIds.length === 0}
                                >
                                    Vô hiệu hóa ({selectedPartIds.length})
                                </Button>
                            </>
                        )}
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setCreateModalVisible(true)}
                        >
                            Tạo Part mới
                        </Button>
                    </Space>
                }
            >
                <Table
                    columns={columns}
                    dataSource={parts}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                    rowSelection={{
                        selectedRowKeys: selectedPartIds,
                        onChange: (selectedKeys) => setSelectedPartIds(selectedKeys as string[]),
                    }}
                />
            </Card>

            {/* Create Modal */}
            <Modal
                title="Tạo Part mới"
                open={createModalVisible}
                onCancel={() => {
                    setCreateModalVisible(false);
                    createForm.resetFields();
                    setCreateInstructions('');
                }}
                onOk={() => createForm.submit()}
                okText="Tạo"
                cancelText="Hủy"
                width={900}
            >
                <Form
                    form={createForm}
                    layout="vertical"
                    onFinish={handleCreatePart}
                >
                    <Form.Item
                        label="Part"
                        name="partNumber"
                        rules={[{ required: true, message: 'Vui lòng chọn Part' }]}
                    >
                        <Select
                            placeholder="Chọn Part"
                            onChange={(value) => {
                                const config = PART_CONFIG[value];
                                if (config) {
                                    createForm.setFieldsValue({
                                        partName: config.name,
                                        totalQuestions: config.totalQuestions,
                                        timeLimit: config.timeLimit,
                                        orderIndex: value,
                                    });
                                }
                            }}
                        >
                            {test?.testType === 'LISTENING' ? (
                                <>
                                    <Option value={1}>{PART_CONFIG[1].name}</Option>
                                    <Option value={2}>{PART_CONFIG[2].name}</Option>
                                    <Option value={3}>{PART_CONFIG[3].name}</Option>
                                    <Option value={4}>{PART_CONFIG[4].name}</Option>
                                </>
                            ) : (
                                <>
                                    <Option value={5}>{PART_CONFIG[5].name}</Option>
                                    <Option value={6}>{PART_CONFIG[6].name}</Option>
                                    <Option value={7}>{PART_CONFIG[7].name}</Option>
                                </>
                            )}
                        </Select>
                    </Form.Item>

                    {/* Hidden field for partName - auto-filled */}
                    <Form.Item name="partName" hidden>
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Tổng số câu hỏi"
                        name="totalQuestions"
                        rules={[
                            { required: true, message: 'Vui lòng nhập số câu hỏi' },
                            { type: 'number', min: 1, message: 'Số câu hỏi phải lớn hơn 0' }
                        ]}
                    >
                        <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        label="Thời gian làm bài (phút)"
                        name="timeLimit"
                        rules={[
                            { required: true, message: 'Vui lòng nhập thời gian' },
                            { type: 'number', min: 1, message: 'Thời gian phải lớn hơn 0' }
                        ]}
                    >
                        <InputNumber min={1} style={{ width: '100%' }} addonAfter="phút" />
                    </Form.Item>

                    <Form.Item label="Hướng dẫn (bắt buộc)" required>
                        {renderInstructionsField(true)}
                    </Form.Item>

                    {/* Hidden field for orderIndex - auto-filled */}
                    <Form.Item name="orderIndex" hidden>
                        <InputNumber />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Edit Modal */}
            <Modal
                title="Chỉnh sửa Part"
                open={editModalVisible}
                onCancel={() => {
                    setEditModalVisible(false);
                    setEditingPart(null);
                    setEditInstructions('');
                    form.resetFields();
                }}
                onOk={() => form.submit()}
                okText="Lưu"
                cancelText="Hủy"
                width={900}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleUpdatePart}
                >
                    <Form.Item
                        label="Part"
                        name="partNumber"
                        rules={[{ required: true, message: 'Vui lòng chọn Part' }]}
                    >
                        <Select placeholder="Chọn Part" disabled>
                            <Option value={1}>{PART_CONFIG[1].name}</Option>
                            <Option value={2}>{PART_CONFIG[2].name}</Option>
                            <Option value={3}>{PART_CONFIG[3].name}</Option>
                            <Option value={4}>{PART_CONFIG[4].name}</Option>
                            <Option value={5}>{PART_CONFIG[5].name}</Option>
                            <Option value={6}>{PART_CONFIG[6].name}</Option>
                            <Option value={7}>{PART_CONFIG[7].name}</Option>
                        </Select>
                    </Form.Item>

                    {/* Hidden field for partName */}
                    <Form.Item name="partName" hidden>
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Tổng số câu hỏi"
                        name="totalQuestions"
                        rules={[
                            { required: true, message: 'Vui lòng nhập số câu hỏi' },
                            { type: 'number', min: 1, message: 'Số câu hỏi phải lớn hơn 0' }
                        ]}
                    >
                        <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        label="Thời gian làm bài (phút)"
                        name="timeLimit"
                        rules={[
                            { required: true, message: 'Vui lòng nhập thời gian' },
                            { type: 'number', min: 1, message: 'Thời gian phải lớn hơn 0' }
                        ]}
                    >
                        <InputNumber min={1} style={{ width: '100%' }} addonAfter="phút" />
                    </Form.Item>

                    <Form.Item label="Hướng dẫn (bắt buộc)" required>
                        {renderInstructionsField(false)}
                    </Form.Item>

                    <Form.Item name="status" label="Trạng thái">
                        <Select>
                            <Option value="ACTIVE">Hoạt động</Option>
                            <Option value="INACTIVE">Vô hiệu hóa</Option>
                        </Select>
                    </Form.Item>

                    {/* Hidden field for orderIndex */}
                    <Form.Item name="orderIndex" hidden>
                        <InputNumber />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
