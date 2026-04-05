import React, { useState, useEffect } from 'react';
import {
    Table, Button, Card, Typography, Space, Modal, Form,
    Input, Select, message, Popconfirm, Tag, Tooltip, Avatar,
    Row, Col, Drawer
} from 'antd';
import {
    PlusOutlined, EditOutlined,
    UserOutlined, TeamOutlined, BookOutlined,
    SearchOutlined, ReloadOutlined, LockOutlined,
    EyeOutlined, DownloadOutlined
} from '@ant-design/icons';
import { classApi, userApi } from '../services/api';
import type { Class, User } from '../services/api';

const { Text } = Typography;

const modernShadow = '0 10px 30px -5px rgba(15, 23, 42, 0.05)';

const ClassManagement: React.FC = () => {
    const [classes, setClasses] = useState<Class[]>([]);
    const [teachers, setTeachers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingClass, setEditingClass] = useState<Class | null>(null);
    const [form] = Form.useForm();
    const [searchText, setSearchText] = useState('');
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    // Fetch data
    const fetchData = async () => {
        setLoading(true);
        try {
            const [classRes, teacherRes] = await Promise.all([
                classApi.list(),
                userApi.list(1, 100, 'TEACHER')
            ]);

            if (classRes.success) setClasses(classRes.data);
            if (teacherRes.success) setTeachers(teacherRes.users);
        } catch (error) {
            message.error('Lỗi khi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = (record?: Class) => {
        if (record) {
            setEditingClass(record);
            form.setFieldsValue({
                className: record.className,
                classCode: record.classCode,
                description: record.description,
                teacherId: record.teacher?.id || record.teacherId
            });
        } else {
            setEditingClass(null);
            form.resetFields();
        }
        setModalVisible(true);
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            let res;
            if (editingClass) {
                res = await classApi.update(editingClass.id, values);
            } else {
                res = await classApi.create(values);
            }

            if (res.success) {
                message.success(`${editingClass ? 'Cập nhật' : 'Tạo'} lớp học thành công`);
                setModalVisible(false);
                setSearchText(''); // Clear search
                fetchData();
            } else {
                message.error(res.message || 'Có lỗi xảy ra');
            }
        } catch (error) {
            // validate failed
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        try {
            const res = await classApi.toggleStatus(id, newStatus as any);
            if (res.success) {
                message.success(res.message);
                setSearchText(''); // Clear search
                fetchData();
            } else {
                message.error(res.message || 'Có lỗi xảy ra');
            }
        } catch (error) {
            message.error('Lỗi khi cập nhật trạng thái lớp học');
        }
    };

    const handleViewStudents = async (record: Class) => {
        setSelectedClass(record);
        setDrawerVisible(true);
        setLoadingStudents(true);
        try {
            const response = await classApi.getStudents(record.id);
            if (response.success) {
                setStudents(response.data);
            } else {
                message.error('Không thể tải danh sách học viên');
            }
        } catch (error) {
            console.error(error);
            message.error('Lỗi khi tải danh sách học viên');
        } finally {
            setLoadingStudents(false);
        }
    };

    const handleExportExcel = async (classId: string, className: string) => {
        try {
            const messageHide = message.loading('Đang xuất báo cáo Excel...', 0);
            const blob = await classApi.exportClassPerformance(classId);
            messageHide();

            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Báo_cáo_lớp_${className.replace(/\s+/g, '_')}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);

            message.success('Xuất báo cáo thành công!');
        } catch (error) {
            console.error(error);
            message.error('Lỗi khi xuất báo cáo Excel');
        }
    };

    const filteredClasses = classes.filter(c =>
        c.className.toLowerCase().includes(searchText.toLowerCase()) ||
        (c.classCode && c.classCode.toLowerCase().includes(searchText.toLowerCase()))
    );

    const columns = [
        {
            title: 'Mã lớp',
            dataIndex: 'classCode',
            key: 'classCode',
            render: (code: string) => <Tag color="blue" style={{ fontWeight: 500 }}>{code || '-'}</Tag>,
            width: 120,
        },
        {
            title: 'Tên lớp học',
            dataIndex: 'className',
            key: 'className',
            render: (text: string) => <Text strong style={{ color: '#1E3A8A' }}>{text}</Text>,
        },
        {
            title: 'Giáo viên phụ trách',
            key: 'teacher',
            render: (_: any, record: Class) => (
                <Space>
                    <Avatar 
                        size="small" 
                        src={record.teacher?.avatarUrl ? (record.teacher.avatarUrl.startsWith('http') ? record.teacher.avatarUrl : `http://localhost:3000${record.teacher.avatarUrl}`) : undefined}
                        icon={<UserOutlined />} 
                    />
                    <span>{record.teacher?.name || 'Chưa gán'}</span>
                </Space>
            ),
        },
        {
            title: 'Sĩ số',
            dataIndex: 'studentCount',
            key: 'studentCount',
            render: (count: number) => (
                <Space>
                    <TeamOutlined style={{ color: '#64748B' }} />
                    <Text>{count || 0} học viên</Text>
                </Space>
            ),
            width: 150,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 130,
            render: (status: string) => (
                <Tag color={status === 'ACTIVE' ? 'success' : 'default'} style={{ borderRadius: 6, fontWeight: 500 }}>
                    {status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm dừng'}
                </Tag>
            ),
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_: any, record: Class) => (
                <Space size="middle">
                    <Tooltip title="Xem học viên">
                        <Button
                            type="text"
                            style={{ background: '#DBEAFE', borderRadius: '8px' }}
                            icon={<EyeOutlined style={{ color: '#2563EB' }} />}
                            onClick={() => handleViewStudents(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Chỉnh sửa">
                        <Button
                            type="text"
                            style={{ background: '#ECFDF5', borderRadius: '8px' }}
                            icon={<EditOutlined style={{ color: '#059669' }} />}
                            onClick={() => handleOpenModal(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title={record.status === 'ACTIVE' ? "Tạm dừng lớp học này?" : "Kích hoạt lại lớp học này?"}
                        description={`Bạn có chắc muốn ${record.status === 'ACTIVE' ? 'tạm dừng' : 'kích hoạt'} lớp ${record.className}?`}
                        onConfirm={() => handleToggleStatus(record.id, record.status)}
                        okText="Xác nhận"
                        cancelText="Hủy"
                        okButtonProps={{ danger: record.status === 'ACTIVE' }}
                    >
                        <Tooltip title={record.status === 'ACTIVE' ? "Tạm dừng" : "Kích hoạt"}>
                            <Button
                                type="text"
                                danger={record.status === 'ACTIVE'}
                                style={{ 
                                    background: record.status === 'ACTIVE' ? '#FEE2E2' : '#EFF6FF', 
                                    color: record.status === 'ACTIVE' ? '#DC2626' : '#2563EB',
                                    borderRadius: '8px' 
                                }}
                                icon={record.status === 'ACTIVE' ? <LockOutlined /> : <ReloadOutlined />}
                            />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
            width: 150,
        },
    ];

    const studentColumns = [
        {
            title: 'STT',
            key: 'index',
            width: 60,
            render: (_: any, __: any, index: number) => index + 1,
        },
        {
            title: 'Mã HV',
            dataIndex: 'username', // In User schema it is username
            key: 'username',
            width: 120,
            render: (text: string) => <Tag color="blue" style={{ borderRadius: 6, fontWeight: 500, border: 'none', padding: '2px 10px' }}>{text || '-'}</Tag>
        },
        {
            title: 'Họ và tên',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <span style={{ fontWeight: 600, color: '#1E293B' }}>{text}</span>
        },
        {
            title: 'Listening',
            dataIndex: 'estimatedListening',
            key: 'estimatedListening',
            align: 'center' as const,
            render: (val: number) => <Tag color="cyan">{val || 0}</Tag>
        },
        {
            title: 'Reading',
            dataIndex: 'estimatedReading',
            key: 'estimatedReading',
            align: 'center' as const,
            render: (val: number) => <Tag color="purple">{val || 0}</Tag>
        },
        {
            title: 'Tổng điểm',
            dataIndex: 'estimatedScore',
            key: 'estimatedScore',
            align: 'center' as const,
            render: (val: number) => <Tag color="volcano" style={{ fontWeight: 'bold' }}>{val || 0}</Tag>
        }
    ];

    const stats = {
        totalClasses: classes.length,
        totalStudents: classes.reduce((acc, c: any) => acc + (c.studentCount || 0), 0),
        activeTeachers: new Set(classes.map((c: any) => c.teacher?.id).filter(id => id)).size
    };

    return (
        <div style={{ padding: '24px', background: '#F8FAFC', minHeight: '100vh' }}>

            {/* Statistics Cards */}
            <Row gutter={24} style={{ marginBottom: 32 }}>
                {[
                    { title: 'Tổng số lớp', value: stats.totalClasses, icon: <BookOutlined />, color: '#1D4ED8', bg: 'linear-gradient(135deg, #DBEAFE 0%, #EFF6FF 100%)' },
                    { title: 'Tổng học viên', value: stats.totalStudents, icon: <TeamOutlined />, color: '#047857', bg: 'linear-gradient(135deg, #D1FAE5 0%, #ECFDF5 100%)' },
                    { title: 'Giáo viên phụ trách', value: stats.activeTeachers, icon: <UserOutlined />, color: '#B91C1C', bg: 'linear-gradient(135deg, #FEE2E2 0%, #FEF2F2 100%)' },
                ].map((item, index) => (
                    <Col xs={24} sm={12} md={8} key={index}>
                        <Card
                            hoverable
                            style={{
                                borderRadius: 24,
                                border: 'none',
                                background: '#FFFFFF',
                                boxShadow: modernShadow,
                                transition: 'all 0.3s ease'
                            }}
                            bodyStyle={{ padding: '24px' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                                <div style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: 18,
                                    background: item.bg,
                                    color: item.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 28,
                                    boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5)'
                                }}>
                                    {item.icon}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, color: '#64748B', textTransform: 'uppercase', fontSize: 12, letterSpacing: '0.5px', marginBottom: 4 }}>
                                        {item.title}
                                    </div>
                                    <div style={{ color: '#0F172A', fontWeight: 700, fontSize: 28, lineHeight: 1 }}>
                                        {item.value}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Primary Action */}
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-start' }}>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => handleOpenModal()}
                    size="large"
                    style={{
                        borderRadius: 12,
                        fontWeight: 600,
                        height: 48,
                        padding: '0 24px',
                        background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                        border: 'none',
                        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                    }}
                >
                    Thêm lớp học mới
                </Button>
            </div>

            {/* Actions & Filters */}
            <Card
                style={{
                    marginBottom: 24,
                    borderRadius: 20,
                    border: 'none',
                    background: '#FFFFFF',
                    boxShadow: modernShadow
                }}
                bodyStyle={{ padding: '20px 24px' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <Space size="middle" wrap>
                        <Input
                            placeholder="Tìm kiếm theo tên lớp hoặc mã lớp..."
                            prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
                            size="large"
                            onChange={e => setSearchText(e.target.value)}
                            style={{ width: 320, borderRadius: 8 }}
                        />
                        <Button
                            size="large"
                            icon={<ReloadOutlined />}
                            onClick={fetchData}
                            loading={loading}
                            style={{ borderRadius: '10px', color: '#475569', fontWeight: 600 }}
                        >
                            Làm mới
                        </Button>
                    </Space>
                </div>
            </Card>

            {/* Table Area */}
            <Card
                style={{
                    borderRadius: 20,
                    border: 'none',
                    boxShadow: modernShadow,
                    overflow: 'hidden'
                }}
                bodyStyle={{ padding: 0 }}
            >
                <Table
                    columns={columns}
                    dataSource={filteredClasses}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) => <span style={{ fontWeight: 600 }}>Tổng {total} lớp học</span>,
                        style: { padding: '16px 24px', margin: 0 }
                    }}
                    scroll={{ x: 'max-content' }}
                />
            </Card>

            <Modal
                title={
                    <Space style={{ marginBottom: 8 }}>
                        <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: editingClass ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: 18,
                            boxShadow: editingClass ? '0 4px 10px rgba(16, 185, 129, 0.2)' : '0 4px 10px rgba(59, 130, 246, 0.2)'
                        }}>
                            {editingClass ? <EditOutlined /> : <PlusOutlined />}
                        </div>
                        <span style={{ fontSize: 20, color: '#1E293B', fontWeight: 800 }}>{editingClass ? 'Chỉnh sửa lớp học' : 'Thêm lớp học mới'}</span>
                    </Space>
                }
                open={modalVisible}
                onOk={handleSubmit}
                onCancel={() => setModalVisible(false)}
                okText={editingClass ? 'Cập nhật' : 'Tạo mới'}
                cancelText="Hủy"
                centered
                width={850}
                okButtonProps={{
                    style: {
                        borderRadius: 10,
                        background: editingClass ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                        border: 'none',
                        height: 40,
                        padding: '0 24px',
                        fontWeight: 600,
                        boxShadow: editingClass ? '0 4px 14px rgba(16, 185, 129, 0.35)' : '0 4px 14px rgba(59, 130, 246, 0.35)'
                    }
                }}
                cancelButtonProps={{ style: { borderRadius: 10, height: 40 } }}
            >
                <Form
                    form={form}
                    layout="vertical"
                    style={{ marginTop: 24 }}
                >
                    <Row gutter={24}>
                        <Col span={12}>
                            <Form.Item
                                label={<span style={{ fontWeight: 600, color: '#475569' }}>Tên lớp học</span>}
                                name="className"
                                rules={[{ required: true, message: 'Vui lòng nhập tên lớp' }]}
                            >
                                <Input 
                                    placeholder="Ví dụ: TOEIC 650+ Target" 
                                    size="large" 
                                    prefix={<BookOutlined style={{ color: '#94A3B8' }} />}
                                    style={{ borderRadius: 10 }} 
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label={<span style={{ fontWeight: 600, color: '#475569' }}>Giáo viên phụ trách</span>}
                                name="teacherId"
                                rules={[{ required: true, message: 'Vui lòng chọn giáo viên' }]}
                            >
                                <Select 
                                    placeholder="Chọn giáo viên" 
                                    size="large" 
                                    style={{ borderRadius: 10 }}
                                    showSearch
                                    optionFilterProp="label"
                                    filterOption={(input, option) =>
                                        (String(option?.label) ?? '').toLowerCase().includes(input.toLowerCase())
                                    }
                                    options={teachers.map(t => ({
                                        value: t.id,
                                        label: `${t.name} (${t.username || 'N/A'})`
                                    }))}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>

            <Drawer
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span>Học viên lớp: <strong style={{ color: '#2563EB' }}>{selectedClass?.className}</strong></span>
                        <Button
                            type="primary"
                            icon={<DownloadOutlined />}
                            onClick={() => selectedClass && handleExportExcel(selectedClass.id, selectedClass.className)}
                            style={{ background: '#10B981', borderColor: '#10B981', borderRadius: 8, marginRight: 24, height: 40, fontWeight: 600 }}
                        >
                            Xuất báo cáo Excel
                        </Button>
                    </div>
                }
                placement="right"
                width={850}
                onClose={() => setDrawerVisible(false)}
                open={drawerVisible}
                headerStyle={{ borderBottom: '1px solid #F1F5F9' }}
            >
                <Table
                    columns={studentColumns}
                    dataSource={students}
                    rowKey="id"
                    loading={loadingStudents}
                    pagination={false}
                    size="middle"
                />
            </Drawer>
        </div>
    );
};

export default ClassManagement;
