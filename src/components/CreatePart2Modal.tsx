import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message, Upload, Button, InputNumber, Alert } from 'antd';
import { UploadOutlined, SoundOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import api, { uploadApi } from '../services/api';

const { Option } = Select;

interface CreatePart2ModalProps {
    open: boolean;
    onCancel: () => void;
    onSuccess: () => void;
    partId: string | null;
    currentAudioUrl?: string; // New prop
}

export default function CreatePart2Modal({ open, onCancel, onSuccess, partId, currentAudioUrl }: CreatePart2ModalProps) {
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
                    form.setFieldsValue({ questionNumber: maxNum + 1 });
                } else {
                    setNextQuestionNumber(1);
                    form.setFieldsValue({ questionNumber: 1 });
                }
            }
        } catch (error) {
            console.error('Error fetching questions:', error);
        }
    };

    const handleAudioUpload = (file: UploadFile) => {
        setAudioFileList([file]);
        return false;
    };

    const handleSubmit = async (values: any) => {
        if (!partId) return;

        // If no part audio and no file uploaded, error
        if (!currentAudioUrl && audioFileList.length === 0) {
            message.error('Vui lòng upload file âm thanh hoặc cập nhật Audio chung cho Part!');
            return;
        }

        try {
            setLoading(true);

            let audioUrl = currentAudioUrl; // Default to part audio

            // If user uploaded a specific audio, use it (override)
            if (audioFileList.length > 0) {
                const actualFile = (audioFileList[0] as any)?.originFileObj || audioFileList[0];
                const audioRes = await uploadApi.audio(actualFile);

                if (!audioRes.success) {
                    throw new Error(audioRes.message || 'Upload âm thanh thất bại');
                }
                audioUrl = audioRes.url;
            }

            // Create Question
            const payload = {
                questionNumber: values.questionNumber,
                audioUrl: audioUrl, // Can be part audio or specific audio
                correctAnswer: values.correctAnswer,
                questionText: 'Listen to the question and mark your answer.',
                optionA: '(A)',
                optionB: '(B)',
                optionC: '(C)',
                optionD: null, // Part 2 only has 3 options
                explanation: values.explanation
            };

            const response = await api.post(`/parts/${partId}/questions`, payload);

            if (response.data.success) {
                message.success('Tạo câu hỏi thành công!');
                form.resetFields();
                setAudioFileList([]);
                // Do NOT close modal automatically for ease of entry? 
                // Wait, user might want to add multiple. But typically modals close.
                // Let's close it as requested by current flow.
                onSuccess();
                onCancel();
            } else {
                message.error(response.data.message);
            }

        } catch (error: any) {
            console.error('Error creating question:', error);
            message.error(error.message || 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Thêm câu hỏi Part 2 (Question-Response)"
            open={open}
            onCancel={onCancel}
            footer={null}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{ questionNumber: nextQuestionNumber }}
            >
                <Alert
                    message="Part 2: Question-Response"
                    description="Part 2 chỉ có 3 đáp án (A, B, C). Audio thường là chung cho cả Part hoặc theo từng câu."
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />

                <Form.Item
                    label="Số câu hỏi"
                    name="questionNumber"
                    rules={[{ required: true, message: 'Vui lòng nhập số câu hỏi' }]}
                >
                    <InputNumber min={1} max={200} style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item label="File Âm thanh">
                    {currentAudioUrl && (
                        <div style={{ marginBottom: 8, color: '#52c41a' }}>
                            <SoundOutlined /> Đang sử dụng Audio chung của Part. (Bạn có thể upload file riêng nếu muốn ghi đè)
                        </div>
                    )}
                    <Upload
                        beforeUpload={handleAudioUpload}
                        onRemove={() => setAudioFileList([])}
                        fileList={audioFileList}
                        maxCount={1}
                        accept="audio/*"
                    >
                        <Button icon={<UploadOutlined />}>
                            {currentAudioUrl ? 'Upload file riêng (Tùy chọn)' : 'Chọn file Audio (Bắt buộc)'}
                        </Button>
                    </Upload>
                </Form.Item>

                <Form.Item
                    label="Đáp án đúng"
                    name="correctAnswer"
                    rules={[{ required: true, message: 'Vui lòng chọn đáp án đúng' }]}
                >
                    <Select placeholder="Chọn đáp án đúng">
                        <Option value="A">Option A</Option>
                        <Option value="B">Option B</Option>
                        <Option value="C">Option C</Option>
                    </Select>
                </Form.Item>

                <Form.Item
                    label="Giải thích (tùy chọn)"
                    name="explanation"
                >
                    <Input.TextArea rows={4} placeholder="Nhập giải thích / transcript..." />
                </Form.Item>

                <div style={{ textAlign: 'right' }}>
                    <Button onClick={onCancel} style={{ marginRight: 8 }}>
                        Hủy
                    </Button>
                    <Button type="primary" htmlType="submit" loading={loading}>
                        Tạo câu hỏi
                    </Button>
                </div>
            </Form>
        </Modal>
    );
}
