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
    Radio,
    Image as AntImage
} from 'antd';

const { Dragger } = Upload;
import {
    DeleteOutlined,
    EditOutlined,
    ArrowLeftOutlined,
    PlusOutlined,
    UploadOutlined,
    DownloadOutlined,
    InboxOutlined
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
import AudioPlayer from '../components/AudioPlayer';
import api from '../services/api';

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
const { Title } = Typography;

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

    // Passage Edit State
    const [editPassageModalVisible, setEditPassageModalVisible] = useState(false);
    const [currentPassageQuestions, setCurrentPassageQuestions] = useState<Question[]>([]);
    const [passageForm] = Form.useForm();
    // New state for Part 7 Images
    const [editPassageFileList, setEditPassageFileList] = useState<any[]>([]);

    // --- Selected Item States ---
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

    // --- Forms ---
    const [createForm] = Form.useForm();
    const [editForm] = Form.useForm();

    // --- Import States ---
    const [importDrawerVisible, setImportDrawerVisible] = useState(false);
    const [importMode, setImportMode] = useState<'append' | 'replace'>('append');

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
            const response = await api.get(`/parts/${partId}`);
            if (response.data.success) {
                setPart(response.data.part);
            }
        } catch (error) {
            console.error('Error fetching part:', error);
            message.error('Không thể tải thông tin phần thi');
        }
    };

    const fetchQuestions = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/parts/${partId}/questions`);
            if (response.data.success) {
                setQuestions(response.data.questions);
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
        try {
            const response = await api.post(`/parts/${partId}/questions`, values);
            if (response.data.success) {
                message.success('Tạo câu hỏi thành công');
                setCreateModalVisible(false);
                createForm.resetFields();
                fetchQuestions();
            } else {
                message.error(response.data.message || 'Tạo câu hỏi thất bại');
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
            const response = await api.patch(`/questions/${editingQuestion.id}`, values);
            if (response.data.success) {
                message.success('Cập nhật câu hỏi thành công');
                setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? response.data.question : q));
                setEditModalVisible(false);
                fetchQuestions();
            } else {
                message.error(response.data.message || 'Cập nhật thất bại');
            }
        } catch (error) {
            console.error('Update error:', error);
            message.error('Lỗi khi cập nhật câu hỏi');
        }
    };

    const handleUpdatePassage = async (values: any) => {
        try {
            if (!currentPassageQuestions || currentPassageQuestions.length === 0) return;

            let passageContent = '';
            const passageType = values.passageType || 'text'; // Default to text if not specified (e.g. Part 6)

            // Handle Part 7
            if (part?.partNumber === 7) {
                // 1. Handle Images (if 'image' or 'both')
                let imageHtml = '';
                if (passageType === 'image' || passageType === 'both') {
                    const uploadedUrls: string[] = [];

                    for (const file of editPassageFileList) {
                        if (file.status === 'done' && file.url) {
                            // Existing image
                            uploadedUrls.push(file.url);
                        } else {
                            // New file to upload
                            const fileToUpload = file.originFileObj || (file as any);
                            if (fileToUpload) {
                                const formData = new FormData();
                                formData.append('image', fileToUpload);
                                const res = await api.post('/upload/image', formData, {
                                    headers: { 'Content-Type': undefined }
                                });
                                if (res.data.success) {
                                    uploadedUrls.push(res.data.url);
                                } else {
                                    throw new Error('Failed to upload image during update');
                                }
                            }
                        }
                    }

                    imageHtml = uploadedUrls.map(url =>
                        `<img src="${url}" style="max-width: 100%; display: block; margin-bottom: 10px;" />`
                    ).join('');
                }

                // 2. Handle Text (if 'text' or 'both')
                let textHtml = '';
                if (passageType === 'text' || passageType === 'both') {
                    textHtml = values.passage || '';
                }

                // Combine: Images first, then Text (standard convention)
                passageContent = imageHtml + textHtml;

            } else {
                // PART 6 (Text only)
                passageContent = values.passage;
            }

            message.loading({ content: 'Đang cập nhật đoạn văn...', key: 'updatePassage' });

            // Update all questions in the group
            await Promise.all(currentPassageQuestions.map(q =>
                api.patch(`/questions/${q.id}`, { passage: passageContent })
            ));

            message.success({ content: 'Cập nhật đoạn văn thành công!', key: 'updatePassage' });
            setEditPassageModalVisible(false);
            fetchQuestions();
        } catch (error) {
            console.error('Update passage error:', error);
            message.error({ content: 'Lỗi khi cập nhật đoạn văn', key: 'updatePassage' });
        }
    };

    // --- Handlers: Delete ---

    const handleDeleteSelected = async () => {
        try {
            await api.delete('/questions/bulk', {
                data: { questionIds: selectedQuestionIds }
            });
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
            await api.delete(`/parts/${partId}/questions`);
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
            const uploadRes = await api.post('/upload/audio', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (uploadRes.data.success) {
                const audioUrl = uploadRes.data.url;

                // 2. Update Part with new Audio URL
                await api.patch(`/parts/${partId}`, { audioUrl });

                message.success({ content: 'Upload audio thành công!', key: 'uploadAudio' });
                // Update local part state
                setPart(prev => prev ? { ...prev, audioUrl } : null);
            } else {
                throw new Error(uploadRes.data.message);
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
                'Đáp án A': '',
                'Đáp án B': '',
                'Đáp án C': '',
                'Đáp án D': '',
                'Đáp án đúng (A/B/C/D)': '',
                'Giải thích': '' // All parts need explanation
            };

            // Only add Passage column for Parts 6 & 7
            if (partNum === 6 || partNum === 7) {
                row['Đoạn văn (Part 6/7)'] = '';
            }

            rows.push(row);
        }

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `Part ${partNum}`);
        XLSX.writeFile(workbook, `Template_Part_${partNum}.xlsx`);
    };

    const handleExcelUpload = async (file: File) => {
        if (!partId) return false;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('mode', importMode);

        try {
            message.loading({ content: 'Đang import...', key: 'importExcel' });

            // Explicitly use api service (axios) for consistency and auth handling
            // NOTE: api.post handles headers, but for FormData sometimes we might need explicit Content-Type if api doesn't auto-detect. 
            // Usually axios auto-sets Content-Type to multipart/form-data when data is FormData.
            const response = await api.post(`/parts/${partId}/questions/import`, formData, {
                headers: { 'Content-Type': undefined }
            });

            if (response.data.success) {
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
                message.error({ content: response.data.message || 'Import thất bại', key: 'importExcel' });
            }
        } catch (error: any) {
            console.error('Import error:', error);
            message.error({ content: error.response?.data?.message || 'Lỗi kết nối khi import', key: 'importExcel' });
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
                {groups.map((group, index) => (
                    <Card key={index} style={{ marginBottom: 24, border: '1px solid #d9d9d9' }} bodyStyle={{ padding: 0 }}>
                        <div style={{
                            padding: '16px',
                            borderBottom: '1px solid #f0f0f0',
                            background: '#fafafa',
                            maxHeight: 500, // Increased height for Part 7 images
                            overflowY: 'auto'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
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
                                                    // Add all group IDs that aren't already selected
                                                    const uniqueIdsToAdd = groupIds.filter(id => !prev.includes(id));
                                                    return [...prev, ...uniqueIdsToAdd];
                                                } else {
                                                    // Remove all group IDs
                                                    return prev.filter(id => !groupIds.includes(id));
                                                }
                                            });
                                        }}
                                        style={{ marginRight: 12 }}
                                    />
                                    <div style={{ fontWeight: 600, color: '#1890ff' }}>
                                        {isListeningGroup ? `Bài nghe ${index + 1}:` : `Đoạn văn ${index + 1}:`}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    {isListeningGroup && group.audioUrl && (
                                        <div style={{ width: 300, marginRight: 10 }}>
                                            <AudioPlayer src={group.audioUrl} />
                                        </div>
                                    )}
                                    {!isListeningGroup && (
                                        <Button size="small" type="primary" ghost icon={<EditOutlined />} onClick={() => {
                                            setCurrentPassageQuestions(group.questions);
                                            // ... existing edit passage logic ...
                                            // (Simplifying for brevity - reusing existing logic call)
                                            const passageHtml = group.passage || '';
                                            if (part?.partNumber === 7) {
                                                // ... logic from before ...
                                                // Detect content type
                                                const hasImg = passageHtml.includes('<img');
                                                // Check for non-empty text content (stripping tags)
                                                const textContent = passageHtml.replace(/<img[^>]*>/g, '').replace(/<[^>]*>/g, '').trim();
                                                const hasText = textContent.length > 0;

                                                let type = 'text';
                                                if (hasImg && hasText) type = 'both';
                                                else if (hasImg) type = 'image';

                                                // Set initial type
                                                passageForm.setFieldsValue({ passageType: type });

                                                // Parse Images
                                                const imgRegex = /<img[^>]+src="([^">]+)"/g;
                                                let match;
                                                const files = [];
                                                let idCounter = 0;
                                                while ((match = imgRegex.exec(passageHtml)) !== null) {
                                                    files.push({
                                                        uid: `-${idCounter++}`,
                                                        name: `image-${idCounter}.png`,
                                                        status: 'done',
                                                        url: match[1]
                                                    });
                                                }
                                                setEditPassageFileList(files);
                                                const cleanText = passageHtml.replace(/<img[^>]*>/g, '');
                                                passageForm.setFieldsValue({ passageFiles: files, passage: cleanText });
                                            } else {
                                                passageForm.setFieldsValue({ passage: group.passage });
                                            }
                                            setEditPassageModalVisible(true);
                                        }}>
                                            Sửa nội dung
                                        </Button>
                                    )}
                                </div>
                            </div>
                            {!isListeningGroup && (
                                <div
                                    className="passage-content"
                                    dangerouslySetInnerHTML={{
                                        __html: (group.passage || '<p><i>(Không có nội dung đoạn văn)</i></p>')
                                            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Support markdown bold for legacy data
                                    }}
                                    style={{
                                        wordWrap: 'break-word',
                                        overflowWrap: 'break-word',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word'
                                    }}
                                />
                            )}
                        </div>
                        <div style={{ padding: '16px' }}>
                            <List
                                grid={{ gutter: 16, column: 1 }}
                                dataSource={group.questions}
                                renderItem={(item) => (
                                    <List.Item>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #f0f0f0' }}>
                                            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start' }}>
                                                <div>
                                                    <strong style={{ marginRight: 8, color: '#1890ff' }}>{item.questionNumber}.</strong>
                                                    <div dangerouslySetInnerHTML={{ __html: item.questionText || '' }} style={{ display: 'inline-block', verticalAlign: 'top' }} />
                                                    <div style={{ marginTop: 4 }}>
                                                        <Space size="large" wrap>
                                                            <span>A. {item.optionA}</span>
                                                            <span>B. {item.optionB}</span>
                                                            <span>C. {item.optionC}</span>
                                                            <span>D. {item.optionD}</span>
                                                        </Space>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <Space>
                                                    <Tag color="green">{item.correctAnswer}</Tag>
                                                    <Button type="link" icon={<EditOutlined />} onClick={() => {
                                                        setEditingQuestion(item);
                                                        editForm.setFieldsValue(item);
                                                        setEditModalVisible(true);
                                                    }}>Sửa</Button>
                                                </Space>
                                            </div>
                                        </div>
                                    </List.Item>
                                )}
                            />
                        </div>
                    </Card>
                ))}
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
            render: (text) => <Tag color="green">{text}</Tag>
        },
        {
            title: 'Thao tác',
            align: 'center',
            width: 100,
            render: (_, record) => (
                <Button type="link" icon={<EditOutlined />} onClick={() => {
                    setEditingQuestion(record);
                    if (part?.partNumber === 1) {
                        setEditPart1ModalVisible(true);
                    } else {
                        editForm.setFieldsValue(record);
                        setEditModalVisible(true);
                    }
                }}>Sửa</Button>
            )
        }
    ];

    if (!part) return <div>Loading...</div>;

    return (
        <div style={{ padding: 24 }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space direction="vertical" size="small">
                        <Title level={3} style={{ margin: 0 }}>{part.partName}</Title>
                    </Space>
                    <Space>
                        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/exam-bank/${testId}`)}>
                            Quay lại
                        </Button>
                    </Space>
                </div>

                {/* Part Audio Player (Common for all questions) - Only for Listening Parts (1-4) */}
                {(part.partNumber >= 1 && part.partNumber <= 4) && (
                    <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
                                <span style={{ fontWeight: 500, color: '#389e0d' }}>Audio:</span>
                                {part.audioUrl ? (
                                    <div style={{ flex: 1 }}>
                                        <AudioPlayer src={part.audioUrl} />
                                    </div>
                                ) : (
                                    <span style={{ color: '#888', fontStyle: 'italic' }}>Chưa có file nghe chung cho phần này</span>
                                )}
                            </div>
                            <div>
                                <Upload
                                    beforeUpload={handlePartAudioUpload}
                                    showUploadList={false}
                                    accept="audio/*"
                                >
                                    <Button icon={<UploadOutlined />} type={part.audioUrl ? 'default' : 'primary'}>
                                        {part.audioUrl ? 'Upload Audio' : 'Upload Audio'}
                                    </Button>
                                </Upload>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Toolbar */}
                <Card bodyStyle={{ padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Space>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => {
                                    if (isPart6) setCreatePart6ModalVisible(true);
                                    else if (part.partNumber === 7) setCreatePart7ModalVisible(true);
                                    else if (part.partNumber === 1) setCreatePart1ModalVisible(true); // Part 1 specific modal
                                    else if (part.partNumber === 2) setCreatePart2ModalVisible(true); // Part 2 specific modal
                                    else setCreateModalVisible(true);
                                }}
                            >
                                {isPart6 || part.partNumber === 7 ? 'Thêm đoạn văn' : 'Thêm mới'}
                            </Button>
                            {part?.partNumber !== 6 && part?.partNumber !== 7 && part?.partNumber !== 1 && part?.partNumber !== 2 && (
                                <Button icon={<UploadOutlined />} onClick={() => setImportDrawerVisible(true)}>
                                    Import Excel
                                </Button>
                            )}
                        </Space>
                        <Popconfirm
                            title={
                                selectedQuestionIds.length > 0
                                    ? (isPart6 || part?.partNumber === 7)
                                        ? `Xóa ${selectedPassageCount} đoạn văn đã chọn?`
                                        : `Xóa ${selectedQuestionIds.length} câu đã chọn?`
                                    : "Xóa TOÀN BỘ câu hỏi của phần này?"
                            }
                            onConfirm={selectedQuestionIds.length > 0 ? handleDeleteSelected : handleDeleteAll}
                            okButtonProps={{ danger: true }}
                        >
                            <Button danger icon={<DeleteOutlined />}>
                                {selectedQuestionIds.length > 0
                                    ? ((isPart6 || part?.partNumber === 7) ? `Xóa đoạn văn đã chọn (${selectedPassageCount})` : `Xóa đã chọn (${selectedQuestionIds.length})`)
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
                onCancel={() => setCreatePart6ModalVisible(false)}
                onSuccess={fetchQuestions}
                partId={partId || null}
            />

            <CreatePart7Modal
                open={createPart7ModalVisible}
                onCancel={() => setCreatePart7ModalVisible(false)}
                onSuccess={fetchQuestions}
                partId={partId || null}
            />

            <Modal
                title="Thêm câu hỏi mới"
                open={createModalVisible}
                onCancel={() => setCreateModalVisible(false)}
                onOk={() => createForm.submit()}
                width={600}
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
                        <Form.Item label="Đoạn văn" name="passage" rules={[{ required: true, message: 'Vui lòng nhập đoạn văn' }]}>
                            <ReactQuill theme="snow" modules={quillModules} formats={quillFormats} placeholder="Nhập đoạn văn..." style={{ height: 200, marginBottom: 50 }} />
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
                    <Form.Item label="Giải thích" name="explanation">
                        <ReactQuill theme="snow" modules={quillModules} formats={quillFormats} />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Chỉnh sửa câu hỏi"
                open={editModalVisible}
                onCancel={() => setEditModalVisible(false)}
                onOk={() => editForm.submit()}
                width={600}
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
                    <Form.Item label="Giải thích" name="explanation">
                        <ReactQuill theme="snow" modules={quillModules} formats={quillFormats} />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Edit Passage Modal */}
            <Modal
                title="Chỉnh sửa Đoạn văn"
                open={editPassageModalVisible}
                onCancel={() => setEditPassageModalVisible(false)}
                onOk={() => passageForm.submit()}
                width={800}
            >
                <Form form={passageForm} layout="vertical" onFinish={handleUpdatePassage}>
                    {part?.partNumber === 7 && (
                        <Form.Item name="passageType" initialValue="both" style={{ marginBottom: 16 }}>
                            <Radio.Group>
                                <Radio.Button value="text">Văn bản</Radio.Button>
                                <Radio.Button value="image">Hình ảnh</Radio.Button>
                                <Radio.Button value="both">Cả hai</Radio.Button>
                            </Radio.Group>
                        </Form.Item>
                    )}

                    {/* Image Section - Show if 'image' or 'both' (or if not Part 7, never show? Actually Part 6 is text only usually) */}
                    {(part?.partNumber === 7) && (
                        <Form.Item
                            noStyle
                            shouldUpdate={(prevValues, currentValues) => prevValues.passageType !== currentValues.passageType}
                        >
                            {({ getFieldValue }) => {
                                const type = getFieldValue('passageType');
                                if (type === 'image' || type === 'both') {
                                    return (
                                        <Form.Item label="Hình ảnh đoạn văn" name="passageFiles">
                                            <div style={{ marginBottom: 16 }}>
                                                <Dragger
                                                    fileList={editPassageFileList}
                                                    multiple
                                                    listType="picture-card"
                                                    beforeUpload={(file) => {
                                                        setEditPassageFileList(prev => [...prev, file]);
                                                        return false;
                                                    }}
                                                    onRemove={(file) => {
                                                        setEditPassageFileList(prev => {
                                                            const index = prev.indexOf(file);
                                                            const newFileList = prev.slice();
                                                            newFileList.splice(index, 1);
                                                            return newFileList;
                                                        });
                                                    }}
                                                    accept="image/*"
                                                >
                                                    <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                                                    <p className="ant-upload-text">Kéo thả hoặc chọn ảnh để cập nhật</p>
                                                </Dragger>
                                            </div>
                                        </Form.Item>
                                    );
                                }
                                return null;
                            }}
                        </Form.Item>
                    )}

                    {/* Text Section - Show if 'text' or 'both', AND always for Part 6 */}
                    <Form.Item
                        noStyle
                        shouldUpdate={(prevValues, currentValues) => prevValues.passageType !== currentValues.passageType}
                    >
                        {({ getFieldValue }) => {
                            const type = getFieldValue('passageType');
                            // Always show for Part 6, or if Part 7 and type is text/both
                            if (part?.partNumber !== 7 || type === 'text' || type === 'both') {
                                return (
                                    <Form.Item label="Nội dung văn bản" name="passage">
                                        <ReactQuill
                                            theme="snow"
                                            modules={quillModules}
                                            formats={quillFormats}
                                            style={{ height: 300, marginBottom: 50 }}
                                            placeholder="Nhập nội dung văn bản..."
                                        />
                                    </Form.Item>
                                );
                            }
                            return null;
                        }}
                    </Form.Item>
                </Form>
            </Modal>

            <Drawer
                title={`Import Excel - ${part.partName}`}
                width={500}
                open={importDrawerVisible}
                onClose={() => setImportDrawerVisible(false)}
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate} block>
                        Tải file mẫu
                    </Button>
                    <div style={{ margin: '20px 0' }}>
                        <Upload
                            accept=".xlsx, .xls"
                            beforeUpload={handleExcelUpload}
                            showUploadList={false}
                        >
                            <Button icon={<UploadOutlined />} type="primary" block>
                                Chọn file Excel
                            </Button>
                        </Upload>
                    </div>
                    <Select
                        value={importMode}
                        onChange={setImportMode}
                        style={{ width: '100%' }}
                        options={[
                            { value: 'append', label: 'Thêm vào (Giữ cũ)' },
                            { value: 'replace', label: 'Ghi đè (Xóa cũ)' }
                        ]}
                    />
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
