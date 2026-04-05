import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message, Upload, Button, Image, InputNumber, Row, Col, Space, Alert, Tooltip } from 'antd';
import { InboxOutlined, UploadOutlined, PictureOutlined, DeleteOutlined, FileExcelOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import * as XLSX from 'xlsx';
import api, { uploadApi, partApi } from '../services/api';
import AudioBanner from './AudioBanner';

const { Option } = Select;
const { Dragger } = Upload;

interface CreatePart1ModalProps {
    open: boolean;
    onCancel: () => void;
    onSuccess: () => void;
    partId: string | null;
    partName?: string;
    partNumber?: number;
}

interface ExcelRow {
    questionNumber: number;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: string;
}

export default function CreatePart1Modal({ open, onCancel, onSuccess, partId, partName, partNumber }: CreatePart1ModalProps) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [imageFileList, setImageFileList] = useState<UploadFile[]>([]);
    const [previewImage, setPreviewImage] = useState<string>('');
    const [nextQuestionNumber, setNextQuestionNumber] = useState<number>(1);
    const [partAudioUrl, setPartAudioUrl] = useState<string | null>(null);
    const [newAudioFile, setNewAudioFile] = useState<File | null>(null);
    const [excelImporting, setExcelImporting] = useState(false);

    useEffect(() => {
        if (open && partId) {
            fetchNextQuestionNumber();
            fetchPartAudio();
        } else {
            handleReset();
        }
    }, [open, partId]);

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
        setNewAudioFile(null);
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
        setImageFileList([file]);
        const actualFile = file.originFileObj || file;
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreviewImage(e.target?.result as string);
        };
        reader.readAsDataURL(actualFile);
        return false;
    };

    /** Handle Excel import: parse and batch-create questions (no images, text only) */
    const handleExcelImport = async (file: File) => {
        setExcelImporting(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows: any[] = XLSX.utils.sheet_to_json(sheet);

            if (rows.length === 0) {
                message.error('File Excel trống!');
                return false;
            }

            const parsed: ExcelRow[] = rows.map((row: any) => ({
                questionNumber: Number(row['Số câu'] || row['questionNumber'] || 0),
                optionA: String(row['A'] || row['optionA'] || ''),
                optionB: String(row['B'] || row['optionB'] || ''),
                optionC: String(row['C'] || row['optionC'] || ''),
                optionD: String(row['D'] || row['optionD'] || ''),
                correctAnswer: String(row['Đáp án đúng'] || row['correctAnswer'] || '').toUpperCase(),
            })).filter(r => r.questionNumber > 0);

            if (parsed.length === 0) {
                message.error('Không tìm thấy dữ liệu hợp lệ. Kiểm tra lại tiêu đề cột!');
                return false;
            }

            // Upload audio first if needed
            if (newAudioFile) {
                const audioRes = await uploadApi.audio(newAudioFile);
                if (audioRes.success) {
                    await partApi.update(partId!, { audioUrl: audioRes.url });
                    setPartAudioUrl(audioRes.url);
                    setNewAudioFile(null);
                }
            }

            // Batch create questions
            const promises = parsed.map(q =>
                api.post(`/parts/${partId}/questions`, {
                    questionNumber: q.questionNumber,
                    imageUrl: null, // Images must be added manually
                    audioUrl: null,
                    correctAnswer: q.correctAnswer,
                    questionText: 'Look at the picture and listen to the four statements.',
                    optionA: q.optionA || '(A)',
                    optionB: q.optionB || '(B)',
                    optionC: q.optionC || '(C)',
                    optionD: q.optionD || '(D)',
                    explanation: null,
                })
            );

            await Promise.all(promises);
            message.success(`Đã import ${parsed.length} câu hỏi từ Excel! (Lưu ý: chưa có hình ảnh, vui lòng thêm ảnh thủ công)`);
            onSuccess();
            onCancel();
        } catch (err: any) {
            console.error('Excel import error:', err);
            message.error('Lỗi khi đọc file Excel: ' + (err.message || 'Vui lòng kiểm tra định dạng file'));
        } finally {
            setExcelImporting(false);
        }
        return false;
    };

    const handleDownloadTemplate = () => {
        const rows = [];
        for (let i = 1; i <= 6; i++) {
            rows.push({
                'Số câu': i,
                'A': '',
                'B': '',
                'C': '',
                'D': '',
                'Đáp án đúng': '',
            });
        }
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Part 1');
        XLSX.writeFile(wb, 'Part1_template.xlsx');
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

            const actualFile = (imageFileList[0] as any)?.originFileObj || imageFileList[0];
            if (!actualFile || !(actualFile instanceof File)) {
                throw new Error('File không hợp lệ. Vui lòng thử lại!');
            }

            const imageRes = await uploadApi.image(actualFile);
            if (!imageRes.success) throw new Error(imageRes.message || 'Upload ảnh thất bại');
            const imageUrl = imageRes.url;

            if (newAudioFile) {
                const audioRes = await uploadApi.audio(newAudioFile);
                if (audioRes.success) {
                    await partApi.update(partId, { audioUrl: audioRes.url });
                    setPartAudioUrl(audioRes.url);
                    setNewAudioFile(null);
                } else {
                    throw new Error(audioRes.message || 'Upload audio thất bại');
                }
            }

            const payload = {
                questionNumber: values.questionNumber,
                imageUrl: imageUrl,
                audioUrl: null,
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
                            : 'TẠO CÂU HỎI PART 1'}
                    </span>
                </div>
            }
            open={open}
            onCancel={onCancel}
            footer={null}
            width={1000}
            centered
            maskClosable={false}
            styles={{ body: { padding: '24px 32px' } }}
        >
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    initialValues={{ questionNumber: nextQuestionNumber }}
                    requiredMark={false}
                    style={{ width: '100%' }}
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
                                Part 1 bao gồm 6 câu hỏi hình ảnh. Vui lòng chọn số thứ tự câu hỏi và tải lên hình ảnh tương ứng để bắt đầu.
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

                    {/* ─── IMPORT EXCEL ROW ─── */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
                        <Tooltip title="Tải file Excel mẫu về máy">
                            <Button icon={<FileExcelOutlined />} onClick={handleDownloadTemplate} style={{ borderRadius: 8, color: '#16A34A', borderColor: '#16A34A' }}>
                                Tải file mẫu
                            </Button>
                        </Tooltip>
                        <Upload
                            beforeUpload={handleExcelImport}
                            showUploadList={false}
                            accept=".xlsx,.xls"
                        >
                            <Button
                                icon={<FileExcelOutlined />}
                                loading={excelImporting}
                                style={{ borderRadius: 8, background: '#16A34A', color: '#fff', border: 'none', fontWeight: 600 }}
                            >
                                Import Excel
                            </Button>
                        </Upload>
                    </div>

                    <Row gutter={32}>
                        {/* LEFT COLUMN: IMAGE UPLOAD */}
                        <Col span={10}>
                            <div style={{
                                background: '#F8FAFC',
                                borderRadius: 16,
                                padding: 20,
                                border: '1px solid #E2E8F0',
                                height: '100%'
                            }}>
                                <div style={{ fontWeight: 700, color: '#1E293B', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{
                                        width: 24, height: 24, borderRadius: 6, background: '#1E293B',
                                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12
                                    }}>1</span>
                                    Hình ảnh minh họa
                                </div>

                                <div style={{
                                    height: 320,
                                    border: previewImage ? 'none' : '2px dashed #CBD5E1',
                                    borderRadius: 12,
                                    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                                    background: '#FFF', overflow: 'hidden', position: 'relative',
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
                                            <Button
                                                type="primary" danger shape="circle" icon={<DeleteOutlined />}
                                                style={{ position: 'absolute', top: 12, right: 12, boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}
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
                            </div>
                        </Col>

                        {/* RIGHT COLUMN: DETAILS */}
                        <Col span={14}>
                            <div style={{
                                background: '#FFF', borderRadius: 16, padding: 24,
                                border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                            }}>
                                <div style={{ fontWeight: 700, color: '#1E293B', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{
                                        width: 24, height: 24, borderRadius: 6, background: '#1E293B',
                                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12
                                    }}>2</span>
                                    Thông tin chi tiết câu hỏi
                                </div>

                                <Form.Item
                                    label={<span style={{ fontWeight: 600, color: '#475569' }}>Số câu hỏi (1-6)</span>}
                                    name="questionNumber"
                                    rules={[
                                        { required: true, message: 'Vui lòng nhập số thứ tự' },
                                        { type: 'number', min: 1, max: 6, message: 'Part 1 chỉ gồm câu 1 đến câu 6' }
                                    ]}
                                >
                                    <InputNumber min={1} max={6} style={{ width: '100%', borderRadius: 8 }} size="large" placeholder="Chọn số câu hỏi..." />
                                </Form.Item>

                                <div style={{
                                    margin: '24px 0 16px', padding: '12px 16px', background: '#F1F5F9',
                                    borderRadius: 10, fontWeight: 700, color: '#475569', fontSize: 13,
                                    textTransform: 'uppercase', letterSpacing: '0.5px',
                                    display: 'flex', alignItems: 'center', gap: 8
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
                                        <Option value="A">Đáp án A</Option>
                                        <Option value="B">Đáp án B</Option>
                                        <Option value="C">Đáp án C</Option>
                                        <Option value="D">Đáp án D</Option>
                                    </Select>
                                </Form.Item>
                            </div>
                        </Col>
                    </Row>

                    <div style={{
                        textAlign: 'right', marginTop: 32, paddingTop: 24,
                        borderTop: '1px solid #E2E8F0',
                        display: 'flex', justifyContent: 'flex-end', gap: 12
                    }}>
                        <Button onClick={onCancel} size="large" style={{ borderRadius: 10, padding: '0 24px', fontWeight: 600, color: '#64748B' }}>
                            Hủy bỏ
                        </Button>
                        <Button
                            type="primary" htmlType="submit" loading={loading} size="large" icon={<UploadOutlined />}
                            style={{
                                borderRadius: 10, padding: '0 32px', fontWeight: 700,
                                background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
                                border: 'none', boxShadow: '0 4px 12px rgba(30, 41, 59, 0.25)'
                            }}
                        >
                            Lưu câu hỏi
                        </Button>
                    </div>
                </Form>
            </div>
        </Modal>
    );
}
