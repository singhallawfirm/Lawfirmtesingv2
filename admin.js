document.addEventListener('DOMContentLoaded', () => {

    // --- LOGIN LOGIC ---
    const users = [
        { username: 'admin', password: 'password123' },
        { username: 'editor1', password: 'password456' },
        { username: 'editor2', password: 'password789' },
        { username: 'user1', password: 'password101' },
        { username: 'user2', password: 'password112' }
    ];

    const loginContainer = document.getElementById('login-container');
    const adminWrapper = document.getElementById('admin-wrapper');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        const foundUser = users.find(user => user.username === username && user.password === password);

        if (foundUser) {
            loginContainer.style.display = 'none';
            adminWrapper.style.display = 'block';
            try {
                initializeAdminPanel();
            } catch (err) {
                console.error('Admin initialization error:', err);
                alert('Failed to initialize admin panel. Please check console for details.');
            }
        } else {
            loginError.textContent = 'Invalid username or password.';
            setTimeout(() => { loginError.textContent = ''; }, 3000);
        }
    });

    // --- ADMIN PANEL LOGIC (run after successful login) ---
    function initializeAdminPanel() {
        const editor = document.getElementById('post-content');
        const toolbar = document.querySelector('.editor-toolbar');
        const form = document.getElementById('post-form');
        const imageUploadInput = document.getElementById('image-upload-input');
        const insertImageBtn = document.getElementById('insert-image-btn');
        const postTypeSelect = document.getElementById('post-type');
        const videoFields = document.getElementById('video-fields');
        const documentFields = document.getElementById('document-fields');
        const contentFields = document.getElementById('content-fields');
        const thumbnailLabel = document.getElementById('thumbnail-label');
        const publishBtn = document.getElementById('publish-btn');
        const postIdInput = document.getElementById('post-id');
        const editorHeading = document.querySelector('.editor-container h1');
    
        // Content list table bodies
        const articleList = document.getElementById('article-list');
        const newsList = document.getElementById('news-list');
        const videoList = document.getElementById('video-list');
        const documentList = document.getElementById('document-list');
        // Gallery management elements
        const galleryImageUrlInput = document.getElementById('gallery-image-url');
        const galleryImageUploadInput = document.getElementById('gallery-image-upload');
        const addGalleryImageBtn = document.getElementById('add-gallery-image-btn');
        const galleryImageList = document.getElementById('gallery-image-list');
        
        // Confirmation Modal elements
        const confirmModal = document.getElementById('confirm-modal');
        const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
        const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
        let itemToDeleteId = null;
        
        // Store current editing post data for reference during form submission
        let currentEditingPost = null;
    
        // --- RENDER CONTENT LIST ---
        async function renderContentList() {
            // Fetch from Supabase instead of localStorage
            let mediaContent = [];
            
            if (window.getMediaContent) {
                try {
                    mediaContent = await window.getMediaContent();
                    console.log('[admin.js] Fetched media content from DB:', mediaContent);
                } catch (e) {
                    console.error('[admin.js] Failed to fetch media content:', e);
                    // Fallback to localStorage only if DB fetch fails
                    mediaContent = JSON.parse(localStorage.getItem('mediaContent')) || [];
                }
            } else {
                // Fallback to localStorage if Supabase not available
                mediaContent = JSON.parse(localStorage.getItem('mediaContent')) || [];
            }
            
            const articles = mediaContent.filter(item => item.type === 'article');
            const news = mediaContent.filter(item => item.type === 'news');
            const videos = mediaContent.filter(item => item.type === 'video');
            const documents = mediaContent.filter(item => item.type === 'document');
    
            populateTable(articleList, articles);
            populateTable(newsList, news);
            populateTable(videoList, videos);
            populateTable(documentList, documents);

            renderGalleryList();
        }
    
        function populateTable(tbody, items) {
            tbody.innerHTML = ''; // Clear the table body
            const columns = tbody.parentElement.tHead.rows[0].cells.length;
    
            if (items.length === 0) {
                tbody.innerHTML = `<tr><td colspan="${columns}" style="text-align:center; padding: 20px;">No content in this category.</td></tr>`;
                return;
            }
    
            items.forEach(item => {
                const row = document.createElement('tr');
                // Store both id and type for proper deletion and editing
                row.innerHTML = `
                    <td><img src="${item.thumbnailurl}" alt="Thumbnail" class="list-thumbnail" onerror="this.onerror=null;this.src='https://placehold.co/80x50/cccccc/ffffff?text=No+Img';"></td>
                    <td class="title-cell">${item.title}</td>
                    <td>${new Date(item.date).toLocaleDateString()}</td>
                    <td class="actions-cell">
                        <button class="action-btn edit-btn" data-id="${item.id}" data-type="${item.type}" title="Edit"><i class="fas fa-pencil-alt"></i></button>
                        <button class="action-btn delete-btn" data-id="${item.id}" data-type="${item.type}" title="Delete"><i class="fas fa-trash-alt"></i></button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    
        // --- HANDLE CONTENT ACTIONS (EDIT/DELETE) ---
        document.querySelector('.content-management-container').addEventListener('click', (e) => {
            const target = e.target.closest('.action-btn');
            if (!target) return;

            const id = target.dataset.id;
            const type = target.dataset.type;
            if (target.classList.contains('edit-btn')) {
                editPost(id, type);
            } else if (target.classList.contains('delete-btn')) {
                showDeleteConfirmation(id, type);
            }
        });        // --- DELETE CONFIRMATION LOGIC ---
        let itemToDeleteType = null;
        
        function showDeleteConfirmation(id, type) {
            itemToDeleteId = id;
            itemToDeleteType = type;
            confirmModal.classList.add('active');
        }

        function hideDeleteConfirmation() {
            itemToDeleteId = null;
            itemToDeleteType = null;
            confirmModal.classList.remove('active');
        }

        async function deletePost() {
            if (!itemToDeleteId || !itemToDeleteType) return;
            
            const sb = window.supabaseClient || window.supabase;
            if (sb && typeof sb.from === 'function') {
                try {
                    // Map content type to table name
                    const tableMap = {
                        'article': 'articles',
                        'news': 'news',
                        'video': 'videos',
                        'document': 'documents'
                    };
                    
                    const tableName = tableMap[itemToDeleteType];
                    if (!tableName) {
                        throw new Error(`Unknown content type: ${itemToDeleteType}`);
                    }
                    
                    console.log(`Deleting from ${tableName} where id = ${itemToDeleteId}`);
                    
                    const { error } = await sb
                        .from(tableName)
                        .delete()
                        .eq('id', itemToDeleteId);
                    
                    if (error) throw error;
                    
                    await renderContentList();
                    hideDeleteConfirmation();
                    alert('Content deleted successfully!');
                } catch (e) {
                    console.error('Delete error:', e);
                    alert('Failed to delete content: ' + (e.message || 'Unknown error'));
                }
            } else {
                // Fallback to localStorage if Supabase not available
                let mediaContent = JSON.parse(localStorage.getItem('mediaContent')) || [];
                mediaContent = mediaContent.filter(item => item.id !== itemToDeleteId);
                localStorage.setItem('mediaContent', JSON.stringify(mediaContent));
                await renderContentList();
                hideDeleteConfirmation();
            }
        }
        
        confirmDeleteBtn.addEventListener('click', deletePost);
        cancelDeleteBtn.addEventListener('click', hideDeleteConfirmation);
        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) hideDeleteConfirmation();
        });
    
        // --- CLEAR FORM & RESET TO CREATE MODE ---
        function clearForm() {
            form.reset();
            editor.innerHTML = '';
            postIdInput.value = '';
            currentEditingPost = null; // Reset editing state
            document.querySelectorAll('.image-preview').forEach(p => {
                p.src = '';
                p.style.display = 'none';
            });
            postTypeSelect.dispatchEvent(new Event('change'));
            editorHeading.textContent = 'Create New Post';
            publishBtn.textContent = 'Publish Content';
            publishBtn.disabled = false;
        }
    
        // --- POPULATE FORM FOR EDITING ---
        async function editPost(id, type) {
            // Fetch from Supabase instead of localStorage
            let mediaContent = [];
            
            if (window.getMediaContent) {
                try {
                    mediaContent = await window.getMediaContent();
                } catch (e) {
                    console.error('[admin.js] Failed to fetch media content for editing:', e);
                    // Fallback to localStorage only if DB fetch fails
                    mediaContent = JSON.parse(localStorage.getItem('mediaContent')) || [];
                }
            } else {
                // Fallback to localStorage if Supabase not available
                mediaContent = JSON.parse(localStorage.getItem('mediaContent')) || [];
            }
            
            const postToEdit = mediaContent.find(item => item.id == id && item.type === type);
            if (!postToEdit) {
                alert('Content not found!');
                return;
            }
            
            // Store for reference during form submission
            currentEditingPost = postToEdit;

            window.scrollTo({ top: 0, behavior: 'smooth' });
            editorHeading.textContent = 'Edit Post';
            publishBtn.textContent = 'Update Content';

            postIdInput.value = postToEdit.id;
            document.getElementById('post-title').value = postToEdit.title;
            postTypeSelect.value = postToEdit.type;
            postTypeSelect.dispatchEvent(new Event('change'));

            if (postToEdit.type === 'video') {
                document.getElementById('post-video-url').value = postToEdit.videoUrl || '';
            } else if (postToEdit.type === 'document') {
                document.getElementById('post-document-description').value = postToEdit.description || '';
                // Note: We cannot pre-populate file upload, but we show the existing document info
            } else {
                document.getElementById('post-author').value = postToEdit.meta || '';
                editor.innerHTML = postToEdit.content || '';
            }

            const setupImageField = (fieldName, imageUrl) => {
                const preview = document.getElementById(`${fieldName}-preview`);
                const urlInput = document.getElementById(`post-${fieldName}-url`);
                const uploadInput = document.getElementById(`post-${fieldName}-upload`);
                const urlRadio = document.querySelector(`input[name="${fieldName}-source"][value="url"]`);
                const uploadRadio = document.querySelector(`input[name="${fieldName}-source"][value="upload"]`);
                
                if (imageUrl) {
                     if (imageUrl.startsWith('data:image')) {
                        uploadRadio.checked = true;
                        urlInput.style.display = 'none';
                        uploadInput.style.display = 'block';
                    } else {
                        urlRadio.checked = true;
                        urlInput.style.display = 'block';
                        uploadInput.style.display = 'none';
                        urlInput.value = imageUrl;
                    }
                    preview.src = imageUrl;
                    preview.style.display = 'block';
                }
            };

            setupImageField('thumbnail', postToEdit.thumbnailurl);
            if (postToEdit.type !== 'video' && postToEdit.type !== 'document') {
                setupImageField('main-image', postToEdit.mainimageurl);
            }
        }        try {
            renderContentList();
        } catch (err) {
            console.error('Render content list error:', err);
        }
    
        // --- DYNAMIC FORM LOGIC ---
        postTypeSelect.addEventListener('change', () => {
            if (postTypeSelect.value === 'video') {
                videoFields.style.display = 'block';
                documentFields.style.display = 'none';
                contentFields.style.display = 'none';
                thumbnailLabel.textContent = 'Thumbnail Image (Optional)';
                const docUpload = document.getElementById('post-document-upload');
                if (docUpload) docUpload.required = false;
            } else if (postTypeSelect.value === 'document') {
                videoFields.style.display = 'none';
                documentFields.style.display = 'block';
                contentFields.style.display = 'none';
                thumbnailLabel.textContent = 'Thumbnail Image (Optional)';
                const docUpload = document.getElementById('post-document-upload');
                if (docUpload) docUpload.required = !postIdInput.value; // required for new document posts
            } else {
                videoFields.style.display = 'none';
                documentFields.style.display = 'none';
                contentFields.style.display = 'block';
                thumbnailLabel.textContent = 'Thumbnail Image (Optional)';
                const docUpload = document.getElementById('post-document-upload');
                if (docUpload) docUpload.required = false;
            }
        });
    
        // --- IMAGE UPLOADER UI LOGIC ---
        function setupImageUploader(groupName) {
            const urlRadio = document.querySelector(`input[name="${groupName}-source"][value="url"]`);
            const uploadRadio = document.querySelector(`input[name="${groupName}-source"][value="upload"]`);
            const urlInput = document.getElementById(`post-${groupName}-url`);
            const uploadInput = document.getElementById(`post-${groupName}-upload`);
            const preview = document.getElementById(`${groupName}-preview`);
    
            urlRadio.addEventListener('change', () => {
                urlInput.style.display = 'block';
                uploadInput.style.display = 'none';
            });
    
            uploadRadio.addEventListener('change', () => {
                urlInput.style.display = 'none';
                uploadInput.style.display = 'block';
            });
    
            const handleImage = (file) => {
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        preview.src = e.target.result;
                        preview.style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                }
            };
            
            urlInput.addEventListener('input', () => {
                 if(urlInput.value) {
                    preview.src = urlInput.value;
                    preview.style.display = 'block';
                 } else {
                    preview.style.display = 'none';
                 }
            });
            uploadInput.addEventListener('change', () => handleImage(uploadInput.files[0]));
        }
    
        setupImageUploader('thumbnail');
        setupImageUploader('main-image');

        // --- GALLERY MANAGEMENT ---
        async function compressImage(file, maxWidth = 1024, quality = 0.7) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                const reader = new FileReader();
                reader.onload = (e) => {
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const scale = Math.min(1, maxWidth / img.width);
                        canvas.width = Math.round(img.width * scale);
                        canvas.height = Math.round(img.height * scale);
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        try {
                            const dataUrl = canvas.toDataURL('image/jpeg', quality);
                            resolve(dataUrl);
                        } catch (err) {
                            reject(err);
                        }
                    };
                    img.onerror = reject;
                    img.src = e.target.result;
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }
        // Toggle URL/upload inputs
        const galleryUrlRadio = document.querySelector('input[name="gallery-image-source"][value="url"]');
        const galleryUploadRadio = document.querySelector('input[name="gallery-image-source"][value="upload"]');
        if (galleryUrlRadio && galleryUploadRadio) {
            galleryUrlRadio.addEventListener('change', () => {
                galleryImageUrlInput.style.display = 'block';
                galleryImageUploadInput.style.display = 'none';
            });
            galleryUploadRadio.addEventListener('change', () => {
                galleryImageUrlInput.style.display = 'none';
                galleryImageUploadInput.style.display = 'block';
            });
        }

        async function getDbGalleryImages() {
            if (window.getGalleryImages) {
                return await window.getGalleryImages();
            }
            return [];
        }

        async function renderGalleryList() {
            if (!galleryImageList) return;
            const images = await getDbGalleryImages();
            galleryImageList.innerHTML = '';
            if (images.length === 0) {
                galleryImageList.innerHTML = `<tr><td colspan="3" style="text-align:center; padding: 20px;">No images in gallery.</td></tr>`;
                return;
            }
            images.forEach((imgRow) => {
                const src = typeof imgRow === 'string' ? imgRow : (imgRow.url || '');
                const tr = document.createElement('tr');
                const isDataUrl = src.startsWith('data:image');
                tr.innerHTML = `
                    <td><img src="${src}" alt="Gallery Image" class="list-thumbnail" onerror="this.onerror=null;this.src='https://placehold.co/80x50/cccccc/ffffff?text=No+Img';"></td>
                    <td>${isDataUrl ? 'Uploaded' : 'URL'}</td>
                    <td class="actions-cell">
                        <button class="action-btn delete-gallery-btn" data-id="${imgRow.id || ''}" title="Remove"><i class="fas fa-trash-alt"></i></button>
                    </td>
                `;
                galleryImageList.appendChild(tr);
            });
        }

        async function addGalleryImage() {
            const source = document.querySelector('input[name="gallery-image-source"]:checked').value;
            let imageSrc = '';
            if (source === 'url') {
                const url = (galleryImageUrlInput?.value || '').trim();
                if (!url) {
                    alert('Please enter an image URL.');
                    return;
                }
                imageSrc = url;
            } else {
                const file = galleryImageUploadInput?.files?.[0];
                if (!file) {
                    alert('Please select an image file to upload.');
                    return;
                }
                try {
                    // Upload to Supabase Storage (bucket: 'media', path: gallery/...) and get public URL
                    const sb = window.supabaseClient || window.supabase;
                    if (!sb || !sb.storage) throw new Error('Supabase storage client not available');
                    const fileName = `gallery/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                    const { error: upErr } = await sb.storage.from('media').upload(fileName, file, { upsert: false });
                    if (upErr) throw upErr;
                    const { data: pub } = sb.storage.from('media').getPublicUrl(fileName);
                    imageSrc = pub?.publicUrl || '';
                    if (!imageSrc) throw new Error('Failed to get public URL');
                } catch (err) {
                    console.error('Storage upload error:', err);
                    alert('Failed to upload image. Check storage bucket and policy.');
                    return;
                }
            }
            // LOCAL TESTING: Direct insert using Supabase anon key (requires INSERT policy enabled)
            const sb = window.supabaseClient || window.supabase;
            if (sb && typeof sb.from === 'function') {
                try {
                    // Guard invalid URL
                    if (!imageSrc || imageSrc === 'undefined') {
                        alert('Please provide a valid image URL.');
                        return;
                    }
                    // Insert as array and include created_at to satisfy schema
                    const { error } = await sb
                        .from('gallery_images')
                        .insert([{ url: imageSrc, created_at: new Date().toISOString() }])
                        .select();
                    if (error) throw error;
                } catch (e) {
                    alert('Failed to add image to database.');
                    console.error(e);
                    return;
                }
            } else {
                alert('Supabase client not initialized.');
                return;
            }
            if (galleryImageUrlInput) galleryImageUrlInput.value = '';
            if (galleryImageUploadInput) galleryImageUploadInput.value = '';
            await renderGalleryList();
        }

        if (addGalleryImageBtn) {
            addGalleryImageBtn.addEventListener('click', async () => {
                await addGalleryImage();
                const msg = document.getElementById('gallery-success');
                if (msg) {
                    msg.textContent = 'Image added to gallery.';
                    setTimeout(() => { msg.textContent = ''; }, 2500);
                }
            });
        }

        // Remove image handler
        if (galleryImageList) {
            galleryImageList.addEventListener('click', async (e) => {
                const btn = e.target.closest('.delete-gallery-btn');
                if (!btn) return;
                const id = btn.dataset.id;
                if (!id) {
                    alert('Cannot delete: missing image id.');
                    return;
                }
                const sb = window.supabaseClient || window.supabase;
                if (sb && typeof sb.from === 'function') {
                    try {
                        const { error } = await sb
                            .from('gallery_images')
                            .delete()
                            .eq('id', id);
                        if (error) throw error;
                    } catch (err) {
                        console.error('Delete error:', err);
                        alert('Failed to delete image.');
                        return;
                    }
                    await renderGalleryList();
                } else {
                    alert('Supabase client not initialized.');
                }
            });
        }

        // --- DOCUMENT UPLOAD PREVIEW ---
        const postDocUploadInput = document.getElementById('post-document-upload');
        const postDocPreview = document.getElementById('document-preview');
        
        if (postDocUploadInput) {
            postDocUploadInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const fileName = file.name;
                    const fileSize = (file.size / 1024).toFixed(2) + ' KB';
                    const fileSizeMB = file.size > 1024 * 1024 ? (file.size / (1024 * 1024)).toFixed(2) + ' MB' : fileSize;
                    const fileType = fileName.split('.').pop().toUpperCase();
                    
                    postDocPreview.innerHTML = `
                        <i class="fa-solid fa-file-pdf"></i>
                        <div class="doc-info">
                            <div class="doc-name">${fileName}</div>
                            <div class="doc-size">${fileSizeMB} • ${fileType}</div>
                        </div>
                    `;
                    postDocPreview.classList.add('active');
                } else {
                    postDocPreview.classList.remove('active');
                }
            });
        }
    
        // --- TOOLBAR FUNCTIONALITY ---
        toolbar.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target || target.id === 'insert-image-btn' || target.id === 'format-text-btn' || target.id === 'attach-document-btn' || target.tagName === 'SELECT') return;
            const command = target.dataset.command;
            let value = null;
            if (command === 'createLink') {
                value = prompt('Enter the URL:');
                if (!value || value === 'null') return;
            }
            document.execCommand(command, false, value);
            editor.focus();
        });
        
        insertImageBtn.addEventListener('click', () => imageUploadInput.click());

        // --- FORMAT AND DOCUMENT FUNCTIONALITY ---
        const formatModal = document.getElementById('format-modal');
        const documentModal = document.getElementById('document-modal');
        const formatBtn = document.getElementById('format-text-btn');
        const attachDocumentBtn = document.getElementById('attach-document-btn');
        const documentUploadInput = document.getElementById('document-upload-input');

        // Format Modal Event Listeners
        formatBtn.addEventListener('click', () => {
            formatModal.classList.add('active');
        });

        document.getElementById('format-modal-close').addEventListener('click', () => {
            formatModal.classList.remove('active');
        });

        // Format buttons functionality
        document.querySelectorAll('.format-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const formatType = btn.dataset.format;
                applyTextFormat(formatType);
                formatModal.classList.remove('active');
            });
        });

        // Color buttons functionality
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const color = btn.dataset.color;
                document.execCommand('foreColor', false, color);
                editor.focus();
                formatModal.classList.remove('active');
            });
        });

        // Background color buttons functionality
        document.querySelectorAll('.bg-color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const bgColor = btn.dataset.bgColor;
                if (bgColor === 'transparent') {
                    document.execCommand('hiliteColor', false, 'transparent');
                } else {
                    document.execCommand('hiliteColor', false, bgColor);
                }
                editor.focus();
                formatModal.classList.remove('active');
            });
        });

        // Document Modal Event Listeners
        attachDocumentBtn.addEventListener('click', () => {
            documentModal.classList.add('active');
        });

        document.getElementById('document-modal-close').addEventListener('click', () => {
            documentModal.classList.remove('active');
            resetDocumentModal();
        });

        document.getElementById('browse-documents-btn').addEventListener('click', () => {
            documentUploadInput.click();
        });

        document.getElementById('cancel-document-btn').addEventListener('click', () => {
            documentModal.classList.remove('active');
            resetDocumentModal();
        });

        // Document upload functionality
        const dropArea = document.getElementById('document-drop-area');
        const documentPreview = document.getElementById('document-preview-modal');

        // Drag and drop functionality
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, unhighlight, false);
        });

        dropArea.addEventListener('drop', handleDrop, false);
        dropArea.addEventListener('click', () => documentUploadInput.click());

        documentUploadInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFiles(e.target.files);
            }
        });

        document.getElementById('insert-document-btn').addEventListener('click', insertDocument);
        const removeBtn = documentPreview ? documentPreview.querySelector('.remove-document-btn') : null;
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                resetDocumentModal();
            });
        }

        // Helper functions for document upload
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        function highlight() {
            dropArea.classList.add('dragover');
        }

        function unhighlight() {
            dropArea.classList.remove('dragover');
        }

        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            handleFiles(files);
        }

        function handleFiles(files) {
            if (files.length > 0) {
                const file = files[0];
                if (isValidDocumentType(file)) {
                    displayDocumentPreview(file);
                } else {
                    alert('Please select a valid document file (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, RTF).');
                }
            }
        }

        function isValidDocumentType(file) {
            const validTypes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'text/plain',
                'application/rtf'
            ];
            return validTypes.includes(file.type);
        }

        function displayDocumentPreview(file) {
            const fileSize = (file.size / 1024 / 1024).toFixed(2) + ' MB';
            const fileName = file.name;

            if (!documentPreview) return;

            const nameEl = documentPreview.querySelector('.document-name');
            const sizeEl = documentPreview.querySelector('.document-size');
            if (nameEl) nameEl.textContent = fileName;
            if (sizeEl) sizeEl.textContent = fileSize;

            // Set appropriate icon based on file type
            const iconElement = documentPreview.querySelector('.document-icon');
            if (iconElement) {
                if (file.type.includes('pdf')) {
                    iconElement.className = 'fas fa-file-pdf document-icon';
                } else if (file.type.includes('word')) {
                    iconElement.className = 'fas fa-file-word document-icon';
                } else if (file.type.includes('excel') || file.type.includes('sheet')) {
                    iconElement.className = 'fas fa-file-excel document-icon';
                } else if (file.type.includes('powerpoint') || file.type.includes('presentation')) {
                    iconElement.className = 'fas fa-file-powerpoint document-icon';
                } else {
                    iconElement.className = 'fas fa-file-alt document-icon';
                }
            }

            if (dropArea) dropArea.style.display = 'none';
            documentPreview.style.display = 'block';
        }

        function resetDocumentModal() {
            dropArea.style.display = 'block';
            documentPreview.style.display = 'none';
            document.getElementById('document-title').value = '';
            document.getElementById('document-description').value = '';
            documentUploadInput.value = '';
        }

        function applyTextFormat(formatType) {
            const selection = window.getSelection();
            if (selection.rangeCount === 0) return;

            const range = selection.getRangeAt(0);
            const selectedText = range.toString();
            
            if (!selectedText) {
                alert('Please select some text first.');
                return;
            }

            let formattedHTML = '';
            switch (formatType) {
                case 'highlight':
                    formattedHTML = `<span class="highlight">${selectedText}</span>`;
                    break;
                case 'quote':
                    formattedHTML = `<div class="quote-block">${selectedText}</div>`;
                    break;
                case 'code':
                    formattedHTML = `<code class="code-inline">${selectedText}</code>`;
                    break;
                case 'strikethrough':
                    document.execCommand('strikeThrough', false, null);
                    editor.focus();
                    return;
                default:
                    return;
            }

            if (formattedHTML) {
                document.execCommand('insertHTML', false, formattedHTML);
                editor.focus();
            }
        }

        async function insertDocument() {
            const file = documentUploadInput.files[0];
            if (!file) {
                alert('Please select a document first.');
                return;
            }

            const title = document.getElementById('document-title').value || file.name;
            const description = document.getElementById('document-description').value;

            try {
                const sb = window.supabaseClient || window.supabase;
                if (!sb || !sb.storage) {
                    throw new Error('Supabase client not available');
                }
                
                // Create unique filename
                const timestamp = Date.now();
                const randomString = Math.random().toString(36).substring(7);
                const fileExt = file.name.split('.').pop();
                const fileName = `document-${timestamp}-${randomString}.${fileExt}`;
                
                // Upload to storage
                const { data, error } = await sb.storage
                    .from('media-uploads')
                    .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: false
                    });
                
                if (error) throw error;
                
                // Get public URL
                const { data: { publicUrl } } = sb.storage
                    .from('media-uploads')
                    .getPublicUrl(fileName);
                
                const documentId = 'doc_' + Date.now();
                
                // Create document HTML
                const documentHTML = `<a href="${publicUrl}" download="${file.name}" class="document-attachment" data-id="${documentId}" title="${description || title}">
                    <i class="fas fa-paperclip"></i>
                    <span>${title}</span>
                </a>`;

                // Insert into editor
                document.execCommand('insertHTML', false, documentHTML);
                editor.focus();

                // Close modal and reset
                documentModal.classList.remove('active');
                resetDocumentModal();
            } catch (err) {
                console.error('Document upload error:', err);
                alert('Failed to upload document: ' + (err.message || 'Unknown error'));
            }
        }

        // Close modals when clicking outside
        [formatModal, documentModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    if (modal === documentModal) {
                        resetDocumentModal();
                    }
                }
            });
        });
    
        imageUploadInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const sb = window.supabaseClient || window.supabase;
                    if (!sb || !sb.storage) {
                        throw new Error('Supabase client not available');
                    }
                    
                    // Create unique filename
                    const timestamp = Date.now();
                    const randomString = Math.random().toString(36).substring(7);
                    const fileExt = file.name.split('.').pop();
                    const fileName = `inline-image-${timestamp}-${randomString}.${fileExt}`;
                    
                    // Upload to storage
                    const { data, error } = await sb.storage
                        .from('media-uploads')
                        .upload(fileName, file, {
                            cacheControl: '3600',
                            upsert: false
                        });
                    
                    if (error) throw error;
                    
                    // Get public URL
                    const { data: { publicUrl } } = sb.storage
                        .from('media-uploads')
                        .getPublicUrl(fileName);
                    
                    document.execCommand('insertImage', false, publicUrl);
                } catch (err) {
                    console.error('Image upload error:', err);
                    alert('Failed to upload image: ' + (err.message || 'Unknown error'));
                }
            }
        });

        // --- HANDLE PASTE EVENT TO PRESERVE FORMATTING ---
        editor.addEventListener('paste', (e) => {
            e.preventDefault();
            
            // Get clipboard data
            const clipboardData = e.clipboardData || window.clipboardData;
            const htmlData = clipboardData.getData('text/html');
            const textData = clipboardData.getData('text/plain');
            
            // If HTML data exists, use it to preserve formatting
            if (htmlData) {
                document.execCommand('insertHTML', false, htmlData);
            } else if (textData) {
                // Fallback to plain text
                document.execCommand('insertText', false, textData);
            }
        });
    
        // --- FORM SUBMISSION (CREATE & UPDATE) ---
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Publish clicked');
            publishBtn.textContent = postIdInput.value ? 'Updating...' : 'Publishing...';
            publishBtn.disabled = true;
    
            try {
                const getImageData = async (groupName) => {
                    const source = document.querySelector(`input[name="${groupName}-source"]:checked`).value;
                    const urlInput = document.getElementById(`post-${groupName}-url`);
                    const uploadInput = document.getElementById(`post-${groupName}-upload`);
                    
                    if (source === 'url') {
                        const url = urlInput.value.trim();
                        return url ? url : null;
                    }
                    const file = uploadInput.files[0];
                    if (!file) return null;
                    
                    // Upload to Supabase Storage
                    try {
                        const sb = window.supabaseClient || window.supabase;
                        if (!sb || !sb.storage) {
                            throw new Error('Supabase client not available');
                        }
                        
                        // Create unique filename
                        const timestamp = Date.now();
                        const randomString = Math.random().toString(36).substring(7);
                        const fileExt = file.name.split('.').pop();
                        const fileName = `${groupName}-${timestamp}-${randomString}.${fileExt}`;
                        
                        // Upload to storage bucket 'media-uploads'
                        const { data, error } = await sb.storage
                            .from('media-uploads')
                            .upload(fileName, file, {
                                cacheControl: '3600',
                                upsert: false
                            });
                        
                        if (error) throw error;
                        
                        // Get public URL
                        const { data: { publicUrl } } = sb.storage
                            .from('media-uploads')
                            .getPublicUrl(fileName);
                        
                        return publicUrl;
                    } catch (err) {
                        console.error('Upload error:', err);
                        alert('Failed to upload image: ' + (err.message || 'Unknown error'));
                        return null;
                    }
                };
    
                const type = postTypeSelect.value;
                const title = document.getElementById('post-title').value;
                let postData = { id: postIdInput.value || `${type}-${Date.now()}`, type, title, date: new Date().toISOString() };
    
                if (type === 'video') {
                    const videoUrl = document.getElementById('post-video-url').value;
                    if (!videoUrl) throw new Error('YouTube video URL is required.');
    
                    let thumbnailUrl = await getImageData('thumbnail');
                    if (!thumbnailUrl) {
                         if(currentEditingPost && currentEditingPost.thumbnailurl) {
                             thumbnailUrl = currentEditingPost.thumbnailurl;
                         } else {
                            // Extract video ID from regular YouTube URL or Shorts URL
                            let videoId = (videoUrl.match(/[?&]v=([^&]+)/) || [])[1];
                            if (!videoId) {
                                // Try to match YouTube Shorts URL pattern: youtube.com/shorts/VIDEO_ID
                                videoId = (videoUrl.match(/\/shorts\/([^?&\/]+)/) || [])[1];
                            }
                            if (!videoId) {
                                // Try to match youtu.be/VIDEO_ID pattern
                                videoId = (videoUrl.match(/youtu\.be\/([^?&\/]+)/) || [])[1];
                            }
                            if (videoId) {
                                thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                            } else {
                                // Fallback to placeholder if YouTube thumbnail can't be generated
                                thumbnailUrl = 'https://placehold.co/600x400/ef4444/ffffff?text=Video';
                            }
                         }
                    }
                    postData = { ...postData, videourl: videoUrl, thumbnailurl: thumbnailUrl, description: `A video titled "${title}".` };
                } else if (type === 'document') {
                    const documentFile = document.getElementById('post-document-upload').files[0];
                    if (!documentFile && !postIdInput.value) throw new Error('Document file is required.');
    
                    let documentUrl = null;
                    let documentName = '';
                    let documentSize = '';
                    let documentType = '';
    
                    if (documentFile) {
                        // Upload document to Supabase Storage
                        try {
                            const sb = window.supabaseClient || window.supabase;
                            if (!sb || !sb.storage) {
                                throw new Error('Supabase client not available');
                            }
                            
                            console.log('[admin.js] Uploading document:', documentFile.name, documentFile.size, 'bytes');
                            
                            const timestamp = Date.now();
                            const randomString = Math.random().toString(36).substring(7);
                            const fileExt = documentFile.name.split('.').pop();
                            const fileName = `document-${timestamp}-${randomString}.${fileExt}`;
                            
                            const { data, error } = await sb.storage
                                .from('media-uploads')
                                .upload(fileName, documentFile, {
                                    cacheControl: '3600',
                                    upsert: false
                                });
                            
                            if (error) {
                                console.error('[admin.js] Storage upload error:', error);
                                throw new Error(`Storage error: ${error.message || JSON.stringify(error)}`);
                            }
                            
                            console.log('[admin.js] Upload successful:', data);
                            
                            const { data: { publicUrl } } = sb.storage
                                .from('media-uploads')
                                .getPublicUrl(fileName);
                            
                            console.log('[admin.js] Public URL:', publicUrl);
                            
                            documentUrl = publicUrl;
                            documentName = documentFile.name;
                            documentSize = (documentFile.size / 1024).toFixed(2) + ' KB';
                            if (documentFile.size > 1024 * 1024) {
                                documentSize = (documentFile.size / (1024 * 1024)).toFixed(2) + ' MB';
                            }
                            documentType = documentFile.name.split('.').pop().toUpperCase();
                        } catch (uploadErr) {
                            console.error('Document upload error:', uploadErr);
                            alert('Failed to upload document to storage: ' + (uploadErr.message || 'Unknown error') + '\n\nPlease check:\n1. Storage bucket "media-uploads" exists\n2. Bucket has public access enabled\n3. Storage policies allow INSERT');
                            throw uploadErr;
                        }
                    } else if (postIdInput.value) {
                        // In edit mode, preserve existing document
                        if (currentEditingPost) {
                            documentUrl = currentEditingPost.documenturl;
                            documentName = currentEditingPost.documentname;
                            documentSize = currentEditingPost.documentsize;
                            documentType = currentEditingPost.documenttype;
                        }
                    }
    
                    let thumbnailUrl = await getImageData('thumbnail');
                    if (!thumbnailUrl) {
                        if (currentEditingPost && currentEditingPost.thumbnailurl) {
                            thumbnailUrl = currentEditingPost.thumbnailurl;
                        } else {
                            // Use file type specific placeholder
                            const iconMap = {
                                'PDF': 'https://placehold.co/600x400/dc2626/ffffff?text=PDF',
                                'DOC': 'https://placehold.co/600x400/2563eb/ffffff?text=DOCX',
                                'DOCX': 'https://placehold.co/600x400/2563eb/ffffff?text=DOCX',
                                'XLS': 'https://placehold.co/600x400/16a34a/ffffff?text=EXCEL',
                                'XLSX': 'https://placehold.co/600x400/16a34a/ffffff?text=EXCEL',
                                'PPT': 'https://placehold.co/600x400/ea580c/ffffff?text=PPT',
                                'PPTX': 'https://placehold.co/600x400/ea580c/ffffff?text=PPT',
                                'TXT': 'https://placehold.co/600x400/64748b/ffffff?text=TXT'
                            };
                            thumbnailUrl = iconMap[documentType] || 'https://placehold.co/600x400/64748b/ffffff?text=DOC';
                        }
                    }
    
                    const description = document.getElementById('post-document-description').value || `Document: ${documentName}`;
    
                    postData = { 
                        ...postData, 
                        documenturl: documentUrl,
                        documentname: documentName, 
                        documentsize: documentSize, 
                        documenttype: documentType,
                        thumbnailurl: thumbnailUrl,
                        description
                    };
                } else {
                    let thumbnailUrl = await getImageData('thumbnail');
                    let mainImageUrl = await getImageData('main-image');

                    if (postIdInput.value) { // In edit mode, preserve old images if new ones aren't provided
                        if (currentEditingPost) { // Check if post exists before accessing properties
                            if (!thumbnailUrl) thumbnailUrl = currentEditingPost.thumbnailurl;
                            if (!mainImageUrl) mainImageUrl = currentEditingPost.mainimageurl;
                        }
                    }

                    // Use placeholder image if no thumbnail is provided
                    if (!thumbnailUrl) {
                        thumbnailUrl = 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image';
                    }
                    
                    postData = {
                        ...postData,
                        thumbnailurl: thumbnailUrl,
                        mainimageurl: mainImageUrl || null, // Allow null for main image
                        meta: document.getElementById('post-author').value,
                        content: editor.innerHTML,
                        description: editor.innerText.substring(0, 120) + '...',
                    };
                }
    
                // Insert or Update in appropriate Supabase table based on content type
                const sb = window.supabaseClient || window.supabase;
                if (sb && typeof sb.from === 'function') {
                    try {
                        // Map content type to table name
                        const tableMap = {
                            'article': 'articles',
                            'news': 'news',
                            'video': 'videos',
                            'document': 'documents'
                        };
                        
                        const tableName = tableMap[type];
                        if (!tableName) {
                            throw new Error(`Unknown content type: ${type}`);
                        }
                        
                        // Remove the 'type' and 'id' fields from payload
                        const { type: _, id: existingId, ...payload } = postData;
                        payload.date = new Date().toISOString();
                        
                        let error;
                        
                        if (postIdInput.value && existingId) {
                            // UPDATE existing content
                            console.debug(`Updating ${tableName} where id = ${existingId}:`, payload);
                            const result = await sb
                                .from(tableName)
                                .update(payload)
                                .eq('id', existingId)
                                .select();
                            error = result.error;
                        } else {
                            // INSERT new content
                            console.debug(`Inserting into ${tableName} table:`, payload);
                            const result = await sb
                                .from(tableName)
                                .insert([payload])
                                .select();
                            error = result.error;
                        }
                        
                        if (error) throw error;
                        
                        const action = postIdInput.value ? 'updated' : 'published';
                        alert(`${type.charAt(0).toUpperCase() + type.slice(1)} ${action} successfully!`);
                    } catch (e) {
                        const detail = e?.details || e?.message || e;
                        alert('Failed to publish to database: ' + detail);
                        console.error('Supabase operation error:', e);
                        publishBtn.textContent = 'Publish Content';
                        publishBtn.disabled = false;
                        return;
                    }
                } else {
                    alert('Supabase client not initialized.');
                    publishBtn.textContent = 'Publish Content';
                    publishBtn.disabled = false;
                    return;
                }

                clearForm();
                await renderContentList();
                publishBtn.textContent = 'Publish Content';
                publishBtn.disabled = false;
                const successMsg = document.getElementById('publish-success');
                if (successMsg) {
                    successMsg.textContent = 'Content published successfully.';
                    setTimeout(() => { successMsg.textContent = ''; }, 2500);
                }
                console.log('Publish successful (DB)');
    
            } catch (error) {
                console.error('Publishing Error:', error);
                publishBtn.textContent = postIdInput.value ? 'Update Content' : 'Publish Content';
                publishBtn.disabled = false;
                alert('Publish failed. Please check required fields and try again.');
            }
        });
    
        // --- IMAGE RESIZING IN EDITOR ---
        let selectedImageForResize = null;
        let resizeHandle;
    
        const clearImageSelection = () => {
            if (selectedImageForResize) {
                selectedImageForResize.classList.remove('resizable-image-selected');
            }
            if (resizeHandle) {
                resizeHandle.remove();
                resizeHandle = null;
            }
            selectedImageForResize = null;
        };
    
        const createResizeHandle = (img) => {
            if (resizeHandle) resizeHandle.remove();
            resizeHandle = document.createElement('div');
            resizeHandle.classList.add('image-resize-handle');
            editor.appendChild(resizeHandle);
            positionResizeHandle(img);
            resizeHandle.addEventListener('mousedown', initResize, false);
        };
    
        const positionResizeHandle = (img) => {
            if (!resizeHandle || !img) return;
            resizeHandle.style.top = `${img.offsetTop + img.offsetHeight - 8}px`;
            resizeHandle.style.left = `${img.offsetLeft + img.offsetWidth - 8}px`;
        };
    
        editor.addEventListener('click', (e) => {
            if (e.target && e.target.tagName === 'IMG') {
                e.stopPropagation();
                if (selectedImageForResize && selectedImageForResize !== e.target) {
                    clearImageSelection();
                }
                selectedImageForResize = e.target;
                selectedImageForResize.classList.add('resizable-image-selected');
                createResizeHandle(selectedImageForResize);
            } else if (!e.target.classList.contains('image-resize-handle')) {
                clearImageSelection();
            }
        });
    
        let startX, startY, startWidth;
    
        function initResize(e) {
            e.preventDefault();
            e.stopPropagation();
            startX = e.clientX;
            startY = e.clientY;
            startWidth = selectedImageForResize.offsetWidth;
            document.documentElement.addEventListener('mousemove', doResize, false);
            document.documentElement.addEventListener('mouseup', stopResize, false);
        }
    
        function doResize(e) {
            if (!selectedImageForResize) return;
            const newWidth = startWidth + (e.clientX - startX);
            if (newWidth > 50) {
                selectedImageForResize.style.width = `${newWidth}px`;
                selectedImageForResize.style.height = 'auto';
                positionResizeHandle(selectedImageForResize);
            }
        }
    
        function stopResize() {
            document.documentElement.removeEventListener('mousemove', doResize, false);
            document.documentElement.removeEventListener('mouseup', stopResize, false);
        }
    }
});

