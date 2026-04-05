import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message, Upload, Button, Image, Row, Col, Card, Space, Typography, Tabs } from 'antd';
import { InboxOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import api, { uploadApi } from '../services/api';

const { Option } = Select;
const { Text } = Typography;

interface CreatePart1BulkModalProps {
    open: boolean;
    onCancel: () => void;
    onSuccess: () => void;
    partId: string | null;
    currentAudioUrl?: string; // Added prop
    partName?: string;
    partNumber?: number;
}

interface QuestionDraft {
    id: number; // 1-6
    imageFile: UploadFile | null;
    previewImage: string;
    correctAnswer: string;
    transcriptA?: string;
    transcriptB?: string;
    transcriptC?: string;
    transcriptD?: string;
    explanation?: string;
}

export default function CreatePart1BulkModal({ open, onCancel, onSuccess, partId, currentAudioUrl, partName, partNumber }: CreatePart1BulkModalProps) {
    const [loading, setLoading] = useState(false);

    // Part Audio State
    const [audioFile, setAudioFile] = useState<UploadFile | null>(null);
    const [previewAudio, setPreviewAudio] = useState<string>('');

    // Initialize 6 questions
    const initialQuestions: QuestionDraft[] = Array.from({ length: 6 }, (_, i) => ({
        id: i + 1,
        imageFile: null,
        previewImage: '',
        correctAnswer: '',
        explanation: ''
    }));

    const [questions, setQuestions] = useState<QuestionDraft[]>(initialQuestions);
    const [activeTab, setActiveTab] = useState('1');

    useEffect(() => {
        if (open) {
            setQuestions(initialQuestions);
            setActiveTab('1');
            // Reset audio state
            setAudioFile(null);
            setPreviewAudio(''); // Always start fresh
        }
    }, [open]);

    // Audio Handler
    const handleAudioUpload = (file: UploadFile) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            setAudioFile(file);
            setPreviewAudio(e.target?.result as string);
        };
        reader.readAsDataURL(file as any);
        return false;
    };

    const handleUpdateQuestion = (index: number, field: keyof QuestionDraft, value: any) => {
        const newQuestions = [...questions];
        newQuestions[index] = { ...newQuestions[index], [field]: value };
        setQuestions(newQuestions);
    };

    const handleImageUpload = (index: number, file: UploadFile) => {
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            const newQuestions = [...questions];
            newQuestions[index].imageFile = file;
            newQuestions[index].previewImage = e.target?.result as string;
            setQuestions(newQuestions);
        };
        reader.readAsDataURL(file as any);
        return false;
    };

    const handleRemoveImage = (index: number) => {
        const newQuestions = [...questions];
        newQuestions[index].imageFile = null;
        newQuestions[index].previewImage = '';
        setQuestions(newQuestions);
    };

    const handleSubmit = async () => {
        if (!partId) return;

        // Validation
        for (let i = 0; i < 6; i++) {
            if (!questions[i].imageFile) {
                message.error(`Câu ${i + 1} chưa có hình ảnh!`);
                setActiveTab(`${i + 1}`);
                return;
            }
            if (!questions[i].correctAnswer) {
                message.error(`Câu ${i + 1} chưa chọn đáp án đúng!`);
                setActiveTab(`${i + 1}`);
                return;
            }
        }

        try {
            setLoading(true);

            // Let's do parallel 3 at a time or just Promise.all if strictly 6.

            // 0. Upload Part Audio if Changed
            if (audioFile) {
                const audioRes = await uploadApi.audio(audioFile as any);

                if (audioRes.success) {
                    // Update Part with new Audio URL
                    await api.patch(`/parts/${partId}`, {
                        audioUrl: audioRes.url
                    });
                } else {
                    message.error('Upload Audio thất bại');
                    setLoading(false);
                    return;
                }
            } else if (!previewAudio && !currentAudioUrl) {
                // Warning if no audio at all?
                // message.warning('Chưa có audio chung cho Part');
            }

            const createPromises = questions.map(async (q) => {
                // 1. Upload Image
                const imageRes = await uploadApi.image(q.imageFile as any);

                if (!imageRes.success) throw new Error(`Lỗi upload ảnh câu ${q.id}`);
                const imageUrl = imageRes.url;

                // 2. Create Question Payload
                const payload = {
                    questionNumber: q.id, // 1-6 fixed
                    imageUrl: imageUrl,
                    audioUrl: null, // Use part audio
                    correctAnswer: q.correctAnswer,
                    questionText: 'Look at the picture and listen to the four statements.',
                    optionA: q.transcriptA || '(A)',
                    optionB: q.transcriptB || '(B)',
                    optionC: q.transcriptC || '(C)',
                    optionD: q.transcriptD || '(D)',
                    explanation: q.explanation
                };

                return api.post(`/parts/${partId}/questions`, payload);
            });

            await Promise.all(createPromises);

            message.success('Tạo 6 câu hỏi thành công!');
            onSuccess();
            onCancel();

        } catch (error: any) {
            console.error('Error creating batch:', error);
            const errorMsg = error.response?.data?.message || error.message || 'Có lỗi xảy ra khi tạo câu hỏi';
            message.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const renderQuestionForm = (q: QuestionDraft, index: number) => (
        <Row gutter={24}>
            <Col span={10}>
                <Card title="Hình ảnh" size="small">
                    <div style={{ height: 250, border: '2px dashed #d9d9d9', borderRadius: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#fafafa', position: 'relative', overflow: 'hidden' }}>
                        {q.previewImage ? (
                            <>
                                <Image src={q.previewImage} style={{ maxWidth: '100%', maxHeight: 250 }} preview={false} />
                                <Button
                                    type="text" danger icon={<DeleteOutlined />}
                                    style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(255,255,255,0.8)' }}
                                    onClick={() => handleRemoveImage(index)}
                                />
                            </>
                        ) : (
                            <Upload
                                beforeUpload={(file) => handleImageUpload(index, file)}
                                showUploadList={false}
                                accept="image/*"
                                style={{ display: 'block', width: '100%', height: '100%' }}
                            >
                                <div style={{
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    padding: 20
                                }}>
                                    <InboxOutlined style={{ fontSize: 32, color: '#1890ff', marginBottom: 10 }} />
                                    <Text type="secondary">Click tải ảnh lên</Text>
                                </div>
                            </Upload>
                        )}
                    </div>
                </Card>
            </Col>
            <Col span={14}>
                <Card title="Thông tin" size="small">
                    <Form layout="vertical">
                        <Form.Item label="Đáp án đúng" required>
                            <Select
                                value={q.correctAnswer}
                                onChange={(val) => handleUpdateQuestion(index, 'correctAnswer', val)}
                                placeholder="Chọn đáp án"
                            >
                                {['A', 'B', 'C', 'D'].map(opt => <Option key={opt} value={opt}>{opt}</Option>)}
                            </Select>
                        </Form.Item>


                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item label="Đáp án A">
                                    <Input
                                        value={q.transcriptA}
                                        onChange={(e) => handleUpdateQuestion(index, 'transcriptA', e.target.value)}
                                        placeholder="(A)"
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label="Đáp án B">
                                    <Input
                                        value={q.transcriptB}
                                        onChange={(e) => handleUpdateQuestion(index, 'transcriptB', e.target.value)}
                                        placeholder="(B)"
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label="Đáp án C">
                                    <Input
                                        value={q.transcriptC}
                                        onChange={(e) => handleUpdateQuestion(index, 'transcriptC', e.target.value)}
                                        placeholder="(C)"
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label="Đáp án D">
                                    <Input
                                        value={q.transcriptD}
                                        onChange={(e) => handleUpdateQuestion(index, 'transcriptD', e.target.value)}
                                        placeholder="(D)"
                                    />
                                </Form.Item>
                            </Col>
                        </Row>


                    </Form>
                </Card>
            </Col>
        </Row>
    );

    const items = questions.map((q, index) => ({
        key: `${q.id}`,
        label: (
            <span style={{
                color: q.imageFile && q.correctAnswer ? '#52c41a' : 'inherit',
                fontWeight: q.imageFile && q.correctAnswer ? 600 : 400
            }}>
                Câu {q.id}
            </span>
        ),
        children: renderQuestionForm(q, index),
    }));


    return (
        <Modal
            title={
                <div style={{ textAlign: 'center', width: '100%', fontSize: 20, fontWeight: 800, textTransform: 'uppercase', color: '#1E293B' }}>
                    {partName
                        ? (partName.toUpperCase().startsWith('PART') ? partName : `PART ${partNumber}: ${partName}`)
                        : 'Thêm câu hỏi Part 1 (Photographs)'}
                </div>
            }
            open={open}
            onCancel={onCancel}
            width={1200}
            footer={[
                <Button key="cancel" onClick={onCancel} size="large">Hủy</Button>,
                <Button key="submit" type="primary" onClick={handleSubmit} loading={loading} size="large" icon={<UploadOutlined />}>
                    Lưu tất cả
                </Button>
            ]}
            destroyOnClose={true} // Reset content on close
            style={{ top: 20 }}
        >
            <div style={{ marginBottom: 16 }}>
                <Row justify="space-between" align="middle">
                    <Col>
                        <Text type="secondary">
                            * Lưu ý: Hệ thống sẽ tự động tạo các câu hỏi từ câu 1 đến câu 6. Vui lòng upload đầy đủ hình ảnh và đáp án.
                        </Text>
                    </Col>
                </Row>
            </div>
            <div style={{ marginBottom: 16 }}>
                <Row align="middle" gutter={16} style={{ marginBottom: 16, background: '#f0f5ff', padding: 12, borderRadius: 8, border: '1px solid #adc6ff' }}>
                    <Col>
                        <Space direction="vertical">
                            <Text strong style={{ color: '#10239e' }}>🔊 Audio:</Text>
                            <Upload
                                beforeUpload={handleAudioUpload}
                                showUploadList={false}
                                accept="audio/*"
                            >
                                <Button icon={<UploadOutlined />} type="default">
                                    {previewAudio ? 'Upload Audio' : 'Upload Audio'}
                                </Button>
                            </Upload>
                        </Space>
                    </Col>
                    <Col flex="auto">
                        {previewAudio ? (
                            <audio controls src={previewAudio} style={{ width: '100%', height: 40 }} />
                        ) : (
                            <Text type="secondary" italic>Chưa có audio (Vui lòng upload để học viên có thể nghe)</Text>
                        )}
                    </Col>
                </Row>
            </div>
            <div style={{ marginBottom: 16 }}>
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={items}
                    type="card"
                    style={{ height: 400 }}
                />
            </div>
        </Modal>
    );
}
