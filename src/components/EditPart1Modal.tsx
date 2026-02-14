import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message, Upload, Button, Image, InputNumber, Row, Col, Card, Space, Divider, Typography, Alert } from 'antd';
import { InboxOutlined, UploadOutlined, PictureOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import api, { uploadApi } from '../services/api';

const { Option } = Select;
const { Dragger } = Upload;
const { Title } = Typography;

interface Question {
    id: string;
    questionNumber: number;
    imageUrl?: string;
    optionA?: string;
    optionB?: string;
    optionC?: string;
    optionD?: string;
    correctAnswer: string;
}

interface EditPart1ModalProps {
    open: boolean;
    onCancel: () => void;
    onSuccess: () => void;
    question: Question | null;
}

export default function EditPart1Modal({ open, onCancel, onSuccess, question }: EditPart1ModalProps) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [imageFileList, setImageFileList] = useState<UploadFile[]>([]);
    const [previewImage, setPreviewImage] = useState<string>('');
    const [hasNewImage, setHasNewImage] = useState(false);

    useEffect(() => {
        if (open && question) {
            // Pre-fill form with existing data
            form.setFieldsValue({
                questionNumber: question.questionNumber,
                optionA: question.optionA || '',
                optionB: question.optionB || '',
                optionC: question.optionC || '',
                optionD: question.optionD || '',
                correctAnswer: question.correctAnswer,
            });

            // Set current image
            setPreviewImage(question.imageUrl || '');
            setImageFileList([]);
            setHasNewImage(false);
        } else {
            handleReset();
        }
    }, [open, question]);

    const handleReset = () => {
        form.resetFields();
        setImageFileList([]);
        setPreviewImage('');
        setHasNewImage(false);
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

            // Update question using api.ts
            const payload = {
                questionNumber: values.questionNumber,
                imageUrl: imageUrl,
                optionA: values.optionA || '(A)',
                optionB: values.optionB || '(B)',
                optionC: values.optionC || '(C)',
                optionD: values.optionD || '(D)',
                correctAnswer: values.correctAnswer,
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
            title={<Title level={4} style={{ margin: 0 }}><PictureOutlined /> Sửa câu hỏi Part 1</Title>}
            open={open}
            onCancel={onCancel}
            footer={null}
            width={1000}
            centered
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
            >
                <Alert
                    description="Cập nhật thông tin câu hỏi. Bạn có thể thay đổi ảnh bằng cách upload ảnh mới."
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />

                <Row gutter={24}>
                    {/* LEFT COLUMN: IMAGE */}
                    <Col span={10}>
                        <Card title="1. Hình ảnh" bordered={false} className="shadow-sm">
                            <div style={{ height: 300, border: '2px dashed #d9d9d9', borderRadius: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#fafafa', overflow: 'hidden', position: 'relative' }}>
                                {previewImage ? (
                                    <>
                                        <Image
                                            src={previewImage}
                                            style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain' }}
                                            preview={false}
                                        />
                                        {hasNewImage && (
                                            <Button
                                                type="text"
                                                danger
                                                icon={<DeleteOutlined />}
                                                style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(255,255,255,0.8)' }}
                                                onClick={handleRemoveImage}
                                            >
                                                Hủy thay đổi
                                            </Button>
                                        )}
                                    </>
                                ) : (
                                    <Dragger
                                        fileList={imageFileList}
                                        beforeUpload={handleImageUpload}
                                        showUploadList={false}
                                        maxCount={1}
                                        accept="image/*"
                                        style={{ width: '100%', height: '100%', border: 'none' }}
                                    >
                                        <p className="ant-upload-drag-icon" style={{ color: '#1890ff' }}>
                                            <InboxOutlined style={{ fontSize: 48 }} />
                                        </p>
                                        <p className="ant-upload-text">Kéo thả hoặc click để upload ảnh</p>
                                        <p className="ant-upload-hint">Hỗ trợ JPG, PNG</p>
                                    </Dragger>
                                )}
                            </div>
                            {!hasNewImage && previewImage && (
                                <Upload
                                    beforeUpload={handleImageUpload}
                                    showUploadList={false}
                                    maxCount={1}
                                    accept="image/*"
                                    style={{ marginTop: 8 }}
                                >
                                    <Button icon={<UploadOutlined />} block>
                                        Thay đổi ảnh
                                    </Button>
                                </Upload>
                            )}
                        </Card>
                    </Col>

                    {/* RIGHT COLUMN: DETAILS */}
                    <Col span={14}>
                        <Card title="2. Thông tin câu hỏi" bordered={false} className="shadow-sm">
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        label="Số câu hỏi"
                                        name="questionNumber"
                                        rules={[
                                            { required: true, message: 'Nhập số câu' },
                                            { type: 'number', min: 1, max: 6, message: 'Part 1 chỉ có từ câu 1 đến 6' }
                                        ]}
                                    >
                                        <InputNumber min={1} max={6} style={{ width: '100%' }} size="large" />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Divider style={{ margin: '12px 0' }}>Nội dung Audio</Divider>

                            <Form.Item name="optionA" label="Nội dung đáp án A (Audio)">
                                <Input placeholder="Nhập nội dung audio đáp án A (tùy chọn)" />
                            </Form.Item>
                            <Form.Item name="optionB" label="Nội dung đáp án B (Audio)">
                                <Input placeholder="Nhập nội dung audio đáp án B (tùy chọn)" />
                            </Form.Item>
                            <Form.Item name="optionC" label="Nội dung đáp án C (Audio)">
                                <Input placeholder="Nhập nội dung audio đáp án C (tùy chọn)" />
                            </Form.Item>
                            <Form.Item name="optionD" label="Nội dung đáp án D (Audio)">
                                <Input placeholder="Nhập nội dung audio đáp án D (tùy chọn)" />
                            </Form.Item>

                            <Row gutter={16}>
                                <Col span={24}>
                                    <Form.Item
                                        label="Đáp án đúng"
                                        name="correctAnswer"
                                        rules={[{ required: true, message: 'Chọn đáp án đúng' }]}
                                    >
                                        <Select placeholder="Chọn đáp án đúng" size="large">
                                            <Option value="A">Option A</Option>
                                            <Option value="B">Option B</Option>
                                            <Option value="C">Option C</Option>
                                            <Option value="D">Option D</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Card>
                    </Col>
                </Row>

                <div style={{ textAlign: 'right', marginTop: 16, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                    <Space>
                        <Button onClick={onCancel} size="large">
                            Hủy
                        </Button>
                        <Button type="primary" htmlType="submit" loading={loading} size="large" icon={<UploadOutlined />}>
                            Lưu thay đổi
                        </Button>
                    </Space>
                </div>
            </Form>
        </Modal>
    );
}
