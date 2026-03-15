import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message, Card, Upload, Collapse, Alert, Button, Row, Col, Space, Radio, InputNumber, Empty, Progress, Tag } from 'antd';
import { DeleteOutlined, PlusOutlined, RobotOutlined, ExperimentOutlined, CameraOutlined, TranslationOutlined, BookOutlined, CheckCircleOutlined, GlobalOutlined } from '@ant-design/icons';
import ReactQuill from 'react-quill-new';
import 'quill/dist/quill.snow.css';
import api from '../services/api';
import { QUILL_MODULES, QUILL_FORMATS, buildImagePassageHtml } from '../utils/editorUtils';
const { Dragger } = Upload;

interface CreatePart7ModalProps {
    open: boolean;
    onCancel: () => void;
    onSuccess: () => void;
    partId: string | null;
    mode?: 'add' | 'edit';
    initialData?: any;
}

export default function CreatePart7Modal({ open, onCancel, onSuccess, partId, mode = 'add', initialData }: CreatePart7ModalProps) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [aiDoneIndexes, setAiDoneIndexes] = useState<number[]>([]);
    const [passageFileLists, setPassageFileLists] = useState<Record<number, any[]>>({});
    const [questionFileLists, setQuestionFileLists] = useState<Record<number, any[]>>({});
    const [aiInsights, setAiInsights] = useState<any>(null);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [aiProgress, setAiProgress] = useState(0);
    const [currentInsightIndex, setCurrentInsightIndex] = useState<number | null>(null);

    const [existingQuestionNumbers, setExistingQuestionNumbers] = useState<number[]>([]);
    const [duplicateWarning, setDuplicateWarning] = useState<string>('');

    // Sync AI Insights back to Form - Standardized for Antigravity contract
    useEffect(() => {
        if (aiInsights && currentInsightIndex !== null) {
            const passages = form.getFieldValue('passages');
            if (passages && passages[currentInsightIndex]) {
                const updatedPassages = [...passages];
                const item = updatedPassages[currentInsightIndex];

                // 1. Sync Passage Translation Data (JSON)
                item.passageTranslationData = JSON.stringify({
                    passages: aiInsights.passageTranslations || aiInsights.passages || [],
                    vocabulary: aiInsights.vocabulary || [],
                    questions: aiInsights.questions || []
                });

                // 2. Sync Questions and Re-build Full Explanations
                if (aiInsights.questions && Array.isArray(item.questions)) {
                    item.questions = item.questions.map((q: any) => {
                        const aiQ = aiInsights.questions.find((aq: any) => Number(aq.questionNumber) === Number(q.questionNumber));
                        if (aiQ) {
                            let metadataHeader = '';
                            const isFirst = q.questionNumber === item.questions[0].questionNumber;

                            if (isFirst) {
                                // Add Passages Translations
                                const pts = aiInsights.passageTranslations || aiInsights.passages || [];
                                if (pts.length > 0) {
                                    metadataHeader += `📄 DỊCH ĐOẠN VĂN:\n`;
                                    pts.forEach((pt: any) => {
                                        if (pt.label) metadataHeader += `[${pt.label}]\n`;
                                        (pt.items || pt.sentences || []).forEach((s: any) => {
                                            if (s.en && s.vi) metadataHeader += `${s.en}\n(${s.vi})\n`;
                                        });
                                        metadataHeader += '\n';
                                    });
                                }

                                // Add Vocabulary
                                if (aiInsights.vocabulary && aiInsights.vocabulary.length > 0) {
                                    metadataHeader += `📚 TỪ VỰNG QUAN TRỌNG:\n${aiInsights.vocabulary.map((v: any) => `${v.word}: ${v.meaning}`).join('\n')}\n\n`;
                                }
                            }

                            const formatOpt = (label: string) => 
                                `${label}. ${aiQ.optionTranslations?.[label] || ''}${label === q.correctAnswer ? '  ✅' : ''}`;

                            const fullExplanation = 
                                metadataHeader + 
                                `📋 DỊCH ĐÁP ÁN:\n${formatOpt('A')}\n${formatOpt('B')}\n${formatOpt('C')}\n${formatOpt('D')}\n\n` +
                                `✏️ PHÂN TÍCH:\n${aiQ.analysis || ''}\n\n🔍 BẰNG CHỨNG:\n${aiQ.evidence || ''}`;

                            return {
                                ...q,
                                explanation: fullExplanation
                            };
                        }
                        return q;
                    });
                }

                form.setFieldValue('passages', updatedPassages);
            }
        }
    }, [aiInsights, currentInsightIndex, form]);

    useEffect(() => {
        if (open) {
            if (mode === 'edit' && initialData) {
                const passage = initialData;
                const questions = (passage.questions || []).sort((a: any, b: any) => a.questionNumber - b.questionNumber);
                const firstQ = questions[0] || {};
                const lastQ = questions[questions.length - 1] || {};

                form.setFieldsValue({
                    passages: [{
                        passageTitle: (passage.passage?.match(/<p[^>]*>\s*<b>\s*(.*?)\s*<\/b>\s*<\/p>/)?.[1] || '').trim(),
                        passage: (passage.passage || '').replace(/<p[^>]*>\s*<b>\s*.*?\s*<\/b>\s*<\/p>/, '').trim(),
                        passageType: (passage.passage || '').includes('<img') ? 'image' : 'text',
                        passageTranslationData: firstQ.passageTranslationData,
                        startQuestion: firstQ.questionNumber,
                        endQuestion: lastQ.questionNumber,
                        questions: questions.map((q: any) => ({
                            id: q.id,
                            questionNumber: q.questionNumber,
                            questionText: (q.questionText || '').replace(/<[^>]+>/g, '').trim(),
                            optionA: q.optionA,
                            optionB: q.optionB,
                            optionC: q.optionC,
                            optionD: q.optionD,
                            correctAnswer: q.correctAnswer,
                            explanation: q.explanation
                        }))
                    }]
                });

                // Restore Image Links
                const pUrls = firstQ.passageImageUrl ? firstQ.passageImageUrl.split(',').filter(Boolean) : [];
                setPassageFileLists({ 0: pUrls.map((url: string, i: number) => ({
                    uid: `-p-${i}`, name: `Passage ${i+1}`, status: 'done', url, thumbUrl: url, response: { url }
                }))});

                // Restore scan links if any
                const sUrls = firstQ.questionScanUrl ? firstQ.questionScanUrl.split(',').filter(Boolean) : [];
                setQuestionFileLists({ 0: sUrls.map((url: string, i: number) => ({
                    uid: `-s-${i}`, name: `Scan ${i+1}`, status: 'done', url, thumbUrl: url, response: { url }
                }))});

                // Parse AI Insights for Sidebar
                if (firstQ.passageTranslationData && firstQ.passageTranslationData !== 'null') {
                    try {
                        const raw = JSON.parse(firstQ.passageTranslationData);
                        let pts = []; let voc = []; let qs = [];
                        if (Array.isArray(raw)) {
                            pts = raw;
                        } else {
                            pts = raw.passages || raw.passageTranslations || [];
                            voc = raw.vocabulary || [];
                            qs = raw.questions || [];
                        }

                        if (pts.length > 0) {
                            setAiInsights({ passageTranslations: pts, vocabulary: voc, questions: qs });
                            setAiDoneIndexes([0]);
                            setCurrentInsightIndex(0);
                        }
                    } catch (e) {
                        console.error('Failed to parse AI Insights', e);
                    }
                }
            } else {
                form.resetFields();
                setAiDoneIndexes([]);
                setDuplicateWarning('');
                setPassageFileLists({});
                setQuestionFileLists({});
                setAiInsights(null);
            }
            if (partId) fetchExistingQuestions();
        }
    }, [open, mode, initialData, partId, form]);

    const fetchExistingQuestions = async () => {
        if (!partId) return;
        try {
            const res = await api.get(`/parts/${partId}/questions`);
            if (res.data.success) {
                setExistingQuestionNumbers(res.data.questions.map((q: any) => q.questionNumber));
            }
        } catch { /* ignored */ }
    };

    const checkDuplicateRange = (start: number, end: number) => {
        if (!start || !end) { setDuplicateWarning(''); return; }
        if (start < 147 || end > 200) {
            setDuplicateWarning('Cảnh báo: Part 7 phải nằm trong khoảng câu 147 - 200.');
            return;
        }
        if (start > end) {
            setDuplicateWarning('Lỗi: Câu bắt đầu không thể lớn hơn câu kết thúc.');
            return;
        }
        const requested = Array.from({ length: end - start + 1 }, (_, i) => start + i);
        const duplicates = requested.filter(n => existingQuestionNumbers.includes(n));
        
        // If in edit mode, don't warn for current question numbers
        const currentQs = form.getFieldValue(['passages', 0, 'questions']) || [];
        const currentIds = currentQs.map((q: any) => q.questionNumber);
        const realDuplicates = duplicates.filter(n => !currentIds.includes(n));

        if (realDuplicates.length > 0) {
            setDuplicateWarning(`Câu ${realDuplicates.join(', ')} đã tồn tại trong bài thi này.`);
        } else {
            setDuplicateWarning('');
        }
    };

    const handleGenerateAI = async (index: number) => {
        const passages = form.getFieldValue('passages') || [];
        const item = passages[index];
        const questions = item?.questions;

        if (!item?.passage || !questions || questions.length === 0) {
            message.warning('Vui lòng nhập nội dung đoạn văn và câu hỏi!');
            return;
        }

        setIsAiProcessing(true);
        setAiProgress(30);
        setCurrentInsightIndex(index);
        setAiInsights(null);

        try {
            const fullPassage = item.passageTitle ? `${item.passageTitle}\n${item.passage}` : item.passage;
            const cleanPassage = fullPassage.replace(/<[^>]*>?/gm, ' ');

            const response = await api.post('/ai/generate-part7', {
                passageText: cleanPassage,
                questions: questions.map((q: any) => ({
                    questionNumber: q.questionNumber,
                    optionA: q.optionA, optionB: q.optionB,
                    optionC: q.optionC, optionD: q.optionD,
                    correctAnswer: q.correctAnswer,
                }))
            }, { timeout: 150000 });

            if (response.data.success) {
                const aiData = response.data.data;
                setAiInsights(aiData);
                setAiDoneIndexes(prev => [...new Set([...prev, index])]);
                setAiProgress(100);
                message.success('Đã tạo Insights & Lời giải cho Part 7!');
            }
        } catch (err: any) {
            message.error(`Lỗi AI: ${err.response?.data?.message || err.message}`);
        } finally {
            setIsAiProcessing(false);
            setAiProgress(0);
        }
    };

    const handleMagicScan = async (index: number) => {
        setIsAiProcessing(true);
        setAiProgress(30);
        try {
            const formData = new FormData();
            const allItems = [...(passageFileLists[index] || []), ...(questionFileLists[index] || [])];
            
            const newFiles = allItems.map(f => f.originFileObj).filter(Boolean);
            if (newFiles.length === 0) {
                message.warning('Vui lòng upload ảnh để quét!');
                setIsAiProcessing(false); return;
            }

            newFiles.forEach(f => formData.append('images', f));

            const response = await api.post('/ai/magic-scan-part7', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 150000
            });

            if (response.data.success) {
                const aiData = response.data.data;
                const passages = form.getFieldValue('passages');
                const updated = [...passages];
                
                const mergedQs = aiData.questions.map((aiQ: any) => ({
                    ...aiQ,
                    optionA: (aiQ.optionA || '').replace(/^\s*[\(\[]?[A-D][\)\].:]?\s*/i, '').trim(),
                    optionB: (aiQ.optionB || '').replace(/^\s*[\(\[]?[A-D][\)\].:]?\s*/i, '').trim(),
                    optionC: (aiQ.optionC || '').replace(/^\s*[\(\[]?[A-D][\)\].:]?\s*/i, '').trim(),
                    optionD: (aiQ.optionD || '').replace(/^\s*[\(\[]?[A-D][\)\].:]?\s*/i, '').trim(),
                    explanation: ''
                }));

                updated[index] = {
                    ...updated[index],
                    passage: aiData.passageHtml || '',
                    passageType: 'image',
                    startQuestion: mergedQs[0]?.questionNumber,
                    endQuestion: mergedQs[mergedQs.length - 1]?.questionNumber,
                    questions: mergedQs
                };

                form.setFieldValue('passages', updated);
                setAiInsights(aiData);
                setCurrentInsightIndex(index);
                message.success('Magic Scan Part 7 hoàn tất!');
            }
        } catch (error: any) {
            message.error(error.message || 'Lỗi Magic Scan');
        } finally {
            setIsAiProcessing(false); setAiProgress(0);
        }
    };

    const handleFinish = async (values: any) => {
        if (!partId) return;
        setLoading(true);
        try {
            for (let i = 0; i < values.passages.length; i++) {
                const item = values.passages[i];
                let passageHtml = '';
                if (item.passageTitle) passageHtml += `<p><b>${item.passageTitle}</b></p>`;
                
                // Build Image HTML if needed
                if (item.passageType === 'image') {
                    passageHtml += await buildImagePassageHtml(passageFileLists[i] || []);
                } else if (item.passageType === 'both') {
                    passageHtml += await buildImagePassageHtml(passageFileLists[i] || []);
                    passageHtml += item.passage || '';
                } else {
                    passageHtml += item.passage || '';
                }

                const passageImageUrl = (passageFileLists[i] || []).map(f => f.url || f.response?.url).filter(Boolean).join(',');
                const questionScanUrl = (questionFileLists[i] || []).map(f => f.url || f.response?.url).filter(Boolean).join(',');

                const payload = {
                    passage: passageHtml,
                    passageTranslationData: item.passageTranslationData,
                    questions: (item.questions || []).map((q: any) => ({
                        ...q,
                        passageImageUrl: passageImageUrl || null,
                        questionScanUrl: questionScanUrl || null,
                        correctAnswer: q.correctAnswer || 'A'
                    }))
                };

                if (mode === 'edit') {
                    // Update individual questions
                    for (const q of payload.questions) {
                        if (q.id) {
                            await api.patch(`/questions/${q.id}`, { ...q, passage: passageHtml, passageTranslationData: payload.passageTranslationData });
                        }
                    }
                } else {
                    await api.post(`/parts/${partId}/questions/batch`, payload);
                }
            }
            message.success('Đã lưu thành công!');
            onSuccess(); onCancel();
        } catch (e: any) {
            message.error(e.message || 'Lỗi khi lưu');
        } finally { setLoading(false); }
    };

    return (
        <Modal
            title={<Space><ExperimentOutlined style={{ color: '#6253E1' }} /> <span style={{ fontWeight: 700 }}>PART 7 PRO COMPANION</span></Space>}
            open={open} onCancel={onCancel} width={1250} style={{ top: 20 }} maskClosable={false}
            footer={[
                <Button key="cancel" onClick={onCancel}>Hủy bỏ</Button>,
                <Button key="submit" type="primary" onClick={() => form.submit()} loading={loading} style={{ background: '#6253E1' }}>Lưu tất cả</Button>
            ]}
        >
            <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ passages: [{}] }}>
                <Row gutter={24}>
                    {/* LEFT: EDITOR */}
                    <Col span={14}>
                        <div style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: 10 }}>
                            <Form.List name="passages">
                                {(fields, { add, remove }) => (
                                    <>
                                        {fields.map((field, index) => (
                                            <Card 
                                                key={field.key} size="small" 
                                                title={<span style={{ color: '#6253E1' }}>Nhóm Đoạn văn {index+1} {aiDoneIndexes.includes(index) && <CheckCircleOutlined style={{ color: '#52c41a' }} />}</span>}
                                                extra={
                                                    <Space>
                                                        <Form.Item noStyle shouldUpdate={(p, c) => p.passages?.[index]?.passageType !== c.passages?.[index]?.passageType}>
                                                            {() => (
                                                                <Button 
                                                                    size="small" type="primary" 
                                                                    icon={<RobotOutlined />} 
                                                                    loading={isAiProcessing && currentInsightIndex === index}
                                                                    onClick={() => form.getFieldValue(['passages', index, 'passageType']) === 'image' ? handleMagicScan(index) : handleGenerateAI(index)}
                                                                    style={{ background: '#6253E1' }}
                                                                >
                                                                    AI Analyis
                                                                </Button>
                                                            )}
                                                        </Form.Item>
                                                        <Button danger size="small" icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                                                    </Space>
                                                }
                                                style={{ marginBottom: 20, border: '1px solid #d9d9d9', borderRadius: 8 }}
                                            >
                                                <Row gutter={12}>
                                                    <Col span={6}><Form.Item label="Từ câu" name={[field.name, 'startQuestion']} rules={[{ required: true }]}><InputNumber placeholder="147" style={{ width: '100%' }} onChange={(v) => checkDuplicateRange(Number(v), form.getFieldValue(['passages', index, 'endQuestion']))} /></Form.Item></Col>
                                                    <Col span={6}><Form.Item label="Đến câu" name={[field.name, 'endQuestion']} rules={[{ required: true }]}><InputNumber placeholder="150" style={{ width: '100%' }} onChange={(v) => checkDuplicateRange(form.getFieldValue(['passages', index, 'startQuestion']), Number(v))} /></Form.Item></Col>
                                                    <Col span={12}><Form.Item label="Tiêu đề" name={[field.name, 'passageTitle']}><Input placeholder="Questions 147-150 refer to..." /></Form.Item></Col>
                                                </Row>
                                                
                                                {duplicateWarning && <Alert message={duplicateWarning} type="warning" showIcon style={{ marginBottom: 10 }} />}

                                                <Form.Item name={[field.name, 'passageType']} initialValue="text" style={{ marginBottom: 12 }}>
                                                    <Radio.Group buttonStyle="solid" size="small">
                                                        <Radio.Button value="text">Văn bản</Radio.Button>
                                                        <Radio.Button value="image">Hình ảnh</Radio.Button>
                                                        <Radio.Button value="both">Cả hai</Radio.Button>
                                                    </Radio.Group>
                                                </Form.Item>

                                                <Form.Item noStyle shouldUpdate>
                                                    {() => {
                                                        const type = form.getFieldValue(['passages', index, 'passageType']);
                                                        return (
                                                            <>
                                                                {(type === 'image' || type === 'both') && (
                                                                    <div style={{ marginBottom: 16 }}>
                                                                        <Dragger
                                                                            fileList={passageFileLists[index] || []} multiple listType="picture"
                                                                            action={`${api.defaults.baseURL}/upload/image`}
                                                                            headers={{ Authorization: `Bearer ${localStorage.getItem('admin_token')}` }}
                                                                            name="image"
                                                                            onChange={({ fileList }) => setPassageFileLists(prev => ({ ...prev, [index]: fileList }))}
                                                                        >
                                                                            <p className="ant-upload-drag-icon"><CameraOutlined /></p>
                                                                            <p className="ant-upload-text">Thả ảnh đoạn văn tại đây</p>
                                                                        </Dragger>
                                                                    </div>
                                                                )}
                                                                {(type === 'text' || type === 'both') && (
                                                                    <Form.Item name={[field.name, 'passage']} label="Nội dung Tiếng Anh">
                                                                        <ReactQuill theme="snow" modules={QUILL_MODULES} formats={QUILL_FORMATS} style={{ height: 180, marginBottom: 45 }} />
                                                                    </Form.Item>
                                                                )}
                                                            </>
                                                        )
                                                    }}
                                                </Form.Item>

                                                <Form.Item noStyle shouldUpdate>
                                                    {() => {
                                                        const start = Number(form.getFieldValue(['passages', index, 'startQuestion']));
                                                        const end = Number(form.getFieldValue(['passages', index, 'endQuestion']));
                                                        if (!start || !end || start > end) return <Empty description="Điền khoảng câu" />;
                                                        
                                                        const count = end - start + 1;
                                                        const current = form.getFieldValue(['passages', index, 'questions']) || [];
                                                        if (current.length !== count) {
                                                            const next = Array.from({ length: count }, (_, j) => ({
                                                                ...current[j], questionNumber: start + j, correctAnswer: current[j]?.correctAnswer || 'A'
                                                            }));
                                                            setTimeout(() => form.setFieldValue(['passages', index, 'questions'], next), 0);
                                                        }

                                                        return (
                                                            <Form.List name={[field.name, 'questions']}>
                                                                {(qFields) => (
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                                                        {qFields.map((qf, qi) => (
                                                                            <Card key={qf.key} size="small" bodyStyle={{ padding: 8 }} style={{ width: '48%', border: '1px dashed #ccc' }}>
                                                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                                                    <span style={{ fontWeight: 'bold' }}>#{start+qi}</span>
                                                                                    <Form.Item name={[qf.name, 'id']} hidden><Input /></Form.Item>
                                                                                    <Form.Item name={[qf.name, 'questionNumber']} hidden><Input /></Form.Item>
                                                                                    <Form.Item name={[qf.name, 'questionText']} style={{ flex: 1, margin: 0 }} rules={[{ required: true }]}><Input placeholder="Question content..." /></Form.Item>
                                                                                </div>
                                                                                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                                                                    <Form.Item name={[qf.name, 'optionA']} style={{ margin: 0 }}><Input placeholder="A" title="Option A" /></Form.Item>
                                                                                    <Form.Item name={[qf.name, 'optionB']} style={{ margin: 0 }}><Input placeholder="B" title="Option B" /></Form.Item>
                                                                                    <Form.Item name={[qf.name, 'optionC']} style={{ margin: 0 }}><Input placeholder="C" title="Option C" /></Form.Item>
                                                                                    <Form.Item name={[qf.name, 'optionD']} style={{ margin: 0 }}><Input placeholder="D" title="Option D" /></Form.Item>
                                                                                    <Form.Item name={[qf.name, 'correctAnswer']} style={{ margin: 0, width: 60 }}><Select options={[{value:'A'},{value:'B'},{value:'C'},{value:'D'}]} /></Form.Item>
                                                                                </div>
                                                                                <Form.Item name={[qf.name, 'explanation']} hidden><Input /></Form.Item>
                                                                            </Card>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </Form.List>
                                                        );
                                                    }}
                                                </Form.Item>
                                            </Card>
                                        ))}
                                        {mode === 'add' && <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add()} style={{ height: 45 }}>Thêm nhóm câu hỏi</Button>}
                                    </>
                                )}
                            </Form.List>
                        </div>
                    </Col>

                    {/* RIGHT: AI COMPANION */}
                    <Col span={10}>
                        <div style={{ background: '#f9f0ff', padding: 20, borderRadius: 12, height: '75vh', overflowY: 'auto', border: '1px solid #e1d5f5' }}>
                            <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                <RobotOutlined style={{ fontSize: 30, color: '#6253E1' }} />
                                <h3 style={{ color: '#6253E1', margin: '4px 0' }}>AI INSIGHTS COMPANION</h3>
                                <Progress percent={aiProgress} size="small" strokeColor="#6253E1" style={{ display: isAiProcessing ? 'block' : 'none' }} />
                            </div>

                            {!aiInsights ? <Empty description="Chưa có dữ liệu phân tích AI" style={{ marginTop: 50 }} /> : (
                                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                    {/* 1. Multi-Passage Translation */}
                                    <Card size="small" title={<Space><GlobalOutlined /> DỊCH SONG NGỮ</Space>}>
                                        {(aiInsights.passageTranslations || aiInsights.passages || []).map((p: any, pidx: number) => (
                                            <div key={pidx} style={{ marginBottom: 15 }}>
                                                <div style={{ fontWeight: 'bold', color: '#1890ff', borderBottom: '1px solid #eee', marginBottom: 8 }}>{p.label || `Passage ${pidx+1}`}</div>
                                                {(p.items || p.sentences || []).map((s: any, sidx: number) => (
                                                    <div key={sidx} style={{ marginBottom: 10, paddingLeft: 8, borderLeft: '2px solid #ccc' }}>
                                                        <div style={{ fontSize: 13 }}>{s.en}</div>
                                                        <div style={{ fontSize: 13, color: '#6253E1' }}>→ {s.vi}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </Card>

                                    {/* 2. Vocabulary Chips */}
                                    {aiInsights.vocabulary?.length > 0 && (
                                        <Card size="small" title={<Space><BookOutlined /> TỪ VỰNG</Space>}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {aiInsights.vocabulary.map((v: any, i: number) => (
                                                    <Tag color="purple" key={i} style={{ padding: '4px 8px', borderRadius: 4 }}><b>{v.word}</b>: {v.meaning}</Tag>
                                                ))}
                                            </div>
                                        </Card>
                                    )}

                                    {/* 3. Question Analysis */}
                                    <Card size="small" title={<Space><TranslationOutlined /> GIẢI THÍCH CHI TIẾT</Space>}>
                                        <Collapse ghost size="small" expandIconPosition="end">
                                            {aiInsights.questions?.map((q: any, i: number) => (
                                                <Collapse.Panel header={<b>Câu {q.questionNumber}</b>} key={i} style={{ background: '#fff', marginBottom: 8, borderRadius: 8, border: '1px solid #eee' }}>
                                                    <div style={{ fontSize: 13 }}>
                                                        <div style={{ color: '#555', fontStyle: 'italic', marginBottom: 8 }}>"{q.questionTranslation}"</div>
                                                        <div style={{ marginBottom: 4 }}><b>Phân tích:</b> {q.analysis}</div>
                                                        <div style={{ color: '#059669' }}><b>Bằng chứng:</b> {q.evidence}</div>
                                                    </div>
                                                </Collapse.Panel>
                                            ))}
                                        </Collapse>
                                    </Card>
                                </Space>
                            )}
                        </div>
                    </Col>
                </Row>
            </Form>
        </Modal>
    );
}
