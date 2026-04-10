import React, { useState, useEffect } from 'react';
import {
    Button, Modal, Form, Input, Select, Upload,
    message, Space, Tag, Typography, Popconfirm, Empty,
    Tooltip, Segmented, Tabs, Card, Table
} from 'antd';
import {
    FilePdfOutlined,
    YoutubeOutlined,
    LinkOutlined,
    PlusOutlined,
    DeleteOutlined,
    EyeOutlined,
    CloudUploadOutlined,
    BookOutlined,
    EditOutlined
} from '@ant-design/icons';
import { classApi } from '../services/api';

const { Text } = Typography;

interface ClassMaterialManagerProps {
    classId: string;
    isDark?: boolean;
}

const ClassMaterialManager: React.FC<ClassMaterialManagerProps> = ({ classId, isDark = false }) => {
    const [materials, setMaterials] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [selectedType, setSelectedType] = useState<'PDF' | 'LINK' | 'VIDEO'>('LINK');
    const [viewCategory, setViewCategory] = useState<'MATERIAL' | 'HOMEWORK'>('MATERIAL');

    // Video Player State
    const [previewVideoOpen, setPreviewVideoOpen] = useState(false);
    const [previewVideoUrl, setPreviewVideoUrl] = useState('');

    // PDF Preview State
    const [previewPdfOpen, setPreviewPdfOpen] = useState(false);
    const [previewPdfUrl, setPreviewPdfUrl] = useState('');

    // User Role Check
    const userStr = localStorage.getItem('admin_user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isAdmin = user?.role === 'ADMIN';

    useEffect(() => {
        if (classId) {
            fetchMaterials();
        }
    }, [classId]);

    const fetchMaterials = async () => {
        setLoading(true);
        try {
            const response = await classApi.getMaterials(classId);
            if (response.success) {
                setMaterials(response.data);
            }
        } catch (error) {
            message.error('Lỗi khi tải danh sách tài liệu');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (values: any) => {
        const hide = message.loading('Đang thêm tài liệu...', 0);
        try {
            const data = {
                title: values.title,
                description: values.description,
                type: values.type,
                category: values.category,
                url: values.url || ''
            };

            const file = values.file?.fileList?.[0]?.originFileObj;

            const response = await classApi.addMaterial(classId, data, file);
            if (response.success) {
                message.success('Thêm tài liệu thành công');
                setIsModalOpen(false);
                form.resetFields();
                fetchMaterials();
            }
        } catch (error) {
            message.error('Lỗi khi thêm tài liệu');
        } finally {
            hide();
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const response = await classApi.deleteMaterial(id);
            if (response.success) {
                message.success('Đã xóa tài liệu');
                fetchMaterials();
            }
        } catch (error) {
            message.error('Lỗi khi xóa tài liệu');
        }
    };

    const modernShadow = 'var(--card-shadow)';

    const columns = [
        {
            title: 'Tài liệu',
            key: 'title',
            render: (record: any) => (
                <Space>
                    {record.type === 'PDF' && <FilePdfOutlined style={{ color: '#EF4444', fontSize: 18 }} />}
                    {record.type === 'VIDEO' && <YoutubeOutlined style={{ color: '#FF0000', fontSize: 18 }} />}
                    {record.type === 'LINK' && <LinkOutlined style={{ color: '#3B82F6', fontSize: 18 }} />}
                    <div>
                        <div style={{ fontWeight: 600 }}>{record.title}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>{record.description}</Text>
                    </div>
                </Space>
            )
        },
        {
            title: 'Mục',
            dataIndex: 'category',
            key: 'category',
            width: 140,
            render: (category: string) => (
                <Tag color={category === 'HOMEWORK' ? 'warning' : 'processing'} style={{ borderRadius: 6, fontWeight: 600, padding: '4px 12px' }}>
                    {category === 'HOMEWORK' ? 'BÀI TẬP' : 'TÀI LIỆU'}
                </Tag>
            )
        },
        {
            title: 'Hình thức',
            dataIndex: 'type',
            key: 'type',
            width: 100,
            render: (type: string) => (
                <Tag color={type === 'PDF' ? 'red' : type === 'VIDEO' ? 'error' : 'blue'}>
                    {type}
                </Tag>
            )
        },
        {
            title: 'Ngày đăng',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 150,
            render: (date: string) => new Date(date).toLocaleDateString('vi-VN')
        },
        {
            title: 'Hành động',
            key: 'action',
            width: 120,
            render: (record: any) => (
                <Space>
                    <Tooltip title="Xem">
                        <Button
                            type="text"
                            icon={<EyeOutlined style={{ color: '#3B82F6' }} />}
                            onClick={() => {
                                if (record.type === 'VIDEO' && getYoutubeId(record.url)) {
                                    setPreviewVideoUrl(record.url);
                                    setPreviewVideoOpen(true);
                                } else if (record.type === 'PDF') {
                                    setPreviewPdfUrl(record.url);
                                    setPreviewPdfOpen(true);
                                } else {
                                    window.open(record.url, '_blank');
                                }
                            }}
                        />
                    </Tooltip>
                    {!isAdmin && (
                        <Popconfirm
                            title="Xóa tài liệu?"
                            description="Hành động này không thể hoàn tác."
                            onConfirm={() => handleDelete(record.id)}
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                        >
                            <Button type="text" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    )}
                </Space>
            )
        }
    ];

    const getYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const displayedMaterials = materials.filter(m => m.category === viewCategory);

    return (
        <div style={{ padding: '0 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Segmented
                    value={viewCategory}
                    onChange={(val) => setViewCategory(val as 'MATERIAL' | 'HOMEWORK')}
                    options={[
                        { label: <div style={{ padding: '4px 12px', fontWeight: 600 }}><BookOutlined /> Kho tài liệu</div>, value: 'MATERIAL' },
                        { label: <div style={{ padding: '4px 12px', fontWeight: 600 }}><EditOutlined /> Bài tập về nhà</div>, value: 'HOMEWORK' },
                    ]}
                    style={{ background: isDark ? '#1E293B' : '#F1F5F9', padding: 4 }}
                />
                {!isAdmin && (
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                            form.setFieldsValue({ 
                                category: viewCategory,
                                type: 'LINK',
                                title: '',
                                description: '',
                                url: ''
                            });
                            setSelectedType('LINK');
                            setIsModalOpen(true);
                        }}
                        style={{
                            borderRadius: 8,
                            height: 40,
                            fontWeight: 600,
                            background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                            border: 'none',
                            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)'
                        }}
                    >
                        Thêm Tài liệu / Bài tập
                    </Button>
                )}
            </div>

            <Tabs
                defaultActiveKey="ALL"
                items={[
                    {
                        key: 'ALL',
                        label: <span>Tất cả</span>,
                        children: (
                            <Card style={{ borderRadius: 24, border: 'none', boxShadow: modernShadow, overflow: 'hidden', background: isDark ? '#1E293B' : '#FFFFFF' }} bodyStyle={{ padding: 0 }}>
                                <Table
                                    columns={columns}
                                    dataSource={displayedMaterials}
                                    rowKey="id"
                                    loading={loading}
                                    locale={{ emptyText: <Empty description={`Chưa có ${viewCategory === 'HOMEWORK' ? 'bài tập' : 'tài liệu'} nào`} style={{ margin: '40px 0' }} /> }}
                                    pagination={{ pageSize: 8 }}
                                />
                            </Card>
                        )
                    },
                    {
                        key: 'PDF',
                        label: <span><FilePdfOutlined /> File PDF</span>,
                        children: (
                            <Card style={{ borderRadius: 24, border: 'none', boxShadow: modernShadow, overflow: 'hidden', background: isDark ? '#1E293B' : '#FFFFFF' }} bodyStyle={{ padding: 0 }}>
                                <Table
                                    columns={columns}
                                    dataSource={displayedMaterials.filter(m => m.type === 'PDF')}
                                    rowKey="id"
                                    loading={loading}
                                    locale={{ emptyText: <Empty description={`Chưa có file PDF nào`} style={{ margin: '40px 0' }} /> }}
                                    pagination={{ pageSize: 8 }}
                                />
                            </Card>
                        )
                    },
                    {
                        key: 'VIDEO',
                        label: <span><YoutubeOutlined /> Video YouTube</span>,
                        children: (
                            <Card style={{ borderRadius: 24, border: 'none', boxShadow: modernShadow, overflow: 'hidden', background: isDark ? '#1E293B' : '#FFFFFF' }} bodyStyle={{ padding: 0 }}>
                                <Table
                                    columns={columns}
                                    dataSource={displayedMaterials.filter(m => m.type === 'VIDEO')}
                                    rowKey="id"
                                    loading={loading}
                                    locale={{ emptyText: <Empty description={`Chưa có Video nào`} style={{ margin: '40px 0' }} /> }}
                                    pagination={{ pageSize: 8 }}
                                />
                            </Card>
                        )
                    },
                    {
                        key: 'LINK',
                        label: <span><LinkOutlined /> Liên kết Web</span>,
                        children: (
                            <Card style={{ borderRadius: 24, border: 'none', boxShadow: modernShadow, overflow: 'hidden', background: isDark ? '#1E293B' : '#FFFFFF' }} bodyStyle={{ padding: 0 }}>
                                <Table
                                    columns={columns}
                                    dataSource={displayedMaterials.filter(m => m.type === 'LINK')}
                                    rowKey="id"
                                    loading={loading}
                                    locale={{ emptyText: <Empty description={`Chưa có liên kết nào`} style={{ margin: '40px 0' }} /> }}
                                    pagination={{ pageSize: 8 }}
                                />
                            </Card>
                        )
                    }
                ]}
            />

            <Modal
                title="Đăng tài liệu mới"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={550}
                centered
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleAdd}
                    initialValues={{ type: 'LINK', category: 'MATERIAL' }}
                    style={{ marginTop: 20 }}
                >
                    <Form.Item name="category" label="Phân loại">
                        <Segmented
                            block
                            options={[
                                { label: 'Kho tài liệu', value: 'MATERIAL', icon: <BookOutlined /> },
                                { label: 'Bài tập về nhà', value: 'HOMEWORK', icon: <EditOutlined /> },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item
                        name="title"
                        label="Tiêu đề tài liệu"
                        rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
                    >
                        <Input placeholder="VD: Mẹo làm bài Part 7 - Reading" />
                    </Form.Item>

                    <Form.Item name="description" label="Ghi chú thêm">
                        <Input.TextArea placeholder="Dặn dò học viên (không bắt buộc)..." rows={2} />
                    </Form.Item>

                    <Form.Item
                        name="type"
                        label="Loại tài liệu"
                        rules={[{ required: true }]}
                    >
                        <Select onChange={(val) => setSelectedType(val)}>
                            <Select.Option value="PDF">PDF</Select.Option>
                            <Select.Option value="VIDEO">Video YouTube</Select.Option>
                            <Select.Option value="LINK">Liên kết (Website/Tải về)</Select.Option>
                        </Select>
                    </Form.Item>

                    {selectedType === 'PDF' ? (
                        <Form.Item
                            name="file"
                            label="Chọn file PDF"
                            rules={[{ required: true, message: 'Vui lòng chọn file' }]}
                        >
                            <Upload
                                beforeUpload={() => false}
                                maxCount={1}
                                accept=".pdf"
                            >
                                <Button icon={<CloudUploadOutlined />} style={{ width: '100%' }}>
                                    Nhấp để tải file lên
                                </Button>
                            </Upload>
                        </Form.Item>
                    ) : (
                        <Form.Item
                            name="url"
                            label={selectedType === 'VIDEO' ? "Link Video YouTube" : "Đường dẫn (URL)"}
                            rules={[{ required: true, message: 'Vui lòng nhập link' }]}
                        >
                            <Input
                                placeholder={selectedType === 'VIDEO' ? "Dán link youtube vào đây..." : "https://..."}
                                onChange={() => {
                                    if (selectedType === 'VIDEO') {
                                        // Trigger re-render to show preview if needed
                                    }
                                }}
                            />
                        </Form.Item>
                    )}

                    {selectedType === 'VIDEO' && form.getFieldValue('url') && getYoutubeId(form.getFieldValue('url')) && (
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>Xem trước:</div>
                            <iframe
                                width="100%"
                                height="220"
                                src={`https://www.youtube.com/embed/${getYoutubeId(form.getFieldValue('url'))}`}
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                style={{ borderRadius: 12 }}
                            />
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                        <Button onClick={() => setIsModalOpen(false)} style={{ borderRadius: 8 }}>Hủy</Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            style={{
                                borderRadius: 8,
                                background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                                border: 'none',
                                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
                                fontWeight: 600
                            }}
                        >
                            Xác nhận đăng
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* In-place Video Player Modal */}
            <Modal
                title={null}
                open={previewVideoOpen}
                onCancel={() => setPreviewVideoOpen(false)}
                footer={null}
                width={800}
                centered
                destroyOnClose
                bodyStyle={{ padding: 0, background: '#000', borderRadius: 12, overflow: 'hidden' }}
                closeIcon={<div style={{ background: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: '50%', color: '#fff', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>X</div>}
            >
                {previewVideoUrl && getYoutubeId(previewVideoUrl) && (
                    <iframe
                        width="100%"
                        height="450"
                        src={`https://www.youtube.com/embed/${getYoutubeId(previewVideoUrl)}?autoplay=1`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        style={{ display: 'block' }}
                    />
                )}
            </Modal>

            {/* In-place PDF Preview Modal */}
            <Modal
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '96%' }}>
                        <div style={{ fontWeight: 600 }}>Xem tài liệu PDF</div>
                        <Button 
                            type="primary" 
                            size="small" 
                            icon={<CloudUploadOutlined />} 
                            onClick={() => window.open(previewPdfUrl, '_blank')}
                            style={{ borderRadius: 6 }}
                        >
                            Xem bản gốc
                        </Button>
                    </div>
                }
                open={previewPdfOpen}
                onCancel={() => setPreviewPdfOpen(false)}
                footer={null}
                width="90%"
                style={{ top: 20, maxWidth: 1000 }}
                centered
                destroyOnClose
                bodyStyle={{ padding: 0, height: '80vh', overflow: 'hidden' }}
            >
                {previewPdfUrl && (
                    <div style={{ height: '100%', position: 'relative' }}>
                        <iframe
                            src={`${previewPdfUrl}#view=FitH`}
                            title="PDF Preview"
                            width="100%"
                            height="100%"
                            style={{ border: 'none' }}
                        />
                        {/* Fallback for very old browsers or raw files */}
                        <div style={{ 
                            position: 'absolute', 
                            bottom: 0, 
                            left: 0, 
                            right: 0, 
                            padding: '10px', 
                            background: 'rgba(255,255,255,0.9)', 
                            textAlign: 'center',
                            borderTop: '1px solid #e1e1e1',
                            fontSize: '12px',
                            color: '#64748b'
                        }}>
                            Nếu không thấy tài liệu? <a href={previewPdfUrl} target="_blank" rel="noreferrer">Nhấn vào đây để tải về trực tiếp</a>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default ClassMaterialManager;
