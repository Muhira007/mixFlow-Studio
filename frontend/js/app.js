/**
 * mixFlow — Application Engine
 * Handles: navigation, file upload, state management, localStorage,
 *          clipboard, toast notifications, panel communication
 */
(function() {
    'use strict';

    // ============================================
    // DOM REFS
    // ============================================
    const $ = (sel, ctx) => (ctx || document).querySelector(sel);
    const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];

    const sidebar = $('#sidebar');
    const overlay = $('#sidebarOverlay');
    const hamburger = $('#hamburgerBtn');
    const contentArea = $('#contentArea');
    const pageTitleEl = $('#pageTitle');
    const toastContainer = $('#toastContainer');

    // ============================================
    // STATE
    // ============================================
    const STORAGE_KEY = 'mixflow_state_v1';

    const defaultState = {
        apiKeys: {
            elevenlabs: '',
            deepseek: '',
            gemini: '',
            openai: ''
        },
        settings: {
            voiceId: '21m00Tcm4TlvDq8ikWAM',
            minKeepDuration: 3.0,
            outputFormat: '9:16',
            videoCodec: 'h264'
        },
        uploadedFiles: [],
        scriptText: '',
        selectedVoice: '🇮🇩 Rina — Indonesia Female',
        pipelineStep: 'idle',
        outputHistory: []
    };

    let state = loadState();

    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const saved = JSON.parse(raw);
                // Merge with defaults (handles new keys added later)
                return deepMerge(defaultState, saved);
            }
        } catch (e) {
            console.warn('Failed to load state:', e);
        }
        return JSON.parse(JSON.stringify(defaultState));
    }

    function saveState() {
        try {
            // Don't persist file objects
            const toSave = JSON.parse(JSON.stringify(state));
            toSave.uploadedFiles = state.uploadedFiles.map(f => ({
                name: f.name,
                size: f.size,
                type: f.type,
                lastModified: f.lastModified
            }));
            // Restore actual files from the in-memory array after serialization
            localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        } catch (e) {
            console.warn('Failed to save state:', e);
        }
    }

    function deepMerge(target, source) {
        const result = JSON.parse(JSON.stringify(target));
        for (const key of Object.keys(source)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }

    // ============================================
    // NAVIGATION
    // ============================================
    const pageNames = {
        'editor': 'Video Editor',
        'script-gen': 'Script Generator',
        'settings': 'Settings',
        'history': 'Output Videos'
    };

    let currentPanel = 'editor';

    function switchPanel(panelId) {
        currentPanel = panelId;

        // Update nav items (sidebar + bottom nav)
        $$('.nav-item[data-panel], .bottom-nav-item[data-panel]').forEach(n => {
            n.classList.toggle('active', n.dataset.panel === panelId);
        });

        // Update panels
        $$('.panel').forEach(p => {
            p.classList.toggle('active', p.id === 'panel-' + panelId);
        });

        // Update breadcrumb
        if (pageTitleEl) {
            pageTitleEl.textContent = pageNames[panelId] || panelId;
        }

        // Scroll content to top
        if (contentArea) contentArea.scrollTop = 0;

        // Close sidebar on mobile
        closeSidebar();

        // Refresh panel-specific data
        if (panelId === 'editor') refreshEditorStats();
        if (panelId === 'history') refreshHistoryTable();
        if (panelId === 'settings') refreshSettingsUI();
    }

    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('show');
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
    }

    // Hamburger
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
        });
    }

    // Overlay click → close
    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    // All nav items
    document.addEventListener('click', (e) => {
        const navItem = e.target.closest('.nav-item[data-panel], .bottom-nav-item[data-panel]');
        if (navItem) {
            switchPanel(navItem.dataset.panel);
        }
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeSidebar();
    });

    // Swipe-right to open sidebar (mobile)
    let touchStartX = 0;
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        const diff = e.changedTouches[0].clientX - touchStartX;
        if (diff > 60 && touchStartX < 30 && window.innerWidth <= 768) {
            openSidebar();
        }
    });

    // ============================================
    // TOAST NOTIFICATIONS
    // ============================================
    let toastTimer = null;

    window.showToast = function(msg, type) {
        type = type || 'success';
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        const toast = document.createElement('div');
        toast.className = 'toast ' + type;
        toast.innerHTML = '<span>' + (icons[type] || '✅') + '</span> <span>' + msg + '</span>';

        toastContainer.appendChild(toast);

        // Auto-remove after 3s
        const timer = setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);

        // Click to dismiss
        toast.addEventListener('click', () => {
            clearTimeout(timer);
            toast.remove();
        });

        // Limit to 3 toasts
        const toasts = toastContainer.children;
        while (toasts.length > 3) {
            toasts[0].remove();
        }
    };

    // ============================================
    // CLIPBOARD
    // ============================================
    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            showToast('📋 Disalin ke clipboard!');
            return true;
        } catch (e) {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            showToast('📋 Disalin ke clipboard!');
            return true;
        }
    }

    // Delegate copy button clicks
    document.addEventListener('click', (e) => {
        const copyBtn = e.target.closest('[data-copy]');
        if (copyBtn) {
            const targetId = copyBtn.dataset.copy;
            let text = '';
            if (targetId) {
                const el = document.getElementById(targetId);
                if (el) text = el.textContent || el.value || '';
            } else if (copyBtn.dataset.copyText) {
                text = copyBtn.dataset.copyText;
            }
            if (text) copyToClipboard(text.trim());
        }
    });

    // ============================================
    // PANEL: VIDEO EDITOR
    // ============================================

    // -- File Upload --
    const uploadZone = $('#uploadZone');
    const fileInput = $('#fileInput');
    const fileList = $('#fileList');

    if (uploadZone) {
        // Click to open file dialog
        uploadZone.addEventListener('click', () => {
            fileInput.click();
        });

        // Drag & drop
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('drag-over');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            handleFiles(e.dataTransfer.files);
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', () => {
            handleFiles(fileInput.files);
            fileInput.value = '';
        });
    }

    function handleFiles(files) {
        const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
        let added = 0;

        for (const file of files) {
            if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|mov|avi|webm)$/i)) {
                showToast('⚠️ ' + file.name + ' — format tidak didukung', 'warning');
                continue;
            }
            if (file.size > 500 * 1024 * 1024) {
                showToast('⚠️ ' + file.name + ' — ukuran > 500MB', 'warning');
                continue;
            }
            // Avoid duplicates
            if (state.uploadedFiles.some(f => f.name === file.name && f.size === file.size)) {
                continue;
            }
            state.uploadedFiles.push(file);
            added++;
        }

        if (added > 0) {
            showToast('📤 ' + added + ' footage ditambahkan');
            renderFileChips();
            refreshEditorStats();
            saveState();
        }
    }

    function removeFile(index) {
        const name = state.uploadedFiles[index]?.name || 'file';
        state.uploadedFiles.splice(index, 1);
        renderFileChips();
        refreshEditorStats();
        saveState();
        showToast('🗑️ ' + name + ' dihapus');
    }

    function renderFileChips() {
        if (!fileList) return;
        if (state.uploadedFiles.length === 0) {
            fileList.innerHTML = '<div style="color:var(--text-muted);font-size:0.78rem;text-align:center;padding:8px;">Belum ada footage terupload</div>';
            return;
        }
        fileList.innerHTML = state.uploadedFiles.map((f, i) => {
            const sizeMB = (f.size / (1024 * 1024)).toFixed(1);
            const icon = f.type.includes('quicktime') ? '🎥' : '🎬';
            return `<div class="file-chip">
                ${icon} ${f.name} <span style="color:var(--text-muted);font-size:0.68rem;">(${sizeMB} MB)</span>
                <span class="remove" data-file-index="${i}">×</span>
            </div>`;
        }).join('');

        // Bind remove buttons
        $$('.file-chip .remove', fileList).forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const idx = parseInt(this.dataset.fileIndex);
                removeFile(idx);
            });
        });
    }

    // -- Script Text --
    const scriptTextarea = $('#scriptTextarea');
    if (scriptTextarea) {
        scriptTextarea.addEventListener('input', () => {
            state.scriptText = scriptTextarea.value;
            saveState();
        });
        // Load saved script
        if (state.scriptText) {
            scriptTextarea.value = state.scriptText;
        }
    }

    // -- Voice Selector --
    const voiceSelect = $('#voiceSelect');
    if (voiceSelect) {
        voiceSelect.addEventListener('change', () => {
            state.selectedVoice = voiceSelect.value;
            saveState();
        });
        if (state.selectedVoice) {
            voiceSelect.value = state.selectedVoice;
        }
    }

    // -- Editor Stats --
    function refreshEditorStats() {
        const footageCountEl = $('#footageCount');
        const targetDurationEl = $('#targetDuration');
        if (footageCountEl) {
            footageCountEl.textContent = state.uploadedFiles.length;
        }
        // Estimate target duration based on script length
        if (targetDurationEl) {
            const text = state.scriptText || (scriptTextarea ? scriptTextarea.value : '');
            const wordCount = text.split(/\s+/).filter(Boolean).length;
            const estimatedDuration = Math.max(1, wordCount / 3.5); // ~3.5 words/sec
            targetDurationEl.textContent = estimatedDuration.toFixed(1) + 's';
        }
    }

    // -- Progress Pipeline --
    function setPipelineStep(step) {
        state.pipelineStep = step;
        const steps = ['upload', 'tts', 'analyze', 'trim', 'concat', 'render'];
        const stepIndex = steps.indexOf(step);

        $$('#progressPipeline .progress-step').forEach((el, i) => {
            el.classList.remove('done', 'active');
            if (i < stepIndex) el.classList.add('done');
            if (i === stepIndex) el.classList.add('active');
        });

        $$('#progressPipeline .progress-connector').forEach((el, i) => {
            el.classList.remove('done', 'active');
            if (i < stepIndex) el.classList.add('done');
            if (i === stepIndex) el.classList.add('active');
        });

        saveState();
    }

    // Simulate pipeline (demo - will be replaced with real API calls)
    function simulatePipeline() {
        const steps = [
            { step: 'upload', label: 'Upload', delay: 300 },
            { step: 'tts', label: 'TTS', delay: 600 },
            { step: 'analyze', label: 'Analyze', delay: 500 },
            { step: 'trim', label: 'Trim', delay: 400 },
            { step: 'concat', label: 'Concat', delay: 500 },
            { step: 'render', label: 'Render', delay: 700 }
        ];

        let i = 0;
        function next() {
            if (i >= steps.length) {
                setPipelineStep('done');
                showToast('🎬 Pipeline selesai! Video siap render.');
                return;
            }
            setPipelineStep(steps[i].step);
            showToast('🔄 ' + steps[i].label + '...', 'info');
            i++;
            setTimeout(next, steps[Math.min(i, steps.length - 1)].delay);
        }
        next();
    }

    // -- Action Buttons --
    $('#btnGenerateTTS')?.addEventListener('click', () => {
        const text = scriptTextarea?.value?.trim();
        if (!text) {
            showToast('⚠️ Masukkan naskah terlebih dahulu', 'warning');
            return;
        }
        setPipelineStep('tts');
        showToast('🔊 Memproses TTS... (backend dibutuhkan untuk produksi)', 'info');
        saveState();
    });

    $('#btnAnalyze')?.addEventListener('click', () => {
        if (state.uploadedFiles.length === 0) {
            showToast('⚠️ Upload footage terlebih dahulu', 'warning');
            return;
        }
        setPipelineStep('analyze');
        showToast('🔍 Menganalisis footage... (backend dibutuhkan untuk produksi)', 'info');
    });

    $('#btnTrim')?.addEventListener('click', () => {
        setPipelineStep('trim');
        showToast('✂️ Menjalankan adaptive trim... (backend dibutuhkan untuk produksi)', 'info');
    });

    $('#btnRender')?.addEventListener('click', () => {
        setPipelineStep('render');
        const outputName = 'mixflow_' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '.mp4';
        state.outputHistory.unshift({
            name: outputName,
            duration: '—',
            size: '—',
            createdAt: new Date().toISOString()
        });
        saveState();
        showToast('🎬 Render dimulai... (backend dibutuhkan untuk produksi)', 'info');
        setTimeout(() => {
            showToast('✅ Render selesai! Cek Output Videos.');
            refreshHistoryTable();
        }, 2000);
    });

    $('#btnSimulate')?.addEventListener('click', () => {
        if (state.uploadedFiles.length === 0) {
            showToast('⚠️ Upload footage terlebih dahulu', 'warning');
            return;
        }
        const text = scriptTextarea?.value?.trim();
        if (!text) {
            showToast('⚠️ Masukkan naskah terlebih dahulu', 'warning');
            return;
        }
        simulatePipeline();
    });

    // ============================================
    // PANEL: SCRIPT GENERATOR
    // ============================================

    const productNameInput = $('#productName');
    const productUrlInput = $('#productUrl');
    const providerSelect = $('#providerSelect');
    const durationSelect = $('#durationSelect');
    const styleSelect = $('#styleSelect');
    const audienceSelect = $('#audienceSelect');
    const scriptOutputBox = $('#scriptOutputBox');
    const btnGenerateScript = $('#btnGenerateScript');

    // Demo script outputs
    const demoScripts = {
        casual: {
            versionA: `Hai semuanya! Lagi cari serum yang bener-bener works buat ngilangin bekas jerawat?

Aku udah coba {{PRODUCT}} selama 2 minggu, dan hasilnya bikin shock! Bekas merah udah mulai pudar, tekstur kulit makin halus.

Yang paling penting: ringan banget di muka, gak lengket, dan cepat meresap. Cocok buat iklim tropis kayak di Indonesia.

Cek keranjang di bawah video ini ya!`,
            versionB: `Dua minggu lalu, aku hampir nyerah sama skin barrier yang rusak parah. Setiap pagi liat kaca, bekas jerawat masih merah-merah...

Sampai akhirnya temenku rekomendasiin satu produk yang katanya ampuh: {{PRODUCT}}.

Sekarang? Kulitku udah mulai pulih. Bekas merah mulai pudar, dan yang paling penting — texture-nya jadi lebih smooth. No filter!

Cek tautan di bawah buat cobain sendiri!`,
            caption: `Udah 2 minggu cobain {{PRODUCT}} & bekas jerawat mulai pudar bgt! ✨\nRingan, cepet meresap, cocok buat yang kulitnya sensitif.\n\n#SkincareIndonesia #RekomendasiSkincare #ProductReview`
        },
        formal: {
            versionA: `Selamat datang! Hari ini saya akan membahas {{PRODUCT}}, produk inovatif yang telah mendapatkan banyak perhatian.

Berdasarkan pengujian selama 2 minggu, produk ini menunjukkan hasil yang signifikan dalam mengatasi permasalahan kulit.

Komposisinya ringan dan mudah meresap, menjadikannya pilihan tepat untuk penggunaan sehari-hari di iklim tropis.

Klik tautan di bawah untuk informasi lebih lanjut.`,
            versionB: `Sebagai content creator, saya selalu selektif memilih produk untuk direview. Kali ini saya menemukan {{PRODUCT}}.

Setelah melakukan riset dan pengujian mandiri, saya menemukan bahwa produk ini memiliki formula yang seimbang dan efektif.

Banyak pengguna melaporkan hasil positif dalam 2 minggu pertama penggunaan. Saya sendiri merasakan perbedaan yang nyata.

Tautan produk tersedia di bawah video ini.`,
            caption: `Review lengkap {{PRODUCT}} setelah pemakaian 2 minggu. 📋\nFormula ringan, hasil maksimal. Cocok untuk semua jenis kulit.\n\n#ReviewJujur #ProdukTerbaik #ContentCreator`
        }
    };

    function generateDemoScript() {
        const productName = productNameInput?.value?.trim() || 'Produk Ini';
        const style = styleSelect?.value || '💬 Casual & Menarik';
        const duration = durationSelect?.value || '60 detik (~220 kata)';
        const audience = audienceSelect?.value || '🌍 Umum';

        const styleKey = style.includes('Formal') ? 'formal' : 'casual';
        const scripts = demoScripts[styleKey];

        const versionA = scripts.versionA.replace(/\{\{PRODUCT\}\}/g, productName);
        const versionB = scripts.versionB.replace(/\{\{PRODUCT\}\}/g, productName);
        const caption = scripts.caption.replace(/\{\{PRODUCT\}\}/g, productName);

        return { versionA, versionB, caption, productName, style, duration, audience };
    }

    function renderScriptOutput(script) {
        if (!scriptOutputBox) return;

        scriptOutputBox.innerHTML = `
            <button class="btn btn-sm btn-outline copy-btn" data-copy-text="${escapeHtml(scriptOutputBox.textContent || '')}">📋 Copy All</button>

            <div class="version-label version-a">VERSION A — Hard Selling</div>
            <div id="copy-versionA">${escapeHtml(script.versionA)}</div>

            <div class="version-label version-b" style="margin-top:16px;">VERSION B — Storytelling</div>
            <div id="copy-versionB">${escapeHtml(script.versionB)}</div>

            <div class="version-label version-caption" style="margin-top:16px;">CAPTION + HASHTAGS</div>
            <div id="copy-caption">${escapeHtml(script.caption)}</div>
        `;

        // Store for later use
        state._lastScript = script;
        saveState();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    if (btnGenerateScript) {
        btnGenerateScript.addEventListener('click', () => {
            const productName = productNameInput?.value?.trim();
            if (!productName) {
                showToast('⚠️ Masukkan nama produk terlebih dahulu', 'warning');
                return;
            }

            // Show loading
            btnGenerateScript.disabled = true;
            const origHTML = btnGenerateScript.innerHTML;
            btnGenerateScript.innerHTML = '<span class="spinner"></span> Generating...';

            // Simulate API call (replace with real API later)
            setTimeout(() => {
                const script = generateDemoScript();
                renderScriptOutput(script);
                btnGenerateScript.disabled = false;
                btnGenerateScript.innerHTML = origHTML;
                showToast('✨ Naskah berhasil digenerate!');
            }, 1500);
        });
    }

    // "Copy to Editor" button
    $('#btnCopyToEditor')?.addEventListener('click', () => {
        const script = state._lastScript;
        if (!script) {
            showToast('⚠️ Generate naskah terlebih dahulu', 'warning');
            return;
        }
        // Copy version A by default
        const text = script.versionA;
        if (scriptTextarea) {
            scriptTextarea.value = text;
            state.scriptText = text;
            saveState();
        }
        switchPanel('editor');
        showToast('➡️ Naskah dikirim ke Video Editor!');
    });

    // Copy individual version buttons
    $('#btnCopyVerA')?.addEventListener('click', () => {
        const el = document.getElementById('copy-versionA');
        if (el) copyToClipboard(el.textContent.trim());
    });

    $('#btnCopyVerB')?.addEventListener('click', () => {
        const el = document.getElementById('copy-versionB');
        if (el) copyToClipboard(el.textContent.trim());
    });

    $('#btnCopyCaption')?.addEventListener('click', () => {
        const el = document.getElementById('copy-caption');
        if (el) copyToClipboard(el.textContent.trim());
    });

    // Initialize demo output on page load
    if (scriptOutputBox && !state._lastScript) {
        const initialScript = generateDemoScript();
        renderScriptOutput(initialScript);
    } else if (scriptOutputBox && state._lastScript) {
        renderScriptOutput(state._lastScript);
    }

    // ============================================
    // PANEL: SETTINGS
    // ============================================

    function refreshSettingsUI() {
        // Load API keys into inputs
        const keyInputs = {
            'apiKeyElevenlabs': state.apiKeys.elevenlabs,
            'apiKeyDeepseek': state.apiKeys.deepseek,
            'apiKeyGemini': state.apiKeys.gemini,
            'apiKeyOpenai': state.apiKeys.openai
        };

        Object.entries(keyInputs).forEach(([id, val]) => {
            const input = document.getElementById(id);
            if (input && !input.dataset.loaded) {
                input.value = val;
                input.dataset.loaded = '1';
                updateApiKeyIndicator(id, val);
            }
        });

        // Settings
        const voiceIdInput = $('#settingsVoiceId');
        if (voiceIdInput && !voiceIdInput.dataset.loaded) {
            voiceIdInput.value = state.settings.voiceId;
            voiceIdInput.dataset.loaded = '1';
        }

        const minKeepInput = $('#settingsMinKeep');
        if (minKeepInput && !minKeepInput.dataset.loaded) {
            minKeepInput.value = state.settings.minKeepDuration;
            minKeepInput.dataset.loaded = '1';
        }
    }

    function updateApiKeyIndicator(inputId, value) {
        const row = document.getElementById(inputId)?.closest('.api-key-row');
        if (!row) return;
        const indicator = row.querySelector('.status-indicator');
        if (indicator) {
            indicator.className = 'status-indicator ' + (value ? 'status-ok' : 'status-missing');
        }
    }

    // API key input handlers
    ['apiKeyElevenlabs', 'apiKeyDeepseek', 'apiKeyGemini', 'apiKeyOpenai'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', () => {
                const keyMap = {
                    'apiKeyElevenlabs': 'elevenlabs',
                    'apiKeyDeepseek': 'deepseek',
                    'apiKeyGemini': 'gemini',
                    'apiKeyOpenai': 'openai'
                };
                state.apiKeys[keyMap[id]] = input.value;
                updateApiKeyIndicator(id, input.value);
                saveState();
            });
        }
    });

    // Toggle switches
    document.addEventListener('click', (e) => {
        const sw = e.target.closest('.switch');
        if (sw) {
            sw.classList.toggle('on');
            const settingKey = sw.dataset.setting;
            if (settingKey) {
                state.settings[settingKey] = sw.classList.contains('on');
                saveState();
            }
            showToast('⚙️ Pengaturan diperbarui');
        }
    });

    // Save settings button
    $('#btnSaveSettings')?.addEventListener('click', () => {
        const voiceId = $('#settingsVoiceId')?.value;
        const minKeep = $('#settingsMinKeep')?.value;

        if (voiceId) state.settings.voiceId = voiceId;
        if (minKeep) state.settings.minKeepDuration = parseFloat(minKeep) || 3.0;

        saveState();
        showToast('💾 Konfigurasi tersimpan!');
    });

    // Danger zone buttons
    $('#btnClearFootage')?.addEventListener('click', () => {
        showConfirmDialog('Hapus semua footage?', 'Semua file footage yang terupload akan dihapus. Tindakan ini tidak bisa dibatalkan.', () => {
            state.uploadedFiles = [];
            renderFileChips();
            refreshEditorStats();
            saveState();
            showToast('🗑️ Semua footage dihapus');
        });
    });

    $('#btnClearOutputs')?.addEventListener('click', () => {
        showConfirmDialog('Hapus semua output?', 'Semua history output video akan dihapus.', () => {
            state.outputHistory = [];
            refreshHistoryTable();
            saveState();
            showToast('🗑️ Semua output dihapus');
        });
    });

    $('#btnResetAll')?.addEventListener('click', () => {
        showConfirmDialog('Reset semua ke default?', 'Semua API key, settings, footage, dan output akan dihapus. Konfigurasi kembali ke default.', () => {
                    localStorage.removeItem(STORAGE_KEY);
                    state = JSON.parse(JSON.stringify(defaultState));
                    location.reload();
        });
    });

    // ============================================
    // CONFIRMATION DIALOG
    // ============================================
    function showConfirmDialog(title, message, onConfirm) {
        const overlay = document.getElementById('confirmDialog');
        const titleEl = $('#confirmTitle');
        const msgEl = $('#confirmMsg');

        if (!overlay || !titleEl || !msgEl) {
            // Fallback: use browser confirm
            if (confirm(title + '\n\n' + message)) onConfirm();
            return;
        }

        titleEl.textContent = title;
        msgEl.textContent = message;
        overlay.classList.add('show');

        const cleanup = () => {
            overlay.classList.remove('show');
            $('#btnConfirmYes')?.removeEventListener('click', handleYes);
            $('#btnConfirmNo')?.removeEventListener('click', handleNo);
            overlay.removeEventListener('click', handleOverlay);
        };

        function handleYes() {
            cleanup();
            onConfirm();
        }

        function handleNo() {
            cleanup();
        }

        function handleOverlay(e) {
            if (e.target === overlay) {
                cleanup();
            }
        }

        $('#btnConfirmYes')?.addEventListener('click', handleYes);
        $('#btnConfirmNo')?.addEventListener('click', handleNo);
        overlay.addEventListener('click', handleOverlay);
    }

    // ============================================
    // PANEL: OUTPUT HISTORY
    // ============================================
    function refreshHistoryTable() {
        const tbody = $('#historyTableBody');
        if (!tbody) return;

        if (state.outputHistory.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted);">
                📁 Belum ada video output. Render video dulu di Video Editor.
            </td></tr>`;
            return;
        }

        tbody.innerHTML = state.outputHistory.map((v, i) => {
            const created = v.createdAt ? new Date(v.createdAt) : new Date();
            const dateStr = created.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            return `<tr>
                <td>${i + 1}</td>
                <td>${v.name}</td>
                <td>${v.duration}</td>
                <td>${v.size}</td>
                <td>${dateStr}</td>
                <td>
                    <button class="btn btn-sm btn-success" data-download="${v.name}">📥</button>
                    <button class="btn btn-sm btn-outline" data-delete-output="${i}" style="color:var(--danger);">🗑️</button>
                </td>
            </tr>`;
        }).join('');

        // Bind download buttons
        $$('[data-download]', tbody).forEach(btn => {
            btn.addEventListener('click', () => {
                showToast('📥 Download dimulai... (backend dibutuhkan)', 'info');
            });
        });

        // Bind delete buttons
        $$('[data-delete-output]', tbody).forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.deleteOutput);
                const name = state.outputHistory[idx]?.name;
                state.outputHistory.splice(idx, 1);
                refreshHistoryTable();
                saveState();
                showToast('🗑️ ' + name + ' dihapus');
            });
        });
    }

    // ============================================
    // INITIALIZATION
    // ============================================
    function init() {
        // Load file metadata from storage (can't restore actual File objects)
        // But we keep the metadata for display
        const savedFiles = loadFileMetadata();
        if (savedFiles.length > 0 && state.uploadedFiles.length === 0) {
            // We have metadata but no actual files - show as "stored" chips
            state._storedFileMeta = savedFiles;
            renderStoredFileChips();
        } else if (state.uploadedFiles.length > 0) {
            renderFileChips();
        }

        refreshEditorStats();
        refreshHistoryTable();
        refreshSettingsUI();

        // Initial demo script in output box if not yet generated
        if (scriptOutputBox && !state._lastScript) {
            const initialScript = generateDemoScript();
            renderScriptOutput(initialScript);
        }

        console.log('🎬 mixFlow Frontend Ready');
        console.log('📦 State loaded from localStorage');
        console.log('📱 Desktop: sidebar | Mobile: hamburger + bottom nav');
        console.log('💡 Backend belum tersedia — fungsi render & generate masih simulasi');
    }

    function loadFileMetadata() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const saved = JSON.parse(raw);
                return saved.uploadedFiles || [];
            }
        } catch (e) {}
        return [];
    }

    function renderStoredFileChips() {
        if (!fileList) return;
        const files = state._storedFileMeta;
        if (!files || files.length === 0) {
            fileList.innerHTML = '<div style="color:var(--text-muted);font-size:0.78rem;text-align:center;padding:8px;">Belum ada footage terupload</div>';
            return;
        }
        fileList.innerHTML = files.map((f, i) => {
            const sizeMB = (f.size / (1024 * 1024)).toFixed(1);
            return `<div class="file-chip">
                🎬 ${f.name} <span style="color:var(--text-muted);font-size:0.68rem;">(${sizeMB} MB, stored)</span>
                <span class="remove" data-file-index="${i}">×</span>
            </div>`;
        }).join('');

        $$('.file-chip .remove', fileList).forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const idx = parseInt(this.dataset.fileIndex);
                state._storedFileMeta.splice(idx, 1);
                state.uploadedFiles = [];
                renderStoredFileChips();
                refreshEditorStats();
                saveState();
            });
        });
    }

    // ============================================
    // KEYBOARD SHORTCUTS
    // ============================================
    document.addEventListener('keydown', (e) => {
        // Ctrl+1..4 = switch panels
        if (e.ctrlKey || e.metaKey) {
            const panelKeys = { '1': 'editor', '2': 'script-gen', '3': 'settings', '4': 'history' };
            const panel = panelKeys[e.key];
            if (panel) {
                e.preventDefault();
                switchPanel(panel);
            }
        }
    });

    // ============================================
    // STARTUP
    // ============================================
    init();

})();
