import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message, Upload, Button, Image, InputNumber, Row, Col, Card, Space, Divider, Typography, Alert } from 'antd';
import { InboxOutlined, UploadOutlined, PictureOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import api, { uploadApi } from '../services/api';

const { Option } = Select;
const { Dragger } = Upload;
const { Title } = Typography;

interface CreatePart1ModalProps {
    open: boolean;
    onCancel: () => void;
    onSuccess: () => void;
    partId: string | null;
}

export default function CreatePart1Modal({ open, onCancel, onSuccess, partId }: CreatePart1ModalProps) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [imageFileList, setImageFileList] = useState<UploadFile[]>([]);
    const [previewImage, setPreviewImage] = useState<string>('');
    const [nextQuestionNumber, setNextQuestionNumber] = useState<number>(1);

    useEffect(() => {
        if (open && partId) {
            fetchNextQuestionNumber();
        } else {
            handleReset();
        }
    }, [open, partId]);

    const handleReset = () => {
        form.resetFields();
        setImageFileList([]);
        setPreviewImage('');
    };

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

    const handleImageUpload = (file: any) => {
        // Store the UploadFile object
        setImageFileList([file]);

        // Create preview URL from the actual File object
        const actualFile = file.originFileObj || file;
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreviewImage(e.target?.result as string);
        };
        reader.readAsDataURL(actualFile);
        return false; // Prevent auto upload
    };

    const handleSubmit = async (values: any) => {
        if (!partId) return;

        if (values.questionNumber < 1 || values.questionNumber > 6) {
            message.error('Part 1 chỉ gồm các câu hỏi từ 1 đến 6');
            return;
        }

        if (imageFileList.length === 0) {
            message.error('Vui lòng upload hình ảnh!');
            return;
        }

        try {
            setLoading(true);

            // 1. Upload Image
            const actualFile = (imageFileList[0] as any)?.originFileObj || imageFileList[0];

            if (!actualFile || !(actualFile instanceof File)) {
                throw new Error('File không hợp lệ. Vui lòng thử lại!');
            }

            const imageRes = await uploadApi.image(actualFile);

            if (!imageRes.success) {
                throw new Error(imageRes.message || 'Upload ảnh thất bại');
            }
            const imageUrl = imageRes.url;

            // 2. Create Question
            const payload = {
                questionNumber: values.questionNumber,
                imageUrl: imageUrl,
                audioUrl: null, // Part-level audio
                correctAnswer: values.correctAnswer,
                questionText: 'Look at the picture and listen to the four statements.',
                optionA: values.optionA || '(A)',
                optionB: values.optionB || '(B)',
                optionC: values.optionC || '(C)',
                optionD: values.optionD || '(D)',
                explanation: null
            };

            const response = await api.post(`/parts/${partId}/questions`, payload);

            if (response.data.success) {
                message.success('Tạo câu hỏi thành công!');
                handleReset();
                onSuccess();
                setNextQuestionNumber(prev => prev + 1);
                form.setFieldsValue({ questionNumber: values.questionNumber + 1 });
            } else {
                message.error(response.data.message);
            }

        } catch (error: any) {
            message.error(error.response?.data?.message || error.message || 'Có lỗi xảy ra khi tạo câu hỏi');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={<Title level={4} style={{ margin: 0 }}><PictureOutlined /> Tạo câu hỏi Part 1</Title>}
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
                initialValues={{ questionNumber: nextQuestionNumber }}
            >
                <Alert

                    description="Part 1 gồm 6 câu từ câu 1 đến câu 6, mỗi câu hỏi là một hình ảnh. Nhập đầy đủ thông tin câu hỏi và upload hình ảnh tương ứng. "
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />

                <Row gutter={24}>
                    {/* LEFT COLUMN: IMAGE UPLOAD */}
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
                                        <Button
                                            type="text"
                                            danger
                                            icon={<DeleteOutlined />}
                                            style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(255,255,255,0.8)' }}
                                            onClick={() => { setImageFileList([]); setPreviewImage(''); }}
                                        />
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

                            <Divider style={{ margin: '12px 0' }}>Nội dung Audio </Divider>

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
                            Lưu câu hỏi
                        </Button>
                    </Space>
                </div>
            </Form>
        </Modal>
    );
}
