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
    Descriptions, // Added
    Popconfirm, // Added
    Select,
    Progress,
    Upload,
} from 'antd';
import {
    ArrowLeftOutlined,
    PlusOutlined, // Added
    EditOutlined,
    DeleteOutlined,
    FileTextOutlined,
    UploadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { testApi, partApi, uploadApi } from '../services/api';
import InstructionEditor from '../components/InstructionEditor';

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
    instructionImgUrl?: string;
    status: 'ACTIVE' | 'INACTIVE';
    orderIndex: number;
    completedQuestions: number;
    createdAt: string;
    updatedAt: string;
    timeLimit?: number; // in seconds
    audioUrl?: string;
}

// Auto-fill configuration for parts
const PART_CONFIG: Record<number, { name: string; totalQuestions: number; timeLimit: number }> = {
    1: { name: 'Part 1: Photographs', totalQuestions: 6, timeLimit: 300 }, // 5 mins
    2: { name: 'Part 2: Question-Response', totalQuestions: 25, timeLimit: 480 }, // 8 mins
    3: { name: 'Part 3: Conversations', totalQuestions: 39, timeLimit: 1020 }, // 17 mins
    4: { name: 'Part 4: Talks', totalQuestions: 30, timeLimit: 900 }, // 15 mins
    5: { name: 'Part 5: Incomplete Sentences', totalQuestions: 30, timeLimit: 600 }, // 10 mins
    6: { name: 'Part 6: Text Completion', totalQuestions: 16, timeLimit: 480 }, // 8 mins
    7: { name: 'Part 7: Reading Comprehension', totalQuestions: 54, timeLimit: 3240 }, // 54 mins
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

    const [createInstructions, setCreateInstructions] = useState('');
    const [editInstructions, setEditInstructions] = useState('');

    // Part Audio Edit State
    const [editPartAudioFileList, setEditPartAudioFileList] = useState<any[]>([]);

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
            const data = await testApi.getDetails(testId!);
            if (data.success) {
                setTest(data.test);
            }
        } catch (error) {
            message.error('Không thể tải thông tin đề thi');
        }
    };

    const fetchParts = async () => {
        setLoading(true);
        try {
            const data = await testApi.getParts(testId!);
            if (data.success) {
                setParts(data.parts || []);
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
            // Calculate timeLimit (minutes * 60 + seconds)
            const timeLimit = (values.timeLimitMinutes || 0) * 60 + (values.timeLimitSeconds || 0);

            const data = await partApi.create(testId!, {
                ...values,
                timeLimit,
                instructions: createInstructions,
                status: 'INACTIVE', // Default to inactive when creating
            });

            // Remove temp fields
            delete (values as any).timeLimitHours;
            delete (values as any).timeLimitMinutes;
            delete (values as any).timeLimitSeconds;

            if (data.success) {
                message.success('Tạo Part thành công!');
                setCreateModalVisible(false);
                createForm.resetFields();
                setCreateInstructions('');
                fetchParts();
            } else {
                message.error(data.message || 'Không thể tạo Part');
            }
        } catch (error) {
            message.error('Có lỗi xảy ra khi tạo Part');
        }
    };

    const handleEdit = (part: Part) => {
        setEditingPart(part);
        setEditInstructions(part.instructions || '');

        // Initialize audio file list if part has audioUrl
        if (part.audioUrl) {
            setEditPartAudioFileList([{
                uid: '-1',
                name: 'Audio hiện tại',
                status: 'done',
                url: part.audioUrl,
            }]);
        } else {
            setEditPartAudioFileList([]);
        }

        form.setFieldsValue({
            partNumber: part.partNumber,
            partName: part.partName,
            totalQuestions: part.totalQuestions,
            timeLimitMinutes: Math.floor((part.timeLimit || 0) / 60),
            timeLimitSeconds: (part.timeLimit || 0) % 60,
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
            let infoAudioUrl = editingPart.audioUrl;

            // Handle Audio Upload if changed
            if (editPartAudioFileList.length > 0 && editPartAudioFileList[0].originFileObj) {
                const audioRes = await uploadApi.audio(editPartAudioFileList[0].originFileObj);
                if (audioRes.success) {
                    infoAudioUrl = audioRes.url;
                } else {
                    message.error('Upload audio thất bại');
                    return;
                }
            } else if (editPartAudioFileList.length === 0) {
                infoAudioUrl = undefined; // Removed audio
            }

            // Calculate timeLimit (minutes * 60 + seconds)
            const timeLimit = (values.timeLimitMinutes || 0) * 60 + (values.timeLimitSeconds || 0);

            const data = await partApi.update(editingPart.id, {
                ...values,
                timeLimit,
                instructions: editInstructions,
                audioUrl: infoAudioUrl,
            });

            // Remove temp fields
            delete (values as any).timeLimitHours;
            delete (values as any).timeLimitMinutes;
            delete (values as any).timeLimitSeconds;

            if (data.success) {
                message.success('Cập nhật Part thành công!');
                setEditModalVisible(false);
                setEditingPart(null);
                setEditInstructions('');
                form.resetFields();
                fetchParts();
            } else {
                message.error(data.message || 'Không thể cập nhật Part');
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
                partApi.update(partId, { status: 'ACTIVE' })
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
                partApi.update(partId, { status: 'INACTIVE' })
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
            const data = await partApi.getQuestions(partId);
            const questionCount = data.questions?.length || 0;

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
                const data = await partApi.delete(partId);

                if (data.success) {
                    message.success('Xóa Part thành công!');
                    fetchParts();
                } else {
                    message.error(data.message || 'Không thể xóa Part');
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
            title: 'Thời gian',
            dataIndex: 'timeLimit',
            key: 'timeLimit',
            width: 150,
            align: 'center',
            render: (timeLimit) => {
                if (!timeLimit) return '-';
                const h = Math.floor(timeLimit / 3600);
                const m = Math.floor((timeLimit % 3600) / 60);
                const s = timeLimit % 60;

                let result = '';
                if (h > 0) result += `${h}h `;
                if (m > 0) result += `${m}m `;
                if (s > 0) result += `${s}s`;
                return result.trim() || '0s';
            },
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

        return (
            <>
                <div style={{ marginBottom: 16 }}>
                    <p style={{ color: '#666', marginBottom: 8 }}>
                        Viết hướng dẫn cho học viên khi làm bài Part này.
                        Bạn có thể chèn ảnh minh họa trực tiếp vào nội dung.
                    </p>
                </div>

                <InstructionEditor
                    value={content}
                    onChange={setContent}
                    placeholder="Nhập hướng dẫn cho Part này..."
                />
            </>
        );
    };

    return (
        <div style={{ padding: 24 }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <Button
                        icon={<ArrowLeftOutlined />}
                        onClick={() => navigate('/exam-bank')}
                    >
                        Quay lại
                    </Button>
                </div>

                {test && (
                    <Card>
                        <Descriptions title="Thông tin đề thi" column={2}>
                            <Descriptions.Item label="Tiêu đề">{test.title}</Descriptions.Item>
                            <Descriptions.Item label="Loại bài">
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
                                        timeLimitHours: Math.floor(config.timeLimit / 3600),
                                        timeLimitMinutes: Math.floor((config.timeLimit % 3600) / 60),
                                        timeLimitSeconds: config.timeLimit % 60,
                                        orderIndex: value,
                                    });
                                }
                            }}
                        >
                            {test?.testType?.toUpperCase() === 'LISTENING' ? (
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

                    <Form.Item label="Thời gian làm bài" required style={{ marginBottom: 0 }}>
                        <Space align="baseline" style={{ display: 'flex' }}>
                            <Form.Item
                                name="timeLimitMinutes"
                                rules={[{ type: 'number', min: 0 }]}
                                initialValue={0}
                            >
                                <InputNumber min={0} style={{ width: 80 }} addonAfter="phút" />
                            </Form.Item>
                            <Form.Item
                                name="timeLimitSeconds"
                                rules={[{ type: 'number', min: 0, max: 59 }]}
                                initialValue={0}
                            >
                                <InputNumber min={0} max={59} style={{ width: 80 }} addonAfter="giây" />
                            </Form.Item>
                        </Space>
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
                    setEditPartAudioFileList([]); // Clear audio file list on cancel
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

                    <Form.Item label="Thời gian làm bài" required style={{ marginBottom: 0 }}>
                        <Space align="baseline" style={{ display: 'flex' }}>
                            <Form.Item
                                name="timeLimitMinutes"
                                rules={[{ type: 'number', min: 0 }]}
                            >
                                <InputNumber min={0} style={{ width: 80 }} addonAfter="phút" />
                            </Form.Item>
                            <Form.Item
                                name="timeLimitSeconds"
                                rules={[{ type: 'number', min: 0, max: 59 }]}
                            >
                                <InputNumber min={0} max={59} style={{ width: 80 }} addonAfter="giây" />
                            </Form.Item>
                        </Space>
                    </Form.Item>

                    <Form.Item label="Hướng dẫn (bắt buộc)" required>
                        <div style={{ marginBottom: 50, height: 280 }}>
                            <InstructionEditor
                                value={editInstructions}
                                onChange={setEditInstructions}
                                style={{ height: '100%' }}
                            />
                        </div>
                    </Form.Item>

                    {/* Audio Upload - Only for Listening Parts (1-4) */}
                    {editingPart && editingPart.partNumber >= 1 && editingPart.partNumber <= 4 && (
                        <Form.Item label="Audio">
                            <Upload
                                fileList={editPartAudioFileList}
                                beforeUpload={(file) => {
                                    setEditPartAudioFileList([file]);
                                    return false;
                                }}
                                onRemove={() => setEditPartAudioFileList([])}
                                maxCount={1}
                                accept="audio/*"
                            >
                                <Button icon={<UploadOutlined />}>Upload audio</Button>
                            </Upload>
                        </Form.Item>
                    )}

                    <Form.Item name="status" label="Trạng thái" initialValue="ACTIVE">
                        <Select>
                            <Option value="ACTIVE">Mở</Option>
                            <Option value="INACTIVE">Khóa</Option>
                        </Select>
                    </Form.Item>

                    {/* Hidden field for orderIndex */}
                    <Form.Item name="orderIndex" hidden>
                        <InputNumber />
                    </Form.Item>
                </Form>
            </Modal>
        </div >
    );
}
