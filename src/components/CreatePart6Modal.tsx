import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Card, message, Button, Collapse, Alert } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import ReactQuill from 'react-quill-new';
import 'quill/dist/quill.snow.css';

const { TextArea } = Input;
const { Option } = Select;
import api from '../services/api';

interface CreatePart6ModalProps {
    open: boolean;
    onCancel: () => void;
    onSuccess: () => void;
    partId: string | null;
}

export default function CreatePart6Modal({ open, onCancel, onSuccess, partId }: CreatePart6ModalProps) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [existingQuestionNumbers, setExistingQuestionNumbers] = useState<number[]>([]);
    const [duplicateWarning, setDuplicateWarning] = useState<string>('');

    // Fetch existing questions when modal opens
    useEffect(() => {
        if (open && partId) {
            fetchExistingQuestions();
        }
    }, [open, partId]);

    const fetchExistingQuestions = async () => {
        if (!partId) return;
        try {
            const response = await api.get(`/parts/${partId}/questions`);
            if (response.data.success) {
                const numbers = response.data.questions.map((q: any) => q.questionNumber);
                setExistingQuestionNumbers(numbers);
            }
        } catch (error) {
            console.error('Error fetching questions:', error);
        }
    };

    const checkDuplicateRange = (startNum: number, endNum: number) => {
        if (!startNum || !endNum) {
            setDuplicateWarning('');
            return;
        }

        const requestedNumbers = [];
        for (let i = startNum; i <= endNum; i++) {
            requestedNumbers.push(i);
        }

        const duplicates = requestedNumbers.filter(num => existingQuestionNumbers.includes(num));

        if (duplicates.length > 0) {
            // Find next available number
            let nextAvailable = 131;
            for (let i = 131; i <= 146; i++) {
                if (!existingQuestionNumbers.includes(i)) {
                    nextAvailable = i;
                    break;
                }
            }

            setDuplicateWarning(
                `Các câu ${duplicates.join(', ')} đã tồn tại! Gợi ý: Bắt đầu từ câu ${nextAvailable}`
            );
        } else {
            setDuplicateWarning('');
        }
    };


    const handleCreateBatchQuestions = async (values: any) => {
        if (!partId) return;

        if (!values.passages || values.passages.length === 0) {
            message.error('Vui lòng nhập ít nhất một đoạn văn');
            return;
        }

        try {
            setLoading(true);
            const passages = values.passages;

            let successCount = 0;

            for (const item of passages) {
                // Combine Title and Passage
                const fullPassage = item.passageTitle
                    ? `<p><b>${item.passageTitle}</b></p>${item.passage}`
                    : item.passage;

                const payload = {
                    passage: fullPassage,
                    questions: item.questions
                };

                const response = await api.post(`/parts/${partId}/questions/batch`, payload);

                const data = response.data;
                if (data.success) {
                    successCount++;
                }
            }

            if (successCount === passages.length) {
                message.success(`Đã tạo thành công ${successCount} đoạn văn`);
                onSuccess();
                form.resetFields();
                onCancel();
            } else {
                message.warning(`Đã tạo ${successCount}/${passages.length} đoạn văn. Vui lòng kiểm tra lại.`);
                onSuccess();
            }
        } catch (error) {
            console.error('Batch create error:', error);
            message.error('Có lỗi xảy ra khi tạo câu hỏi');
        } finally {
            setLoading(false);
        }
    };

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

    return (
        <Modal
            title="Nhập đề part 6"
            open={open}
            onCancel={onCancel}
            onOk={() => form.submit()}
            confirmLoading={loading}
            width={900}
            style={{ top: 20 }}
            maskClosable={false}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleCreateBatchQuestions}
                initialValues={{
                    // Start with one empty passage
                    passages: [{}]
                }}
            >
                <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }}>
                    <Form.List name="passages">
                        {(fields, { add, remove }) => (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                {fields.map((field, index) => (
                                    <Card
                                        key={field.key}
                                        title={<span style={{ color: '#1890ff', fontWeight: 600 }}>Đoạn văn {index + 1}</span>}
                                        extra={
                                            <Button
                                                danger
                                                size="small"
                                                icon={<DeleteOutlined />}
                                                onClick={() => remove(field.name)}
                                                title="Xóa đoạn này"
                                            />
                                        }
                                        style={{ border: '1px solid #d9d9d9' }}
                                        headStyle={{ backgroundColor: '#f0f5ff' }}
                                    >
                                        {/* Range Selector */}
                                        <div style={{ display: 'flex', gap: 16, marginBottom: 16, padding: '12px', backgroundColor: '#fafafa', borderRadius: 4 }}>
                                            <Form.Item
                                                label="Từ câu"
                                                name={[field.name, 'startQuestion']}
                                                rules={[
                                                    { required: true, message: 'Vui lòng nhập số câu bắt đầu' },
                                                    {
                                                        validator: (_, value) => {
                                                            if (!value) return Promise.resolve();
                                                            const num = Number(value);
                                                            if (num < 131 || num > 146) {
                                                                return Promise.reject('Số câu phải từ 131-146');
                                                            }
                                                            return Promise.resolve();
                                                        }
                                                    }
                                                ]}
                                                style={{ marginBottom: 0, width: 100 }}
                                            >
                                                <Input
                                                    type="number"
                                                    min={131}
                                                    max={146}
                                                    placeholder="131"
                                                    style={{ fontWeight: 600 }}
                                                    onChange={(e) => {
                                                        const startNum = Number(e.target.value);
                                                        const passages = form.getFieldValue('passages') || [];
                                                        const endNum = passages[field.name]?.endQuestion;
                                                        checkDuplicateRange(startNum, endNum);
                                                    }}
                                                />
                                            </Form.Item>
                                            <Form.Item
                                                label="Đến câu"
                                                name={[field.name, 'endQuestion']}
                                                rules={[
                                                    { required: true, message: 'Vui lòng nhập số câu kết thúc' },
                                                    {
                                                        validator: (_, value) => {
                                                            if (!value) return Promise.resolve();
                                                            const num = Number(value);
                                                            if (num < 131 || num > 146) {
                                                                return Promise.reject('Số câu phải từ 131-146');
                                                            }
                                                            return Promise.resolve();
                                                        }
                                                    }
                                                ]}
                                                style={{ marginBottom: 0, width: 100 }}
                                            >
                                                <Input
                                                    type="number"
                                                    min={131}
                                                    max={146}
                                                    placeholder="134"
                                                    style={{ fontWeight: 600 }}
                                                    onChange={(e) => {
                                                        const endNum = Number(e.target.value);
                                                        const passages = form.getFieldValue('passages') || [];
                                                        const startNum = passages[field.name]?.startQuestion;
                                                        checkDuplicateRange(startNum, endNum);
                                                    }}
                                                />
                                            </Form.Item>
                                        </div>

                                        {/* Duplicate Warning */}
                                        {duplicateWarning && (
                                            <Alert
                                                message={duplicateWarning}
                                                type="warning"
                                                showIcon
                                                style={{ marginBottom: 16 }}
                                                closable
                                            />
                                        )}

                                        <Form.Item
                                            label="Tiêu đề (VD: Questions 131-134 refer to...)"
                                            name={[field.name, 'passageTitle']}
                                        >
                                            <Input placeholder="Nhập tiêu đề..." style={{ fontWeight: 600 }} />
                                        </Form.Item>

                                        <Form.Item
                                            label="Nội dung đoạn văn"
                                            name={[field.name, 'passage']}
                                            rules={[{ required: true, message: 'Vui lòng nhập nội dung đoạn văn' }]}
                                        >
                                            <ReactQuill
                                                theme="snow"
                                                modules={quillModules}
                                                formats={quillFormats}
                                                placeholder="Nhập nội dung đoạn văn..."
                                                style={{ backgroundColor: '#fff' }}
                                            />
                                        </Form.Item>

                                        <div style={{ fontWeight: 500, marginBottom: 8, color: '#595959' }}>Danh sách câu hỏi:</div>

                                        {/* Dynamic Question Generation based on Range */}
                                        <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => {
                                            const prevStart = prevValues.passages?.[index]?.startQuestion;
                                            const prevEnd = prevValues.passages?.[index]?.endQuestion;
                                            const currStart = currentValues.passages?.[index]?.startQuestion;
                                            const currEnd = currentValues.passages?.[index]?.endQuestion;
                                            return prevStart !== currStart || prevEnd !== currEnd;
                                        }}>
                                            {({ getFieldValue }) => {
                                                const startQ = getFieldValue(['passages', index, 'startQuestion']);
                                                const endQ = getFieldValue(['passages', index, 'endQuestion']);

                                                // Only show questions if both start and end are filled
                                                if (!startQ || !endQ || startQ > endQ) {
                                                    return <div style={{ padding: '20px', textAlign: 'center', color: '#8c8c8c', backgroundColor: '#fafafa', borderRadius: 4 }}>
                                                        Vui lòng nhập "Từ câu" và "Đến câu" để hiển thị form nhập câu hỏi
                                                    </div>;
                                                }

                                                const numQuestions = Math.max(0, Math.min(16, endQ - startQ + 1)); // Max 16 questions for Part 6

                                                // Ensure questions array has the right length and correct question numbers
                                                const currentQuestions = getFieldValue(['passages', index, 'questions']) || [];
                                                let needsUpdate = false;
                                                const startNum = Number(startQ);

                                                if (currentQuestions.length !== numQuestions) {
                                                    needsUpdate = true;
                                                } else if (currentQuestions.length > 0 && currentQuestions[0].questionNumber !== startNum) {
                                                    needsUpdate = true;
                                                }

                                                if (needsUpdate) {
                                                    const newQuestions = Array(numQuestions).fill(null).map((_, i) => {
                                                        const existing = currentQuestions[i] || {};
                                                        return {
                                                            ...existing,
                                                            correctAnswer: existing.correctAnswer || 'A',
                                                            questionNumber: startNum + i
                                                        };
                                                    });

                                                    // Use setTimeout to avoid render loop
                                                    setTimeout(() => {
                                                        form.setFieldValue(['passages', index, 'questions'], newQuestions);
                                                    }, 0);
                                                }

                                                return (
                                                    <Form.List name={[field.name, 'questions']}>
                                                        {(questionFields) => (
                                                            <Collapse size="small" defaultActiveKey={questionFields.map((_, i) => i.toString())}>
                                                                {questionFields.map((qField, qIndex) => {
                                                                    const questionNum = Number(startQ) + qIndex;
                                                                    return (
                                                                        <Collapse.Panel header={`Câu ${questionNum}`} key={qField.key}>
                                                                            <Form.Item
                                                                                {...qField}
                                                                                label="Đáp án đúng"
                                                                                name={[qField.name, 'correctAnswer']}
                                                                                rules={[{ required: true }]}
                                                                                style={{ width: 120, marginBottom: 12 }}
                                                                            >
                                                                                <Select>
                                                                                    <Option value="A">A</Option>
                                                                                    <Option value="B">B</Option>
                                                                                    <Option value="C">C</Option>
                                                                                    <Option value="D">D</Option>
                                                                                </Select>
                                                                            </Form.Item>

                                                                            {/* Hidden field to store question number */}
                                                                            <Form.Item
                                                                                {...qField}
                                                                                name={[qField.name, 'questionNumber']}
                                                                                initialValue={questionNum}
                                                                                hidden
                                                                            >
                                                                                <Input type="number" />
                                                                            </Form.Item>

                                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                                                                <Form.Item {...qField} label="A" name={[qField.name, 'optionA']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                                                                    <Input />
                                                                                </Form.Item>
                                                                                <Form.Item {...qField} label="B" name={[qField.name, 'optionB']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                                                                    <Input />
                                                                                </Form.Item>
                                                                                <Form.Item {...qField} label="C" name={[qField.name, 'optionC']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                                                                    <Input />
                                                                                </Form.Item>
                                                                                <Form.Item {...qField} label="D" name={[qField.name, 'optionD']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                                                                    <Input />
                                                                                </Form.Item>
                                                                            </div>
                                                                            <Form.Item {...qField} label="Trích đoạn văn liên quan" name={[qField.name, 'relatedPassage']} style={{ marginTop: 12, marginBottom: 8 }}>
                                                                                <TextArea rows={2} placeholder="Copy đoạn văn liên quan đến câu hỏi..." />
                                                                            </Form.Item>
                                                                            <Form.Item {...qField} label="Giải thích" name={[qField.name, 'explanation']} style={{ marginBottom: 0 }}>
                                                                                <TextArea rows={2} placeholder="Giải thích tại sao đáp án đúng..." />
                                                                            </Form.Item>
                                                                        </Collapse.Panel>
                                                                    );
                                                                })}
                                                            </Collapse>
                                                        )}
                                                    </Form.List>
                                                );
                                            }}
                                        </Form.Item>
                                    </Card>
                                ))}
                                <Button
                                    type="dashed"
                                    onClick={() => add({})}
                                    block
                                    icon={<PlusOutlined />}
                                    style={{ height: 48 }}
                                >
                                    Thêm đoạn văn mới
                                </Button>
                            </div>
                        )}
                    </Form.List>
                </div>
            </Form>
        </Modal>
    );
}
