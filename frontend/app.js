const BASE_URL = "http://127.0.0.1:8000";

// ── DOM refs ──────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const statusDot = $("status-dot");
const statusLabel = $("status-label");
const menuBtn = $("menu-btn");
const sidebar = $("sidebar");
const sidebarOverlay = $("sidebar-overlay");
const dropZone = $("drop-zone");
const pdfInput = $("pdf-input");
const fileBadge = $("file-badge");
const fileBadgeName = $("file-badge-name");
const fileRemove = $("file-remove");
const uploadBtn = $("upload-btn");
const uploadBtnIcon = $("upload-btn-icon");
const uploadBtnText = $("upload-btn-text");
const uploadStatus = $("upload-status");
const docList = $("doc-list");
const welcomeScreen = $("welcome-screen");
const chatMessages = $("chat-messages");
const questionEl = $("question");
const askBtn = $("ask-btn");

// ── State ─────────────────────────────────────────────────────────────────────
let isUploading = false;
let isAsking = false;

// ── Health check ──────────────────────────────────────────────────────────────
async function checkHealth() {
    try {
        const r = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(4000) });
        if (r.ok) {
            statusDot.className = "status-dot online";
            statusLabel.textContent = "Backend online";
        } else throw new Error();
    } catch {
        statusDot.className = "status-dot offline";
        statusLabel.textContent = "Backend offline";
    }
}
checkHealth();
setInterval(checkHealth, 15000);

// ── Mobile sidebar ────────────────────────────────────────────────────────────
menuBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    sidebarOverlay.classList.toggle("show");
});
sidebarOverlay.addEventListener("click", closeSidebar);

function closeSidebar() {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("show");
}

// ── Welcome card buttons (ISSUE 3 fix) ───────────────────────────────────────
$("card-upload")?.addEventListener("click", () => {
    // Open sidebar and trigger file picker
    sidebar.classList.add("open");
    sidebarOverlay.classList.add("show");
    setTimeout(() => pdfInput.click(), 200);
});

$("card-search")?.addEventListener("click", () => {
    // Enable input if not already, focus and prefill
    if (questionEl.disabled) {
        setStatus("Upload a PDF first to enable search.", "error");
        sidebar.classList.add("open");
        sidebarOverlay.classList.add("show");
        return;
    }
    questionEl.value = "Search relevant information from the document";
    questionEl.dispatchEvent(new Event("input")); // trigger auto-resize
    questionEl.focus();
});

$("card-answer")?.addEventListener("click", () => {
    if (questionEl.disabled) {
        setStatus("Upload a PDF first to get answers.", "error");
        sidebar.classList.add("open");
        sidebarOverlay.classList.add("show");
        return;
    }
    questionEl.value = "Give a detailed answer based on the uploaded document";
    questionEl.dispatchEvent(new Event("input"));
    questionEl.focus();
});

// ── File selection ────────────────────────────────────────────────────────────
pdfInput.addEventListener("change", () => {
    if (pdfInput.files[0]) selectFile(pdfInput.files[0]);
});

dropZone.addEventListener("dragover", e => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    const f = e.dataTransfer.files[0];
    if (f?.name.toLowerCase().endsWith(".pdf")) selectFile(f);
    else setStatus("Only PDF files are supported.", "error");
});

fileRemove.addEventListener("click", () => {
    pdfInput.value = "";
    fileBadge.classList.remove("show");
    uploadBtn.disabled = true;
    setStatus("", "");
});

function selectFile(file) {
    fileBadgeName.textContent = file.name;
    fileBadge.classList.add("show");
    uploadBtn.disabled = false;
    setStatus("", "");
}

// ── Upload (ISSUE 2 fix) ──────────────────────────────────────────────────────
uploadBtn.addEventListener("click", async () => {
    const file = pdfInput.files[0];
    if (!file || isUploading) return;

    isUploading = true;
    uploadBtn.disabled = true;
    uploadBtnIcon.innerHTML = '<span class="spinner"></span>';
    uploadBtnText.textContent = "Indexing…";
    setStatus('<span class="spinner"></span> Uploading and indexing…', "loading");

    // ISSUE 4: correct FormData key = "file"
    const formData = new FormData();
    formData.append("file", file);

    try {
        const res = await fetch(`${BASE_URL}/upload`, {
            method: "POST",
            body: formData,
            // Do NOT set Content-Type — browser sets it with boundary automatically
        });

        let data;
        try { data = await res.json(); } catch { data = {}; }

        if (res.ok) {
            setStatus("✓ " + (data.message || "Indexed successfully."), "success");
            addDocToList(file.name, data.message || "");
            enableChat();
            // Reset file input for next upload
            pdfInput.value = "";
            fileBadge.classList.remove("show");
        } else {
            setStatus("✗ " + (data.detail || `Error ${res.status}`), "error");
        }
    } catch (err) {
        setStatus("✗ Could not reach the backend. Is it running?", "error");
        console.error("[upload]", err);
    } finally {
        isUploading = false;
        uploadBtn.disabled = true; // stays disabled until new file selected
        uploadBtnIcon.textContent = "⬆";
        uploadBtnText.textContent = "Upload & Index";
    }
});

function setStatus(html, type) {
    uploadStatus.innerHTML = html;
    uploadStatus.className = "upload-status" + (type ? ` show ${type}` : "");
}

