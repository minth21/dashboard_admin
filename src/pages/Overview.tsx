import { Typography, Card, Space } from 'antd';
import {
    SmileOutlined,
    TrophyOutlined,
    InfoCircleOutlined,
} from '@ant-design/icons';
import { useOutletContext } from 'react-router-dom';

const { Title, Text } = Typography;

interface User {
    name: string;
    email: string;
}

export default function Overview() {
    const { user } = useOutletContext<{ user: User }>();

    if (!user) return null;

    return (
        <div style={{ padding: 24, background: '#fff', minHeight: 360, borderRadius: 8 }}>
            <Title level={3}>
                <SmileOutlined style={{ marginRight: 8, color: '#2563EB' }} />
                Chào mừng, {user.name}!
            </Title>

            <Space direction="vertical" size="large" style={{ width: '100%', marginTop: 32 }}>
                <Card
                    style={{
                        background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                        border: 'none',
                    }}
                >
                    <div style={{ color: 'white' }}>
                        <Title level={2} style={{ color: 'white', margin: 0 }}>
                            <TrophyOutlined style={{ marginRight: 12 }} />
                            Chào mừng đến với Trang quản trị TOEIC Practice
                        </Title>
                        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16 }}>
                            Quản lý hệ thống TOEIC Practice hiệu quả
                        </Text>
                    </div>
                </Card>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                    <Card>
                        <div style={{ textAlign: 'center' }}>
                            <Title level={2} style={{ color: '#2563EB', margin: 0 }}>
                                0
                            </Title>
                            <Text type="secondary">Người dùng</Text>
                        </div>
                    </Card>

                    <Card>
                        <div style={{ textAlign: 'center' }}>
                            <Title level={2} style={{ color: '#16A34A', margin: 0 }}>
                                0
                            </Title>
                            <Text type="secondary">Đề thi</Text>
                        </div>
                    </Card>

                    <Card>
                        <div style={{ textAlign: 'center' }}>
                            <Title level={2} style={{ color: '#F59E0B', margin: 0 }}>
                                0
                            </Title>
                            <Text type="secondary">Câu hỏi</Text>
                        </div>
                    </Card>
                </div>

                <Card title={<><InfoCircleOutlined style={{ marginRight: 8, color: '#2563EB' }} />Thông tin hệ thống</>}>
                    <Space direction="vertical">
                        <Text>
                            <strong>Máy chủ:</strong> http://localhost:3000
                        </Text>
                        <Text>
                            <strong>Cơ sở dữ liệu:</strong> PostgreSQL
                        </Text>
                        <Text>
                            <strong>Quản trị viên:</strong> {user.email}
                        </Text>
                    </Space>
                </Card>
            </Space>
        </div>
    );
}
