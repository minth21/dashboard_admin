import { useState, useEffect } from 'react';
import { Modal, Select, message, Button, Row, Col, Card, Input, Tooltip } from 'antd';
import { FileExcelOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import api, { uploadApi, partApi } from '../services/api';
import AudioBanner from './AudioBanner';

const { Option } = Select;
const { TextArea } = Input;

interface CreatePart2BulkModalProps {
    open: boolean;
    onCancel: () => void;
    onSuccess: () => void;
    partId: string | null;
    currentAudioUrl?: string;
    partName?: string;
    partNumber?: number;
}

interface QuestionData {
    questionNumber: number;
    questionText: string;
    optionA: string;
    optionB: string;
    optionC: string;
    correctAnswer: string | undefined;
}

export default function CreatePart2BulkModal({ open, onCancel, onSuccess, partId, currentAudioUrl, partName, partNumber }: CreatePart2BulkModalProps) {
    const [loading, setLoading] = useState(false);
    const [questions, setQuestions] = useState<QuestionData[]>([]);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [excelImporting, setExcelImporting] = useState(false);

    useEffect(() => {
        if (open) {
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

    const handleDownloadTemplate = () => {
        const rows = [];
        for (let i = 7; i <= 31; i++) {
            rows.push({
                'Số câu': i,
                'Transcript (câu hỏi)': '',
                'A': '',
                'B': '',
                'C': '',
                'Đáp án đúng': '',
            });
        }
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Part 2');
        XLSX.writeFile(wb, 'Part2_template.xlsx');
    };

    const handleExcelImport = (file: File) => {
        setExcelImporting(true);
        try {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

                    const newQuestions = [...questions];
                    rows.forEach((row: any) => {
                        const num = Number(row['Số câu'] || row['questionNumber'] || 0);
                        const idx = newQuestions.findIndex(q => q.questionNumber === num);
                        if (idx !== -1) {
                            newQuestions[idx] = {
                                ...newQuestions[idx],
                                questionText: String(row['Transcript (câu hỏi)'] || row['Transcript'] || row['questionText'] || ''),
                                optionA: String(row['A'] || row['optionA'] || ''),
                                optionB: String(row['B'] || row['optionB'] || ''),
                                optionC: String(row['C'] || row['optionC'] || ''),
                                correctAnswer: String(row['Đáp án đúng'] || row['correctAnswer'] || '').toUpperCase() || undefined,
                            };
                        }
                    });
                    setQuestions(newQuestions);
                    message.success(`Đã nạp dữ liệu từ Excel! Kiểm tra và nhấn "Lưu tất cả" để lưu.`);
                } catch (err: any) {
                    message.error('Lỗi khi đọc file Excel: ' + err.message);
                } finally {
                    setExcelImporting(false);
                }
            };
            reader.readAsArrayBuffer(file);
        } catch (err: any) {
            message.error('Lỗi khi đọc file Excel: ' + err.message);
            setExcelImporting(false);
        }
        return false;
    };

    const handleSubmit = async () => {
        if (!partId) return;

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

            let newAudioUrl = currentAudioUrl;
            if (audioFile) {
                const audioRes = await uploadApi.audio(audioFile);
                if (audioRes.success) {
                    newAudioUrl = audioRes.url;
                    await partApi.update(partId, { audioUrl: newAudioUrl });
                } else {
                    throw new Error('Upload Audio thất bại');
                }
            }

            const promises = questions.map(q => {
                const payload = {
                    questionNumber: q.questionNumber,
                    questionText: q.questionText || 'Listen to the question and mark your answer.',
                    optionA: q.optionA,
                    optionB: q.optionB,
                    optionC: q.optionC,
                    optionD: null,
                    correctAnswer: q.correctAnswer,
                    explanation: ''
                };
                return api.post(`/parts/${partId}/questions`, payload);
            });

            await Promise.all(promises);

            message.success('Đã tạo thành công Part 2 (Audio + 25 câu hỏi)!');
            onSuccess();
            onCancel();
        } catch (error: any) {
            console.error('Error creating batch:', error);
            message.error(error.response?.data?.message || error.message || 'Có lỗi xảy ra');
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
                        : 'TẠO CÂU HỎI CHO PART 2'}
                </div>
            }
            open={open}
            onCancel={onCancel}
            width={1200}
            footer={[
                <Button key="cancel" onClick={onCancel}>Hủy</Button>,
                <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}
                    style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)', border: 'none', fontWeight: 700, borderRadius: 8 }}>
                    Lưu tất cả
                </Button>,
            ]}
            destroyOnClose={true}
        >
            {/* ─── AUDIO BANNER (top) ─── */}
            <AudioBanner
                currentAudioUrl={currentAudioUrl}
                newAudioFile={audioFile}
                onAudioFileChange={setAudioFile}
            />

            {/* ─── EXCEL IMPORT ROW ─── */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
                <Tooltip title="Tải file Excel mẫu (25 câu, Part 2)">
                    <Button icon={<FileExcelOutlined />} onClick={handleDownloadTemplate} style={{ borderRadius: 8, color: '#16A34A', borderColor: '#16A34A' }}>
                        Tải file mẫu
                    </Button>
                </Tooltip>
                <Button
                    icon={<FileExcelOutlined />}
                    loading={excelImporting}
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
                    Import Excel
                </Button>
            </div>

            <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '0 8px' }}>
                <Row gutter={[16, 16]}>
                    {questions.map((q, index) => (
                        <Col span={12} key={q.questionNumber}>
                            <Card
                                size="small"
                                title={<span style={{ fontWeight: 700, color: '#1E293B' }}>Câu {q.questionNumber}</span>}
                                bodyStyle={{ padding: 12 }}
                                style={{ borderRadius: 12, border: '1px solid #E2E8F0' }}
                            >
                                <div style={{ marginBottom: 12 }}>
                                    <TextArea
                                        placeholder="Nhập nội dung câu hỏi (Transcript)..."
                                        rows={2}
                                        value={q.questionText}
                                        onChange={(e) => handleQuestionChange(index, 'questionText', e.target.value)}
                                        style={{ borderRadius: 8 }}
                                    />
                                </div>

                                <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <Input addonBefore="A" value={q.optionA} onChange={(e) => handleQuestionChange(index, 'optionA', e.target.value)} placeholder="Đáp án A" style={{ borderRadius: 8 }} />
                                    <Input addonBefore="B" value={q.optionB} onChange={(e) => handleQuestionChange(index, 'optionB', e.target.value)} placeholder="Đáp án B" style={{ borderRadius: 8 }} />
                                    <Input addonBefore="C" value={q.optionC} onChange={(e) => handleQuestionChange(index, 'optionC', e.target.value)} placeholder="Đáp án C" style={{ borderRadius: 8 }} />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
                                    <span style={{ fontWeight: 600, color: '#F59E0B' }}>Đáp án đúng:</span>
                                    <Select
                                        placeholder="Chọn đáp án"
                                        style={{ width: 120 }}
                                        value={q.correctAnswer}
                                        onChange={(val) => handleQuestionChange(index, 'correctAnswer', val)}
                                        status={!q.correctAnswer ? 'warning' : ''}
                                    >
                                        <Option value="A">Đáp án A</Option>
                                        <Option value="B">Đáp án B</Option>
                                        <Option value="C">Đáp án C</Option>
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
