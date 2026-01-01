// Gallery Page JavaScript

document.addEventListener('DOMContentLoaded', () => {
    const galleryGrid = document.getElementById('gallery-grid');
    const galleryPagination = document.getElementById('gallery-pagination');
    const galleryPrevBtn = document.getElementById('gallery-prev');
    const galleryNextBtn = document.getElementById('gallery-next');
    const imageModal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalPrevBtn = document.getElementById('modal-prev');
    const modalNextBtn = document.getElementById('modal-next');

    if (!galleryGrid) return;

    const itemsPerPage = 12;
    
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

    function getStoredGalleryImages() {
        try {
            const stored = JSON.parse(localStorage.getItem('galleryImages'));
            return Array.isArray(stored) ? stored : [];
        } catch {
            return [];
        }
    }

    let galleryImages = normalizeGalleryData(getStoredGalleryImages());
    let totalPages = Math.max(1, Math.ceil(Math.max(galleryImages.length, 1) / itemsPerPage));
    let currentPage = 1;
    let currentModalIndex = 0;
    let isAnimating = false;

    function updateGalleryState() {
        totalPages = Math.max(1, Math.ceil(Math.max(galleryImages.length, 1) / itemsPerPage));
        if (currentPage > totalPages) {
            currentPage = totalPages;
        }
    }

    function initGallery() {
        updateGalleryState();
        galleryGrid.innerHTML = '';

        if (galleryImages.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-gallery';
            empty.innerHTML = '<p>No images yet. Use the Admin page to add images to the gallery.</p>';
            galleryGrid.appendChild(empty);
        } else {
            galleryImages.forEach((image, index) => {
                const item = document.createElement('div');
                item.className = 'gallery-item';
                // Add loading="lazy" for better performance
                item.innerHTML = `<img src="${image}" alt="Gallery Image ${index + 1}" loading="lazy">`;
                item.dataset.index = index;
                item.style.display = 'none';
                item.addEventListener('click', () => openModal(index));
                galleryGrid.appendChild(item);
            });
            
            // Preload images for the first page
            preloadPageImages(1);
        }

        showPage(currentPage);
        renderPaginationButtons();
    }
    
    // Function to preload images for a specific page
    function preloadPageImages(pageNumber) {
        const startIndex = (pageNumber - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, galleryImages.length);
        
        for (let i = startIndex; i < endIndex; i++) {
            const img = new Image();
            img.src = galleryImages[i];
        }
    }

    function showPage(pageNumber, direction = 'next') {
        if (isAnimating) return;
        isAnimating = true;

        const previousPage = currentPage;
        currentPage = pageNumber;
        const startIndex = (pageNumber - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const prevStartIndex = (previousPage - 1) * itemsPerPage;
        const prevEndIndex = prevStartIndex + itemsPerPage;

        const allItems = Array.from(galleryGrid.querySelectorAll('.gallery-item'));
        const previousItems = allItems.slice(prevStartIndex, prevEndIndex);
        const currentItems = allItems.slice(startIndex, endIndex);
        
        // Preload next page images for smoother navigation
        if (pageNumber < totalPages) {
            preloadPageImages(pageNumber + 1);
        }

        previousItems.forEach((item, index) => {
            setTimeout(() => {
                item.classList.remove('show');
                item.classList.add(direction === 'next' ? 'hide-left' : 'hide-right');
            }, index * 30);
        });

        setTimeout(() => {
            allItems.forEach((item) => {
                item.style.display = 'none';
                item.classList.remove('show', 'hide-left', 'hide-right');
            });

            currentItems.forEach((item, index) => {
                item.style.display = 'block';
                item.classList.add(direction === 'next' ? 'hide-right' : 'hide-left');

                setTimeout(() => {
                    item.classList.remove('hide-left', 'hide-right');
                    item.classList.add('show');
                }, index * 50 + 50);
            });

            renderPaginationButtons();
            updateNavigationButtons();

            setTimeout(() => {
                isAnimating = false;
            }, currentItems.length * 50 + 300);
        }, previousItems.length * 30 + 200);
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
                if (i !== currentPage && !isAnimating) {
                    showPage(i, i > currentPage ? 'next' : 'prev');
                }
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
            if (currentPage > 1 && !isAnimating) {
                showPage(currentPage - 1, 'prev');
            }
        });
    }

    if (galleryNextBtn) {
        galleryNextBtn.addEventListener('click', () => {
            if (currentPage < totalPages && !isAnimating) {
                showPage(currentPage + 1, 'next');
            }
        });
    }

    const openModal = (index) => {
        currentModalIndex = index;
        modalImage.src = galleryImages[index];
        imageModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        imageModal.classList.remove('active');
        document.body.style.overflow = '';
    };

    const showPrevImage = () => {
        currentModalIndex = (currentModalIndex - 1 + galleryImages.length) % galleryImages.length;
        modalImage.src = galleryImages[currentModalIndex];
    };

    const showNextImage = () => {
        currentModalIndex = (currentModalIndex + 1) % galleryImages.length;
        modalImage.src = galleryImages[currentModalIndex];
    };

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }

    if (imageModal) {
        imageModal.addEventListener('click', (e) => {
            if (e.target === imageModal) {
                closeModal();
            }
        });
    }

    if (modalPrevBtn) {
        modalPrevBtn.addEventListener('click', showPrevImage);
    }

    if (modalNextBtn) {
        modalNextBtn.addEventListener('click', showNextImage);
    }

    document.addEventListener('keydown', (e) => {
        if (imageModal.classList.contains('active')) {
            if (e.key === 'Escape') closeModal();
            if (e.key === 'ArrowLeft') showPrevImage();
            if (e.key === 'ArrowRight') showNextImage();
        }
    });

    window.addEventListener('storage', (e) => {
        if (e.key === 'galleryImages') {
            try {
                galleryImages = normalizeGalleryData(JSON.parse(e.newValue || '[]'));
            } catch {
                galleryImages = [];
            }
            currentPage = 1;
            initGallery();
        }
    });

    const applyDbGallery = (data = []) => {
        console.log('[gallery.js] Applying DB gallery data:', data);
        galleryImages = normalizeGalleryData(data);
        console.log('[gallery.js] Normalized to:', galleryImages);
        currentPage = 1;
        initGallery();
    };

    document.addEventListener('db-data-loaded', (e) => {
        console.log('[gallery.js] Received db-data-loaded event:', e.detail);
        const galleryData = (e.detail && e.detail.galleryData) || [];
        applyDbGallery(galleryData);
    });

    // Check if data already loaded, otherwise wait for event
    if (Array.isArray(window.galleryData) && window.galleryData.length) {
        console.log('[gallery.js] Initial window.galleryData found:', window.galleryData);
        applyDbGallery(window.galleryData);
    } else {
        console.log('[gallery.js] Waiting for db-data-loaded event...');
        // Don't render empty gallery - wait for the event
    }
});
