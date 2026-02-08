import React from 'react';

interface AudioPlayerProps {
    src: string;
    style?: React.CSSProperties;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, style }) => {
    if (!src) return null;

    return (
        <div style={{ ...style, width: '100%' }}>
            <audio
                controls
                src={src}
                style={{ width: '100%' }}
                preload="metadata"
            >
                Your browser does not support the audio element.
            </audio>
        </div>
    );
};

export default AudioPlayer;
