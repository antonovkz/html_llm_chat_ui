let isDarkTheme = localStorage.getItem('isDarkTheme') === 'true';
const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const chatList = document.getElementById('chat-list');
const newChatButton = document.getElementById('new-chat-button');
const modelInput = document.getElementById('model-input');
const apiBaseInput = document.getElementById('apiBase-input');
const apiKeyInput = document.getElementById('apiKey-input');
const maxTokensInput = document.getElementById('maxTokens-input');
const temperatureInput = document.getElementById('temperature-input');
const topPInput = document.getElementById('topP-input');
const topKInput = document.getElementById('topK-input');
const minPInput = document.getElementById('minP-input');
const repetitionPenaltyInput = document.getElementById('repetitionPenalty-input');
const presencePenaltyInput = document.getElementById('presencePenalty-input');
const repetitionPenaltyRangeInput = document.getElementById('repetitionPenaltyRange-input');
const typicalPInput = document.getElementById('typicalP-input');
const tfsInput = document.getElementById('tfs-input');
const topAInput = document.getElementById('topA-input');
const guidanceScaleInput = document.getElementById('guidanceScale-input');
const penaltyAlphaInput = document.getElementById('penaltyAlpha-input');
const mirostatTauInput = document.getElementById('mirostatTau-input');
const mirostatEtaInput = document.getElementById('mirostatEta-input');
const encoderRepetitionPenaltyInput = document.getElementById('encoderRepetitionPenalty-input');
const systemInput = document.getElementById('system-input');
const resetSettingsButton = document.getElementById('reset-settings-button');
const toggleThemeButton = document.getElementById('toggle-theme-button');
const presetList = document.getElementById('preset-list');
const presetForm = document.getElementById('preset-form');
const existingPresetSelect = document.getElementById('existing-preset-select');
const presetNameInput = document.getElementById('preset-name-input');
const confirmPresetButton = document.getElementById('confirm-preset-button');
const cancelPresetButton = document.getElementById('cancel-preset-button');
const exportSettingsButton = document.getElementById('export-settings-button');
const importSettingsButton = document.getElementById('import-settings-button');
const importFileInput = document.getElementById('import-file-input');

let currentChatId = null;
let chatMessages = [];
let apiBase, apiKey, model, maxTokens, temperature, topP, topK, minP, repetitionPenalty, presencePenalty, repetitionPenaltyRange, typicalP, tfs, topA, guidanceScale, penaltyAlpha, mirostatTau, mirostatEta, encoderRepetitionPenalty, systemPrompt;

document.addEventListener('DOMContentLoaded', () => {
    presetList.addEventListener('input', handlePresetListChange);
    presetList.addEventListener('change', handlePresetListChange);

    loadPresets();
    initializePresetForm();

    confirmPresetButton.addEventListener('click', savePreset);
    cancelPresetButton.addEventListener('click', cancelPresetForm);

    presetList.addEventListener('change', loadSelectedPreset);

    modelInput.addEventListener('focus', fetchModels);
    modelInput.addEventListener('blur', () => {
        setTimeout(() => {
            document.getElementById('model-dropdown').style.display = 'none';
        }, 200);
    });

    exportSettingsButton.addEventListener('click', exportSettings);
    importSettingsButton.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', importSettings);
    loadChats();
    if (localStorage.getItem('currentChatId')) {
        currentChatId = localStorage.getItem('currentChatId');
        loadChat(currentChatId);
    } else {
        createNewChat();
    }

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    newChatButton.addEventListener('click', createNewChat);
    resetSettingsButton.addEventListener('click', resetSettings);
    toggleThemeButton.addEventListener('click', toggleTheme);

    document.querySelectorAll('.settings-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const input = document.getElementById(checkbox.id.replace('-checkbox', '-input'));
            input.disabled = !checkbox.checked;
            saveSettings();
        });
    });

    document.querySelectorAll('.settings-input').forEach(input => {
        input.addEventListener('input', saveSettings);
    });

    systemInput.addEventListener('input', () => {
        systemPrompt = systemInput.value.trim();
        updateSystemPromptInChat();
        saveSettings();
    });

    if (isDarkTheme) {
        applyDarkTheme();
    }
});

