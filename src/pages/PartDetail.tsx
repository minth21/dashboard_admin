import { useState, useEffect } from 'react';
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
    Upload
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
import api from '../services/api';

// --- Interfaces ---
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
    passage?: string;
}

interface Part {
    id: string;
    partNumber: number;
    partName: string;
    instructions?: string;
    totalQuestions: number;
    testId: string;
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
            console.log('DEBUG API RESPONSE:', response.data); // Log full API response
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

            let passageContent = values.passage;

            // Handle Part 7 Image Uploads
            if (part?.partNumber === 7) {
                // Upload new images logic
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
                                headers: { 'Content-Type': 'multipart/form-data' }
                            });
                            if (res.data.success) {
                                uploadedUrls.push(res.data.url);
                            } else {
                                throw new Error('Failed to upload image during update');
                            }
                        }
                    }
                }

                // Construct new HTML
                passageContent = uploadedUrls.map(url =>
                    `<img src="${url}" style="max-width: 100%; display: block; margin-bottom: 10px;" />`
                ).join('');
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
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
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



    // --- Render Logic: Layouts ---
    const renderGroupedLayout = () => {
        if (!questions || questions.length === 0) return <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>Chưa có câu hỏi nào</div>;

        // Sort questions by number
        const sortedQuestions = [...questions].sort((a, b) => a.questionNumber - b.questionNumber);

        // Group by passage (normalized)
        const groups: { passage: string; questions: Question[] }[] = [];
        let currentGroup: { passage: string; questions: Question[] } | null = null;

        // Normalization: Remove HTML tags and extra whitespace to compare text content only
        const normalizePassageContent = (p?: string) => {
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
            const normalizedPassage = normalizePassageContent(passage);
            const lastGroupPassage = currentGroup ? normalizePassageContent(currentGroup.passage) : '';

            // Group if content matches (ignoring HTML structure differences)
            if (!currentGroup || normalizedPassage !== lastGroupPassage) {
                currentGroup = { passage: passage, questions: [] };
                groups.push(currentGroup);
            }
            currentGroup.questions.push(q);
        });

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
                                <div style={{ fontWeight: 600, color: '#1890ff' }}>Đoạn văn {index + 1}:</div>
                                <Button size="small" type="primary" ghost icon={<EditOutlined />} onClick={() => {
                                    setCurrentPassageQuestions(group.questions);

                                    if (part?.partNumber === 7) {
                                        // Parse HTML to get images
                                        const passageHtml = group.passage || '';
                                        const imgRegex = /<img[^>]+src="([^">]+)"/g;
                                        let match;
                                        const files = [];
                                        let idCounter = 0;

                                        // Reset regex index
                                        while ((match = imgRegex.exec(passageHtml)) !== null) {
                                            files.push({
                                                uid: `-${idCounter++}`,
                                                name: `image-${idCounter}.png`,
                                                status: 'done',
                                                url: match[1]
                                            });
                                        }
                                        setEditPassageFileList(files);
                                        // Set dummy value to pass required check
                                        passageForm.setFieldsValue({ passageFiles: files });
                                    } else {
                                        passageForm.setFieldsValue({ passage: group.passage });
                                    }
                                    setEditPassageModalVisible(true);
                                }}>
                                    Sửa đoạn văn
                                </Button>
                            </div>
                            <div className="passage-content" dangerouslySetInnerHTML={{ __html: group.passage || '<p><i>(Không có nội dung đoạn văn)</i></p>' }} />
                        </div>
                        <div style={{ padding: '16px' }}>
                            <List
                                grid={{ gutter: 16, column: 1 }}
                                dataSource={group.questions}
                                renderItem={(item) => (
                                    <List.Item>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #f0f0f0' }}>
                                            <div style={{ flex: 1 }}>
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
        {
            title: 'Câu hỏi',
            dataIndex: 'questionText',
            key: 'questionText',
            render: (text, record) => (
                <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <b style={{ marginRight: 5, whiteSpace: 'nowrap' }}>{record.questionNumber}.</b>
                        {/* Remove default margins from p tags inside the content to keep it compact */}
                        <div
                            dangerouslySetInnerHTML={{ __html: text || '(Không có nội dung)' }}
                            style={{ margin: 0, '& p': { margin: 0 } } as any}
                        />
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: 4, marginLeft: 25 }}>
                        A. {record.optionA} / B. {record.optionB} / C. {record.optionC} / D. {record.optionD}
                    </div>
                </div>
            )
        },
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
                    editForm.setFieldsValue(record);
                    setEditModalVisible(true);
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
                                    else setCreateModalVisible(true);
                                }}
                            >
                                {isPart6 || part.partNumber === 7 ? 'Thêm đoạn văn' : 'Thêm mới'}
                            </Button>
                            {part?.partNumber !== 6 && part?.partNumber !== 7 && (
                                <Button icon={<UploadOutlined />} onClick={() => setImportDrawerVisible(true)}>
                                    Import Excel
                                </Button>
                            )}
                        </Space>
                        {(isPart6 || part.partNumber === 7) ? (
                            <Popconfirm
                                title="Xóa TOÀN BỘ câu hỏi của phần này?"
                                onConfirm={handleDeleteAll}
                                okButtonProps={{ danger: true }}
                            >
                                <Button danger icon={<DeleteOutlined />}>Xóa tất cả</Button>
                            </Popconfirm>
                        ) : (
                            <Popconfirm
                                title={selectedQuestionIds.length > 0
                                    ? `Xóa ${selectedQuestionIds.length} câu đã chọn?`
                                    : "Xóa TOÀN BỘ câu hỏi của phần này?"}
                                onConfirm={selectedQuestionIds.length > 0 ? handleDeleteSelected : handleDeleteAll}
                                okButtonProps={{ danger: true }}
                            >
                                <Button danger icon={<DeleteOutlined />}>
                                    {selectedQuestionIds.length > 0 ? `Xóa đã chọn (${selectedQuestionIds.length})` : 'Xóa tất cả'}
                                </Button>
                            </Popconfirm>
                        )}
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
                title="Chỉnh sửa Đoạn văn (Part 6)"
                open={editPassageModalVisible}
                onCancel={() => setEditPassageModalVisible(false)}
                onOk={() => passageForm.submit()}
                width={800}
            >
                <Form form={passageForm} layout="vertical" onFinish={handleUpdatePassage}>
                    {part?.partNumber === 7 ? (
                        <Form.Item label="Hình ảnh đoạn văn (Upload để thay đổi)" name="passageFiles">
                            {/* Custom UI for Images handled by state, but we sync with Form value */}
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
                    ) : (
                        <Form.Item label="Nội dung đoạn văn" name="passage" rules={[{ required: true, message: 'Vui lòng nhập nội dung đoạn văn' }]}>
                            <ReactQuill theme="snow" modules={quillModules} formats={quillFormats} style={{ height: 300, marginBottom: 50 }} />
                        </Form.Item>
                    )}
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
        </div>
    );
}
