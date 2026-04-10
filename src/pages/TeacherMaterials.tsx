import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, message, Drawer, Tag, Input } from 'antd';
import { TeamOutlined, SearchOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { classApi } from '../services/api';
import type { Class } from '../services/api';
import { useTheme } from '../hooks/useThemeContext';
import ClassMaterialManager from '../components/ClassMaterialManager';

const { Search } = Input;

export default function TeacherMaterials() {
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);

    const theme = useTheme();
    const isDark = theme.theme === 'dark';

    useEffect(() => {
        fetchMyClasses();
    }, []);

    const fetchMyClasses = async () => {
        setLoading(true);
        try {
            const response = await classApi.getMyClasses();
            if (response.success) {
                setClasses(response.data);
            } else {
                message.error('Không thể tải danh sách lớp học');
            }
        } catch (error) {
            console.error(error);
            message.error('Lỗi khi tải danh sách lớp học');
        } finally {
            setLoading(false);
        }
    };

    const handleManageMaterials = (record: Class) => {
        setSelectedClass(record);
        setDrawerVisible(true);
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
            render: (text: string) => <Tag color="blue">{text}</Tag>,
        },
        {
            title: 'Tên lớp',
            dataIndex: 'className',
            key: 'className',
            render: (text: string) => <strong style={{ color: '#1E3A8A' }}>{text}</strong>,
        },
        {
            title: 'Học viên',
            dataIndex: 'studentCount',
            key: 'studentCount',
            render: (count: number) => (
                <Space>
                    <TeamOutlined style={{ color: '#10B981' }} />
                    <span>{count || 0} HV</span>
                </Space>
            ),
        },
        {
            title: 'Quản lý',
            key: 'action',
            render: (_: any, record: Class) => (
                <Button
                    type="primary"
                    icon={<FolderOpenOutlined />}
                    onClick={() => handleManageMaterials(record)}
                    style={{ 
                        borderRadius: 8, 
                        background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', 
                        border: 'none',
                        boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
                        fontWeight: 600
                    }}
                >
                    Mở kho tài liệu
                </Button>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px', background: isDark ? '#0F172A' : '#F8FAFC', minHeight: '100vh' }}>

            {/* Search */}
            <Card style={{ marginBottom: 24, borderRadius: 20, border: 'none', boxShadow: 'var(--card-shadow)', background: isDark ? '#1E293B' : '#FFFFFF' }}>
                <Search
                    placeholder="Tìm theo tên lớp hoặc mã lớp"
                    allowClear
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ maxWidth: 400 }}
                    size="large"
                    prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
                />
            </Card>

            {/* Classes List */}
            <Card style={{ borderRadius: 24, border: 'none', boxShadow: 'var(--card-shadow)', overflow: 'hidden', background: isDark ? '#1E293B' : '#FFFFFF' }} bodyStyle={{ padding: 0 }}>
                <Table
                    columns={columns}
                    dataSource={filteredClasses}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            {/* Drawer for Material Manager */}
            <Drawer
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <FolderOpenOutlined style={{ color: '#3B82F6', fontSize: 20 }} />
                        <span><strong style={{ color: '#1D4ED8' }}>{selectedClass?.className}</strong></span>
                    </div>
                }
                placement="right"
                width={850}
                onClose={() => setDrawerVisible(false)}
                open={drawerVisible}
                headerStyle={{ borderBottom: '1px solid #E2E8F0', padding: '20px 24px' }}
                bodyStyle={{ background: isDark ? '#0F172A' : '#F8FAFC', padding: 0 }}
            >
                {selectedClass && (
                    <ClassMaterialManager classId={selectedClass.id} isDark={isDark} />
                )}
            </Drawer>
        </div>
    );
}
