import { useState, useEffect } from 'react';
import { Modal, Table, Button, message, Tag, Progress, Popover, Alert } from 'antd';
import api, { aiApi } from '../services/api';

interface Question {
    questionNumber: number;
    questionText: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: string;
    explanation?: string; // AI-generated explanation in preview
    questionTranslation?: string;
    optionTranslations?: any; // Dạng Object hoặc String
    keyVocabulary?: any; // Dạng JSON String hoặc Array
    level?: string;
}

interface CreatePart5BulkModalProps {
    open: boolean;
    onCancel: () => void;
    onSuccess: () => void;
    initialData: any[]; // JSON data from Excel
    partId: string | null;
    importMode: 'new' | 'append' | 'replace'; // Import mode
    partName?: string;
    partNumber?: number;
}

const CreatePart5BulkModal = ({ open, onCancel, onSuccess, initialData, partId, importMode, partName, partNumber }: CreatePart5BulkModalProps) => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(false);
    const [aiProgress, setAiProgress] = useState(0);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [batchLabel, setBatchLabel] = useState<string>('');

    useEffect(() => {
        if (open && initialData.length > 0) {
            // Map Excel data to Question interface
            const mappedQuestions = initialData.map((row: any) => ({
                questionNumber: row['Số câu'],
                questionText: row['Nội dung câu hỏi'] || '',
                optionA: row['A'] || '',
                optionB: row['B'] || '',
                optionC: row['C'] || '',
                optionD: row['D'] || '',
                // Support multiple header variations
                correctAnswer: row['Đáp án'] || row['Đáp án đúng'] || row['Correct Answer'] || row['Correct'] || ''
            }));
            setQuestions(mappedQuestions);
        }
    }, [open, initialData]);

    const handleEnrichAiAll = async () => {
        const totalQuestions = questions.length;
        const BATCH_SIZE = 3; // Giảm xuống 3 để tránh LLM truncation và tăng độ ổn định
        const totalBatches = Math.ceil(totalQuestions / BATCH_SIZE);
        let successCount = 0;

        setIsAiProcessing(true);
        setAiProgress(0);
        setBatchLabel('Đang khởi động AI...');

        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const batchStart = batchIndex * BATCH_SIZE;
            const batchEnd = Math.min(batchStart + BATCH_SIZE, totalQuestions);

            // Cập nhật label ngay trước khi gọi API
            setBatchLabel(`Đang phân tích AI (${batchStart + 1}–${batchEnd} / ${totalQuestions})...`);

            // Lấy snapshot câu hiện tại để lọc (dùng ref thay vì closure)
            const currentSnapshot = questions.slice(batchStart, batchEnd);
            const questionsToProcess = currentSnapshot.filter(q => !q.explanation?.trim());

            if (questionsToProcess.length > 0) {
                try {
                    // ─── Gọi API AI ───────────────────────────────────────────
                    const response = await aiApi.enrichPart5Batch({
                        questions: questionsToProcess.map(q => ({
                            questionNumber: q.questionNumber,
                            questionText: q.questionText,
                            options: { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD },
                            correctAnswer: q.correctAnswer,
                        })),
                    });

                    if (response.success && Array.isArray(response.data)) {
                        // ─── Functional update: merge an toàn vào state ───────
                        // Dùng prev để không bao giờ bị overwrite bởi stale closure
                        const aiMap = new Map<number, any>(
                            response.data.map((item: any) => [item.questionNumber, item])
                        );

                        setQuestions(prev =>
                            prev.map(q => {
                                const aiItem = aiMap.get(q.questionNumber);
                                if (!aiItem) return q; // Câu không trong batch này, giữ nguyên
                                successCount++;
                                return {
                                    ...q,
                                    // Bổ sung logic Auto-fill: Nếu q.correctAnswer trống thì lấy calculatedAnswer từ AI
                                    correctAnswer: (!q.correctAnswer || q.correctAnswer === '')
                                        ? (aiItem.calculatedAnswer || q.correctAnswer)
                                        : q.correctAnswer,
                                    explanation: aiItem.explanation ?? q.explanation,
                                    questionTranslation: aiItem.questionTranslation ?? q.questionTranslation,
                                    optionTranslations: aiItem.optionTranslations
                                        ? JSON.stringify(aiItem.optionTranslations)
                                        : q.optionTranslations,
                                    keyVocabulary: aiItem.keyVocabulary
                                        ? JSON.stringify(aiItem.keyVocabulary)
                                        : q.keyVocabulary,
                                    level: aiItem.level ?? q.level,
                                };
                            })
                        );
                    } else {
                        console.error(`[AI Batch ${batchIndex + 1}] Response invalid:`, response);
                    }
                } catch (batchError: any) {
                    // ─── Lỗi 1 batch KHÔNG dừng toàn bộ tiến trình ──────────
                    console.error(`[AI Batch ${batchIndex + 1}] Error:`, batchError?.message || batchError);
                    // Câu trong batch này vẫn được giữ nguyên, vòng lặp tiếp tục
                }
            }

            // Cập nhật progress bar sau mỗi batch (kể cả batch bị skip/lỗi)
            setAiProgress(Math.round((batchEnd / totalQuestions) * 100));

            // Cooldown 12s giữa các batch để tránh rate limit AI (5 req/min)
            if (batchEnd < totalQuestions) {
                await new Promise(resolve => setTimeout(resolve, 12000));
            }
        }

        // ─── Kết thúc toàn bộ vòng lặp ───────────────────────────────────────
        setIsAiProcessing(false);
        setBatchLabel('');
        setAiProgress(100);
        // message.info(`Đã phân tích xong ${successCount}/${totalQuestions} câu.`);
    };

    const handleSave = async () => {
        if (!partId) return;
        setLoading(true);
        try {
            const response = await api.post(`/parts/${partId}/questions/batch`, {
                questions: questions.map((q: any) => ({
                    questionNumber: q.questionNumber,
                    questionText: q.questionText,
                    optionA: q.optionA,
                    optionB: q.optionB,
                    optionC: q.optionC,
                    optionD: q.optionD,
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation || '', // Include AI-generated explanation
                    questionTranslation: q.questionTranslation || '',
                    optionTranslations: q.optionTranslations || '',
                    keyVocabulary: q.keyVocabulary || ''
                })),
                mode: importMode // Pass import mode to backend
            });

            if (response.data.success) {
                message.success(`Đã lưu ${response.data.count || questions.length} câu hỏi thành công!`);
                onSuccess();
                onCancel();
            } else {
                throw new Error(response.data.message);
            }

        } catch (error: any) {
            console.error('Save error:', error);
            message.error(error.message || 'Lỗi khi lưu câu hỏi');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: 'Số câu',
            dataIndex: 'questionNumber',
            width: 80,
            render: (text: number) => <b>{text}</b>
        },
        {
            title: 'Nội dung câu hỏi',
            dataIndex: 'questionText',
            ellipsis: true,
            width: 250
        },
        {
            title: 'Dịch câu hỏi',
            dataIndex: 'questionTranslation',
            width: 250,
            render: (text: string) => text ? (
                <div
                    dangerouslySetInnerHTML={{ __html: text }}
                    style={{ fontSize: 13, color: '#475569' }}
                />
            ) : <span style={{ color: '#CBD5E1', fontStyle: 'italic' }}>Chưa có</span>
        },
        {
            title: 'A',
            dataIndex: 'optionA',
            ellipsis: true,
            width: 150
        },
        {
            title: 'B',
            dataIndex: 'optionB',
            ellipsis: true,
            width: 150
        },
        {
            title: 'C',
            dataIndex: 'optionC',
            ellipsis: true,
            width: 150
        },
        {
            title: 'D',
            dataIndex: 'optionD',
            ellipsis: true,
            width: 150
        },
        {
            title: 'Đáp án',
            dataIndex: 'correctAnswer',
            width: 100,
            fixed: 'right' as const,
            render: (text: string) => <Tag color="green">{text}</Tag>
        },
        {
            title: 'Lời giải',
            dataIndex: 'explanation',
            width: 200,
            fixed: 'right' as const,
            render: (text: string) => {
                if (!text) {
                    return <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Chờ AI xử lý...</span>;
                }

                return (
                    <Popover
                        content={
                            <div style={{ maxWidth: 450 }}>
                                <div style={{ marginBottom: 12, fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #E2E8F0', paddingBottom: 8 }}>
                                    Review Lời giải
                                </div>
                                <div
                                    dangerouslySetInnerHTML={{ __html: text }}
                                    style={{
                                        padding: '12px',
                                        background: '#F8FAFC',
                                        borderRadius: 8,
                                        maxHeight: 400,
                                        overflowY: 'auto',
                                        lineHeight: 1.6
                                    }}
                                />
                                <div style={{ marginTop: 12, textAlign: 'right' }}>
                                    <Button
                                        size="small"
                                        type="link"
                                        onClick={() => {
                                            // Handle edit if needed
                                        }}
                                    >
                                        Chỉnh sửa Raw HTML
                                    </Button>
                                </div>
                            </div>
                        }
                        title={null}
                        trigger="hover"
                        overlayStyle={{ padding: 0 }}
                    >
                        <div style={{
                            cursor: 'pointer',
                            color: '#7C3AED',
                            background: '#F5F3FF',
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            border: '1px solid #DDD6FE',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            textAlign: 'center'
                        }}>
                            Xem chi tiết lời giải
                        </div>
                    </Popover>
                );
            }
        }
    ];

    return (
        <Modal
            title={
                <div style={{ textAlign: 'center', width: '100%', fontSize: 18, fontWeight: 800, textTransform: 'uppercase', color: '#1E293B' }}>
                    {partName
                        ? (partName.toUpperCase().startsWith('PART') ? partName : `PART ${partNumber}: ${partName}`)
                        : `Preview Import - ${questions.length} câu hỏi`}
                </div>
            }
            open={open}
            onCancel={onCancel}
            width={1400}
            footer={[
                <Button key="cancel" onClick={onCancel} disabled={loading || isAiProcessing} style={{ borderRadius: 10, height: 44 }}>
                    Hủy bỏ
                </Button>,
                <Button
                    key="ai"
                    type="primary"
                    onClick={handleEnrichAiAll}
                    loading={isAiProcessing}
                    disabled={loading}
                    style={{
                        background: 'linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)',
                        border: 'none',
                        height: 44,
                        padding: '0 24px',
                        fontWeight: 700,
                        borderRadius: 10,
                        boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)'
                    }}
                >
                    AI phân tích
                </Button>,
                <Button
                    key="save"
                    type="primary"
                    onClick={handleSave}
                    loading={loading}
                    disabled={isAiProcessing}
                    style={{
                        borderRadius: 10,
                        height: 44,
                        padding: '0 24px',
                        fontWeight: 700,
                        background: '#10B981',
                        border: 'none',
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                    }}
                >
                    Lưu tất cả
                </Button>
            ]}
        >
            {isAiProcessing && (
                <div style={{ marginBottom: 16 }}>
                    <Progress
                        percent={aiProgress}
                        status="active"
                        strokeColor={{ '0%': '#7C3AED', '100%': '#2563EB' }}
                    />
                    <div style={{
                        textAlign: 'center',
                        marginTop: 8,
                        fontWeight: 600,
                        fontSize: 13,
                        color: '#7C3AED',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                    }}>
                        {batchLabel || 'Đang khởi động AI...'}
                    </div>
                </div>
            )}

            {!isAiProcessing && (
                <Alert
                    message={<span style={{ fontWeight: 800, color: '#1E40AF' }}>HƯỚNG DẪN QUY TRÌNH AI</span>}
                    description={
                        <div style={{ marginTop: 8 }}>
                            <div style={{ display: 'flex', gap: 24 }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ marginBottom: 4 }}><b>1. Kiểm tra:</b> Rà soát lại dữ liệu vừa nạp từ Excel.</div>
                                    <div><b>2. Kích hoạt AI:</b> Bấm nút màu tím <b>"AI phân tích"</b> bên dưới.</div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ marginBottom: 4 }}><b>3. Duyệt:</b> Click vào cột "Lời giải AI" để xem chi tiết / chỉnh sửa.</div>
                                    <div><b>4. Hoàn tất:</b> Bấm "Lưu tất cả" để ghi nhận vào hệ thống.</div>
                                </div>
                            </div>
                            <div style={{ marginTop: 8, padding: '4px 8px', background: '#DBEAFE', borderRadius: 6, display: 'inline-block', fontSize: 12 }}>
                                AI sẽ bóc tách 3 câu/lần để đảm bảo độ chính xác cao nhất!
                            </div>
                        </div>
                    }
                    type="info"
                    style={{ marginBottom: 20, borderRadius: 16, border: '1px solid #BFDBFE' }}
                />
            )}

            <Table
                dataSource={questions}
                columns={columns}
                rowKey="questionNumber"
                pagination={{ pageSize: 10 }}
                size="small"
                scroll={{ x: 900, y: 500 }}
            />
        </Modal>
    );
};

export default CreatePart5BulkModal;