function loadSelectedPreset() {
    const selectedPresetName = presetList.value;
    if (selectedPresetName === 'update-create') return;

    const presets = JSON.parse(localStorage.getItem('presets')) || {};
    const selectedPreset = presets[selectedPresetName];
    if (!selectedPreset) {
        console.error('Preset not found:', selectedPresetName);
        return;
    }

    loadSettings(selectedPreset);

    const chats = JSON.parse(localStorage.getItem('chats')) || {};
    if (chats[currentChatId]) {
        chats[currentChatId].settings.presetName = selectedPresetName;
        localStorage.setItem('chats', JSON.stringify(chats));
    }

    console.log('Preset loaded:', selectedPresetName, selectedPreset);
    saveSettings();
}

function initializePresetForm() {
    const presets = JSON.parse(localStorage.getItem('presets')) || {};
    const chats = JSON.parse(localStorage.getItem('chats')) || {};
    const currentChatSettings = chats[currentChatId]?.settings || {};
    const currentPresetName = currentChatSettings.presetName;

    const currentModelName = modelInput.value.trim();

    if (!currentPresetName || !presets[currentPresetName]) {
        let presetName = `${currentModelName}_preset`;
        let counter = 1;
        while (presets[presetName]) {
            presetName = `${currentModelName}_preset_${counter}`;
            counter++;
        }
        presetNameInput.value = presetName;
        confirmPresetButton.textContent = 'Save';
    } else {
        const selectedPreset = presets[currentPresetName];
        if (selectedPreset.model === currentModelName) {
            presetNameInput.value = currentPresetName;
            confirmPresetButton.textContent = 'Update';
        } else {
            let presetName = `${currentModelName}_preset`;
            let counter = 1;
            while (presets[presetName]) {
                presetName = `${currentModelName}_preset_${counter}`;
                counter++;
            }
            presetNameInput.value = presetName;
            confirmPresetButton.textContent = 'Save';
        }
    }
}

function handlePresetListChange() {
    const selectedValue = presetList.value;
    if (selectedValue === 'update-create') {
        presetList.style.display = 'none';
        presetForm.style.display = 'block';
    } else {
        presetList.style.display = 'block';
        presetForm.style.display = 'none';
    }
}

function savePreset() {
    const presetName = presetNameInput.value.trim();
    if (!presetName) {
        alert('Please enter a preset name.');
        return;
    }

    const settings = getCurrentSettings();
    const presets = JSON.parse(localStorage.getItem('presets')) || {};
    presets[presetName] = settings;
    localStorage.setItem('presets', JSON.stringify(presets));

    const chats = JSON.parse(localStorage.getItem('chats')) || {};
    if (chats[currentChatId]) {
        chats[currentChatId].settings.presetName = presetName;
        localStorage.setItem('chats', JSON.stringify(chats));
    }

    updatePresets();
    cancelPresetForm();
    console.log('Preset saved:', presetName, settings);
}

function updatePresets() {
    loadPresets();
    const chats = JSON.parse(localStorage.getItem('chats')) || {};
    const currentChatSettings = chats[currentChatId]?.settings || {};
    const currentPresetName = currentChatSettings.presetName || 'no-preset';

    if (currentPresetName) {
        presetList.value = currentPresetName;
    } else {
        presetList.value = 'no-preset';
    }
}

function cancelPresetForm() {
    presetList.style.display = 'block';
    presetForm.style.display = 'none';
    presetNameInput.value = '';
}

function loadPresets() {
    presetList.innerHTML = '';
    
    const noPresetOption = document.createElement('option');
    noPresetOption.value = 'no-preset';
    noPresetOption.textContent = 'No Preset';
    presetList.appendChild(noPresetOption);

    const option = document.createElement('option');
    option.value = 'update-create';
    option.textContent = 'Update/Create new preset...';
    presetList.appendChild(option);

    const presets = JSON.parse(localStorage.getItem('presets')) || {};
    for (const presetName in presets) {
        const option = document.createElement('option');
        option.value = presetName;
        option.textContent = presetName;
        presetList.appendChild(option);
    }

    const chats = JSON.parse(localStorage.getItem('chats')) || {};
    const currentChatSettings = chats[currentChatId]?.settings || {};
    const currentPresetName = currentChatSettings.presetName || 'no-preset';

    if (currentPresetName && presets[currentPresetName]) {
        presetList.value = currentPresetName;
    } else {
        presetList.value = 'no-preset';
    }
}

