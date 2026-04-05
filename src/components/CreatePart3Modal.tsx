import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message, Button, InputNumber, Card, Space, Tooltip } from 'antd';
import { FileExcelOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import api, { uploadApi } from '../services/api';
import AudioBanner from './AudioBanner';

const { Option } = Select;

interface CreatePart3ModalProps {
    open: boolean;
    onCancel: () => void;
    onSuccess: () => void;
    partId: string | null;
    partNumber: number; // 3 or 4
    partName?: string;
}

export default function CreatePart3Modal({ open, onCancel, onSuccess, partId, partNumber, partName }: CreatePart3ModalProps) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [nextQuestionNumber, setNextQuestionNumber] = useState<number>(1);

    const defaultStart = partNumber === 3 ? 32 : 71;

    useEffect(() => {
        if (open && partId) {
            fetchNextQuestionNumber();
        } else {
            form.resetFields();
            setAudioFile(null);
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
                    setNextQuestionNumber(defaultStart);
                }
            }
        } catch (error) {
            console.error('Error fetching questions:', error);
        }
    };

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

    const handleDownloadTemplate = () => {
        const rows = [
            { 'Nhóm': 1, 'Transcript nhóm': '', 'Số câu': defaultStart, 'Nội dung câu hỏi': '', 'A': '', 'B': '', 'C': '', 'D': '', 'Đáp án đúng': '' },
            { 'Nhóm': 1, 'Transcript nhóm': '', 'Số câu': defaultStart + 1, 'Nội dung câu hỏi': '', 'A': '', 'B': '', 'C': '', 'D': '', 'Đáp án đúng': '' },
            { 'Nhóm': 1, 'Transcript nhóm': '', 'Số câu': defaultStart + 2, 'Nội dung câu hỏi': '', 'A': '', 'B': '', 'C': '', 'D': '', 'Đáp án đúng': '' },
        ];
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Part ${partNumber}`);
        XLSX.writeFile(wb, `Part${partNumber}_group_template.xlsx`);
    };

    const handleExcelImport = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows: any[] = XLSX.utils.sheet_to_json(sheet);

                if (rows.length === 0) { message.error('File Excel trống!'); return; }

                // Take at most 3 rows (one group)
                const groupRows = rows.slice(0, 3);
                const transcript = String(groupRows[0]?.['Transcript nhóm'] || groupRows[0]?.['transcript'] || '');

                const newQuestions = groupRows.map((row: any, i: number) => ({
                    questionNumber: Number(row['Số câu'] || nextQuestionNumber + i),
                    questionText: String(row['Nội dung câu hỏi'] || row['questionText'] || ''),
                    optionA: String(row['A'] || row['optionA'] || ''),
                    optionB: String(row['B'] || row['optionB'] || ''),
                    optionC: String(row['C'] || row['optionC'] || ''),
                    optionD: String(row['D'] || row['optionD'] || ''),
                    correctAnswer: String(row['Đáp án đúng'] || row['correctAnswer'] || '').toUpperCase() || undefined,
                }));

                form.setFieldsValue({ transcript, questions: newQuestions });
                message.success('Đã nạp dữ liệu từ Excel! Nhớ upload audio trước khi lưu.');
            } catch (err: any) {
                message.error('Lỗi khi đọc file Excel: ' + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
        return false;
    };

    const handleSubmit = async (values: any) => {
        if (!partId) return;

        if (!audioFile) {
            message.error('Vui lòng upload file âm thanh cho nhóm này!');
            return;
        }

        try {
            setLoading(true);

            const actualFile = (audioFile as any)?.originFileObj || audioFile;
            const audioRes = await uploadApi.audio(actualFile);

            if (!audioRes.success) throw new Error(audioRes.message || 'Upload âm thanh thất bại');
            const audioUrl = audioRes.url;

            const questionsPayload = values.questions.map((q: any) => ({
                questionNumber: q.questionNumber,
                questionText: q.questionText,
                optionA: q.optionA,
                optionB: q.optionB,
                optionC: q.optionC,
                optionD: q.optionD,
                correctAnswer: q.correctAnswer,
                explanation: values.transcript,
                audioUrl: audioUrl,
                transcript: values.transcript
            }));

            const payload = {
                passage: `<audio src="${audioUrl}">`,
                questions: questionsPayload,
                audioUrl: audioUrl,
                transcript: values.transcript
            };

            const response = await api.post(`/parts/${partId}/questions/batch`, payload);

            if (response.data.success) {
                message.success(`Tạo nhóm câu hỏi Part ${partNumber} thành công!`);
                form.resetFields();
                setAudioFile(null);
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
            title={
                <div style={{ textAlign: 'center', width: '100%', fontSize: 20, fontWeight: 800, textTransform: 'uppercase', color: '#1E293B' }}>
                    {partName
                        ? (partName.toUpperCase().startsWith('PART') ? partName : `PART ${partNumber}: ${partName}`)
                        : `Thêm nhóm câu hỏi Part ${partNumber}`}
                </div>
            }
            open={open}
            onCancel={onCancel}
            footer={null}
            width={900}
            destroyOnClose={true}
        >
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
                {/* ─── AUDIO BANNER (top) ─── */}
                <AudioBanner
                    currentAudioUrl={null}
                    newAudioFile={audioFile}
                    onAudioFileChange={setAudioFile}
                />

                {/* ─── EXCEL IMPORT BUTTONS ─── */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
                    <Tooltip title={`Tải file Excel mẫu cho 1 nhóm câu hỏi (3 câu)`}>
                        <Button icon={<FileExcelOutlined />} onClick={handleDownloadTemplate} style={{ borderRadius: 8, color: '#16A34A', borderColor: '#16A34A' }}>
                            Tải file mẫu
                        </Button>
                    </Tooltip>
                    <Button
                        icon={<FileExcelOutlined />}
                        style={{ borderRadius: 8, background: '#16A34A', color: '#fff', border: 'none', fontWeight: 600 }}
                        onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.xlsx,.xls';
                            input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) handleExcelImport(file);
                            };
                            input.click();
                        }}
                    >
                        Import Excel (1 nhóm)
                    </Button>
                </div>

                <Card title="Transcript / Nội dung hội thoại chung" style={{ marginBottom: 16, borderRadius: 12 }}>
                    <Form.Item label="Transcript / Giải thích chung" name="transcript">
                        <Input.TextArea rows={4} placeholder="Nhập nội dung hội thoại/bài nói..." style={{ borderRadius: 8 }} />
                    </Form.Item>
                </Card>

                <Form.List name="questions">
                    {(fields) => (
                        <div style={{ maxHeight: '50vh', overflowY: 'auto', paddingRight: 5 }}>
                            {fields.map((field, index) => (
                                <Card
                                    key={field.key}
                                    title={<span style={{ fontWeight: 700 }}>Câu hỏi {index + 1}</span>}
                                    size="small"
                                    style={{ marginBottom: 16, borderRadius: 12, border: '1px solid #E2E8F0' }}
                                >
                                    <Form.Item {...field} label="Số câu" name={[field.name, 'questionNumber']} rules={[{ required: true }]}>
                                        <InputNumber style={{ borderRadius: 8 }} />
                                    </Form.Item>
                                    <Form.Item {...field} label="Nội dung câu hỏi" name={[field.name, 'questionText']} rules={[{ required: true }]}>
                                        <Input style={{ borderRadius: 8 }} />
                                    </Form.Item>
                                    <Space style={{ display: 'flex', marginBottom: 8 }} align="start">
                                        <Form.Item {...field} name={[field.name, 'optionA']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                            <Input prefix="(A)" placeholder="Đáp án A" style={{ borderRadius: 8 }} />
                                        </Form.Item>
                                        <Form.Item {...field} name={[field.name, 'optionB']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                            <Input prefix="(B)" placeholder="Đáp án B" style={{ borderRadius: 8 }} />
                                        </Form.Item>
                                    </Space>
                                    <Space style={{ display: 'flex' }} align="start">
                                        <Form.Item {...field} name={[field.name, 'optionC']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                            <Input prefix="(C)" placeholder="Đáp án C" style={{ borderRadius: 8 }} />
                                        </Form.Item>
                                        <Form.Item {...field} name={[field.name, 'optionD']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                            <Input prefix="(D)" placeholder="Đáp án D" style={{ borderRadius: 8 }} />
                                        </Form.Item>
                                    </Space>
                                    <Form.Item {...field} label="Đáp án đúng" name={[field.name, 'correctAnswer']} rules={[{ required: true }]} style={{ marginTop: 16 }}>
                                        <Select style={{ width: 120, borderRadius: 8 }}>
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

                <div style={{ textAlign: 'right', marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Button onClick={onCancel} style={{ borderRadius: 8 }}>Hủy</Button>
                    <Button type="primary" htmlType="submit" loading={loading}
                        style={{ borderRadius: 8, background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)', border: 'none', fontWeight: 700 }}>
                        Tạo nhóm câu hỏi
                    </Button>
                </div>
            </Form>
        </Modal>
    );
}
