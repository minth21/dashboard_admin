export const QUILL_MODULES = {
    toolbar: [
        [{ 'header': [1, 2, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
        ['link', 'image'],
        ['clean']
    ],
};

export const QUILL_FORMATS = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image'
];

/**
 * Builds HTML for image-based passages from a list of files.
 * This is used in Part 6 & 7 modals when passage type is set to "image".
 */
export const buildImagePassageHtml = async (fileList: any[]): Promise<string> => {
    let passageHtml = '';
    
    // Sort files by name or uid to maintain order if needed
    const sortedFiles = [...fileList].sort((a, b) => {
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB);
    });

    for (const file of sortedFiles) {
        // Extract URL from the response or the file object itself
        const url = file.url || file.response?.url || file.response?.secure_url;
        if (url) {
            passageHtml += `<p><img src="${url}" style="max-width: 100%; display: block; margin-bottom: 10px;" /></p>`;
        }
    }
    
    return passageHtml;
};