function exportSettings() {
    const chats = JSON.parse(localStorage.getItem('chats')) || {};
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    const data = {
        chats: chats,
        settings: settings,
        isDarkTheme: isDarkTheme
    };

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chat_settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importSettings(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            localStorage.setItem('chats', JSON.stringify(data.chats));
            localStorage.setItem('settings', JSON.stringify(data.settings));
            localStorage.setItem('isDarkTheme', data.isDarkTheme);

            isDarkTheme = data.isDarkTheme;
            if (isDarkTheme) {
                applyDarkTheme();
            } else {
                removeDarkTheme();
            }

            loadChats();
            if (localStorage.getItem('currentChatId')) {
                currentChatId = localStorage.getItem('currentChatId');
                loadChat(currentChatId);
            } else {
                createNewChat();
            }

            console.log('Settings imported:', data);
        } catch (error) {
            console.error('Error importing settings:', error);
        }
    };
    reader.readAsText(file);
}

function fetchModels() {
    const dropdown = document.getElementById('model-dropdown');
    dropdown.innerHTML = '';
    dropdown.style.display = 'block';

    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    fetch(apiBase + '/models', {
        headers: headers
    })
        .then(response => response.json())
        .then(data => {
            const models = data.data.map(model => model.id);
            console.log(models);
            models.forEach(modelId => {
                const item = document.createElement('div');
                item.classList.add('dropdown-item');
                if (isDarkTheme) {
                    item.classList.add('dark');
                }
                item.textContent = modelId;
                item.addEventListener('click', () => {
                    modelInput.value = modelId;
                    dropdown.style.display = 'none';
                    saveSettings();
                });
                console.log(dropdown);
                dropdown.appendChild(item);
            });
        })
        .catch(error => {
            console.error('Error fetching models:', error);
        });
}

async function sendMessage() {
    const message = userInput.value.trim();
    if (message === '') return;

    await appendMessage('user', message);
    userInput.value = '';
    sendButton.disabled = true;

    sendRequest(chatMessages);
}

async function regenerateMessage(messageElement) {
    const messageId = messageElement.dataset.messageId;
    if (!messageId) return;

    const messageIndex = chatMessages.findIndex(msg => msg.id == messageId);
    if (messageIndex === -1) return;

    while (chatContainer.lastChild !== messageElement) {
        chatContainer.removeChild(chatContainer.lastChild);
        chatMessages.pop();
    }

    chatContainer.removeChild(messageElement);
    chatMessages.splice(messageIndex, 1);

    const systemMessageIndex = chatMessages.findIndex(msg => msg.role === 'system');
    if (systemMessageIndex !== -1) {
        chatMessages[systemMessageIndex].content = systemPrompt;
    } else {
        const systemMessageId = Date.now() + Math.random();
        chatMessages.unshift({ id: systemMessageId, role: 'system', content: systemPrompt });
    }

    sendButton.disabled = true;
    sendRequest(chatMessages);
}

