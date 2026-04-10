import { useState, useEffect } from 'react';
import {
    Card,
    Form,
    Input,
    Button,
    Row,
    Col,
    Avatar,
    message,
    DatePicker,
    Typography,
    Divider,
    Upload,
    Tag
} from 'antd';
import {
    UserOutlined,
    PhoneOutlined,
    CalendarOutlined,
    MailOutlined,
    EditOutlined,
    IdcardOutlined,
    CrownOutlined,
    CheckCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { userApi } from '../services/api';

const { Title, Text } = Typography;

const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'Quản trị viên',
    SPECIALIST: 'Chuyên viên',
    TEACHER: 'Giáo viên',
    STUDENT: 'Học viên',
};

const ROLE_COLORS: Record<string, string> = {
    ADMIN: '#EF4444',
    SPECIALIST: '#F59E0B',
    TEACHER: '#10B981',
    STUDENT: '#3B82F6',
};

export default function Profile() {
    const [form] = Form.useForm();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const userData = localStorage.getItem('admin_user');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            form.setFieldsValue({
                ...parsedUser,
                dateOfBirth: parsedUser.dateOfBirth ? dayjs(parsedUser.dateOfBirth) : null,
            });
        }
    }, [form]);

    const handleAvatarUpload = async (file: File) => {
        setUploading(true);
        const formData = new FormData();
        formData.append('image', file);

        try {
            // Re-using the same image upload logic from Dashboard/UserManagement
            const res = await userApi.updateAvatar(formData);
            if (res.success && res.user) {
                const updatedUrl = res.user.avatarUrl;
                form.setFieldsValue({ avatarUrl: updatedUrl });
                setUser({ ...user, avatarUrl: updatedUrl });

                // Update localStorage so other components reflect the change
                const storedUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
                localStorage.setItem('admin_user', JSON.stringify({ ...storedUser, avatarUrl: updatedUrl }));

                message.success('Tải ảnh đại diện lên thành công!');
                // We don't call updateProfile yet, we let user save the whole form or just keep the avatar
            } else {
                message.error(res.message || 'Tải ảnh lên thất bại!');
            }
        } catch (error) {
            message.error('Có lỗi xảy ra khi tải ảnh lên!');
        } finally {
            setUploading(false);
        }
        return false;
    };

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            // Strict sanitization - ensure we only send what's allowed and expected
            const submitData = {
                name: values.name,
                email: values.email,
                phoneNumber: values.phoneNumber,
                dateOfBirth: values.dateOfBirth ? values.dateOfBirth.toISOString() : undefined,
                avatarUrl: values.avatarUrl,
            };

            const res = await userApi.updateProfile(submitData);
            if (res.success) {
                const updatedUser = res.user;
                localStorage.setItem('admin_user', JSON.stringify(updatedUser));
                setUser(updatedUser);
                message.success('Cập nhật thông tin cá nhân thành công!');
                // Reload page to sync components? Or just rely on local state?
                // For better UX, we just update local state. Dashboard should reflect if it's watching.
                window.dispatchEvent(new Event('storage')); // Trigger sync if needed
            } else {
                message.error(res.message || 'Cập nhật thất bại!');
            }
        } catch (error) {
            message.error('Có lỗi xảy ra khi cập nhật thông tin!');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>

            <Row gutter={32}>
                <Col xs={24} lg={8}>
                    <Card
                        className="profile-card"
                        style={{
                            borderRadius: 24,
                            boxShadow: 'var(--card-shadow)',
                            border: 'none',
                            textAlign: 'center',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{ padding: '20px 0' }}>
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                <Avatar
                                    size={140}
                                    src={
                                        form.getFieldValue('avatarUrl')
                                            ? form.getFieldValue('avatarUrl').startsWith('http')
                                                ? form.getFieldValue('avatarUrl')
                                                : `http://localhost:3000${form.getFieldValue('avatarUrl')}`
                                            : '/admin.jpg'
                                    }
                                    style={{
                                        border: '4px solid #fff',
                                        boxShadow: '0 8px 16px rgba(30, 64, 175, 0.15)',
                                        background: '#F1F5F9'
                                    }}
                                    icon={<UserOutlined />}
                                />
                                <Upload
                                    beforeUpload={handleAvatarUpload}
                                    showUploadList={false}
                                    accept="image/*"
                                >
                                    <Button
                                        shape="circle"
                                        icon={<EditOutlined />}
                                        loading={uploading}
                                        style={{
                                            position: 'absolute',
                                            bottom: 8,
                                            right: 8,
                                            background: '#3B82F6',
                                            color: '#fff',
                                            border: 'none',
                                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                        }}
                                    />
                                </Upload>
                            </div>

                            <Title level={3} style={{ marginTop: 24, marginBottom: 8, fontWeight: 700 }}>
                                {user.name}
                            </Title>

                            <Tag
                                color={ROLE_COLORS[user.role]}
                                style={{
                                    padding: '4px 16px',
                                    borderRadius: 100,
                                    fontWeight: 700,
                                    border: 'none',
                                    fontSize: 12,
                                    textTransform: 'uppercase'
                                }}
                            >
                                <CrownOutlined style={{ marginRight: 6 }} />
                                {ROLE_LABELS[user.role]}
                            </Tag>
                        </div>

                        <Divider style={{ margin: '12px 0' }} />

                        <div style={{ textAlign: 'left', padding: '12px' }}>
                            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                                <IdcardOutlined style={{ fontSize: 18, color: '#64748B', marginTop: 4 }} />
                                <div>
                                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Mã định danh</Text>
                                    <Text strong>{user.username}</Text>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                                <MailOutlined style={{ fontSize: 18, color: '#64748B', marginTop: 4 }} />
                                <div>
                                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Email</Text>
                                    <Text strong>{user.email || 'Chưa cập nhật'}</Text>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <CheckCircleOutlined style={{ fontSize: 18, color: '#10B981', marginTop: 4 }} />
                                <div>
                                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Trạng thái</Text>
                                    <Text strong style={{ color: '#059669' }}>Đang hoạt động</Text>
                                </div>
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col xs={24} lg={16}>
                    <Card
                        style={{
                            borderRadius: 24,
                            boxShadow: 'var(--card-shadow)',
                            border: 'none',
                            padding: '12px'
                        }}
                    >
                        <Title level={4} style={{ marginBottom: 32, fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                            <EditOutlined style={{ marginRight: 12, color: '#3B82F6' }} />
                            Chỉnh sửa thông tin
                        </Title>

                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={onFinish}
                            requiredMark={false}
                        >
                            <Row gutter={24}>
                                <Col span={24}>
                                    <Form.Item
                                        label={<span style={{ fontWeight: 600, color: '#475569' }}>Họ và tên</span>}
                                        name="name"
                                        rules={[{ required: true, message: 'Họ tên không được để trống' }]}
                                    >
                                        <Input
                                            size="large"
                                            prefix={<UserOutlined style={{ color: '#94A3B8' }} />}
                                            placeholder="Nhập họ và tên"
                                            style={{ borderRadius: 12, height: 48 }}
                                        />
                                    </Form.Item>
                                </Col>

                                <Col xs={24} md={12}>
                                    <Form.Item
                                        label={<span style={{ fontWeight: 600, color: '#475569' }}>Số điện thoại</span>}
                                        name="phoneNumber"
                                    >
                                        <Input
                                            size="large"
                                            prefix={<PhoneOutlined style={{ color: '#94A3B8' }} />}
                                            placeholder="Nhập số điện thoại"
                                            style={{ borderRadius: 12, height: 48 }}
                                        />
                                    </Form.Item>
                                </Col>

                                <Col xs={24} md={12}>
                                    <Form.Item
                                        label={<span style={{ fontWeight: 600, color: '#475569' }}>Ngày tháng năm sinh</span>}
                                        name="dateOfBirth"
                                    >
                                        <DatePicker
                                            size="large"
                                            format="DD/MM/YYYY"
                                            placeholder="Chọn ngày sinh"
                                            suffixIcon={<CalendarOutlined style={{ color: '#94A3B8' }} />}
                                            style={{ borderRadius: 12, height: 48, width: '100%' }}
                                        />
                                    </Form.Item>
                                </Col>

                                <Col span={24}>
                                    <Form.Item
                                        label={<span style={{ fontWeight: 600, color: '#475569' }}>Địa chỉ Email</span>}
                                        name="email"
                                        rules={[
                                            { type: 'email', message: 'Email không hợp lệ' },
                                            { required: true, message: 'Vui lòng nhập email để nhận thông báo' }
                                        ]}
                                    >
                                        <Input
                                            size="large"
                                            prefix={<MailOutlined style={{ color: '#94A3B8' }} />}
                                            placeholder="example@gmail.com"
                                            style={{ borderRadius: 12, height: 48 }}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item name="avatarUrl" hidden>
                                <Input />
                            </Form.Item>

                            <div style={{ marginTop: 32, borderTop: '1px solid #F1F5F9', paddingTop: 24, textAlign: 'right' }}>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    size="large"
                                    loading={loading}
                                    style={{
                                        borderRadius: 12,
                                        height: 48,
                                        padding: '0 40px',
                                        fontWeight: 700,
                                        background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)'
                                    }}
                                >
                                    Lưu thay đổi
                                </Button>
                            </div>
                        </Form>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
