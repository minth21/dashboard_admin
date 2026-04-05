import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message, Card, Upload, Button, Row, Col, Space, Radio, InputNumber, Empty, Progress, Image, Tag } from 'antd';
import { DeleteOutlined, PlusOutlined, RobotOutlined, ExperimentOutlined, CameraOutlined, TranslationOutlined, BookOutlined, CheckCircleOutlined } from '@ant-design/icons';
import ReactQuill from 'react-quill-new';
import 'quill/dist/quill.snow.css';
import api from '../services/api';

const { Dragger } = Upload;

interface CreatePart6ModalProps {
    open: boolean;
    onCancel: () => void;
    onSuccess: () => void;
    partId: string | null;
    mode?: 'add' | 'edit';
    initialData?: any;
    partName?: string;
    partNumber?: number;
}

export default function CreatePart6Modal({ open, onCancel, onSuccess, partId, mode = 'add', initialData, partName, partNumber }: CreatePart6ModalProps) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [aiDoneIndexes, setAiDoneIndexes] = useState<number[]>([]);
    const [passageFileLists, setPassageFileLists] = useState<Record<number, any[]>>({});
    const [questionFileLists, setQuestionFileLists] = useState<Record<number, any[]>>({});
    const [aiInsights, setAiInsights] = useState<Record<number, any>>({});
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [aiProgress, setAiProgress] = useState(0);
    const [currentInsightIndex, setCurrentInsightIndex] = useState<number | null>(null);
    const [newVocab, setNewVocab] = useState({ word: '', type: 'n', ipa: '', meaning: '' });

    const [existingQuestionNumbers, setExistingQuestionNumbers] = useState<number[]>([]);

    useEffect(() => {
        if (aiInsights && currentInsightIndex !== null && aiInsights[currentInsightIndex]) {
            const currentPassages = form.getFieldValue('passages');
            if (currentPassages && currentPassages[currentInsightIndex]) {
                const updatedPassages = [...currentPassages];
                const item = updatedPassages[currentInsightIndex];
                const activeInsights = aiInsights[currentInsightIndex];

                const flatTranslations = (activeInsights.passageTranslations || activeInsights.passageData || activeInsights.passages || []).map((p: any) => ({
                    type: 'passage',
                    label: p.label || 'Passage',
                    items: (p.items || p.sentences || p.translation || []).map((s: any) => ({
                        en: s.en || '',
                        vi: s.vi || '',
                        vocab: Array.isArray(s.vocab) ? s.vocab : []
                    }))
                }));

                item.passageTranslationData = JSON.stringify(flatTranslations);
                item.passageData = JSON.stringify(activeInsights.passageData || flatTranslations);

                if (activeInsights.questions && Array.isArray(item.questions)) {
                    item.questions = item.questions.map((q: any) => {
                        const aiQ = activeInsights.questions.find((aq: any) =>
                            Number(aq.questionNumber) === Number(q.questionNumber)
                        );
                        if (aiQ) {
                            return {
                                ...q,
                                questionTranslation: aiQ.questionTranslation || '',
                                optionTranslations: JSON.stringify(aiQ.optionTranslations || {}),
                                analysis: aiQ.analysis || '',
                                evidence: aiQ.evidence || '',
                                explanation: aiQ.explanation || '',
                                keyVocabulary: JSON.stringify(activeInsights.vocabulary || [])
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

                const pUrls = firstQ.passageImageUrl ? firstQ.passageImageUrl.split(',').filter(Boolean) : [];
                const sUrls = firstQ.questionScanUrl ? firstQ.questionScanUrl.split(',').filter(Boolean) : [];

                const isImagePassage = pUrls.length > 0 || (passage.passage || '').includes('<img');

                form.setFieldsValue({
                    passages: [{
                        passageTitle: (passage.passage?.match(/<p[^>]*>\s*<b>\s*(.*?)\s*<\/b>\s*<\/p>/)?.[1] || '').trim(),
                        passage: (passage.passage || '').replace(/<p[^>]*>\s*<b>\s*.*?\s*<\/b>\s*<\/p>/, '').trim(),
                        passageType: isImagePassage ? 'image' : 'text',
                        passageTranslationData: firstQ.passageTranslationData,
                        passageImageUrl: firstQ.passageImageUrl,
                        questionScanUrl: firstQ.questionScanUrl,
                        audioUrl: firstQ.audioUrl,
                        startQuestion: firstQ.questionNumber,
                        endQuestion: lastQ.questionNumber,
                        questions: questions.map((q: any) => ({
                            id: q.id,
                            questionNumber: q.questionNumber,
                            questionText: (q.questionText || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(),
                            optionA: (q.optionA || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(),
                            optionB: (q.optionB || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(),
                            optionC: (q.optionC || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(),
                            optionD: (q.optionD || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(),
                            optionTranslations: typeof q.optionTranslations === 'string' ? JSON.parse(q.optionTranslations) : (q.optionTranslations || {}),
                            questionTranslation: q.questionTranslation || '',
                            correctAnswer: q.correctAnswer,
                            explanation: q.explanation,
                            analysis: q.analysis || '',
                            evidence: q.evidence || '',
                            keyVocabulary: typeof q.keyVocabulary === 'string' ? JSON.parse(q.keyVocabulary) : (q.keyVocabulary || [])
                        }))
                    }]
                });

                setPassageFileLists({
                    0: pUrls.map((url: string, i: number) => ({
                        uid: `-p-${i}`, name: `Passage ${i + 1}`, status: 'done', url, thumbUrl: url, response: { data: { url } }
                    }))
                });

                setQuestionFileLists({
                    0: sUrls.map((url: string, i: number) => ({
                        uid: `-s-${i}`, name: `Scan ${i + 1}`, status: 'done', url, thumbUrl: url, response: { data: { url } }
                    }))
                });

                let pts: any[] = [];
                let voc: any[] = [];
                let qs: any[] = [];

                if (firstQ.passageTranslationData && firstQ.passageTranslationData !== 'null') {
                    try {
                        const raw = JSON.parse(firstQ.passageTranslationData);
                        if (Array.isArray(raw)) {
                            pts = raw;
                        } else {
                            pts = raw.passages || raw.passageTranslations || [];
                            voc = raw.vocabulary || [];
                            qs = raw.questions || [];
                        }
                    } catch (e) {
                        console.error('Failed to parse passage translation', e);
                    }
                }

                const insightQuestions = questions.map((q: any) => {
                    const existingQInsight = qs.find(iq => iq.questionNumber === q.questionNumber);

                    let parsedOptTrans = {};
                    try {
                        parsedOptTrans = typeof q.optionTranslations === 'string' ? JSON.parse(q.optionTranslations) : (q.optionTranslations || {});
                    } catch (e) { }

                    if (q.keyVocabulary && q.keyVocabulary !== 'null') {
                        try {
                            const qVocab = typeof q.keyVocabulary === 'string' ? JSON.parse(q.keyVocabulary) : q.keyVocabulary;
                            if (Array.isArray(qVocab)) voc = [...voc, ...qVocab];
                        } catch (e) { }
                    }

                    return {
                        questionNumber: q.questionNumber,
                        questionTranslation: q.questionTranslation || existingQInsight?.questionTranslation || '',
                        optionTranslations: parsedOptTrans,
                        analysis: q.analysis || existingQInsight?.analysis || '',
                        evidence: q.evidence || existingQInsight?.evidence || '',
                        explanation: q.explanation
                    };
                });

                const uniqueVocab = Array.from(new Map(voc.filter(v => v && (v.word || v.text)).map(item => [item.word || item.text, item])).values());

                setAiInsights({
                    0: {
                        passageTranslations: pts,
                        passageData: firstQ.passageData ? (typeof firstQ.passageData === 'string' ? JSON.parse(firstQ.passageData) : firstQ.passageData) : [],
                        vocabulary: uniqueVocab,
                        questions: insightQuestions
                    }
                });
                setAiDoneIndexes([0]);
                setCurrentInsightIndex(0);
            } else {
                form.resetFields();
                setAiDoneIndexes([]);
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
        } catch { /* silent */ }
    };

    const checkDuplicateRange = (start: number, end: number) => {
        if (!start || !end) return;
        const requested = Array.from({ length: end - start + 1 }, (_, i) => start + i);
        const duplicates = requested.filter((n: number) => existingQuestionNumbers.includes(n));
        if (duplicates.length > 0 && mode === 'add') {
            message.warning(`Câu hỏi số ${duplicates.join(', ')} đã tồn tại trong Part 6 của bài test này.`);
        }
    };

    const handleAddManualVocab = (index: number) => {
        if (!newVocab.word || !newVocab.meaning) {
            message.warning('Vui lòng nhập từ và nghĩa!');
            return;
        }
        setAiInsights(prev => {
            const current = prev[index] || { vocabulary: [] };
            const updatedVocab = [...(current.vocabulary || []), { ...newVocab }];
            return { ...prev, [index]: { ...current, vocabulary: updatedVocab } };
        });
        setNewVocab({ word: '', type: 'n', ipa: '', meaning: '' });
        message.success('Đã thêm từ vựng!');
    };

    const handleDeleteVocab = (index: number, vIndex: number) => {
        setAiInsights(prev => {
            const current = prev[index];
            if (!current) return prev;
            const updatedVocab = [...current.vocabulary];
            updatedVocab.splice(vIndex, 1);
            return { ...prev, [index]: { ...current, vocabulary: updatedVocab } };
        });
    };

    const handleAnalyzeAll = async () => {
        const passages = form.getFieldValue('passages') || [];
        if (passages.length === 0) return message.warning('Chưa có nhóm nội dung nào!');

        setIsAiProcessing(true);
        let successCount = 0;

        for (let i = 0; i < passages.length; i++) {
            setAiProgress(Math.floor((i / passages.length) * 100));
            setCurrentInsightIndex(i);

            const type = passages[i].passageType;
            try {
                if (type === 'image') {
                    await handleMagicScan(i, true);
                } else {
                    await handleGenerateAI(i, true);
                }
                successCount++;
            } catch (e) {
                console.error('Error in batch analysis for index', i, e);
            }
        }

        setIsAiProcessing(false);
        setAiProgress(100);

        if (successCount === passages.length) {
            message.success('Đã phân tích 100% tất cả các nhóm nội dung!');
        } else if (successCount > 0) {
            message.warning(`Đã phân tích được ${successCount}/${passages.length} nhóm. Vui lòng kiểm tra lại lỗi.`);
        }
    };

    const handleGenerateAI = async (index: number, isBatch = false) => {
        const passages = form.getFieldValue('passages') || [];
        const passageItem = passages[index];
        const questions = passageItem?.questions;

        if (!passageItem?.passage || !questions || questions.length === 0) {
            if (!isBatch) message.warning('Vui lòng nhập nội dung đoạn văn và câu hỏi!');
            return;
        }

        if (!isBatch) {
            setIsAiProcessing(true);
            setAiProgress(30);
            setCurrentInsightIndex(index);
        }

        try {
            const fullPassage = passageItem.passageTitle ? `${passageItem.passageTitle}\n${passageItem.passage}` : passageItem.passage;
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
                const item = updatedPassages[index];

                item.passageTranslationData = aiData.passageTranslations ? JSON.stringify(aiData.passageTranslations) : undefined;

                if (aiData.questions && Array.isArray(item.questions)) {
                    item.questions = item.questions.map((q: any) => {
                        const aiQ = aiData.questions.find((aq: any) => Number(aq.questionNumber) === Number(q.questionNumber));
                        if (aiQ) {
                            return {
                                ...q,
                                questionTranslation: aiQ.questionTranslation || '',
                                optionTranslations: JSON.stringify(aiQ.optionTranslations || {}),
                                analysis: aiQ.analysis || '',
                                evidence: aiQ.evidence || '',
                                explanation: aiQ.explanation || '',
                                keyVocabulary: JSON.stringify(aiData.vocabulary || [])
                            };
                        }
                        return q;
                    });
                }

                form.setFieldValue('passages', updatedPassages);
                setAiDoneIndexes(prev => [...new Set([...prev, index])]);
                setAiInsights(prev => ({ ...prev, [index]: aiData }));
                setAiProgress(100);
                message.success(`Đã tạo Insights & Lời giải cho đoạn văn!`);
            }
        } catch (err: any) {
            message.error(`Lỗi tạo AI: ${err.response?.data?.message || err.message}`);
        } finally {
            if (!isBatch) {
                setIsAiProcessing(false);
                setAiProgress(0);
            }
        }
    };

    const handleMagicScan = async (index: number, isBatch = false) => {
        if (!isBatch) {
            setIsAiProcessing(true);
            setAiProgress(30);
        }
        try {
            const formData = new FormData();
            const passageFiles = (passageFileLists[index] || []).map(f => f.originFileObj).filter(Boolean);
            const questionFiles = (questionFileLists[index] || []).map(f => f.originFileObj).filter(Boolean);

            const existingUrls = [
                ...(passageFileLists[index] || []).map(f => f.url || f.response?.data?.url || f.response?.url),
                ...(questionFileLists[index] || []).map(f => f.url || f.response?.data?.url || f.response?.url)
            ].filter(url => url && typeof url === 'string' && url.startsWith('http'));

            if (passageFiles.length === 0 && questionFiles.length === 0 && existingUrls.length === 0) {
                if (!isBatch) message.warning('Vui lòng upload ảnh hoặc dùng ảnh đã có để quét!');
                if (!isBatch) setIsAiProcessing(false);
                return;
            }

            passageFiles.forEach(file => formData.append('passageImages', file as any));
            questionFiles.forEach(file => formData.append('questionImages', file as any));

            if (existingUrls.length > 0) {
                formData.append('imageUrls', JSON.stringify(existingUrls));
            }

            const response = await api.post('/ai/magic-scan-part6', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 150000
            });

            if (response.data.success) {
                const aiData = response.data.data;
                const passages = form.getFieldValue('passages');
                const updatedPassages = [...passages];
                const userStartNum = updatedPassages[index].startQuestion;
                const currentQuestions = updatedPassages[index]?.questions || [];

                const formattedQuestions = aiData.questions.map((q: any, idx: number) => ({
                    ...q,
                    id: (mode === 'edit' && currentQuestions[idx]) ? currentQuestions[idx].id : undefined,
                    questionText: (q.questionText || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(),
                    optionA: (q.optionA || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(),
                    optionB: (q.optionB || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(),
                    optionC: (q.optionC || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(),
                    optionD: (q.optionD || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(),
                    questionNumber: userStartNum ? (userStartNum + idx) : q.questionNumber,
                    optionTranslations: typeof q.optionTranslations === 'object' ? JSON.stringify(q.optionTranslations) : q.optionTranslations,
                    keyVocabulary: JSON.stringify(aiData.vocabulary || [])
                }));

                updatedPassages[index] = {
                    ...updatedPassages[index],
                    // Clean passage HTML by removing <img> tags if they are redundant with passageImageUrl
                    passage: (aiData.passageHtml || updatedPassages[index].passage || '').replace(/<img[^>]*>/g, ''),
                    passageTranslationData: JSON.stringify(aiData.passageTranslations || []),
                    passageData: JSON.stringify(aiData.passageData || aiData.passageTranslations || []),
                    questions: formattedQuestions,
                    startQuestion: userStartNum || aiData.questions[0]?.questionNumber,
                    endQuestion: (userStartNum || aiData.questions[0]?.questionNumber) + formattedQuestions.length - 1
                };

                form.setFieldValue('passages', updatedPassages);
                setAiInsights(prev => ({ ...prev, [index]: aiData }));
                setAiDoneIndexes(prev => [...new Set([...prev, index])]);
                setCurrentInsightIndex(index);
                if (!isBatch) message.success('Phân tích thành công!');
            }
        } catch (error: any) {
            if (!isBatch) message.error(error.response?.data?.message || 'Lỗi Phân tích');
            else throw error;
        } finally {
            if (!isBatch) {
                setIsAiProcessing(false); setAiProgress(0);
            }
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

                const extractGroupUrl = (fileList: any[]) => (fileList || []).map(f => f.url || f.response?.url || f.response?.data?.url).filter(Boolean).join(',');
                const finalPassageImageUrl = extractGroupUrl(passageFileLists[i] || []) || (mode === 'edit' ? item.passageImageUrl : '');
                const finalQuestionScanUrl = extractGroupUrl(questionFileLists[i] || []) || (mode === 'edit' ? item.questionScanUrl : '');
                const finalAudioUrl = item.audioUrl || (mode === 'edit' ? item.audioUrl : '');

                if (item.passageType === 'text') {
                    passageHtml += item.passage || '';
                } else {
                    // For image type, ensure we don't have redundant img tags in the text field
                    passageHtml += (item.passage || '').replace(/<img[^>]*>/g, '');
                }

                const sanitizedQuestions = (item.questions || []).map((q: any) => ({
                    ...q,
                    passageImageUrl: finalPassageImageUrl || null,
                    questionScanUrl: finalQuestionScanUrl || null,
                    audioUrl: finalAudioUrl || null,
                    passage: passageHtml,
                    passageTranslationData: item.passageTranslationData,
                    passageData: item.passageData,
                    optionTranslations: typeof q.optionTranslations === 'object' ? JSON.stringify(q.optionTranslations) : q.optionTranslations,
                    keyVocabulary: typeof q.keyVocabulary === 'object' ? JSON.stringify(q.keyVocabulary) : q.keyVocabulary
                }));

                const payload = {
                    passage: passageHtml || null,
                    passageImageUrl: finalPassageImageUrl || (sanitizedQuestions[0]?.passageImageUrl) || null,
                    audioUrl: finalAudioUrl || null,
                    passageTranslationData: item.passageTranslationData,
                    passageData: item.passageData,
                    questions: sanitizedQuestions
                };

                if (mode === 'edit') {
                    for (const q of sanitizedQuestions) {
                        if (q.id) {
                            await api.patch(`/questions/${q.id}`, q);
                        } else {
                            await api.post(`/parts/${partId}/questions`, q);
                        }
                    }
                } else {
                    await api.post(`/parts/${partId}/questions/batch`, payload);
                }
            }
            message.success('Đã lưu thành công!');
            onSuccess(); onCancel();
        } catch (e: any) {
            message.error('Lỗi khi lưu: ' + (e.response?.data?.message || e.message));
        } finally { setLoading(false); }
    };

    return (
        <Modal
            title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', gap: '16px', padding: '10px 0' }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #6366F1 0%, #4338CA 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 24, boxShadow: '0 8px 16px rgba(99, 102, 241, 0.25)'
                    }}>
                        <ExperimentOutlined />
                    </div>
                    <span style={{ fontWeight: 850, fontSize: 22, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {partName || `PART ${partNumber}: READING - INCOMPLETE TEXTS`}
                    </span>
                </div>
            }
            open={open} onCancel={onCancel} width={1400} centered style={{ top: 20 }} maskClosable={false} bodyStyle={{ padding: '0 24px 24px' }}
            footer={[
                <Button key="cancel" size="large" onClick={onCancel} style={{ borderRadius: 10, fontWeight: 600 }}>Hủy</Button>,
                <Button key="submit" size="large" type="primary" onClick={() => form.submit()} loading={loading} style={{ borderRadius: 10, fontWeight: 700, background: 'linear-gradient(135deg, #6253E1 0%, #4338CA 100%)', border: 'none', boxShadow: '0 4px 14px rgba(98, 83, 225, 0.35)', padding: '0 32px' }}>
                    {mode === 'edit' ? 'Cập nhật' : 'Lưu tất cả'}
                </Button>
            ]}
        >
            <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ passages: [{}] }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: '12px 20px', background: '#F8FAFC', borderRadius: 16, border: '1px solid #E2E8F0' }}>
                    <Form.List name="passages">
                        {(fields) => fields.map((field, index) => (
                            <div key={field.key} onClick={() => { const element = document.getElementById(`passage-card-${index}`); element?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setCurrentInsightIndex(index); }}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: currentInsightIndex === index ? '#fff' : 'transparent', borderRadius: 12, cursor: 'pointer', boxShadow: currentInsightIndex === index ? '0 4px 12px rgba(0,0,0,0.05)' : 'none', border: currentInsightIndex === index ? '1px solid #6366F1' : '1px solid transparent', transition: 'all 0.3s' }}>
                                <div style={{ width: 24, height: 24, borderRadius: 6, background: currentInsightIndex === index ? '#6366F1' : '#E2E8F0', color: currentInsightIndex === index ? '#fff' : '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{index + 1}</div>
                                <span style={{ fontWeight: 700, fontSize: 14, color: currentInsightIndex === index ? '#1E293B' : '#64748B' }}>Nhóm nội dung {index + 1}</span>
                                {aiDoneIndexes.includes(index) && <CheckCircleOutlined style={{ color: '#10B981', fontSize: 16 }} />}
                            </div>
                        ))}
                    </Form.List>
                    <div style={{ flex: 1 }} />
                    <Space size="middle">
                        <Form.Item noStyle shouldUpdate>{() => (
                            <Button type="primary" icon={<RobotOutlined />} loading={isAiProcessing} onClick={() => handleAnalyzeAll()}
                                style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', border: 'none', borderRadius: 12, height: 40, padding: '0 24px', fontWeight: 700, boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)' }}>Phân tích</Button>
                        )}</Form.Item>
                        <Button danger icon={<DeleteOutlined />} style={{ borderRadius: 12, height: 40, width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => {
                            if (currentInsightIndex !== null && currentInsightIndex !== undefined) {
                                const passages = form.getFieldValue('passages');
                                if (passages.length > 1) {
                                    const newPassages = passages.filter((_: any, idx: number) => idx !== currentInsightIndex);
                                    form.setFieldValue('passages', newPassages);
                                    setPassageFileLists(prev => { const next: Record<number, any[]> = {}; Object.keys(prev).forEach(key => { const numKey = Number(key); if (numKey < currentInsightIndex) next[numKey] = prev[numKey]; else if (numKey > currentInsightIndex) next[numKey - 1] = prev[numKey]; }); return next; });
                                    setQuestionFileLists(prev => { const next: Record<number, any[]> = {}; Object.keys(prev).forEach(key => { const numKey = Number(key); if (numKey < currentInsightIndex) next[numKey] = prev[numKey]; else if (numKey > currentInsightIndex) next[numKey - 1] = prev[numKey]; }); return next; });
                                    setAiInsights(prev => { const next: Record<number, any> = {}; Object.keys(prev).forEach(key => { const numKey = Number(key); if (numKey < currentInsightIndex) next[numKey] = prev[numKey]; else if (numKey > currentInsightIndex) next[numKey - 1] = prev[numKey]; }); return next; });
                                    setAiDoneIndexes(prev => prev.filter(i => i !== currentInsightIndex).map(i => i > currentInsightIndex ? i - 1 : i));
                                    setCurrentInsightIndex(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
                                    message.success('Đã xóa nhóm nội dung!');
                                } else message.warning('Không thể xóa nhóm nội dung cuối cùng.');
                            }
                        }} />
                    </Space>
                </div>

                <Row gutter={32}>
                    <Col span={13}>
                        <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }} className="custom-scrollbar">
                            <Form.List name="passages">
                                {(fields, { add }) => (
                                    <>
                                        {fields.map((field, index) => (
                                            <Card key={field.key} id={`passage-card-${index}`} size="small" className="premium-card" style={{ marginBottom: 32, border: '1px solid #E2E8F0', borderRadius: 24, boxShadow: '0 10px 25px rgba(0,0,0,0.03)', overflow: 'hidden' }} bodyStyle={{ padding: '24px' }}>
                                                <Row gutter={16} style={{ marginBottom: 20 }}>
                                                    <Col span={6}><Form.Item label={<span style={{ fontWeight: 700, color: '#64748B' }}>Từ câu</span>} name={[field.name, 'startQuestion']} rules={[{ required: true }]}><InputNumber placeholder="131" style={{ width: '100%', borderRadius: 12, height: 40 }} onChange={(v) => checkDuplicateRange(Number(v), form.getFieldValue(['passages', index, 'endQuestion']))} /></Form.Item></Col>
                                                    <Col span={6}><Form.Item label={<span style={{ fontWeight: 700, color: '#64748B' }}>Đến câu</span>} name={[field.name, 'endQuestion']} rules={[{ required: true }]}><InputNumber placeholder="134" style={{ width: '100%', borderRadius: 12, height: 40 }} onChange={(v) => checkDuplicateRange(form.getFieldValue(['passages', index, 'startQuestion']), Number(v))} /></Form.Item></Col>
                                                    <Col span={12}><Form.Item label={<span style={{ fontWeight: 700, color: '#64748B' }}>Tiêu đề</span>} name={[field.name, 'passageTitle']}><Input placeholder="Questions 131-134 refer to..." style={{ borderRadius: 12, height: 40 }} /></Form.Item></Col>
                                                </Row>

                                                <Form.Item name={[field.name, 'passageType']} initialValue="text" style={{ marginBottom: 16 }}>
                                                    <Radio.Group buttonStyle="solid" className="pill-radio-group">
                                                        <Radio.Button value="text">Văn bản</Radio.Button>
                                                        <Radio.Button value="image">Hình ảnh</Radio.Button>
                                                    </Radio.Group>
                                                </Form.Item>

                                                <Form.Item noStyle shouldUpdate>{() => {
                                                    const type = form.getFieldValue(['passages', index, 'passageType']);
                                                    if (type === 'image') return (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                                            <Row gutter={16}>
                                                                <Col span={12}>
                                                                    <Form.Item label={<span style={{ fontWeight: 700, fontSize: 13 }}>1. Ảnh đoạn văn</span>}>
                                                                        <Dragger fileList={passageFileLists[index] || []} multiple showUploadList={false} action={`${api.defaults.baseURL}/upload/image`} name="image" headers={{ Authorization: `Bearer ${localStorage.getItem('admin_token')}` }} onChange={({ fileList }) => setPassageFileLists(prev => ({ ...prev, [index]: fileList }))} style={{ background: '#fff', border: '2px dashed #BFDBFE', borderRadius: 16, padding: '24px 0' }}>
                                                                            <p className="ant-upload-drag-icon"><CameraOutlined style={{ color: '#6366F1', fontSize: 40 }} /></p>
                                                                            <p className="ant-upload-text" style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Thả ảnh đoạn văn</p>
                                                                        </Dragger>
                                                                        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                                            {(passageFileLists[index] || []).map((file, fIdx) => (
                                                                                <div key={fIdx} className="horizontal-file-card">
                                                                                    <Image width={48} height={48} src={file.url || file.response?.data?.url || (file.originFileObj ? URL.createObjectURL(file.originFileObj) : '')} style={{ borderRadius: 8, objectFit: 'cover' }} />
                                                                                    <span className="file-name">Passage {fIdx + 1}</span>
                                                                                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => { const newList = passageFileLists[index].filter((_, i) => i !== fIdx); setPassageFileLists(prev => ({ ...prev, [index]: newList })); }} />
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </Form.Item>
                                                                </Col>
                                                                <Col span={12}>
                                                                    <Form.Item label={<span style={{ fontWeight: 700, fontSize: 13 }}>2. Ảnh câu hỏi</span>}>
                                                                        <Dragger fileList={questionFileLists[index] || []} multiple showUploadList={false} action={`${api.defaults.baseURL}/upload/image`} name="image" headers={{ Authorization: `Bearer ${localStorage.getItem('admin_token')}` }} onChange={({ fileList }) => setQuestionFileLists(prev => ({ ...prev, [index]: fileList }))} style={{ background: '#fff', border: '2px dashed #BFDBFE', borderRadius: 16, padding: '24px 0' }}>
                                                                            <p className="ant-upload-drag-icon"><CameraOutlined style={{ color: '#6366F1', fontSize: 40 }} /></p>
                                                                            <p className="ant-upload-text" style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Thả ảnh câu hỏi</p>
                                                                        </Dragger>
                                                                        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                                            {(questionFileLists[index] || []).map((file, fIdx) => (
                                                                                <div key={fIdx} className="horizontal-file-card">
                                                                                    <Image width={48} height={48} src={file.url || file.response?.data?.url || (file.originFileObj ? URL.createObjectURL(file.originFileObj) : '')} style={{ borderRadius: 8, objectFit: 'cover' }} />
                                                                                    <span className="file-name">Scan {fIdx + 1}</span>
                                                                                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => { const newList = questionFileLists[index].filter((_, i) => i !== fIdx); setQuestionFileLists(prev => ({ ...prev, [index]: newList })); }} />
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </Form.Item>
                                                                </Col>
                                                            </Row>
                                                        </div>
                                                    );
                                                    return <Form.Item name={[field.name, 'passage']} rules={[{ required: true }]}><ReactQuill theme="snow" style={{ height: 180, marginBottom: 45 }} /></Form.Item>;
                                                }}</Form.Item>

                                                <Form.Item name={[field.name, 'passageTranslationData']} hidden><Input /></Form.Item>
                                                <Form.Item name={[field.name, 'passageImageUrl']} hidden><Input /></Form.Item>
                                                <Form.Item name={[field.name, 'questionScanUrl']} hidden><Input /></Form.Item>
                                                <Form.Item name={[field.name, 'audioUrl']} hidden><Input /></Form.Item>

                                                <Form.Item noStyle shouldUpdate>{() => {
                                                    const start = Number(form.getFieldValue(['passages', index, 'startQuestion']));
                                                    const end = Number(form.getFieldValue(['passages', index, 'endQuestion']));
                                                    if (!start || !end || start > end) return <Empty description="Điền khoảng câu" />;
                                                    return (
                                                        <Form.List name={[field.name, 'questions']}>{(qf) => (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                                                {qf.map((q, qi) => (
                                                                    <Card key={q.key} size="small" bodyStyle={{ padding: '16px 12px' }} style={{ width: '100%', borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                                                        <div style={{ marginBottom: 12 }}><div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                                                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 42, height: 28, background: '#1E293B', color: '#fff', borderRadius: '6px', fontWeight: 700, fontSize: 13, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', letterSpacing: '0.5px' }}>#{start + qi}</span>
                                                                            <Form.Item name={[q.name, 'id']} hidden><Input /></Form.Item>
                                                                            <Form.Item name={[q.name, 'questionNumber']} hidden><Input /></Form.Item>
                                                                            <Form.Item name={[q.name, 'questionText']} initialValue="" hidden><Input /></Form.Item>
                                                                            <Form.Item name={[q.name, 'correctAnswer']} label={<span style={{ fontWeight: 600, color: '#64748B', fontSize: 11 }}>ĐÁP ÁN</span>} style={{ margin: 0, width: 80, marginLeft: 'auto' }}><Select options={[{ value: 'A' }, { value: 'B' }, { value: 'C' }, { value: 'D' }]} style={{ borderRadius: 8 }} /></Form.Item>
                                                                        </div></div>
                                                                        <Row gutter={[12, 12]}>
                                                                            <Col span={12}><Form.Item name={[q.name, 'optionA']} label={<span style={{ fontWeight: 700, color: '#1E293B' }}>A</span>} style={{ margin: 0 }}><Input style={{ borderRadius: 8 }} /></Form.Item></Col>
                                                                            <Col span={12}><Form.Item name={[q.name, 'optionB']} label={<span style={{ fontWeight: 700, color: '#1E293B' }}>B</span>} style={{ margin: 0 }}><Input style={{ borderRadius: 8 }} /></Form.Item></Col>
                                                                            <Col span={12}><Form.Item name={[q.name, 'optionC']} label={<span style={{ fontWeight: 700, color: '#1E293B' }}>C</span>} style={{ margin: 0 }}><Input style={{ borderRadius: 8 }} /></Form.Item></Col>
                                                                            <Col span={12}><Form.Item name={[q.name, 'optionD']} label={<span style={{ fontWeight: 700, color: '#1E293B' }}>D</span>} style={{ margin: 0 }}><Input style={{ borderRadius: 8 }} /></Form.Item></Col>
                                                                        </Row>
                                                                        <div style={{ marginTop: 16, padding: '12px', background: '#F8F9FF', borderRadius: 12, border: '1px solid #E0E7FF' }}>
                                                                            <span style={{ fontWeight: 700, color: '#4338CA', fontSize: 11, display: 'block', marginBottom: 8 }}>DỊCH ĐÁP ÁN</span>
                                                                            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.passages?.[index]?.questions?.[qi]?.optionTranslations !== curr.passages?.[index]?.questions?.[qi]?.optionTranslations}>{() => {
                                                                                const translationsRaw = form.getFieldValue(['passages', index, 'questions', qi, 'optionTranslations']);
                                                                                let trans = { A: '', B: '', C: '', D: '' };
                                                                                try { if (typeof translationsRaw === 'string') trans = JSON.parse(translationsRaw); else if (translationsRaw) trans = translationsRaw; } catch (e) { }
                                                                                return (
                                                                                    <Row gutter={[8, 8]}>
                                                                                        <Col span={12}><Input value={trans.A} prefix={<span style={{ color: '#94A3B8', fontWeight: 600 }}>A:</span>} readOnly style={{ borderRadius: 6, fontSize: 12, background: '#fff' }} /></Col>
                                                                                        <Col span={12}><Input value={trans.B} prefix={<span style={{ color: '#94A3B8', fontWeight: 600 }}>B:</span>} readOnly style={{ borderRadius: 6, fontSize: 12, background: '#fff' }} /></Col>
                                                                                        <Col span={12}><Input value={trans.C} prefix={<span style={{ color: '#94A3B8', fontWeight: 600 }}>C:</span>} readOnly style={{ borderRadius: 6, fontSize: 12, background: '#fff' }} /></Col>
                                                                                        <Col span={12}><Input value={trans.D} prefix={<span style={{ color: '#94A3B8', fontWeight: 600 }}>D:</span>} readOnly style={{ borderRadius: 6, fontSize: 12, background: '#fff' }} /></Col>
                                                                                    </Row>
                                                                                );
                                                                            }}</Form.Item>
                                                                        </div>
                                                                        <Form.Item name={[q.name, 'explanation']} hidden><Input /></Form.Item>
                                                                        <Form.Item name={[q.name, 'analysis']} hidden><Input /></Form.Item>
                                                                        <Form.Item name={[q.name, 'evidence']} hidden><Input /></Form.Item>
                                                                        <Form.Item name={[q.name, 'optionTranslations']} hidden><Input /></Form.Item>
                                                                        <Form.Item name={[q.name, 'questionTranslation']} hidden><Input /></Form.Item>
                                                                        <Form.Item name={[q.name, 'keyVocabulary']} hidden><Input /></Form.Item>
                                                                    </Card>
                                                                ))}
                                                            </div>
                                                        )}</Form.List>
                                                    );
                                                }}</Form.Item>
                                            </Card>
                                        ))}
                                        {mode === 'add' && (
                                            <Button type="dashed" block icon={<PlusOutlined />} onClick={() => { add(); setCurrentInsightIndex(fields.length); }} style={{ height: 52, borderRadius: 16, borderColor: '#6366F1', color: '#4338CA', fontWeight: 700, background: '#F5F3FF', fontSize: 15, borderStyle: 'dashed', borderWidth: 2 }}>Thêm nhóm nội dung mới</Button>
                                        )}
                                    </>
                                )}
                            </Form.List>
                        </div>
                    </Col>
                    <Col span={11}>
                        <div style={{ padding: '32px', background: '#FFFFFF', borderRadius: '32px', height: '75vh', overflowY: 'auto', border: '1px solid #E2E8F0', boxShadow: '0 4px 30px rgba(0,0,0,0.03)' }} className="sidebar-container custom-scrollbar">
                            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                                <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg, #6253E1 0%, #4338CA 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 32, margin: '0 auto 16px', boxShadow: '0 8px 16px rgba(98, 83, 225, 0.2)' }}><RobotOutlined /></div>
                                <h3 style={{ margin: '0 0 6px', color: '#1E3A8A', fontWeight: 800, fontSize: 20 }}>AI Companion INSIGHTS</h3>
                                <div style={{ display: 'inline-block', padding: '4px 12px', background: '#F5F3FF', borderRadius: '12px', fontSize: 12, color: '#6253E1', fontWeight: 700 }}>POWERED BY GEMINI PRO</div>
                                <Progress percent={aiProgress} size="small" strokeColor="linear-gradient(135deg, #6253E1 0%, #4338CA 100%)" style={{ display: isAiProcessing ? 'block' : 'none', marginTop: 16 }} />
                            </div>
                            {Object.keys(aiInsights).length === 0 ? (
                                <div style={{ textAlign: 'center', marginTop: 100 }}><RobotOutlined style={{ fontSize: 48, color: '#E2E8F0', marginBottom: 16 }} /><Empty description="Nhấn Phân tích Tất cả để xem AI Insight" /></div>
                            ) : (
                                <>
                                    <Space direction="vertical" style={{ width: '100%' }} size="large">
                                        {Object.keys(aiInsights).sort((a, b) => Number(a) - Number(b)).map(keyStr => {
                                            const index = Number(keyStr);
                                            const insights = aiInsights[index];
                                            if (!insights) return null;
                                            return (
                                                <div key={index} style={{ marginBottom: 48, paddingBottom: 24, borderBottom: '2px dashed #E2E8F0' }}>
                                                    <div style={{ textAlign: 'center', marginBottom: 32 }}><span style={{ color: '#6366F1', fontWeight: 800, fontSize: 16, letterSpacing: '1px', textTransform: 'uppercase' }}>— KẾT QUẢ NHÓM NỘI DUNG {index + 1} —</span></div>
                                                    <div style={{ marginBottom: 32 }}><h4 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4338CA', fontWeight: 800, fontSize: 16, marginBottom: 20 }}><TranslationOutlined /> DỊCH SONG NGỮ</h4>
                                                        {(() => {
                                                            const pData = insights.passageData;
                                                            const pTrans = insights.passageTranslations;
                                                            const pTransData = (insights as any).passageTranslationData;
                                                            const pOld = insights.passages;

                                                            let translationsToRender: any[] = [];
                                                            const rawData = pData || pTrans || pTransData || pOld || [];

                                                            try {
                                                                translationsToRender = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
                                                            } catch (e) {
                                                                translationsToRender = [];
                                                            }

                                                            if (!Array.isArray(translationsToRender)) translationsToRender = [];

                                                            // Legacy compatibility
                                                            if (translationsToRender.length > 0 && (translationsToRender[0].en !== undefined || translationsToRender[0].text !== undefined)) {
                                                                translationsToRender = [{ label: 'Passage (Legacy)', items: translationsToRender }];
                                                            }

                                                            return translationsToRender.map((p: any, i: number) => (
                                                                <div key={i} style={{ marginBottom: 24, paddingLeft: 12, borderLeft: '4px solid #6366F1' }}>
                                                                    <div style={{ fontWeight: 700, color: '#6366F1', marginBottom: 12 }}>{p.label || `Part ${i + 1}`}</div>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                                                        {(p.items || p.sentences || p.translation || p.passage || []).map((s: any, j: number) => (
                                                                            <div key={j} style={{ background: '#F8F9FF', padding: '16px', borderRadius: '16px', border: '1px solid #EEF2FF' }}>
                                                                                <div style={{ color: '#1E293B', fontSize: 14, marginBottom: 8, lineHeight: '1.6' }}>{s.en || s.text || ''}</div>
                                                                                <div style={{ color: '#4338CA', fontSize: 14, fontWeight: 600, lineHeight: '1.6' }}>{s.vi || s.meaning || ''}</div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ));
                                                        })()}</div>
                                                    <div style={{ marginBottom: 32 }}>
                                                        <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4338CA', fontWeight: 800, fontSize: 16, marginBottom: 20 }}>
                                                            <BookOutlined /> TỪ VỰNG QUAN TRỌNG
                                                        </h4>

                                                        {/* Quick Add Form */}
                                                        <div style={{ background: '#EEF2FF', padding: '16px', borderRadius: '16px', marginBottom: 20, border: '1px solid #C7D2FE' }}>
                                                            <div style={{ color: '#4338CA', fontWeight: 700, fontSize: 12, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Thêm từ vựng thủ công</div>
                                                            <Row gutter={[8, 8]}>
                                                                <Col span={10}>
                                                                    <Input placeholder="Từ vựng..." value={newVocab.word} onChange={e => setNewVocab({ ...newVocab, word: e.target.value })} style={{ borderRadius: 8, fontSize: 13 }} />
                                                                </Col>
                                                                <Col span={6}>
                                                                    <Select value={newVocab.type} onChange={val => setNewVocab({ ...newVocab, type: val })} style={{ width: '100%' }} borderRadius-8="true">
                                                                        <Select.Option value="n">n</Select.Option>
                                                                        <Select.Option value="v">v</Select.Option>
                                                                        <Select.Option value="adj">adj</Select.Option>
                                                                        <Select.Option value="adv">adv</Select.Option>
                                                                    </Select>
                                                                </Col>
                                                                <Col span={8}>
                                                                    <Input placeholder="/IPA/..." value={newVocab.ipa} onChange={e => setNewVocab({ ...newVocab, ipa: e.target.value })} style={{ borderRadius: 8, fontSize: 13 }} />
                                                                </Col>
                                                                <Col span={18}>
                                                                    <Input placeholder="Nghĩa tiếng Việt..." value={newVocab.meaning} onChange={e => setNewVocab({ ...newVocab, meaning: e.target.value })} style={{ borderRadius: 8, fontSize: 13 }} />
                                                                </Col>
                                                                <Col span={6}>
                                                                    <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAddManualVocab(currentInsightIndex!)} style={{ width: '100%', borderRadius: 8, background: '#4338CA' }}>Lưu</Button>
                                                                </Col>
                                                            </Row>
                                                        </div>

                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                                            {(insights.vocabulary || []).map((v: any, i: number) => (
                                                                <div key={i} className="vocab-card" style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '12px', border: '1px solid #F1F5F9', position: 'relative' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                                                        <div style={{ color: '#4338CA', fontWeight: 800, fontSize: 14 }}>{v.word || v.text}</div>
                                                                        <Space size={4}>
                                                                            {v.type && <Tag color="blue" style={{ fontSize: 10, borderRadius: 4, margin: 0, padding: '0 4px' }}>{v.type}</Tag>}
                                                                            <Button type="text" danger icon={<DeleteOutlined style={{ fontSize: 12 }} />} size="small" onClick={() => handleDeleteVocab(currentInsightIndex!, i)} style={{ width: 20, height: 20, padding: 0 }} />
                                                                        </Space>
                                                                    </div>
                                                                    <div style={{ color: '#64748B', fontSize: 12, fontStyle: 'italic', marginBottom: 4 }}>{v.ipa}</div>
                                                                    <div style={{ color: '#1E293B', fontSize: 13, fontWeight: 500 }}>{v.meaning}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div><h4 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4338CA', fontWeight: 800, fontSize: 16, marginBottom: 20 }}><RobotOutlined /> PHÂN TÍCH CÂU HỎI</h4>
                                                        {(insights.questions || []).map((q: any, i: number) => (
                                                            <div key={i} style={{ marginBottom: 16, background: '#F8FAFC', padding: '16px', borderRadius: '16px' }}>
                                                                <div style={{ fontWeight: 800, color: '#1E293B', marginBottom: 8 }}>Câu {q.questionNumber}</div>
                                                                {q.questionTranslation && <div style={{ color: '#64748B', fontStyle: 'italic', marginBottom: 12, fontSize: 13 }}>"{q.questionTranslation}"</div>}
                                                                <div style={{ fontSize: 13, marginBottom: 8 }}><b>💎 PHÂN TÍCH:</b> {q.analysis}</div>
                                                                <div style={{ fontSize: 13, color: '#059669', background: '#ECFDF5', padding: '8px 12px', borderRadius: '8px' }}><b>🔍 BẰNG CHỨNG:</b> {q.evidence}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}</Space>
                                </>
                            )}
                        </div>
                    </Col>
                </Row>
                <style>{`
                    .premium-card { transition: all 0.3s ease; }
                    .premium-card:hover { transform: translateY(-4px); box-shadow: 0 15px 35px rgba(0,0,0,0.06) !important; }
                    .pill-radio-group .ant-radio-button-wrapper { border-radius: 20px !important; margin-right: 8px; border: 1px solid #E2E8F0 !important; background: #F8FAFC; color: #64748B; font-weight: 700; height: 36px; line-height: 34px; }
                    .pill-radio-group .ant-radio-button-wrapper-checked { background: #6366F1 !important; color: #fff !important; border-color: #6366F1 !important; }
                    .pill-radio-group .ant-radio-button-wrapper:before { display: none !important; }
                    .horizontal-file-card { display: flex; alignItems: center; gap: 12px; padding: 10px 16px; background: #fff; borderRadius: 16px; border: 1px solid #F1F5F9; boxShadow: 0 2px 8px rgba(0,0,0,0.04); }
                    .horizontal-file-card .file-name { flex: 1; font-weight: 700; color: #475569; font-size: 13px; }
                    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; borderRadius: 10px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
                `}</style>
            </Form>
        </Modal>
    );
}