async function sendRequest(messages) {
    const payload = {
        model: model,
        messages: messages.map(message => {
            return {
                role: message.role,
                content: message.content
            };
        }),
        stream: true
    };

    addSettingsToPayload(payload);
    payload.messages = payload.messages.filter(msg => !(msg.role === 'system' && msg.content.trim() === ''));

    const headers = {
        'Content-Type': 'application/json'
    };

    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    console.log('Payload for sendRequest:', payload);

    fetch(apiBase + "/chat/completions", {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    })
        .then(response => {
            if (!response.body) {
                throw new Error('No response body');
            }
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let partialData = '';
            let currentBotMessageContent = '';
            let currentBotMessageElement = null;

            async function readStream() {
                const { done, value } = await reader.read();
                if (done) {
                    if (currentBotMessageElement) {
                        currentBotMessageElement.innerHTML = await parseAndHighlight(currentBotMessageContent);
                        addRegenerateButton(currentBotMessageElement);
                        hljs.highlightAll();
                    }
                    sendButton.disabled = false;
                    const assistantMessageId = Date.now() + Math.random();
                    currentBotMessageElement.dataset.messageId = assistantMessageId;
                    chatMessages.push({ id: assistantMessageId, role: 'assistant', content: currentBotMessageContent });
                    saveChat();
                    return;
                }
                partialData += decoder.decode(value, { stream: true });
                const chunks = partialData.split('data: ');
                partialData = chunks.pop();
                for (const chunk of chunks) {
                    if (chunk === '' || chunk === '[DONE]') continue;
                    try {
                        const data = JSON.parse(chunk);
                        if (!currentBotMessageElement) {
                            currentBotMessageElement = createMessageElement('assistant');
                            chatContainer.appendChild(currentBotMessageElement);
                        }
                        const newContent = data.choices[0].delta.content || '';
                        currentBotMessageContent += newContent;
                        currentBotMessageElement.innerHTML = await parseAndHighlight(currentBotMessageContent);
                        scrollChatToBottom();
                    } catch (e) {
                        console.error('Error parsing chunk:', chunk, e);
                    }
                }
                readStream();
            }
            readStream().catch(error => {
                console.error('Error reading stream:', error);
                sendButton.disabled = false;
            });
        })
        .catch(error => {
            console.error('Error sending message:', error);
            sendButton.disabled = false;
        });
}

function addSettingsToPayload(payload) {
    if (document.getElementById('maxTokens-checkbox').checked) payload.max_tokens = maxTokens;
    if (document.getElementById('temperature-checkbox').checked) payload.temperature = temperature;
    if (document.getElementById('topP-checkbox').checked) payload.top_p = topP;
    if (document.getElementById('topK-checkbox').checked) payload.top_k = topK;
    if (document.getElementById('minP-checkbox').checked) payload.min_p = minP;
    if (document.getElementById('repetitionPenalty-checkbox').checked) payload.repetition_penalty = repetitionPenalty;
    if (document.getElementById('presencePenalty-checkbox').checked) payload.presence_penalty = presencePenalty;
    if (document.getElementById('repetitionPenaltyRange-checkbox').checked) payload.repetition_penalty_range = repetitionPenaltyRange;
    if (document.getElementById('typicalP-checkbox').checked) payload.typical_p = typicalP;
    if (document.getElementById('tfs-checkbox').checked) payload.tfs = tfs;
    if (document.getElementById('topA-checkbox').checked) payload.top_a = topA;
    if (document.getElementById('guidanceScale-checkbox').checked) payload.guidance_scale = guidanceScale;
    if (document.getElementById('penaltyAlpha-checkbox').checked) payload.penalty_alpha = penaltyAlpha;
    if (document.getElementById('mirostatTau-checkbox').checked) payload.mirostat_tau = mirostatTau;
    if (document.getElementById('mirostatEta-checkbox').checked) payload.mirostat_eta = mirostatEta;
    if (document.getElementById('encoderRepetitionPenalty-checkbox').checked) payload.encoder_repetition_penalty = encoderRepetitionPenalty;
}

async function parseAndHighlight(content) {
    const hiddenContainer = document.getElementById('hidden-render-container');
    hiddenContainer.innerHTML = '';
    //const parsedContent = marked.parse(content);
    hiddenContainer.innerHTML = content;
    if (MathJax && MathJax.typesetPromise) {
        await MathJax.typesetPromise([hiddenContainer]);
    } else {
        console.warn('MathJax is not loaded or typesetPromise is not available');
    }
    hiddenContainer.innerHTML = marked.parse(hiddenContainer.innerHTML);
    hiddenContainer.querySelectorAll('code').forEach(codeBlock => {
        hljs.highlightBlock(codeBlock);
    });
    const resultHTML = hiddenContainer.innerHTML;
    hiddenContainer.innerHTML = '';
    return resultHTML;
}

