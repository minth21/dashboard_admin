import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import {
    Table,
    Input,
    Select,
    Button,
    Space,
    Avatar,
    Tag,
    Modal,
    Form,
    message,
    Card,
    Row,
    Col,
    Popconfirm,
    Upload,
    DatePicker,
} from 'antd';
import {
    SearchOutlined,
    EditOutlined,
    UserOutlined,
    LockOutlined,
    ReloadOutlined,
    PlusOutlined,
    BookOutlined,
    PhoneOutlined,
    SafetyCertificateOutlined,
    PlusCircleOutlined,
    LoadingOutlined,
    PictureOutlined,
    CalendarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Search } = Input;
const { Option } = Select;
import { userApi, classApi, uploadApi } from '../services/api';
import { useTheme } from '../hooks/useThemeContext';
import { theme } from 'antd';
import type { Class } from '../services/api';

interface User {
    id: string;
    username: string;
    name: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    avatarUrl?: string;
    role: 'STUDENT' | 'TEACHER' | 'SPECIALIST' | 'ADMIN';
    authProvider?: 'LOCAL' | 'GOOGLE';
    estimatedListening?: number;
    estimatedReading?: number;
    estimatedScore?: number;
    status: 'ACTIVE' | 'LOCKED';
    createdAt: string;
    updatedAt: string;
}

