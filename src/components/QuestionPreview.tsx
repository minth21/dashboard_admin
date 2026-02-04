import { Tag, Space, Button } from 'antd';
import { EditOutlined } from '@ant-design/icons';

interface Question {
    id: string;
    questionNumber: number;
    questionText?: string;
    optionA?: string;
    optionB?: string;
    optionC?: string;
    optionD?: string;
    correctAnswer: string;
    explanation?: string;
    passage?: string; // Added passage
}

interface QuestionPreviewProps {
    questions: Question[];
    loading: boolean;
    onEdit?: (question: Question) => void;
}

export default function QuestionPreview({ questions, loading, onEdit }: QuestionPreviewProps) {
    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 20 }}>
                <Space>
                    <span>Đang tải câu hỏi...</span>
                </Space>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div style={{
                textAlign: 'center',
                padding: 40,
                color: '#8c8c8c',
                border: '1px dashed #d9d9d9',
                borderRadius: 8
            }}>
                Chưa có câu hỏi nào. Hãy import câu hỏi từ Excel.
            </div>
        );
    }

    // Group questions by passage
    const groupedQuestions = questions.reduce((acc, q) => {
        const lastGroup = acc[acc.length - 1];
        // Normalize passages for comparison (handle undefined/null and whitespace)
        const currentPassage = q.passage?.trim() || '';
        const lastPassage = lastGroup?.passage?.trim() || '';

        // Group if passages are essentially identical
        // OR if it's the first item
        if (lastGroup && currentPassage === lastPassage) {
            lastGroup.questions.push(q);
        } else {
            acc.push({
                passage: q.passage, // Keep original passage
                questions: [q]
            });
        }
        return acc;
    }, [] as { passage?: string; questions: Question[] }[]);

    return (
        <div style={{
            maxHeight: 400,
            overflowY: 'auto',
            border: '1px solid #d9d9d9',
            borderRadius: 8,
            padding: 16,
            background: '#fafafa'
        }}>
            {groupedQuestions.map((group, groupIndex) => (
                <div key={groupIndex} style={{ marginBottom: 24 }}>
                    {/* Render Passage if exists */}
                    {group.passage ? (
                        <div style={{
                            background: '#f0f5ff',
                            padding: '12px 16px',
                            borderRadius: '8px 8px 0 0',
                            border: '1px solid #adc6ff',
                            borderBottom: 'none',
                            maxHeight: 200, // Limit passage height
                            overflowY: 'auto' // Allow scrolling within passage
                        }}>
                            <div style={{ fontWeight: 600, color: '#10239e', marginBottom: 8 }}>Đoạn văn:</div>
                            <div dangerouslySetInnerHTML={{ __html: group.passage }} />
                        </div>
                    ) : null}

                    {/* Render Questions in this group */}
                    <div style={{
                        background: group.passage ? 'white' : 'transparent',
                        padding: group.passage ? 16 : 0,
                        border: group.passage ? '1px solid #adc6ff' : 'none',
                        borderRadius: group.passage ? '0 0 8px 8px' : 0,
                    }}>
                        {group.questions.map((q, index) => (
                            <div
                                key={q.id || index}
                                style={{
                                    background: 'white',
                                    padding: 16,
                                    borderRadius: 8,
                                    marginBottom: 12,
                                    border: '1px solid #e8e8e8'
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    marginBottom: 8
                                }}>
                                    {onEdit && (
                                        <Button
                                            type="link"
                                            size="small"
                                            icon={<EditOutlined />}
                                            onClick={() => onEdit(q)}
                                        >
                                            Sửa
                                        </Button>
                                    )}
                                </div>
                                <div
                                    style={{
                                        fontSize: 14,
                                        marginBottom: 12,
                                        lineHeight: 1.6
                                    }}
                                >
                                    {/* Show question text if exists, otherwise show placeholder for Part 6 blanks */}
                                    {q.questionText ? (
                                        <div dangerouslySetInnerHTML={{ __html: q.questionText }} />
                                    ) : (
                                        <div style={{ fontStyle: 'italic', color: '#888' }}>
                                            <strong>Câu {q.questionNumber}:</strong> (Điền vào chỗ trống)
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gap: 8 }}>
                                    {['A', 'B', 'C', 'D'].map(option => {
                                        const optionKey = `option${option}` as keyof Question;
                                        const isCorrect = q.correctAnswer === option;
                                        return (
                                            <div
                                                key={option}
                                                style={{
                                                    padding: '8px 12px',
                                                    borderRadius: 6,
                                                    border: isCorrect ? '2px solid #52c41a' : '1px solid #e8e8e8',
                                                    background: isCorrect ? '#f6ffed' : 'white',
                                                    fontSize: 13,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8
                                                }}
                                            >
                                                <span style={{
                                                    fontWeight: 600,
                                                    color: isCorrect ? '#52c41a' : '#8c8c8c'
                                                }}>
                                                    {option}.
                                                </span>
                                                <span>{q[optionKey] || `Option ${option}`}</span>
                                                {isCorrect && (
                                                    <Tag color="success" style={{ marginLeft: 'auto' }}>
                                                        Đáp án đúng
                                                    </Tag>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