async function appendMessage(sender, content) {
    const messageElement = createMessageElement(sender);
    messageElement.innerHTML = await parseAndHighlight(content);

    const messageId = Date.now() + Math.random();
    messageElement.dataset.messageId = messageId;

    chatContainer.appendChild(messageElement);
    chatMessages.push({ id: messageId, role: sender, content: content });
    if (sender === 'user') {
        addEditButton(messageElement);
    } else if (sender === 'assistant') {
        addRegenerateButton(messageElement);
    }
    scrollChatToBottom();
    hljs.highlightAll();
    saveChat();
    if (MathJax && MathJax.typesetPromise) {
        await MathJax.typesetPromise([messageElement]);
    } else {
        console.warn('MathJax is not loaded or typesetPromise is not available');
    }
}

function createMessageElement(role) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', role);
    return messageElement;
}

function scrollChatToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addRegenerateButton(messageElement) {
    const regenerateButton = document.createElement('span');
    regenerateButton.classList.add('regenerate-button');
    regenerateButton.textContent = '🔄';
    regenerateButton.addEventListener('click', () => regenerateMessage(messageElement));
    messageElement.appendChild(regenerateButton);
}

function addEditButton(messageElement) {
    const editButton = document.createElement('span');
    editButton.classList.add('edit-button');
    editButton.textContent = '✏️';
    editButton.addEventListener('click', () => editMessage(messageElement));
    messageElement.appendChild(editButton);
}

async function editMessage(messageElement) {
    const messageId = messageElement.dataset.messageId;
    if (!messageId) return;

    const messageIndex = chatMessages.findIndex(msg => msg.id == messageId);
    if (messageIndex === -1) return;

    const originalContent = chatMessages[messageIndex].content;
    const textarea = document.createElement('textarea');
    textarea.value = originalContent;
    textarea.style.width = '100%';
    textarea.style.height = '100px';
    textarea.style.marginTop = '10px';

    const controls = document.createElement('div');
    controls.classList.add('edit-controls');

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.classList.add('cancel');
    cancelButton.addEventListener('click', async () => {
        await restoreMessageElement(messageElement, originalContent, addEditButton);
    });

    const sendButton = document.createElement('button');
    sendButton.textContent = 'Send';
    sendButton.addEventListener('click', async () => {
        const newContent = textarea.value.trim();
        if (newContent === '') return;

        chatMessages[messageIndex].content = newContent;
        await restoreMessageElement(messageElement, newContent, addEditButton);

        while (chatContainer.lastChild !== messageElement) {
            chatContainer.removeChild(chatContainer.lastChild);
            chatMessages.pop();
        }

        sendRequest(chatMessages);
    });

    controls.appendChild(cancelButton);
    controls.appendChild(sendButton);

    messageElement.textContent = '';
    messageElement.appendChild(textarea);
    messageElement.appendChild(controls);

    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendButton.click();
        } else if (e.key === 'Escape') {
            cancelButton.click();
        }
    });

    textarea.focus();
}

async function restoreMessageElement(messageElement, content, addButton) {
    messageElement.textContent = '';
    messageElement.innerHTML = await parseAndHighlight(content);
    addButton(messageElement);
    hljs.highlightAll();
}

function loadChats() {
    chatList.innerHTML = '';
    const chats = JSON.parse(localStorage.getItem('chats')) || {};
    for (const chatId in chats) {
        const chatItem = document.createElement('li');
        const chatButton = document.createElement('button');
        chatButton.textContent = `Chat #${chatId}`;
        chatButton.addEventListener('click', () => loadChat(chatId));
        chatItem.appendChild(chatButton);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.classList.add('delete');
        deleteButton.addEventListener('click', () => deleteChat(chatId));
        chatItem.appendChild(deleteButton);
        chatList.appendChild(chatItem);
    }
}