export default function UserManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('ALL');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [form] = Form.useForm();
    const [createForm] = Form.useForm();
    const [avatarLoading, setAvatarLoading] = useState(false);

    // Statistics
    const [stats, setStats] = useState({
        total: 0,
        students: 0,
        staff: 0,
    });

    const { theme: currentTheme } = useTheme();
    const isDark = currentTheme === 'dark';
    const { token } = theme.useToken();

    // Cấu hình bóng đổ hiện đại
    const modernShadow = isDark 
        ? '0 10px 30px -5px rgba(0, 0, 0, 0.5), 0 4px 10px -6px rgba(0, 0, 0, 0.3)'
        : '0 10px 30px -5px rgba(37, 99, 235, 0.08), 0 4px 10px -6px rgba(37, 99, 235, 0.04)';

    // Fetch users từ API
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await userApi.list(page, pageSize, roleFilter, searchText);

            if (data.success) {
                setUsers(data.users);
                setTotal(data.pagination.total);

                setStats({
                    total: data.pagination.total,
                    students: data.users.filter((u: User) => u.role === 'STUDENT').length,
                    staff: data.users.filter((u: User) => u.role !== 'STUDENT').length,
                });
            }

            const classData = await classApi.list();
            if (classData.success) {
                setClasses(classData.data);
            }
        } catch (error) {
            console.error('Error fetching users or classes:', error);
        } finally {
            setLoading(false);
        }
    };

    // Handler upload avatar chuyên nghiệp
    const handleAvatarUpload = async (file: File, formInstance: any) => {
        setAvatarLoading(true);
        try {
            const res = await uploadApi.image(file);
            if (res.success) {
                formInstance.setFieldsValue({ avatarUrl: res.url });
                message.success('Tải ảnh lên thành công!');
            } else {
                message.error(res.message || 'Lỗi khi tải ảnh');
            }
        } catch (error) {
            message.error('Có lỗi xảy ra khi tải ảnh');
        } finally {
            setAvatarLoading(false);
        }
        return false; // Chặn upload mặc định của AntD
    };

    useEffect(() => {
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, pageSize, roleFilter, searchText]);

    // Xử lý search
    const handleSearch = (value: string) => {
        setSearchText(value);
        setPage(1); // Reset về trang 1 khi search
    };

    // Mở modal edit
    const handleEdit = (user: User) => {
        setEditingUser(user);
        form.setFieldsValue({
            name: user.name,
            username: user.username,
            phoneNumber: user.phoneNumber,
            dateOfBirth: user.dateOfBirth ? dayjs(user.dateOfBirth) : null,
            gender: user.gender,
            avatarUrl: user.avatarUrl,
            role: user.role,
        });
        setEditModalVisible(true);
    };

    // Submit edit form
    const handleEditSubmit = async (values: any) => {
        if (!editingUser) return;

        try {
            // Sanitize avatarUrl: ensure it's a string, not the AntD Upload object
            const submitValues = { ...values };
            if (typeof submitValues.avatarUrl === 'object' && submitValues.avatarUrl !== null) {
                submitValues.avatarUrl = form.getFieldValue('avatarUrl');
                if (typeof submitValues.avatarUrl !== 'string') {
                    submitValues.avatarUrl = editingUser.avatarUrl;
                }
            }

            const data = await userApi.update(editingUser.id, submitValues);

            if (data.success) {
                message.success('Cập nhật user thành công!');
                setEditModalVisible(false);
                setSearchText(''); // Clear search to see the update
                setPage(1); // Back to page 1
                fetchUsers(); // Refresh data
            } else {
                message.error(data.message || 'Cập nhật thất bại');
            }
        } catch (error) {
            console.error('Error updating user:', error);
            message.error('Có lỗi xảy ra khi cập nhật');
        }
    };


    // Mở modal tạo user
    const handleOpenCreateModal = () => {
        createForm.resetFields();
        setCreateModalVisible(true);
    };

    const handleCreateSubmit = async (values: any) => {
        try {
            // Sanitize avatarUrl: ensure it's a string, not the AntD Upload object
            const submitValues = { ...values };
            if (typeof submitValues.avatarUrl === 'object' && submitValues.avatarUrl !== null) {
                submitValues.avatarUrl = createForm.getFieldValue('avatarUrl');
                if (typeof submitValues.avatarUrl !== 'string') {
                    submitValues.avatarUrl = undefined;
                }
            }

            let data;
            const autoRoles = ['STUDENT', 'TEACHER', 'SPECIALIST'];
            if (autoRoles.includes(submitValues.role)) {
                data = await userApi.createUserAuto(submitValues);
            } else {
                data = await userApi.create(submitValues);
            }

            if (data.success) {
                if (autoRoles.includes(values.role) && (data as any).data) {
                    const accountData = (data as any).data;
                    const roleLabel = values.role === 'STUDENT' ? 'Học viên' : (values.role === 'TEACHER' ? 'Giáo viên' : 'Chuyên viên');
                    Modal.success({
                        title: `Tạo ${roleLabel} thành công!`,
                        content: (
                            <div style={{ padding: '10px 0' }}>
                                <div style={{ marginBottom: 12, padding: '12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                                    <p style={{ margin: 0, color: '#64748B', fontSize: 13 }}>Mã đăng nhập (Username):</p>
                                    <p style={{ margin: 0, color: '#1E293B', fontSize: 18, fontWeight: 800 }}>{accountData.user.username}</p>
                                </div>
                                <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                                    <p style={{ margin: 0, color: '#64748B', fontSize: 13 }}>Mật khẩu mặc định:</p>
                                    <p style={{ margin: 0, color: '#1E293B', fontSize: 18, fontWeight: 800 }}>{accountData.defaultPassword}</p>
                                </div>
                                <p style={{ marginTop: 16, color: '#EF4444', fontSize: 13, fontStyle: 'italic' }}>
                                    * Vui lòng gửi thông tin này cho {roleLabel.toLowerCase()} để đăng nhập.
                                </p>
                            </div>
                        ),
                        onOk: () => {
                            setCreateModalVisible(false);
                            setSearchText(''); // Clear search
                            setPage(1); // Reset about to page 1 for new user
                            fetchUsers();
                        },
                        width: 450,
                        centered: true,
                        okButtonProps: { style: { borderRadius: 8, height: 40, fontWeight: 600 } }
                    });
                } else {
                    message.success('Tạo user thành công!');
                    setCreateModalVisible(false);
                    setSearchText(''); // Clear search
                    setPage(1); // Jump to page 1
                    fetchUsers(); // Refresh data
                }
            } else {
                message.error(data.message || 'Tạo user thất bại');
            }
        } catch (error: any) {
            console.error('Error creating user:', error);
            const errorMessage = error.response?.data?.message || 'Có lỗi xảy ra khi tạo user';
            message.error(errorMessage);
        }
    };

    // Khóa/Mở khóa tài khoản
    const handleLockAccount = async (userId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
        try {
            const data = await userApi.toggleStatus(userId, newStatus as any);
            if (data.success) {
                message.success(data.message);
                fetchUsers();
            } else {
                message.error(data.message || 'Cập nhật thất bại');
            }
        } catch (error) {
            console.error('Error locking account:', error);
            message.error('Có lỗi xảy ra khi cập nhật trạng thái tài khoản');
        }
    };

    // Định nghĩa columns cho table
    const columns: ColumnsType<User> = [
        {
            title: 'Avatar',
            dataIndex: 'avatarUrl',
            key: 'avatar',
            width: 80,
            align: 'center' as const,
            render: (avatarUrl: string) => (
                <Avatar
                    src={
                        avatarUrl
                            ? avatarUrl.startsWith('http')
                                ? avatarUrl // Cloudinary URL - use directly
                                : `http://localhost:3000${avatarUrl}` // Local URL - prepend backend
                            : undefined
                    }
                    icon={<UserOutlined />}
                    size={40}
                />
            ),
        },
        {
            title: 'Mã người dùng',
            dataIndex: 'username',
            key: 'username',
            width: 120,
            align: 'center' as const,
            render: (code: string) => code ? (
                <Tag color="cyan" style={{ fontWeight: 500, borderRadius: 4, padding: '2px 8px' }}>
                    {code}
                </Tag>
            ) : <span style={{ color: '#94A3B8' }}>-</span>,
        },
        {
            title: 'Họ và tên',
            dataIndex: 'name',
            key: 'name',
            align: 'left' as const,
            sorter: (a, b) => a.name.localeCompare(b.name),
            render: (name: string) => <span style={{ fontWeight: 500, color: token.colorText }}>{name}</span>,
        },

        {
            title: 'Giới tính',
            dataIndex: 'gender',
            key: 'gender',
            width: 100,
            align: 'center' as const,
            render: (gender: string) => {
                if (gender === 'MALE') return <Tag color="blue">Nam</Tag>;
                if (gender === 'FEMALE') return <Tag color="pink">Nữ</Tag>;
                if (gender === 'OTHER') return <Tag color="purple">Khác</Tag>;
                return <span style={{ color: '#94A3B8' }}>-</span>;
            }
        },
        {
            title: 'Ngày sinh',
            dataIndex: 'dateOfBirth',
            key: 'dateOfBirth',
            width: 120,
            align: 'center' as const,
            render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY') : <span style={{ color: '#94A3B8' }}>-</span>,
        },
        {
            title: 'Vai trò',
            dataIndex: 'role',
            key: 'role',
            width: 120,
            align: 'center' as const,
            render: (role: string) => {
                const roleConfig: { [key: string]: { color: string; label: string } } = {
                    ADMIN: { color: '#2563EB', label: 'Admin' },
                    SPECIALIST: { color: '#8B5CF6', label: 'Chuyên viên' },
                    TEACHER: { color: '#F59E0B', label: 'Giáo viên' },
                    STUDENT: { color: '#10B981', label: 'Học viên' },
                };
                const config = roleConfig[role] || { color: 'default', label: role };
                return <Tag color={config.color} style={{ borderRadius: 6, fontWeight: 500, border: 'none', padding: '4px 10px' }}>{config.label}</Tag>;
            },
        },
        {
            title: 'Điểm TB',
            dataIndex: 'averageScore',
            key: 'averageScore',
            width: 100,
            align: 'center' as const,
            render: (score: number, record: User) => record.role === 'STUDENT' ? (
                <Tag color="volcano" style={{ fontWeight: 700 }}>{score || 0}</Tag>
            ) : <span style={{ color: '#94A3B8' }}>-</span>,
        },
        {
            title: 'Số bài làm',
            dataIndex: 'totalAttempts',
            key: 'totalAttempts',
            width: 110,
            align: 'center' as const,
            render: (count: number, record: User) => record.role === 'STUDENT' ? (
                <Tag color="blue" style={{ borderRadius: 4 }}>{count || 0}</Tag>
            ) : <span style={{ color: '#94A3B8' }}>-</span>,
        },

        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 120,
            align: 'center' as const,
            render: (date: string) => new Date(date).toLocaleDateString('vi-VN'),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            align: 'center' as const,
            render: (status: string) => (
                <Tag color={status === 'ACTIVE' ? 'success' : 'error'} style={{ borderRadius: 6, fontWeight: 500 }}>
                    {status === 'ACTIVE' ? 'Đang hoạt động' : 'Bị khóa'}
                </Tag>
            ),
        },
        {
            title: 'Hành động',
            key: 'actions',
            width: 120,
            align: 'center' as const,
            render: (_, record) => (
                <Space>
                    <Button
                        type="text"
                        style={{ color: '#059669', background: '#D1FAE5', borderRadius: '8px' }}
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    />
                    <Popconfirm
                        title={record.status === 'ACTIVE' ? "Khóa tài khoản?" : "Mở khóa tài khoản?"}
                        description={`Bạn có chắc muốn ${record.status === 'ACTIVE' ? 'khóa' : 'mở khóa'} tài khoản ${record.name}?`}
                        onConfirm={() => handleLockAccount(record.id, record.status)}
                        okText="Đồng ý"
                        cancelText="Hủy"
                        okButtonProps={{ danger: record.status === 'ACTIVE' }}
                    >
                        <Button
                            type="text"
                            danger={record.status === 'ACTIVE'}
                            style={{ 
                                background: record.status === 'ACTIVE' ? '#FEE2E2' : '#DBEAFE', 
                                color: record.status === 'ACTIVE' ? '#DC2626' : '#2563EB',
                                borderRadius: '8px' 
                            }}
                            icon={<LockOutlined />}
                        />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px', background: token.colorBgLayout, minHeight: '100vh' }}>


            {/* Statistics Cards */}
            <Row gutter={24} style={{ marginBottom: 32 }}>
                {[
                    { title: 'Tổng người dùng', value: stats.total, icon: <UserOutlined />, color: '#1D4ED8', bg: 'linear-gradient(135deg, #DBEAFE 0%, #EFF6FF 100%)' },
                    { title: 'Học viên', value: stats.students, icon: <BookOutlined />, color: '#047857', bg: 'linear-gradient(135deg, #D1FAE5 0%, #ECFDF5 100%)' },
                    { title: 'Đội ngũ quản trị', value: stats.staff, icon: <LockOutlined />, color: '#B91C1C', bg: 'linear-gradient(135deg, #FEE2E2 0%, #FEF2F2 100%)' },
                ].map((item, index) => (
                    <Col xs={24} sm={12} md={8} key={index}>
                        <Card
                            hoverable
                            style={{
                                borderRadius: 24,
                                border: `1px solid ${token.colorBorder}`,
                                background: token.colorBgContainer,
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
                                    <div style={{ color: token.colorText, fontWeight: 700, fontSize: 28, lineHeight: 1 }}>
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
                    onClick={handleOpenCreateModal}
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
                    Thêm người dùng mới
                </Button>
            </div>

            {/* Actions & Filters */}
            <Card
                style={{
                    marginBottom: 24,
                    borderRadius: 20,
                    border: `1px solid ${token.colorBorder}`,
                    background: token.colorBgContainer,
                    boxShadow: modernShadow
                }}
                bodyStyle={{ padding: '20px 24px' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <Space size="middle" wrap>
                        <Search
                            placeholder="Tìm theo tên hoặc mã người dùng"
                            allowClear
                            onSearch={handleSearch}
                            style={{ width: 320 }}
                            size="large"
                            prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
                        />
                        <Select
                            size="large"
                            value={roleFilter}
                            onChange={(value) => {
                                setRoleFilter(value);
                                setPage(1);
                            }}
                            style={{ width: 180 }}
                        >
                            <Option value="ALL">Tất cả vai trò</Option>
                            <Option value="ADMIN">Admin</Option>
                            <Option value="SPECIALIST">Chuyên viên</Option>
                            <Option value="TEACHER">Giáo viên</Option>
                            <Option value="STUDENT">Học viên</Option>
                        </Select>
                        <Button
                            size="large"
                            icon={<ReloadOutlined />}
                            onClick={fetchUsers}
                            loading={loading}
                            style={{ borderRadius: '10px', color: '#475569', fontWeight: 600 }}
                        >
                            Làm mới
                        </Button>
                    </Space>
                </div>
            </Card>

            {/* Table */}
            <Card
                style={{
                    borderRadius: 20,
                    border: `1px solid ${token.colorBorder}`,
                    boxShadow: modernShadow,
                    overflow: 'hidden'
                }}
                bodyStyle={{ padding: 0 }}
            >
                <Table
                    columns={columns}
                    dataSource={users}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        current: page,
                        pageSize: pageSize,
                        total: total,
                        showSizeChanger: true,
                        showTotal: (total) => <span style={{ fontWeight: 600 }}>Tổng {total} người dùng</span>,
                        onChange: (page, pageSize) => {
                            setPage(page);
                            setPageSize(pageSize);
                        },
                        style: { padding: '16px 24px', margin: 0 }
                    }}
                    scroll={{ x: 'max-content' }}
                />
            </Card>

            {/* Edit Modal */}
            <Modal
                title={
                    <Space style={{ marginBottom: 8 }}>
                        <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: 18,
                            boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)'
                        }}>
                            <PictureOutlined />
                        </div>
                        <span style={{ fontSize: 20, color: '#1E293B', fontWeight: 800 }}>Chỉnh sửa người dùng</span>
                    </Space>
                }
                open={editModalVisible}
                onCancel={() => setEditModalVisible(false)}
                onOk={() => form.submit()}
                okText="Lưu thay đổi"
                cancelText="Hủy"
                width={850}
                centered
                okButtonProps={{
                    style: {
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        border: 'none',
                        height: 40,
                        padding: '0 24px',
                        fontWeight: 600,
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                    }
                }}
                cancelButtonProps={{ style: { borderRadius: 10, height: 40 } }}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleEditSubmit}
                    style={{ marginTop: 24 }}
                >
                    {/* Avatar Upload Selection */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
                        <Form.Item 
                            name="avatarUrl" 
                            noStyle
                            getValueFromEvent={(e: any) => {
                                // If it's a string (URL), return it. Otherwise, keep current form value.
                                if (typeof e === 'string') return e;
                                return form.getFieldValue('avatarUrl');
                            }}
                        >
                            <Upload
                                name="avatar"
                                listType="picture-circle"
                                className="avatar-uploader"
                                showUploadList={false}
                                beforeUpload={(file) => handleAvatarUpload(file, form)}
                                style={{
                                    width: 120,
                                    height: 120,
                                    overflow: 'hidden',
                                    borderRadius: '50%',
                                    border: '2px dashed #CBD5E1',
                                    background: '#F8FAFC',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                {form.getFieldValue('avatarUrl') ? (
                                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                        <img 
                                            src={form.getFieldValue('avatarUrl').startsWith('http') ? form.getFieldValue('avatarUrl') : `http://localhost:3000${form.getFieldValue('avatarUrl')}`} 
                                            alt="avatar" 
                                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                                        />
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            right: 0,
                                            background: '#3B82F6',
                                            borderRadius: '50%',
                                            width: 32,
                                            height: 32,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            border: '3px solid #fff'
                                        }}>
                                            <EditOutlined style={{ fontSize: 14 }} />
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center' }}>
                                        {avatarLoading ? <LoadingOutlined /> : <PlusOutlined />}
                                        <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: '#64748B' }}>
                                            {avatarLoading ? 'Đang tải...' : 'Ảnh đại diện'}
                                        </div>
                                    </div>
                                )}
                            </Upload>
                        </Form.Item>
                    </div>

                    <Row gutter={24}>
                        <Col span={12}>
                            <Form.Item
                                label={<span style={{ fontWeight: 600, color: '#475569' }}>Tên người dùng</span>}
                                name="name"
                                rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
                            >
                                <Input
                                    size="large"
                                    prefix={<UserOutlined style={{ color: '#94A3B8' }} />}
                                    style={{ borderRadius: 10 }}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label={<span style={{ fontWeight: 600, color: '#475569' }}>Mã người dùng (Username)</span>}
                                name="username"
                            >
                                <Input
                                    size="large"
                                    disabled
                                    prefix={<SafetyCertificateOutlined style={{ color: '#94A3B8' }} />}
                                    style={{ borderRadius: 10, backgroundColor: '#F8FAFC' }}
                                />
                            </Form.Item>
                        </Col>
                    </Row>


                    <Row gutter={24}>
                        <Col span={12}>
                            <Form.Item
                                label={<span style={{ fontWeight: 600, color: '#475569' }}>Số điện thoại</span>}
                                name="phoneNumber"
                            >
                                <Input
                                    size="large"
                                    prefix={<PhoneOutlined style={{ color: '#94A3B8' }} />}
                                    style={{ borderRadius: 10 }}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label={<span style={{ fontWeight: 600, color: '#475569' }}>Ngày tháng năm sinh</span>}
                                name="dateOfBirth"
                            >
                                <DatePicker
                                    size="large"
                                    format="DD/MM/YYYY"
                                    placeholder="Chọn ngày sinh"
                                    suffixIcon={<CalendarOutlined style={{ color: '#94A3B8' }} />}
                                    style={{ borderRadius: 10, width: '100%' }}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={24}>
                        <Col span={12}>
                            <Form.Item
                                label={<span style={{ fontWeight: 600, color: '#475569' }}>Giới tính</span>}
                                name="gender"
                            >
                                <Select
                                    size="large"
                                    style={{ borderRadius: 10 }}
                                    allowClear
                                    placeholder="Chọn giới tính"
                                    suffixIcon={<UserOutlined style={{ color: '#94A3B8' }} />}
                                >
                                    <Option value="MALE">Nam</Option>
                                    <Option value="FEMALE">Nữ</Option>
                                    <Option value="OTHER">Khác</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={24}>
                        <Col span={24}>
                            <Form.Item
                                label={<span style={{ fontWeight: 600, color: '#475569' }}>Vai trò hệ thống</span>}
                                name="role"
                                rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
                            >
                                <Select
                                    size="large"
                                    style={{ borderRadius: 10 }}
                                    suffixIcon={<SafetyCertificateOutlined style={{ color: '#94A3B8' }} />}
                                >
                                    <Option value="ADMIN">Admin</Option>
                                    <Option value="SPECIALIST">Chuyên viên</Option>
                                    <Option value="TEACHER">Giáo viên</Option>
                                    <Option value="STUDENT">Học viên</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>

            {/* Create User Modal */}
            <Modal
                title={
                    <Space style={{ marginBottom: 8 }}>
                        <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: 18,
                            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)'
                        }}>
                            <PlusCircleOutlined />
                        </div>
                        <span style={{ fontSize: 20, color: '#1E293B', fontWeight: 800 }}>Thêm người dùng mới</span>
                    </Space>
                }
                open={createModalVisible}
                onCancel={() => setCreateModalVisible(false)}
                onOk={() => createForm.submit()}
                okText="Tạo tài khoản"
                cancelText="Hủy"
                width={850}
                centered
                okButtonProps={{
                    style: {
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                        border: 'none',
                        height: 40,
                        padding: '0 24px',
                        fontWeight: 600,
                        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
                    }
                }}
                cancelButtonProps={{ style: { borderRadius: 10, height: 40 } }}
            >
                <Form
                    form={createForm}
                    layout="vertical"
                    onFinish={handleCreateSubmit}
                    style={{ marginTop: 24 }}
                >
                    <Row gutter={24} style={{ marginBottom: 24 }}>
                        <Col span={24}>
                            <Form.Item
                                label={<span style={{ fontWeight: 600, color: '#475569' }}>Vai trò hệ thống</span>}
                                name="role"
                                rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
                            >
                                <Select
                                    size="large"
                                    style={{ borderRadius: 10, width: '100%' }}
                                    suffixIcon={<SafetyCertificateOutlined style={{ color: '#94A3B8' }} />}
                                >
                                    <Option value="STUDENT">Học viên</Option>
                                    <Option value="TEACHER">Giáo viên</Option>
                                    <Option value="SPECIALIST">Chuyên viên</Option>
                                    <Option value="ADMIN">Admin</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        noStyle
                        shouldUpdate={(prevValues, currentValues) => prevValues.role !== currentValues.role}
                    >
                        {({ getFieldValue }) => {
                            const role = getFieldValue('role');
                            if (!role) return null;

                            const isAutoRole = ['STUDENT', 'TEACHER', 'SPECIALIST'].includes(role);

                            return (
                                <>
                                    <Row gutter={24}>
                                        <Col span={12}>
                                            <Form.Item
                                                label={<span style={{ fontWeight: 600, color: '#475569' }}>Tên người dùng</span>}
                                                name="name"
                                                rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
                                            >
                                                <Input
                                                    size="large"
                                                    placeholder="Nguyễn Văn A"
                                                    prefix={<UserOutlined style={{ color: '#94A3B8' }} />}
                                                    style={{ borderRadius: 10 }}
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <Row gutter={24}>
                                        {!isAutoRole ? (
                                            <>
                                                <Col span={12}>
                                                    <Form.Item
                                                        label={<span style={{ fontWeight: 600, color: '#475569' }}>Mã người dùng (Username)</span>}
                                                        name="username"
                                                        rules={[{ required: true, message: 'Vui lòng nhập mã định danh' }]}
                                                    >
                                                        <Input
                                                            size="large"
                                                            placeholder="Vd: ADMIN_NAM"
                                                            prefix={<SafetyCertificateOutlined style={{ color: '#94A3B8' }} />}
                                                            style={{ borderRadius: 10 }}
                                                        />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={12}>
                                                    <Form.Item
                                                        label={<span style={{ fontWeight: 600, color: '#475569' }}>Mật khẩu đăng nhập</span>}
                                                        name="password"
                                                        rules={[
                                                            { required: true, message: 'Vui lòng nhập mật khẩu' },
                                                            { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự' },
                                                        ]}
                                                    >
                                                        <Input.Password
                                                            size="large"
                                                            placeholder="••••••••"
                                                            prefix={<LockOutlined style={{ color: '#94A3B8' }} />}
                                                            style={{ borderRadius: 10 }}
                                                        />
                                                    </Form.Item>
                                                </Col>
                                            </>
                                        ) : (
                                            <Col span={12}>
                                                <div style={{
                                                    padding: '12px 16px',
                                                    background: '#F0F9FF',
                                                    borderRadius: 10,
                                                    border: '1px dashed #0EA5E9',
                                                    color: '#0369A1',
                                                    fontSize: 13,
                                                    height: '82px',
                                                    display: 'flex',
                                                    alignItems: 'center'
                                                }}>
                                                    <LockOutlined style={{ marginRight: 8 }} />
                                                    <span>Mật khẩu sẽ được hệ thống tự sinh là <b>toeic2026</b></span>
                                                </div>
                                            </Col>
                                        )}
                                        <Col span={12}>
                                            <Form.Item
                                                label={<span style={{ fontWeight: 600, color: '#475569' }}>Số điện thoại</span>}
                                                name="phoneNumber"
                                            >
                                                <Input
                                                    size="large"
                                                    placeholder="09xx xxx xxx"
                                                    prefix={<PhoneOutlined style={{ color: '#94A3B8' }} />}
                                                    style={{ borderRadius: 10 }}
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    {role === 'STUDENT' && (
                                        <Row gutter={24}>
                                            <Col span={24}>
                                                <Form.Item
                                                    label={<span style={{ fontWeight: 600, color: '#475569' }}>Phân công Lớp học</span>}
                                                    name="studentClassId"
                                                >
                                                    <Select
                                                        size="large"
                                                        placeholder="Chọn lớp (tùy chọn)..."
                                                        suffixIcon={<BookOutlined style={{ color: '#94A3B8' }} />}
                                                        style={{ borderRadius: 10 }}
                                                        showSearch
                                                        optionFilterProp="children"
                                                        allowClear
                                                    >
                                                        {classes.map(c => (
                                                            <Option key={c.id} value={c.id}>
                                                                {c.className} {c.classCode ? `(${c.classCode})` : ''} - Sĩ số: {c.studentCount || 0}
                                                            </Option>
                                                        ))}
                                                    </Select>
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                    )}

                                    <Row gutter={24}>
                                        <Col span={12}>
                                            <Form.Item
                                                label={<span style={{ fontWeight: 600, color: '#475569' }}>Giới tính</span>}
                                                name="gender"
                                            >
                                                <Select
                                                    size="large"
                                                    style={{ borderRadius: 10 }}
                                                    allowClear
                                                    placeholder="Chọn giới tính"
                                                    suffixIcon={<UserOutlined style={{ color: '#94A3B8' }} />}
                                                >
                                                    <Option value="MALE">Nam</Option>
                                                    <Option value="FEMALE">Nữ</Option>
                                                    <Option value="OTHER">Khác</Option>
                                                </Select>
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item
                                                label={<span style={{ fontWeight: 600, color: '#475569' }}>Ngày tháng năm sinh</span>}
                                                name="dateOfBirth"
                                            >
                                                <DatePicker
                                                    size="large"
                                                    format="DD/MM/YYYY"
                                                    placeholder="Chọn ngày sinh"
                                                    suffixIcon={<CalendarOutlined style={{ color: '#94A3B8' }} />}
                                                    style={{ borderRadius: 10, width: '100%' }}
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                </>
                            );
                        }}
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}