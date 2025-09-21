/**
 * Chatbot Frontend Logic
 *
 * This script handles the client-side interaction for a simple chatbot. It listens for form
 * submissions, sends a user message to a backend API, and updates the chat box with
 * the AI's response in real-time, while also retaining the conversation history.
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
    htmlText = htmlText.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Simple headings (## Heading) - converts to <h3> for a larger font size
    htmlText = htmlText.replace(/^#{2}\s(.*$)/gim, '<h3>$1</h3>');

    // Simple lists (* list item) - wraps items in ul/li
    htmlText = htmlText.replace(/^\*\s(.*$)/gim, '<li>$1</li>');
    if (htmlText.includes('<li>')) {
        htmlText = `<ul>${htmlText}</ul>`;
    }

    return htmlText;
}


document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatBox = document.getElementById('chat-box');
    const sendButton = chatForm.querySelector('button[type="submit"]');

    /**
     * Appends a message to the chat box.
     * @param {string} message - The message content.
     * @param {'user' | 'bot'} role - The role of the message sender ('user' or 'bot').
     * @returns {HTMLElement} The created message element.
     */
    const addMessage = (message, role) => {
        const messageWrapper = document.createElement('div');
        const messageContent = document.createElement('div');
        
        // Common styling for message content
        messageContent.classList.add('p-3', 'rounded-lg', 'max-w-xs', 'md:max-w-md');
        messageContent.innerHTML = `<p class="text-sm">${message}</p>`; // Use innerHTML to render potential formatting

        if (role === 'user') {
            // User message styling
            messageWrapper.classList.add('flex', 'justify-end', 'mb-6');
            messageContent.classList.add('bg-blue-600', 'text-white');
        } else {
            // Bot message styling
            messageWrapper.classList.add('flex', 'items-start', 'gap-3', 'mb-6');
            const botAvatar = document.createElement('div');
            botAvatar.classList.add('bg-blue-500', 'text-white', 'rounded-full', 'h-8', 'w-8', 'flex', 'items-center', 'justify-center', 'font-bold', 'text-xs', 'flex-shrink-0');
            botAvatar.textContent = 'AI';
            messageContent.classList.add('bg-gray-200', 'text-gray-800');
            messageWrapper.appendChild(botAvatar);
        }

        messageWrapper.appendChild(messageContent);
        chatBox.appendChild(messageWrapper);

        // Scroll to the latest message
        chatBox.scrollTop = chatBox.scrollHeight;

        return messageContent; // Return the content div to be updated later
    };

    /**
     * Handles the chat form submission.
     * @param {Event} e - The form submission event.
     */
    const handleChatSubmit = async (e) => {
        e.preventDefault();
        const userMessage = userInput.value.trim();
        if (!userMessage) return;

        // Disable form while processing
        userInput.disabled = true;
        sendButton.disabled = true;

        // Add user message to chat and clear input
        addMessage(userMessage, 'user');
        userInput.value = '';

        // Add a temporary "Thinking..." message for the bot
        const thinkingMessageElement = addMessage('Thinking...', 'bot');

        try {
            // Send the message to the backend API
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [{
                        role: 'user',
                        content: userMessage
                    }]
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();

            // Replace "Thinking..." with the actual response or an error message
            if (data && data.result) {
                // Render the response with markdown
                thinkingMessageElement.querySelector('p').innerHTML = renderMarkdown(data.result);
            } else {
                thinkingMessageElement.querySelector('p').textContent = 'Sorry, no response was received from the server.';
            }

        } catch (error) {
            console.error('Error fetching chat response:', error);
            thinkingMessageElement.querySelector('p').textContent = 'Failed to get a response. Please check the connection and try again.';
            thinkingMessageElement.classList.add('bg-red-100', 'text-red-700');
        } finally {
             // Re-enable the form
             userInput.disabled = false;
             sendButton.disabled = false;
             userInput.focus();
        }
    };

    chatForm.addEventListener('submit', handleChatSubmit);
});