function createNewChat() {
    const chats = JSON.parse(localStorage.getItem('chats')) || {};
    const newChatId = Object.keys(chats).length;
    const currentSettings = getCurrentSettings();
    chats[newChatId] = {
        messages: [],
        settings: currentSettings
    };
    chats[newChatId].settings.presetName = 'no-preset';
    localStorage.setItem('chats', JSON.stringify(chats));
    currentChatId = newChatId;
    localStorage.setItem('currentChatId', currentChatId);
    chatContainer.innerHTML = '';
    chatMessages = chats[newChatId].messages;
    loadChats();
    loadSettings(currentSettings);
    systemInput.value = systemPrompt = '';
    saveSettings();
    updatePresets();
    presetList.value = 'no-preset';
}

async function loadChat(chatId) {
    currentChatId = chatId;
    localStorage.setItem('currentChatId', chatId);
    const chats = JSON.parse(localStorage.getItem('chats')) || {};
    const chat = chats[chatId];
    if (!chat) {
        console.error('Chat not found:', chatId);
        return;
    }
    chatMessages = chat.messages || [];
    const settings = chat.settings || getDefaultSettings();

    loadSettings(settings);
    initializePresetForm();

    chatContainer.innerHTML = '';

    for (const message of chatMessages) {
        if (!message.id) {
            message.id = Date.now() + Math.random();
        }
        if (message.role === 'system') {
            systemInput.value = systemPrompt = message.content;
        } else {
            const messageElement = createMessageElement(message.role);
            messageElement.innerHTML = await parseAndHighlight(message.content);

            messageElement.dataset.messageId = message.id;

            chatContainer.appendChild(messageElement);
            if (message.role === 'assistant') {
                addRegenerateButton(messageElement);
            } else if (message.role === 'user') {
                addEditButton(messageElement);
            }
        }
    }

    const currentPresetName = settings.presetName || 'no-preset';
    presetList.value = currentPresetName;

    scrollChatToBottom();
    loadChats();
    hljs.highlightAll();
    updatePresets();
    console.log('Chat loaded:', chatMessages);
}

function saveChat() {
    const chats = JSON.parse(localStorage.getItem('chats')) || {};
    if (!chats[currentChatId]) {
        chats[currentChatId] = {
            messages: [],
            settings: {}
        };
    }
    chats[currentChatId].messages = chatMessages;
    chats[currentChatId].settings = getCurrentSettings();
    localStorage.setItem('chats', JSON.stringify(chats));
    console.log('Saving chat:', chats[currentChatId]);
}

function deleteChat(chatId) {
    const chats = JSON.parse(localStorage.getItem('chats')) || {};
    delete chats[chatId];
    localStorage.setItem('chats', JSON.stringify(chats));
    if (currentChatId === chatId) {
        createNewChat();
    } else {
        loadChats();
    }
}

function getDefaultSettings() {
    return {
        apiBase: "http://127.0.0.1:9000/v1",
        apiKey: "",
        model: "gpt-3.5-turbo",
        maxTokens: 8192,
        temperature: 0.7,
        topP: 0.8,
        topK: 20,
        minP: 0,
        repetitionPenalty: 1,
        presencePenalty: 0,
        repetitionPenaltyRange: 1024,
        typicalP: 1,
        tfs: 1,
        topA: 0,
        guidanceScale: 1,
        penaltyAlpha: 0,
        mirostatTau: 5,
        mirostatEta: 0.1,
        encoderRepetitionPenalty: 1,
        systemPrompt: '',
        checkboxes: {},
        presetName: 'no-preset'
    };
}

