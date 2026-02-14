import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message, Upload, Button, InputNumber, Card, Space } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import api, { uploadApi } from '../services/api';

const { Option } = Select;

interface CreatePart3ModalProps {
    open: boolean;
    onCancel: () => void;
    onSuccess: () => void;
    partId: string | null;
    partNumber: number; // 3 or 4
}

export default function CreatePart3Modal({ open, onCancel, onSuccess, partId, partNumber }: CreatePart3ModalProps) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [audioFileList, setAudioFileList] = useState<UploadFile[]>([]);
    const [nextQuestionNumber, setNextQuestionNumber] = useState<number>(1);

    useEffect(() => {
        if (open && partId) {
            fetchNextQuestionNumber();
        } else {
            form.resetFields();
            setAudioFileList([]);
        }
    }, [open, partId]);

    const fetchNextQuestionNumber = async () => {
        if (!partId) return;
        try {
            const response = await api.get(`/parts/${partId}/questions`);
            if (response.data.success) {
                const questions = response.data.questions;
                if (questions.length > 0) {
                    const maxNum = Math.max(...questions.map((q: any) => q.questionNumber));
                    setNextQuestionNumber(maxNum + 1);
                } else {
                    setNextQuestionNumber(partNumber === 3 ? 32 : 71); // Default start for Part 3/4
                }
            }
        } catch (error) {
            console.error('Error fetching questions:', error);
        }
    };

    // Initialize form with 3 questions
    useEffect(() => {
        if (open) {
            const initialQuestions = [0, 1, 2].map(i => ({
                questionNumber: nextQuestionNumber + i,
                questionText: '',
                optionA: '',
                optionB: '',
                optionC: '',
                optionD: '',
                correctAnswer: undefined
            }));
            form.setFieldsValue({ questions: initialQuestions });
        }
    }, [open, nextQuestionNumber]);

    const handleAudioUpload = (file: UploadFile) => {
        setAudioFileList([file]);
        return false;
    };

    const handleSubmit = async (values: any) => {
        if (!partId) return;

        if (audioFileList.length === 0) {
            message.error('Vui lòng upload file âm thanh!');
            return;
        }

        try {
            setLoading(true);

            // 1. Upload Shared Audio
            const actualFile = (audioFileList[0] as any)?.originFileObj || audioFileList[0];
            const audioRes = await uploadApi.audio(actualFile);

            if (!audioRes.success) {
                throw new Error(audioRes.message || 'Upload âm thanh thất bại');
            }
            const audioUrl = audioRes.url;

            // 2. Prepare Batch Questions
            // Backend expects: { passage: "AUDIO_GROUP", questions: [...], audioUrl: "..." }
            // Since reusing createBatchQuestions which might expect 'passage', we can send a placeholder or empty string.
            // But we specifically added audioUrl support to backend.

            const questionsPayload = values.questions.map((q: any) => ({
                questionNumber: q.questionNumber,
                questionText: q.questionText,
                optionA: q.optionA,
                optionB: q.optionB,
                optionC: q.optionC,
                optionD: q.optionD,
                correctAnswer: q.correctAnswer,
                explanation: values.explanation, // Shared explanation/transcript
                audioUrl: audioUrl, // Shared audio
                transcript: values.transcript
            }));

            // We reuse the batch endpoint. It requires 'passage' usually for Part 6/7.
            // Let's send a dummy passage or modify backend to allow empty passage if audioUrl exists.
            // Currently backend checks: if (!passage || ...).
            // So we send a dummy passage string indicating it's an audio group.
            const payload = {
                passage: `<audio src="${audioUrl}">`, // Dummy passage content to pass validation
                questions: questionsPayload,
                audioUrl: audioUrl, // Explicit field
                transcript: values.transcript
            };

            const response = await api.post(`/parts/${partId}/questions/batch`, payload);

            if (response.data.success) {
                message.success(`Tạo nhóm câu hỏi Part ${partNumber} thành công!`);
                form.resetFields();
                setAudioFileList([]);
                onSuccess();
                onCancel();
            } else {
                message.error(response.data.message);
            }

        } catch (error: any) {
            console.error('Error creating group:', error);
            message.error(error.message || 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={`Thêm nhóm câu hỏi Part ${partNumber} (Conversations/Talks)`}
            open={open}
            onCancel={onCancel}
            footer={null}
            width={900}
            destroyOnClose={true}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
            >
                <Card title="Thông tin chung" style={{ marginBottom: 16 }}>
                    <Form.Item label="File Âm thanh (Hội thoại/Bài nói)" required>
                        <Upload
                            beforeUpload={handleAudioUpload}
                            onRemove={() => setAudioFileList([])}
                            fileList={audioFileList}
                            maxCount={1}
                            accept="audio/*"
                        >
                            <Button icon={<UploadOutlined />}>Chọn file Audio (MP3/WAV)</Button>
                        </Upload>
                    </Form.Item>

                    <Form.Item label="Transcript / Giải thích chung" name="transcript">
                        <Input.TextArea rows={4} placeholder="Nhập nội dung hội thoại..." />
                    </Form.Item>
                </Card>

                <Form.List name="questions">
                    {(fields) => (
                        <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 5 }}>
                            {fields.map((field, index) => (
                                <Card
                                    key={field.key}
                                    title={`Câu hỏi ${index + 1}`}
                                    size="small"
                                    style={{ marginBottom: 16 }}
                                >
                                    <Form.Item
                                        {...field}
                                        label="Số câu"
                                        name={[field.name, 'questionNumber']}
                                        rules={[{ required: true }]}
                                    >
                                        <InputNumber />
                                    </Form.Item>
                                    <Form.Item
                                        {...field}
                                        label="Nội dung câu hỏi"
                                        name={[field.name, 'questionText']}
                                        rules={[{ required: true }]}
                                    >
                                        <Input />
                                    </Form.Item>
                                    <Space style={{ display: 'flex', marginBottom: 8 }} align="start">
                                        <Form.Item {...field} name={[field.name, 'optionA']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                            <Input prefix="(A)" placeholder="Option A" />
                                        </Form.Item>
                                        <Form.Item {...field} name={[field.name, 'optionB']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                            <Input prefix="(B)" placeholder="Option B" />
                                        </Form.Item>
                                    </Space>
                                    <Space style={{ display: 'flex' }} align="start">
                                        <Form.Item {...field} name={[field.name, 'optionC']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                            <Input prefix="(C)" placeholder="Option C" />
                                        </Form.Item>
                                        <Form.Item {...field} name={[field.name, 'optionD']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                            <Input prefix="(D)" placeholder="Option D" />
                                        </Form.Item>
                                    </Space>
                                    <Form.Item
                                        {...field}
                                        label="Đáp án đúng"
                                        name={[field.name, 'correctAnswer']}
                                        rules={[{ required: true }]}
                                        style={{ marginTop: 16 }}
                                    >
                                        <Select style={{ width: 120 }}>
                                            <Option value="A">A</Option>
                                            <Option value="B">B</Option>
                                            <Option value="C">C</Option>
                                            <Option value="D">D</Option>
                                        </Select>
                                    </Form.Item>
                                </Card>
                            ))}
                        </div>
                    )}
                </Form.List>

                <div style={{ textAlign: 'right', marginTop: 16 }}>
                    <Button onClick={onCancel} style={{ marginRight: 8 }}>
                        Hủy
                    </Button>
                    <Button type="primary" htmlType="submit" loading={loading}>
                        Tạo nhóm câu hỏi
                    </Button>
                </div>
            </Form>
        </Modal>
    );
}
