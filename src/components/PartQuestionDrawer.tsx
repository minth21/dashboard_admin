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
    Card
} from 'antd';
import {
    DeleteOutlined,
    EditOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import ReactQuill from 'react-quill-new';
import 'quill/dist/quill.snow.css';
const { Option } = Select;
import api from '../services/api';

import CreatePart6Modal from './CreatePart6Modal';

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
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(false);
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

    // Quill editor configuration
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
    const [createForm] = Form.useForm();
    const [editForm] = Form.useForm();
    const [isPart6, setIsPart6] = useState(false);
    const [createPart6ModalVisible, setCreatePart6ModalVisible] = useState(false);

    useEffect(() => {
        if (open && partId) {
            fetchQuestions();
            checkPartType();
        }
    }, [open, partId]);



    const checkPartType = async () => {
        if (!partId) return;
        try {
            const response = await api.get(`/parts/${partId}`);
            const data = response.data;
            if (data.success) {
                if (data.part.partNumber === 6) {
                    setIsPart6(true);
                } else {
                    setIsPart6(false);
                }
            }
        } catch (error) {
            console.error('Error checking part type:', error);
        }
    };

    const fetchQuestions = async () => {
        if (!partId) return;
        try {
            setLoading(true);
            const response = await api.get(`/parts/${partId}/questions`);
            const data = response.data;
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
            const response = await api.post(`/parts/${partId}/questions`, values);
            const data = response.data;
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

            // Logic specifically for Part 6: Sync passage across the group (sets of 4)
            if (isPart6 && values.passage) {
                const qNum = editingQuestion.questionNumber;
                // Calculate group range (e.g., 1-4, 5-8, 9-12...)
                // index (0-based) = qNum - 1
                // groupIndex = floor((qNum - 1) / 4)
                // startQ = groupIndex * 4 + 1
                // endQ = startQ + 3
                const groupIndex = Math.floor((qNum - 1) / 4);
                const startQ = groupIndex * 4 + 1;
                const endQ = startQ + 3;

                // Find all questions in this group (including the current one)
                const groupQuestions = questions.filter(
                    q => q.questionNumber >= startQ && q.questionNumber <= endQ
                );

                // Update requests
                const updatePromises = groupQuestions.map(q => {
                    const isCurrent = q.id === editingQuestion.id;
                    // For current question: update ALL fields from values
                    // For neighbors: update ONLY passage
                    const payload = isCurrent ? values : { passage: values.passage };

                    return api.patch(`/questions/${q.id}`, payload).then(res => res.data);
                });

                const results = await Promise.all(updatePromises);

                // Check if any failed
                const failed = results.find(r => !r.success);
                if (failed) {
                    message.error('Có lỗi xảy ra khi đồng bộ đoạn văn');
                    return;
                }

                message.success('Cập nhật câu hỏi và đồng bộ đoạn văn thành công');

                // Update local state for ALL affected questions
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
                const response = await api.patch(`/questions/${editingQuestion.id}`, values);
                const data = response.data;
                console.log('Update response:', data); // Debug log

                if (data.success) {
                    message.success('Cập nhật câu hỏi thành công');

                    // Update local state instead of refetching to avoid triggering auto-open
                    setQuestions(prevQuestions =>
                        prevQuestions.map(q =>
                            q.id === editingQuestion.id ? data.question : q
                        )
                    );
                } else {
                    message.error(data.message || 'Cập nhật câu hỏi thất bại');
                    return; // Stop here
                }
            }

            setEditModalVisible(false);
            setEditingQuestion(null);
            editForm.resetFields();

        } catch (error) {
            console.error('Update error:', error); // Debug log
            message.error('Có lỗi xảy ra');
        }
    };



    const handleDeleteAllQuestions = async () => {
        if (!partId) return;

        try {
            const response = await api.delete(`/parts/${partId}/questions`);
            const data = response.data;

            if (data.success) {
                message.success(data.message || 'Xóa tất cả câu hỏi thành công');
                fetchQuestions();
            } else {
                message.error(data.message || 'Không thể xóa câu hỏi');
            }
        } catch (error) {
            message.error('Có lỗi xảy ra khi xóa câu hỏi');
        }
    };

    // Calculate row spans for Part 6 passages
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
        ...(isPart6 ? [{
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
        {
            title: 'Câu hỏi',
            dataIndex: 'questionText',
            key: 'questionText',
            render: (text, record) => (
                <div style={{ maxWidth: 400 }}>
                    {!isPart6 && record.passage && (
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
            width: 100,
            align: 'center',
            render: (text) => <Tag color="green">{text}</Tag>,
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 100,
            align: 'center',
            render: (_, record) => (
                <Button
                    type="link"
                    icon={<EditOutlined />}
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
            ),
        },
    ];

    // Helper to group questions by passage for Part 6
    const renderPart6Layout = () => {
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
                {groups.map((group, index) => (
                    <Card key={index} style={{ marginBottom: 24, border: '1px solid #d9d9d9' }} bodyStyle={{ padding: '0' }}>
                        {/* Header: Passage */}
                        <div style={{
                            padding: '16px',
                            borderBottom: '1px solid #f0f0f0',
                            background: '#fafafa',
                            maxHeight: 300,
                            overflowY: 'auto'
                        }}>
                            <div style={{ fontWeight: 600, marginBottom: 8, color: '#1890ff' }}>Đoạn văn {index + 1}:</div>
                            <div dangerouslySetInnerHTML={{ __html: group.passage }} />
                        </div>

                        {/* Body: Questions */}
                        <div style={{ padding: '16px' }}>
                            <List
                                grid={{ gutter: 16, column: 1 }} // List items stack vertically
                                dataSource={group.questions}
                                renderItem={(item) => (
                                    <List.Item>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #f0f0f0' }}>
                                            <div style={{ flex: 1 }}>
                                                <strong style={{ marginRight: 8, color: '#1890ff' }}>{item.questionNumber}.</strong>
                                                <Space size="large">
                                                    <span>A. {item.optionA}</span>
                                                    <span>B. {item.optionB}</span>
                                                    <span>C. {item.optionC}</span>
                                                    <span>D. {item.optionD}</span>
                                                </Space>
                                            </div>
                                            <div>
                                                <Space>
                                                    <Tag color="green">{item.correctAnswer}</Tag>
                                                    <Button
                                                        type="link"
                                                        icon={<EditOutlined />}
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
                                                    >
                                                        Sửa
                                                    </Button>
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

    return (
        <Drawer
            title={`Quản lý câu hỏi - ${partName}`}
            width={720}
            onClose={onClose}
            open={open}
            extra={
                <Space>
                    {selectedQuestionIds.length > 0 ? (
                        <Popconfirm
                            title="Xóa các câu hỏi đã chọn"
                            description={`Bạn có chắc chắn muốn xóa ${selectedQuestionIds.length} câu hỏi đã chọn?`}
                            onConfirm={async () => {
                                try {
                                    const response = await api.delete('/questions/bulk', {
                                        data: { questionIds: selectedQuestionIds }
                                    });
                                    const data = response.data;
                                    if (data.success) {
                                        message.success(data.message || `Đã xóa ${selectedQuestionIds.length} câu hỏi`);
                                        setSelectedQuestionIds([]);
                                        fetchQuestions();
                                    } else {
                                        message.error(data.message || 'Không thể xóa câu hỏi');
                                    }
                                } catch (error) {
                                    message.error('Có lỗi xảy ra khi xóa câu hỏi');
                                }
                            }}
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                        >
                            <Button
                                danger
                                icon={<DeleteOutlined />}
                            >
                                Xóa đã chọn ({selectedQuestionIds.length})
                            </Button>
                        </Popconfirm>
                    ) : (
                        questions.length > 0 && (
                            <Popconfirm
                                title="Xóa tất cả câu hỏi"
                                description={`Bạn có chắc chắn muốn xóa tất cả ${questions.length} câu hỏi? Hành động này không thể hoàn tác!`}
                                onConfirm={handleDeleteAllQuestions}
                                okText="Xóa"
                                cancelText="Hủy"
                                okButtonProps={{ danger: true }}
                            >
                                <Button
                                    danger
                                    icon={<DeleteOutlined />}
                                >
                                    Xóa tất cả
                                </Button>
                            </Popconfirm>
                        )
                    )}


                </Space>
            }
        >
            {isPart6 ? renderPart6Layout() : (
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

            {/* Create Batch Modal (Part 6) */}
            <CreatePart6Modal
                open={createPart6ModalVisible}
                onCancel={() => setCreatePart6ModalVisible(false)}
                onSuccess={fetchQuestions}
                partId={partId}
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
                            style={{ width: 120 }}
                        >
                            <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item
                            label="Đáp án đúng"
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

                    {/* Passage field for Part 6 */}
                    {isPart6 && (
                        <Form.Item label="Đoạn văn" name="passage">
                            <ReactQuill
                                theme="snow"
                                modules={quillModules}
                                formats={quillFormats}
                                placeholder="Nhập đoạn văn..."
                            />
                        </Form.Item>
                    )}

                    {/* Question text field for Part 5 (optional/hidden for Part 6) */}
                    {!isPart6 && (
                        <Form.Item
                            label="Nội dung câu hỏi"
                            name="questionText"
                            rules={[{ required: true }]}
                        >
                            <ReactQuill
                                theme="snow"
                                modules={quillModules}
                                formats={quillFormats}
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

                    <Form.Item label="Giải thích (Optional)" name="explanation">
                        <ReactQuill
                            theme="snow"
                            modules={quillModules}
                            formats={quillFormats}
                            placeholder="Nhập giải thích..."
                        />
                    </Form.Item>
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
                            style={{ width: 120 }}
                        >
                            <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item
                            label="Đáp án đúng"
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

                    {/* Passage field for Part 6 */}
                    {editingQuestion?.passage && (
                        <Form.Item label="Đoạn văn" name="passage">
                            <ReactQuill
                                theme="snow"
                                modules={quillModules}
                                formats={quillFormats}
                                placeholder="Nhập đoạn văn..."
                            />
                        </Form.Item>
                    )}

                    {/* Question text field for Part 5 (optional for Part 6) */}
                    {/* Question text field for Part 5 (optional for Part 6) */}
                    {!editingQuestion?.passage && (
                        <Form.Item
                            label="Nội dung câu hỏi"
                            name="questionText"
                            rules={[{ required: true }]}
                        >
                            <ReactQuill
                                theme="snow"
                                modules={quillModules}
                                formats={quillFormats}
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

                    <Form.Item label="Giải thích (Optional)" name="explanation">
                        <ReactQuill
                            theme="snow"
                            modules={quillModules}
                            formats={quillFormats}
                            placeholder="Nhập giải thích..."
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </Drawer>
    );
}