function getCurrentSettings() {
    const settings = {
        apiBase: apiBaseInput.value.trim(),
        apiKey: apiKeyInput.value.trim(),
        model: modelInput.value.trim(),
        maxTokens: parseInt(maxTokensInput.value.trim()) || 8192,
        temperature: parseFloat(temperatureInput.value.trim()) || 0.7,
        topP: parseFloat(topPInput.value.trim()) || 0.8,
        topK: parseInt(topKInput.value.trim()) || 20,
        minP: parseFloat(minPInput.value.trim()) || 0,
        repetitionPenalty: parseFloat(repetitionPenaltyInput.value.trim()) || 1,
        presencePenalty: parseFloat(presencePenaltyInput.value.trim()) || 0,
        repetitionPenaltyRange: parseInt(repetitionPenaltyRangeInput.value.trim()) || 1024,
        typicalP: parseFloat(typicalPInput.value.trim()) || 1,
        tfs: parseFloat(tfsInput.value.trim()) || 1,
        topA: parseFloat(topAInput.value.trim()) || 0,
        guidanceScale: parseFloat(guidanceScaleInput.value.trim()) || 1,
        penaltyAlpha: parseFloat(penaltyAlphaInput.value.trim()) || 0,
        mirostatTau: parseFloat(mirostatTauInput.value.trim()) || 5,
        mirostatEta: parseFloat(mirostatEtaInput.value.trim()) || 0.1,
        encoderRepetitionPenalty: parseFloat(encoderRepetitionPenaltyInput.value.trim()) || 1,
        systemPrompt: systemInput.value.trim(),
        checkboxes: {},
        presetName: document.getElementById('preset-list').value
    };
    document.querySelectorAll('.settings-checkbox').forEach(checkbox => {
        settings.checkboxes[checkbox.id] = checkbox.checked;
    });
    return settings;
}

function loadSettings(settings) {
    if (!settings) {
        settings = getDefaultSettings();
    }

    apiBase = settings.apiBase;
    apiKey = settings.apiKey;

    model = settings.model;
    maxTokens = settings.maxTokens;
    temperature = settings.temperature;
    topP = settings.topP;
    topK = settings.topK;
    minP = settings.minP;
    repetitionPenalty = settings.repetitionPenalty;
    presencePenalty = settings.presencePenalty;
    repetitionPenaltyRange = settings.repetitionPenaltyRange;
    typicalP = settings.typicalP;
    tfs = settings.tfs;
    topA = settings.topA;
    guidanceScale = settings.guidanceScale;
    penaltyAlpha = settings.penaltyAlpha;
    mirostatTau = settings.mirostatTau;
    mirostatEta = settings.mirostatEta;
    encoderRepetitionPenalty = settings.encoderRepetitionPenalty;
    systemPrompt = settings.systemPrompt;

    apiBaseInput.value = apiBase;
    apiKeyInput.value = apiKey;
    modelInput.value = model;
    maxTokensInput.value = maxTokens;
    temperatureInput.value = temperature;
    topPInput.value = topP;
    topKInput.value = topK;
    minPInput.value = minP;
    repetitionPenaltyInput.value = repetitionPenalty;
    presencePenaltyInput.value = presencePenalty;
    repetitionPenaltyRangeInput.value = repetitionPenaltyRange;
    typicalPInput.value = typicalP;
    tfsInput.value = tfs;
    topAInput.value = topA;
    guidanceScaleInput.value = guidanceScale;
    penaltyAlphaInput.value = penaltyAlpha;
    mirostatTauInput.value = mirostatTau;
    mirostatEtaInput.value = mirostatEta;
    encoderRepetitionPenaltyInput.value = encoderRepetitionPenalty;
    systemInput.value = systemPrompt;

    document.querySelectorAll('.settings-checkbox').forEach(checkbox => {
        const isChecked = settings.checkboxes[checkbox.id] || false;
        checkbox.checked = isChecked;
        const input = document.getElementById(checkbox.id.replace('-checkbox', '-input'));
        input.disabled = !isChecked;
    });

    if (settings.presetName && settings.presetName !== 'no-preset') {
        presetList.value = settings.presetName;
    } else {
        presetList.value = 'no-preset';
    }
    console.log('Settings loaded:', settings);
}

