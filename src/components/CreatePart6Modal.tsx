import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message, Card, Upload, Collapse, Alert, Button, Row, Col, Space, Radio, InputNumber, Empty, Progress, Tag } from 'antd';
import { DeleteOutlined, PlusOutlined, RobotOutlined, ExperimentOutlined, CameraOutlined, TranslationOutlined, BookOutlined, CheckCircleOutlined } from '@ant-design/icons';
import ReactQuill from 'react-quill-new';
import 'quill/dist/quill.snow.css';
import api from '../services/api';
import { QUILL_MODULES, QUILL_FORMATS, buildImagePassageHtml } from '../utils/editorUtils';
const { TextArea } = Input;
const { Dragger } = Upload;

interface CreatePart6ModalProps {
    open: boolean;
    onCancel: () => void;
    onSuccess: () => void;
    partId: string | null;
    mode?: 'add' | 'edit';
    initialData?: any;
}

export default function CreatePart6Modal({ open, onCancel, onSuccess, partId, mode = 'add', initialData }: CreatePart6ModalProps) {
    const [form] = Form.useForm();
    const watchPassages = Form.useWatch('passages', form);
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

    // --- Biến CSS Modern Shadow đồng bộ với ExamBank ---
    const modernShadow = '0 10px 30px -5px rgba(37, 99, 235, 0.08), 0 4px 10px -6px rgba(37, 99, 235, 0.04)';

    // Sync AI Insights back to Form
    useEffect(() => {
        if (aiInsights && currentInsightIndex !== null) {
            const passages = form.getFieldValue('passages');
            if (passages && passages[currentInsightIndex]) {
                const updatedPassages = [...passages];
                const item = updatedPassages[currentInsightIndex];

                item.passageTranslationData = JSON.stringify({
                    passages: aiInsights.passageTranslations || [],
                    vocabulary: aiInsights.vocabulary || [],
                    questions: aiInsights.questions || []
                });

                if (aiInsights.questions && Array.isArray(item.questions)) {
                    item.questions = item.questions.map((q: any) => {
                        const aiQ = aiInsights.questions.find((aq: any) => aq.questionNumber === q.questionNumber);
                        if (aiQ) {
                            let metadataHeader = '';
                            const isFirst = q.questionNumber === item.questions[0].questionNumber;

                            if (isFirst) {
                                if (aiInsights.passageTranslations && aiInsights.passageTranslations.length > 0) {
                                    metadataHeader += `📄 Dịch đoạn văn:\n`;
                                    aiInsights.passageTranslations.forEach((pt: any) => {
                                        if (pt.label) metadataHeader += `[${pt.label}]\n`;
                                        (pt.items || pt.sentences || []).forEach((s: any) => {
                                            if (s.en && s.vi) metadataHeader += `${s.en}\n(${s.vi})\n`;
                                        });
                                        metadataHeader += '\n';
                                    });
                                } else if (aiInsights.passageTranslation) {
                                    metadataHeader += `📄 Dịch đoạn văn:\n${aiInsights.passageTranslation}\n\n`;
                                }

                                if (aiInsights.vocabulary && aiInsights.vocabulary.length > 0) {
                                    metadataHeader += `📚 Từ vựng quan trọng:\n${aiInsights.vocabulary.map((v: any) => `${v.word}: ${v.meaning}`).join('\n')}\n\n`;
                                }
                            }

                            const formatOpt = (label: string) =>
                                `${label}. ${aiQ.optionTranslations?.[label] || ''}${label === q.correctAnswer ? '  ✅' : ''}`;

                            const fullExplanation =
                                metadataHeader +
                                `📋 Dịch đáp án:\n${formatOpt('A')}\n${formatOpt('B')}\n${formatOpt('C')}\n${formatOpt('D')}\n\n` +
                                `✏️ Phân tích:\n${aiQ.analysis || ''}\n\n🔍 Bằng chứng:\n${aiQ.evidence || ''}`;

                            return { ...q, explanation: fullExplanation };
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

                const pUrls = firstQ.passageImageUrl ? firstQ.passageImageUrl.split(',').filter(Boolean) : [];
                setPassageFileLists({
                    0: pUrls.map((url: string, i: number) => ({
                        uid: `-p-${i}`,
                        name: `Passage ${i + 1}`,
                        status: 'done',
                        url,
                        thumbUrl: url,
                        response: { url }
                    }))
                });

                const sUrls = firstQ.questionScanUrl ? firstQ.questionScanUrl.split(',').filter(Boolean) : [];
                setQuestionFileLists({
                    0: sUrls.map((url: string, i: number) => ({
                        uid: `-s-${i}`,
                        name: `Scan ${i + 1}`,
                        status: 'done',
                        url,
                        thumbUrl: url,
                        response: { url }
                    }))
                });

                if (firstQ.passageTranslationData && firstQ.passageTranslationData !== 'null') {
                    try {
                        const raw = JSON.parse(firstQ.passageTranslationData);
                        let passageTranslations: any[] = [];
                        let vocabulary: { word: string; meaning: string }[] = [];
                        let insightQuestions: any[] = [];

                        if (Array.isArray(raw)) {
                            passageTranslations = raw.map((p: any) => ({ ...p, items: p.items || p.sentences || [] }));
                            const vocabMap = new Map<string, string>();
                            passageTranslations.forEach((p: any) => {
                                (p.items || []).forEach((s: any) => {
                                    (s.vocab || []).forEach((v: any) => {
                                        if (v.text && v.meaning) vocabMap.set(v.text, v.meaning);
                                    });
                                });
                            });
                            vocabulary = Array.from(vocabMap.entries()).map(([text, meaning]) => ({ word: text, meaning }));
                        } else if (raw && typeof raw === 'object') {
                            passageTranslations = (raw.passages || raw.passageTranslations || []).map((p: any) => ({
                                ...p, items: p.items || p.sentences || []
                            }));
                            vocabulary = raw.vocabulary || [];
                            insightQuestions = raw.questions || [];
                        }

                        if (passageTranslations.length > 0 || vocabulary.length > 0 || insightQuestions.length > 0) {
                            setAiInsights({ passageTranslations, vocabulary, questions: insightQuestions });
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
        } catch { /* silent */ }
    };

    const checkDuplicateRange = (start: number, end: number) => {
        if (!start || !end) { setDuplicateWarning(''); return; }
        if (start < 131 || end > 146) {
            setDuplicateWarning('Cảnh báo: Part 6 phải nằm trong khoảng câu 131 - 146.');
            return;
        }
        if (start > end) {
            setDuplicateWarning('Lỗi: Câu bắt đầu không thể lớn hơn câu kết thúc.');
            return;
        }
        const requested = Array.from({ length: end - start + 1 }, (_, i) => start + i);
        const duplicates = requested.filter(n => existingQuestionNumbers.includes(n));
        if (duplicates.length > 0) {
            let next = 131;
            for (let i = 131; i <= 146; i++) {
                if (!existingQuestionNumbers.includes(i)) { next = i; break; }
            }
            setDuplicateWarning(`Câu ${duplicates.join(', ')} đã tồn tại! Gợi ý: Bắt đầu từ câu ${next}`);
        } else {
            setDuplicateWarning('');
        }
    };

    const handleGenerateAI = async (index: number) => {
        const passages = form.getFieldValue('passages') || [];
        const passageItem = passages[index];
        const questions = passageItem?.questions;

        if (!passageItem?.passage || !questions || questions.length === 0) {
            message.warning('Vui lòng nhập nội dung đoạn văn và câu hỏi!');
            return;
        }

        setIsAiProcessing(true);
        setAiProgress(30);
        setCurrentInsightIndex(index);
        setAiInsights(null);

        try {
            const fullPassage = passageItem.passageTitle
                ? `${passageItem.passageTitle}\n${passageItem.passage}`
                : passageItem.passage;
            const cleanPassage = fullPassage.replace(/<[^>]*>?/gm, ' ');

            const response = await api.post('/ai/generate-part6', {
                passage: cleanPassage,
                questions: questions.map((q: any) => ({
                    questionNumber: q.questionNumber,
                    optionA: q.optionA, optionB: q.optionB,
                    optionC: q.optionC, optionD: q.optionD,
                    correctAnswer: q.correctAnswer,
                }))
            }, { timeout: 120000 });

            if (response.data.success) {
                const aiData = response.data.data;
                const currentPassages = form.getFieldValue('passages');
                const updatedPassages = [...currentPassages];
                const updatedQuestions = [...updatedPassages[index].questions];

                aiData.questions.forEach((aiItem: any) => {
                    const qIndex = updatedQuestions.findIndex((q: any) => q.questionNumber == aiItem.questionNumber);
                    if (qIndex !== -1) {
                        updatedQuestions[qIndex] = { ...updatedQuestions[qIndex], explanation: '' };
                    }
                });

                updatedPassages[index] = {
                    ...updatedPassages[index],
                    questions: updatedQuestions,
                    passageTranslationData: aiData.passageTranslations ? JSON.stringify(aiData.passageTranslations) : undefined
                };
                form.setFieldValue('passages', updatedPassages);
                setAiDoneIndexes(prev => [...new Set([...prev, index])]);
                setAiInsights(aiData);
                setAiProgress(100);
                message.success(`Đã tạo Insights & Lời giải cho đoạn văn!`);
            }
        } catch (err: any) {
            console.error(`AI Error Passage ${index}:`, err);
            message.error(`Lỗi tạo AI: ${err.response?.data?.message || err.message}`);
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
            const existingUrls: string[] = [];
            const newFiles: File[] = [];

            allItems.forEach(item => {
                const originFile = item.originFileObj || item;
                if (originFile instanceof File) newFiles.push(originFile);
                else if (item.url || item.response?.url) existingUrls.push(item.url || item.response.url);
            });

            if (newFiles.length === 0 && existingUrls.length === 0) {
                message.warning('Vui lòng upload ít nhất một ảnh (đoạn văn hoặc câu hỏi)!');
                setIsAiProcessing(false);
                return;
            }

            newFiles.forEach(file => formData.append('images', file));
            if (existingUrls.length > 0) formData.append('imageUrls', JSON.stringify(Array.from(new Set(existingUrls))));

            const response = await api.post('/ai/magic-scan-part6', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                const aiData = response.data.data;
                setAiInsights(aiData);
                setAiProgress(100);

                const passages = form.getFieldValue('passages');
                const updatedPassages = [...passages];

                if (aiData.questions && aiData.questions.length > 0) {
                    let start = aiData.questions[0].questionNumber;
                    if (start < 131 || start > 146) {
                        const formStart = Number(updatedPassages[index]?.startQuestion);
                        start = (formStart >= 131 && formStart <= 146) ? formStart : 131;
                        aiData.questions.forEach((q: any, idx: number) => { q.questionNumber = start + idx; });
                    }

                    const currentQuestions = updatedPassages[index]?.questions || [];
                    const mergedQuestions = [...currentQuestions];

                    aiData.questions.forEach((aiQ: any) => {
                        const nlz = (s: string) => {
                            if (!s) return '';
                            let text = s.replace(/\\n/g, '\n').trim();
                            text = text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
                            return text;
                        };
                        const cleanOpt = (text: string) => nlz(text || '').replace(/^\s*[\(\[]?[A-D][\)\].:]?\s*/i, '').trim();
                        const updatedAiQ = {
                            ...aiQ,
                            optionA: cleanOpt(aiQ.optionA), optionB: cleanOpt(aiQ.optionB),
                            optionC: cleanOpt(aiQ.optionC), optionD: cleanOpt(aiQ.optionD),
                            explanation: ''
                        };

                        const existingIdx = mergedQuestions.findIndex(q => q.questionNumber === aiQ.questionNumber);
                        if (existingIdx !== -1) mergedQuestions[existingIdx] = { ...mergedQuestions[existingIdx], ...updatedAiQ };
                        else mergedQuestions.push(updatedAiQ);
                    });

                    mergedQuestions.sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));

                    let passageContent = aiData.passageHtml || updatedPassages[index]?.passage || '';
                    let passageType = updatedPassages[index]?.passageType || 'text';

                    if (passageFileLists[index]?.[0]?.response?.secure_url) {
                        passageContent = `<p><img src="${passageFileLists[index][0].response.secure_url}" /></p>`;
                        passageType = 'image';
                    } else if (aiData.croppedPassageUrls && Array.isArray(aiData.croppedPassageUrls) && aiData.croppedPassageUrls.length > 0) {
                        passageContent = aiData.croppedPassageUrls.map((url: string) => `<p><img src="${url}" /></p>`).join('');
                        passageType = 'image';
                    }

                    updatedPassages[index] = {
                        ...updatedPassages[index],
                        passage: passageContent,
                        passageTranslationData: aiData.passageTranslations ? JSON.stringify({
                            passages: aiData.passageTranslations || [],
                            vocabulary: aiData.vocabulary || [],
                            questions: aiData.questions || []
                        }) : undefined,
                        passageType: passageType,
                        startQuestion: mergedQuestions[0]?.questionNumber || start,
                        endQuestion: mergedQuestions[mergedQuestions.length - 1]?.questionNumber || (start + mergedQuestions.length - 1),
                        questions: mergedQuestions
                    };

                    setAiInsights(aiData);
                    setCurrentInsightIndex(index);
                }
                form.setFieldValue('passages', updatedPassages);
                message.success('Phân tích thành công!');
            }
        } catch (error: any) {
            message.error(error.response?.data?.message || error.message || 'Lỗi Phân tích');
        } finally {
            setIsAiProcessing(false);
            setAiProgress(0);
        }
    };

    const handleFinish = async (values: any) => {
        if (!partId) return;
        setLoading(true);
        try {
            let count = 0;
            for (let i = 0; i < values.passages.length; i++) {
                const item = values.passages[i];
                let passageHtml = '';
                if (item.passageTitle) passageHtml += `<p><b>${item.passageTitle}</b></p>`;

                if (item.passage && item.passage.includes('https://res.cloudinary.com')) {
                    passageHtml += item.passage;
                } else if (item.passageType === 'text') {
                    passageHtml += item.passage || '';
                } else if (item.passageType === 'image') {
                    const files = passageFileLists[i] || [];
                    passageHtml += await buildImagePassageHtml(files);
                } else {
                    const files = passageFileLists[i] || [];
                    if (files.length > 0) passageHtml += await buildImagePassageHtml(files);
                    passageHtml += item.passage || '';
                }

                const start = Number(item.startQuestion) || 131;
                const passageImgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/g;
                const passageImageUrls: string[] = [];
                let imgMatch;
                while ((imgMatch = passageImgRegex.exec(passageHtml)) !== null) {
                    passageImageUrls.push(imgMatch[1]);
                }
                const passageImageUrl = passageImageUrls.join(',');

                const qScanUrls = (questionFileLists[i] || [])
                    .map((f: any) => f.response?.url || f.response?.secure_url || f.url)
                    .filter(Boolean);
                const questionScanUrl = qScanUrls.join(',');

                const sanitizedQuestions = (item.questions || [])
                    .filter(Boolean)
                    .map((q: any, j: number) => ({
                        ...q,
                        questionNumber: start + j,
                        correctAnswer: q?.correctAnswer || 'A',
                        passageImageUrl: passageImageUrl || null,
                        questionScanUrl: questionScanUrl || null,
                    }));

                const payload = {
                    passage: passageHtml,
                    passageTranslationData: item.passageTranslationData,
                    questions: sanitizedQuestions
                };

                if (mode === 'edit') {
                    for (const q of sanitizedQuestions) {
                        if (q.id) {
                            await api.patch(`/questions/${q.id}`, {
                                ...q,
                                passage: passageHtml,
                                passageTranslationData: item.passageTranslationData,
                            });
                        }
                    }
                } else {
                    await api.post(`/parts/${partId}/questions/batch`, payload);
                }

                count++;
            }
            message.success(mode === 'edit' ? `Đã cập nhật thành công!` : `Đã lưu thành công ${count} đoạn văn!`);
            onSuccess();
            onCancel();
        } catch (e: any) {
            message.error('Lỗi khi lưu: ' + (e.response?.data?.message || e.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={
                <Space style={{ marginBottom: 8 }}>
                    <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: 22,
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
                    }}>
                        <ExperimentOutlined />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 20, color: '#1E293B' }}>
                        {mode === 'edit' ? 'SỬA ĐOẠN VĂN' : 'TẠO ĐOẠN VĂN MỚI'}
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
                        background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                        border: 'none',
                        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                        padding: '0 32px'
                    }}
                >
                    Cập nhật
                </Button>
            ]}
        >
            <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ passages: [{}] }} preserve={true} style={{ marginTop: 16 }}>
                <Row gutter={24}>
                    {/* LEFT COLUMN: Passage Forms */}
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
                                                            background: '#EFF6FF',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: '#2563EB',
                                                            fontWeight: 800
                                                        }}>
                                                            {index + 1}
                                                        </div>
                                                        <span style={{ color: '#1E3A8A', fontWeight: 700, fontSize: 16 }}>
                                                            Nội dung {index + 1}
                                                        </span>
                                                        {aiDoneIndexes.includes(index) && <CheckCircleOutlined style={{ color: '#10B981', fontSize: 18 }} />}
                                                    </Space>
                                                }
                                                extra={
                                                    <Space>
                                                        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.passages?.[index]?.passageType !== curr.passages?.[index]?.passageType}>
                                                            {() => {
                                                                const type = form.getFieldValue(['passages', index, 'passageType']);
                                                                return (
                                                                    <Button
                                                                        icon={<RobotOutlined />}
                                                                        size="middle"
                                                                        type="primary"
                                                                        loading={loading || (isAiProcessing && currentInsightIndex === index)}
                                                                        onClick={() => type === 'image' ? handleMagicScan(index) : handleGenerateAI(index)}
                                                                        style={{
                                                                            background: 'linear-gradient(135deg, #0EA5E9 0%, #2563EB 100%)',
                                                                            border: 'none',
                                                                            borderRadius: 10,
                                                                            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                                                                            fontWeight: 700,
                                                                            padding: '0 16px'
                                                                        }}
                                                                    >
                                                                        {type === 'image' ? 'Phân tích' : 'AI Gen Insight'}
                                                                    </Button>
                                                                );
                                                            }}
                                                        </Form.Item>
                                                        <Button danger type="text" icon={<DeleteOutlined />} size="small" onClick={() => remove(field.name)} style={{ background: '#FEE2E2', borderRadius: 8 }} />
                                                    </Space>
                                                }
                                                style={{ marginBottom: 24, border: '1px solid #E0F2FE', borderRadius: 16, boxShadow: modernShadow, background: '#FFFFFF' }}
                                                headStyle={{ borderBottom: '1px solid #E0F2FE', background: '#F8FAFC', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
                                            >
                                                <Row gutter={12} style={{ marginTop: 16 }}>
                                                    <Col span={6}>
                                                        <Form.Item label={<span style={{ fontWeight: 600 }}>Từ câu</span>} name={[field.name, 'startQuestion']} rules={[
                                                            { required: true, message: 'Nhập số câu' },
                                                            { type: 'number', min: 131, max: 146, message: 'Tối thiểu 131, tối đa 146' }
                                                        ]}>
                                                            <InputNumber style={{ width: '100%', borderRadius: 8 }} onChange={(value: number | null) => checkDuplicateRange(Number(value), form.getFieldValue(['passages', index, 'endQuestion']))} />
                                                        </Form.Item>
                                                    </Col>
                                                    <Col span={6}>
                                                        <Form.Item label={<span style={{ fontWeight: 600 }}>Đến câu</span>} name={[field.name, 'endQuestion']} rules={[
                                                            { required: true, message: 'Nhập số câu' },
                                                            { type: 'number', min: 131, max: 146, message: 'Tối thiểu 131, tối đa 146' }
                                                        ]}>
                                                            <InputNumber style={{ width: '100%', borderRadius: 8 }} onChange={(value: number | null) => checkDuplicateRange(form.getFieldValue(['passages', index, 'startQuestion']), Number(value))} />
                                                        </Form.Item>
                                                    </Col>
                                                    <Col span={12}>
                                                        <Form.Item label={<span style={{ fontWeight: 600 }}>Tiêu đề</span>} name={[field.name, 'passageTitle']}>
                                                            <Input placeholder="Questions 131-134 refer to..." style={{ borderRadius: 8 }} />
                                                        </Form.Item>
                                                    </Col>
                                                </Row>

                                                {duplicateWarning && <Alert message={duplicateWarning} type="warning" showIcon style={{ marginBottom: 12, borderRadius: 8 }} />}

                                                <Form.Item name={[field.name, 'passageType']} initialValue="text" style={{ marginBottom: 12 }}>
                                                    <Radio.Group buttonStyle="solid" size="small">
                                                        <Radio.Button value="text" style={{ borderRadius: '6px 0 0 6px', fontWeight: 'bold' }}><b>Văn bản</b></Radio.Button>
                                                        <Radio.Button value="image" style={{ borderRadius: '0 6px 6px 0', fontWeight: 'bold' }}><b>Hình ảnh</b></Radio.Button>
                                                    </Radio.Group>
                                                </Form.Item>

                                                {(() => {
                                                    const type = watchPassages?.[index]?.passageType || 'text';
                                                    return (
                                                        <>
                                                            {type === 'image' && (
                                                                <Row gutter={12}>
                                                                    <Col span={12}>
                                                                        <Form.Item label={<span style={{ fontWeight: 600 }}>1. Ảnh đoạn văn</span>}>
                                                                            <Dragger
                                                                                fileList={passageFileLists[index] || []}
                                                                                multiple
                                                                                listType="picture-card"
                                                                                action={`${api.defaults.baseURL}/upload/image`}
                                                                                headers={{ Authorization: `Bearer ${localStorage.getItem('admin_token')}` }}
                                                                                name="image"
                                                                                onChange={({ fileList }) => setPassageFileLists(prev => ({ ...prev, [index]: fileList }))}
                                                                                onRemove={(file) => {
                                                                                    const current = passageFileLists[index] || [];
                                                                                    setPassageFileLists(prev => ({ ...prev, [index]: current.filter(f => f.uid !== file.uid) }));
                                                                                }}
                                                                                style={{ background: '#F8FAFC', borderColor: '#BFDBFE', borderRadius: 12 }}
                                                                            >
                                                                                <p className="ant-upload-drag-icon"><CameraOutlined style={{ color: '#3B82F6' }} /></p>
                                                                                <p className="ant-upload-text" style={{ color: '#64748B' }}>Upload Image</p>
                                                                            </Dragger>
                                                                        </Form.Item>
                                                                    </Col>
                                                                    <Col span={12}>
                                                                        <Form.Item label={<span style={{ fontWeight: 600 }}>2. Ảnh câu hỏi</span>}>
                                                                            <Dragger
                                                                                fileList={questionFileLists[index] || []}
                                                                                multiple
                                                                                listType="picture-card"
                                                                                action={`${api.defaults.baseURL}/upload/image`}
                                                                                headers={{ Authorization: `Bearer ${localStorage.getItem('admin_token')}` }}
                                                                                name="image"
                                                                                onChange={({ fileList }) => setQuestionFileLists(prev => ({ ...prev, [index]: fileList }))}
                                                                                onRemove={(file) => {
                                                                                    const current = questionFileLists[index] || [];
                                                                                    setQuestionFileLists(prev => ({ ...prev, [index]: current.filter(f => f.uid !== file.uid) }));
                                                                                }}
                                                                                style={{ background: '#F8FAFC', borderColor: '#BFDBFE', borderRadius: 12 }}
                                                                            >
                                                                                <p className="ant-upload-drag-icon"><CameraOutlined style={{ color: '#3B82F6' }} /></p>
                                                                                <p className="ant-upload-text" style={{ color: '#64748B' }}>Upload Image</p>
                                                                            </Dragger>
                                                                        </Form.Item>
                                                                    </Col>
                                                                </Row>
                                                            )}
                                                            {type === 'text' && (
                                                                <Form.Item name={[field.name, 'passage']} label={<span style={{ fontWeight: 600 }}></span>} rules={[{ required: true }]}>
                                                                    <ReactQuill theme="snow" modules={QUILL_MODULES} formats={QUILL_FORMATS} style={{ height: 180, marginBottom: 45 }} placeholder="Dùng [131], [132]... để đánh dấu chỗ trống" />
                                                                </Form.Item>
                                                            )}
                                                            <Form.Item name={[field.name, 'passageTranslationData']} hidden>
                                                                <Input />
                                                            </Form.Item>
                                                        </>
                                                    );
                                                })()}

                                                <Form.Item noStyle shouldUpdate>
                                                    {() => {
                                                        const start = Number(form.getFieldValue(['passages', index, 'startQuestion']));
                                                        const end = Number(form.getFieldValue(['passages', index, 'endQuestion']));
                                                        if (!start || !end || start > end) return <Empty description="Nhập khoảng câu để hiện form đáp án" />;

                                                        const qCount = end - start + 1;
                                                        const currentQs = form.getFieldValue(['passages', index, 'questions']) || [];

                                                        const needsUpdate = currentQs.length !== qCount ||
                                                            (currentQs.length > 0 && currentQs[0].questionNumber !== start);

                                                        if (needsUpdate) {
                                                            const newQs = Array.from({ length: qCount }, (_, j) => {
                                                                const targetNum = start + j;
                                                                const existing = currentQs.find((q: any) => q.questionNumber === targetNum);
                                                                return {
                                                                    id: existing?.id, // Giữ ID cũ nếu có
                                                                    questionNumber: targetNum,
                                                                    questionText: existing?.questionText || '',
                                                                    optionA: existing?.optionA || '',
                                                                    optionB: existing?.optionB || '',
                                                                    optionC: existing?.optionC || '',
                                                                    optionD: existing?.optionD || '',
                                                                    correctAnswer: existing?.correctAnswer || 'A',
                                                                    explanation: existing?.explanation || ''
                                                                };
                                                            });
                                                            setTimeout(() => form.setFieldValue(['passages', index, 'questions'], newQs), 0);
                                                        }

                                                        return (
                                                            <Form.List name={[field.name, 'questions']}>
                                                                {(qFields) => (
                                                                    <Collapse size="small" ghost>
                                                                        {qFields.map((qf, qi) => (
                                                                            <Collapse.Panel 
                                                                                header={
                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                                        <span style={{
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            justifyContent: 'center',
                                                                                            minWidth: 42,
                                                                                            height: 24,
                                                                                            background: '#1E293B',
                                                                                            color: '#fff',
                                                                                            borderRadius: '4px',
                                                                                            fontWeight: 700,
                                                                                            fontSize: 12,
                                                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                                                        }}>#{start + qi}</span>
                                                                                        <b style={{ color: '#1E293B' }}>CÂU HỎI</b>
                                                                                    </div>
                                                                                } 
                                                                                key={qf.key} 
                                                                                style={{ background: '#F8FAFC', marginBottom: 8, borderRadius: 8, border: '1px solid #E2E8F0' }}
                                                                            >

                                                                                {/* BẢO LƯU FIX LỖI ID VÀ TEXT */}
                                                                                <Form.Item name={[qf.name, 'id']} hidden>
                                                                                    <Input />
                                                                                </Form.Item>
                                                                                <Form.Item name={[qf.name, 'questionText']} hidden>
                                                                                    <Input />
                                                                                </Form.Item>

                                                                                <Row gutter={8}>
                                                                                    {['A', 'B', 'C', 'D'].map(opt => (
                                                                                        <Col span={5} key={opt}>
                                                                                            <Form.Item name={[qf.name, `option${opt}`]} label={<span style={{ fontWeight: 600 }}>{opt}</span>} rules={[{ required: true }]}>
                                                                                                <Input style={{ borderRadius: 6 }} />
                                                                                            </Form.Item>
                                                                                        </Col>
                                                                                    ))}
                                                                                    <Col span={4}>
                                                                                        <Form.Item name={[qf.name, 'correctAnswer']} label={<span style={{ fontWeight: 600 }}>Đúng</span>}>
                                                                                            <Select options={[{ value: 'A' }, { value: 'B' }, { value: 'C' }, { value: 'D' }]} />
                                                                                        </Form.Item>
                                                                                    </Col>
                                                                                </Row>
                                                                                <Form.Item name={[qf.name, 'explanation']} hidden>
                                                                                    <Input />
                                                                                </Form.Item>
                                                                            </Collapse.Panel>
                                                                        ))}
                                                                    </Collapse>
                                                                )}
                                                            </Form.List>
                                                        );
                                                    }}
                                                </Form.Item>
                                            </Card >
                                        ))}
                                        <Button
                                            type="dashed"
                                            block
                                            icon={<PlusOutlined />}
                                            onClick={() => add()}
                                            style={{
                                                height: 52,
                                                marginBottom: 20,
                                                borderRadius: 16,
                                                borderColor: '#3B82F6',
                                                color: '#2563EB',
                                                fontWeight: 700,
                                                background: '#F0F9FF',
                                                fontSize: 15,
                                                borderStyle: 'dashed',
                                                borderWidth: 2
                                            }}
                                        >
                                            Thêm đoạn văn Part 6 mới
                                        </Button>
                                    </>
                                )}
                            </Form.List>
                        </div>
                    </Col>

                    {/* RIGHT COLUMN: AI INSIGHTS */}
                    <Col span={10}>
                        <div style={{
                            padding: '32px 24px',
                            backgroundColor: '#FFFFFF',
                            borderRadius: '24px',
                            height: '75vh',
                            overflowY: 'auto',
                            border: '1px solid #F1F5F9',
                            boxShadow: modernShadow
                        }}>
                            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                                <div style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: 18,
                                    background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontSize: 32,
                                    margin: '0 auto 16px',
                                    boxShadow: '0 8px 16px rgba(37, 99, 235, 0.2)'
                                }}>
                                    <RobotOutlined />
                                </div>
                                <h3 style={{ margin: '0 0 6px', color: '#1E3A8A', fontWeight: 800, fontSize: 20 }}>AI Companion INSIGHTS</h3>
                                <div style={{
                                    display: 'inline-block',
                                    padding: '4px 12px',
                                    background: '#EFF6FF',
                                    borderRadius: '12px',
                                    fontSize: 12,
                                    color: '#2563EB',
                                    fontWeight: 700
                                }}>
                                    POWERED BY GEMINI PRO
                                </div>
                            </div>

                            {aiInsights ? (
                                <Space direction="vertical" style={{ width: '100%' }} size="large">
                                    {/* Passage Translations (Bilingual) */}
                                    <div style={{ background: '#FFFFFF', padding: 24, borderRadius: 20, border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                                        <div style={{ marginBottom: 16, color: '#1E40AF', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <TranslationOutlined style={{ color: '#2563EB' }} /> Dịch đoạn văn song ngữ
                                        </div>
                                        {aiInsights?.passageTranslations?.map((passage: any, pIdx: number) => (
                                            <div key={pIdx} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #F1F5F9' }}>
                                                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                                    <Input
                                                        value={passage.label || `Passage ${pIdx + 1}`}
                                                        onChange={(e) => {
                                                            const newPts = [...(aiInsights?.passageTranslations || [])];
                                                            if (newPts[pIdx]) {
                                                                newPts[pIdx].label = e.target.value;
                                                                setAiInsights({ ...aiInsights, passageTranslations: newPts });
                                                            }
                                                        }}
                                                        placeholder="Tiêu đề đoạn (VD: Passage 1: Email)"
                                                        style={{ fontWeight: 700, color: '#1E3A8A', borderRadius: 8, background: '#F8FAFC' }}
                                                    />
                                                    <Button
                                                        danger
                                                        type="text"
                                                        size="middle"
                                                        icon={<DeleteOutlined />}
                                                        style={{ background: '#FEE2E2', borderRadius: 8 }}
                                                        onClick={() => {
                                                            const newPts = (aiInsights?.passageTranslations || []).filter((_: any, i: number) => i !== pIdx);
                                                            setAiInsights({ ...aiInsights, passageTranslations: newPts });
                                                        }}
                                                    />
                                                </div>
                                                {(passage.items || passage.sentences || []).map((item: any, idx: number) => (
                                                    <div key={idx} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px dashed #E2E8F0' }}>
                                                        <div style={{ display: 'flex', gap: 12 }}>
                                                            <div style={{ flex: 1 }}>
                                                                <TextArea
                                                                    rows={2}
                                                                    value={item.en}
                                                                    onChange={(e) => {
                                                                        const newPts = [...(aiInsights?.passageTranslations || [])];
                                                                        const target = newPts[pIdx];
                                                                        if (target) {
                                                                            const items = [...(target.items || [])];
                                                                            if (items[idx]) {
                                                                                items[idx] = { ...items[idx], en: e.target.value };
                                                                                target.items = items;
                                                                                setAiInsights({ ...aiInsights, passageTranslations: newPts });
                                                                            }
                                                                        }
                                                                    }}
                                                                    placeholder="Tiếng Anh..."
                                                                    style={{ marginBottom: 8, borderRadius: 8, borderColor: '#E2E8F0' }}
                                                                />
                                                                <TextArea
                                                                    rows={2}
                                                                    value={item.vi}
                                                                    onChange={(e) => {
                                                                        const newPts = [...(aiInsights?.passageTranslations || [])];
                                                                        const target = newPts[pIdx];
                                                                        if (target) {
                                                                            const items = [...(target.items || [])];
                                                                            if (items[idx]) {
                                                                                items[idx] = { ...items[idx], vi: e.target.value };
                                                                                target.items = items;
                                                                                setAiInsights({ ...aiInsights, passageTranslations: newPts });
                                                                            }
                                                                        }
                                                                    }}
                                                                    placeholder="Tiếng Việt..."
                                                                    style={{ marginBottom: 8, borderRadius: 8, borderColor: '#E2E8F0', background: '#F8FAFC' }}
                                                                />

                                                                {/* Vocab Tags for this sentence */}
                                                                <div style={{ background: '#F1F5F9', padding: 12, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                                                                    <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8, fontWeight: 600 }}>Từ vựng ngữ cảnh trong câu:</div>
                                                                    {(item.vocab || []).map((vItem: any, vIdx: number) => (
                                                                        <div key={vIdx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                                                            <Input size="small" placeholder="Từ vựng" value={vItem.text}
                                                                                style={{ borderRadius: 6 }}
                                                                                onChange={(e) => {
                                                                                    const newPts = [...(aiInsights?.passageTranslations || [])];
                                                                                    const target = newPts[pIdx];
                                                                                    if (target) {
                                                                                        const items = [...(target.items || [])];
                                                                                        if (items[idx]?.vocab?.[vIdx]) {
                                                                                            items[idx].vocab[vIdx].text = e.target.value;
                                                                                            target.items = items;
                                                                                            setAiInsights({ ...aiInsights, passageTranslations: newPts });
                                                                                        }
                                                                                    }
                                                                                }}
                                                                            />
                                                                            <Input size="small" placeholder="Nghĩa" value={vItem.meaning}
                                                                                style={{ borderRadius: 6 }}
                                                                                onChange={(e) => {
                                                                                    const newPts = [...(aiInsights?.passageTranslations || [])];
                                                                                    const target = newPts[pIdx];
                                                                                    if (target) {
                                                                                        const items = [...(target.items || [])];
                                                                                        if (items[idx]?.vocab?.[vIdx]) {
                                                                                            items[idx].vocab[vIdx].meaning = e.target.value;
                                                                                            target.items = items;
                                                                                            setAiInsights({ ...aiInsights, passageTranslations: newPts });
                                                                                        }
                                                                                    }
                                                                                }}
                                                                            />
                                                                            <Button size="small" type="text" danger icon={<DeleteOutlined />}
                                                                                onClick={() => {
                                                                                    const newPts = [...(aiInsights?.passageTranslations || [])];
                                                                                    const target = newPts[pIdx];
                                                                                    if (target) {
                                                                                        const items = [...(target.items || [])];
                                                                                        if (items[idx]?.vocab) {
                                                                                            items[idx].vocab = items[idx].vocab.filter((_: any, i: number) => i !== vIdx);
                                                                                            target.items = items;
                                                                                            setAiInsights({ ...aiInsights, passageTranslations: newPts });
                                                                                        }
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                    <Button size="small" type="dashed" block icon={<PlusOutlined />}
                                                                        style={{ borderRadius: 6, color: '#3B82F6', borderColor: '#BFDBFE', background: '#EFF6FF' }}
                                                                        onClick={() => {
                                                                            const newPts = [...(aiInsights?.passageTranslations || [])];
                                                                            const target = newPts[pIdx];
                                                                            if (target) {
                                                                                const items = [...(target.items || [])];
                                                                                if (items[idx]) {
                                                                                    if (!items[idx].vocab) items[idx].vocab = [];
                                                                                    items[idx].vocab.push({ text: '', meaning: '' });
                                                                                    target.items = items;
                                                                                    setAiInsights({ ...aiInsights, passageTranslations: newPts });
                                                                                }
                                                                            }
                                                                        }}
                                                                    >Thêm từ vựng</Button>
                                                                </div>
                                                            </div>
                                                            <Button
                                                                danger
                                                                type="text"
                                                                icon={<DeleteOutlined />}
                                                                style={{ background: '#FEE2E2', borderRadius: 8 }}
                                                                onClick={() => {
                                                                    const newPts = [...(aiInsights?.passageTranslations || [])];
                                                                    if (newPts[pIdx]) {
                                                                        const items = [...(newPts[pIdx].items || [])];
                                                                        newPts[pIdx].items = items.filter((_: any, i: number) => i !== idx);
                                                                        setAiInsights({ ...aiInsights, passageTranslations: newPts });
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                                <Button
                                                    type="dashed"
                                                    block
                                                    icon={<PlusOutlined />}
                                                    style={{ borderRadius: 8, color: '#3B82F6', borderColor: '#3B82F6' }}
                                                    onClick={() => {
                                                        const newPts = [...(aiInsights?.passageTranslations || [])];
                                                        if (newPts[pIdx]) {
                                                            const items = newPts[pIdx].items || newPts[pIdx].sentences || [];
                                                            newPts[pIdx].items = [...items, { en: '', vi: '' }];
                                                            setAiInsights({ ...aiInsights, passageTranslations: newPts });
                                                        }
                                                    }}
                                                >
                                                    Thêm câu
                                                </Button>
                                            </div>
                                        ))}
                                        <Button
                                            type="dashed"
                                            block
                                            style={{
                                                borderColor: '#D1D5DB',
                                                color: '#4B5563',
                                                borderRadius: 12,
                                                height: 44,
                                                fontWeight: 600,
                                                background: '#F9FAFB'
                                            }}
                                            icon={<PlusOutlined />}
                                            onClick={() => {
                                                const currentInsights = aiInsights || {};
                                                const newPts = [...(currentInsights.passageTranslations || []), { label: `Passage ${(currentInsights.passageTranslations?.length || 0) + 1}`, items: [{ en: '', vi: '', vocab: [] }] }];
                                                setAiInsights({ ...currentInsights, passageTranslations: newPts });
                                            }}
                                        >
                                            Chèn thêm khối văn bản mới
                                        </Button>
                                    </div>

                                    {/* Vocabulary */}
                                    <div style={{ background: '#FFFFFF', padding: 24, borderRadius: 20, border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                                        <div style={{ marginBottom: 12, color: '#059669', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <BookOutlined style={{ color: '#10B981' }} /> Từ vựng khóa (từ : nghĩa)
                                        </div>
                                        <TextArea
                                            rows={4}
                                            value={aiInsights.vocabulary?.map((v: any) => `${v.word}: ${v.meaning}`).join('\n')}
                                            onChange={(e) => {
                                                const lines = e.target.value.split('\n');
                                                const newVocab = lines.map(line => {
                                                    const [word, ...meaningParts] = line.split(':');
                                                    return { word: word?.trim(), meaning: meaningParts.join(':')?.trim() };
                                                }).filter(v => v.word && v.meaning);
                                                setAiInsights({ ...aiInsights, vocabulary: newVocab });
                                            }}
                                            placeholder="word: meaning..."
                                            style={{ fontSize: 14, borderRadius: 8, borderColor: '#E2E8F0', padding: 12 }}
                                        />
                                    </div>

                                    {/* Question Insights */}
                                    <div>
                                        <div style={{ marginBottom: 16, fontWeight: 800, fontSize: 15, color: '#1E3A8A' }}>
                                            <CheckCircleOutlined style={{ marginRight: 6, color: '#2563EB' }} /> Lời giải từng câu:
                                        </div>
                                        {aiInsights.questions?.map((q: any, i: number) => (
                                            <Card size="small" style={{ marginBottom: 16, borderRadius: 16, border: '1px solid #E0F2FE', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.05)' }} key={i}>
                                                <Tag color="blue" style={{ marginBottom: 12, padding: '4px 12px', borderRadius: 12, fontWeight: 700, fontSize: 13 }}>Câu {q.questionNumber}</Tag>

                                                <div style={{ fontSize: 14, marginBottom: 16 }}>
                                                    <b style={{ color: '#475569' }}>Dịch đáp án:</b>
                                                    <Row gutter={[12, 12]} style={{ marginTop: 8 }}>
                                                        {['A', 'B', 'C', 'D'].map(opt => (
                                                            <Col span={12} key={opt}>
                                                                <Input
                                                                    prefix={<span style={{ color: '#94A3B8', fontWeight: 600 }}>{opt}:</span>}
                                                                    value={q.optionTranslations?.[opt]}
                                                                    onChange={(e) => {
                                                                        const newQs = [...aiInsights.questions!];
                                                                        newQs[i].optionTranslations = {
                                                                            ...newQs[i].optionTranslations,
                                                                            [opt]: e.target.value
                                                                        };
                                                                        setAiInsights({ ...aiInsights, questions: newQs });
                                                                    }}
                                                                    placeholder={`Dịch ${opt}...`}
                                                                    style={{ borderRadius: 8, borderColor: '#E2E8F0' }}
                                                                />
                                                            </Col>
                                                        ))}
                                                    </Row>
                                                </div>
                                                <div style={{ fontSize: 14, marginBottom: 12 }}>
                                                    <b style={{ color: '#475569' }}>Dẫn chứng:</b>
                                                    <TextArea
                                                        rows={2}
                                                        value={q.evidence}
                                                        onChange={(e) => {
                                                            const newQs = [...aiInsights.questions!];
                                                            newQs[i].evidence = e.target.value;
                                                            setAiInsights({ ...aiInsights, questions: newQs });
                                                        }}
                                                        style={{ marginTop: 8, fontSize: 13, borderRadius: 8, borderColor: '#E2E8F0' }}
                                                    />
                                                </div>
                                                <div style={{ fontSize: 14 }}>
                                                    <b style={{ color: '#475569' }}>Phân tích:</b>
                                                    <TextArea
                                                        rows={3}
                                                        value={q.analysis}
                                                        onChange={(e) => {
                                                            const newQs = [...aiInsights.questions!];
                                                            newQs[i].analysis = e.target.value;
                                                            setAiInsights({ ...aiInsights, questions: newQs });
                                                        }}
                                                        style={{ marginTop: 8, fontSize: 13, borderRadius: 8, borderColor: '#E2E8F0' }}
                                                    />
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </Space>
                            ) : (
                                <Empty description="Nhấn 'Phân tích' để xem Insights" style={{ marginTop: 60, color: '#94A3B8' }} />
                            )}

                            {isAiProcessing && (
                                <div style={{ marginTop: 24, background: '#fff', padding: 20, borderRadius: 16, boxShadow: modernShadow }}>
                                    <Progress percent={aiProgress} status="active" strokeColor="linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)" />
                                    <p style={{ textAlign: 'center', fontSize: 14, marginTop: 12, fontWeight: 600, color: '#2563EB' }}>AI đang xử lý dữ liệu...</p>
                                </div>
                            )}
                        </div>
                    </Col>
                </Row>
            </Form >
        </Modal >
    );
}