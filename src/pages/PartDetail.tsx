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
    List,
    Card,
    Typography,
    Drawer,
    Upload,
    Checkbox,
    Image as AntImage,
    Row,
    Col,
    Empty,
    Alert,
    Steps,
} from 'antd';
import {
    EditOutlined,
    PlusOutlined,
    ImportOutlined,
    DownloadOutlined,
    SettingOutlined,
    ArrowLeftOutlined,
    UploadOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
// import type { RcFile } from 'antd/es/upload/interface'; // Removed unused import
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
import { uploadApi, partApi, questionApi, aiApi } from '../services/api';
import type { FormInstance } from 'antd';

// --- Interfaces ---
interface User {
    id?: string;
    role: 'ADMIN' | 'SPECIALIST' | 'TEACHER';
}

interface VocabularyItem {
    word?: string;
    text?: string;
    meaning: string;
    ipa?: string;
    type?: string;
}

interface AIItem {
    en: string;
    vi: string;
}

interface AIPassage {
    label?: string;
    items?: AIItem[];
    sentences?: AIItem[];
}

interface AIQuestionInfo {
    questionNumber: number;
    analysis?: string;
    evidence?: string;
}

interface PassageGroup {
    passageTitle?: string;
    passage: string;
    passageImageUrl?: string; // ✅ New
    audioUrl?: string;
    questions: Question[];
}

interface Question {
    id: string;
    questionNumber: number;
    questionText?: string;
    imageUrl?: string; // Add imageUrl
    audioUrl?: string; // Add audioUrl
    passageTitle?: string;
    passageImageUrl?: string; // ✅ New
    questionScanUrl?: string; // ✅ New
    optionA?: string;
    optionB?: string;
    optionC?: string;
    optionD?: string;
    correctAnswer: string;
    explanation?: string;
    passage?: string;
    passageTranslationData?: string;
    level?: 'A1_A2' | 'B1_B2' | 'C1';
    questionTranslation?: string;
    optionTranslations?: string;
    keyVocabulary?: string;
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
    const { user } = useOutletContext<{ user: User }>();
    const isAdmin = user?.role === 'ADMIN';
    const isSpecialist = user?.role === 'SPECIALIST';
    const isTeacher = user?.role === 'TEACHER';
    const canEditOrCreate = isAdmin || isSpecialist || isTeacher;

    const { testId, partId } = useParams<{ testId: string; partId: string }>();
    const navigate = useNavigate();

    const [part, setPart] = useState<Part | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);

    // --- Modal States ---
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [createPart6ModalVisible, setCreatePart6ModalVisible] = useState(false);
    const [createPart7ModalVisible, setCreatePart7ModalVisible] = useState(false);
    const [createPart1ModalVisible, setCreatePart1ModalVisible] = useState(false);
    const [editPart1ModalVisible, setEditPart1ModalVisible] = useState(false);
    const [createPart2ModalVisible, setCreatePart2ModalVisible] = useState(false); // Now for bulk modal
    const [createPart3ModalVisible, setCreatePart3ModalVisible] = useState(false);
    const [createPart4ModalVisible, setCreatePart4ModalVisible] = useState(false);
    const [createPart5BulkModalVisible, setCreatePart5BulkModalVisible] = useState(false);
    const [partEditModalVisible, setPartEditModalVisible] = useState(false);
    const [part5ImportData, setPart5ImportData] = useState<Record<string, unknown>[]>([]);
    const [part5ImportMode, setPart5ImportMode] = useState<'new' | 'append' | 'replace'>('new'); // Track import mode

    // Passage Edit State
    const [editingGroup, setEditingGroup] = useState<PassageGroup | null>(null);

    // --- Selected Item States ---
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [editPartForm] = Form.useForm();
    const [editPartInstructions, setEditPartInstructions] = useState('');
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

    // --- Forms ---
    const [createForm] = Form.useForm();
    const [editForm] = Form.useForm();

    // --- Import States ---
    const [importDrawerVisible, setImportDrawerVisible] = useState(false);
    const [partAudioFile, setPartAudioFile] = useState<File | null>(null);


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
            console.error('Error fetching part details:', error);
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
            console.error('Error fetching questions:', error);
        } finally {
            setLoading(false);
        }
    };


    // --- Handlers: Status ---

    const handleEnrichQuestion = async (form: FormInstance) => {
        const values = form.getFieldsValue();
        const { questionText, optionA, optionB, optionC, optionD, correctAnswer } = values;

        if (!questionText || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
            message.warning('Vui lòng điền đủ: Câu hỏi gốc, Đáp án A/B/C/D, và Đáp án đúng trước khi dùng AI');
            return;
        }

        setAiLoading(true);
        message.loading({ content: 'AI đang phân tích câu hỏi...', key: 'ai-enrich' });

        try {
            const response = await aiApi.enrichPart5Question({
                questionText,
                optionA,
                optionB,
                optionC,
                optionD,
                correctAnswer
            });

            if (response.success && response.data) {
                const aiData = response.data;

                // Transform vocabulary to the format expected by Form.List
                const vocabList = Array.isArray(aiData.keyVocabulary)
                    ? aiData.keyVocabulary.map((v: any) => ({
                        word: v.word || v.text || '',
                        type: v.type || '',
                        ipa: v.ipa || v.pronunciation || v.ipa || '',
                        meaning: v.meaning || ''
                    }))
                    : [];

                form.setFieldsValue({
                    questionTranslation: aiData.questionTranslation,
                    // Set structured option translations
                    optionTranslationA: aiData.optionTranslations?.A || '',
                    optionTranslationB: aiData.optionTranslations?.B || '',
                    optionTranslationC: aiData.optionTranslations?.C || '',
                    optionTranslationD: aiData.optionTranslations?.D || '',
                    explanation: aiData.explanation,
                    keyVocabulary: vocabList // Structured array
                });
                message.success({ content: 'AI đã hoàn tất phân tích', key: 'ai-enrich' });
            } else {
                throw new Error(response.message || 'Lỗi khi gọi AI');
            }
        } catch (error: unknown) {
            console.error('AI enrich error:', error);
            const errMsg = error instanceof Error ? error.message : 'Không thể hoàn tất phân tích bằng AI';
            message.error({ content: errMsg, key: 'ai-enrich' });
        } finally {
            setAiLoading(false);
        }
    };


    // --- Handlers: Create ---
    const handleCreateQuestion = async (values: any) => {
        const currentPartId = partId;
        if (!currentPartId) return;

        // Check for duplicate question number
        const isDuplicate = questions.some(q => q.questionNumber === values.questionNumber);
        if (isDuplicate) {
            message.error(`Câu số ${values.questionNumber} đã tồn tại! Vui lòng chọn số câu khác.`);
            return;
        }

        // --- PART 2: Handle Part-level Audio Upload ---
        let currentAudioUrl = part?.audioUrl;
        const currentPartNumber = part?.partNumber;
        if (currentPartNumber === 2 && partAudioFile) {
            try {
                message.loading({ content: 'Đang tải lên âm thanh của Part...', key: 'uploadPartAudio' });
                const uploadRes = await uploadApi.audio(partAudioFile);
                if (uploadRes.success) {
                    currentAudioUrl = uploadRes.url;
                    await partApi.update(currentPartId, { audioUrl: currentAudioUrl });
                    setPart(prev => prev ? { ...prev, audioUrl: currentAudioUrl } : null);
                    message.success({ content: 'Cập nhật âm thanh Part thành công', key: 'uploadPartAudio' });
                    setPartAudioFile(null);
                } else {
                    message.error({ content: 'Tải lên âm thanh thất bại: ' + uploadRes.message, key: 'uploadPartAudio' });
                    return;
                }
            } catch (error) {
                console.error('Error uploading part audio:', error);
                message.error({ content: 'Lỗi khi tải lên âm thanh Part', key: 'uploadPartAudio' });
                return;
            }
        }

        // --- PART 5: Transform structured fields back to JSON strings ---
        const submissionData = { ...values };
        if (currentPartNumber === 5) {
            // Transform Option Translations
            const optionTranslations = {
                A: values.optionTranslationA || '',
                B: values.optionTranslationB || '',
                C: values.optionTranslationC || '',
                D: values.optionTranslationD || ''
            };
            submissionData.optionTranslations = JSON.stringify(optionTranslations);

            // Transform Key Vocabulary
            if (values.keyVocabulary && Array.isArray(values.keyVocabulary)) {
                submissionData.keyVocabulary = JSON.stringify(values.keyVocabulary);
            }

            // Cleanup internal form fields
            delete submissionData.optionTranslationA;
            delete submissionData.optionTranslationB;
            delete submissionData.optionTranslationC;
            delete submissionData.optionTranslationD;
        }

        try {
            const data = await questionApi.create(partId, submissionData);
            if (data.success) {
                message.success('Tạo câu hỏi thành công');
                setCreateModalVisible(false);
                createForm.resetFields();
                fetchQuestions();
            } else {
                message.error(data.message || 'Tạo câu hỏi thất bại');
            }
        } catch (error: unknown) {
            console.error('Create error:', error);
            message.error('Lỗi khi tạo câu hỏi');
        }
    };

    // --- Handlers: Edit ---
    const handleEditQuestion = async (values: any) => {
        const currentPartId = partId;
        if (!editingQuestion || !currentPartId) return;

        // --- PART 5: Transform structured fields back to JSON strings ---
        const submissionData = { ...values };
        const currentPartNumber = part?.partNumber;
        if (currentPartNumber === 5) {
            // Transform Option Translations
            const optionTranslations = {
                A: values.optionTranslationA || '',
                B: values.optionTranslationB || '',
                C: values.optionTranslationC || '',
                D: values.optionTranslationD || ''
            };
            submissionData.optionTranslations = JSON.stringify(optionTranslations);

            // Transform Key Vocabulary
            if (values.keyVocabulary && Array.isArray(values.keyVocabulary)) {
                submissionData.keyVocabulary = JSON.stringify(values.keyVocabulary);
            }

            // Cleanup
            delete submissionData.optionTranslationA;
            delete submissionData.optionTranslationB;
            delete submissionData.optionTranslationC;
            delete submissionData.optionTranslationD;
        }

        // --- PART 2: Handle Part-level Audio Upload ---
        if (currentPartNumber === 2 && partAudioFile) {
            try {
                message.loading({ content: 'Đang tải lên âm thanh của Part...', key: 'uploadPartAudio' });
                const uploadRes = await uploadApi.audio(partAudioFile);
                if (uploadRes.success) {
                    const audioUrl = uploadRes.url;
                    await partApi.update(currentPartId, { audioUrl });
                    setPart(prev => prev ? { ...prev, audioUrl } : null);
                    message.success({ content: 'Cập nhật âm thanh Part thành công', key: 'uploadPartAudio' });
                    setPartAudioFile(null);
                } else {
                    message.error({ content: 'Tải lên âm thanh thất bại: ' + uploadRes.message, key: 'uploadPartAudio' });
                    return;
                }
            } catch (error) {
                console.error('Error uploading part audio:', error);
                message.error({ content: 'Lỗi khi tải lên âm thanh Part', key: 'uploadPartAudio' });
                return;
            }
        }

        try {
            // Normal Update
            const data = await questionApi.update(editingQuestion.id, submissionData);
            if (data.success) {
                message.success('Cập nhật câu hỏi thành công');
                setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? data.question : q));
                setEditModalVisible(false);
                fetchQuestions();
            } else {
                message.error(data.message || 'Cập nhật thất bại');
            }
        } catch (error: unknown) {
            console.error('Update error:', error);
            message.error('Lỗi khi cập nhật câu hỏi');
        }
    };


    const handleOpenEditModal = (record: Question) => {
        setEditingQuestion(record);

        const formValues = { ...record };

        if (part?.partNumber === 5) {
            // Parse Option Translations
            if (record.optionTranslations) {
                try {
                    const opts = JSON.parse(record.optionTranslations);
                    (formValues as any).optionTranslationA = opts.A || '';
                    (formValues as any).optionTranslationB = opts.B || '';
                    (formValues as any).optionTranslationC = opts.C || '';
                    (formValues as any).optionTranslationD = opts.D || '';
                } catch (e) {
                    console.error('Error parsing optionTranslations', e);
                }
            }

            // Parse Key Vocabulary
            if (record.keyVocabulary) {
                try {
                    const vocab = JSON.parse(record.keyVocabulary);
                    (formValues as any).keyVocabulary = Array.isArray(vocab) ? vocab : [];
                } catch (e) {
                    console.error('Error parsing keyVocabulary', e);
                }
            }
        }

        editForm.setFieldsValue(formValues);
        setEditModalVisible(true);
    };

    // --- Handlers: Delete ---


    // --- Handlers: Import ---
    const handleDownloadTemplate = () => {
        if (!part) return;
        const partNum = part.partNumber;
        const rows = [];
        const questionCount = partNum === 5 ? 30 : partNum === 6 ? 16 : 10;

        const startNum = partNum === 5 ? 101 : 1;
        const endNum = partNum === 5 ? 130 : (startNum + questionCount - 1);

        for (let i = startNum; i <= endNum; i++) {
            const row: Record<string, string | number> = {
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
                const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

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
        } catch (error: unknown) {
            console.error('Import error:', error);
            const errMsg = error instanceof Error ? error.message : 'Lỗi kết nối khi import';
            message.error({ content: errMsg, key: 'importExcel' });
        }
        return false; // Prevent default auto-upload
    };

    // Removed unused submitImport function since we now upload directly in handleExcelUpload



    // --- Memoized Groups for Part 6/7 ---
    const groups = useMemo(() => {
        if (!questions || questions.length === 0) return [];

        // Sort questions by number
        const sortedQuestions = [...questions].sort((a, b) => a.questionNumber - b.questionNumber);

        // Group by passage (normalized) OR passageImageUrl OR audioUrl (for listening)
        const newGroups: { passageTitle?: string; passage: string; passageImageUrl?: string; audioUrl?: string; questions: Question[] }[] = [];
        let currentGroup: { passageTitle?: string; passage: string; passageImageUrl?: string; audioUrl?: string; questions: Question[] } | null = null;

        // Normalization: Remove HTML tags and extra whitespace to compare text content only
        const normalizePassageContent = (p?: string, a?: string, pImg?: string) => {
            if (a) return a; // If audio exists, group by audio URL
            if (pImg) return pImg; // ✅ If passage image exists, group by the image URL
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
            const passageImageUrl = q.passageImageUrl; // ✅ 
            const audioUrl = q.audioUrl;

            const normalizedContent = normalizePassageContent(passage, audioUrl, passageImageUrl);
            const lastGroupContent = currentGroup ? normalizePassageContent(currentGroup.passage, currentGroup.audioUrl, currentGroup.passageImageUrl) : '';

            // Group if content matches
            if (!currentGroup || normalizedContent !== lastGroupContent) {
                currentGroup = { passageTitle: q.passageTitle, passage: passage, passageImageUrl: passageImageUrl, audioUrl: audioUrl, questions: [] };
                newGroups.push(currentGroup);
            }
            currentGroup.questions.push(q);
        });
        return newGroups;
    }, [questions]);



    // --- Render Logic: Layouts ---
    const renderGroupedLayout = () => {
        if (!groups || groups.length === 0) return <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>Chưa có câu hỏi nào</div>;

        return (
            <div style={{ marginTop: 16 }}>
                {groups.map((group, index) => {
                    let aiTranslations: AIPassage[] = [];
                    let vocabulary: VocabularyItem[] = [];
                    let aiQuestionsInfo: AIQuestionInfo[] = [];

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
                        } catch (e: unknown) {
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
                                        {canEditOrCreate && (
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
                                        )}
                                        <div style={{
                                            padding: '4px 12px', background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
                                            borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13,
                                            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)'
                                        }}>
                                            {isListeningGroup ? `Bài nghe ${index + 1}` : `Nội dung ${index + 1}`}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        {isListeningGroup && group.audioUrl && (
                                            <div style={{ width: 250 }}>
                                                <AudioPlayer src={group.audioUrl} />
                                            </div>
                                        )}
                                        {canEditOrCreate && !isListeningGroup && (
                                            <Button
                                                size="middle"
                                                type="primary"
                                                ghost
                                                style={{ borderRadius: 8, fontWeight: 600 }}
                                                onClick={() => {
                                                    setEditingGroup({
                                                        passage: group.passage,
                                                        passageImageUrl: group.passageImageUrl,
                                                        audioUrl: group.audioUrl,
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
                                                <span style={{ fontWeight: 600, color: '#475569' }}>Nội dung gốc</span>
                                            </div>
                                            <div
                                                className="passage-content"
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
                                                    wordBreak: 'normal',
                                                    lineHeight: '1.6',
                                                    color: '#1E293B'
                                                }}
                                            >
                                                {group.passageTitle && <div style={{ fontWeight: 800, fontSize: 16, color: '#1E293B', marginBottom: 12 }}>{group.passageTitle}</div>}
                                                <div dangerouslySetInnerHTML={{
                                                    __html: (group.passage || (group.passageImageUrl ? '' : '<p><i>(Không có nội dung đoạn văn)</i></p>'))
                                                        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                                                        .replace(/<img[^>]*>/g, '') // Remove redundant img tags from HTML if they are handled by passageImageUrl
                                                }} />

                                                {group.passageImageUrl && (
                                                    <div style={{ marginTop: group.passage ? 16 : 0 }}>
                                                        <AntImage.PreviewGroup>
                                                            {group.passageImageUrl.split(',').filter(Boolean).map((url, i) => (
                                                                <div key={i} style={{
                                                                    borderRadius: 12,
                                                                    overflow: 'hidden',
                                                                    border: '1px solid #E2E8F0',
                                                                    marginBottom: i < group.passageImageUrl!.split(',').filter(Boolean).length - 1 ? 12 : 0
                                                                }}>
                                                                    <AntImage src={url.trim()} style={{ width: '100%', display: 'block' }} />
                                                                </div>
                                                            ))}
                                                        </AntImage.PreviewGroup>
                                                    </div>
                                                )}
                                            </div>
                                        </Col>

                                        <Col span={12}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                                <span style={{ fontWeight: 600, color: '#475569' }}>Bản dịch song ngữ</span>
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
                                                        {aiTranslations.map((p: AIPassage, pIdx: number) => (
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
                                                                {(p.items || p.sentences || []).map((s: AIItem, sIdx: number) => (
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
                                                                <div style={{ marginBottom: 12, color: '#059669', fontWeight: 700, fontSize: 14 }}>
                                                                    TỪ VỰNG QUAN TRỌNG
                                                                </div>
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                                    {vocabulary.map((v: VocabularyItem, i: number) => (
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
                                                                <div style={{ marginBottom: 12, color: '#1E40AF', fontWeight: 700, fontSize: 14 }}>
                                                                    PHÂN TÍCH CÂU HỎI
                                                                </div>
                                                                <Space direction="vertical" style={{ width: '100%' }} size="small">
                                                                    {aiQuestionsInfo.map((aq: AIQuestionInfo, i: number) => (
                                                                        <div key={i} style={{ padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                                                                            <div style={{ fontWeight: 800, color: '#1E3A8A', fontSize: 12, marginBottom: 4 }}>CÂU {aq.questionNumber}</div>
                                                                            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                                                                                {aq.analysis && <div>- {aq.analysis}</div>}
                                                                                {aq.evidence && <div style={{ marginTop: 4, color: '#059669', fontStyle: 'italic' }}>{aq.evidence}</div>}
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
                                                            {part?.partNumber !== 6 && (
                                                                <div dangerouslySetInnerHTML={{ __html: item.questionText || '' }} style={{ color: '#1E293B', fontWeight: 600, marginBottom: 8 }} />
                                                            )}
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
                                                    {/* Removed level Tag */}
                                                    <Tag color="green" style={{
                                                        fontWeight: 800, padding: '4px 12px', borderRadius: 6,
                                                        border: '1px solid #10B981', background: '#ECFDF5'
                                                    }}>
                                                        {item.correctAnswer}
                                                    </Tag>
                                                    {canEditOrCreate && (
                                                        <Space size={8}>
                                                            <Button
                                                                type="text"
                                                                icon={<EditOutlined />}
                                                                style={{ color: '#059669', background: '#ECFDF5', borderRadius: 8 }}
                                                                onClick={() => handleOpenEditModal(item)}
                                                                title="Chỉnh sửa"
                                                            />
                                                        </Space>
                                                    )}
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
        // Image Column first for Part 1 & 2
        (part?.partNumber === 1 || part?.partNumber === 2) ? {
            title: 'Hình ảnh minh họa',
            key: 'content_media',
            width: 220,
            render: (_: any, record: Question) => (
                <Space direction="vertical" style={{ width: '100%' }}>
                    {record.imageUrl && (
                        <div style={{ marginBottom: 8 }}>
                            <AntImage src={record.imageUrl} width={120} style={{ borderRadius: 8 }} />
                        </div>
                    )}
                    {record.audioUrl && (
                        <div style={{ marginBottom: 8 }}>
                            <AudioPlayer src={record.audioUrl} />
                        </div>
                    )}
                </Space>
            ),
        } : null,
        {
            title: part?.partNumber === 1 ? 'Nội dung' : 'Câu hỏi',
            dataIndex: 'questionText',
            key: 'questionText',
            width: 300,
            render: (text: string, record: Question) => (
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <b style={{ color: '#1E293B', marginRight: 8, whiteSpace: 'nowrap' }}>{record.questionNumber}.</b>
                    <div
                        dangerouslySetInnerHTML={{
                            __html: (text || '(Không có nội dung)')
                                .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                        }}
                        style={{ margin: 0, fontWeight: 600, color: '#1E3A8A' }}
                    />
                </div>
            )
        },
        // Only show Translation and AI Enrichment for Reading parts (5, 6, 7)
        (part?.partNumber && part.partNumber > 4) ? {
            title: 'Dịch câu hỏi',
            dataIndex: 'questionTranslation',
            key: 'translation',
            width: 250,
            render: (text: string) => (
                <div style={{ fontSize: '13px', color: '#64748B', fontStyle: 'italic' }}>
                    {text || <span style={{ color: '#CBD5E1' }}>Chưa có</span>}
                </div>
            )
        } : null,
        {
            title: 'A',
            dataIndex: 'optionA',
            key: 'optionA',
            width: 150,
            render: (text: string) => <span style={{ fontSize: '13px' }}>{text}</span>
        },
        {
            title: 'B',
            dataIndex: 'optionB',
            key: 'optionB',
            width: 150,
            render: (text: string) => <span style={{ fontSize: '13px' }}>{text}</span>
        },
        {
            title: 'C',
            dataIndex: 'optionC',
            key: 'optionC',
            width: 150,
            render: (text: string) => <span style={{ fontSize: '13px' }}>{text}</span>
        },
        {
            title: 'D',
            dataIndex: 'optionD',
            key: 'optionD',
            width: 150,
            render: (text: string) => <span style={{ fontSize: '13px' }}>{text}</span>
        },
        {
            title: 'Đáp án',
            dataIndex: 'correctAnswer',
            key: 'correctAnswer',
            align: 'center' as any,
            width: 120,
            render: (text: string) => (
                <Tag color="success" style={{
                    fontWeight: 800, padding: '4px 12px', borderRadius: 6,
                    border: '1px solid #10B981', background: '#ECFDF5',
                    color: '#059669', fontSize: '13px'
                }}>
                    {text}
                </Tag>
            )
        },
        {
            title: 'Hành động',
            align: 'center' as const,
            key: 'actions',
            width: 150,
            fixed: 'right' as const,
            render: (_: unknown, record: Question) => (
                <Space>
                         <>
                             <Button
                                 type="text"
                                 icon={<EditOutlined />}
                                 style={{ color: '#059669', background: '#ECFDF5', borderRadius: '8px' }}
                                 onClick={() => {
                                     if (part?.partNumber === 1) {
                                         setEditingQuestion(record);
                                         setEditPart1ModalVisible(true);
                                     } else {
                                         handleOpenEditModal(record);
                                     }
                                 }}
                                 title="Chỉnh sửa"
                             />
                         </>
                    {!canEditOrCreate && <span style={{ color: '#94A3B8', fontSize: '12px' }}><i>Chỉ xem</i></span>}
                </Space>
            )
        }
    ].filter(Boolean) as ColumnsType<Question>;

    const handleUpdatePart = async (values: any) => {
        if (!part) return;
        try {
            const data = await partApi.update(part.id, {
                ...values,
                instructions: editPartInstructions,
            });
            if (data.success) {
                message.success('Cập nhật Part thành công!');
                setPartEditModalVisible(false);
                fetchPartDetails();
            } else {
                message.error(data.message || 'Không thể cập nhật Part');
            }
        } catch (error) {
            console.error('Error updating part:', error);
            message.error('Có lỗi xảy ra khi cập nhật Part');
        }
    };


    if (!part) return <div>Đang tải...</div>;

    return (
        <div style={{ padding: 24 }}>
            <style>
                {`
                    .part-description, .part-description * { 
                        word-break: normal !important;
                        overflow-wrap: break-word !important;
                        word-wrap: break-word !important;
                        white-space: normal !important;
                        text-align: left !important;
                        hyphens: none !important;
                    }
                    .part-description p { 
                        margin: 0 !important; 
                        padding: 0 !important;
                        text-align: left !important;
                    }
                    .part-description img { 
                        max-width: 200px; 
                        height: auto; 
                        border-radius: 4px; 
                        margin: 4px 0;
                    }
                `}
            </style>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* Header Section */}
                <div style={{ marginBottom: 32 }}>
                    {/* Top Row: Title and Actions */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: part?.instructions ? 16 : 0,
                        gap: 24
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                                padding: '4px 12px',
                                background: 'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%)',
                                borderRadius: '8px',
                                color: '#FFF',
                                fontWeight: 600,
                                fontSize: '12px',
                                boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)'
                            }}>
                                PART {part?.partNumber}
                            </div>
                            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1E293B' }}>
                                {part?.partName?.replace(/^Part \d+: /, '')}
                            </h1>
                        </div>

                        <Space size="middle">
                            <Button
                                size="large"
                                icon={<ArrowLeftOutlined />}
                                onClick={() => navigate(`/exam-bank/${testId}`)}
                                style={{ borderRadius: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}
                            >
                                Quay lại
                            </Button>
                        </Space>
                    </div>

                    {/* Bottom Row: Instructions (Full Width) */}
                    <div style={{
                        background: '#F8FAFC',
                        padding: part?.instructions ? '12px 16px' : 0,
                        borderRadius: 12,
                        border: part?.instructions ? '1px solid #E2E8F0' : 'none'
                    }}>
                        {part?.instructions ? (
                            <div
                                className="part-description"
                                style={{
                                    color: '#475569',
                                    fontSize: 15,
                                    lineHeight: '1.6',
                                    overflowWrap: 'break-word',
                                    wordBreak: 'normal',
                                    textAlign: 'left'
                                }}
                                dangerouslySetInnerHTML={{ __html: part.instructions }}
                            />
                        ) : (
                            <p style={{ margin: 0, color: '#64748B', fontSize: 14, fontStyle: 'italic' }}>
                                * Học viên sẽ nhận được hướng dẫn trước khi làm bài thi.
                            </p>
                        )}
                    </div>
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
                                    fontSize: 14,
                                    fontWeight: 800,
                                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                                }}>
                                    AUDIO
                                </div>
                                <div style={{ flex: 1 }}>
                                    {part?.audioUrl ? (
                                        <div style={{ width: '100%' }}>
                                            <AudioPlayer src={part.audioUrl} />
                                        </div>
                                    ) : (
                                        <span style={{ color: '#94A3B8', fontStyle: 'italic', fontSize: 13 }}>Chưa có file nghe chung cho phần này</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Unified Toolbar Card */}
                {part?.partNumber && (
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
                            {canEditOrCreate ? (
                                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Space size="middle">
                                        <Button
                                            type="primary"
                                            onClick={() => {
                                                if (isPart6) {
                                                    setEditingGroup(null);
                                                    setCreatePart6ModalVisible(true);
                                                } else if (part?.partNumber === 7) {
                                                    setEditingGroup(null);
                                                    setCreatePart7ModalVisible(true);
                                                } else if (part?.partNumber === 1) setCreatePart1ModalVisible(true);
                                                else if (part?.partNumber === 2) setCreatePart2ModalVisible(true);
                                                else if (part?.partNumber === 3) setCreatePart3ModalVisible(true);
                                                else if (part?.partNumber === 4) setCreatePart4ModalVisible(true);
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
                                            icon={<PlusOutlined />}
                                        >
                                            {isPart6 || part?.partNumber === 7 ? 'Thêm nội dung' : 'Thêm câu hỏi'}
                                        </Button>

                                    </Space>

                                    <Space size="middle">
                                        {part?.partNumber === 5 && (
                                            <Button
                                                onClick={() => setImportDrawerVisible(true)}
                                                size="large"
                                                style={{ borderRadius: 12, fontWeight: 600, height: 44 }}
                                                icon={<ImportOutlined />}
                                            >
                                                Import Excel
                                            </Button>
                                        )}

                                        {part?.partNumber === 5 && (
                                            <Button
                                                onClick={handleDownloadTemplate}
                                                size="large"
                                                style={{ borderRadius: 12, fontWeight: 600, height: 44 }}
                                                icon={<DownloadOutlined />}
                                            >
                                                Tải mẫu
                                            </Button>
                                        )}
                                    </Space>
                                </div>
                            ) : (
                                <div style={{ color: '#64748B', fontStyle: 'italic' }}>
                                    Chế độ xem chi tiết (Chỉ đọc)
                                </div>
                            )}
                        </div>
                    </Card>
                )}

                {/* Content */}
                {isPart6 || part.partNumber === 7 ? renderGroupedLayout() : (
                    <Table
                        columns={columns}
                        dataSource={questions}
                        rowKey="id"
                        pagination={{ pageSize: 20 }}
                        loading={loading}
                        scroll={{ x: 1300 }}
                        rowSelection={canEditOrCreate ? {
                            selectedRowKeys: selectedQuestionIds,
                            onChange: (keys) => setSelectedQuestionIds(keys as string[])
                        } : undefined}
                    />
                )}
            </Space>

            {/* Modals */}

            <CreatePart2BulkModal
                open={createPart2ModalVisible}
                onCancel={() => setCreatePart2ModalVisible(false)}
                onSuccess={handleCreateSuccess}
                partId={partId || null}
                currentAudioUrl={part?.audioUrl}
                partName={part?.partName}
                partNumber={part?.partNumber}
            />

            <CreatePart3Modal
                open={createPart3ModalVisible}
                onCancel={() => setCreatePart3ModalVisible(false)}
                onSuccess={handleCreateSuccess}
                partId={partId || null}
                partNumber={3}
                partName={part?.partNumber === 3 ? part?.partName : undefined}
            />

            {/* Create Part 4 Modal */}
            <CreatePart3Modal
                open={createPart4ModalVisible}
                onCancel={() => setCreatePart4ModalVisible(false)}
                onSuccess={handleCreateSuccess}
                partId={partId || null}
                partNumber={4}
                partName={part?.partNumber === 4 ? part?.partName : undefined}
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
                partName={part?.partName}
                partNumber={part?.partNumber}
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
                partName={part?.partName}
                partNumber={part?.partNumber}
            />

            <CreatePart5BulkModal
                open={createPart5BulkModalVisible}
                onCancel={() => setCreatePart5BulkModalVisible(false)}
                onSuccess={fetchQuestions}
                initialData={part5ImportData}
                partId={partId || null}
                importMode={part5ImportMode}
                partName={part?.partName}
                partNumber={part?.partNumber}
            />


            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', gap: '10px', marginLeft: -24 }}>
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
                            <span>+</span>
                        </div>
                        <span style={{ fontSize: 20, color: '#1E293B', fontWeight: 800, textTransform: 'uppercase' }}>
                            {part?.partName
                                ? (part.partName.toUpperCase().startsWith('PART') ? part.partName : `PART ${part.partNumber}: ${part.partName}`)
                                : 'Thêm nội dung mới'}
                        </span>
                    </div>
                }
                open={createModalVisible}
                onCancel={() => {
                    setCreateModalVisible(false);
                    setPartAudioFile(null);
                }}
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
                    {part?.partNumber === 2 && (
                        <div style={{
                            background: '#F8FAFC',
                            padding: 20,
                            borderRadius: 16,
                            border: '1px solid #E2E8F0',
                            marginBottom: 24
                        }}>
                            <div style={{ fontWeight: 700, color: '#1E293B', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 4, height: 16, background: '#2563EB', borderRadius: 2 }} />
                                QUẢN LÝ FILE NGHE (PART LEVEL)
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{ flex: 1 }}>
                                    {part?.audioUrl ? (
                                        <AudioPlayer src={part.audioUrl} />
                                    ) : (
                                        <div style={{ color: '#94A3B8', fontStyle: 'italic', fontSize: 13 }}>Chưa có file nghe cho Part 2</div>
                                    )}
                                </div>
                                <Upload
                                    beforeUpload={(file) => {
                                        setPartAudioFile(file);
                                        return false;
                                    }}
                                    showUploadList={!!partAudioFile}
                                    maxCount={1}
                                    accept="audio/*"
                                    onRemove={() => setPartAudioFile(null)}
                                >
                                    <Button icon={<UploadOutlined />} style={{ borderRadius: 8 }}>
                                        {part?.audioUrl ? 'Thay đổi Audio' : 'Tải lên Audio'}
                                    </Button>
                                </Upload>
                            </div>
                            <div style={{ marginTop: 8, fontSize: 12, color: '#64748B' }}>
                                * Vì Part 2 dùng chung 1 file nghe, việc tải lên tại đây sẽ cập nhật cho toàn bộ Part.
                            </div>
                        </div>
                    )}
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

                    {part?.partNumber === 5 && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                            <Button
                                type="primary"
                                onClick={() => handleEnrichQuestion(createForm)}
                                loading={aiLoading}
                                style={{
                                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                    borderColor: '#10B981',
                                    fontWeight: 600,
                                    borderRadius: 8
                                }}
                            >
                                AI phân tích
                            </Button>
                        </div>
                    )}

                    {isPart6 && (
                        <Form.Item label="Nội dung" name="passage" rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]} style={{ marginBottom: 60 }}>
                            <ReactQuill theme="snow" modules={quillModules} formats={quillFormats} placeholder="Nhập nội dung..." style={{ minHeight: 200, marginBottom: 10 }} />
                        </Form.Item>
                    )}

                    {part?.partNumber === 2 ? (
                        <>
                            <Form.Item label="Tapescript Câu hỏi" name="questionText" rules={[{ required: true, message: 'Nhập Tapescript câu hỏi' }]}>
                                <Input.TextArea rows={3} placeholder="Ví dụ: Where is the marketing convention being held?" />
                            </Form.Item>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                                <Form.Item label="Tapescript A" name="optionA" rules={[{ required: true }]}>
                                    <Input placeholder="Đáp án A" />
                                </Form.Item>
                                <Form.Item label="Tapescript B" name="optionB" rules={[{ required: true }]}>
                                    <Input placeholder="Đáp án B" />
                                </Form.Item>
                                <Form.Item label="Tapescript C" name="optionC" rules={[{ required: true }]}>
                                    <Input placeholder="Đáp án C" />
                                </Form.Item>
                            </div>
                        </>
                    ) : (
                        <>
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
                        </>
                    )}

                    {part?.partNumber === 5 && (
                        <>

                            <Form.Item label="Bản dịch câu hỏi" name="questionTranslation">
                                <Input.TextArea rows={2} placeholder="Ví dụ: Chúng tôi yêu cầu bạn..." />
                            </Form.Item>

                            <div style={{ marginBottom: 8, fontWeight: 600, color: '#475569' }}>Bản dịch đáp án</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                <Form.Item name="optionTranslationA" label="Bản dịch A" style={{ marginBottom: 0 }}>
                                    <Input placeholder="Dịch đáp án A" />
                                </Form.Item>
                                <Form.Item name="optionTranslationB" label="Bản dịch B" style={{ marginBottom: 0 }}>
                                    <Input placeholder="Dịch đáp án B" />
                                </Form.Item>
                                <Form.Item name="optionTranslationC" label="Bản dịch C" style={{ marginBottom: 0 }}>
                                    <Input placeholder="Dịch đáp án C" />
                                </Form.Item>
                                <Form.Item name="optionTranslationD" label="Bản dịch D" style={{ marginBottom: 0 }}>
                                    <Input placeholder="Dịch đáp án D" />
                                </Form.Item>
                            </div>

                            <Form.Item label="Giải thích chi tiết" name="explanation" style={{ marginBottom: 60 }}>
                                <ReactQuill theme="snow" modules={quillModules} formats={quillFormats} placeholder="Nhập giải thích..." style={{ minHeight: 150, marginBottom: 10 }} />
                            </Form.Item>

                            <div style={{ marginBottom: 8, fontWeight: 600, color: '#475569' }}>Từ vựng quan trọng</div>
                            <Form.List name="keyVocabulary">
                                {(fields, { add, remove }) => (
                                    <>
                                        {fields.map(({ key, name, ...restField }) => (
                                            <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'word']}
                                                    rules={[{ required: true, message: 'Nhập từ' }]}
                                                >
                                                    <Input placeholder="Từ vựng" style={{ width: 120 }} />
                                                </Form.Item>
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'type']}
                                                >
                                                    <Input placeholder="Loại" style={{ width: 70 }} />
                                                </Form.Item>
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'ipa']}
                                                >
                                                    <Input placeholder="IPA" style={{ width: 90 }} />
                                                </Form.Item>
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'meaning']}
                                                    rules={[{ required: true, message: 'Nhập nghĩa' }]}
                                                >
                                                    <Input placeholder="Nghĩa" style={{ width: 160 }} />
                                                </Form.Item>
                                                <span onClick={() => remove(name)} style={{ cursor: "pointer", color: "#DC2626", fontWeight: "bold" }}>Xóa</span>
                                            </Space>
                                        ))}
                                        <Form.Item>
                                            <Button type="dashed" onClick={() => add()} block style={{ borderRadius: 8 }}>
                                                Thêm từ vựng
                                            </Button>
                                        </Form.Item>
                                    </>
                                )}
                            </Form.List>
                        </>
                    )}
                </Form>
            </Modal>

            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', gap: '10px', marginLeft: -24 }}>
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

                        </div>
                        <span style={{ fontSize: 20, color: '#1E293B', fontWeight: 800, textTransform: 'uppercase' }}>
                            {part?.partName
                                ? (part.partName.toUpperCase().startsWith('PART') ? part.partName : `PART ${part.partNumber}: ${part.partName}`)
                                : 'Chỉnh sửa câu hỏi'}
                        </span>
                    </div>
                }
                open={editModalVisible}
                onCancel={() => {
                    setEditModalVisible(false);
                    setPartAudioFile(null);
                }}
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
                    {part?.partNumber === 2 && (
                        <div style={{
                            background: '#F8FAFC',
                            padding: 20,
                            borderRadius: 16,
                            border: '1px solid #E2E8F0',
                            marginBottom: 24
                        }}>
                            <div style={{ fontWeight: 700, color: '#1E293B', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 4, height: 16, background: '#10B981', borderRadius: 2 }} />
                                QUẢN LÝ FILE NGHE (PART LEVEL)
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{ flex: 1 }}>
                                    {part?.audioUrl ? (
                                        <AudioPlayer src={part.audioUrl} />
                                    ) : (
                                        <div style={{ color: '#94A3B8', fontStyle: 'italic', fontSize: 13 }}>Chưa có file nghe cho Part 2</div>
                                    )}
                                </div>
                                <Upload
                                    beforeUpload={(file) => {
                                        setPartAudioFile(file);
                                        return false;
                                    }}
                                    showUploadList={!!partAudioFile}
                                    maxCount={1}
                                    accept="audio/*"
                                    onRemove={() => setPartAudioFile(null)}
                                >
                                    <Button icon={<UploadOutlined />} style={{ borderRadius: 8 }}>
                                        {part?.audioUrl ? 'Thay đổi Audio' : 'Tải lên Audio'}
                                    </Button>
                                </Upload>
                            </div>
                            <div style={{ marginTop: 8, fontSize: 12, color: '#64748B' }}>
                                * Vì Part 2 dùng chung 1 file nghe, việc tải lên tại đây sẽ cập nhật cho toàn bộ Part.
                            </div>
                        </div>
                    )}
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

                    {part?.partNumber === 5 && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                            <Button
                                type="primary"
                                onClick={() => handleEnrichQuestion(editForm)}
                                loading={aiLoading}
                                style={{
                                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                    borderColor: '#10B981',
                                    fontWeight: 600,
                                    borderRadius: 8
                                }}
                            >
                                AI phân tích
                            </Button>
                        </div>
                    )}

                    {/* Removed passage editing from here as it is now separate */}

                    {part?.partNumber === 2 ? (
                        <>
                            <Form.Item label="Tapescript Câu hỏi" name="questionText" rules={[{ required: true, message: 'Nhập Tapescript câu hỏi' }]}>
                                <Input.TextArea rows={3} placeholder="Ví dụ: Where is the marketing convention being held?" />
                            </Form.Item>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                                <Form.Item label="Tapescript A" name="optionA" rules={[{ required: true }]}>
                                    <Input placeholder="Đáp án A" />
                                </Form.Item>
                                <Form.Item label="Tapescript B" name="optionB" rules={[{ required: true }]}>
                                    <Input placeholder="Đáp án B" />
                                </Form.Item>
                                <Form.Item label="Tapescript C" name="optionC" rules={[{ required: true }]}>
                                    <Input placeholder="Đáp án C" />
                                </Form.Item>
                            </div>
                        </>
                    ) : (
                        <>
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
                        </>
                    )}

                    {part?.partNumber === 5 && (
                        <>

                            <Form.Item label="Bản dịch câu hỏi" name="questionTranslation">
                                <Input.TextArea rows={2} placeholder="Ví dụ: Chúng tôi yêu cầu bạn..." />
                            </Form.Item>

                            <div style={{ marginBottom: 8, fontWeight: 600, color: '#475569' }}>Bản dịch đáp án</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                <Form.Item name="optionTranslationA" label="Bản dịch A" style={{ marginBottom: 0 }}>
                                    <Input placeholder="Dịch đáp án A" />
                                </Form.Item>
                                <Form.Item name="optionTranslationB" label="Bản dịch B" style={{ marginBottom: 0 }}>
                                    <Input placeholder="Dịch đáp án B" />
                                </Form.Item>
                                <Form.Item name="optionTranslationC" label="Bản dịch C" style={{ marginBottom: 0 }}>
                                    <Input placeholder="Dịch đáp án C" />
                                </Form.Item>
                                <Form.Item name="optionTranslationD" label="Bản dịch D" style={{ marginBottom: 0 }}>
                                    <Input placeholder="Dịch đáp án D" />
                                </Form.Item>
                            </div>

                            <Form.Item label="Giải thích chi tiết" name="explanation" style={{ marginBottom: 60 }}>
                                <ReactQuill theme="snow" modules={quillModules} formats={quillFormats} placeholder="Nhập giải thích..." style={{ minHeight: 150, marginBottom: 10 }} />
                            </Form.Item>

                            <div style={{ marginBottom: 8, fontWeight: 600, color: '#475569' }}>Từ vựng quan trọng</div>
                            <Form.List name="keyVocabulary">
                                {(fields, { add, remove }) => (
                                    <>
                                        {fields.map(({ key, name, ...restField }) => (
                                            <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'word']}
                                                    rules={[{ required: true, message: 'Nhập từ' }]}
                                                >
                                                    <Input placeholder="Từ vựng" style={{ width: 120 }} />
                                                </Form.Item>
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'type']}
                                                >
                                                    <Input placeholder="Loại" style={{ width: 70 }} />
                                                </Form.Item>
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'ipa']}
                                                >
                                                    <Input placeholder="IPA" style={{ width: 90 }} />
                                                </Form.Item>
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'meaning']}
                                                    rules={[{ required: true, message: 'Nhập nghĩa' }]}
                                                >
                                                    <Input placeholder="Nghĩa" style={{ width: 160 }} />
                                                </Form.Item>
                                                <span onClick={() => remove(name)} style={{ cursor: "pointer", color: "#DC2626", fontWeight: "bold" }}>Xóa</span>
                                            </Space>
                                        ))}
                                        <Form.Item>
                                            <Button type="dashed" onClick={() => add()} block style={{ borderRadius: 8 }}>
                                                Thêm từ vựng
                                            </Button>
                                        </Form.Item>
                                    </>
                                )}
                            </Form.List>
                        </>
                    )}
                </Form>
            </Modal>

            <Drawer
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontWeight: 800, color: '#1E293B', fontSize: 18 }}>Import Excel - {part?.partName}</span>
                    </div>
                }
                width={650}
                open={importDrawerVisible}
                onClose={() => setImportDrawerVisible(false)}
                bodyStyle={{ padding: '24px' }}
                headerStyle={{ borderBottom: '1px solid #F1F5F9' }}
            >
                <Space direction="vertical" size={24} style={{ width: '100%' }}>
                    {/* 1. AI Power Alert */}
                    <Alert
                        message={<span style={{ fontWeight: 800, fontSize: 15, color: '#1E40AF' }}>Trình phân tách AI tự động</span>}
                        description={
                            <div style={{ color: '#1E40AF', opacity: 0.9, marginTop: 4 }}>
                                Bạn chỉ cần upload file chứa Câu hỏi và Đáp án A/B/C/D.
                                AI sẽ tự động bóc tách từ vựng, dịch thuật và tạo lời giải chi tiết <b>trong 10 giây!</b>
                            </div>
                        }
                        type="info"
                        showIcon
                        style={{
                            borderRadius: 16,
                            background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                            border: '1px solid #BFDBFE',
                            padding: '16px 20px'
                        }}
                    />

                    {/* 2. Download Template Section */}
                    {part?.partNumber !== 5 && (
                        <div style={{ textAlign: 'right' }}>
                            <Button
                                type="dashed"
                                onClick={handleDownloadTemplate}
                                style={{
                                    borderRadius: 8,
                                    fontWeight: 600,
                                    color: '#475569',
                                    height: 40
                                }}
                            >
                                Tải file Excel mẫu
                            </Button>
                        </div>
                    )}

                    {/* 3. Drag & Drop Upload */}
                    <div style={{ position: 'relative' }}>
                        <Upload.Dragger
                            accept=".xlsx, .xls"
                            beforeUpload={handleExcelUpload}
                            showUploadList={false}
                            style={{
                                background: '#F8FAFC',
                                border: '2px dashed #CBD5E1',
                                borderRadius: 20,
                                padding: '40px 0',
                                transition: 'all 0.3s'
                            }}
                            className="import-dragger"
                        >
                            <Typography.Title level={5} style={{ color: '#1E293B', marginBottom: 8 }}>
                                Kéo thả file Excel vào đây
                            </Typography.Title>
                            <p className="ant-upload-text" style={{ color: '#64748B', fontSize: 14 }}>
                                Hỗ trợ file .xlsx, .xls
                            </p>
                            <Button
                                type="primary"
                                style={{
                                    marginTop: 20,
                                    borderRadius: 10,
                                    fontWeight: 700,
                                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                                    border: 'none',
                                    height: 40,
                                    padding: '0 24px'
                                }}
                            >
                                Duyệt file từ máy tính
                            </Button>
                        </Upload.Dragger>
                    </div>

                    {/* 4. Instructions with Steps */}
                    <div style={{ marginTop: 8 }}>
                        <Typography.Text strong style={{ color: '#475569', display: 'block', marginBottom: 16, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Quy trình thực hiện
                        </Typography.Text>
                        <Steps
                            direction="vertical"
                            size="small"
                            current={0}
                            items={[
                                {
                                    title: <span style={{ fontWeight: 700, color: '#1E293B' }}>Tải file mẫu & Chuẩn bị</span>,
                                    description: <span style={{ fontSize: 13, color: '#64748B' }}>Đảm bảo đúng định dạng các cột để AI có thể đọc chính xác nhất.</span>,
                                },
                                {
                                    title: <span style={{ fontWeight: 700, color: '#1E293B' }}>Tải lên hệ thống</span>,
                                    description: <span style={{ fontSize: 13, color: '#64748B' }}>Kéo thả file .xlsx đã điền nội dung vào khu vực phía trên.</span>,
                                },
                                {
                                    title: <span style={{ fontWeight: 700, color: '#1E293B' }}>Xác thực & Làm giàu bằng AI</span>,
                                    description: <span style={{ fontSize: 13, color: '#64748B' }}>Xem trước dữ liệu và nhấn "Làm giàu bằng AI" để tự động tạo lời giải & dịch.</span>,
                                },
                            ]}
                        />
                    </div>

                </Space>
            </Drawer>

            {/* Create Part 1 Modal */}
            <CreatePart1Modal
                open={createPart1ModalVisible}
                onCancel={() => setCreatePart1ModalVisible(false)}
                onSuccess={handleCreateSuccess}
                partId={partId || null}
                partName={part?.partName}
                partNumber={part?.partNumber}
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
                partId={partId || null}
                partName={part?.partName}
                partNumber={part?.partNumber}
            />

            <Modal
                title={
                    <Space style={{ marginBottom: 8 }}>
                        <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: 18,
                            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)'
                        }}>
                            <SettingOutlined />
                        </div>
                        <span style={{ fontSize: 20, color: '#1E293B', fontWeight: 800 }}>Chỉnh sửa thông tin Part</span>
                    </Space>
                }
                open={partEditModalVisible}
                onCancel={() => setPartEditModalVisible(false)}
                onOk={() => editPartForm.submit()}
                okText="Cập nhật"
                cancelText="Hủy bỏ"
                width={800}
                centered
                okButtonProps={{
                    style: {
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
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
                    form={editPartForm}
                    layout="vertical"
                    onFinish={handleUpdatePart}
                >
                    <Row gutter={16}>
                        <Col span={6}>
                            <Form.Item
                                label="Số hiệu Part"
                                name="partNumber"
                                rules={[{ required: true, message: 'Nhập số hiệu Part' }]}
                            >
                                <InputNumber min={1} max={7} style={{ width: '100%' }} disabled />
                            </Form.Item>
                        </Col>
                        <Col span={18}>
                            <Form.Item
                                label="Tên phân đoạn"
                                name="partName"
                                rules={[{ required: true, message: 'Nhập tên phân đoạn' }]}
                            >
                                <Input placeholder="Ví dụ: Photographs" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        label="Tổng số câu hỏi"
                        name="totalQuestions"
                        rules={[{ required: true, message: 'Nhập tổng số câu' }]}
                    >
                        <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>

                    <div style={{ marginBottom: 16 }}>
                        <span style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#475569' }}>Hướng dẫn</span>
                        <ReactQuill
                            theme="snow"
                            value={editPartInstructions}
                            onChange={setEditPartInstructions}
                            placeholder="Nhập hướng dẫn cho Part này..."
                            style={{ minHeight: 200, marginBottom: 50 }}
                        />
                    </div>
                </Form>
            </Modal>
        </div>
    );
}
