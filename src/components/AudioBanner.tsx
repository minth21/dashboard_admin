import React, { useState } from 'react';
import { Upload, Button } from 'antd';
import { SoundOutlined, UploadOutlined } from '@ant-design/icons';
import AudioPlayer from './AudioPlayer';

interface AudioBannerProps {
    /** URL of the currently saved audio (from server) */
    currentAudioUrl?: string | null;
    /** The new file selected by user (not yet uploaded) */
    newAudioFile?: File | null;
    /** Called when user selects a new audio file */
    onAudioFileChange: (file: File | null) => void;
    /** If true, shows the player without a "Change" button (post-submit view) */
    readOnly?: boolean;
}

/**
 * A reusable audio section for Listening modals (Part 1-4).
 * - If no audio: shows a light-blue banner with an "Upload audio" button.
 * - If audio exists (or file selected): shows inline AudioPlayer styled like the main PartDetail page.
 */
const AudioBanner: React.FC<AudioBannerProps> = ({
    currentAudioUrl,
    newAudioFile,
    onAudioFileChange,
    readOnly = false,
}) => {
    const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

    const hasAudio = !!(currentAudioUrl || newAudioFile || localPreviewUrl);
    const displayUrl = localPreviewUrl || currentAudioUrl || '';

    const handleBeforeUpload = (file: File) => {
        const preview = URL.createObjectURL(file);
        setLocalPreviewUrl(preview);
        onAudioFileChange(file);
        return false; // Prevent auto-upload
    };

    const handleRemove = () => {
        if (localPreviewUrl) {
            URL.revokeObjectURL(localPreviewUrl);
            setLocalPreviewUrl(null);
        }
        onAudioFileChange(null);
    };

    if (hasAudio) {
        // --- Has Audio: Player style (Image 1 style) ---
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '12px 16px',
                background: '#F8FAFC',
                borderRadius: 12,
                border: '1px solid #E2E8F0',
                marginBottom: 16,
            }}>
                <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFF',
                    fontSize: 12,
                    fontWeight: 800,
                    flexShrink: 0,
                    boxShadow: '0 3px 8px rgba(16, 185, 129, 0.25)',
                }}>
                    AUDIO
                </div>
                <div style={{ flex: 1 }}>
                    <AudioPlayer src={displayUrl} />
                </div>
                {!readOnly && (
                    <Upload
                        beforeUpload={handleBeforeUpload}
                        showUploadList={false}
                        accept="audio/*"
                    >
                        <Button
                            size="small"
                            style={{
                                borderRadius: 8,
                                fontWeight: 600,
                                background: '#F1F5F9',
                                color: '#475569',
                                border: '1px solid #E2E8F0',
                                flexShrink: 0,
                            }}
                        >
                            Thay đổi
                        </Button>
                    </Upload>
                )}
            </div>
        );
    }

    // --- No Audio: Banner style (Image 3 style) ---
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
            borderRadius: 10,
            border: '1px solid #BFDBFE',
            marginBottom: 16,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1E40AF', fontWeight: 600, fontSize: 14 }}>
                <SoundOutlined style={{ fontSize: 16 }} />
                <span>Audio:</span>
                <span style={{ color: '#DC2626', fontWeight: 700 }}>Chưa có audio. Vui lòng upload!</span>
            </div>
            <Upload
                beforeUpload={handleBeforeUpload}
                onRemove={handleRemove}
                showUploadList={false}
                maxCount={1}
                accept="audio/*"
            >
                <Button icon={<UploadOutlined />} style={{ borderRadius: 8, fontWeight: 600, background: '#fff', borderColor: '#93C5FD' }}>
                    Upload audio
                </Button>
            </Upload>
        </div>
    );
};

export default AudioBanner;
