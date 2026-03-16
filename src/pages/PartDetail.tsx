import { useState, useEffect, useMemo } from 'react';
import {
    Table,
    Button,
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
    Typography,
    Drawer,
    Upload,
    Checkbox,
    Image as AntImage,
    Row,
    Col,
    Empty
} from 'antd';


import {
    DeleteOutlined,
    EditOutlined,
    ArrowLeftOutlined,
    PlusOutlined,
    UploadOutlined,
    DownloadOutlined,
    BookOutlined,
    TranslationOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    PlusCircleOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import ReactQuill from 'react-quill-new';
import 'quill/dist/quill.snow.css';
// @ts-ignore
import * as XLSX from 'xlsx';

import CreatePart6Modal from '../components/CreatePart6Modal';
import CreatePart7Modal from '../components/CreatePart7Modal';
import CreatePart1Modal from '../components/CreatePart1Modal';
import EditPart1Modal from '../components/EditPart1Modal';
import CreatePart2BulkModal from '../components/CreatePart2BulkModal'; // Changed from CreatePart2Modal
import CreatePart3Modal from '../components/CreatePart3Modal';
import CreatePart5BulkModal from '../components/CreatePart5BulkModal';
import AudioPlayer from '../components/AudioPlayer';
import { uploadApi, partApi, questionApi } from '../services/api';

// --- Interfaces ---
interface Question {
    id: string;
    questionNumber: number;
    questionText?: string;
    imageUrl?: string; // Add imageUrl
    audioUrl?: string; // Add audioUrl
    optionA?: string;
    optionB?: string;
    optionC?: string;
    optionD?: string;
    correctAnswer: string;
    explanation?: string;
    passage?: string;
    passageTranslationData?: string;
}

interface Part {
    id: string;
    partNumber: number;
    partName: string;
    instructions?: string;
    totalQuestions: number;
    testId: string;
    audioUrl?: string;
}

const { Option } = Select;
const { Text } = Typography;

const modernShadow = '0 10px 30px -5px rgba(37, 99, 235, 0.08), 0 4px 10px -6px rgba(37, 99, 235, 0.04)';

export default function PartDetail() {
    const { testId, partId } = useParams<{ testId: string; partId: string }>();
    const navigate = useNavigate();

    const [part, setPart] = useState<Part | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(false);

    // --- Modal States ---
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [createPart6ModalVisible, setCreatePart6ModalVisible] = useState(false);
    const [createPart7ModalVisible, setCreatePart7ModalVisible] = useState(false);
    const [createPart1ModalVisible, setCreatePart1ModalVisible] = useState(false);
    const [editPart1ModalVisible, setEditPart1ModalVisible] = useState(false);
    const [createPart2ModalVisible, setCreatePart2ModalVisible] = useState(false); // Now for bulk modal
    const [createPart3ModalVisible, setCreatePart3ModalVisible] = useState(false);
    const [createPart5BulkModalVisible, setCreatePart5BulkModalVisible] = useState(false);
    const [part5ImportData, setPart5ImportData] = useState<any[]>([]);
    const [part5ImportMode, setPart5ImportMode] = useState<'new' | 'append' | 'replace'>('new'); // Track import mode

    // Passage Edit State
    const [editingGroup, setEditingGroup] = useState<any>(null);

    // --- Selected Item States ---
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

    // --- Forms ---
    const [createForm] = Form.useForm();
    const [editForm] = Form.useForm();

    // --- Import States ---
    const [importDrawerVisible, setImportDrawerVisible] = useState(false);

    // --- Quill Configuration ---
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

    const isPart6 = part?.partNumber === 6;
    const isListeningGroup = part?.partNumber === 3 || part?.partNumber === 4;

    const handleCreateSuccess = () => fetchQuestions();

    // --- Effects ---
    useEffect(() => {
        if (partId) {
            fetchPartDetails();
            fetchQuestions();
        }
    }, [partId]);

    // --- API Fetching ---
    const fetchPartDetails = async () => {
        try {
            const data = await partApi.getDetails(partId!);
            if (data.success) {
                setPart(data.part);
            }
        } catch (error) {
            console.error('Error fetching part:', error);
            message.error('Không thể tải thông tin phần thi');
        }
    };

    const fetchQuestions = async () => {
        try {
            setLoading(true);
            const data = await partApi.getQuestions(partId!);
            if (data.success) {
                setQuestions(data.questions);
            }
        } catch (error) {
            message.error('Không thể tải danh sách câu hỏi');
        } finally {
            setLoading(false);
        }
    };


    // --- Handlers: Create ---
    const handleCreateQuestion = async (values: any) => {
        if (!partId) return;

        // Check for duplicate question number
        const isDuplicate = questions.some(q => q.questionNumber === values.questionNumber);
        if (isDuplicate) {
            message.error(`Câu số ${values.questionNumber} đã tồn tại! Vui lòng chọn số câu khác.`);
            return;
        }

        try {
            const data = await questionApi.create(partId, values);
            if (data.success) {
                message.success('Tạo câu hỏi thành công');
                setCreateModalVisible(false);
                createForm.resetFields();
                fetchQuestions();
            } else {
                message.error(data.message || 'Tạo câu hỏi thất bại');
            }
        } catch (error) {
            console.error('Create error:', error);
            message.error('Lỗi khi tạo câu hỏi');
        }
    };

    // --- Handlers: Edit ---
    const handleEditQuestion = async (values: any) => {
        if (!editingQuestion) return;
        try {
            // Normal Update (passage is handled separately now)
            const data = await questionApi.update(editingQuestion.id, values);
            if (data.success) {
                message.success('Cập nhật câu hỏi thành công');
                setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? data.question : q));
                setEditModalVisible(false);
                fetchQuestions();
            } else {
                message.error(data.message || 'Cập nhật thất bại');
            }
        } catch (error) {
            console.error('Update error:', error);
            message.error('Lỗi khi cập nhật câu hỏi');
        }
    };


    // --- Handlers: Delete ---

    const handleDeleteSelected = async () => {
        try {
            await questionApi.deleteBulk(selectedQuestionIds);
            message.success(`Đã xóa ${selectedQuestionIds.length} câu hỏi`);
            setSelectedQuestionIds([]);
            fetchQuestions();
        } catch (error) {
            console.error('Delete error:', error);
            message.error('Lỗi khi xóa câu hỏi');
        }
    };

    const handleDeleteAll = async () => {
        if (!partId) return;
        try {
            await partApi.deleteAllQuestions(partId);
            message.success('Đã xóa tất cả câu hỏi');
            fetchQuestions();
        } catch (error) {
            console.error('Delete all error:', error);
            message.error('Lỗi khi xóa tất cả câu hỏi');
        }
    };

    // --- Handlers: Audio Upload (Part 1-4) ---
    const handlePartAudioUpload = async (file: File) => {
        if (!partId) return false;
        try {
            message.loading({ content: 'Đang upload audio...', key: 'uploadAudio' });
            const formData = new FormData();
            formData.append('audio', file);

            // 1. Upload to Cloudinary
            const uploadRes = await uploadApi.audio(file);

            if (uploadRes.success) {
                const audioUrl = uploadRes.url;

                // 2. Update Part with new Audio URL
                await partApi.update(partId, { audioUrl });

                message.success({ content: 'Upload audio thành công!', key: 'uploadAudio' });
                // Update local part state
                setPart(prev => prev ? { ...prev, audioUrl } : null);
            } else {
                throw new Error(uploadRes.message);
            }
        } catch (error: any) {
            console.error('Upload audio error:', error);
            message.error({ content: error.message || 'Lỗi khi upload audio', key: 'uploadAudio' });
        }
        return false;
    };

    // --- Handlers: Import ---
    const handleDownloadTemplate = () => {
        if (!part) return;
        const partNum = part.partNumber;
        const rows = [];
        const questionCount = partNum === 5 ? 30 : partNum === 6 ? 16 : 10;

        const startNum = partNum === 5 ? 101 : 1;
        const endNum = partNum === 5 ? 130 : (startNum + questionCount - 1);

        for (let i = startNum; i <= endNum; i++) {
            const row: any = {
                'Số câu': i,
                'Nội dung câu hỏi': '',
                'A': '',
                'B': '',
                'C': '',
                'D': '',
                'Đáp án đúng': ''
            };

            // Only add Passage column for Parts 6 & 7
            if (partNum === 6 || partNum === 7) {
                row['Nội dung (Part 6/7)'] = '';
            }

            rows.push(row);
        }

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `Part ${partNum}`);
        XLSX.writeFile(workbook, `Part_${partNum}.xlsx`);
    };

    const handleExcelUpload = async (file: File) => {
        if (!partId) return false;

        const formData = new FormData();
        formData.append('file', file);
        // Removed importMode - no longer used for Part 5

        // --- PART 5 SPECIAL HANDLING: Client-side parsing for Preview ---
        if (part?.partNumber === 5) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                // Check existing question count
                try {
                    const data = await partApi.getQuestions(partId!);
                    const existingCount = data.questions?.length || 0;
                    const importCount = jsonData.length;
                    const totalAfterImport = existingCount + importCount;

                    // Determine import mode and show appropriate alert
                    if (existingCount === 0) {
                        // No existing questions - proceed directly
                        setPart5ImportMode('new');
                        setPart5ImportData(jsonData);
                        setCreatePart5BulkModalVisible(true);
                        setImportDrawerVisible(false);
                    } else if (existingCount === 30) {
                        // Already have 30 questions - ask to overwrite
                        Modal.confirm({
                            title: 'Ghi đè câu hỏi?',
                            content: `Part 5 đã có đủ 30 câu hỏi. Bạn có muốn ghi đè toàn bộ ${existingCount} câu cũ bằng ${importCount} câu mới không?`,
                            okText: 'Ghi đè',
                            cancelText: 'Hủy',
                            okButtonProps: { danger: true },
                            onOk: () => {
                                setPart5ImportMode('replace');
                                setPart5ImportData(jsonData);
                                setCreatePart5BulkModalVisible(true);
                                setImportDrawerVisible(false);
                            }
                        });
                    } else if (totalAfterImport > 30) {
                        // Would exceed 30 questions
                        Modal.error({
                            title: 'Không thể import',
                            content: `Không thể import. Tổng số câu sẽ vượt quá 30 (${existingCount} + ${importCount} = ${totalAfterImport}). Part 5 chỉ được phép có tối đa 30 câu.`,
                        });
                    } else {
                        // Can append - ask for confirmation
                        Modal.confirm({
                            title: 'Thêm câu hỏi mới?',
                            content: `Part 5 hiện có ${existingCount} câu. Bạn có muốn thêm ${importCount} câu mới không? (Tổng: ${totalAfterImport} câu)`,
                            okText: 'Thêm',
                            cancelText: 'Hủy',
                            onOk: () => {
                                setPart5ImportMode('append');
                                setPart5ImportData(jsonData);
                                setCreatePart5BulkModalVisible(true);
                                setImportDrawerVisible(false);
                            }
                        });
                    }
                } catch (error) {
                    console.error('Error checking existing questions:', error);
                    message.error('Lỗi khi kiểm tra câu hỏi hiện có');
                }
            };
            reader.readAsArrayBuffer(file);
            return false; // Stop upload
        }


        try {
            message.loading({ content: 'Đang import...', key: 'importExcel' });

            // Explicitly use api service (axios) for consistency and auth handling
            const response = await partApi.importQuestions(partId, formData);

            if (response.success) {
                // User requested to see the count
                const count = response.data.count || 0;
                message.success({
                    content: `Import thành công! Đã thêm ${count} câu hỏi.`,
                    key: 'importExcel',
                    duration: 4
                });
                setImportDrawerVisible(false);
                fetchQuestions();
            } else {
                message.error({ content: response.message || 'Import thất bại', key: 'importExcel' });
            }
        } catch (error: any) {
            console.error('Import error:', error);
            message.error({ content: error.message || 'Lỗi kết nối khi import', key: 'importExcel' });
        }
        return false; // Prevent default auto-upload
    };

    // Removed unused submitImport function since we now upload directly in handleExcelUpload



    // --- Memoized Groups for Part 6/7 ---
    const groups = useMemo(() => {
        if (!questions || questions.length === 0) return [];

        // Sort questions by number
        const sortedQuestions = [...questions].sort((a, b) => a.questionNumber - b.questionNumber);

        // Group by passage (normalized) OR audioUrl (for listening)
        const newGroups: { passage: string; audioUrl?: string; questions: Question[] }[] = [];
        let currentGroup: { passage: string; audioUrl?: string; questions: Question[] } | null = null;

        // Normalization: Remove HTML tags and extra whitespace to compare text content only
        const normalizePassageContent = (p?: string, a?: string) => {
            if (a) return a; // If audio exists, group by audio URL
            if (!p) return '';
            // If passage contains images (Part 7), do not strip tags as the URL differentiates groups
            if (p.includes('<img')) {
                return p.trim();
            }
            const textOnly = p.replace(/<[^>]*>?/gm, ' '); // Replace HTML tags with space
            return textOnly.replace(/\s+/g, ' ').trim();
        };

        sortedQuestions.forEach((q) => {
            const passage = q.passage || '';
            const audioUrl = q.audioUrl;

            const normalizedContent = normalizePassageContent(passage, audioUrl);
            const lastGroupContent = currentGroup ? normalizePassageContent(currentGroup.passage, currentGroup.audioUrl) : '';

            // Group if content matches
            if (!currentGroup || normalizedContent !== lastGroupContent) {
                currentGroup = { passage: passage, audioUrl: audioUrl, questions: [] };
                newGroups.push(currentGroup);
            }
            currentGroup.questions.push(q);
        });
        return newGroups;
    }, [questions]);

    // Calculate selected passage count for Part 6/7
    const selectedPassageCount = useMemo(() => {
        if (!isPart6 && part?.partNumber !== 7) return 0;
        return groups.filter(g => g.questions.length > 0 && g.questions.every(q => selectedQuestionIds.includes(q.id))).length;
    }, [groups, selectedQuestionIds, isPart6, part]);

    // --- Render Logic: Layouts ---
    const renderGroupedLayout = () => {
        if (!groups || groups.length === 0) return <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>Chưa có câu hỏi nào</div>;

        return (
            <div style={{ marginTop: 16 }}>
                {groups.map((group, index) => {
                    let aiTranslations: any[] = [];
                    let vocabulary: any[] = [];
                    let aiQuestionsInfo: any[] = [];
                    
                    const firstQ = group.questions[0];
                    if (firstQ?.passageTranslationData) {
                        try {
                            const raw = JSON.parse(firstQ.passageTranslationData);
                            if (Array.isArray(raw)) {
                                aiTranslations = raw;
                            } else {
                                aiTranslations = raw.passages || raw.passageTranslations || [];
                                vocabulary = raw.vocabulary || [];
                                aiQuestionsInfo = raw.questions || [];
                            }
                        } catch (e) {
                            console.error('Lỗi parse AI translations:', e);
                        }
                    }

                    return (
                        <Card
                            key={index}
                            style={{
                                marginBottom: 32,
                                borderRadius: 24,
                                overflow: 'hidden',
                                boxShadow: modernShadow,
                                border: 'none',
                                background: '#FFFFFF'
                            }}
                            bodyStyle={{ padding: 0 }}
                        >
                            <div style={{
                                padding: '20px',
                                background: '#fff',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <Checkbox
                                            checked={group.questions.every(q => selectedQuestionIds.includes(q.id))}
                                            indeterminate={
                                                group.questions.some(q => selectedQuestionIds.includes(q.id)) &&
                                                !group.questions.every(q => selectedQuestionIds.includes(q.id))
                                            }
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                const groupIds = group.questions.map(q => q.id);
                                                setSelectedQuestionIds(prev => {
                                                    if (checked) {
                                                        const uniqueIdsToAdd = groupIds.filter(id => !prev.includes(id));
                                                        return [...prev, ...uniqueIdsToAdd];
                                                    } else {
                                                        return prev.filter(id => !groupIds.includes(id));
                                                    }
                                                });
                                            }}
                                        />
                                        <div style={{
                                            padding: '4px 12px', background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
                                            borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13,
                                            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)'
                                        }}>
                                            {isListeningGroup ? `Bài nghe ${index + 1}` : `Nội dung  ${index + 1}`}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        {isListeningGroup && group.audioUrl && (
                                            <div style={{ width: 250 }}>
                                                <AudioPlayer src={group.audioUrl} />
                                            </div>
                                        )}
                                        {!isListeningGroup && (
                                            <Button
                                                size="middle"
                                                type="primary"
                                                ghost
                                                icon={<EditOutlined />}
                                                style={{ borderRadius: 8, fontWeight: 600 }}
                                                onClick={() => {
                                                    setEditingGroup({
                                                        passage: group.passage,
                                                        questions: group.questions
                                                    });
                                                    if (isPart6) {
                                                        setCreatePart6ModalVisible(true);
                                                    } else {
                                                        setCreatePart7ModalVisible(true);
                                                    }
                                                }}>
                                                Sửa nâng cao
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Layout 2 cột Premium */}
                                {!isListeningGroup ? (
                                    <Row gutter={24}>
                                        <Col span={12}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                                <BookOutlined style={{ color: '#2563EB', fontSize: 18 }} />
                                                <span style={{ fontWeight: 600, color: '#475569' }}>Nội dung gốc</span>
                                            </div>
                                            <div
                                                className="passage-content"
                                                dangerouslySetInnerHTML={{
                                                    __html: (group.passage || '<p><i>(Không có nội dung đoạn văn)</i></p>')
                                                        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                                                }}
                                                style={{
                                                    maxHeight: 500,
                                                    overflowY: 'auto',
                                                    background: '#F8FAFC',
                                                    padding: 16,
                                                    borderRadius: 12,
                                                    border: '1px solid #E2E8F0',
                                                    wordWrap: 'break-word',
                                                    overflowWrap: 'break-word',
                                                    whiteSpace: 'pre-wrap',
                                                    wordBreak: 'break-word',
                                                    lineHeight: '1.6',
                                                    color: '#1E293B'
                                                }}
                                            />
                                        </Col>

                                        <Col span={12}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                                <TranslationOutlined style={{ color: '#7C3AED', fontSize: 18 }} />
                                                <span style={{ fontWeight: 600, color: '#475569' }}>Bản dịch AI (Premium)</span>
                                            </div>
                                            <div style={{
                                                maxHeight: 500,
                                                overflowY: 'auto',
                                                background: 'linear-gradient(135deg, #F5F3FF 0%, #FFFFFF 100%)',
                                                padding: 16,
                                                borderRadius: 12,
                                                border: '1px solid #DDD6FE',
                                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                                            }}>
                                                {aiTranslations.length > 0 ? (
                                                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                                        {aiTranslations.map((p: any, pIdx: number) => (
                                                            <div key={pIdx} style={{ marginBottom: 12 }}>
                                                                <div style={{
                                                                    display: 'flex', alignItems: 'center', gap: 8,
                                                                    marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #EDE9FE'
                                                                }}>
                                                                    <div style={{ width: 4, height: 16, background: '#8B5CF6', borderRadius: 2 }} />
                                                                    <Text strong style={{ color: '#5B21B6', fontSize: 13 }}>
                                                                        {p.label || `Đoạn ${pIdx + 1}`}
                                                                    </Text>
                                                                </div>
                                                                {(p.items || p.sentences || []).map((s: any, sIdx: number) => (
                                                                    <div key={sIdx} style={{
                                                                        marginBottom: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.5)',
                                                                        borderRadius: 8, border: '1px solid rgba(139, 92, 246, 0.1)'
                                                                    }}>
                                                                        <div style={{ color: '#1E293B', fontSize: 13, fontWeight: 500 }}>{s.en}</div>
                                                                        <div style={{ color: '#6D28D9', fontSize: 13, fontStyle: 'italic', marginTop: 4, opacity: 0.9 }}>
                                                                            → {s.vi}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ))}

                                                        {/* Vocabulary Section - Synchronized from Part 6 to 7 */}
                                                        {vocabulary.length > 0 && (
                                                            <div style={{ marginTop: 8, paddingTop: 16, borderTop: '2px dashed #DDD6FE' }}>
                                                                <div style={{ marginBottom: 12, color: '#059669', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                    <BookOutlined style={{ color: '#10B981' }} /> TỪ VỰNG QUAN TRỌNG
                                                                </div>
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                                    {vocabulary.map((v: any, i: number) => (
                                                                        <Tag key={i} color="green" style={{ borderRadius: 6, margin: 0, padding: '2px 8px' }}>
                                                                            <b>{v.word || v.text}</b>: {v.meaning}
                                                                        </Tag>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Analysis Section */}
                                                        {aiQuestionsInfo.length > 0 && (
                                                            <div style={{ marginTop: 8, paddingTop: 16, borderTop: '2px dashed #DDD6FE' }}>
                                                                <div style={{ marginBottom: 12, color: '#1E40AF', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                    <CheckCircleOutlined style={{ color: '#2563EB' }} /> PHÂN TÍCH CÂU HỎI
                                                                </div>
                                                                <Space direction="vertical" style={{ width: '100%' }} size="small">
                                                                    {aiQuestionsInfo.map((aq: any, i: number) => (
                                                                        <div key={i} style={{ padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                                                                            <div style={{ fontWeight: 800, color: '#1E3A8A', fontSize: 12, marginBottom: 4 }}>CÂU {aq.questionNumber}</div>
                                                                            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                                                                                {aq.analysis && <div><span style={{ color: '#6366F1', fontWeight: 700 }}>●</span> {aq.analysis}</div>}
                                                                                {aq.evidence && <div style={{ marginTop: 4, color: '#059669', fontStyle: 'italic' }}><span style={{ color: '#10B981', fontWeight: 700 }}>🔍</span> {aq.evidence}</div>}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </Space>
                                                            </div>
                                                        )}
                                                    </Space>
                                                ) : (
                                                    <Empty
                                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                        description={<span style={{ fontSize: 12, color: '#94A3B8' }}>Chưa có bản dịch AI</span>}
                                                        style={{ margin: '60px 0' }}
                                                    />
                                                )}
                                            </div>
                                        </Col>
                                    </Row>
                                ) : null}
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
                                            }} className="hover-item-shadow-light">
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
                                                        <div style={{ flex: 1 }}>
                                                            <div dangerouslySetInnerHTML={{ __html: item.questionText || '' }} style={{ color: '#1E293B', fontWeight: 600, marginBottom: 8 }} />
                                                            <Space size="large" wrap style={{ color: '#475569', fontSize: 13 }}>
                                                                <span><Tag color="blue" style={{ borderRadius: 4, margin: 0 }}>A</Tag> {item.optionA}</span>
                                                                <span><Tag color="blue" style={{ borderRadius: 4, margin: 0 }}>B</Tag> {item.optionB}</span>
                                                                <span><Tag color="blue" style={{ borderRadius: 4, margin: 0 }}>C</Tag> {item.optionC}</span>
                                                                <span><Tag color="blue" style={{ borderRadius: 4, margin: 0 }}>D</Tag> {item.optionD}</span>
                                                            </Space>
                                                        </div>
                                                    </Space>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <Tag color="green" style={{
                                                        fontWeight: 800, padding: '4px 12px', borderRadius: 6,
                                                        border: '1px solid #10B981', background: '#ECFDF5'
                                                    }}>
                                                        {item.correctAnswer}
                                                    </Tag>
                                                    <Button
                                                        type="text"
                                                        icon={<EditOutlined style={{ color: '#2563EB' }} />}
                                                        style={{ background: '#EFF6FF', borderRadius: 8 }}
                                                        onClick={() => {
                                                            setEditingQuestion(item);
                                                            editForm.setFieldsValue(item);
                                                            setEditModalVisible(true);
                                                        }}
                                                    />
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


    const columns: ColumnsType<Question> = [
        ...(part?.partNumber !== 1 ? [{
            title: 'Câu hỏi',
            dataIndex: 'questionText',
            key: 'questionText',
            render: (text: string, record: Question) => (
                <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <b style={{ marginRight: 5, whiteSpace: 'nowrap' }}>{record.questionNumber}.</b>
                        {/* Remove default margins from p tags inside the content to keep it compact */}
                        <div
                            dangerouslySetInnerHTML={{
                                __html: (text || '(Không có nội dung)')
                                    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                            }}
                            style={{ margin: 0, '& p': { margin: 0 } } as any}
                        />
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: 4, marginLeft: 25 }}>
                        A. {record.optionA} / B. {record.optionB} / C. {record.optionC} / D. {record.optionD}
                    </div>
                </div>
            )
        }] : []),
        // Hide 'Nội dung' column for Part 5
        ...(part?.partNumber !== 5 ? [{
            title: 'Nội dung',
            key: 'content',
            render: (_: any, record: Question) => (
                <Space direction="vertical" style={{ width: '100%' }}>
                    {/* Part 1 Question Number */}
                    {Number(part?.partNumber) === 1 && (
                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#1890ff', marginBottom: 8 }}>
                            Câu {record.questionNumber}
                        </div>
                    )}
                    {/* Part 1 & 2: Image/Audio */}
                    {(Number(part?.partNumber) === 1 || Number(part?.partNumber) === 2) && (
                        <>
                            {record.imageUrl && (
                                <div style={{ marginBottom: 8 }}>
                                    <AntImage src={record.imageUrl} width={150} style={{ borderRadius: 8 }} />
                                </div>
                            )}
                            {record.audioUrl && (
                                <div style={{ marginBottom: 8 }}>
                                    <AudioPlayer src={record.audioUrl} />
                                </div>
                            )}
                        </>
                    )}

                    {/* Question Text - Hide for Part 5 */}
                    {part?.partNumber !== 5 && (
                        <div
                            dangerouslySetInnerHTML={{
                                __html: (record.questionText || '')
                                    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                            }}
                        />
                    )}

                    {/* Options */}
                    {(!isPart6 && part?.partNumber !== 7 && part?.partNumber !== 3 && part?.partNumber !== 4) && (
                        <div style={{ marginTop: 8 }}>
                            <Tag color={record.correctAnswer === 'A' ? 'success' : 'default'}>A. {record.optionA}</Tag>
                            <Tag color={record.correctAnswer === 'B' ? 'success' : 'default'}>B. {record.optionB}</Tag>
                            <Tag color={record.correctAnswer === 'C' ? 'success' : 'default'}>C. {record.optionC}</Tag>
                            {/* Part 2 only has 3 options usually */}
                            {record.optionD && <Tag color={record.correctAnswer === 'D' ? 'success' : 'default'}>D. {record.optionD}</Tag>}
                        </div>
                    )}
                </Space>
            ),
        }] : []),
        {
            title: 'Đáp án',
            dataIndex: 'correctAnswer',
            align: 'center',
            width: 100,
            render: (text) => (
                <div style={{
                    background: '#ECFDF5',
                    color: '#059669',
                    padding: '4px 12px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    display: 'inline-block',
                    border: '1px solid #10B981',
                    fontSize: '13px'
                }}>
                    {text}
                </div>
            )
        },
        {
            title: 'Hành động',
            align: 'center',
            key: 'actions',
            width: 120,
            render: (_, record) => (
                <Space>
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        style={{ color: '#2563EB', background: '#EFF6FF', borderRadius: '8px' }}
                        onClick={() => {
                            setEditingQuestion(record);
                            if (part?.partNumber === 1) {
                                setEditPart1ModalVisible(true);
                            } else {
                                editForm.setFieldsValue(record);
                                setEditModalVisible(true);
                            }
                        }}
                    />
                    <Popconfirm
                        title="Xác nhận xóa câu hỏi này?"
                        onConfirm={async () => {
                            try {
                                await questionApi.delete(record.id);
                                message.success('Đã xóa câu hỏi');
                                fetchQuestions();
                            } catch (error) {
                                message.error('Lỗi khi xóa câu hỏi');
                            }
                        }}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                    >
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            style={{ background: '#FEF2F2', borderRadius: '8px' }}
                        />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    if (!part) return <div>Loading...</div>;

    return (
        <div style={{ padding: 24 }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* Header */}
                <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space direction="vertical" size={0}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                            <div style={{
                                padding: '4px 12px',
                                background: 'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%)',
                                borderRadius: '8px',
                                color: '#FFF',
                                fontWeight: 800,
                                fontSize: '12px',
                                boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)'
                            }}>
                                PART {part?.partNumber}
                            </div>
                            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#1E293B' }}>
                                {part?.partName?.replace(/^Part \d+: /, '')}
                            </h1>
                        </div>
                        <p style={{ margin: 0, color: '#64748B', fontSize: 15 }}>Quản lý chi tiết câu hỏi và nộ dung của phần thi này.</p>
                    </Space>
                    <Button
                        size="large"
                        icon={<ArrowLeftOutlined />}
                        onClick={() => navigate(`/exam-bank/${testId}`)}
                        style={{ borderRadius: 12, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                        Quay lại
                    </Button>
                </div>

                {/* Part Audio Player Section */}
                {(part?.partNumber >= 1 && part?.partNumber <= 4) && (
                    <Card
                        style={{
                            marginBottom: 24,
                            borderRadius: 20,
                            border: 'none',
                            boxShadow: modernShadow,
                            background: '#FFFFFF',
                            overflow: 'hidden'
                        }}
                        bodyStyle={{ padding: '20px 24px' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1 }}>
                                <div style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 14,
                                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#FFF',
                                    fontSize: 20,
                                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                                }}>
                                    <ClockCircleOutlined />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, color: '#1E293B', fontSize: 16, marginBottom: 4 }}>File nghe của Part {part?.partNumber}</div>
                                    {part?.audioUrl ? (
                                        <div style={{ maxWidth: 400 }}>
                                            <AudioPlayer src={part.audioUrl} />
                                        </div>
                                    ) : (
                                        <span style={{ color: '#94A3B8', fontStyle: 'italic', fontSize: 13 }}>Chưa có file nghe chung cho phần này</span>
                                    )}
                                </div>
                            </div>
                            <Upload
                                beforeUpload={handlePartAudioUpload}
                                showUploadList={false}
                                accept="audio/*"
                            >
                                <Button
                                    icon={<UploadOutlined />}
                                    type="primary"
                                    size="large"
                                    style={{
                                        borderRadius: 12,
                                        fontWeight: 700,
                                        background: part?.audioUrl ? '#F1F5F9' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                        color: part?.audioUrl ? '#475569' : '#FFF',
                                        border: 'none',
                                        boxShadow: part?.audioUrl ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.3)',
                                        height: 48,
                                        padding: '0 24px'
                                    }}
                                >
                                    {part?.audioUrl ? 'Thay đổi Audio' : 'Tải lên Audio'}
                                </Button>
                            </Upload>
                        </div>
                    </Card>
                )}

                {/* Toolbar */}
                <Card
                    style={{
                        marginBottom: 24,
                        borderRadius: 20,
                        border: 'none',
                        boxShadow: modernShadow,
                        background: '#FFFFFF'
                    }}
                    bodyStyle={{ padding: '16px 24px' }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space size="middle">
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => {
                                    if (isPart6) {
                                        setEditingGroup(null);
                                        setCreatePart6ModalVisible(true);
                                    } else if (part?.partNumber === 7) {
                                        setEditingGroup(null);
                                        setCreatePart7ModalVisible(true);
                                    } else if (part?.partNumber === 1) setCreatePart1ModalVisible(true);
                                    else if (part?.partNumber === 2) setCreatePart2ModalVisible(true);
                                    else setCreateModalVisible(true);
                                }}
                                size="large"
                                style={{
                                    borderRadius: 12,
                                    fontWeight: 700,
                                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                                    border: 'none',
                                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                                    height: 44,
                                    padding: '0 24px'
                                }}
                            >
                                {isPart6 || part?.partNumber === 7 ? 'Thêm nội dung mới' : 'Thêm câu hỏi mới'}
                            </Button>
                            {part?.partNumber !== 6 && part?.partNumber !== 7 && part?.partNumber !== 1 && part?.partNumber !== 2 && (
                                <Button
                                    icon={<UploadOutlined />}
                                    onClick={() => setImportDrawerVisible(true)}
                                    size="large"
                                    style={{ borderRadius: 12, fontWeight: 600, height: 44 }}
                                >
                                    Import Excel
                                </Button>
                            )}
                        </Space>
                        <Popconfirm
                            title={
                                selectedQuestionIds.length > 0
                                    ? (isPart6 || part?.partNumber === 7)
                                        ? `Xóa ${selectedPassageCount} nội dung đã chọn?`
                                        : `Xóa ${selectedQuestionIds.length} câu đã chọn?`
                                    : "Bạn có chắc xóa toàn bộ câu hỏi của phần này?"
                            }
                            onConfirm={selectedQuestionIds.length > 0 ? handleDeleteSelected : handleDeleteAll}
                            okButtonProps={{ danger: true }}
                        >
                            <Button
                                danger
                                icon={<DeleteOutlined />}
                                size="large"
                                style={{
                                    borderRadius: 12,
                                    fontWeight: 600,
                                    height: 44,
                                    background: selectedQuestionIds.length > 0 ? '#FEF2F2' : 'transparent',
                                    border: selectedQuestionIds.length > 0 ? '1px solid #FECACA' : '1px solid #FED7D7'
                                }}
                            >
                                {selectedQuestionIds.length > 0
                                    ? ((isPart6 || part?.partNumber === 7) ? `Xóa đoạn văn (${selectedPassageCount})` : `Xóa (${selectedQuestionIds.length})`)
                                    : 'Xóa tất cả'}
                            </Button>
                        </Popconfirm>
                    </div>
                </Card>

                {/* Content */}
                {isPart6 || part.partNumber === 7 ? renderGroupedLayout() : (
                    <Table
                        columns={columns}
                        dataSource={questions}
                        rowKey="id"
                        pagination={{ pageSize: 20 }}
                        loading={loading}
                        rowSelection={{
                            selectedRowKeys: selectedQuestionIds,
                            onChange: (keys) => setSelectedQuestionIds(keys as string[])
                        }}
                    />
                )}
            </Space>

            {/* Modals */}
            <CreatePart1Modal
                open={createPart1ModalVisible}
                onCancel={() => setCreatePart1ModalVisible(false)}
                onSuccess={handleCreateSuccess}
                partId={partId || null}
            />

            <CreatePart2BulkModal
                open={createPart2ModalVisible}
                onCancel={() => setCreatePart2ModalVisible(false)}
                onSuccess={handleCreateSuccess}
                partId={partId || null}
                currentAudioUrl={part?.audioUrl}
            />

            <CreatePart3Modal
                open={createPart3ModalVisible}
                onCancel={() => setCreatePart3ModalVisible(false)}
                onSuccess={handleCreateSuccess}
                partId={partId || null}
                partNumber={part?.partNumber || 3}
            />

            {/* Removed duplicate CreatePart2Modal */}

            <CreatePart3Modal
                open={createPart3ModalVisible}
                onCancel={() => setCreatePart3ModalVisible(false)}
                onSuccess={handleCreateSuccess}
                partId={partId || null}
                partNumber={part?.partNumber || 3}
            />

            <CreatePart6Modal
                open={createPart6ModalVisible}
                onCancel={() => {
                    setCreatePart6ModalVisible(false);
                    setEditingGroup(null);
                }}
                onSuccess={fetchQuestions}
                partId={partId || null}
                mode={editingGroup ? 'edit' : 'add'}
                initialData={editingGroup}
            />

            <CreatePart7Modal
                open={createPart7ModalVisible}
                onCancel={() => {
                    setCreatePart7ModalVisible(false);
                    setEditingGroup(null);
                }}
                onSuccess={fetchQuestions}
                partId={partId || null}
                mode={editingGroup ? 'edit' : 'add'}
                initialData={editingGroup}
            />

            <CreatePart5BulkModal
                open={createPart5BulkModalVisible}
                onCancel={() => setCreatePart5BulkModalVisible(false)}
                onSuccess={fetchQuestions}
                initialData={part5ImportData}
                partId={partId || null}
                importMode={part5ImportMode}
            />


            <Modal
                title={
                    <Space style={{ marginBottom: 8 }}>
                        <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: 18,
                            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)'
                        }}>
                            <PlusCircleOutlined />
                        </div>
                        <span style={{ fontSize: 20, color: '#1E293B', fontWeight: 800 }}>Thêm nội dung mới</span>
                    </Space>
                }
                open={createModalVisible}
                onCancel={() => setCreateModalVisible(false)}
                onOk={() => createForm.submit()}
                okText="Lưu câu hỏi"
                cancelText="Hủy bỏ"
                width={700}
                centered
                okButtonProps={{
                    style: {
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
                        border: 'none',
                        height: 44,
                        padding: '0 32px',
                        fontWeight: 700,
                        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
                    }
                }}
                cancelButtonProps={{ style: { borderRadius: 10, height: 44 } }}
            >
                <Form form={createForm} layout="vertical" onFinish={handleCreateQuestion}>
                    <div style={{ display: 'flex', gap: 16 }}>
                        <Form.Item
                            label="Số câu"
                            name="questionNumber"
                            rules={[
                                { required: true, message: 'Nhập số câu' },
                                {
                                    type: 'number',
                                    min: part?.partNumber === 5 ? 101 : part?.partNumber === 6 ? 131 : 1,
                                    max: part?.partNumber === 5 ? 130 : part?.partNumber === 6 ? 146 : undefined,
                                    message: part?.partNumber === 5 ? 'Part 5 phải từ câu 101-130' : part?.partNumber === 6 ? 'Part 6 phải từ câu 131-146' : 'Số câu không hợp lệ'
                                }
                            ]}
                            style={{ width: 120 }}
                        >
                            <InputNumber
                                min={part?.partNumber === 5 ? 101 : part?.partNumber === 6 ? 131 : 1}
                                max={part?.partNumber === 5 ? 130 : part?.partNumber === 6 ? 146 : undefined}
                                style={{ width: '100%' }}
                            />
                        </Form.Item>
                        <Form.Item label="Đáp án đúng" name="correctAnswer" rules={[{ required: true }]} style={{ flex: 1 }}>
                            <Select>
                                {['A', 'B', 'C', 'D'].map(opt => <Option key={opt} value={opt}>{opt}</Option>)}
                            </Select>
                        </Form.Item>
                    </div>

                    {isPart6 && (
                        <Form.Item label="Nội dung" name="passage" rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]}>
                            <ReactQuill theme="snow" modules={quillModules} formats={quillFormats} placeholder="Nhập nội dung..." style={{ height: 200, marginBottom: 50 }} />
                        </Form.Item>
                    )}

                    {!isPart6 && (
                        <Form.Item label="Nội dung câu hỏi" name="questionText" rules={[{ required: true }]}>
                            <ReactQuill theme="snow" modules={quillModules} formats={quillFormats} placeholder="Nhập câu hỏi..." />
                        </Form.Item>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {['A', 'B', 'C', 'D'].map(opt => (
                            <Form.Item key={opt} label={`Option ${opt}`} name={`option${opt}`} rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                        ))}
                    </div>
                </Form>
            </Modal>

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
                        <span style={{ fontSize: 20, color: '#1E293B', fontWeight: 800 }}>Chỉnh sửa câu hỏi</span>
                    </Space>
                }
                open={editModalVisible}
                onCancel={() => setEditModalVisible(false)}
                onOk={() => editForm.submit()}
                okText="Cập nhật"
                cancelText="Hủy bỏ"
                width={700}
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
                <Form form={editForm} layout="vertical" onFinish={handleEditQuestion}>
                    <div style={{ display: 'flex', gap: 16 }}>
                        <Form.Item
                            label="Số câu"
                            name="questionNumber"
                            rules={[
                                { required: true, message: 'Nhập số câu' },
                                { type: 'number', min: part?.partNumber === 5 ? 101 : 1, message: part?.partNumber === 5 ? 'Part 5 phải từ câu 101' : 'Số câu không hợp lệ' }
                            ]}
                            style={{ width: 120 }}
                        >
                            <InputNumber min={part?.partNumber === 5 ? 101 : 1} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item label="Đáp án đúng" name="correctAnswer" rules={[{ required: true }]} style={{ flex: 1 }}>
                            <Select>
                                {['A', 'B', 'C', 'D'].map(opt => <Option key={opt} value={opt}>{opt}</Option>)}
                            </Select>
                        </Form.Item>
                    </div>

                    {/* Removed passage editing from here as it is now separate */}

                    {!isPart6 && (
                        <Form.Item label="Nội dung câu hỏi" name="questionText" rules={[{ required: true }]}>
                            <ReactQuill theme="snow" modules={quillModules} formats={quillFormats} />
                        </Form.Item>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {['A', 'B', 'C', 'D'].map(opt => (
                            <Form.Item key={opt} label={`Option ${opt}`} name={`option${opt}`} rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                        ))}
                    </div>
                </Form>
            </Modal>

            <Drawer
                title={`Import Excel - ${part.partName}`}
                width={600}
                open={importDrawerVisible}
                onClose={() => setImportDrawerVisible(false)}
            >
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    {/* Download Template Button */}
                    <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate} block size="large">
                        Tải file mẫu
                    </Button>

                    {/* Import Instructions */}
                    <Card
                        title={<span style={{ fontWeight: 600, color: '#1890ff' }}>HƯỚNG DẪN IMPORT EXCEL</span>}
                        size="small"
                        style={{ background: '#f0f5ff', border: '1px solid #adc6ff' }}
                    >
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                            <div>
                                <strong>Bước 1:</strong> Tải file mẫu và điền thông tin
                            </div>
                            <ul style={{ margin: '8px 0', paddingLeft: 20, color: '#595959' }}>
                                <li>Số câu: 101-130 (bắt buộc theo format TOEIC)</li>
                                <li>Nội dung câu hỏi, đáp án A/B/C/D</li>
                                <li>Đáp án đúng: chỉ điền A, B, C hoặc D</li>
                                <li><strong>Không cần</strong> điền cột "Lời giải" - AI sẽ tự tạo</li>
                            </ul>

                            <div>
                                <strong>Bước 2:</strong> Upload file Excel
                            </div>

                            <div>
                                <strong>Bước 3:</strong> Tạo lời giải AI (trong màn hình preview)
                            </div>

                            <div>
                                <strong>Bước 4:</strong> Lưu tất cả
                            </div>

                            <div style={{
                                marginTop: 12,
                                padding: '8px 12px',
                                background: '#fff7e6',
                                border: '1px solid #ffd591',
                                borderRadius: 4,
                                fontSize: 13
                            }}>
                                <strong style={{ color: '#fa8c16' }}>⚠️ Lưu ý:</strong> Part 5 chỉ được phép có tối đa 30 câu (101-130)
                            </div>
                        </Space>
                    </Card>

                    {/* Upload Button - Centered at Bottom */}
                    <div style={{
                        marginTop: 24,
                        padding: '20px 0',
                        borderTop: '1px solid #f0f0f0',
                        display: 'flex',
                        justifyContent: 'center'
                    }}>
                        <Upload
                            accept=".xlsx, .xls"
                            beforeUpload={handleExcelUpload}
                            showUploadList={false}
                        >
                            <Button
                                icon={<UploadOutlined />}
                                type="primary"
                                size="large"
                                style={{ minWidth: 200 }}
                            >
                                Chọn file Excel
                            </Button>
                        </Upload>
                    </div>
                </Space>
            </Drawer>

            {/* Create Part 1 Modal */}
            <CreatePart1Modal
                open={createPart1ModalVisible}
                onCancel={() => setCreatePart1ModalVisible(false)}
                onSuccess={handleCreateSuccess}
                partId={partId || null}
            />

            {/* Edit Part 1 Modal */}
            <EditPart1Modal
                open={editPart1ModalVisible}
                onCancel={() => {
                    setEditPart1ModalVisible(false);
                    setEditingQuestion(null);
                }}
                onSuccess={handleCreateSuccess}
                question={editingQuestion}
            />
        </div>
    );
}
