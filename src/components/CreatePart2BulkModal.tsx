import { useState, useEffect } from 'react';
import { Modal, Select, message, Button, Row, Col, Card, Alert, Input, Upload, Typography } from 'antd';
import { UploadOutlined, SoundOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import api, { uploadAudio } from '../services/api';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

interface CreatePart2BulkModalProps {
    open: boolean;
    onCancel: () => void;
    onSuccess: () => void;
    partId: string | null;
    currentAudioUrl?: string; // New prop
}

interface QuestionData {
    questionNumber: number;
    questionText: string;
    optionA: string;
    optionB: string;
    optionC: string;
    correctAnswer: string | undefined;
}

export default function CreatePart2BulkModal({ open, onCancel, onSuccess, partId, currentAudioUrl }: CreatePart2BulkModalProps) {
    const [loading, setLoading] = useState(false);
    const [questions, setQuestions] = useState<QuestionData[]>([]);
    const [audioFile, setAudioFile] = useState<File | null>(null); // For Part Audio

    useEffect(() => {
        if (open) {
            // Initialize 25 questions (7 to 31)
            const initQuestions: QuestionData[] = [];
            for (let i = 7; i <= 31; i++) {
                initQuestions.push({
                    questionNumber: i,
                    questionText: '',
                    optionA: '',
                    optionB: '',
                    optionC: '',
                    correctAnswer: undefined
                });
            }
            setQuestions(initQuestions);
            setAudioFile(null);
        }
    }, [open]);

    const handleQuestionChange = (index: number, field: keyof QuestionData, value: string) => {
        const newQuestions = [...questions];
        (newQuestions[index] as any)[field] = value;
        setQuestions(newQuestions);
    };

    const handleAudioUpload = (file: UploadFile) => {
        setAudioFile(file as unknown as File);
        return false;
    };

    const handleSubmit = async () => {
        if (!partId) return;

        // Validation
        const missingAnswers = questions.filter(q => !q.correctAnswer);
        if (missingAnswers.length > 0) {
            message.error(`Vui lòng chọn đáp án cho tất cả 25 câu hỏi!`);
            return;
        }

        if (!currentAudioUrl && !audioFile) {
            message.error('Vui lòng upload Audio chung cho Part 2!');
            return;
        }

        try {
            setLoading(true);

            // 1. Upload Audio if exists
            let newAudioUrl = currentAudioUrl;
            if (audioFile) {
                const audioFormData = new FormData();
                audioFormData.append('audio', audioFile);

                // Use fetch for file upload
                const token = localStorage.getItem('admin_token');
                const uploadResponse = await fetch('http://localhost:3000/api/upload/audio', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: audioFormData
                });

                const audioRes = await uploadResponse.json();

                if (audioRes.success) {
                    newAudioUrl = audioRes.url;
                    // Update Part with new Audio URL
                    await api.patch(`/parts/${partId}`, {
                        audioUrl: newAudioUrl
                    });
                } else {
                    throw new Error('Upload Audio thất bại');
                }
            }

            // 2. Create questions
            const promises = questions.map(q => {
                const payload = {
                    questionNumber: q.questionNumber,
                    questionText: q.questionText || 'Listen to the question and mark your answer.',
                    optionA: q.optionA,
                    optionB: q.optionB,
                    optionC: q.optionC,
                    optionD: null,
                    correctAnswer: q.correctAnswer,
                    explanation: '',
                    // audioUrl: newAudioUrl // redundant if frontend/mobile uses Part audio, but can be added if needed.
                    // Usually Part 2 (Question-Response) relies on Part Audio.
                };
                return api.post(`/ parts / ${partId}/questions`, payload);
            });

            await Promise.all(promises);

            message.success('Đã tạo thành công Part 2 (Audio + 25 câu hỏi)!');
            onSuccess();
            onCancel();
        } catch (error: any) {
            console.error('Error creating batch:', error);
            const errorMsg = error.response?.data?.message || error.message || 'Có lỗi xảy ra';
            message.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="TẠO CÂU HỎI CHO PART 2"
            open={open}
            onCancel={onCancel}
            width={1200}
            footer={[
                <Button key="cancel" onClick={onCancel}>
                    Hủy
                </Button>,
                <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
                    Lưu tất cả
                </Button>,
            ]}
            destroyOnClose={true}
        >
            <Alert
                message="Lưu ý"
                description="Hệ thống tạo sẵn 25 câu hỏi từ câu 7 đến câu 31. Vui lòng upload Audio và nhập chi tiết từng câu."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
            />

            {/* Audio Upload Section */}
            <Card style={{ marginBottom: 16, background: '#f0f5ff', borderColor: '#adc6ff' }} size="small">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <Text strong style={{ fontSize: 16, marginRight: 8 }}><SoundOutlined /> Audio:</Text>
                        {currentAudioUrl && !audioFile && (
                            <Text type="success">Đã có audio trên hệ thống. (Upload mới để thay thế)</Text>
                        )}
                        {!currentAudioUrl && !audioFile && (
                            <Text type="danger">Chưa có audio. Vui lòng upload!</Text>
                        )}
                    </div>
                    <div>
                        <Upload
                            beforeUpload={handleAudioUpload}
                            onRemove={() => setAudioFile(null)}
                            maxCount={1}
                            accept="audio/*"
                            fileList={audioFile ? [{ uid: '-1', name: audioFile.name, status: 'done' } as any] : []}
                        >
                            <Button icon={<UploadOutlined />}>Upload audio</Button>
                        </Upload>
                    </div>
                </div>
            </Card>

            <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '0 8px' }}>
                <Row gutter={[16, 16]}>
                    {questions.map((q, index) => (
                        <Col span={12} key={q.questionNumber}>
                            <Card
                                size="small"
                                title={`Câu ${q.questionNumber}`}
                                bodyStyle={{ padding: 12 }}
                            >
                                <div style={{ marginBottom: 12 }}>
                                    <TextArea
                                        placeholder="Nhập nội dung câu hỏi (Transcript)..."
                                        rows={2}
                                        value={q.questionText}
                                        onChange={(e) => handleQuestionChange(index, 'questionText', e.target.value)}
                                    />
                                </div>

                                {/* Vertical Layout for Options */}
                                <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <Input
                                        addonBefore="A"
                                        value={q.optionA}
                                        onChange={(e) => handleQuestionChange(index, 'optionA', e.target.value)}
                                        placeholder="Option A"
                                    />
                                    <Input
                                        addonBefore="B"
                                        value={q.optionB}
                                        onChange={(e) => handleQuestionChange(index, 'optionB', e.target.value)}
                                        placeholder="Option B"
                                    />
                                    <Input
                                        addonBefore="C"
                                        value={q.optionC}
                                        onChange={(e) => handleQuestionChange(index, 'optionC', e.target.value)}
                                        placeholder="Option C"
                                    />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
                                    <span style={{ fontWeight: 600, color: '#faad14' }}>Đáp án đúng:</span>
                                    <Select
                                        placeholder="Chọn đáp án"
                                        style={{ width: 120 }}
                                        value={q.correctAnswer}
                                        onChange={(val) => handleQuestionChange(index, 'correctAnswer', val)}
                                        status={!q.correctAnswer ? "warning" : ""}
                                    >
                                        <Option value="A">Option A</Option>
                                        <Option value="C">Option C</Option>
                                    </Select>
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </div>
        </Modal>
    );
}
