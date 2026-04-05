import React, { useState } from 'react';
import { Modal, Form, Input, message, Button } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { authApi } from '../services/api';

interface ChangePasswordModalProps {
    visible: boolean;
    onCancel: () => void;
    onSuccess: () => void;
    isForced?: boolean; // Nếu là bắt buộc (lần đầu login)
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ visible, onCancel, onSuccess, isForced = false }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            
            if (values.newPassword !== values.confirmPassword) {
                message.error('Mật khẩu mới và xác nhận mật khẩu không khớp!');
                return;
            }

            setLoading(true);
            const response = isForced 
                ? await authApi.changeFirstPassword({ newPassword: values.newPassword })
                : await authApi.updatePassword({
                    currentPassword: values.currentPassword,
                    newPassword: values.newPassword
                });

            if (response.success) {
                message.success('Đổi mật khẩu thành công! Hệ thống sẽ yêu cầu bạn đăng nhập lại.');
                form.resetFields();
                onSuccess();
            } else {
                message.error(response.message || 'Đổi mật khẩu thất bại');
            }
        } catch (error: any) {
            if (error.errorFields) return; // Validation failed
            console.error('Change password error:', error);
            message.error('Có lỗi xảy ra khi kết nối máy chủ');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <LockOutlined style={{ color: isForced ? '#EF4444' : '#3B82F6' }} />
                <span>{isForced ? 'Bắt buộc đổi mật khẩu lần đầu' : 'Đổi mật khẩu mới'}</span>
            </div>}
            open={visible}
            onCancel={isForced ? undefined : onCancel}
            onOk={handleSubmit}
            confirmLoading={loading}
            okText={isForced ? 'Cập nhật & Bắt đầu' : 'Cập nhật mật khẩu'}
            cancelText="Hủy bỏ"
            closable={!isForced}
            maskClosable={!isForced}
            keyboard={!isForced}
            footer={(_, { OkBtn, CancelBtn }) => (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    {isForced ? (
                        <Button 
                            danger 
                            onClick={onCancel} // In Dashboard.tsx, onCancel calls handleLogout when in forced mode
                            style={{ borderRadius: 8, height: 40 }}
                        >
                            Đăng xuất
                        </Button>
                    ) : (
                        <CancelBtn />
                    )}
                    <OkBtn />
                </div>
            )}
            okButtonProps={{
                style: {
                    background: isForced 
                        ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' 
                        : 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                    height: 40,
                    borderRadius: 8,
                    fontWeight: 600
                }
            }}
            cancelButtonProps={{ style: { height: 40, borderRadius: 8 } }}
            centered
            width={450}
        >
            {isForced && (
                <div style={{ 
                    padding: '12px 16px', 
                    background: '#FEF2F2', 
                    borderRadius: 12, 
                    marginBottom: 16,
                    border: '1px solid #FEE2E2',
                    color: '#991B1B',
                    fontSize: 13,
                    fontWeight: 500
                }}>
                    Chào mừng bạn! Vì lý do bảo mật, bạn cần đổi mật khẩu mặc định trước khi có thể sử dụng hệ thống.
                </div>
            )}
            <Form
                form={form}
                layout="vertical"
                style={{ marginTop: 24 }}
            >
                {!isForced && (
                    <Form.Item
                        name="currentPassword"
                        label={<span style={{ fontWeight: 600 }}>Mật khẩu hiện tại</span>}
                        rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
                    >
                        <Input.Password 
                            placeholder="Nhập mật khẩu đang sử dụng" 
                            prefix={<LockOutlined style={{ color: '#94A3B8' }} />}
                        />
                    </Form.Item>
                )}

                <Form.Item
                    name="newPassword"
                    label={<span style={{ fontWeight: 600 }}>Mật khẩu mới</span>}
                    rules={[
                        { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                        { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự' }
                    ]}
                >
                    <Input.Password 
                        placeholder="Tối thiểu 8 ký tự"
                        prefix={<LockOutlined style={{ color: '#3B82F6' }} />}
                    />
                </Form.Item>

                <Form.Item
                    name="confirmPassword"
                    label={<span style={{ fontWeight: 600 }}>Xác nhận mật khẩu mới</span>}
                    rules={[{ required: true, message: 'Vui lòng xác nhận mật khẩu mới' }]}
                >
                    <Input.Password 
                        placeholder="Nhập lại mật khẩu mới"
                        prefix={<LockOutlined style={{ color: '#3B82F6' }} />}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ChangePasswordModal;
