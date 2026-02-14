import { useState, useEffect } from 'react';
import { Modal, Table, Button, message, Tag, Progress, Popover, Input } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import api from '../services/api';

interface Question {
    questionNumber: number;
    questionText: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: string;
    explanation?: string; // AI-generated explanation in preview
}

interface CreatePart5BulkModalProps {
    open: boolean;
    onCancel: () => void;
    onSuccess: () => void;
    initialData: any[]; // JSON data from Excel
    partId: string | null;
    importMode: 'new' | 'append' | 'replace'; // Import mode
}

const CreatePart5BulkModal = ({ open, onCancel, onSuccess, initialData, partId, importMode }: CreatePart5BulkModalProps) => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(false);
    const [aiProgress, setAiProgress] = useState(0);
    const [isAiProcessing, setIsAiProcessing] = useState(false);

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
                correctAnswer: row['Đáp án đúng'] || ''
            }));
            setQuestions(mappedQuestions);
        }
    }, [open, initialData]);

    const handleGenerateAiAll = async () => {
        setIsAiProcessing(true);
        setAiProgress(0);
        const newQuestions = [...questions];
        let successCount = 0;
        const BATCH_SIZE = 10; // Process 10 questions per request

        try {
            // Split questions into batches of 5
            for (let batchStart = 0; batchStart < newQuestions.length; batchStart += BATCH_SIZE) {
                const batchEnd = Math.min(batchStart + BATCH_SIZE, newQuestions.length);
                const batch = newQuestions.slice(batchStart, batchEnd);

                // Filter out questions that already have explanations
                const questionsToProcess = batch.filter(q => !q.explanation?.trim());

                if (questionsToProcess.length === 0) {
                    setAiProgress(Math.round((batchEnd / newQuestions.length) * 100));
                    continue;
                }

                try {
                    const response = await api.post('/ai/generate-batch-explanations', {
                        questions: questionsToProcess.map(q => ({
                            questionNumber: q.questionNumber,
                            questionText: q.questionText,
                            options: {
                                A: q.optionA,
                                B: q.optionB,
                                C: q.optionC,
                                D: q.optionD
                            },
                            correctAnswer: q.correctAnswer
                        }))
                    });

                    if (response.data.success && response.data.explanations) {
                        console.log('AI Response:', response.data.explanations);
                        // Map explanations back to questions
                        response.data.explanations.forEach((exp: any, idx: number) => {
                            console.log(`Mapping explanation for Q${questionsToProcess[idx].questionNumber}:`, exp);
                            const questionIndex = newQuestions.findIndex(
                                q => q.questionNumber === questionsToProcess[idx].questionNumber
                            );
                            if (questionIndex !== -1) {
                                newQuestions[questionIndex].explanation = exp.explanation;
                                successCount++;
                            }
                        });
                    } else {
                        console.error('AI Response failed:', response.data);
                    }
                } catch (err) {
                    console.error(`AI Error for batch starting at q${batchStart + 1}:`, err);
                }

                // Update progress and state after each batch
                setQuestions([...newQuestions]);
                setAiProgress(Math.round((batchEnd / newQuestions.length) * 100));

                // Wait 12 seconds between batches (to stay within 5 requests/minute limit)
                if (batchEnd < newQuestions.length) {
                    await new Promise(resolve => setTimeout(resolve, 12000));
                }
            }
            message.success(`Đã tạo lời giải AI cho ${successCount}/${newQuestions.length} câu hỏi!`);
        } catch (error: any) {
            console.error('AI generation error:', error);
            message.error('Có lỗi xảy ra khi tạo lời giải AI');
        } finally {
            setIsAiProcessing(false);
        }
    };

    // AI generation removed - explanations will be generated separately after save

    const handleSave = async () => {
        if (!partId) return;
        setLoading(true);
        try {
            // API endpoint: /parts/:id/questions/bulk-create (need to check if exists or use loop)
            // Existing import uses /import endpoint which takes File. 
            // We should use the bulk-create endpoint if available, or just loop create.
            // Let's check backend routes first. For now assuming we can post array.

            // API endpoint: /parts/:partId/questions/batch
            // Controller expects: { passage, questions, audioUrl, transcript }

            const response = await api.post(`/parts/${partId}/questions/batch`, {
                questions: questions.map(q => ({
                    questionNumber: q.questionNumber,
                    questionText: q.questionText,
                    optionA: q.optionA,
                    optionB: q.optionB,
                    optionC: q.optionC,
                    optionD: q.optionD,
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation || '' // Include AI-generated explanation
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
            title: 'Đáp án đúng',
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
            ellipsis: true,
            render: (text: string, _record: Question, index: number) => {
                if (!text) {
                    return <span style={{ color: '#999' }}>Chưa có</span>;
                }

                return (
                    <Popover
                        content={
                            <div style={{ maxWidth: 500 }}>
                                <div style={{ marginBottom: 8, fontWeight: 'bold' }}>Lời giải AI:</div>
                                <Input.TextArea
                                    value={text}
                                    onChange={(e) => {
                                        const newQuestions = [...questions];
                                        newQuestions[index].explanation = e.target.value;
                                        setQuestions(newQuestions);
                                    }}
                                    rows={8}
                                    placeholder="Chỉnh sửa lời giải..."
                                />
                            </div>
                        }
                        title="Chỉnh sửa lời giải"
                        trigger="click"
                    >
                        <div style={{ cursor: 'pointer', color: '#1890ff' }}>
                            {text.substring(0, 50)}...
                        </div>
                    </Popover>
                );
            }
        }
    ];

    return (
        <Modal
            title={`Preview Import - ${questions.length} câu hỏi`}
            open={open}
            onCancel={onCancel}
            width={1400}
            footer={[
                <Button key="cancel" onClick={onCancel} disabled={loading || isAiProcessing}>
                    Hủy
                </Button>,
                <Button
                    key="ai"
                    type="dashed"
                    onClick={handleGenerateAiAll}
                    loading={isAiProcessing}
                    disabled={loading}
                    style={{ background: '#e6f7ff', borderColor: '#1890ff', color: '#1890ff' }}
                >
                    🤖 Tạo lời giải AI
                </Button>,
                <Button
                    key="save"
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSave}
                    loading={loading}
                    disabled={isAiProcessing}
                >
                    Lưu tất cả
                </Button>
            ]}
        >
            {isAiProcessing && (
                <div style={{ marginBottom: 16 }}>
                    <Progress percent={aiProgress} status="active" />
                    <div style={{ textAlign: 'center', color: '#1890ff', marginTop: 8 }}>
                        Đang tạo lời giải AI...
                    </div>
                </div>
            )}

            {!isAiProcessing && (
                <div style={{ marginBottom: 16, padding: 12, background: '#e6f7ff', borderRadius: 4 }}>
                    <p style={{ margin: 0, color: '#0050b3' }}>
                        <strong>HƯỚNG DẪN SỬ DỤNG</strong>
                    </p>
                    <ol style={{ margin: '8px 0 0 20px', padding: 0, color: '#0050b3' }}>
                        <li>Kiểm tra dữ liệu đã import từ Excel</li>
                        <li>Click <strong>"Tạo lời giải AI"</strong> để tự động tạo lời giải cho tất cả câu hỏi
                            <ul style={{ marginTop: 4 }}>
                                <li>AI xử lý 5 câu/lần</li>
                                <li>{questions.length} câu sẽ mất khoảng {Math.ceil(questions.length / 5)} phút</li>
                            </ul>
                        </li>
                        <li><strong>Hover</strong> vào icon ở cột "Đáp án đúng" để xem lời giải</li>
                        <li><strong>Click</strong> vào lời giải để chỉnh sửa nếu cần</li>
                        <li>Click <strong>"Lưu tất cả"</strong> để lưu câu hỏi + lời giải</li>
                    </ol>
                </div>)}

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
