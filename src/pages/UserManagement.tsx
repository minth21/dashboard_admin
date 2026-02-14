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
} from 'antd';
import {
    SearchOutlined,
    EditOutlined,
    UserOutlined,
    LockOutlined,
    ReloadOutlined,
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
    role: 'STUDENT' | 'ADMIN';
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

    // Fetch users từ API
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await userApi.list(page, pageSize, roleFilter, searchText);

            if (data.success) {
                setUsers(data.users);
                setTotal(data.pagination.total);
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
                    STAFF: { color: '#F59E0B', label: 'Nhân viên' },
                    STUDENT: { color: '#16A34A', label: 'Học viên' },
                };
                const config = roleConfig[role] || { color: 'default', label: role };
                return <Tag color={config.color}>{config.label}</Tag>;
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
                        type="primary"
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => handleEdit(record)}
                    />
                    <Button
                        danger
                        icon={<LockOutlined />}
                        size="small"
                        onClick={() => handleLockAccount(record.id, record.name)}
                    />
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '0 0 24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 24 }}>
                <Button
                    type="primary"
                    icon={<UserOutlined />}
                    onClick={handleOpenCreateModal}
                >
                    Thêm người dùng
                </Button>
            </div>

            <Card
                style={{
                    marginBottom: 24,
                    borderRadius: 16,
                    border: '1px solid #E0F2FE',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)'
                }}
                bodyStyle={{ padding: 16 }}
            >
                <Space size="middle" wrap>
                    <Search
                        placeholder="Tìm theo tên hoặc email"
                        allowClear
                        onSearch={handleSearch}
                        style={{ width: 300 }}
                        prefix={<SearchOutlined style={{ color: '#64748B' }} />}
                    />
                    <Select
                        value={roleFilter}
                        onChange={(value) => {
                            setRoleFilter(value);
                            setPage(1);
                        }}
                        style={{ width: 150 }}
                    >
                        <Option value="ALL">Tất cả vai trò</Option>
                        <Option value="STUDENT">Học viên</Option>
                        <Option value="ADMIN">Quản trị viên</Option>
                    </Select>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={fetchUsers}
                        loading={loading}
                    >
                        Làm mới
                    </Button>
                </Space>
            </Card>

            {/* Table */}
            <Table
                columns={columns}
                dataSource={users}
                rowKey="id"
                loading={loading}
                style={{
                    background: '#fff',
                    borderRadius: 16,
                    overflow: 'hidden',
                    border: '1px solid #E0F2FE',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)'
                }}
                pagination={{
                    current: page,
                    pageSize: pageSize,
                    total: total,
                    showSizeChanger: true,
                    showTotal: (total) => `Tổng ${total} người dùng`,
                    onChange: (page, pageSize) => {
                        setPage(page);
                        setPageSize(pageSize);
                    },
                }}
                scroll={{ x: 'max-content' }}
            />

            {/* Edit Modal */}
            <Modal
                title="Chỉnh Sửa User"
                open={editModalVisible}
                onCancel={() => setEditModalVisible(false)}
                onOk={() => form.submit()}
                okText="Lưu"
                cancelText="Hủy"
                width={600}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleEditSubmit}
                >
                    <Form.Item
                        label="Tên"
                        name="name"
                        rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Email"
                        name="email"
                        rules={[
                            { required: true, message: 'Vui lòng nhập email' },
                            { type: 'email', message: 'Email không hợp lệ' },
                        ]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item label="Số điện thoại" name="phoneNumber">
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Avatar URL"
                        name="avatarUrl"
                        help="Nhập URL ảnh đại diện (Cloudinary hoặc URL khác)"
                    >
                        <Input placeholder="https://res.cloudinary.com/..." />
                    </Form.Item>

                    <Form.Item label="Giới tính" name="gender">
                        <Select allowClear placeholder="Chọn giới tính">
                            <Option value="MALE">Nam</Option>
                            <Option value="FEMALE">Nữ</Option>
                            <Option value="OTHER">Khác</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        label="Role"
                        name="role"
                        rules={[{ required: true, message: 'Vui lòng chọn role' }]}
                    >
                        <Select>
                            <Option value="STUDENT">Học viên</Option>
                            <Option value="STAFF">Nhân viên</Option>
                            <Option value="ADMIN">Quản trị viên</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.role !== currentValues.role}>
                        {({ getFieldValue }) => {
                            const role = getFieldValue('role');
                            // Only show TOEIC fields for STUDENT
                            if (role !== 'STUDENT') return null;

                            return (
                                <>
                                    <Form.Item label="Tiến độ (%)" name="progress">
                                        <Select allowClear placeholder="Chọn mức độ">
                                            <Option value="A1">A1 - Beginner (120-220)</Option>
                                            <Option value="A2">A2 - Elementary (225-545)</Option>
                                            <Option value="B1">B1 - Intermediate (550-780)</Option>
                                            <Option value="B2">B2 - Upper Intermediate (785-940)</Option>
                                            <Option value="C1">C1 - Advanced (945-990)</Option>
                                        </Select>
                                    </Form.Item>

                                    <Form.Item label="Target Score" name="targetScore">
                                        <InputNumber min={0} max={990} style={{ width: '100%' }} />
                                    </Form.Item>
                                </>
                            );
                        }}
                    </Form.Item>
                </Form>
            </Modal>

            {/* Create User Modal */}
            <Modal
                title="Tạo Người Dùng Mới"
                open={createModalVisible}
                onCancel={() => setCreateModalVisible(false)}
                onOk={() => createForm.submit()}
                okText="Tạo"
                cancelText="Hủy"
                width={600}
            >
                <Form
                    form={createForm}
                    layout="vertical"
                    onFinish={handleCreateSubmit}
                >
                    <Form.Item
                        label="Tên"
                        name="name"
                        rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Email"
                        name="email"
                        rules={[
                            { required: true, message: 'Vui lòng nhập email' },
                            { type: 'email', message: 'Email không hợp lệ' },
                        ]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Mật khẩu"
                        name="password"
                        rules={[
                            { required: true, message: 'Vui lòng nhập mật khẩu' },
                            { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự' },
                        ]}
                    >
                        <Input.Password />
                    </Form.Item>

                    <Form.Item label="Số điện thoại" name="phoneNumber">
                        <Input />
                    </Form.Item>

                    <Form.Item label="Giới tính" name="gender">
                        <Select allowClear placeholder="Chọn giới tính">
                            <Option value="MALE">Nam</Option>
                            <Option value="FEMALE">Nữ</Option>
                            <Option value="OTHER">Khác</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        label="Role"
                        name="role"
                        rules={[{ required: true, message: 'Vui lòng chọn role' }]}
                    >
                        <Select>
                            <Option value="STUDENT">Học viên</Option>
                            <Option value="STAFF">Nhân viên</Option>
                            <Option value="ADMIN">Quản trị viên</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.role !== currentValues.role}>
                        {({ getFieldValue }) => {
                            const role = getFieldValue('role');
                            // Only show TOEIC fields for STUDENT
                            if (role !== 'STUDENT') return null;

                            return (
                                <>
                                    <Form.Item label="Tiến độ AI (%)" name="progress">
                                        <InputNumber min={0} max={100} style={{ width: '100%' }} />
                                    </Form.Item>
                                </>
                            );
                        }}
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
