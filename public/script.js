document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatBox = document.getElementById('chat-box');
    const themeToggle = document.getElementById('theme-toggle');

    // --- Theme Toggle Logic ---
    const currentTheme = localStorage.getItem('theme');

    // Apply the saved theme on page load
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = '☀️';
    }

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        
        let theme = 'light';
        if (document.body.classList.contains('dark-mode')) {
            theme = 'dark';
            themeToggle.textContent = '☀️';
        } else {
            themeToggle.textContent = '🌙';
        }
        localStorage.setItem('theme', theme);
    });
    // --- End of Theme Toggle Logic ---

    // This array will store the entire conversation history.
    let conversationHistory = [];

    /**
     * A helper function to create and append a message element to the chat box.
     * @param {string} role - The role of the sender ('user' or 'bot').
     * @param {string} text - The message content.
     * @returns {HTMLElement} The created message element.
     */
    const addMessage = (role, text) => {
        const messageElement = document.createElement('div');
        // Using classList for cleaner class management
        messageElement.classList.add('message', `${role}-message`);
        
        // Use textContent instead of innerHTML to prevent XSS attacks.
        messageElement.textContent = text;
        
        chatBox.appendChild(messageElement);
        
        // Automatically scroll to the newest message.
        chatBox.scrollTop = chatBox.scrollHeight;
        
        return messageElement;
    };


    /**
     * Formats the bot's raw text response, converting simple markdown to HTML.
     * @param {string} text - The raw text from the bot.
     * @returns {string} The formatted HTML string.
     */
    const formatBotResponse = (text) => {
        // Process markdown line by line for better accuracy
        const lines = text.split('\n');
        let html = '';
        let inList = false;

        lines.forEach(line => {
            // Handle bold (**) and italics (*)
            let processedLine = line
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>');

            // Handle unordered list items (* or -)
            if (processedLine.trim().startsWith('* ') || processedLine.trim().startsWith('- ')) {
                if (!inList) {
                    html += '<ul>';
                    inList = true;
                }
                html += `<li>${processedLine.trim().substring(2)}</li>`;
            } else {
                if (inList) {
                    html += '</ul>';
                    inList = false;
                }
                // Handle horizontal rules (---)
                if (processedLine.trim() === '---') {
                    html += '<hr>';
                } else {
                    html += processedLine + '<br>';
                }
            }
        });

        if (inList) {
            html += '</ul>'; // Close the list if the text ends with it
        }

        // Clean up trailing <br> tags for a cleaner look
        if (html.endsWith('<br>')) {
            html = html.substring(0, html.length - 4);
        }
        
        return html;
    };

    // Handle the form submission event.
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent the default form submission (page refresh).
        
        const userText = userInput.value.trim();
        if (!userText) {
            return; // Don't send empty messages.
        }

        // 1. Add the user's message to the chat box and history.
        addMessage('user', userText);
        conversationHistory.push({ role: 'user', text: userText });
        
        // Clear the input field for the next message.
        userInput.value = '';

        // 2. Show a temporary "Thinking..." message from the bot.
        const thinkingMessageElement = addMessage('bot', 'Thinking...');

        try {
            // 3. Send the entire conversation history to the backend API.
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ conversation: conversationHistory }),
            });

            // Handle non-successful HTTP responses.
            if (!response.ok) {
                thinkingMessageElement.textContent = 'Failed to get response from server.';
                // We return here to avoid trying to parse a failed response.
                return;
            }

            const data = await response.json();

            // 4. Replace the "Thinking..." message with the AI's actual response.
            if (data && data.result) {
                // Format the bot's response and render it as HTML
                const formattedHtml = formatBotResponse(data.result);
                thinkingMessageElement.innerHTML = formattedHtml;

                // Add the original, unformatted AI response to the history for the next turn.
                conversationHistory.push({ role: 'model', text: data.result });
            } else {
                thinkingMessageElement.textContent = 'Sorry, no response received.';
            }

        } catch (error) {
            // 5. Handle network errors (e.g., server is down).
            console.error('Fetch error:', error);
            thinkingMessageElement.textContent = 'Failed to get response from server.';
        }
    });
});