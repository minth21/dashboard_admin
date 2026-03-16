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
    Popconfirm,
    Select,
    Progress,
    Upload,
    Row,
    Col,
} from 'antd';
import {
    ArrowLeftOutlined,
    PlusOutlined, // Added
    EditOutlined,
    DeleteOutlined,
    FileTextOutlined,
    UploadOutlined,
    ClockCircleOutlined,
    SafetyCertificateOutlined,
    QuestionCircleOutlined,
    PlusCircleOutlined,
    BookOutlined,
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

    // Cấu hình bóng đổ hiện đại
    const modernShadow = '0 10px 30px -5px rgba(37, 99, 235, 0.08), 0 4px 10px -6px rgba(37, 99, 235, 0.04)';

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
            title: 'Số hiệu',
            dataIndex: 'partNumber',
            key: 'partNumber',
            width: 120,
            align: 'center',
            render: (num) => (
                <div style={{
                    background: '#F1F5F9',
                    color: '#475569',
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '13px',
                    textAlign: 'center',
                    border: '1px solid #E2E8F0'
                }}>
                    PART {num}
                </div>
            ),
        },
        {
            title: 'Tên phân đoạn',
            dataIndex: 'partName',
            key: 'partName',
            width: 250,
            align: 'center',
            render: (name) => (
                <div style={{ fontWeight: 700, color: '#1E3A8A', textAlign: 'center' }}>
                    {name.replace(/^Part \d+: /, '')}
                </div>
            ),
        },
        {
            title: 'Tổng câu',
            dataIndex: 'totalQuestions',
            key: 'totalQuestions',
            width: 100,
            align: 'center',
            render: (total) => <span style={{ fontWeight: 700, color: '#64748B' }}>{total} câu</span>,
        },
        {
            title: 'Thời gian',
            dataIndex: 'timeLimit',
            key: 'timeLimit',
            width: 140,
            align: 'center',
            render: (timeLimit) => {
                if (!timeLimit) return <Tag>Không giới hạn</Tag>;
                const m = Math.floor(timeLimit / 60);
                const s = timeLimit % 60;
                return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 600, color: '#10B981' }}>
                        <ClockCircleOutlined style={{ fontSize: 13 }} />
                        {m}:{s.toString().padStart(2, '0')}
                    </div>
                );
            },
        },
        {
            title: 'Hoàn thiện',
            key: 'progress',
            width: 180,
            align: 'center',
            render: (_, record) => {
                const percent = Math.round((record.completedQuestions / record.totalQuestions) * 100);
                return (
                    <div style={{ padding: '0 8px' }}>
                        <Progress
                            percent={percent}
                            size="small"
                            strokeColor={{
                                '0%': '#3B82F6',
                                '100%': '#10B981',
                            }}
                            status={percent === 100 ? 'success' : 'active'}
                        />
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, fontWeight: 600 }}>
                            {record.completedQuestions} / {record.totalQuestions}
                        </div>
                    </div>
                );
            },
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            align: 'center',
            render: (status) => (
                <div style={{
                    background: status === 'ACTIVE' ? '#ECFDF5' : '#FEF2F2',
                    color: status === 'ACTIVE' ? '#059669' : '#DC2626',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontWeight: 700,
                    gap: 6,
                    fontSize: '12px'
                }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                    {status === 'ACTIVE' ? 'ĐANG MỞ' : 'KHÓA'}
                </div>
            ),
        },
        {
            title: 'Hành động',
            key: 'actions',
            width: 150,
            align: 'center',
            fixed: 'right',
            render: (_, record) => (
                <Space>
                    <Button
                        type="text"
                        style={{ color: '#3B82F6', background: '#EFF6FF', borderRadius: '8px' }}
                        icon={<FileTextOutlined />}
                        onClick={() => handleViewDetails(record)}
                        title="Import câu hỏi"
                    />
                    <Button
                        type="text"
                        style={{ color: '#059669', background: '#ECFDF5', borderRadius: '8px' }}
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    />
                    <Popconfirm
                        title="Xác nhận xóa Part?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Xóa"
                        cancelText="Hủy"
                    >
                        <Button
                            type="text"
                            danger
                            style={{ background: '#FEF2F2', borderRadius: '8px' }}
                            icon={<DeleteOutlined />}
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
        <div style={{ padding: '24px', background: '#F8FAFC', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button
                    size="large"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/exam-bank')}
                    style={{ borderRadius: 12, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                    Quay lại danh sách
                </Button>
            </div>

            {test && (
                <Card
                    style={{
                        marginBottom: 32,
                        borderRadius: 24,
                        border: 'none',
                        boxShadow: modernShadow,
                        background: '#FFFFFF',
                        overflow: 'hidden'
                    }}
                    bodyStyle={{ padding: 0 }}
                >
                    <div style={{
                        background: 'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%)',
                        padding: '24px 32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <Space size={16}>
                            <div style={{
                                width: 56,
                                height: 56,
                                borderRadius: 16,
                                background: 'rgba(255, 255, 255, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#FFF',
                                fontSize: 28,
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                backdropFilter: 'blur(4px)',
                            }}>
                                <FileTextOutlined />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, color: '#FFFFFF', fontSize: 22, fontWeight: 700 }}>{test?.title}</h2>
                                <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 14 }}>Mã đề: {test?.id}</div>
                            </div>
                        </Space>
                        <Tag color={test?.status === 'UNLOCKED' ? 'success' : 'error'} style={{
                            borderRadius: '30px',
                            padding: '4px 16px',
                            fontWeight: 700,
                            border: 'none',
                            fontSize: 13,
                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                        }}>
                            {test?.status === 'UNLOCKED' ? 'ĐANG MỞ' : 'ĐANG KHÓA'}
                        </Tag>
                    </div>

                    <div style={{ padding: '32px' }}>
                        <Row gutter={[40, 24]}>
                            <Col xs={12} sm={6}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span style={{ color: '#64748B', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Loại bài thi</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1E293B', fontWeight: 700, fontSize: 16 }}>
                                        <QuestionCircleOutlined style={{ color: '#3B82F6' }} />
                                        {test.testType === 'LISTENING' ? 'Listening' : 'Reading'}
                                    </div>
                                </div>
                            </Col>
                            <Col xs={12} sm={6}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span style={{ color: '#64748B', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Độ khó</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1E293B', fontWeight: 700, fontSize: 16 }}>
                                        <SafetyCertificateOutlined style={{ color: '#F59E0B' }} />
                                        {test && getDifficultyLabel(test.difficulty)}
                                    </div>
                                </div>
                            </Col>
                            <Col xs={12} sm={6}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span style={{ color: '#64748B', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Thời gian</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1E293B', fontWeight: 700, fontSize: 16 }}>
                                        <ClockCircleOutlined style={{ color: '#10B981' }} />
                                        {test.duration} phút
                                    </div>
                                </div>
                            </Col>
                            <Col xs={12} sm={6}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span style={{ color: '#64748B', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quy mô</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1E293B', fontWeight: 700, fontSize: 16 }}>
                                        <BookOutlined style={{ color: '#8B5CF6' }} />
                                        {test?.totalQuestions} câu hỏi
                                    </div>
                                </div>
                            </Col>
                        </Row>
                    </div>
                </Card>
            )}

            {/* Parts Table */}
            <Card
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: '#F1F5F9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#475569'
                        }}>
                            <PlusCircleOutlined />
                        </div>
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#1E293B' }}>Cấu trúc đề thi</span>
                    </div>
                }
                style={{
                    borderRadius: 24,
                    border: 'none',
                    boxShadow: modernShadow,
                    background: '#FFFFFF'
                }}
                extra={
                    <Space size="middle">
                        {selectedPartIds.length > 0 && (
                            <div style={{
                                background: '#F1F5F9',
                                padding: '4px 8px',
                                borderRadius: '10px',
                                display: 'flex',
                                gap: 8
                            }}>
                                <Button
                                    type="text"
                                    onClick={handleBulkActivate}
                                    style={{ color: '#059669', fontWeight: 600, fontSize: 13 }}
                                >
                                    Mở ({selectedPartIds.length})
                                </Button>
                                <Button
                                    type="text"
                                    danger
                                    onClick={handleBulkDeactivate}
                                    style={{ fontWeight: 600, fontSize: 13 }}
                                >
                                    Khóa ({selectedPartIds.length})
                                </Button>
                            </div>
                        )}
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setCreateModalVisible(true)}
                            size="large"
                            style={{
                                borderRadius: 12,
                                fontWeight: 700,
                                background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                                border: 'none',
                                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)'
                            }}
                        >
                            Tạo Part mới
                        </Button>
                    </Space>
                }
                bodyStyle={{ padding: 0 }}
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
                    style={{ borderRadius: '0 0 24px 24px' }}
                />
            </Card>

            {/* Create Modal */}
            <Modal
                title={
                    <Space style={{ marginBottom: 8 }}>
                        <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: 18,
                            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)'
                        }}>
                            <PlusCircleOutlined />
                        </div>
                        <span style={{ fontSize: 20, color: '#1E293B', fontWeight: 800 }}>Tạo Part mới</span>
                    </Space>
                }
                open={createModalVisible}
                onCancel={() => {
                    setCreateModalVisible(false);
                    createForm.resetFields();
                    setCreateInstructions('');
                }}
                onOk={() => createForm.submit()}
                okText="Tạo mới "
                cancelText="Hủy bỏ"
                width={850}
                centered
                okButtonProps={{
                    style: {
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                        border: 'none',
                        height: 44,
                        padding: '0 32px',
                        fontWeight: 700,
                        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
                    }
                }}
                cancelButtonProps={{ style: { borderRadius: 10, height: 44 } }}
            >
                <Form
                    form={createForm}
                    layout="vertical"
                    onFinish={handleCreatePart}
                    style={{ marginTop: 24 }}
                >
                    <Row gutter={24}>
                        <Col span={12}>
                            <Form.Item
                                label={<span style={{ fontWeight: 600, color: '#475569' }}>Chọn số Part</span>}
                                name="partNumber"
                                rules={[{ required: true, message: 'Vui lòng chọn Part' }]}
                            >
                                <Select
                                    size="large"
                                    placeholder="Chọn Part"
                                    style={{ borderRadius: 10 }}
                                    prefix={<QuestionCircleOutlined style={{ color: '#94A3B8' }} />}
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
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label={<span style={{ fontWeight: 600, color: '#475569' }}>Tổng số câu hỏi</span>}
                                name="totalQuestions"
                                rules={[
                                    { required: true, message: 'Vui lòng nhập số câu hỏi' },
                                    { type: 'number', min: 1, message: 'Số câu hỏi phải lớn hơn 0' }
                                ]}
                            >
                                <InputNumber size="large" min={1} prefix={<BookOutlined style={{ color: '#94A3B8' }} />} style={{ width: '100%', borderRadius: 10 }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    {/* Hidden field for partName - auto-filled */}
                    <Form.Item name="partName" hidden>
                        <Input />
                    </Form.Item>

                    <Row gutter={24}>
                        <Col span={12}>
                            <Form.Item label={<span style={{ fontWeight: 600, color: '#475569' }}>Thời gian giới hạn</span>} required>
                                <Space align="baseline" style={{ display: 'flex' }}>
                                    <Form.Item
                                        name="timeLimitMinutes"
                                        rules={[{ type: 'number', min: 0 }]}
                                        initialValue={0}
                                    >
                                        <InputNumber size="large" min={0} style={{ width: 120, borderRadius: 10 }} addonAfter="phút" />
                                    </Form.Item>
                                    <Form.Item
                                        name="timeLimitSeconds"
                                        rules={[{ type: 'number', min: 0, max: 59 }]}
                                        initialValue={0}
                                    >
                                        <InputNumber size="large" min={0} max={59} style={{ width: 120, borderRadius: 10 }} addonAfter="giây" />
                                    </Form.Item>
                                </Space>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            {/* Hidden field for orderIndex */}
                            <Form.Item name="orderIndex" hidden>
                                <InputNumber />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item label={<span style={{ fontWeight: 600, color: '#475569' }}>Hướng dẫn làm bài (bắt buộc)</span>} required>
                        <div style={{ padding: '4px', border: '1px solid #E2E8F0', borderRadius: 12 }}>
                            {renderInstructionsField(true)}
                        </div>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Edit Modal */}
            <Modal
                title={
                    <Space style={{ marginBottom: 8 }}>
                        <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: 18,
                            boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)'
                        }}>
                            <EditOutlined />
                        </div>
                        <span style={{ fontSize: 20, color: '#1E293B', fontWeight: 800 }}>Chỉnh sửa Part</span>
                    </Space>
                }
                open={editModalVisible}
                onCancel={() => {
                    setEditModalVisible(false);
                    setEditingPart(null);
                    setEditInstructions('');
                    form.resetFields();
                    setEditPartAudioFileList([]);
                }}
                onOk={() => form.submit()}
                okText="Cập nhật thông tin"
                cancelText="Hủy bỏ"
                width={850}
                centered
                okButtonProps={{
                    style: {
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        border: 'none',
                        height: 44,
                        padding: '0 32px',
                        fontWeight: 700,
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                    }
                }}
                cancelButtonProps={{ style: { borderRadius: 10, height: 44 } }}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleUpdatePart}
                    style={{ marginTop: 24 }}
                >
                    <Row gutter={24}>
                        <Col span={12}>
                            <Form.Item
                                label={<span style={{ fontWeight: 600, color: '#475569' }}>Số Part</span>}
                                name="partNumber"
                                rules={[{ required: true, message: 'Vui lòng chọn Part' }]}
                            >
                                <Select size="large" placeholder="Chọn Part" disabled style={{ borderRadius: 10 }}>
                                    <Option value={1}>{PART_CONFIG[1].name}</Option>
                                    <Option value={2}>{PART_CONFIG[2].name}</Option>
                                    <Option value={3}>{PART_CONFIG[3].name}</Option>
                                    <Option value={4}>{PART_CONFIG[4].name}</Option>
                                    <Option value={5}>{PART_CONFIG[5].name}</Option>
                                    <Option value={6}>{PART_CONFIG[6].name}</Option>
                                    <Option value={7}>{PART_CONFIG[7].name}</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label={<span style={{ fontWeight: 600, color: '#475569' }}>Tổng số câu hỏi</span>}
                                name="totalQuestions"
                                rules={[
                                    { required: true, message: 'Vui lòng nhập số câu hỏi' },
                                    { type: 'number', min: 1, message: 'Số câu hỏi phải lớn hơn 0' }
                                ]}
                            >
                                <InputNumber size="large" min={1} prefix={<BookOutlined style={{ color: '#94A3B8' }} />} style={{ width: '100%', borderRadius: 10 }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={24}>
                        <Col span={12}>
                            <Form.Item label={<span style={{ fontWeight: 600, color: '#475569' }}>Thời gian giới hạn</span>} required>
                                <Space align="baseline" style={{ display: 'flex' }}>
                                    <Form.Item
                                        name="timeLimitMinutes"
                                        rules={[{ type: 'number', min: 0 }]}
                                    >
                                        <InputNumber size="large" min={0} style={{ width: 120, borderRadius: 10 }} addonAfter="phút" />
                                    </Form.Item>
                                    <Form.Item
                                        name="timeLimitSeconds"
                                        rules={[{ type: 'number', min: 0, max: 59 }]}
                                    >
                                        <InputNumber size="large" min={0} max={59} style={{ width: 120, borderRadius: 10 }} addonAfter="giây" />
                                    </Form.Item>
                                </Space>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="status" label={<span style={{ fontWeight: 600, color: '#475569' }}>Trạng thái</span>} initialValue="ACTIVE">
                                <Select size="large" style={{ borderRadius: 10 }}>
                                    <Option value="ACTIVE">Mở (Hoạt động)</Option>
                                    <Option value="INACTIVE">Khóa (Tạm dừng)</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    {/* Audio Upload - Only for Listening Parts (1-4) */}
                    {editingPart && editingPart.partNumber >= 1 && editingPart.partNumber <= 4 && (
                        <Form.Item label={<span style={{ fontWeight: 600, color: '#475569' }}>Audio tập tin</span>}>
                            <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: 12, border: '1px dashed #CBD5E1' }}>
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
                                    <Button size="large" icon={<UploadOutlined />} style={{ borderRadius: 8 }}>Chọn tệp Audio mới</Button>
                                </Upload>
                            </div>
                        </Form.Item>
                    )}

                    <Form.Item label={<span style={{ fontWeight: 600, color: '#475569' }}>Hướng dẫn làm bài (bắt buộc)</span>} required>
                        <div style={{ padding: '4px', border: '1px solid #E2E8F0', borderRadius: 12 }}>
                            <InstructionEditor
                                value={editInstructions}
                                onChange={setEditInstructions}
                            />
                        </div>
                    </Form.Item>

                    {/* Hidden fields */}
                    <Form.Item name="partName" hidden><Input /></Form.Item>
                    <Form.Item name="orderIndex" hidden><InputNumber /></Form.Item>
                </Form>
            </Modal>
        </div >
    );
}
