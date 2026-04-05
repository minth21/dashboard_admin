import { useState, useEffect } from 'react';
import {
    Modal,
    Form,
    Input,
    Select,
    message,
    Upload,
    Button,
    InputNumber,
    Alert,
    Row,
    Col
} from 'antd';
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
    partName?: string;
    partNumber?: number;
}

export default function CreatePart2Modal({ open, onCancel, onSuccess, partId, currentAudioUrl, partName, partNumber }: CreatePart2ModalProps) {
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
                audioUrl: audioUrl,
                correctAnswer: values.correctAnswer,
                questionText: values.questionText,
                optionA: values.optionA,
                optionB: values.optionB,
                optionC: values.optionC,
                optionD: null, // Part 2 only has 3 options
                explanation: values.explanation,
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
            title={
                <div style={{ textAlign: 'center', width: '100%', fontSize: 20, fontWeight: 800, textTransform: 'uppercase', color: '#1E293B' }}>
                    {partName
                        ? (partName.toUpperCase().startsWith('PART') ? partName : `PART ${partNumber}: ${partName}`)
                        : 'Thêm câu hỏi Part 2 (Question-Response)'}
                </div>
            }
            open={open}
            onCancel={onCancel}
            footer={null}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{ 
                    questionNumber: nextQuestionNumber,
                    questionText: 'Listen to the question and mark your answer.',
                    optionA: '(A)',
                    optionB: '(B)',
                    optionC: '(C)'
                }}
            >
                <Alert
                    message="Part 2: Question-Response"
                    description="Nhập Tapescript tiếng Anh cho cả câu hỏi và 3 đáp án. Part này không dùng AI dịch để rèn luyện phản xạ nghe gốc cho học viên."
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            label="Số câu hỏi"
                            name="questionNumber"
                            rules={[{ required: true, message: 'Vui lòng nhập số câu hỏi' }]}
                        >
                            <InputNumber min={1} max={200} style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            label="Đáp án đúng"
                            name="correctAnswer"
                            rules={[{ required: true, message: 'Chọn đáp án đúng' }]}
                        >
                            <Select placeholder="Chọn đáp án">
                                <Option value="A">Đáp án A</Option>
                                <Option value="B">Đáp án B</Option>
                                <Option value="C">Đáp án C</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item label="File Âm thanh">
                    {currentAudioUrl && (
                        <div style={{ marginBottom: 8, color: '#52c41a' }}>
                            <SoundOutlined /> Đang sử dụng Audio chung của Part. (Upload file riêng nếu muốn ghi đè cho câu này)
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
                    label="Tapescript Câu hỏi (Listening)"
                    name="questionText"
                    rules={[{ required: true, message: 'Vui lòng nhập Tapescript câu hỏi' }]}
                >
                    <Input.TextArea rows={2} placeholder="Ví dụ: Where is the marketing convention being held?" />
                </Form.Item>

                <Row gutter={12}>
                    <Col span={8}>
                        <Form.Item
                            label="Tapescript A"
                            name="optionA"
                            rules={[{ required: true, message: 'Nhập Tapescript A' }]}
                        >
                            <Input placeholder="Ví dụ: In the Grand Ballroom" />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item
                            label="Tapescript B"
                            name="optionB"
                            rules={[{ required: true, message: 'Nhập Tapescript B' }]}
                        >
                            <Input placeholder="Ví dụ: Every Tuesday morning" />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item
                            label="Tapescript C"
                            name="optionC"
                            rules={[{ required: true, message: 'Nhập Tapescript C' }]}
                        >
                            <Input placeholder="Ví dụ: To discuss the new budget" />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item
                    label="Giải thích / Ghi chú (tùy chọn)"
                    name="explanation"
                >
                    <Input.TextArea rows={3} placeholder="Mẹo làm bài hoặc ghi chú thêm..." />
                </Form.Item>

                <div style={{ textAlign: 'right', marginTop: 16 }}>
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
