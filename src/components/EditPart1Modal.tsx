import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message, Upload, Button, Image, InputNumber, Row, Col, Space, Alert } from 'antd';
import { InboxOutlined, UploadOutlined, PictureOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import api, { uploadApi, partApi } from '../services/api';
import AudioBanner from './AudioBanner';

const { Option } = Select;
const { Dragger } = Upload;

interface Question {
    id: string;
    questionNumber: number;
    imageUrl?: string;
    optionA?: string;
    optionB?: string;
    optionC?: string;
    optionD?: string;
    correctAnswer: string;
    level?: 'A1_A2' | 'B1_B2' | 'C1';
}

interface EditPart1ModalProps {
    open: boolean;
    onCancel: () => void;
    onSuccess: () => void;
    question: Question | null;
    partId: string | null;
    partName?: string;
    partNumber?: number;
}

export default function EditPart1Modal({ open, onCancel, onSuccess, question, partId, partName, partNumber }: EditPart1ModalProps) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [imageFileList, setImageFileList] = useState<UploadFile[]>([]);
    const [previewImage, setPreviewImage] = useState<string>('');
    const [hasNewImage, setHasNewImage] = useState(false);
    const [partAudioUrl, setPartAudioUrl] = useState<string | null>(null);
    const [newAudioFile, setNewAudioFile] = useState<File | null>(null);

    useEffect(() => {
        if (open && question) {
            // Pre-fill form with existing data
            form.setFieldsValue({
                questionNumber: question.questionNumber,
                optionA: question.optionA || '',
                optionB: question.optionB || '',
                optionC: question.optionC || '',
                optionD: question.optionD || '',
                correctAnswer: question.correctAnswer
            });

            // Set current image
            setPreviewImage(question.imageUrl || '');
            setImageFileList([]);
            setHasNewImage(false);

            if (partId) fetchPartAudio();
        } else {
            handleReset();
        }
    }, [open, question, partId]);

    const fetchPartAudio = async () => {
        if (!partId) return;
        try {
            const response = await api.get(`/parts/${partId}`);
            if (response.data.success) {
                setPartAudioUrl(response.data.part.audioUrl);
            }
        } catch (error) {
            console.error('Error fetching part audio:', error);
        }
    };

    const handleReset = () => {
        form.resetFields();
        setImageFileList([]);
        setPreviewImage('');
        setHasNewImage(false);
        setNewAudioFile(null);
    };

    const handleImageUpload = (file: any) => {
        setImageFileList([file]);
        setHasNewImage(true);

        // Create preview URL from the actual File object
        const actualFile = file.originFileObj || file;
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreviewImage(e.target?.result as string);
        };
        reader.readAsDataURL(actualFile);
        return false; // Prevent auto upload
    };

    const handleRemoveImage = () => {
        setImageFileList([]);
        setPreviewImage(question?.imageUrl || '');
        setHasNewImage(false);
    };

    const handleSubmit = async (values: any) => {
        if (!question) return;

        if (values.questionNumber < 1 || values.questionNumber > 6) {
            message.error('Part 1 chỉ gồm các câu hỏi từ 1 đến 6');
            return;
        }

        try {
            setLoading(true);

            let imageUrl = question.imageUrl; // Keep current image by default

            // Upload new image if user selected one
            if (hasNewImage && imageFileList.length > 0) {
                const actualFile = (imageFileList[0] as any)?.originFileObj || imageFileList[0];

                if (!actualFile || !(actualFile instanceof File)) {
                    throw new Error('File không hợp lệ. Vui lòng thử lại!');
                }

                const imageRes = await uploadApi.image(actualFile);

                if (!imageRes.success) {
                    throw new Error(imageRes.message || 'Upload ảnh thất bại');
                }
                imageUrl = imageRes.url;
            }

            // 1.5 Handle Part Audio Upload
            if (newAudioFile && partId) {
                const audioRes = await uploadApi.audio(newAudioFile);
                if (audioRes.success) {
                    await partApi.update(partId, { audioUrl: audioRes.url });
                    setPartAudioUrl(audioRes.url);
                    setNewAudioFile(null);
                } else {
                    throw new Error(audioRes.message || 'Upload audio thất bại');
                }
            }

            // Update question using api.ts
            const payload = {
                questionNumber: values.questionNumber,
                imageUrl: imageUrl,
                optionA: values.optionA || '(A)',
                optionB: values.optionB || '(B)',
                optionC: values.optionC || '(C)',
                optionD: values.optionD || '(D)',
                correctAnswer: values.correctAnswer
            };

            const response = await api.patch(`/questions/${question.id}`, payload);

            if (response.data.success) {
                message.success('Cập nhật câu hỏi Part 1 thành công!');
                handleReset();
                onSuccess();
                onCancel();
            } else {
                message.error(response.data.message);
            }

        } catch (error: any) {
            console.error('❌ Error updating question:', error);
            console.error('❌ Error response:', error.response?.data);
            message.error(error.response?.data?.message || error.message || 'Có lỗi xảy ra khi cập nhật câu hỏi');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 10px rgba(30, 41, 59, 0.2)'
                    }}>
                        <PictureOutlined style={{ color: '#fff', fontSize: 18 }} />
                    </div>
                        <span style={{
                            fontSize: 18,
                            fontWeight: 800,
                            background: 'linear-gradient(to right, #1E293B, #475569)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '0.5px'
                        }}>
                            {partName 
                                ? (partName.toUpperCase().startsWith('PART') ? partName : `PART ${partNumber}: ${partName}`) 
                                : 'CẬP NHẬT CÂU HỎI PART 1'}
                        </span>
                    </div>
                }
                open={open}
                onCancel={onCancel}
                footer={null}
                width={1000}
                centered
                maskClosable={false}
                styles={{
                    body: { padding: '24px 32px' }
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                requiredMark={false}
            >
                {/* ─── AUDIO BANNER (top) ─── */}
                <AudioBanner
                    currentAudioUrl={partAudioUrl}
                    newAudioFile={newAudioFile}
                    onAudioFileChange={setNewAudioFile}
                />

                <Alert
                    description={
                        <span style={{ color: '#475569', fontWeight: 500 }}>
                            Bạn đang chỉnh sửa câu hỏi số {question?.questionNumber}. Bạn có thể thay đổi hình ảnh và nội dung audio transcript tại đây.
                        </span>
                    }
                    type="info"
                    showIcon
                    style={{
                        marginBottom: 16,
                        borderRadius: 12,
                        backgroundColor: '#F0F9FF',
                        border: '1px solid #BAE6FD'
                    }}
                />

                <Row gutter={32}>
                    {/* LEFT COLUMN: IMAGE */}
                    <Col span={10}>
                        <div style={{
                            background: '#F8FAFC',
                            borderRadius: 16,
                            padding: 20,
                            border: '1px solid #E2E8F0',
                            height: '100%'
                        }}>
                            <div style={{
                                fontWeight: 700,
                                color: '#1E293B',
                                marginBottom: 16,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}>
                                <span style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 6,
                                    background: '#1E293B',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 12
                                }}>1</span>
                                Hình ảnh minh họa
                            </div>

                            <div style={{
                                height: 320,
                                border: previewImage ? 'none' : '2px dashed #CBD5E1',
                                borderRadius: 12,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                background: '#FFF',
                                overflow: 'hidden',
                                position: 'relative',
                                transition: 'all 0.3s ease',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                            }}>
                                {previewImage ? (
                                    <>
                                        <Image
                                            src={previewImage}
                                            style={{ width: '100%', height: 320, objectFit: 'contain' }}
                                            preview={true}
                                        />
                                        {hasNewImage ? (
                                            <Button
                                                type="primary"
                                                danger
                                                shape="circle"
                                                icon={<DeleteOutlined />}
                                                style={{
                                                    position: 'absolute',
                                                    top: 12,
                                                    right: 12,
                                                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                                                }}
                                                onClick={handleRemoveImage}
                                            />
                                        ) : (
                                            <div style={{ position: 'absolute', top: 12, right: 12 }}>
                                                <Upload
                                                    beforeUpload={handleImageUpload}
                                                    showUploadList={false}
                                                    maxCount={1}
                                                    accept="image/*"
                                                >
                                                    <Button 
                                                        icon={<UploadOutlined />} 
                                                        shape="circle" 
                                                        type="primary"
                                                        style={{ 
                                                            background: 'rgba(30, 41, 59, 0.8)', 
                                                            border: 'none',
                                                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                                        }} 
                                                    />
                                                </Upload>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <Dragger
                                        fileList={imageFileList}
                                        beforeUpload={handleImageUpload}
                                        showUploadList={false}
                                        maxCount={1}
                                        accept="image/*"
                                        style={{ width: '100%', height: '100%', border: 'none', background: 'transparent' }}
                                    >
                                        <p className="ant-upload-drag-icon">
                                            <InboxOutlined style={{ fontSize: 48, color: '#3B82F6' }} />
                                        </p>
                                        <p style={{ fontWeight: 600, color: '#475569', margin: '16px 0 4px' }}>Kéo thả hoặc nhấn để tải ảnh</p>
                                        <p style={{ color: '#94A3B8', fontSize: 13 }}>Hỗ trợ định dạng JPG, PNG</p>
                                    </Dragger>
                                )}
                            </div>

                            {/* Audio is now shown at top via AudioBanner */}
                        </div>
                    </Col>

                    {/* RIGHT COLUMN: DETAILS */}
                    <Col span={14}>
                        <div style={{
                            background: '#FFF',
                            borderRadius: 16,
                            padding: 24,
                            border: '1px solid #E2E8F0',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                        }}>
                            <div style={{
                                fontWeight: 700,
                                color: '#1E293B',
                                marginBottom: 20,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}>
                                <span style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 6,
                                    background: '#1E293B',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 12
                                }}>2</span>
                                Thông tin chi tiết câu hỏi
                            </div>

                            <Row gutter={16}>
                                <Col span={24}>
                                    <Form.Item
                                        label={<span style={{ fontWeight: 600, color: '#475569' }}>Số câu hỏi (1-6)</span>}
                                        name="questionNumber"
                                        rules={[
                                            { required: true, message: 'Vui lòng nhập số thứ tự' },
                                            { type: 'number', min: 1, max: 6, message: 'Part 1 chỉ gồm câu 1 đến câu 6' }
                                        ]}
                                    >
                                        <InputNumber
                                            min={1}
                                            max={6}
                                            style={{ width: '100%', borderRadius: 8 }}
                                            size="large"
                                            placeholder="Chọn số câu hỏi..."
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <div style={{
                                margin: '24px 0 16px',
                                padding: '12px 16px',
                                background: '#F1F5F9',
                                borderRadius: 10,
                                fontWeight: 700,
                                color: '#475569',
                                fontSize: 13,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}>
                                <UploadOutlined /> Nội dung Transcript (Audio)
                            </div>

                            <Space direction="vertical" style={{ width: '100%' }} size={12}>
                                <Form.Item name="optionA" style={{ marginBottom: 0 }}>
                                    <Input prefix={<b style={{ color: '#94A3B8', marginRight: 8 }}>A</b>} placeholder="Nội dung audio câu A..." size="large" style={{ borderRadius: 8 }} />
                                </Form.Item>
                                <Form.Item name="optionB" style={{ marginBottom: 0 }}>
                                    <Input prefix={<b style={{ color: '#94A3B8', marginRight: 8 }}>B</b>} placeholder="Nội dung audio câu B..." size="large" style={{ borderRadius: 8 }} />
                                </Form.Item>
                                <Form.Item name="optionC" style={{ marginBottom: 0 }}>
                                    <Input prefix={<b style={{ color: '#94A3B8', marginRight: 8 }}>C</b>} placeholder="Nội dung audio câu C..." size="large" style={{ borderRadius: 8 }} />
                                </Form.Item>
                                <Form.Item name="optionD" style={{ marginBottom: 0 }}>
                                    <Input prefix={<b style={{ color: '#94A3B8', marginRight: 8 }}>D</b>} placeholder="Nội dung audio câu D..." size="large" style={{ borderRadius: 8 }} />
                                </Form.Item>
                            </Space>

                            <Form.Item
                                label={<span style={{ fontWeight: 600, color: '#475569', marginTop: 20, display: 'block' }}>Đáp án chính xác</span>}
                                name="correctAnswer"
                                rules={[{ required: true, message: 'Vui lòng chọn đáp án đúng' }]}
                                style={{ marginTop: 20 }}
                            >
                                <Select placeholder="Chọn một đáp án..." size="large" style={{ borderRadius: 8 }}>
                                    <Option value="A">Option A</Option>
                                    <Option value="B">Option B</Option>
                                    <Option value="C">Option C</Option>
                                    <Option value="D">Option D</Option>
                                </Select>
                            </Form.Item>

                        </div>
                    </Col>
                </Row>

                <div style={{
                    textAlign: 'right',
                    marginTop: 32,
                    paddingTop: 24,
                    borderTop: '1px solid #E2E8F0',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 12
                }}>
                    <Button
                        onClick={onCancel}
                        size="large"
                        style={{ borderRadius: 10, padding: '0 24px', fontWeight: 600, color: '#64748B' }}
                    >
                        Hủy bỏ
                    </Button>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        size="large"
                        icon={<UploadOutlined />}
                        style={{
                            borderRadius: 10,
                            padding: '0 32px',
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(30, 41, 59, 0.25)'
                        }}
                    >
                        Cập nhật
                    </Button>
                </div>
            </Form>
        </div>
    </Modal>
);
}
