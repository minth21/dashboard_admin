import React, { useState, useEffect } from 'react';
import { 
    Table, Button, Modal, Form, Input, Select, Upload, 
    message, Space, Tag, Typography, Popconfirm, Empty,
    Tooltip, Segmented
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

const { Text, Title } = Typography;

interface ClassMaterialManagerProps {
    classId: string;
    isDark?: boolean;
}

const ClassMaterialManager: React.FC<ClassMaterialManagerProps> = ({ classId }) => {
    const [materials, setMaterials] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [selectedType, setSelectedType] = useState<'PDF' | 'LINK' | 'VIDEO'>('LINK');

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
                <Tag color={category === 'HOMEWORK' ? 'warning' : 'processing'} style={{ borderRadius: 4, fontWeight: 600 }}>
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
                            icon={<EyeOutlined />} 
                            onClick={() => window.open(record.url, '_blank')}
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

    return (
        <div style={{ padding: '0 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>📚 Kho bài tập & Tài liệu</Title>
                    <Text type="secondary">Cung cấp thêm tài liệu đặc sản của trung tâm cho học viên lớp học này.</Text>
                </div>
                {!isAdmin && (
                    <Button 
                        type="primary" 
                        icon={<PlusOutlined />} 
                        onClick={() => setIsModalOpen(true)}
                        style={{ borderRadius: 8, height: 40, fontWeight: 600 }}
                    >
                        Đăng tài liệu
                    </Button>
                )}
            </div>

            <Table 
                columns={columns} 
                dataSource={materials} 
                rowKey="id" 
                loading={loading}
                locale={{ emptyText: <Empty description="Lớp chưa có tài liệu bổ trợ nào" /> }}
                pagination={{ pageSize: 8 }}
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
                            <Select.Option value="PDF">Tải lên file PDF</Select.Option>
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
                        <Button onClick={() => setIsModalOpen(false)}>Hủy</Button>
                        <Button type="primary" htmlType="submit">Xác nhận đăng</Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default ClassMaterialManager;
