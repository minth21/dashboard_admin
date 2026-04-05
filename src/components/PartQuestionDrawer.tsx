import React, { useState, useEffect } from 'react';
import {
    Drawer,
    Button,
    Table,
    Space,
    message,
    Modal,
    Form,
    Input,
    InputNumber,
    Select,
    Tag,
    Popconfirm,
    List,
    Card,
    Row,
    Col,
    Typography,
    Empty,
    Image
} from 'antd';
import AudioPlayer from './AudioPlayer';
import {
    LockOutlined,
    UnlockOutlined,
    EditOutlined,
    ExperimentOutlined,
    BookOutlined,
    TranslationOutlined,
    CheckCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import ReactQuill from 'react-quill-new';
import 'quill/dist/quill.snow.css';
import { useOutletContext } from 'react-router-dom';
const { Option } = Select;
const { Text } = Typography;
import { questionApi, partApi } from '../services/api';
import { QUILL_MODULES, QUILL_FORMATS } from '../utils/editorUtils';

const modernShadow = '0 10px 30px -5px rgba(37, 99, 235, 0.08), 0 4px 10px -6px rgba(37, 99, 235, 0.04)';

import CreatePart6Modal from './CreatePart6Modal';
import CreatePart7Modal from './CreatePart7Modal';

interface Question {
    id: string;
    questionNumber: number;
    questionText?: string;
    optionA?: string;
    optionB?: string;
    optionC?: string;
    optionD?: string;
    correctAnswer: string;
    explanation?: string;
    passageTitle?: string;
    passage?: string;
    passageTranslationData?: string;
    passageData?: string;
    passageImageUrl?: string;
    level?: 'A1_A2' | 'B1_B2' | 'C1';
    status?: 'ACTIVE' | 'LOCKED' | 'INACTIVE';
    audioUrl?: string;
    imageUrl?: string;
}

interface PartQuestionDrawerProps {
    open: boolean;
    onClose: () => void;
    partId: string | null;
    partName: string;
    testId: string; // Needed for context if necessary
    initialEditQuestionId?: string; // Auto-open edit modal for this question
}

export default function PartQuestionDrawer({
    open,
    onClose,
    partId,
    partName,
    initialEditQuestionId,
}: PartQuestionDrawerProps) {
    // THÊM LOGIC KIỂM TRA ROLE TỪ CONTEXT
    const { user } = useOutletContext<{ user: any }>();
    const isReviewer = user?.role === 'REVIEWER';

    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(false);
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

    const [createForm] = Form.useForm();
    const [editForm] = Form.useForm();
    const [partNumber, setPartNumber] = useState<number | null>(null);
    const [isProPart, setIsProPart] = useState(false);
    const [createPart6ModalVisible, setCreatePart6ModalVisible] = useState(false);
    const [createPart7ModalVisible, setCreatePart7ModalVisible] = useState(false); // Thêm state cho Part 7 modal
    const [partProEditMode, setPartProEditMode] = useState<'add' | 'edit'>('add');
    const [partProEditData, setPartProEditData] = useState<any>(null);

    useEffect(() => {
        if (open && partId) {
            fetchQuestions();
            checkPartType();
        }
    }, [open, partId]);

    const checkPartType = async () => {
        if (!partId) return;
        try {
            const response = await partApi.getDetails(partId);
            const data = response;
            if (data.success) {
                const partNum = data.part.partNumber;
                setPartNumber(partNum);
                setIsProPart(partNum === 6 || partNum === 7);
            }
        } catch (error) {
            console.error('Error checking part type:', error);
        }
    };

    const fetchQuestions = async () => {
        if (!partId) return;
        try {
            setLoading(true);
            const response = await partApi.getQuestions(partId);
            const data = response;
            if (data.success) {
                setQuestions(data.questions);

                // Auto-open edit modal if initialEditQuestionId is provided
                if (initialEditQuestionId) {
                    const questionToEdit = data.questions.find((q: Question) => q.id === initialEditQuestionId);
                    if (questionToEdit) {
                        setEditingQuestion(questionToEdit);
                        editForm.setFieldsValue({
                            questionNumber: questionToEdit.questionNumber,
                            passage: questionToEdit.passage,
                            questionText: questionToEdit.questionText,
                            optionA: questionToEdit.optionA,
                            optionB: questionToEdit.optionB,
                            optionC: questionToEdit.optionC,
                            optionD: questionToEdit.optionD,
                            correctAnswer: questionToEdit.correctAnswer,
                            explanation: questionToEdit.explanation,
                        });
                        setEditModalVisible(true);
                    }
                }
            }
        } catch (error) {
            message.error('Không thể tải danh sách câu hỏi');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateQuestion = async (values: any) => {
        if (!partId) return;
        try {
            const response = await questionApi.create(partId, values);
            const data = response;
            if (data.success) {
                message.success('Tạo câu hỏi thành công');
                setCreateModalVisible(false);
                createForm.resetFields();
                fetchQuestions();
            } else {
                message.error(data.message || 'Tạo câu hỏi thất bại');
            }
        } catch (error) {
            message.error('Có lỗi xảy ra');
        }
    };

    const handleEditQuestion = async (values: any) => {
        if (!editingQuestion) return;
        try {
            // Logic specifically for Part 6/7: Sync passage across the group
            if (isProPart && values.passage) {
                const qNum = editingQuestion.questionNumber;
                const groupIndex = Math.floor((qNum - 1) / 4);
                const startQ = groupIndex * 4 + 1;
                const endQ = startQ + 3;

                const groupQuestions = questions.filter(
                    q => q.questionNumber >= startQ && q.questionNumber <= endQ
                );

                const updatePromises = groupQuestions.map(q => {
                    const isCurrent = q.id === editingQuestion.id;
                    const payload = isCurrent ? values : { passage: values.passage };
                    return questionApi.update(q.id, payload);
                });

                const results = await Promise.all(updatePromises);
                const failed = results.find(r => !r.success);
                if (failed) {
                    message.error('Có lỗi xảy ra khi đồng bộ đoạn văn');
                    return;
                }

                message.success('Cập nhật câu hỏi và đồng bộ đoạn văn thành công');
                setQuestions(prevQuestions =>
                    prevQuestions.map(q => {
                        const updatedResult = results.find((r: any) => r.question.id === q.id);
                        if (updatedResult) {
                            return updatedResult.question;
                        }
                        return q;
                    })
                );

            } else {
                // Logic for other Parts (Single update)
                const response = await questionApi.update(editingQuestion.id, values);
                const data = response;

                if (data.success) {
                    message.success('Cập nhật câu hỏi thành công');
                    setQuestions(prevQuestions =>
                        prevQuestions.map(q =>
                            q.id === editingQuestion.id ? data.question : q
                        )
                    );
                } else {
                    message.error(data.message || 'Cập nhật câu hỏi thất bại');
                    return;
                }
            }

            setEditModalVisible(false);
            setEditingQuestion(null);
            editForm.resetFields();

        } catch (error) {
            console.error('Update error:', error);
            message.error('Có lỗi xảy ra');
        }
    };

    const handleLockAllQuestions = async () => {
        if (!partId) return;

        try {
            const data = await partApi.toggleAllQuestionsStatus(partId, 'LOCKED');
            if (data.success) {
                message.success(data.message || 'Đã khóa tất cả câu hỏi trong Part này');
                fetchQuestions();
            } else {
                message.error(data.message || 'Không thể khóa câu hỏi');
            }
        } catch (error) {
            message.error('Có lỗi xảy ra khi khóa câu hỏi');
        }
    };

    const passageRowSpans = React.useMemo(() => {
        const spans: Record<number, number> = {};
        if (!questions || questions.length === 0) return spans;

        let currentPassage: string | undefined = undefined;
        let startIndex = 0;

        questions.forEach((q, index) => {
            const passage = q.passage;

            if (passage !== currentPassage) {
                if (currentPassage !== undefined) {
                    spans[startIndex] = index - startIndex;
                    for (let i = startIndex + 1; i < index; i++) {
                        spans[i] = 0;
                    }
                }
                currentPassage = passage;
                startIndex = index;
            }

            if (index === questions.length - 1) {
                spans[startIndex] = index - startIndex + 1;
                for (let i = startIndex + 1; i <= index; i++) {
                    spans[i] = 0;
                }
            }
        });
        return spans;
    }, [questions]);

    const columns: ColumnsType<Question> = [
        ...(isProPart ? [{
            title: 'Đoạn văn',
            dataIndex: 'passage',
            key: 'passage',
            width: 400,
            onCell: (_: Question, index?: number) => ({
                rowSpan: index !== undefined ? passageRowSpans[index] : 1,
            }),
            render: (passage: string) => (
                <div style={{
                    maxHeight: 400,
                    overflowY: 'auto',
                    padding: 8,
                    background: '#f9f9f9',
                    borderRadius: 4,
                    border: '1px solid #f0f0f0'
                }}>
                    <div dangerouslySetInnerHTML={{ __html: passage }} />
                </div>
            )
        }] : []),
        ...(!isProPart && (partNumber === 1 || partNumber === 2 || partNumber === 3 || partNumber === 4) ? [{
            title: partNumber === 1 ? 'Hình ảnh / Audio' : 'Audio',
            key: 'media',
            width: 180,
            render: (_: any, record: Question) => (
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    {partNumber === 1 && (record.imageUrl || record.passageImageUrl) && (
                        <Image
                            src={record.imageUrl || record.passageImageUrl}
                            alt={`Photo ${record.questionNumber}`}
                            style={{ width: '100%', borderRadius: 8, objectFit: 'cover' }}
                            placeholder={<div style={{ width: 150, height: 100, background: '#f5f5f5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Đang tải...</div>}
                        />
                    )}
                    {(record.audioUrl) && (
                        <AudioPlayer src={record.audioUrl} />
                    )}
                </Space>
            )
        }] : []),
        {
            title: 'Câu hỏi',
            dataIndex: 'questionText',
            key: 'questionText',
            render: (text, record) => (
                <div style={{ maxWidth: 400 }}>
                    {!isProPart && record.passage && (
                        <div style={{ fontSize: '11px', color: '#8c8c8c', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            Passage: {record.passage}
                        </div>
                    )}
                    {text && <div style={{ fontWeight: 500, marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: text }} />}
                    <div style={{ fontSize: '12px', color: '#666', marginTop: 2 }}>
                        {record.optionA} / {record.optionB} / {record.optionC} / {record.optionD}
                    </div>
                </div>
            ),
        },
        {
            title: 'Đáp án',
            dataIndex: 'correctAnswer',
            key: 'correctAnswer',
            width: 80,
            align: 'center',
            render: (text) => <Tag color="green">{text}</Tag>,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            align: 'center',
            render: (status: string) => (
                <Tag color={status === 'LOCKED' ? 'red' : 'green'}>{status}</Tag>
            ),
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 150,
            align: 'center',
            render: (_, record) => (
                <Space>
                    <Button
                        type="text"
                        icon={<EditOutlined style={{ color: '#2563EB' }} />}
                        style={{ background: '#EFF6FF', borderRadius: 8 }}
                        onClick={() => {
                            setEditingQuestion(record);
                            editForm.setFieldsValue({
                                questionNumber: record.questionNumber,
                                questionText: record.questionText,
                                optionA: record.optionA,
                                optionB: record.optionB,
                                optionC: record.optionC,
                                optionD: record.optionD,
                                correctAnswer: record.correctAnswer,
                                explanation: record.explanation,
                            });
                            setEditModalVisible(true);
                        }}
                    >
                        Sửa
                    </Button>
                    <Popconfirm
                        title={record.status === 'LOCKED' ? "Mở khóa câu hỏi?" : "Khóa câu hỏi?"}
                        description={record.status === 'LOCKED' ? "Học viên sẽ có thể làm câu hỏi này." : "Học viên sẽ không thấy câu hỏi này."}
                        onConfirm={async () => {
                            try {
                                const newStatus = record.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
                                const data = await questionApi.toggleBulkStatus([record.id], newStatus);
                                if (data.success) {
                                    message.success(data.message);
                                    fetchQuestions();
                                } else {
                                    message.error(data.message || 'Thao tác thất bại');
                                }
                            } catch (error) {
                                message.error('Có lỗi xảy ra');
                            }
                        }}
                        okText="Đồng ý"
                        cancelText="Hủy"
                    >
                        <Button
                            type="text"
                            icon={record.status === 'LOCKED' ? <UnlockOutlined style={{ color: '#059669' }} /> : <LockOutlined style={{ color: '#DC2626' }} />}
                            style={{ background: record.status === 'LOCKED' ? '#ECFDF5' : '#FEF2F2', borderRadius: 8 }}
                        />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const renderProLayout = () => {
        if (!questions || questions.length === 0) return <Table columns={columns} dataSource={[]} />;

        const groups: { passage: string; questions: Question[] }[] = [];
        let currentGroup: { passage: string; questions: Question[] } | null = null;

        questions.forEach((q) => {
            const passage = q.passage;
            if (!currentGroup || currentGroup.passage !== passage) {
                currentGroup = { passage: passage || '', questions: [] };
                groups.push(currentGroup);
            }
            currentGroup.questions.push(q);
        });

        return (
            <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                {groups.map((group, index) => {
                    return (
                        <Card
                            key={index}
                            hoverable
                            style={{
                                marginBottom: 32,
                                borderRadius: 16,
                                overflow: 'hidden',
                                boxShadow: modernShadow,
                                border: 'none'
                            }}
                            bodyStyle={{ padding: '0' }}
                        >
                            <div style={{
                                padding: '20px',
                                background: '#fff',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{
                                            width: 32, height: 32, borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#fff', fontWeight: 800, fontSize: 14,
                                            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)'
                                        }}>
                                            {index + 1}
                                        </div>
                                        <span style={{ fontWeight: 700, fontSize: 16, color: '#1E3A8A' }}>
                                            {group.questions[0]?.questionNumber > 146 ? 'Part 7 Passages' : 'Đoạn văn TOEIC'}
                                        </span>
                                    </div>
                                    <Button
                                        type="primary"
                                        size="middle"
                                        ghost
                                        icon={<ExperimentOutlined />}
                                        style={{ borderRadius: 8, fontWeight: 600 }}
                                        onClick={() => {
                                            setPartProEditData({ questions: group.questions, passage: group.passage });
                                            setPartProEditMode('edit');
                                            const firstQ = questions[0];
                                            if (
                                                firstQ?.passage?.includes('<img') ||
                                                firstQ?.passageTranslationData ||
                                                firstQ?.passageData
                                            ) {
                                                const partNum = firstQ?.questionNumber > 146 ? 7 : 6;
                                                if (partNum === 7) setCreatePart7ModalVisible(true);
                                                else setCreatePart6ModalVisible(true);
                                            } else {
                                                setCreatePart6ModalVisible(true);
                                            }
                                        }}
                                    >
                                        Chỉnh sửa Pro
                                    </Button>
                                </div>

                                {/* 2. Chia 2 cột: Gốc và Dịch */}
                                <Row gutter={24}>
                                    {/* Cột Trái: Nội dung gốc */}
                                    <Col span={12}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                            <BookOutlined style={{ color: '#2563EB', fontSize: 18 }} />
                                            <span style={{ fontWeight: 600, color: '#475569' }}>Nội dung gốc</span>
                                        </div>
                                        <div style={{
                                            maxHeight: 450,
                                            overflowY: 'auto',
                                            background: '#F8FAFC',
                                            padding: 16,
                                            borderRadius: 12,
                                            border: '1px solid #E2E8F0',
                                            lineHeight: '1.6',
                                            color: '#1E293B'
                                        }}>
                                            {/* Fix lỗi ảnh gãy: Nếu trong bảng có passageData hoặc passageImageUrl, ưu tiên render ảnh thật */}
                                            {(() => {
                                                const firstQ = group.questions[0];
                                                let pDataImgs: string[] = [];
                                                try {
                                                    const parsedData = firstQ?.passageData ? JSON.parse(firstQ.passageData) : [];
                                                    const arr = Array.isArray(parsedData) ? parsedData : [];
                                                    pDataImgs = arr.map((item: any) => item.imageUrl).filter(Boolean);
                                                } catch (e) { }

                                                const pUrls = firstQ?.passageImageUrl ? firstQ.passageImageUrl.split(',').filter(Boolean) : [];
                                                const allRealImages = Array.from(new Set([...pDataImgs, ...pUrls]));

                                                // Xử lý HTML: Xóa bỏ các thẻ <img src=""> bị rỗng
                                                let cleanPassage = group.passage || '';
                                                cleanPassage = cleanPassage.replace(/<img[^>]*src=["'](?:undefined|null|)["'][^>]*>/gi, '');

                                                return (
                                                    <>
                                                        {firstQ?.passageTitle && (
                                                            <div style={{ fontWeight: 800, fontSize: 16, color: '#1E293B', marginBottom: 12 }}>
                                                                {firstQ.passageTitle}
                                                            </div>
                                                        )}
                                                        <div dangerouslySetInnerHTML={{ __html: cleanPassage }} className="pro-passage-content" />
                                                        {allRealImages.length > 0 && (
                                                            <div style={{ marginTop: 16 }}>
                                                                {allRealImages.map((img: string, idx: number) => (
                                                                    <img key={idx} src={img} alt={`Passage ${idx + 1}`} style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 12, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </Col>

                                    {/* Cột Phải: Bản dịch AI */}
                                    <Col span={12}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                            <TranslationOutlined style={{ color: '#7C3AED', fontSize: 18 }} />
                                            <span style={{ fontWeight: 600, color: '#475569' }}>Bản dịch song ngữ</span>
                                        </div>
                                        <div style={{
                                            maxHeight: 450,
                                            overflowY: 'auto',
                                            background: 'linear-gradient(135deg, #F5F3FF 0%, #FFFFFF 100%)',
                                            padding: 16,
                                            borderRadius: 12,
                                            border: '1px solid #DDD6FE',
                                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                                        }}>
                                            {(() => {
                                                // Parser cực kỳ an toàn cho cả 2 loại payload: passageData (mới) và passageTranslationData (cũ)
                                                let aiTranslations: any[] = [];
                                                const firstQ = group.questions[0];

                                                if (firstQ?.passageData && firstQ.passageData !== 'null') {
                                                    try {
                                                        const raw = JSON.parse(firstQ.passageData);
                                                        aiTranslations = Array.isArray(raw) ? raw : (raw.passages || raw.passageTranslations || []);
                                                    } catch (e) { }
                                                }

                                                if (aiTranslations.length === 0 && firstQ?.passageTranslationData && firstQ.passageTranslationData !== 'null') {
                                                    try {
                                                        const raw = JSON.parse(firstQ.passageTranslationData);
                                                        aiTranslations = Array.isArray(raw) ? raw : (raw.passages || raw.passageTranslations || []);
                                                    } catch (e) { }
                                                }

                                                if (aiTranslations.length > 0) {
                                                    return aiTranslations.map((p: any, pIdx: number) => {
                                                        // Đảm bảo lấy mảng con bên trong, hỗ trợ cả 3 trường key `translation`, `items`, `sentences`
                                                        const sentences = p.translation || p.items || p.sentences || [];
                                                        if (sentences.length === 0) return null;

                                                        return (
                                                            <div key={pIdx} style={{ marginBottom: 20 }}>
                                                                <div style={{
                                                                    display: 'flex', alignItems: 'center', gap: 8,
                                                                    marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid #EDE9FE'
                                                                }}>
                                                                    <div style={{ width: 4, height: 16, background: '#8B5CF6', borderRadius: 2 }} />
                                                                    <Text strong style={{ color: '#5B21B6', fontSize: 14 }}>
                                                                        {p.label || `Đoạn ${pIdx + 1}`}
                                                                    </Text>
                                                                </div>
                                                                {sentences.map((s: any, sIdx: number) => (
                                                                    <div key={sIdx} style={{
                                                                        marginBottom: 12, padding: '8px 12px', background: 'rgba(255,255,255,0.5)',
                                                                        borderRadius: 8, border: '1px solid rgba(139, 92, 246, 0.1)'
                                                                    }}>
                                                                        <div style={{ color: '#1E293B', fontSize: 13, fontWeight: 500 }}>{s.en}</div>
                                                                        <div style={{ color: '#6D28D9', fontSize: 13, fontStyle: 'italic', marginTop: 4, opacity: 0.9 }}>
                                                                            → {s.vi}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        );
                                                    });
                                                }

                                                return (
                                                    <Empty
                                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                        description={<span style={{ fontSize: 12, color: '#94A3B8' }}>Chưa có bản dịch AI</span>}
                                                        style={{ margin: '60px 0' }}
                                                    />
                                                );
                                            })()}
                                        </div>
                                    </Col>
                                </Row>
                            </div>

                            <div style={{ padding: '24px', background: '#fff' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                    <CheckCircleOutlined style={{ color: '#10B981', fontSize: 20 }} />
                                    <span style={{ fontWeight: 700, fontSize: 15, color: '#334155' }}>Danh sách câu hỏi</span>
                                </div>
                                <List
                                    grid={{ gutter: 20, column: 1 }}
                                    dataSource={group.questions}
                                    renderItem={(item) => (
                                        <List.Item style={{ marginBottom: 16 }}>
                                            <div style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '16px', borderRadius: 12, background: '#F1F5F9',
                                                border: '1px solid #E2E8F0',
                                                transition: 'all 0.3s'
                                            }} className="hover-item-shadow">
                                                <div style={{ flex: 1 }}>
                                                    <Space size="middle" align="start">
                                                        <div style={{
                                                            width: 28, height: 28, borderRadius: 6,
                                                            background: '#fff', border: '1px solid #CBD5E1',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontWeight: 700, color: '#475569', fontSize: 12
                                                        }}>
                                                            {item.questionNumber}
                                                        </div>
                                                        <Space size="large" wrap style={{ color: '#334155', fontWeight: 500 }}>
                                                            <span><Tag color="blue" style={{ borderRadius: 4 }}>A</Tag> {item.optionA}</span>
                                                            <span><Tag color="blue" style={{ borderRadius: 4 }}>B</Tag> {item.optionB}</span>
                                                            <span><Tag color="blue" style={{ borderRadius: 4 }}>C</Tag> {item.optionC}</span>
                                                            <span><Tag color="blue" style={{ borderRadius: 4 }}>D</Tag> {item.optionD}</span>
                                                        </Space>
                                                    </Space>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <Tag color={item.status === 'LOCKED' ? 'red' : 'green'} style={{
                                                        fontWeight: 800, padding: '4px 12px', borderRadius: 6,
                                                        border: item.status === 'LOCKED' ? '1px solid #F87171' : '1px solid #10B981',
                                                        background: item.status === 'LOCKED' ? '#FEF2F2' : '#ECFDF5'
                                                    }}>
                                                        {item.status === 'LOCKED' ? 'ĐÃ KHÓA' : `Đáp án: ${item.correctAnswer}`}
                                                    </Tag>
                                                    <Button
                                                        type="text"
                                                        icon={<EditOutlined style={{ color: '#2563EB' }} />}
                                                        style={{ background: '#EFF6FF', borderRadius: 8 }}
                                                        onClick={() => {
                                                            setEditingQuestion(item);
                                                            editForm.setFieldsValue({
                                                                questionNumber: item.questionNumber,
                                                                passage: item.passage,
                                                                questionText: item.questionText,
                                                                optionA: item.optionA,
                                                                optionB: item.optionB,
                                                                optionC: item.optionC,
                                                                optionD: item.optionD,
                                                                correctAnswer: item.correctAnswer,
                                                                explanation: item.explanation,
                                                            });
                                                            setEditModalVisible(true);
                                                        }}
                                                    />
                                                    <Popconfirm
                                                        title={item.status === 'LOCKED' ? "Mở khóa câu hỏi?" : "Khóa câu hỏi?"}
                                                        onConfirm={async () => {
                                                            try {
                                                                const newStatus = item.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
                                                                const data = await questionApi.toggleBulkStatus([item.id], newStatus);
                                                                if (data.success) {
                                                                    message.success(data.message);
                                                                    fetchQuestions();
                                                                }
                                                            } catch (error) {
                                                                message.error('Thao tác thất bại');
                                                            }
                                                        }}
                                                    >
                                                        <Button
                                                            type="text"
                                                            icon={item.status === 'LOCKED' ? <UnlockOutlined style={{ color: '#059669' }} /> : <LockOutlined style={{ color: '#DC2626' }} />}
                                                            style={{ background: item.status === 'LOCKED' ? '#ECFDF5' : '#FEF2F2', borderRadius: 8 }}
                                                        />
                                                    </Popconfirm>
                                                </div>
                                            </div>
                                        </List.Item>
                                    )}
                                />
                            </div>
                        </Card>
                    );
                })}
            </div>
        );
    };

    return (
        <Drawer
            title={`Quản lý câu hỏi - ${partName}`}
            width={720}
            onClose={onClose}
            open={open}
            extra={
                // ẨN NÚT XÓA NẾU LÀ REVIEWER
                !isReviewer && (
                    <Space>
                        {selectedQuestionIds.length > 0 ? (
                            <Popconfirm
                                title="Khóa các câu hỏi đã chọn"
                                description={`Bạn có chắc chắn muốn khóa ${selectedQuestionIds.length} câu hỏi đã chọn? Học viên sẽ không thấy những câu này.`}
                                onConfirm={async () => {
                                    try {
                                        const data = await questionApi.toggleBulkStatus(selectedQuestionIds, 'LOCKED');
                                        if (data.success) {
                                            message.success(data.message);
                                            setSelectedQuestionIds([]);
                                            fetchQuestions();
                                        } else {
                                            message.error(data.message || 'Không thể khóa câu hỏi');
                                        }
                                    } catch (error) {
                                        message.error('Có lỗi xảy ra khi khóa câu hỏi');
                                    }
                                }}
                                okText="Khóa"
                                cancelText="Hủy"
                                okButtonProps={{ danger: true }}
                            >
                                <Button
                                    danger
                                    icon={<LockOutlined />}
                                >
                                    Khóa đã chọn ({selectedQuestionIds.length})
                                </Button>
                            </Popconfirm>
                        ) : (
                            questions.length > 0 && (
                                <Popconfirm
                                    title="Khóa tất cả câu hỏi"
                                    description={`Bạn có chắc chắn muốn khóa tất cả ${questions.length} câu hỏi? Học viên sẽ không thấy toàn bộ Part này.`}
                                    onConfirm={handleLockAllQuestions}
                                    okText="Khóa tất cả"
                                    cancelText="Hủy"
                                    okButtonProps={{ danger: true }}
                                >
                                    <Button
                                        danger
                                        icon={<LockOutlined />}
                                    >
                                        Khóa toàn bộ Part
                                    </Button>
                                </Popconfirm>
                            )
                        )}
                    </Space>
                )
            }
        >
            {isProPart ? renderProLayout() : (
                <Table
                    columns={columns}
                    dataSource={questions}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 20 }}
                    rowSelection={{
                        selectedRowKeys: selectedQuestionIds,
                        onChange: (selectedKeys) => setSelectedQuestionIds(selectedKeys as string[]),
                    }}
                />
            )}

            {/* Modal Part 6 */}
            <CreatePart6Modal
                open={createPart6ModalVisible}
                onCancel={() => {
                    setCreatePart6ModalVisible(false);
                    setPartProEditMode('add');
                    setPartProEditData(null);
                }}
                onSuccess={fetchQuestions}
                partId={partId}
                mode={partProEditMode}
                initialData={partProEditData}
            />

            {/* Modal Part 7 */}
            <CreatePart7Modal
                open={createPart7ModalVisible}
                onCancel={() => {
                    setCreatePart7ModalVisible(false);
                    setPartProEditMode('add');
                    setPartProEditData(null);
                }}
                onSuccess={fetchQuestions}
                partId={partId}
                mode={partProEditMode}
                initialData={partProEditData}
            />

            {/* Create Manual Modal (Normal) */}
            <Modal
                title="Thêm câu hỏi mới"
                open={createModalVisible}
                onCancel={() => setCreateModalVisible(false)}
                onOk={() => createForm.submit()}
                width={600}
            >
                <Form
                    form={createForm}
                    layout="vertical"
                    onFinish={handleCreateQuestion}
                >
                    <div style={{ display: 'flex', gap: 16 }}>
                        <Form.Item
                            label="Số thứ tự"
                            name="questionNumber"
                            rules={[{ required: true }]}
                            style={{ width: 100 }}
                        >
                            <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item
                            label="Đáp án"
                            name="correctAnswer"
                            rules={[{ required: true }]}
                            style={{ flex: 1 }}
                        >
                            <Select>
                                <Option value="A">A</Option>
                                <Option value="B">B</Option>
                                <Option value="C">C</Option>
                                <Option value="D">D</Option>
                            </Select>
                        </Form.Item>
                    </div>

                    {isProPart && (
                        <Form.Item label="Đoạn văn" name="passage">
                            <ReactQuill
                                theme="snow"
                                modules={QUILL_MODULES}
                                formats={QUILL_FORMATS}
                                placeholder="Nhập đoạn văn..."
                            />
                        </Form.Item>
                    )}

                    {!isProPart && (
                        <Form.Item
                            label="Nội dung câu hỏi"
                            name="questionText"
                            rules={[{ required: true }]}
                        >
                            <ReactQuill
                                theme="snow"
                                modules={QUILL_MODULES}
                                formats={QUILL_FORMATS}
                                placeholder="Nhập nội dung câu hỏi..."
                            />
                        </Form.Item>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item label="Option A" name="optionA" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item label="Option B" name="optionB" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item label="Option C" name="optionC" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item label="Option D" name="optionD" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                    </div>


                </Form>
            </Modal>

            {/* Edit Modal */}
            <Modal
                title="Chỉnh sửa câu hỏi"
                open={editModalVisible}
                onCancel={() => {
                    setEditModalVisible(false);
                    setEditingQuestion(null);
                    editForm.resetFields();
                }}
                onOk={() => editForm.submit()}
                width={600}
            >
                <Form
                    form={editForm}
                    layout="vertical"
                    onFinish={handleEditQuestion}
                >
                    <div style={{ display: 'flex', gap: 16 }}>
                        <Form.Item
                            label="Số thứ tự"
                            name="questionNumber"
                            rules={[{ required: true }]}
                            style={{ width: 100 }}
                        >
                            <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item
                            label="Đáp án"
                            name="correctAnswer"
                            rules={[{ required: true }]}
                            style={{ flex: 1 }}
                        >
                            <Select>
                                <Option value="A">A</Option>
                                <Option value="B">B</Option>
                                <Option value="C">C</Option>
                                <Option value="D">D</Option>
                            </Select>
                        </Form.Item>
                    </div>

                    {editingQuestion?.passage && (
                        <Form.Item label="Đoạn văn" name="passage">
                            <ReactQuill
                                theme="snow"
                                modules={QUILL_MODULES}
                                formats={QUILL_FORMATS}
                                placeholder="Nhập đoạn văn..."
                            />
                        </Form.Item>
                    )}

                    {!editingQuestion?.passage && (
                        <Form.Item
                            label="Nội dung câu hỏi"
                            name="questionText"
                            rules={[{ required: true }]}
                        >
                            <ReactQuill
                                theme="snow"
                                modules={QUILL_MODULES}
                                formats={QUILL_FORMATS}
                                placeholder="Nhập nội dung câu hỏi..."
                            />
                        </Form.Item>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item label="Option A" name="optionA" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item label="Option B" name="optionB" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item label="Option C" name="optionC" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item label="Option D" name="optionD" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                    </div>


                </Form>
            </Modal>
        </Drawer>
    );
}
