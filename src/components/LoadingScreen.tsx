import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

export default function LoadingScreen({ isExiting = false }: { isExiting?: boolean }) {
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
                background: 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)',
                zIndex: 9999,
                opacity: isExiting ? 0 : 1,
                transition: 'opacity 0.6s ease-in-out',
                pointerEvents: 'none'
            }}
        >
            {/* Background decorative elements */}
            <div style={{
                position: 'absolute',
                width: '40vmax',
                height: '40vmax',
                background: 'radial-gradient(circle, rgba(37, 99, 235, 0.1) 0%, transparent 70%)',
                top: '-10%',
                right: '-10%',
                zIndex: 0,
                transform: isExiting ? 'scale(1.2)' : 'scale(1)',
                transition: 'transform 1s ease-out'
            }} />
            <div style={{
                position: 'absolute',
                width: '30vmax',
                height: '30vmax',
                background: 'radial-gradient(circle, rgba(37, 99, 235, 0.05) 0%, transparent 70%)',
                bottom: '5%',
                left: '-5%',
                zIndex: 0,
                transform: isExiting ? 'scale(1.2)' : 'scale(1)',
                transition: 'transform 1s ease-out'
            }} />

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '80px 100px',
                    background: 'rgba(255, 255, 255, 0.6)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '48px',
                    border: '1px solid rgba(255, 255, 255, 0.7)',
                    boxShadow: '0 32px 64px rgba(30, 64, 175, 0.12)',
                    zIndex: 1,
                    textAlign: 'center',
                    gap: 48,
                    animation: 'fadeInScale 1s ease-out',
                    transform: isExiting ? 'translateY(-20px) scale(0.95)' : 'translateY(0) scale(1)',
                    transition: 'transform 0.6s ease-in-out, opacity 0.6s ease-in-out',
                    opacity: isExiting ? 0 : 1
                }}
            >
                <style>
                    {`
                        @keyframes fadeInScale {
                            from { opacity: 0; transform: scale(0.9); }
                            to { opacity: 1; transform: scale(1); }
                        }
                        @keyframes pulseLogo {
                            0% { transform: scale(1); filter: drop-shadow(0 12px 24px rgba(37, 99, 235, 0.2)); }
                            50% { transform: scale(1.05); filter: drop-shadow(0 20px 40px rgba(37, 99, 235, 0.3)); }
                            100% { transform: scale(1); filter: drop-shadow(0 12px 24px rgba(37, 99, 235, 0.2)); }
                        }
                    `}
                </style>

                <div style={{ position: 'relative' }}>
                    <img
                        src="/toeic-test-logo-transparent.png"
                        alt="TOEIC Test Logo"
                        style={{
                            maxWidth: '280px',
                            height: 'auto',
                            animation: 'pulseLogo 3s infinite ease-in-out',
                        }}
                    />
                </div>

                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
                    <Spin
                        indicator={
                            <LoadingOutlined
                                style={{
                                    fontSize: 64,
                                    color: '#1E40AF',
                                }}
                                spin
                            />
                        }
                    />

                    <div
                        style={{
                            fontSize: 24,
                            fontWeight: 800,
                            color: '#1E3A8A',
                            letterSpacing: '-0.5px',
                            marginTop: 16,
                            background: 'linear-gradient(90deg, #1E40AF, #3B82F6)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}
                    >
                        Đang thiết lập hệ thống quản trị viên...
                    </div>
                </div>
            </div>
        </div>
    );
}
