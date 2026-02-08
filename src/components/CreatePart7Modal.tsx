import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message, Card, Upload, Radio, Collapse, Alert } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import ReactQuill from 'react-quill-new';
import 'quill/dist/quill.snow.css';
import api, { uploadImage } from '../services/api';

const { Option } = Select;
const { Dragger } = Upload;
const { TextArea } = Input;

interface CreatePart7ModalProps {
    open: boolean;
    onCancel: () => void;
    onSuccess: () => void;
    partId: string | null;
}

export default function CreatePart7Modal({ open, onCancel, onSuccess, partId }: CreatePart7ModalProps) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [passageType, setPassageType] = useState<'image' | 'text' | 'both'>('image');
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
            let nextAvailable = 147;
            for (let i = 147; i <= 200; i++) {
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


    const handleSubmit = async (values: any) => {
        if (!partId) return;

        // Validation: Must have at least image OR text
        if (passageType === 'image' && fileList.length === 0) {
            message.error('Vui lòng upload ít nhất 1 ảnh đề bài!');
            return;
        }

        if (passageType === 'text' && !values.passageText) {
            message.error('Vui lòng nhập nội dung đoạn văn!');
            return;
        }

        if (passageType === 'both' && fileList.length === 0 && !values.passageText) {
            message.error('Vui lòng upload ảnh hoặc nhập text!');
            return;
        }

        try {
            setLoading(true);
            const { passageText, passageTitle, questions } = values;

            let passageHtml = '';

            // 0. Add Title (Always if provided)
            if (passageTitle) {
                passageHtml += `<p><b>${passageTitle}</b></p>`;
            }

            // 1. Handle Image Upload (if any)
            if (fileList.length > 0) {
                const uploadedUrls: string[] = [];

                for (const file of fileList) {
                    const fileToUpload = file.originFileObj || (file as any);

                    if (fileToUpload) {
                        const res = await uploadImage(fileToUpload);

                        if (res.success) {
                            uploadedUrls.push(res.url);
                        } else {
                            throw new Error(res.message || 'Failed to upload image');
                        }
                    }
                }

                // Add images to passage HTML
                passageHtml += uploadedUrls.map(url =>
                    `<img src="${url}" style="max-width: 100%; display: block; margin-bottom: 10px;" />`
                ).join('');
            }

            // 2. Handle Text Input (if any)
            if (passageText) {
                passageHtml += passageText;
            }

            // 3. Prepare Payload
            const payload = {
                passage: passageHtml,
                questions: questions.map((q: any) => ({
                    questionNumber: q.questionNumber,
                    questionText: q.questionText,
                    optionA: q.optionA,
                    optionB: q.optionB,
                    optionC: q.optionC,
                    optionD: q.optionD,
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation,
                    relatedPassage: q.relatedPassage
                }))
            };

            const response = await api.post(`/parts/${partId}/questions/batch`, payload);

            if (response.data.success) {
                message.success('Tạo nhóm câu hỏi thành công');
                onSuccess();
                form.resetFields();
                setFileList([]);
                setPassageType('image');
                onCancel();
            } else {
                message.error(response.data.message || 'Tạo thất bại');
            }

        } catch (error: any) {
            console.error('Create Part 7 error:', error);
            // Show detailed error
            const errorMsg = error.response?.data?.message || error.message || 'Có lỗi xảy ra khi upload ảnh hoặc lưu câu hỏi';
            message.error(`Lỗi: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const handleOk = () => {
        form.validateFields().then(values => handleSubmit(values));
    };

    const uploadProps: UploadProps = {
        onRemove: (file) => {
            const index = fileList.indexOf(file);
            const newFileList = fileList.slice();
            newFileList.splice(index, 1);
            setFileList(newFileList);
        },
        beforeUpload: (file) => {
            setFileList(prev => [...prev, file]); // Use functional update
            return false;
        },
        fileList,
        multiple: true,
        listType: 'picture-card',
        accept: 'image/*'
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
            title="Nhập đề Part 7"
            open={open}
            onCancel={onCancel}
            onOk={handleOk}
            width={1000}
            confirmLoading={loading}
            style={{ top: 20 }}
            maskClosable={false}
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={{}}
            >
                <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }}>
                    {/* Passage Type Selector */}
                    <Card title="Chọn cách nhập đoạn văn" size="small" style={{ marginBottom: 16 }}>
                        <Form.Item
                            label="Tiêu đề (VD: Questions 147-148 refer to the following notice)"
                            name="passageTitle"
                            style={{ marginBottom: 16 }}
                        >
                            <Input placeholder="Nhập tiêu đề..." style={{ fontWeight: 600 }} />
                        </Form.Item>

                        <Radio.Group
                            value={passageType}
                            onChange={(e) => setPassageType(e.target.value)}
                            style={{ marginBottom: 16 }}
                        >
                            <Radio.Button value="image">Chỉ upload ảnh</Radio.Button>
                            <Radio.Button value="text">Chỉ nhập text</Radio.Button>
                            <Radio.Button value="both">Cả ảnh và text</Radio.Button>
                        </Radio.Group>

                        <div style={{ color: '#666', fontSize: 13 }}>
                            {passageType === 'image' && '📷 Phù hợp cho: Notice, Form, Chart phức tạp'}
                            {passageType === 'text' && '✍️ Phù hợp cho: Email, Article, Text message'}
                            {passageType === 'both' && '🖼️ Phù hợp cho: Kết hợp ảnh + text bổ sung'}
                        </div>
                    </Card>

                    {/* Image Upload Section */}
                    {(passageType === 'image' || passageType === 'both') && (
                        <Card title="Upload Ảnh Đề Bài" size="small" style={{ marginBottom: 16 }}>
                            <div style={{ padding: 10, background: '#f9f9f9', borderRadius: 4 }}>
                                <p style={{ color: '#666', marginBottom: 10 }}>
                                    Hỗ trợ upload nhiều ảnh (Single, Double, Triple passages). Thứ tự ảnh sẽ hiển thị từ trên xuống dưới.
                                </p>
                                <Dragger {...uploadProps} style={{ background: '#fff' }}>
                                    <p className="ant-upload-drag-icon">
                                        <InboxOutlined />
                                    </p>
                                    <p className="ant-upload-text">Kéo thả ảnh vào đây hoặc click để chọn</p>
                                    <p className="ant-upload-hint">
                                        Hỗ trợ: JPG, PNG. Dung lượng tối đa 5MB/ảnh.
                                    </p>
                                </Dragger>
                            </div>
                        </Card>
                    )}

                    {/* Text Input Section */}
                    {(passageType === 'text' || passageType === 'both') && (
                        <Card title="Nhập Nội Dung Đoạn Văn" size="small" style={{ marginBottom: 16 }}>
                            <Form.Item
                                label="Nội dung đoạn văn"
                                name="passageText"
                            >
                                <ReactQuill
                                    theme="snow"
                                    modules={quillModules}
                                    formats={quillFormats}
                                    placeholder="Nhập nội dung email, article, text message..."
                                    style={{ backgroundColor: '#fff' }}
                                />
                            </Form.Item>
                        </Card>
                    )}

                    {/* Question Range and List */}
                    <Card
                        title={<span style={{ color: '#1890ff', fontWeight: 600 }}>Danh sách câu hỏi</span>}
                        style={{ border: '1px solid #d9d9d9' }}
                        headStyle={{ backgroundColor: '#f0f5ff' }}
                    >
                        {/* Range Selector */}
                        <div style={{ display: 'flex', gap: 16, marginBottom: 16, padding: '12px', backgroundColor: '#fafafa', borderRadius: 4 }}>
                            <Form.Item
                                label="Từ câu"
                                name="startQuestion"
                                rules={[
                                    { required: true, message: 'Vui lòng nhập số câu bắt đầu' },
                                    {
                                        validator: (_, value) => {
                                            if (!value) return Promise.resolve();
                                            const num = Number(value);
                                            if (num < 147 || num > 200) {
                                                return Promise.reject('Số câu phải từ 147-200');
                                            }
                                            return Promise.resolve();
                                        }
                                    }
                                ]}
                                style={{ marginBottom: 0, width: 100 }}
                            >
                                <Input
                                    type="number"
                                    min={147}
                                    max={200}
                                    placeholder="147"
                                    style={{ fontWeight: 600 }}
                                    onChange={(e) => {
                                        const startNum = Number(e.target.value);
                                        const endNum = form.getFieldValue('endQuestion');
                                        checkDuplicateRange(startNum, endNum);
                                    }}
                                />
                            </Form.Item>
                            <Form.Item
                                label="Đến câu"
                                name="endQuestion"
                                rules={[
                                    { required: true, message: 'Vui lòng nhập số câu kết thúc' },
                                    {
                                        validator: (_, value) => {
                                            if (!value) return Promise.resolve();
                                            const num = Number(value);
                                            if (num < 147 || num > 200) {
                                                return Promise.reject('Số câu phải từ 147-200');
                                            }
                                            return Promise.resolve();
                                        }
                                    }
                                ]}
                                style={{ marginBottom: 0, width: 100 }}
                            >
                                <Input
                                    type="number"
                                    min={147}
                                    max={200}
                                    placeholder="148"
                                    style={{ fontWeight: 600 }}
                                    onChange={(e) => {
                                        const endNum = Number(e.target.value);
                                        const startNum = form.getFieldValue('startQuestion');
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

                        <div style={{ fontWeight: 500, marginBottom: 8, color: '#595959' }}>Danh sách câu hỏi:</div>

                        {/* Dynamic Question Generation based on Range */}
                        <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => {
                            const prevStart = prevValues.startQuestion;
                            const prevEnd = prevValues.endQuestion;
                            const currStart = currentValues.startQuestion;
                            const currEnd = currentValues.endQuestion;
                            return prevStart !== currStart || prevEnd !== currEnd;
                        }}>
                            {({ getFieldValue }) => {
                                const startQ = getFieldValue('startQuestion');
                                const endQ = getFieldValue('endQuestion');

                                // Only show questions if both start and end are filled
                                if (!startQ || !endQ || startQ > endQ) {
                                    return <div style={{ padding: '20px', textAlign: 'center', color: '#8c8c8c', backgroundColor: '#fafafa', borderRadius: 4 }}>
                                        Vui lòng nhập "Từ câu" và "Đến câu" để hiển thị form nhập câu hỏi
                                    </div>;
                                }

                                // Convert to numbers to prevent string concatenation
                                const startNum = Number(startQ);
                                const endNum = Number(endQ);
                                const numQuestions = Math.max(0, Math.min(54, endNum - startNum + 1)); // Max 54 questions for Part 7

                                // Ensure questions array has the right length and correct question numbers
                                const currentQuestions = getFieldValue('questions') || [];
                                let needsUpdate = false;

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
                                    // wrapper to avoid immediate state update loop during render
                                    setTimeout(() => {
                                        form.setFieldValue('questions', newQuestions);
                                    }, 0);
                                }

                                return (
                                    <Form.List name="questions">
                                        {(questionFields) => (
                                            <Collapse size="small" defaultActiveKey={questionFields.map((_, i) => i.toString())}>
                                                {questionFields.map((qField, qIndex) => {
                                                    const questionNum = Number(startQ) + qIndex;
                                                    return (
                                                        <Collapse.Panel header={`Câu ${questionNum}`} key={qField.key}>
                                                            <Form.Item
                                                                {...qField}
                                                                label="Nội dung câu hỏi"
                                                                name={[qField.name, 'questionText']}
                                                                style={{ marginBottom: 12 }}
                                                            >
                                                                <Input placeholder="VD: What is suggested about..." />
                                                            </Form.Item>

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
                </div>
            </Form>
        </Modal>
    );
}
