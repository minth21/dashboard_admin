import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
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
    Select,
    Progress,
    Row,
    Col,
} from 'antd';
import {
    ArrowLeftOutlined,
    PlusOutlined, // Added
    EditOutlined,
    FileTextOutlined,
    ClockCircleOutlined,
    SafetyCertificateOutlined,
    QuestionCircleOutlined,
    PlusCircleOutlined,
    BookOutlined,
    CheckCircleOutlined,
    EyeOutlined,
    LockOutlined,
    UnlockOutlined,
    EyeInvisibleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { testApi, partApi, type Test, type Part } from '../services/api';
import InstructionEditor from '../components/InstructionEditor';

const { Option } = Select;

interface User {
    id: string;
    email: string;
    fullName: string;
    role: 'ADMIN' | 'SPECIALIST' | 'TEACHER' | 'STUDENT';
    avatarUrl?: string;
}

interface PartFormValues {
    partNumber: number;
    partName: string;
    totalQuestions: number;
    timeLimitHours?: number;
    timeLimitMinutes?: number;
    timeLimitSeconds?: number;
    orderIndex?: number;
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
    const { user } = useOutletContext<{ user: User }>();
    const isAdmin = user?.role === 'ADMIN';
    const isSpecialist = user?.role === 'SPECIALIST';
    const isTeacher = user?.role === 'TEACHER';
    const canEditOrCreate = isAdmin || isSpecialist || isTeacher;

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

    // Cascading Approval State - REMOVED handleApproveAll but keeping approving for individual actions
    const [approving, setApproving] = useState(false);

    // Rejection State
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [rejecting, setRejecting] = useState(false);

    // Helper to check if HTML content is really empty
    const isHtmlEmpty = (html: string) => {
        if (!html) return true;
        const stripped = html.replace(/<[^>]*>?/gm, '').trim();
        return stripped === '';
    };


    const fetchTest = useCallback(async () => {
        try {
            const data = await testApi.getDetails(testId!);
            if (data.success) {
                setTest(data.test);
            }
        } catch (err) {
            console.error('Error fetching test details:', err);
        }
    }, [testId]);

    const fetchParts = useCallback(async () => {
        setLoading(true);
        try {
            const data = await testApi.getParts(testId!);
            if (data.success) {
                setParts(data.parts || []);
            }
        } catch (err) {
            console.error('Error fetching parts:', err);
        } finally {
            setLoading(false);
        }
    }, [testId]);

    useEffect(() => {
        if (testId) {
            fetchTest();
            fetchParts();
        }
    }, [testId, fetchTest, fetchParts]);


    const handleCreatePart = async (values: PartFormValues) => {
        // Validate instructions for Reading Parts (5, 6, 7)
        const isReadingPart = [5, 6, 7].includes(values.partNumber);
        if (isReadingPart && isHtmlEmpty(createInstructions)) {
            message.error(`Vui lòng nhập hướng dẫn cho Part ${values.partNumber}`);
            return;
        }

        try {
            // Calculate timeLimit (minutes * 60 + seconds)
            const timeLimit = (values.timeLimitMinutes || 0) * 60 + (values.timeLimitSeconds || 0);

            // Remove temp fields
            const valuesToSubmit = { ...values };
            delete (valuesToSubmit as Record<string, unknown>).timeLimitHours;
            delete (valuesToSubmit as Record<string, unknown>).timeLimitMinutes;
            delete (valuesToSubmit as Record<string, unknown>).timeLimitSeconds;

            const data = await partApi.create(testId!, {
                ...valuesToSubmit,
                timeLimit,
                instructions: createInstructions,
            });

            if (data.success) {
                message.success('Tạo Part thành công!');
                setCreateModalVisible(false);
                createForm.resetFields();
                setCreateInstructions('');
                fetchParts();
            } else {
                message.error(data.message || 'Không thể tạo Part');
            }
        } catch (error: unknown) {
            console.error('Error creating part:', error);
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
            timeLimitMinutes: Math.floor((part.timeLimit || 0) / 60),
            timeLimitSeconds: (part.timeLimit || 0) % 60,
            orderIndex: part.orderIndex,
        });
        setEditModalVisible(true);
    };

    const handleUpdatePart = async (values: PartFormValues) => {
        if (!editingPart) return;

        // Validate instructions for Reading Parts (5, 6, 7)
        const isReadingPart = [5, 6, 7].includes(values.partNumber);
        if (isReadingPart && isHtmlEmpty(editInstructions)) {
            message.error(`Part ${values.partNumber} bắt buộc phải có hướng dẫn`);
            return;
        }

        try {
            let infoAudioUrl = editingPart.audioUrl;


            // Calculate timeLimit (minutes * 60 + seconds)
            const timeLimit = (values.timeLimitMinutes || 0) * 60 + (values.timeLimitSeconds || 0);

            // Remove temp fields
            const valuesToSubmit = { ...values };
            delete (valuesToSubmit as Record<string, unknown>).timeLimitHours;
            delete (valuesToSubmit as Record<string, unknown>).timeLimitMinutes;
            delete (valuesToSubmit as Record<string, unknown>).timeLimitSeconds;

            const data = await partApi.update(editingPart.id, {
                ...valuesToSubmit,
                timeLimit,
                instructions: editInstructions,
                audioUrl: infoAudioUrl,
            });

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
        } catch (error: unknown) {
            console.error('Error updating part:', error);
            message.error('Có lỗi xảy ra khi cập nhật Part');
        }
    };

    const handleTogglePartLock = async (part: Part) => {
        const isCurrentlyActive = part.status === 'ACTIVE';
        const actionText = isCurrentlyActive ? 'khóa' : 'mở khóa';

        Modal.confirm({
            title: `Xác nhận ${actionText} phần thi`,
            content: `Bạn có chắc chắn muốn ${actionText} "${part.partName}"? ${isCurrentlyActive ? 'Sinh viên sẽ không nhìn thấy phần thi này trên App.' : 'Sinh viên sẽ có thể làm bài phần này ngay lập tức.'}`,
            okText: isCurrentlyActive ? 'Khóa ngay' : 'Mở khóa',
            okType: isCurrentlyActive ? 'danger' : 'primary',
            centered: true,
            onOk: async () => {
                try {
                    const data = await partApi.toggleLock(part.id);
                    if (data.success) {
                        message.success(`Đã ${actionText} phần thi thành công!`);
                        fetchParts();
                    } else {
                        message.error(data.message || `Không thể ${actionText} phần thi`);
                    }
                } catch (error: unknown) {
                    console.error(`Error toggling part lock:`, error);
                    message.error(`Có lỗi xảy ra khi ${actionText} phần thi`);
                }
            }
        });
    };


    const handleViewDetails = (part: Part) => {
        navigate(`/exam-bank/${testId}/parts/${part.id}`);
    };



    const handleApproveTest = async () => {
        if (!test) return;

        Modal.confirm({
            title: 'Xác nhận duyệt đề thi',
            content: `Bạn có chắc chắn muốn duyệt và xuất bản đề thi "${test.title}"? Toàn bộ các phần thi và câu hỏi bên trong sẽ được kích hoạt để học viên làm bài.`,
            okText: 'Duyệt toàn bộ',
            okType: 'primary',
            onOk: async () => {
                setApproving(true);
                try {
                    const data = await testApi.approveFull(test.id);
                    if (data.success) {
                        message.success('Đã duyệt và xuất bản toàn bộ đề thi thành công!');
                        fetchTest();
                        fetchParts();
                    } else {
                        message.error(data.message || 'Không thể duyệt đề thi');
                    }
                } catch (error: unknown) {
                    console.error('Error approving test:', error);
                    message.error('Có lỗi xảy ra khi duyệt đề thi');
                } finally {
                    setApproving(false);
                }
            }
        });
    };

    const handleConfirmReject = async () => {
        if (!test || !rejectReason.trim()) {
            message.warning('Vui lòng nhập lý do từ chối');
            return;
        }

        setRejecting(true);
        try {
            const data = await testApi.reject(test.id, rejectReason);
            if (data.success) {
                message.success('Đã từ chối đề thi thành công');
                setIsRejectModalOpen(false);
                fetchTest();
                fetchParts();
            } else {
                message.error(data.message || 'Không thể từ chối đề thi');
            }
        } catch (error: unknown) {
            console.error('Error rejecting test:', error);
            message.error('Có lỗi xảy ra khi từ chối đề thi');
        } finally {
            setRejecting(false);
        }
    };



    const columns: ColumnsType<Part> = [
        {
            title: 'Số hiệu',
            dataIndex: 'partNumber',
            key: 'partNumber',
            width: 120,
            align: 'center' as const,
            render: (num: number) => (
                <div style={{
                    background: '#F1F5F9',
                    color: '#475569',
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '8px',
                    fontWeight: 600,
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
            align: 'center' as const,
            render: (name: string) => (
                <div style={{ fontWeight: 600, color: '#1E3A8A', textAlign: 'center' }}>
                    {name.replace(/^Part \d+: /, '')}
                </div>
            ),
        },
        {
            title: 'Tổng câu',
            dataIndex: 'totalQuestions',
            key: 'totalQuestions',
            width: 100,
            align: 'center' as const,
            render: (total: number) => <span style={{ fontWeight: 600, color: '#64748B' }}>{total} câu</span>,
        },
        {
            title: 'Thời gian',
            dataIndex: 'timeLimit',
            key: 'timeLimit',
            width: 140,
            align: 'center' as const,
            render: (timeLimit: number) => {
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
            title: 'Trạng thái',
            key: 'status',
            width: 140,
            align: 'center' as const,
            render: (_unused: unknown, record: Part) => {
                const status = record.status;
                const config: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
                    ACTIVE: { color: 'green', label: 'Công khai', icon: <UnlockOutlined /> },
                    LOCKED: { color: 'red', label: 'Đang khóa', icon: <LockOutlined /> },
                    PENDING: { color: 'orange', label: 'Chờ duyệt', icon: <ClockCircleOutlined /> },
                    REJECTED: { color: 'magenta', label: 'Sửa lại', icon: <EyeInvisibleOutlined /> },
                };
                const item = config[status] || { color: 'default', label: status, icon: null };
                return (
                    <Tag icon={item.icon} color={item.color} style={{ borderRadius: '12px', fontWeight: 600, padding: '2px 8px' }}>
                        {item.label}
                    </Tag>
                );
            },
        },
        {
            title: 'Hoàn thiện',
            key: 'progress',
            width: 180,
            align: 'center' as const,
            render: (_unused: unknown, record: Part) => {
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
            title: 'Hành động',
            key: 'actions',
            width: 180,
            align: 'center' as const,
            fixed: 'right' as const,
            render: (_unused: unknown, record: Part) => (
                <Space>
                    <Button
                        type="text"
                        style={{ color: '#2563EB', background: '#EFF6FF', borderRadius: '8px' }}
                        icon={<EyeOutlined />}
                        onClick={() => handleViewDetails(record)}
                        title="Xem chi tiết"
                    />
                    {canEditOrCreate && (
                        <Button
                            type="text"
                            style={{ color: '#059669', background: '#ECFDF5', borderRadius: '8px' }}
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(record)}
                            title="Chỉnh sửa"
                        />
                    )}
                    {isAdmin && (record.status === 'ACTIVE' || record.status === 'LOCKED') && (
                        <Button
                            type="text"
                            style={{ 
                                color: record.status === 'ACTIVE' ? '#D97706' : '#2563EB', 
                                background: record.status === 'ACTIVE' ? '#FFFBEB' : '#EFF6FF', 
                                borderRadius: '8px' 
                            }}
                            icon={record.status === 'ACTIVE' ? <LockOutlined /> : <UnlockOutlined />}
                            onClick={() => handleTogglePartLock(record)}
                            title={record.status === 'ACTIVE' ? 'Khóa Part' : 'Mở khóa Part'}
                        />
                    )}
                </Space>
            ),
        },
    ];

    const getDifficultyLabel = (difficulty: 'A1_A2' | 'B1_B2' | 'C1') => {
        const map: Record<string, string> = {
            A1_A2: 'A1-A2',
            B1_B2: 'B1-B2',
            C1: 'C1',
        };
        return map[difficulty] || difficulty;
    };

    const renderInstructionsField = (isCreate: boolean) => {
        const content = isCreate ? createInstructions : editInstructions;
        const setContent = isCreate ? setCreateInstructions : setEditInstructions;

        return (
            <>
                <div style={{ marginBottom: 16 }}>
                    <p style={{ color: '#666', marginBottom: 8, fontSize: '13px' }}>
                        Gợi ý: Viết hướng dẫn cho học viên khi làm bài Part này.
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
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button
                    size="large"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/exam-bank')}
                    style={{ borderRadius: 12, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                    Quay lại danh sách
                </Button>

                <Space>
                    {isAdmin && (test?.status === 'PENDING' || test?.status === 'REJECTED') && (
                        <>
                            <Button
                                size="large"
                                type="primary"
                                icon={<CheckCircleOutlined />}
                                onClick={handleApproveTest}
                                loading={approving}
                                style={{ borderRadius: 12, fontWeight: 600, background: '#10B981', border: 'none' }}
                            >
                                Duyệt toàn bộ
                            </Button>
                            <Button
                                size="large"
                                danger
                                icon={<EyeInvisibleOutlined />}
                                onClick={() => {
                                    setRejectReason('');
                                    setIsRejectModalOpen(true);
                                }}
                                style={{ borderRadius: 12, fontWeight: 600 }}
                            >
                                Từ chối
                            </Button>
                        </>
                    )}
                </Space>
            </div>

            {/* Cascading Approval Banner - REMOVED per CTO Pivot */}

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
                        <div style={{
                            background: test?.status === 'ACTIVE' ? '#ECFDF5' : (test?.status === 'PENDING' ? '#FFFBEB' : '#FEF2F2'),
                            color: test?.status === 'ACTIVE' ? '#059669' : (test?.status === 'PENDING' ? '#D97706' : '#DC2626'),
                            padding: '4px 16px',
                            borderRadius: '30px',
                            fontWeight: 700,
                            fontSize: '13px',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            border: `1px solid currentColor`
                        }}>
                            {test?.status === 'ACTIVE' ? <UnlockOutlined /> : (test?.status === 'PENDING' ? <ClockCircleOutlined /> : (test?.status === 'REJECTED' ? <EyeInvisibleOutlined /> : <LockOutlined />))}
                            {test?.status === 'ACTIVE' ? 'ĐANG MỞ' : (test?.status === 'PENDING' ? 'CHỜ DUYỆT' : (test?.status === 'REJECTED' ? 'BỊ TỪ CHỐI' : 'ĐANG KHÓA'))}
                        </div>
                    </div>

                    {test?.status === 'REJECTED' && test.rejectReason && (
                        <div style={{
                            background: '#FEF2F2',
                            padding: '12px 32px',
                            borderBottom: '1px solid #FEE2E2',
                            color: '#991B1B',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12
                        }}>
                            <EyeInvisibleOutlined style={{ fontSize: 18 }} />
                            <div style={{ flex: 1 }}>
                                <span style={{ fontWeight: 700 }}>Lý do từ chối: </span>
                                {test.rejectReason}
                            </div>
                        </div>
                    )}

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

            {/* Primary Action */}
            {canEditOrCreate && (
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-start' }}>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setCreateModalVisible(true)}
                        size="large"
                        style={{
                            borderRadius: 12,
                            fontWeight: 600,
                            height: 48,
                            padding: '0 24px',
                            background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                            border: 'none',
                            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
                        }}
                    >
                        Tạo Part mới
                    </Button>
                </div>
            )}

            {/* Parts Table */}
            <Card
                title={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
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
                    </div>
                }
                style={{
                    borderRadius: 24,
                    border: 'none',
                    boxShadow: modernShadow,
                    background: '#FFFFFF'
                }}

                bodyStyle={{ padding: 0 }}
            >
                <Table
                    columns={columns}
                    dataSource={parts}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
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
                        <Col span={24}>
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
                    </Row>

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

            {/* Reject Reason Modal */}
            <Modal
                title={
                    <Space>
                        <EyeInvisibleOutlined style={{ color: '#DC2626' }} />
                        <span style={{ fontWeight: 700 }}>Từ chối phê duyệt đề thi</span>
                    </Space>
                }
                open={isRejectModalOpen}
                onCancel={() => setIsRejectModalOpen(false)}
                onOk={handleConfirmReject}
                confirmLoading={rejecting}
                okText="Xác nhận từ chối"
                okButtonProps={{ danger: true, style: { borderRadius: 8 } }}
                cancelButtonProps={{ style: { borderRadius: 8 } }}
                centered
            >
                <div style={{ marginBottom: 16, color: '#64748B' }}>
                    Vui lòng nhập lý do từ chối để Chuyên viên có thể nắm được thông tin và chỉnh sửa.
                </div>
                <Input.TextArea
                    rows={4}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Ví dụ: Audio bị rè, Câu hỏi 102 thiếu đáp án đúng, Nội dung dịch chưa sát nghĩa..."
                    style={{ borderRadius: 8 }}
                />
            </Modal>
        </div>
    );
}
