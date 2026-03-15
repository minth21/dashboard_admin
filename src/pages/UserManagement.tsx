import { useState, useEffect } from 'react';
import {
    Table,
    Input,
    InputNumber,
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
} from 'antd';
import {
    SearchOutlined,
    EditOutlined,
    UserOutlined,
    LockOutlined,
    ReloadOutlined,
    PlusOutlined,
    BookOutlined,
    MailOutlined,
    PhoneOutlined,
    SafetyCertificateOutlined,
    IdcardOutlined,
    PlusCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Search } = Input;
const { Option } = Select;
import { userApi } from '../services/api';

interface User {
    id: string;
    email: string;
    name: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    avatarUrl?: string;
    role: 'STUDENT' | 'ADMIN' | 'SPECIALIST';
    progress: number;
    targetScore?: number;
    createdAt: string;
    updatedAt: string;
}

export default function UserManagement() {
    const [users, setUsers] = useState<User[]>([]);
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

    // Statistics
    const [stats, setStats] = useState({
        total: 0,
        students: 0,
        staff: 0,
    });

    // Cấu hình bóng đổ hiện đại
    const modernShadow = '0 10px 30px -5px rgba(37, 99, 235, 0.08), 0 4px 10px -6px rgba(37, 99, 235, 0.04)';

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
            } else {
                message.error('Không thể tải danh sách người dùng');
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            message.error('Có lỗi xảy ra khi tải dữ liệu');
        } finally {
            setLoading(false);
        }
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
            email: user.email,
            phoneNumber: user.phoneNumber,
            gender: user.gender,
            avatarUrl: user.avatarUrl,
            role: user.role,
            progress: user.progress,
        });
        setEditModalVisible(true);
    };

    // Submit edit form
    const handleEditSubmit = async (values: any) => {
        if (!editingUser) return;

        try {
            const data = await userApi.update(editingUser.id, values);

            if (data.success) {
                message.success('Cập nhật user thành công!');
                setEditModalVisible(false);
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
        createForm.setFieldsValue({ role: 'STUDENT' }); // Set default role to STUDENT
        setCreateModalVisible(true);
    };

    // Submit create form
    const handleCreateSubmit = async (values: any) => {
        try {
            const data = await userApi.create(values);

            if (data.success) {
                message.success('Tạo user thành công!');
                setCreateModalVisible(false);
                fetchUsers(); // Refresh data
            } else {
                message.error(data.message || 'Tạo user thất bại');
            }
        } catch (error) {
            console.error('Error creating user:', error);
            message.error('Có lỗi xảy ra khi tạo user');
        }
    };

    // Khóa/Mở khóa tài khoản
    const handleLockAccount = async (_userId: string, userName: string) => {
        try {
            // TODO: Implement lock/unlock API
            message.info(`Chức năng khóa tài khoản "${userName}" sẽ được triển khai sau`);

            // const response = await api.patch(`/users/${userId}/lock`);
            // const data = response.data;

            // if (data.success) {
            //     message.success('Cập nhật trạng thái tài khoản thành công!');
            //     fetchUsers();
            // } else {
            //     message.error(data.message || 'Cập nhật thất bại');
            // }
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
            title: 'Tên',
            dataIndex: 'name',
            key: 'name',
            align: 'center' as const,
            sorter: (a, b) => a.name.localeCompare(b.name),
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            align: 'center' as const,
        },
        {
            title: 'Số điện thoại',
            dataIndex: 'phoneNumber',
            key: 'phoneNumber',
            width: 130,
            align: 'center' as const,
            render: (phone: string) => phone || '-',
        },
        {
            title: 'Giới tính',
            dataIndex: 'gender',
            key: 'gender',
            width: 100,
            align: 'center' as const,
            render: (gender: string) => {
                if (!gender) return '-';
                const genderMap: { [key: string]: string } = {
                    MALE: 'Nam',
                    FEMALE: 'Nữ',
                    OTHER: 'Khác',
                };
                return genderMap[gender] || gender;
            },
        },
        {
            title: 'Ngày sinh',
            dataIndex: 'dateOfBirth',
            key: 'dateOfBirth',
            width: 120,
            align: 'center' as const,
            render: (date: string) => date ? new Date(date).toLocaleDateString('vi-VN') : '-',
        },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            width: 100,
            align: 'center' as const,
            render: (role: string) => {
                const roleConfig: { [key: string]: { color: string; label: string } } = {
                    ADMIN: { color: '#2563EB', label: 'Quản trị viên' },
                    SPECIALIST: { color: '#8B5CF6', label: 'Chuyên viên' },
                    STUDENT: { color: '#10B981', label: 'Học viên' },
                };
                const config = roleConfig[role] || { color: 'default', label: role };
                return <Tag color={config.color} style={{ borderRadius: 6, fontWeight: 600, border: 'none', padding: '2px 10px' }}>{config.label}</Tag>;
            },
        },
        {
            title: 'Tiến độ AI (%)',
            dataIndex: 'progress',
            key: 'progress',
            width: 120,
            align: 'center' as const,
            render: (progress: number) => <Tag color="blue">{progress}%</Tag>,
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
                    <Button
                        type="text"
                        danger
                        style={{ background: '#FEE2E2', borderRadius: '8px' }}
                        icon={<LockOutlined />}
                        onClick={() => handleLockAccount(record.id, record.name)}
                    />
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px', background: '#F8FAFC', minHeight: '100vh' }}>
            
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#1E293B' }}>Quản lý người dùng</h1>
                <p style={{ margin: 0, color: '#64748B', fontSize: 15 }}>Theo dõi và quản lý tài khoản người dùng trên hệ thống.</p>
            </div>

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
                                    <div style={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.5px', marginBottom: 4 }}>
                                        {item.title}
                                    </div>
                                    <div style={{ color: '#0F172A', fontWeight: 800, fontSize: 32, lineHeight: 1 }}>
                                        {item.value}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

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
                        <Search
                            placeholder="Tìm theo tên hoặc email"
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
                            <Option value="ADMIN">Quản trị viên</Option>
                            <Option value="SPECIALIST">Chuyên viên</Option>
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

                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleOpenCreateModal}
                        size="large"
                        style={{
                            borderRadius: 12,
                            fontWeight: 700,
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
            </Card>

            {/* Table */}
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
                title={<div style={{ fontSize: 20, color: '#1E293B', fontWeight: 700 }}>Chỉnh sửa người dùng</div>}
                open={editModalVisible}
                onCancel={() => setEditModalVisible(false)}
                onOk={() => form.submit()}
                okText="Lưu thay đổi"
                cancelText="Hủy"
                width={700}
                centered
                okButtonProps={{ style: { borderRadius: 8, background: '#2563EB' } }}
                cancelButtonProps={{ style: { borderRadius: 8 } }}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleEditSubmit}
                    style={{ marginTop: 24 }}
                >
                    <Form.Item
                        label={<span style={{ fontWeight: 600 }}>Tên</span>}
                        name="name"
                        rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
                    >
                        <Input size="large" style={{ borderRadius: 8 }} />
                    </Form.Item>

                    <Form.Item
                        label={<span style={{ fontWeight: 600 }}>Email</span>}
                        name="email"
                        rules={[
                            { required: true, message: 'Vui lòng nhập email' },
                            { type: 'email', message: 'Email không hợp lệ' },
                        ]}
                    >
                        <Input size="large" style={{ borderRadius: 8 }} />
                    </Form.Item>

                    <Form.Item label={<span style={{ fontWeight: 600 }}>Số điện thoại</span>} name="phoneNumber">
                        <Input size="large" style={{ borderRadius: 8 }} />
                    </Form.Item>

                    <Form.Item
                        label={<span style={{ fontWeight: 600 }}>Avatar URL</span>}
                        name="avatarUrl"
                        help="Nhập URL ảnh đại diện (Cloudinary hoặc URL khác)"
                    >
                        <Input size="large" style={{ borderRadius: 8 }} placeholder="https://res.cloudinary.com/..." />
                    </Form.Item>

                    <Form.Item label={<span style={{ fontWeight: 600 }}>Giới tính</span>} name="gender">
                        <Select size="large" style={{ borderRadius: 8 }} allowClear placeholder="Chọn giới tính">
                            <Option value="MALE">Nam</Option>
                            <Option value="FEMALE">Nữ</Option>
                            <Option value="OTHER">Khác</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        label={<span style={{ fontWeight: 600 }}>Role</span>}
                        name="role"
                        rules={[{ required: true, message: 'Vui lòng chọn role' }]}
                    >
                        <Select size="large" style={{ borderRadius: 8 }}>
                            <Option value="ADMIN">Quản trị viên</Option>
                            <Option value="SPECIALIST">Chuyên viên</Option>
                            <Option value="STUDENT">Học viên</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.role !== currentValues.role}>
                        {({ getFieldValue }) => {
                            const role = getFieldValue('role');
                            // Only show TOEIC fields for STUDENT
                            if (role !== 'STUDENT') return null;

                            return (
                                <>
                                    <Form.Item label={<span style={{ fontWeight: 600 }}>Tiến độ (%)</span>} name="progress">
                                        <Select size="large" style={{ borderRadius: 8 }} allowClear placeholder="Chọn mức độ">
                                            <Option value="A1">A1 - Beginner (120-220)</Option>
                                            <Option value="A2">A2 - Elementary (225-545)</Option>
                                            <Option value="B1">B1 - Intermediate (550-780)</Option>
                                            <Option value="B2">B2 - Upper Intermediate (785-940)</Option>
                                            <Option value="C1">C1 - Advanced (945-990)</Option>
                                        </Select>
                                    </Form.Item>

                                    <Form.Item label={<span style={{ fontWeight: 600 }}>Target Score</span>} name="targetScore">
                                        <InputNumber size="large" min={0} max={990} style={{ width: '100%', borderRadius: 8 }} />
                                    </Form.Item>
                                </>
                            );
                        }}
                    </Form.Item>
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
                        <Col span={12}>
                            <Form.Item
                                label={<span style={{ fontWeight: 600, color: '#475569' }}>Địa chỉ Email</span>}
                                name="email"
                                rules={[
                                    { required: true, message: 'Vui lòng nhập email' },
                                    { type: 'email', message: 'Email không hợp lệ' },
                                ]}
                            >
                                <Input
                                    size="large"
                                    placeholder="example@gmail.com"
                                    prefix={<MailOutlined style={{ color: '#94A3B8' }} />}
                                    style={{ borderRadius: 10 }}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={24}>
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
                                label={<span style={{ fontWeight: 600, color: '#475569' }}>Vai trò hệ thống</span>}
                                name="role"
                                rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
                            >
                                <Select
                                    size="large"
                                    style={{ borderRadius: 10 }}
                                    suffixIcon={<SafetyCertificateOutlined style={{ color: '#94A3B8' }} />}
                                >
                                    <Option value="ADMIN">Quản trị viên</Option>
                                    <Option value="SPECIALIST">Chuyên viên</Option>
                                    <Option value="STUDENT">Học viên</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>
        </div>
    );
}
