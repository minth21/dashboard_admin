import React, { useRef, useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'quill/dist/quill.snow.css';
import { message } from 'antd';
import api from '../services/api';

interface InstructionEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    style?: React.CSSProperties; // Add style prop
}

const InstructionEditor: React.FC<InstructionEditorProps> = ({ value, onChange, placeholder, style }) => {
    const quillRef = useRef<ReactQuill>(null);

    const imageHandler = () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files?.[0];
            if (file) {
                const formData = new FormData();
                formData.append('image', file);
                try {
                    const res = await api.post('/upload/image', formData);
                    if (res.data.success) {
                        const url = res.data.url;
                        const quill = quillRef.current?.getEditor();
                        const range = quill?.getSelection(true);

                        if (quill) {
                            // Insert image at current cursor position or end
                            const index = range ? range.index : quill.getLength();
                            quill.insertEmbed(index, 'image', url);
                            // Move cursor to next position
                            quill.setSelection(index + 1, 0);
                        }
                    } else {
                        message.error('Upload ảnh thất bại');
                    }
                } catch (error) {
                    message.error('Có lỗi xảy ra khi upload ảnh');
                }
            }
        };
    };

    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'color': [] }, { 'background': [] }],
                ['link', 'image'],
                ['clean']
            ],
            handlers: {
                image: imageHandler
            }
        }
    }), []);

    return (
        <div style={style}>
            <ReactQuill
                ref={quillRef}
                theme="snow"
                value={value}
                onChange={onChange}
                modules={modules}
                placeholder={placeholder}
                style={{ backgroundColor: '#fff', height: '100%', display: 'flex', flexDirection: 'column' }}
            />
        </div>
    );
};

export default InstructionEditor;
