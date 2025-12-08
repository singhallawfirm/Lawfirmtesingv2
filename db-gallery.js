// db-gallery.js
// Gallery renderer for home page - max 4 images, same logic as gallery.js

document.addEventListener('DOMContentLoaded', () => {
    const galleryGrid = document.getElementById('gallery-grid');
    const galleryPagination = document.getElementById('gallery-pagination');
    const galleryPrevBtn = document.getElementById('gallery-prev');
    const galleryNextBtn = document.getElementById('gallery-next');

    if (!galleryGrid) return;

    const itemsPerPage = 4;
    
    const normalizeGalleryData = (list) => {
        if (!Array.isArray(list)) return [];
        return list
            .map((item) => {
                if (!item) return null;
                if (typeof item === 'string') return item;
                if (typeof item === 'object') return item.url || item.image_url || item.src || item.path || null;
                return null;
            })
            .filter(Boolean);
    };

    let galleryImages = [];
    let totalPages = 1;
    let currentPage = 1;

    function updateGalleryState() {
        totalPages = Math.max(1, Math.ceil(Math.max(galleryImages.length, 1) / itemsPerPage));
        if (currentPage > totalPages) {
            currentPage = totalPages;
        }
    }

    function initGallery() {
        updateGalleryState();
        console.log('[db-gallery.js] initGallery called, images:', galleryImages.length, 'currentPage:', currentPage);
        galleryGrid.innerHTML = '';

        if (galleryImages.length === 0) {
            galleryGrid.innerHTML = '<p class="no-content-message">No images yet.</p>';
            if (galleryPagination) galleryPagination.innerHTML = '';
            if (galleryPrevBtn) galleryPrevBtn.disabled = true;
            if (galleryNextBtn) galleryNextBtn.disabled = true;
            return;
        }

        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        
        console.log('[db-gallery.js] Rendering images from', start, 'to', end);
        galleryImages.slice(start, end).forEach((image, index) => {
            console.log('[db-gallery.js] Creating item for:', image);
            const item = document.createElement('div');
            item.className = 'gallery-item show';
            item.innerHTML = `<img src="${image}" alt="Gallery Image ${start + index + 1}">`;
            galleryGrid.appendChild(item);
        });
        console.log('[db-gallery.js] Gallery grid children count:', galleryGrid.children.length);

        renderPaginationButtons();
    }

    function renderPaginationButtons() {
        if (!galleryPagination) return;
        galleryPagination.innerHTML = '';

        if (galleryImages.length === 0) {
            updateNavigationButtons();
            return;
        }

        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = 'page-btn';
            if (i === currentPage) pageBtn.classList.add('active');
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => {
                currentPage = i;
                initGallery();
            });
            galleryPagination.appendChild(pageBtn);
        }

        updateNavigationButtons();
    }

    function updateNavigationButtons() {
        if (!galleryPrevBtn || !galleryNextBtn) return;

        if (galleryImages.length === 0) {
            galleryPrevBtn.disabled = true;
            galleryNextBtn.disabled = true;
            return;
        }

        galleryPrevBtn.disabled = currentPage === 1;
        galleryNextBtn.disabled = currentPage === totalPages;
    }

    if (galleryPrevBtn) {
        galleryPrevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                initGallery();
            }
        });
    }

    if (galleryNextBtn) {
        galleryNextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                initGallery();
            }
        });
    }

    const applyDbGallery = (data = []) => {
        console.log('[db-gallery.js] Applying DB gallery data:', data);
        galleryImages = normalizeGalleryData(data);
        console.log('[db-gallery.js] Normalized to:', galleryImages);
        currentPage = 1;
        initGallery();
    };

    document.addEventListener('db-data-loaded', (e) => {
        console.log('[db-gallery.js] Received db-data-loaded event:', e.detail);
        const galleryData = (e.detail && e.detail.galleryData) || [];
        applyDbGallery(galleryData);
    });

    if (Array.isArray(window.galleryData) && window.galleryData.length) {
        console.log('[db-gallery.js] Initial window.galleryData found:', window.galleryData);
        applyDbGallery(window.galleryData);
    } else {
        console.log('[db-gallery.js] Waiting for db-data-loaded event...');
    }
});
