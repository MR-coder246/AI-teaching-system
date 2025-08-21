// script.js

document.addEventListener('DOMContentLoaded', () => {
    // Page Elements
    const uploadPage = document.getElementById('upload-page');
    const chatInterface = document.getElementById('chat-interface');

    // Upload Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const uploadStatus = document.getElementById('upload-status');

    // Chat Elements
    const chatWindow = document.getElementById('chat-window');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const documentNameEl = document.getElementById('document-name');
    const newDocBtn = document.getElementById('new-doc-btn');
    
    // --- File Upload Logic ---

    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFileUpload(fileInput.files[0]);
        }
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });

    async function handleFileUpload(file) {
        if (file.type !== 'application/pdf') {
            setStatus('Please upload a PDF file.', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('pdfFile', file);
        
        // Set the document name in the UI immediately
        documentNameEl.textContent = file.name;
        setStatus('Uploading and processing...', 'loading');

        try {
            // Use the new endpoint /api/upload
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            // Handle response based on the new server structure
            if (response.ok) {
                setStatus(result.message, 'success');
                setTimeout(() => {
                    uploadPage.classList.add('hidden');
                    chatInterface.classList.remove('hidden');
                    addMessage('Welcome! Ask me anything about the document.', 'ai');
                }, 1000);
            } else {
                throw new Error(result.error || 'Upload failed.');
            }
        } catch (error) {
            console.error('Upload Error:', error);
            setStatus(`Error: ${error.message}`, 'error');
        }
    }

    function setStatus(message, type) {
        uploadStatus.textContent = message;
        uploadStatus.className = type; // 'success', 'error', 'loading'
    }

    // --- Chat Logic ---

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    newDocBtn.addEventListener('click', () => {
        // Reset the state
        uploadPage.classList.remove('hidden');
        chatInterface.classList.add('hidden');
        chatWindow.innerHTML = '';
        fileInput.value = ''; // Reset file input
        setStatus('', ''); // Clear status
    });

    async function sendMessage() {
        const question = chatInput.value.trim();
        if (!question) return;

        addMessage(question, 'user');
        chatInput.value = '';
        addMessage('...', 'ai', true); // Add loading indicator

        try {
            // Use the new endpoint /api/chat
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: question }),
            });

            const result = await response.json();
            
            const loadingMessage = chatWindow.querySelector('.loading');
            if (loadingMessage) loadingMessage.remove();
            
            // Handle response based on new server structure
            if (response.ok) {
                let formattedAnswer = result.answer.replace(/\n/g, '<br>');
                addMessage(formattedAnswer, 'ai');
            } else {
                throw new Error(result.error || 'Failed to get answer.');
            }
        } catch (error) {
            console.error('Chat Error:', error);
            const loadingMessage = chatWindow.querySelector('.loading');
            if (loadingMessage) loadingMessage.remove();
            addMessage(`Sorry, something went wrong: ${error.message}`, 'ai');
        }
    }

    function addMessage(text, sender, isLoading = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);

        const iconDiv = document.createElement('div');
        iconDiv.classList.add('icon');
        iconDiv.innerHTML = sender === 'user' ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-robot"></i>';

        const textDiv = document.createElement('div');
        textDiv.classList.add('text');
        
        if (isLoading) {
            messageDiv.classList.add('loading');
            textDiv.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
        } else {
            textDiv.innerHTML = text;
        }

        messageDiv.appendChild(iconDiv);
        messageDiv.appendChild(textDiv);
        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }
});