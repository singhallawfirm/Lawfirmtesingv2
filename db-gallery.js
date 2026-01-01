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
            item.innerHTML = `<img src="${image}" alt="Gallery Image ${start + index + 1}" loading="lazy">`;
            item.dataset.index = start + index;
            item.addEventListener('click', () => openModal(start + index));
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

    // --- MODAL FUNCTIONALITY ---
    let currentModalIndex = 0;

    function openModal(index) {
        currentModalIndex = index;
        
        // Create modal if it doesn't exist
        let imageModal = document.getElementById('home-image-modal');
        if (!imageModal) {
            imageModal = document.createElement('div');
            imageModal.id = 'home-image-modal';
            imageModal.className = 'image-modal-overlay';
            imageModal.innerHTML = `
                <div class="image-modal-content">
                    <button class="close-modal-btn" id="home-close-modal-btn">&times;</button>
                    <img src="" alt="Gallery Image" id="home-modal-image">
                    <button class="modal-nav-btn modal-prev" id="home-modal-prev">&larr;</button>
                    <button class="modal-nav-btn modal-next" id="home-modal-next">&rarr;</button>
                </div>
            `;
            document.body.appendChild(imageModal);
            
            // Add event listeners
            document.getElementById('home-close-modal-btn').addEventListener('click', closeModal);
            document.getElementById('home-modal-prev').addEventListener('click', () => navigateModal(-1));
            document.getElementById('home-modal-next').addEventListener('click', () => navigateModal(1));
            imageModal.addEventListener('click', (e) => {
                if (e.target === imageModal) closeModal();
            });
        }
        
        updateModalImage();
        imageModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        const imageModal = document.getElementById('home-image-modal');
        if (imageModal) {
            imageModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    function navigateModal(direction) {
        currentModalIndex += direction;
        if (currentModalIndex < 0) currentModalIndex = galleryImages.length - 1;
        if (currentModalIndex >= galleryImages.length) currentModalIndex = 0;
        updateModalImage();
    }

    function updateModalImage() {
        const modalImage = document.getElementById('home-modal-image');
        const modalPrev = document.getElementById('home-modal-prev');
        const modalNext = document.getElementById('home-modal-next');
        
        if (modalImage && galleryImages[currentModalIndex]) {
            modalImage.src = galleryImages[currentModalIndex];
        }
        
        if (modalPrev) modalPrev.style.display = galleryImages.length > 1 ? 'block' : 'none';
        if (modalNext) modalNext.style.display = galleryImages.length > 1 ? 'block' : 'none';
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        const imageModal = document.getElementById('home-image-modal');
        if (imageModal && imageModal.classList.contains('active')) {
            if (e.key === 'Escape') closeModal();
            if (e.key === 'ArrowLeft') navigateModal(-1);
            if (e.key === 'ArrowRight') navigateModal(1);
        }
    });

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
