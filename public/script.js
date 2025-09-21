/**
 * Chatbot Frontend Logic
 *
 * This script handles the client-side interaction for a simple chatbot. It listens for form
 * submissions, sends a user message and an optional file to a backend API, and updates
 * the chat box with the AI's response in real-time.
 */

// A lightweight function to convert basic markdown to HTML.
function renderMarkdown(markdownText) {
    let htmlText = markdownText;

    // Convert newlines to breaks for proper line spacing
    htmlText = htmlText.replace(/\n/g, '<br>');

    // **Bold** text
    htmlText = htmlText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // *Italic* text
    htmlText = htmlText.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // [Link Text](url)
    htmlText = htmlText.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-blue-500 hover:underline">$1</a>');

    // Simple headings (## Heading) - converts to <h3>
    htmlText = htmlText.replace(/^#{2}\s(.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>');

    // Simple lists (* list item) - wraps items in ul/li
    htmlText = htmlText.replace(/^\*\s(.*$)/gim, '<li class="ml-4 list-disc">$1</li>');
    if (htmlText.includes('<li>')) {
        htmlText = `<ul class="my-2">${htmlText}</ul>`;
    }

    return htmlText;
}

document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatBox = document.getElementById('chat-box');
    const sendButton = chatForm.querySelector('button[type="submit"]');
    const fileInput = document.getElementById('file-input');

    // This array will store the full conversation history for context
    const conversationHistory = [];

    /**
     * Appends a message to the chat box.
     * @param {string} message - The message content.
     * @param {'user' | 'bot'} role - The role of the message sender ('user' or 'bot').
     * @param {boolean} isMarkdown - True if the message should be rendered as markdown.
     * @returns {HTMLElement} The created message element.
     */
    const addMessage = (message, role, isMarkdown = false) => {
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('message-wrapper', role);

        if (role === 'bot') {
            const botAvatar = document.createElement('div');
            botAvatar.classList.add('bot-avatar');
            botAvatar.textContent = 'Gemini AI';
            messageWrapper.appendChild(botAvatar);
        }

        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');
        if (isMarkdown) {
            messageContent.innerHTML = renderMarkdown(message);
        } else {
            messageContent.textContent = message;
        }
        
        messageWrapper.appendChild(messageContent);
        chatBox.appendChild(messageWrapper);
        chatBox.scrollTop = chatBox.scrollHeight;

        return messageContent;
    };

    const handleChatSubmit = async (e) => {
        e.preventDefault();
        const userMessage = userInput.value.trim();
        const file = fileInput.files[0];

        if (!userMessage && !file) return;

        userInput.disabled = true;
        sendButton.disabled = true;
        fileInput.disabled = true;

        // Add user message to chat and clear input
        let displayMessage = userMessage;
        if (file) {
            displayMessage += `\n\n(Uploaded file: ${file.name})`;
        }
        addMessage(displayMessage, 'user');
        userInput.value = '';
        fileInput.value = '';

        const thinkingMessageElement = addMessage('Thinking...', 'bot');

        try {
            let endpoint = '/api/chat';
            const formData = new FormData();
            formData.append('prompt', userMessage);

            if (file) {
                if (file.type.startsWith('image/')) {
                    endpoint = '/generate-from-image';
                    formData.append('image', file);
                } else if (file.type.startsWith('audio/')) {
                    endpoint = '/generate-from-audio';
                    formData.append('audio', file);
                } else {
                    endpoint = '/generate-from-document';
                    formData.append('document', file);
                }
            } else {
                // If no file, use the standard chat endpoint with a JSON body
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages: [{ role: 'user', content: userMessage }] })
                });

                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                const data = await response.json();
                thinkingMessageElement.textContent = data.result;
                addMessage(data.result, 'bot', true);
                return;
            }

            // For file uploads, use FormData and the appropriate endpoint
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            const data = await response.json();
            thinkingMessageElement.textContent = data.result;
            addMessage(data.result, 'bot', true);

        } catch (error) {
            console.error('Error fetching chat response:', error);
            thinkingMessageElement.textContent = 'Failed to get a response. Please check the connection and try again.';
        } finally {
            userInput.disabled = false;
            sendButton.disabled = false;
            fileInput.disabled = false;
            userInput.focus();
        }
    };

    chatForm.addEventListener('submit', handleChatSubmit);
});
