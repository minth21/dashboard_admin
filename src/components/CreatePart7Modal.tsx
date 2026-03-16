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
    const [aiInsights, setAiInsights] = useState<Record<number, any>>({});
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [aiProgress, setAiProgress] = useState(0);
    const [currentInsightIndex, setCurrentInsightIndex] = useState<number | null>(null);

    const [existingQuestionNumbers, setExistingQuestionNumbers] = useState<number[]>([]);
    const [duplicateWarning, setDuplicateWarning] = useState<string>('');

    // Sync AI Insights back to Form - Standardized for Antigravity contract
    useEffect(() => {
        const insights = aiInsights[currentInsightIndex || 0];
        if (insights && currentInsightIndex !== null) {
            const passages = form.getFieldValue('passages');
            if (passages && passages[currentInsightIndex]) {
                const updatedPassages = [...passages];
                const item = updatedPassages[currentInsightIndex];

                item.passageTranslationData = JSON.stringify({
                    passages: insights.passageTranslations || insights.passages || [],
                    vocabulary: insights.vocabulary || [],
                    questions: insights.questions || []
                });

                // 2. Sync Questions and Re-build Full Explanations
                if (insights.questions && Array.isArray(item.questions)) {
                    item.questions = item.questions.map((q: any) => {
                        const aiQ = insights.questions.find((aq: any) => Number(aq.questionNumber) === Number(q.questionNumber));
                        if (aiQ) {
                            let metadataHeader = '';
                            const isFirst = q.questionNumber === item.questions[0].questionNumber;

                            if (isFirst) {
                                // Add Passages Translations
                                const pts = insights.passageTranslations || insights.passages || [];
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
                                if (insights.vocabulary && insights.vocabulary.length > 0) {
                                    metadataHeader += `📚 TỪ VỰNG QUAN TRỌNG:\n${insights.vocabulary.map((v: any) => `${v.word}: ${v.meaning}`).join('\n')}\n\n`;
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
                setPassageFileLists({
                    0: pUrls.map((url: string, i: number) => ({
                        uid: `-p-${i}`, name: `Passage ${i + 1}`, status: 'done', url, thumbUrl: url, response: { url }
                    }))
                });

                // Restore scan links if any
                const sUrls = firstQ.questionScanUrl ? firstQ.questionScanUrl.split(',').filter(Boolean) : [];
                setQuestionFileLists({
                    0: sUrls.map((url: string, i: number) => ({
                        uid: `-s-${i}`, name: `Scan ${i + 1}`, status: 'done', url, thumbUrl: url, response: { url }
                    }))
                });

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
                            setAiInsights({ 0: { passageTranslations: pts, vocabulary: voc, questions: qs } });
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
                setAiInsights({});
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
        setAiProgress(30);
        setCurrentInsightIndex(index);

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
                setAiInsights(prev => ({ ...prev, [index]: aiData }));
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
                form.setFieldValue('passages', updated);
                setAiInsights(prev => ({ ...prev, [index]: aiData }));
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
                            // Existing question
                            await api.patch(`/questions/${q.id}`, {
                                ...q,
                                passage: passageHtml,
                                passageTranslationData: payload.passageTranslationData
                            });
                        } else {
                            // New question scanned during Edit mode
                            await api.post(`/parts/${partId}/questions`, {
                                ...q,
                                passage: passageHtml,
                                passageTranslationData: payload.passageTranslationData
                            });
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
            title={
                <Space style={{ marginBottom: 8 }}>
                    <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, #6253E1 0%, #4338CA 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: 22,
                        boxShadow: '0 4px 12px rgba(98, 83, 225, 0.25)'
                    }}>
                        <ExperimentOutlined />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 20, color: '#1E293B' }}>
                        {mode === 'edit' ? 'SỬA NỘI DUNG' : 'TẠO NỘI DUNG MỚI'}
                    </span>
                </Space>
            }
            open={open}
            onCancel={onCancel}
            width={1300}
            centered
            style={{ top: 20 }}
            maskClosable={false}
            footer={[
                <Button key="cancel" size="large" onClick={onCancel} style={{ borderRadius: 10, fontWeight: 600 }}>Hủy bỏ</Button>,
                <Button
                    key="submit"
                    size="large"
                    type="primary"
                    onClick={() => form.submit()}
                    loading={loading}
                    style={{
                        borderRadius: 10,
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #6253E1 0%, #4338CA 100%)',
                        border: 'none',
                        boxShadow: '0 4px 14px rgba(98, 83, 225, 0.35)',
                        padding: '0 32px'
                    }}
                >
                    {mode === 'edit' ? 'Cập nhật' : 'Lưu tất cả'}
                </Button>
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
                                                key={field.key}
                                                size="small"
                                                title={
                                                    <Space>
                                                        <div style={{
                                                            width: 32,
                                                            height: 32,
                                                            borderRadius: 8,
                                                            background: '#F5F3FF',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: '#6253E1',
                                                            fontWeight: 800
                                                        }}>
                                                            {index + 1}
                                                        </div>
                                                        <span style={{ color: '#1E3A8A', fontWeight: 700, fontSize: 16 }}>
                                                            Nhóm nội dung {index + 1}
                                                        </span>
                                                        {aiDoneIndexes.includes(index) && <CheckCircleOutlined style={{ color: '#10B981', fontSize: 18 }} />}
                                                    </Space>
                                                }
                                                extra={
                                                    <Space>
                                                        <Form.Item noStyle shouldUpdate={(p, c) => p.passages?.[index]?.passageType !== c.passages?.[index]?.passageType}>
                                                            {() => (
                                                                <Button
                                                                    size="middle"
                                                                    type="primary"
                                                                    icon={<RobotOutlined />}
                                                                    loading={isAiProcessing && currentInsightIndex === index}
                                                                    onClick={() => form.getFieldValue(['passages', index, 'passageType']) === 'image' ? handleMagicScan(index) : handleGenerateAI(index)}
                                                                    style={{
                                                                        background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                                                                        border: 'none',
                                                                        borderRadius: 10,
                                                                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
                                                                        fontWeight: 700,
                                                                        padding: '0 16px'
                                                                    }}
                                                                >
                                                                    {form.getFieldValue(['passages', index, 'passageType']) === 'image' ? 'Phân tích' : 'AI Gen Insight'}
                                                                </Button>
                                                            )}
                                                        </Form.Item>
                                                        <Button danger size="middle" type="text" icon={<DeleteOutlined />} onClick={() => remove(field.name)} style={{ background: '#FEF2F2', borderRadius: 8 }} />
                                                    </Space>
                                                }
                                                style={{ marginBottom: 24, border: 'none', borderRadius: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
                                            >
                                                <Row gutter={12}>
                                                    <Col span={6}><Form.Item label="Từ câu" name={[field.name, 'startQuestion']} rules={[{ required: true }]}><InputNumber placeholder="147" style={{ width: '100%' }} onChange={(v) => checkDuplicateRange(Number(v), form.getFieldValue(['passages', index, 'endQuestion']))} /></Form.Item></Col>
                                                    <Col span={6}><Form.Item label="Đến câu" name={[field.name, 'endQuestion']} rules={[{ required: true }]}><InputNumber placeholder="150" style={{ width: '100%' }} onChange={(v) => checkDuplicateRange(form.getFieldValue(['passages', index, 'startQuestion']), Number(v))} /></Form.Item></Col>
                                                    <Col span={12}><Form.Item label="Tiêu đề" name={[field.name, 'passageTitle']}><Input placeholder="Questions 147-150 refer to..." /></Form.Item></Col>
                                                </Row>

                                                {duplicateWarning && <Alert message={duplicateWarning} type="warning" showIcon style={{ marginBottom: 10 }} />}

                                                <Form.Item name={[field.name, 'passageType']} initialValue="text" style={{ marginBottom: 12 }}>
                                                    <Radio.Group buttonStyle="solid" size="small" >
                                                        <Radio.Button value="text" style={{ fontWeight: 'bold' }}>Văn bản</Radio.Button>
                                                        <Radio.Button value="image" style={{ fontWeight: 'bold' }}>Hình ảnh</Radio.Button>
                                                    </Radio.Group>
                                                </Form.Item>

                                                <Form.Item noStyle shouldUpdate>
                                                    {() => {
                                                        const type = form.getFieldValue(['passages', index, 'passageType']);
                                                        return (
                                                            <>
                                                                {(type === 'image' || type === 'both') && (
                                                                    <Row gutter={12} style={{ marginBottom: 16 }}>
                                                                        <Col span={12}>
                                                                            <Form.Item label={<span style={{ fontWeight: 600 }}>1. Ảnh đoạn văn</span>}>
                                                                                <Dragger
                                                                                    fileList={passageFileLists[index] || []}
                                                                                    multiple
                                                                                    listType="picture"
                                                                                    action={`${api.defaults.baseURL}/upload/image`}
                                                                                    headers={{ Authorization: `Bearer ${localStorage.getItem('admin_token')}` }}
                                                                                    name="image"
                                                                                    onChange={({ fileList }) => setPassageFileLists(prev => ({ ...prev, [index]: fileList }))}
                                                                                    style={{ background: '#F8FAFC', borderColor: '#BFDBFE', borderRadius: 12 }}
                                                                                >
                                                                                    <p className="ant-upload-drag-icon"><CameraOutlined style={{ color: '#6366F1' }} /></p>
                                                                                    <p className="ant-upload-text" style={{ fontSize: 13 }}>Thả ảnh đoạn văn</p>
                                                                                </Dragger>
                                                                            </Form.Item>
                                                                        </Col>
                                                                        <Col span={12}>
                                                                            <Form.Item label={<span style={{ fontWeight: 600 }}>2. Ảnh câu hỏi</span>}>
                                                                                <Dragger
                                                                                    fileList={questionFileLists[index] || []}
                                                                                    multiple
                                                                                    listType="picture"
                                                                                    action={`${api.defaults.baseURL}/upload/image`}
                                                                                    headers={{ Authorization: `Bearer ${localStorage.getItem('admin_token')}` }}
                                                                                    name="image"
                                                                                    onChange={({ fileList }) => setQuestionFileLists(prev => ({ ...prev, [index]: fileList }))}
                                                                                    style={{ background: '#F8FAFC', borderColor: '#BFDBFE', borderRadius: 12 }}
                                                                                >
                                                                                    <p className="ant-upload-drag-icon"><CameraOutlined style={{ color: '#6366F1' }} /></p>
                                                                                    <p className="ant-upload-text" style={{ fontSize: 13 }}>Thả ảnh câu hỏi</p>
                                                                                </Dragger>
                                                                            </Form.Item>
                                                                        </Col>
                                                                    </Row>
                                                                )}
                                                                {(type === 'text' || type === 'both') && (
                                                                    <Form.Item name={[field.name, 'passage']}>
                                                                        <ReactQuill theme="snow" modules={QUILL_MODULES} formats={QUILL_FORMATS} style={{ height: 180, marginBottom: 45 }} />
                                                                    </Form.Item>
                                                                )}

                                                                {/* FIX LỖI MẤT DỮ LIỆU SONG NGỮ Ở ĐÂY: Thêm thẻ hidden để Ant Design bắt data */}
                                                                <Form.Item name={[field.name, 'passageTranslationData']} hidden>
                                                                    <Input />
                                                                </Form.Item>
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
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                                                        {qFields.map((qf, qi) => (
                                                                            <Card key={qf.key} size="small" bodyStyle={{ padding: '16px 12px' }} style={{ width: '100%', borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                                                                <div style={{ marginBottom: 12 }}>
                                                                                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                                                                        <span style={{
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            justifyContent: 'center',
                                                                                            minWidth: 42,
                                                                                            height: 28,
                                                                                            background: '#1E293B',
                                                                                            color: '#fff',
                                                                                            borderRadius: '6px',
                                                                                            fontWeight: 700,
                                                                                            fontSize: 13,
                                                                                            marginTop: 2,
                                                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                                                                            letterSpacing: '0.5px'
                                                                                        }}>#{start + qi}</span>
                                                                                        <Form.Item name={[qf.name, 'id']} hidden><Input /></Form.Item>
                                                                                        <Form.Item name={[qf.name, 'questionNumber']} hidden><Input /></Form.Item>
                                                                                        <Form.Item name={[qf.name, 'questionText']} style={{ flex: 1, margin: 0 }} rules={[{ required: true }]}>
                                                                                            <Input.TextArea autoSize={{ minRows: 1, maxRows: 3 }} placeholder="Nhập nội dung câu hỏi..." style={{ borderRadius: 8, fontWeight: 500 }} />
                                                                                        </Form.Item>
                                                                                        <Form.Item name={[qf.name, 'correctAnswer']} style={{ margin: 0, width: 80 }}>
                                                                                            <Select
                                                                                                placeholder="Đáp án"
                                                                                                options={[{ value: 'A' }, { value: 'B' }, { value: 'C' }, { value: 'D' }]}
                                                                                                style={{ borderRadius: 8 }}
                                                                                            />
                                                                                        </Form.Item>
                                                                                    </div>
                                                                                </div>
                                                                                <Row gutter={[12, 12]}>
                                                                                    <Col span={12}>
                                                                                        <Form.Item name={[qf.name, 'optionA']} label="A" style={{ margin: 0 }}>
                                                                                            <Input placeholder="Lựa chọn A" style={{ borderRadius: 8 }} />
                                                                                        </Form.Item>
                                                                                    </Col>
                                                                                    <Col span={12}>
                                                                                        <Form.Item name={[qf.name, 'optionB']} label="B" style={{ margin: 0 }}>
                                                                                            <Input placeholder="Lựa chọn B" style={{ borderRadius: 8 }} />
                                                                                        </Form.Item>
                                                                                    </Col>
                                                                                    <Col span={12}>
                                                                                        <Form.Item name={[qf.name, 'optionC']} label="C" style={{ margin: 0 }}>
                                                                                            <Input placeholder="Lựa chọn C" style={{ borderRadius: 8 }} />
                                                                                        </Form.Item>
                                                                                    </Col>
                                                                                    <Col span={12}>
                                                                                        <Form.Item name={[qf.name, 'optionD']} label="D" style={{ margin: 0 }}>
                                                                                            <Input placeholder="Lựa chọn D" style={{ borderRadius: 8 }} />
                                                                                        </Form.Item>
                                                                                    </Col>
                                                                                </Row>
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
                                        {mode === 'add' && (
                                            <Button
                                                type="dashed"
                                                block
                                                icon={<PlusOutlined />}
                                                onClick={() => add()}
                                                style={{
                                                    height: 52,
                                                    borderRadius: 16,
                                                    borderColor: '#6366F1',
                                                    color: '#4338CA',
                                                    fontWeight: 700,
                                                    background: '#F5F3FF',
                                                    fontSize: 15,
                                                    borderStyle: 'dashed',
                                                    borderWidth: 2
                                                }}
                                            >
                                                Thêm nhóm nội dung mới
                                            </Button>
                                        )}
                                    </>
                                )}
                            </Form.List>
                        </div>
                    </Col>

                    {/* RIGHT: AI COMPANION */}
                    <Col span={10}>
                        <div style={{
                            padding: '32px 24px',
                            backgroundColor: '#FFFFFF',
                            borderRadius: '24px',
                            height: '75vh',
                            overflowY: 'auto',
                            border: '1px solid #F1F5F9',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
                        }}>
                            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                                <div style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: 18,
                                    background: 'linear-gradient(135deg, #6253E1 0%, #4338CA 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontSize: 32,
                                    margin: '0 auto 16px',
                                    boxShadow: '0 8px 16px rgba(98, 83, 225, 0.2)'
                                }}>
                                    <RobotOutlined />
                                </div>
                                <h3 style={{ margin: '0 0 6px', color: '#1E3A8A', fontWeight: 800, fontSize: 20 }}>AI Companion INSIGHTS</h3>
                                <div style={{
                                    display: 'inline-block',
                                    padding: '4px 12px',
                                    background: '#F5F3FF',
                                    borderRadius: '12px',
                                    fontSize: 12,
                                    color: '#6253E1',
                                    fontWeight: 700
                                }}>
                                    POWERED BY GEMINI PRO
                                </div>
                                <Progress
                                    percent={aiProgress}
                                    size="small"
                                    strokeColor="linear-gradient(135deg, #6253E1 0%, #4338CA 100%)"
                                    style={{ display: isAiProcessing ? 'block' : 'none', marginTop: 16 }}
                                />
                            </div>

                            {Object.keys(aiInsights).length === 0 ? (
                                <Empty description="Chứa có dữ liệu phân tích AI" style={{ marginTop: 50 }} />
                            ) : (
                                <Space direction="vertical" style={{ width: '100%' }} size="large">
                                    {form.getFieldValue('passages')?.map((_pass: any, pIdx: number) => {
                                        const insights = aiInsights[pIdx];
                                        if (!insights) return null;

                                        return (
                                            <div key={pIdx} style={{
                                                border: '2px solid #F1F5F9',
                                                borderRadius: '24px',
                                                padding: '24px 16px',
                                                background: '#FAF9FF',
                                                marginBottom: 24
                                            }}>
                                                <div style={{
                                                    textAlign: 'center',
                                                    marginBottom: 20,
                                                    color: '#4338CA',
                                                    fontWeight: 800,
                                                    fontSize: 14,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 8,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px'
                                                }}>
                                                    <div style={{ width: 12, height: 2, background: '#6253E1', borderRadius: 1 }} />
                                                    Kết quả Nhóm nội dung {pIdx + 1}
                                                    <div style={{ width: 12, height: 2, background: '#6253E1', borderRadius: 1 }} />
                                                </div>

                                                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                                    {/* 1. Multi-Passage Translation */}
                                                    <div style={{ background: '#FFFFFF', padding: 20, borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                                                        <div style={{ marginBottom: 16, color: '#1E40AF', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <GlobalOutlined style={{ color: '#6253E1' }} /> DỊCH SONG NGỮ
                                                        </div>
                                                        {(insights.passageTranslations || insights.passages || []).map((pt: any, ptIdx: number) => (
                                                            <div key={ptIdx} style={{ marginBottom: 20, paddingBottom: 16, borderBottom: ptIdx < (insights.passageTranslations?.length || 0) - 1 ? '1px solid #F1F5F9' : 'none' }}>
                                                                <div style={{ fontWeight: 800, color: '#4338CA', marginBottom: 12, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    <div style={{ width: 4, height: 16, background: '#6253E1', borderRadius: 2 }} />
                                                                    {pt.label || `Đoạn ${ptIdx + 1}`}
                                                                </div>
                                                                {(pt.items || pt.sentences || []).map((s: any, sidx: number) => (
                                                                    <div key={sidx} style={{ marginBottom: 12, padding: '8px 12px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #F1F5F9' }}>
                                                                        <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>{s.en}</div>
                                                                        <div style={{ fontSize: 13, color: '#6253E1', marginTop: 4, fontWeight: 600 }}>{s.vi}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* 2. Vocabulary Chips */}
                                                    {insights.vocabulary?.length > 0 && (
                                                        <div style={{ background: '#FFFFFF', padding: 20, borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                                                            <div style={{ marginBottom: 16, color: '#059669', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <BookOutlined style={{ color: '#10B981' }} /> TỪ VỰNG QUAN TRỌNG
                                                            </div>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                                {insights.vocabulary.map((v: any, i: number) => (
                                                                    <Tag key={i} style={{ padding: '6px 12px', borderRadius: 8, background: '#ECFDF5', color: '#065F46', border: '1px solid #D1FAE5', fontWeight: 600, margin: 0 }}>
                                                                        <b style={{ color: '#059669' }}>{v.word}</b>: {v.meaning}
                                                                    </Tag>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 3. Question Analysis */}
                                                    <div style={{ background: '#FFFFFF', padding: 20, borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                                                        <div style={{ marginBottom: 16, color: '#1E3A8A', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <TranslationOutlined style={{ color: '#4338CA' }} /> GIẢI THÍCH CHI TIẾT
                                                        </div>
                                                        <Collapse ghost size="small" expandIconPosition="end" style={{ background: 'transparent' }}>
                                                            {insights.questions?.map((q: any, i: number) => (
                                                                <Collapse.Panel header={<div style={{ fontWeight: 700, color: '#1E40AF' }}>Câu {q.questionNumber}</div>} key={i} style={{ background: '#F8FAFC', marginBottom: 12, borderRadius: 12, border: '1px solid #F1F5F9', overflow: 'hidden' }}>
                                                                    <div style={{ fontSize: 13, color: '#475569' }}>
                                                                        <div style={{ color: '#64748B', fontStyle: 'italic', marginBottom: 12, padding: '8px 12px', background: '#FFFFFF', borderRadius: 8 }}>"{q.questionTranslation}"</div>
                                                                        <div style={{ marginBottom: 10 }}>
                                                                            <b style={{ color: '#1E293B' }}>💎 PHÂN TÍCH:</b>
                                                                            <p style={{ marginTop: 4, lineHeight: 1.6 }}>{q.analysis}</p>
                                                                        </div>
                                                                        <div style={{ color: '#059669', background: '#ECFDF5', padding: '10px 14px', borderRadius: 8, border: '1px solid #D1FAE5' }}>
                                                                            <b style={{ color: '#047857' }}>🔍 BẰNG CHỨNG:</b>
                                                                            <p style={{ marginTop: 4, marginBottom: 0 }}>{q.evidence}</p>
                                                                        </div>
                                                                    </div>
                                                                </Collapse.Panel>
                                                            ))}
                                                        </Collapse>
                                                    </div>
                                                </Space>
                                            </div>
                                        )
                                    })}
                                </Space>
                            )}
                        </div>
                    </Col>
                </Row>
            </Form>
        </Modal>
    );
}