function saveSettings() {
    const settings = getCurrentSettings();
    const chats = JSON.parse(localStorage.getItem('chats')) || {};
    if (!chats[currentChatId]) {
        chats[currentChatId] = {
            messages: [],
            settings: {}
        };
    }
    chats[currentChatId].settings = settings;
    localStorage.setItem('chats', JSON.stringify(chats));

    apiBase = settings.apiBase;
    apiKey = settings.apiKey;
    model = settings.model;
    maxTokens = settings.maxTokens;
    temperature = settings.temperature;
    topP = settings.topP;
    topK = settings.topK;
    minP = settings.minP;
    repetitionPenalty = settings.repetitionPenalty;
    presencePenalty = settings.presencePenalty;
    repetitionPenaltyRange = settings.repetitionPenaltyRange;
    typicalP = settings.typicalP;
    tfs = settings.tfs;
    topA = settings.topA;
    guidanceScale = settings.guidanceScale;
    penaltyAlpha = settings.penaltyAlpha;
    mirostatTau = settings.mirostatTau;
    mirostatEta = settings.mirostatEta;
    encoderRepetitionPenalty = settings.encoderRepetitionPenalty;
    systemPrompt = settings.systemPrompt;

    console.log('Settings saved:', settings);
}

function resetSettings() {
    const defaultSettings = getDefaultSettings();
    const chats = JSON.parse(localStorage.getItem('chats')) || {};
    if (chats[currentChatId]) {
        defaultSettings.presetName = chats[currentChatId].settings.presetName || 'no-preset';
    }
    loadSettings(defaultSettings);
    saveSettings();
    updateSystemPromptInChat();
    console.log('Settings reset to default:', defaultSettings);
}

function updateSystemPromptInChat() {
    const systemMessageIndex = chatMessages.findIndex(msg => msg.role === 'system');
    if (systemMessageIndex !== -1) {
        chatMessages[systemMessageIndex].content = systemPrompt;
    } else {
        const systemMessageId = Date.now() + Math.random();
        chatMessages.unshift({ id: systemMessageId, role: 'system', content: systemPrompt });
    }
    saveChat();
}

function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    localStorage.setItem('isDarkTheme', isDarkTheme);

    if (isDarkTheme) {
        applyDarkTheme();
    } else {
        removeDarkTheme();
    }
}

function applyDarkTheme() {
    document.body.classList.add('dark');
    chatContainer.classList.add('dark');
    userInput.classList.add('dark');
    systemInput.classList.add('dark');
    document.querySelectorAll('.settings-input').forEach(input => input.classList.add('dark'));
    document.querySelectorAll('.settings-checkbox').forEach(checkbox => {
        const input = document.getElementById(checkbox.id.replace('-checkbox', '-input'));
        input.classList.add('dark');
    });
    document.querySelectorAll('.edit-button').forEach(button => button.classList.add('dark'));
    document.querySelectorAll('.regenerate-button').forEach(button => button.classList.add('dark'));
    document.querySelectorAll('.edit-controls button.cancel').forEach(button => button.classList.add('dark'));
    document.getElementById('sidebar').classList.add('dark');
    document.getElementById('settings').classList.add('dark');
    document.getElementById('model-dropdown').classList.add('dark');
    document.querySelectorAll('.tooltip .tooltiptext').forEach(tooltip => tooltip.classList.add('dark'));
    const themeLink = document.getElementById('theme-link');
    themeLink.href = 'dark.min.css';
}

function removeDarkTheme() {
    document.body.classList.remove('dark');
    chatContainer.classList.remove('dark');
    userInput.classList.remove('dark');
    systemInput.classList.remove('dark');
    document.querySelectorAll('.settings-input').forEach(input => input.classList.remove('dark'));
    document.querySelectorAll('.settings-checkbox').forEach(checkbox => {
        const input = document.getElementById(checkbox.id.replace('-checkbox', '-input'));
        input.classList.remove('dark');
    });
    document.querySelectorAll('.edit-button').forEach(button => button.classList.remove('dark'));
    document.querySelectorAll('.regenerate-button').forEach(button => button.classList.remove('dark'));
    document.querySelectorAll('.edit-controls button.cancel').forEach(button => button.classList.remove('dark'));
    document.getElementById('sidebar').classList.remove('dark');
    document.getElementById('settings').classList.remove('dark');
    document.getElementById('model-dropdown').classList.remove('dark');
    document.querySelectorAll('.tooltip .tooltiptext').forEach(tooltip => tooltip.classList.remove('dark'));
    const themeLink = document.getElementById('theme-link');
    themeLink.href = 'default.min.css';
}
