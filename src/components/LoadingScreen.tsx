import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

export default function LoadingScreen() {
    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)',
                zIndex: 9999,
                animation: 'fadeIn 0.5s ease-in-out',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 32,
                    animation: 'scaleIn 0.6s ease-out',
                }}
            >
                <img
                    src="/toeic-test-logo-transparent.png"
                    alt="TOEIC Test Logo"
                    style={{
                        maxWidth: '300px',
                        height: 'auto',
                        filter: 'drop-shadow(0 8px 24px rgba(37, 99, 235, 0.2))',
                    }}
                />
                <Spin
                    indicator={
                        <LoadingOutlined
                            style={{
                                fontSize: 48,
                                color: '#2563EB',
                            }}
                            spin
                        />
                    }
                />
                <div
                    style={{
                        fontSize: 18,
                        fontWeight: 500,
                        color: '#64748B',
                        letterSpacing: '0.5px',
                    }}
                >
                    Đang tải hệ thống quản trị...
                </div>
            </div>
        </div>
    );
}
