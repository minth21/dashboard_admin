import React, { useState, useEffect } from 'react';
import { Badge, Popover, List, Avatar, Button, Typography, Empty, Spin } from 'antd';
import { 
    BellOutlined, 
    CheckCircleOutlined, 
    FileTextOutlined, 
    ClockCircleOutlined,
    ExclamationCircleOutlined,
    NotificationOutlined,
    FlagOutlined,
    MessageOutlined
} from '@ant-design/icons';
import { notificationApi, type Notification } from '../services/api';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

// Helper function to format relative time without date-fns
const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Vừa xong';
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN');
};

const NotificationCenter: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    const fetchNotifications = async (showLoading = false) => {
        if (showLoading) setLoading(true);
        try {
            const response = await notificationApi.list();
            if (response.success) {
                setNotifications(response.data.notifications);
                setUnreadCount(response.data.unreadCount);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications(true);
        
        // Polling: Tự động cập nhật sau mỗi 60 giây
        const timer = setInterval(() => {
            fetchNotifications();
        }, 60000);

        return () => clearInterval(timer);
    }, []);

    const handleMarkRead = async (id: string | 'all') => {
        try {
            const response = await notificationApi.markRead(id);
            if (response.success) {
                fetchNotifications();
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const handleNotificationClick = (item: Notification) => {
        setOpen(false);
        handleMarkRead(item.id);

        // Chuyển hướng dựa trên type
        if (item.type === 'TEST_SUBMITTED' && item.relatedId) {
            navigate(`/dashboard?submissionId=${item.relatedId}`); 
        } else if ((item.type === 'TEST_PENDING' || item.type === 'TEST_REJECTED' || item.type === 'TEST_APPROVED') && item.relatedId) {
            navigate(`/exam-bank/${item.relatedId}`);
        } else if (item.type === 'TEST_COMPLAINT' || item.type === 'COMPLAINT_RESOLVED') {
            navigate('/complaints');
        } else if (item.type === 'STUDENT_FEEDBACK' || item.type === 'FEEDBACK_RESOLVED') {
            navigate('/class-feedback');
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'TEST_SUBMITTED':
                return <Avatar icon={<FileTextOutlined />} style={{ backgroundColor: '#3B82F6' }} />;
            case 'TEST_PENDING':
                return <Avatar icon={<ClockCircleOutlined />} style={{ backgroundColor: '#F59E0B' }} />;
            case 'TEST_APPROVED':
                return <Avatar icon={<CheckCircleOutlined />} style={{ backgroundColor: '#10B981' }} />;
            case 'TEST_REJECTED':
                return <Avatar icon={<ExclamationCircleOutlined />} style={{ backgroundColor: '#EF4444' }} />;
            case 'TEST_COMPLAINT':
                return <Avatar icon={<FlagOutlined />} style={{ backgroundColor: '#F59E0B' }} />;
            case 'COMPLAINT_RESOLVED':
                return <Avatar icon={<MessageOutlined />} style={{ backgroundColor: '#10B981' }} />;
            case 'STUDENT_FEEDBACK':
                return <Avatar icon={<MessageOutlined />} style={{ backgroundColor: '#F59E0B' }} />;
            case 'FEEDBACK_RESOLVED':
                return <Avatar icon={<CheckCircleOutlined />} style={{ backgroundColor: '#10B981' }} />;
            default:
                return <Avatar icon={<NotificationOutlined />} style={{ backgroundColor: '#64748B' }} />;
        }
    };

    const notificationList = (
        <div style={{ width: 350, maxHeight: 500, overflowY: 'auto' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                <Text strong style={{ fontSize: 16 }}>Thông báo</Text>
                {unreadCount > 0 && (
                    <Button type="link" size="small" onClick={() => handleMarkRead('all')} style={{ padding: 0 }}>
                        Đọc tất cả
                    </Button>
                )}
            </div>
            
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}><Spin /></div>
            ) : notifications.length > 0 ? (
                <List
                    itemLayout="horizontal"
                    dataSource={notifications}
                    renderItem={(item) => (
                        <List.Item
                            onClick={() => handleNotificationClick(item)}
                            style={{ 
                                padding: '12px 16px', 
                                cursor: 'pointer', 
                                backgroundColor: item.isRead ? 'transparent' : '#F0F9FF',
                                transition: 'background-color 0.3s'
                            }}
                        >
                            <List.Item.Meta
                                avatar={getIcon(item.type)}
                                title={
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Text strong={!item.isRead} style={{ fontSize: 14, color: '#1E293B', flex: 1 }}>{item.title}</Text>
                                        {!item.isRead && <Badge status="processing" />}
                                    </div>
                                }
                                description={
                                    <div>
                                        <div style={{ fontSize: 13, color: '#64748B', marginBottom: 4 }}>{item.content}</div>
                                        <Text type="secondary" style={{ fontSize: 11 }}>
                                            {formatRelativeTime(new Date(item.createdAt))}
                                        </Text>
                                    </div>
                                }
                            />
                        </List.Item>
                    )}
                />
            ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có thông báo nào" style={{ padding: '30px 0' }} />
            )}
            
            <div style={{ padding: '8px', borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>
                <Button type="text" block onClick={() => setOpen(false)}>Đóng</Button>
            </div>
        </div>
    );

    return (
        <Popover
            content={notificationList}
            trigger="click"
            open={open}
            onOpenChange={setOpen}
            placement="bottomRight"
            overlayInnerStyle={{ padding: 0, borderRadius: 16, overflow: 'hidden' }}
        >
            <Badge count={unreadCount} overflowCount={99} offset={[-2, 6]}>
                <Button
                    type="text"
                    icon={<BellOutlined style={{ fontSize: 20 }} />}
                    style={{
                        width: 45,
                        height: 45,
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#F0F9FF',
                        color: '#1E40AF',
                    }}
                />
            </Badge>
        </Popover>
    );
};

export default NotificationCenter;