function addDocToList(name, msg) {
    const empty = docList.querySelector(".doc-empty");
    if (empty) empty.remove();

    const chunks = (msg.match(/\d+/) || ["?"])[0];
    const item = document.createElement("div");
    item.className = "doc-item";
    item.innerHTML = `
        <span class="doc-item-icon">📄</span>
        <div class="doc-item-info">
            <div class="doc-item-name" title="${escHtml(name)}">${escHtml(name)}</div>
            <div class="doc-item-meta">${timestamp()} · ${chunks} chunks</div>
        </div>
        <span class="doc-item-badge">${chunks}</span>`;
    docList.appendChild(item);
}

function enableChat() {
    questionEl.disabled = false;
    askBtn.disabled = false;
    questionEl.focus();
}

// ── Textarea auto-resize ──────────────────────────────────────────────────────
questionEl.addEventListener("input", () => {
    questionEl.style.height = "auto";
    questionEl.style.height = Math.min(questionEl.scrollHeight, 160) + "px";
});

questionEl.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!askBtn.disabled && !isAsking) askBtn.click();
    }
});

// ── Ask (ISSUE 4 fix) ─────────────────────────────────────────────────────────
askBtn.addEventListener("click", async () => {
    const question = questionEl.value.trim();
    if (!question || isAsking) return;

    // Switch to chat view
    welcomeScreen.style.display = "none";
    chatMessages.style.display = "flex";

    isAsking = true;
    askBtn.disabled = true;
    questionEl.disabled = true;

    appendUserMessage(question);
    questionEl.value = "";
    questionEl.style.height = "auto";
    scrollBottom();

    const thinkId = appendThinking();

    try {
        const res = await fetch(`${BASE_URL}/ask`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question }),
        });

        let data;
        try { data = await res.json(); } catch { data = { answer: "Invalid response from server.", context: [] }; }

        removeMessage(thinkId);

        if (res.ok) {
            await appendBotMessage(data.answer || "No answer returned.", data.context || []);
        } else {
            await appendBotMessage(`Error ${res.status}: ${data.detail || "Request failed."}`, []);
        }
    } catch (err) {
        removeMessage(thinkId);
        await appendBotMessage("Could not reach the backend. Make sure it is running at " + BASE_URL, []);
        console.error("[ask]", err);
    } finally {
        isAsking = false;
        askBtn.disabled = false;
        questionEl.disabled = false;
        questionEl.focus();
    }
});

// ── Message builders ──────────────────────────────────────────────────────────
function appendUserMessage(text) {
    const row = document.createElement("div");
    row.className = "msg-row user";
    row.innerHTML = `
        <div class="msg-avatar user">👤</div>
        <div class="msg-content">
            <div class="msg-meta">${timestamp()}</div>
            <div class="msg-bubble">${escHtml(text)}</div>
        </div>`;
    chatMessages.appendChild(row);
    scrollBottom();
}

function appendThinking() {
    const id = "think_" + Date.now();
    const row = document.createElement("div");
    row.className = "msg-row bot";
    row.id = id;
    row.innerHTML = `
        <div class="msg-avatar bot">🤖</div>
        <div class="msg-content">
            <div class="msg-meta">RAG Chatbot · ${timestamp()}</div>
            <div class="msg-bubble">
                <div class="thinking-dots"><span></span><span></span><span></span></div>
            </div>
        </div>`;
    chatMessages.appendChild(row);
    scrollBottom();
    return id;
}

async function appendBotMessage(answer, context) {
    const row = document.createElement("div");
    row.className = "msg-row bot";

    let ctxHtml = "";
    if (context.length > 0) {
        const chunkItems = context.map((c, i) => `
            <div class="chunk-item">
                <div class="chunk-label">Chunk ${i + 1}</div>
                ${escHtml(c)}
            </div>`).join("");
        ctxHtml = `
            <details class="context-accordion">
                <summary>
                    <span class="ctx-arrow">▶</span>
                    Retrieved context
                    <span class="ctx-badge">${context.length} chunk${context.length > 1 ? "s" : ""}</span>
                </summary>
                <div class="context-chunks">${chunkItems}</div>
            </details>`;
    }

    row.innerHTML = `
        <div class="msg-avatar bot">🤖</div>
        <div class="msg-content">
            <div class="msg-meta">RAG Chatbot · ${timestamp()}</div>
            <div class="msg-bubble">
                <span class="answer-text"></span><span class="typing-cursor"></span>
                ${ctxHtml}
            </div>
            <div class="msg-actions">
                <button class="action-btn copy-btn">📋 Copy</button>
            </div>
        </div>`;

    chatMessages.appendChild(row);
    scrollBottom();

    const answerSpan = row.querySelector(".answer-text");
    const cursor = row.querySelector(".typing-cursor");
    await typeText(answerSpan, answer);
    cursor.remove();

    row.querySelector(".copy-btn").addEventListener("click", function () {
        navigator.clipboard.writeText(answer).then(() => {
            this.textContent = "✓ Copied";
            this.classList.add("copied");
            setTimeout(() => {
                this.textContent = "📋 Copy";
                this.classList.remove("copied");
            }, 2000);
        }).catch(() => {
            this.textContent = "Copy failed";
        });
    });

    scrollBottom();
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// ── Typing effect ─────────────────────────────────────────────────────────────
function typeText(el, text, speed = 10) {
    return new Promise(resolve => {
        let i = 0;
        function tick() {
            if (i < text.length) {
                const ch = text[i++];
                if (ch === "\n") {
                    el.appendChild(document.createElement("br"));
                } else {
                    el.appendChild(document.createTextNode(ch));
                }
                scrollBottom();
                setTimeout(tick, speed);
            } else {
                resolve();
            }
        }
        tick();
    });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function scrollBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function timestamp() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
