/**
 * main.js
 * This script handles:
 * - Theme toggling and search bar
 * - Content modals (Article, News, Video)
 * - Loading media from localStorage for media.html and home.html
 * - Pagination on media.html
 * - Activating modals from URL parameters on media.html
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. GLOBAL SETUP & COMMON ELEMENTS ---
    // Prefer live DB data; fallback to localStorage only if DB unavailable
    let mediaData = [];
    let galleryData = [];

    // Wait for Supabase client to be ready before fetching
    const waitForSupabase = async () => {
        let attempts = 0;
        while (!window.getGalleryImages && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        if (!window.getGalleryImages) {
            console.error('[main.js] Supabase client failed to initialize after 5 seconds');
            return false;
        }
        console.log('[main.js] Supabase client ready');
        return true;
    };

    // Try Supabase reads to override local cache and notify when ready
    (async () => {
        try {
            const supabaseReady = await waitForSupabase();
            if (!supabaseReady) {
                console.warn('[main.js] Proceeding without Supabase');
                document.dispatchEvent(new CustomEvent('db-data-loaded', { detail: { mediaData, galleryData } }));
                return;
            }

            if (window.getMediaContent) {
                const dbMedia = await window.getMediaContent();
                console.log('[main.js] Fetched media from DB:', dbMedia);
                if (Array.isArray(dbMedia) && dbMedia.length) {
                    mediaData = dbMedia;
                    // Clear stale local cache now that DB data is present
                    try { localStorage.removeItem('mediaContent'); } catch {}
                }
            }
            if (window.getGalleryImages) {
                const dbGallery = await window.getGalleryImages();
                console.log('[main.js] Fetched gallery from DB:', dbGallery);
                if (Array.isArray(dbGallery) && dbGallery.length) {
                    galleryData = dbGallery.map(row => typeof row === 'string' ? row : (row.url || row.image_url || ''));
                    console.log('[main.js] Normalized gallery data:', galleryData);
                    // Clear stale local cache now that DB data is present
                    try { localStorage.removeItem('galleryImages'); } catch {}
                }
            }
            // Cache for helper scripts and notify listeners that DB data has arrived
            window.mediaData = mediaData;
            window.galleryData = galleryData;
            console.log('[main.js] Dispatching db-data-loaded event with:', { mediaData, galleryData });
            document.dispatchEvent(new CustomEvent('db-data-loaded', { detail: { mediaData, galleryData } }));
        } catch (e) {
            console.error('[main.js] Supabase read failed:', e);
            document.dispatchEvent(new CustomEvent('db-data-loaded', { detail: { mediaData, galleryData } }));
        }
    })();

    // --- 2. THEME & SEARCH FUNCTIONALITY (Common to all pages) ---
    const themeToggleButton = document.getElementById('theme-toggle');
    if (themeToggleButton) {
        const themeIcon = themeToggleButton.querySelector('i');
        const body = document.body;
        // Apply saved theme on load
        if (localStorage.getItem('theme') === 'dark') {
            body.classList.add('dark-theme');
            themeIcon.className = 'fa-solid fa-moon';
        }
        // Theme toggle event
        themeToggleButton.addEventListener('click', () => {
            body.classList.toggle('dark-theme');
            localStorage.setItem('theme', body.classList.contains('dark-theme') ? 'dark' : 'light');
            themeIcon.className = body.classList.contains('dark-theme') ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
        });
    }

    const searchToggle = document.getElementById('search-toggle');
    const searchInput = document.getElementById('search-input');
    if(searchToggle && searchInput) {
        searchToggle.addEventListener('click', () => {
            searchInput.classList.toggle('active');
            if (searchInput.classList.contains('active')) {
                searchInput.focus();
            }
        });

        // Enhanced search functionality
        let searchResultsContainer = null;
        let searchDebounceTimer = null;

        // Create search results container
        const createSearchResultsContainer = () => {
            if (!searchResultsContainer) {
                searchResultsContainer = document.createElement('div');
                searchResultsContainer.id = 'search-results';
                searchResultsContainer.className = 'search-results-dropdown';
                searchInput.parentNode.appendChild(searchResultsContainer);
                // Position search dropdown dynamically
                const positionDropdown = () => {
                    const rect = searchInput.getBoundingClientRect();
                    searchResultsContainer.style.top = (rect.bottom + 8) + 'px';
                    searchResultsContainer.style.left = (rect.left) + 'px';
                    searchResultsContainer.style.width = (rect.width) + 'px';
                };
                window.addEventListener('resize', positionDropdown);
                searchInput.addEventListener('input', positionDropdown);
                searchInput.addEventListener('focus', positionDropdown);
            }
            return searchResultsContainer;
        };

        // Search function that indexes all content
        const performSearch = (query) => {
            if (!query || query.length < 2) {
                if (searchResultsContainer) {
                    searchResultsContainer.style.display = 'none';
                }
                return;
            }

            const results = [];
            const normalizedQuery = query.toLowerCase().trim();
            const searchTerms = normalizedQuery.split(/\s+/).filter(term => term.length > 0);

            // Search through all media content (Articles, News, Videos)
            mediaData.forEach(item => {
                let score = 0;
                let matchingTerms = 0;
                
                const title = (item.title || '').toLowerCase();
                const description = (item.description || '').toLowerCase();
                const content = (item.content || '').toLowerCase().replace(/<[^>]*>/g, ''); // Strip HTML tags
                const meta = (item.meta || '').toLowerCase();

                // Check for exact phrase match (highest priority)
                if (title.includes(normalizedQuery)) score += 50;
                if (description.includes(normalizedQuery)) score += 30;
                if (content.includes(normalizedQuery)) score += 15;

                // Check individual terms
                searchTerms.forEach(term => {
                    let termScore = 0;
                    
                    // Exact word matches (word boundaries)
                    const wordRegex = new RegExp(`\\b${term}\\b`, 'i');
                    if (wordRegex.test(title)) termScore += 20;
                    else if (title.includes(term)) termScore += 15; // Partial match in title
                    
                    if (wordRegex.test(description)) termScore += 10;
                    else if (description.includes(term)) termScore += 7; // Partial match in description
                    
                    if (wordRegex.test(content)) termScore += 3;
                    else if (content.includes(term)) termScore += 1; // Partial match in content
                    
                    if (wordRegex.test(meta)) termScore += 5;
                    else if (meta.includes(term)) termScore += 2; // Partial match in meta
                    
                    if (termScore > 0) {
                        matchingTerms++;
                        score += termScore;
                    }
                });

                // Bonus for matching multiple terms (indicates relevance)
                if (matchingTerms > 1) {
                    score += matchingTerms * 5;
                }

                // Bonus for matching all search terms
                if (matchingTerms === searchTerms.length) {
                    score += 25;
                }

                // Only include items with meaningful matches
                if (score > 0) {
                    results.push({
                        ...item,
                        score,
                        matchingTerms,
                        relevance: score
                    });
                }
            });

            // Sort by relevance score (highest first), then by date (newest first)
            results.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return new Date(b.date) - new Date(a.date);
            });

            displaySearchResults(results.slice(0, 10)); // Show top 10 results
        };

        // Display search results
        const displaySearchResults = (results) => {
            const container = createSearchResultsContainer();
            
            // Force overlay positioning with inline styles
            container.style.cssText = `
                position: fixed !important;
                z-index: 9998 !important;
                background: var(--card-bg, #ffffff) !important;
                border: 1px solid rgba(0,0,0,0.1) !important;
                border-radius: 8px !important;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2) !important;
                overflow-y: auto !important;
                max-height: 500px !important;
                display: block !important;
            `;
            
            if (results.length === 0) {
                container.innerHTML = '<div class="search-no-results">No results found</div>';
                return;
            }

            let resultsHTML = '<div class="search-results-header">Search Results</div>';
            
            results.forEach(item => {
                const typeIcon = item.type === 'article' ? 'fa-newspaper' : 
                               item.type === 'news' ? 'fa-bullhorn' : 'fa-video';
                const typeLabel = item.type.charAt(0).toUpperCase() + item.type.slice(1);
                const date = new Date(item.date).toLocaleDateString();
                const link = `media.html?tab=${item.type}s&open_id=${item.id}`;
                
                resultsHTML += `
                    <div class="search-result-item" data-link="${link}">
                        <div class="search-result-icon">
                            <i class="fa-solid ${typeIcon}"></i>
                        </div>
                        <div class="search-result-content">
                            <div class="search-result-title">${item.title}</div>
                            <div class="search-result-meta">
                                <span class="search-result-type">${typeLabel}</span>
                                <span class="search-result-date">${date}</span>
                            </div>
                            <div class="search-result-description">${item.description.substring(0, 100)}${item.description.length > 100 ? '...' : ''}</div>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = resultsHTML;

            // Add click handlers for search results
            container.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const link = item.getAttribute('data-link');
                    if (link) {
                        window.location.href = link;
                    }
                });
            });
        };

        // Search input event handler with debouncing
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            // Clear previous timer
            if (searchDebounceTimer) {
                clearTimeout(searchDebounceTimer);
            }

            // If empty, hide dropdown
            if (query.length === 0) {
                if (searchResultsContainer) {
                    searchResultsContainer.style.display = 'none';
                }
                return;
            }

            // Debounce search to avoid too many calls
            searchDebounceTimer = setTimeout(() => {
                performSearch(query);
            }, 300);
        });

        // Hide search results when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.header-actions') && searchResultsContainer) {
                searchResultsContainer.style.display = 'none';
            }
        });

        // Show search results when input is focused and has content
        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim().length >= 2 && searchResultsContainer) {
                searchResultsContainer.style.display = 'block';
                // Reposition on focus
                const rect = searchInput.getBoundingClientRect();
                searchResultsContainer.style.top = (rect.bottom + 8) + 'px';
                searchResultsContainer.style.left = (rect.left) + 'px';
                searchResultsContainer.style.width = (rect.width) + 'px';
            }
        });

        // Handle Enter key for search
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = searchInput.value.trim();
                if (query.length >= 2) {
                    // Navigate to media page with search parameter
                    window.location.href = `media.html?search=${encodeURIComponent(query)}`;
                }
            }
        });
    }

    // --- 3. HOME PAGE SPECIFIC LOGIC ---
    const updatesGrid = document.querySelector('.updates-grid');

    // Home gallery is handled by db-gallery.js - removed duplicate code

    if (updatesGrid) {
        const renderHomeUpdates = () => {
            updatesGrid.innerHTML = ''; // Clear existing content
            
            const latestArticles = mediaData.filter(item => item.type === 'article').slice(0, 2);
            const latestNews = mediaData.filter(item => item.type === 'news').slice(0, 2);
            const latestUpdates = [...latestArticles, ...latestNews];

            if (latestUpdates.length > 0) {
                latestUpdates.forEach(item => {
                    const category = item.type.charAt(0).toUpperCase() + item.type.slice(1);
                    const link = `media.html?tab=${item.type}s&open_id=${item.id}`;

                    // Render thumbnail with image or placeholder
                    // Check if thumbnailurl exists, is not empty, and doesn't contain error/placeholder text
                    const hasValidImage = item.thumbnailurl && 
                                         item.thumbnailurl.trim() !== '' && 
                                         !item.thumbnailurl.includes('Error') && 
                                         !item.thumbnailurl.includes('placehold');
                    
                    const thumbnailHTML = hasValidImage
                        ? `<div class="media-card-thumbnail">
                                <img src="${item.thumbnailurl}" alt="${item.title}">
                            </div>` 
                        : `<div class="media-card-thumbnail no-image-placeholder">
                                <i class="fa-solid fa-image"></i>
                                <span>No Image Provided</span>
                            </div>`;

                    const cardHTML = `
                        <div class="media-card" data-link="${link}">
                            ${thumbnailHTML}
                            <div class="media-card-content">
                                <span class="card-category">${category}</span>
                                <h3>${item.title}</h3>
                                <p>${item.description}</p>
                                <div class="media-card-footer">
                                    <span class="date">${new Date(item.date).toLocaleDateString()}</span>
                                    <span class="read-more-btn">&rarr;</span>
                                </div>
                            </div>
                        </div>`;
                    updatesGrid.innerHTML += cardHTML;
                });

                // Remove old event listeners to prevent duplicates
                const newGrid = updatesGrid.cloneNode(true);
                updatesGrid.parentNode.replaceChild(newGrid, updatesGrid);
                
                // Re-assign reference after replacement
                const finalGrid = document.querySelector('.updates-grid');
                finalGrid.addEventListener('click', (e) => {
                    const card = e.target.closest('.media-card');
                    if (card && card.dataset.link) {
                        window.location.href = card.dataset.link;
                    }
                });

            } else {
                updatesGrid.innerHTML = '<p class="no-content-message">No updates have been posted yet.</p>';
            }
        };
        
        // Initial render
        renderHomeUpdates();
        
        // Re-render when DB data loads
        document.addEventListener('db-data-loaded', (e) => {
            if (e.detail && e.detail.mediaData) {
                mediaData = e.detail.mediaData;
                console.log('[main.js] Home page updated with DB data:', mediaData.length, 'items');
                renderHomeUpdates();
            }
        });
    }
    
    // --- 4. MEDIA PAGE SPECIFIC LOGIC ---
    const mediaPageContainer = document.querySelector('.media-section');
    if (mediaPageContainer) {

        // --- MODAL SETUP ---
        const mainContent = document.getElementById('main-content');
        const modals = {
            article: {
                overlay: document.getElementById('article-modal'),
                body: document.getElementById('article-modal-body'),
                closeBtn: document.getElementById('close-article-btn'),
                prevBtn: document.getElementById('prev-article'),
                nextBtn: document.getElementById('next-article'),
                keys: [],
                currentId: null
            },
            news: {
                overlay: document.getElementById('news-modal'),
                body: document.getElementById('news-modal-body'),
                closeBtn: document.getElementById('close-news-btn'),
                prevBtn: document.getElementById('prev-news'),
                nextBtn: document.getElementById('next-news'),
                keys: [],
                currentId: null
            },
            video: {
                overlay: document.getElementById('video-modal'),
                body: document.getElementById('video-modal-body'),
                closeBtn: document.getElementById('close-video-btn')
            }
        };
        
        // Function to update modal keys when data changes
        const updateModalKeys = () => {
            modals.article.keys = mediaData.filter(i => i.type === 'article').map(i => i.id);
            modals.news.keys = mediaData.filter(i => i.type === 'news').map(i => i.id);
            console.log('[main.js] Updated modal keys - articles:', modals.article.keys.length, 'news:', modals.news.keys.length);
        };
        
        // Initial update
        updateModalKeys();

        const openModal = (modal) => {
            if (!modal || !modal.overlay) return;
            modal.overlay.classList.add('active');
            mainContent.style.filter = 'blur(5px)';
            document.body.style.overflow = 'hidden';
            if(modal.keys && modal.keys.length > 1) {
                if (modal.prevBtn) modal.prevBtn.classList.add('visible');
                if (modal.nextBtn) modal.nextBtn.classList.add('visible');
            }
        };
        
        const closeModal = (modal) => {
            if (!modal || !modal.overlay) return;
            modal.overlay.classList.remove('active');
            mainContent.style.filter = 'none';
            document.body.style.overflow = '';
            if (modal.body) modal.body.innerHTML = ''; // Clear content
            if (modal.prevBtn) modal.prevBtn.classList.remove('visible');
            if (modal.nextBtn) modal.nextBtn.classList.remove('visible');
        };
        
        const loadContent = (type, itemId) => {
            // Convert itemId to number if it's a string (from HTML data attributes)
            const id = typeof itemId === 'string' ? parseInt(itemId) : itemId;
            const item = mediaData.find(i => i.id == id); // Use == for loose comparison
            if (!item) {
                console.warn('[main.js] Item not found:', type, itemId, 'Available IDs:', mediaData.map(i => i.id));
                return;
            }
            
            // Handle document download
            if (type === 'document') {
                // Create a temporary link and trigger download
                const link = document.createElement('a');
                link.href = item.documenturl;
                link.download = item.documentname;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                return;
            }
            
            const modal = modals[type];
            if (!modal) return;
        
            if (type === 'video') {
                const videoId = (item.videourl.match(/[?&]v=([^&]+)/) || [])[1];
                modal.body.innerHTML = videoId 
                    ? `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`
                    : '<p>Invalid video URL.</p>';
            } else {
                const mainImageHtml = item.mainimageurl 
                    ? `<img src="${item.mainimageurl}" alt="${item.title}" onerror="this.onerror=null;this.src='https://placehold.co/800x400/cccccc/ffffff?text=Image+Error';">`
                    : '';
                
                modal.body.innerHTML = `
                    <h1>${item.title || 'Untitled'}</h1>
                    <p class="article-meta">${item.meta || new Date(item.date).toLocaleDateString()}</p>
                    ${mainImageHtml}
                    <div class="article-content">${item.content || '<p>No content available.</p>'}</div>
                `;
            }
            modal.currentId = itemId;
            openModal(modal);
        };
        
        const navigateContent = (type, direction) => {
            const modal = modals[type];
            if (!modal || !modal.keys || modal.keys.length === 0) return;
            const currentIndex = modal.keys.indexOf(modal.currentId);
            let nextIndex = direction === 'next' 
                ? (currentIndex + 1) % modal.keys.length
                : (currentIndex - 1 + modal.keys.length) % modal.keys.length;
            loadContent(type, modal.keys[nextIndex]);
        };
        
        Object.keys(modals).forEach(type => {
            const modal = modals[type];
            if (modal.closeBtn) modal.closeBtn.addEventListener('click', () => closeModal(modal));
            if (modal.overlay) modal.overlay.addEventListener('click', (e) => e.target === modal.overlay && closeModal(modal));
            if (modal.prevBtn) modal.prevBtn.addEventListener('click', () => navigateContent(type, 'prev'));
            if (modal.nextBtn) modal.nextBtn.addEventListener('click', () => navigateContent(type, 'next'));
        });

        // --- PAGINATION & TABS ---
        const ITEMS_PER_PAGE = 24;
        const setupPagination = (items, gridContainerId) => {
            const gridContainer = document.getElementById(gridContainerId);
            const paginationContainer = document.getElementById(gridContainerId.replace('-grid', '-pagination'));
            if (!gridContainer) return;
        
            const displayItems = (page) => {
                gridContainer.innerHTML = '';
                const paginatedItems = items.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
        
                if (paginatedItems.length === 0) {
                    gridContainer.innerHTML = `<p class="no-content-message">No content posted yet.</p>`;
                } else {
                    paginatedItems.forEach(item => {
                        let buttonText = item.type === 'article' ? 'Read More' : (item.type === 'video' ? 'Watch Now' : (item.type === 'document' ? 'Download' : 'View'));
                        let overlay = '';
                        if (item.type === 'video') {
                            overlay = '<div class="video-overlay"><i class="fa-solid fa-play"></i></div>';
                        } else if (item.type === 'document') {
                            overlay = `<div class="document-overlay"><i class="fa-solid fa-file-arrow-down"></i><span>${item.documenttype}</span></div>`;
                        }
                        
                        // Render thumbnail with image or placeholder
                        // Check if thumbnailurl exists, is not empty, and doesn't contain error/placeholder text
                        const hasValidImage = item.thumbnailurl && 
                                             item.thumbnailurl.trim() !== '' && 
                                             !item.thumbnailurl.includes('Error') && 
                                             !item.thumbnailurl.includes('placehold');
                        
                        const thumbnailHTML = hasValidImage
                            ? `<div class="media-card-thumbnail">
                                    <img src="${item.thumbnailurl}" alt="${item.title}">
                                    ${overlay}
                                </div>` 
                            : `<div class="media-card-thumbnail no-image-placeholder">
                                    <i class="fa-solid fa-image"></i>
                                    <span>No Image Provided</span>
                                </div>`;
                        
                        gridContainer.innerHTML += `
                            <div class="media-card clickable" data-id="${item.id}" data-type="${item.type}">
                                ${thumbnailHTML}
                                <div class="media-card-content">
                                    <h3>${item.title}</h3>
                                    <p>${item.description}</p>
                                    ${item.type === 'document' ? `<div class="document-info"><i class="fa-solid fa-file"></i> ${item.documenttype} • ${item.documentsize}</div>` : ''}
                                    <div class="media-card-footer">
                                        <span class="date">${new Date(item.date).toLocaleDateString()}</span>
                                        <a href="#" class="read-more-btn">${buttonText} &rarr;</a>
                                    </div>
                                </div>
                            </div>`;
                    });
                }
                renderPaginationControls(page, Math.ceil(items.length / ITEMS_PER_PAGE));
            };
        
            const renderPaginationControls = (currentPage, totalPages) => {
                if (!paginationContainer) return;
                paginationContainer.innerHTML = '';
                if (totalPages <= 1) return;
                let paginationHTML = '<div class="pagination-nav">';
                paginationHTML += `<a href="#" class="first-last ${currentPage === 1 ? 'disabled' : ''}" data-page="1">First</a>`;
                let startPage = Math.max(1, currentPage - 2);
                let endPage = Math.min(totalPages, currentPage + 2);
                if (startPage > 1) paginationHTML += `...`;
                for (let i = startPage; i <= endPage; i++) {
                    paginationHTML += `<a href="#" class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</a>`;
                }
                if (endPage < totalPages) paginationHTML += `...`;
                paginationHTML += `<a href="#" class="first-last ${currentPage === totalPages ? 'disabled' : ''}" data-page="${totalPages}">Last</a>`;
                paginationHTML += '</div>';
                paginationContainer.innerHTML = paginationHTML;
            };

            gridContainer.addEventListener('click', (e) => {
                const card = e.target.closest('.media-card.clickable');
                if (card) {
                    e.preventDefault();
                    loadContent(card.dataset.type, card.dataset.id);
                }
            });

            if (paginationContainer) {
                paginationContainer.addEventListener('click', (e) => {
                    e.preventDefault();
                    const target = e.target.closest('a');
                    if (target && !target.classList.contains('disabled')) displayItems(parseInt(target.dataset.page));
                });
            }

            displayItems(1);
        };

        const tabLinks = document.querySelectorAll('.tab-link');
        const tabContents = document.querySelectorAll('.tab-content');

        const setupTabContent = (tabId) => {
            let filterType;
            if (tabId === 'articles') filterType = 'article';
            else if (tabId === 'news') filterType = 'news';
            else if (tabId === 'videos') filterType = 'video';
            else if (tabId === 'documents') filterType = 'document';
            else return;

            const items = mediaData.filter(item => item.type === filterType);
            setupPagination(items, `${tabId}-grid`);
        };

        tabLinks.forEach(link => {
            link.addEventListener('click', () => {
                const tabId = link.dataset.tab;
                tabLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                tabContents.forEach(c => c.classList.remove('active'));
                document.getElementById(tabId).classList.add('active');
                setupTabContent(tabId);
            });
        });

        const urlParams = new URLSearchParams(window.location.search);
        let tabToActivate = urlParams.get('tab');
        const openId = urlParams.get('open_id');
        const searchQuery = urlParams.get('search');
        
        if (!tabToActivate && openId) {
            const item = mediaData.find(i => i.id == openId); // Use == for loose comparison
            if (item) tabToActivate = `${item.type}s`;
        }

        // Handle search functionality on media page
        if (searchQuery) {
            displaySearchResultsOnPage(searchQuery);
            // Set search input value
            if (searchInput) {
                searchInput.value = searchQuery;
            }
        } else {
            let linkToActivate = document.querySelector(`.tab-link[data-tab="${tabToActivate}"]`);
            if (!linkToActivate) {
                linkToActivate = document.querySelector('.tab-link');
            }

            if (linkToActivate) {
                linkToActivate.click();
            }

            // Re-apply tab content when DB data loads
            document.addEventListener('db-data-loaded', (e) => {
                // Update local mediaData with the fetched data
                if (e.detail && e.detail.mediaData) {
                    mediaData = e.detail.mediaData;
                    console.log('[main.js] Media page updated with DB data:', mediaData.length, 'items');
                    updateModalKeys(); // Update modal navigation keys
                }
                if (linkToActivate) {
                    linkToActivate.click();
                }
            });

            if (openId) {
                const itemToOpen = mediaData.find(i => i.id == openId); // Use == for loose comparison
                if (itemToOpen) {
                    setTimeout(() => loadContent(itemToOpen.type, itemToOpen.id), 150);
                } else {
                    console.warn('[main.js] Could not find item with openId:', openId);
                }
            }
        }

        // Function to display search results on the media page
        function displaySearchResultsOnPage(query) {
            const results = [];
            const normalizedQuery = query.toLowerCase().trim();
            const searchTerms = normalizedQuery.split(/\s+/).filter(term => term.length > 0);

            // Search through all media content with enhanced scoring
            mediaData.forEach(item => {
                let score = 0;
                let matchingTerms = 0;
                
                const title = (item.title || '').toLowerCase();
                const description = (item.description || '').toLowerCase();
                const content = (item.content || '').toLowerCase().replace(/<[^>]*>/g, '');
                const meta = (item.meta || '').toLowerCase();

                // Check for exact phrase match
                if (title.includes(normalizedQuery)) score += 50;
                if (description.includes(normalizedQuery)) score += 30;
                if (content.includes(normalizedQuery)) score += 15;

                // Check individual terms
                searchTerms.forEach(term => {
                    let termScore = 0;
                    
                    const wordRegex = new RegExp(`\\b${term}\\b`, 'i');
                    if (wordRegex.test(title)) termScore += 20;
                    else if (title.includes(term)) termScore += 15;
                    
                    if (wordRegex.test(description)) termScore += 10;
                    else if (description.includes(term)) termScore += 7;
                    
                    if (wordRegex.test(content)) termScore += 3;
                    else if (content.includes(term)) termScore += 1;
                    
                    if (wordRegex.test(meta)) termScore += 5;
                    else if (meta.includes(term)) termScore += 2;
                    
                    if (termScore > 0) {
                        matchingTerms++;
                        score += termScore;
                    }
                });

                // Bonuses for multiple term matches
                if (matchingTerms > 1) score += matchingTerms * 5;
                if (matchingTerms === searchTerms.length) score += 25;

                if (score > 0) {
                    results.push({
                        ...item,
                        score,
                        matchingTerms,
                        relevance: score
                    });
                }
            });

            results.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return new Date(b.date) - new Date(a.date);
            });

            // Hide tabs and show search results
            const tabsContainer = document.querySelector('.media-tabs');
            const tabContents = document.querySelectorAll('.tab-content');
            
            if (tabsContainer) {
                tabsContainer.style.display = 'none';
            }
            
            tabContents.forEach(content => {
                content.classList.remove('active');
            });

            // Create or update search results container
            let searchResultsSection = document.getElementById('search-results-section');
            if (!searchResultsSection) {
                searchResultsSection = document.createElement('div');
                searchResultsSection.id = 'search-results-section';
                searchResultsSection.className = 'tab-content active';
                document.querySelector('.media-section').appendChild(searchResultsSection);
            } else {
                searchResultsSection.classList.add('active');
            }

            // Display search results header
            let headerHTML = `
                <div class="search-results-page-header">
                    <h2>Search Results for "${query}"</h2>
                    <p>Found ${results.length} result${results.length !== 1 ? 's' : ''}</p>
                    <button id="clear-search-btn" class="clear-search-btn">
                        <i class="fa-solid fa-arrow-left"></i> Back to All Content
                    </button>
                </div>
            `;

            if (results.length === 0) {
                searchResultsSection.innerHTML = headerHTML + `
                    <div class="no-search-results">
                        <i class="fa-solid fa-search"></i>
                        <h3>No Results Found</h3>
                        <p>Try adjusting your search terms or browse all content.</p>
                    </div>
                `;
            } else {
                searchResultsSection.innerHTML = headerHTML + '<div class="media-grid" id="search-results-grid"></div>';
                
                // Use existing pagination setup for search results
                setupPagination(results, 'search-results-grid');
            }

            // Add event listener for clear search button
            const clearSearchBtn = document.getElementById('clear-search-btn');
            if (clearSearchBtn) {
                clearSearchBtn.addEventListener('click', () => {
                    // Reset URL without search parameter
                    const newUrl = window.location.pathname;
                    window.history.pushState({}, '', newUrl);
                    
                    // Reset search input
                    if (searchInput) {
                        searchInput.value = '';
                    }
                    
                    // Show tabs again and hide search results
                    if (tabsContainer) {
                        tabsContainer.style.display = 'flex';
                    }
                    
                    searchResultsSection.classList.remove('active');
                    
                    // Activate first tab
                    const firstTab = document.querySelector('.tab-link');
                    if (firstTab) {
                        firstTab.click();
                    }
                });
            }
        }
    }

     // --- 5. FAQ Section Logic (Common) ---
    const faqItems = document.querySelectorAll('.faq-item');
    if(faqItems) {
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            question.addEventListener('click', () => {
                const wasActive = item.classList.contains('active');
                faqItems.forEach(i => i.classList.remove('active'));
                if (!wasActive) {
                    item.classList.add('active');
                }
            });
        });
    }

    // --- 6. Partner Modal Logic (Firm Page) ---
    const partnerGrid = document.querySelector('.partners-grid');
    if (partnerGrid) {
        const partnerModal = document.getElementById('partner-modal');
        const modalBody = partnerModal.querySelector('.partner-modal-body');
        const closeModalBtn = partnerModal.querySelector('.close-modal-btn');

        partnerGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.partner-card');
            if (card) {
                const detailsSource = card.querySelector('.partner-full-details');
                if (detailsSource) {
                    // Get the raw HTML from the hidden div
                    const detailsHTML = detailsSource.innerHTML;

                    // Set the modal body's content
                    modalBody.innerHTML = detailsHTML;
                    
                    // The CSS grid for the modal body expects an image and a details div.
                    // The source HTML needs to be restructured to fit this layout.
                    const image = modalBody.querySelector('img');
                    const detailsContainer = document.createElement('div');
                    detailsContainer.classList.add('partner-modal-details');

                    // Move all elements that are not the image into the new details container
                    while (image && image.nextSibling) {
                        detailsContainer.appendChild(image.nextSibling);
                    }
                    
                    // Clear the modal body and append the correctly structured elements
                    modalBody.innerHTML = '';
                    if(image) {
                        image.classList.add('partner-image');
                        modalBody.appendChild(image);
                    }
                    modalBody.appendChild(detailsContainer);

                    // Display the modal
                    partnerModal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            }
        });

        const closePartnerModal = () => {
            partnerModal.classList.remove('active');
            document.body.style.overflow = '';
            modalBody.innerHTML = ''; // Clear content on close
        };

        closeModalBtn.addEventListener('click', closePartnerModal);

        partnerModal.addEventListener('click', (e) => {
            // Close if the click is on the overlay background
            if (e.target === partnerModal) {
                closePartnerModal();
            }
        });
    }

    // --- 7. Practice Area Modal Logic (Practices Page) ---
    const servicesGrid = document.querySelector('.services-grid');
    if (servicesGrid) {
        const practiceModal = document.getElementById('practice-modal');
        if (practiceModal) {
            const practiceModalContent = practiceModal.querySelector('.practice-modal-content');
            
            const closePracticeModal = () => {
                practiceModal.classList.remove('active');
                document.body.style.overflow = '';
            };

            servicesGrid.addEventListener('click', (e) => {
                const card = e.target.closest('.service-card.expandable');
                if (card) {
                    const bannerImage = card.getAttribute('data-image');
                    const iconHTML = card.querySelector('.icon').innerHTML;
                    const titleText = card.querySelector('h3').innerText;
                    const detailsHTML = card.querySelector('.practice-details').innerHTML;
                    
                    practiceModalContent.innerHTML = `
                        <button class="close-modal-btn">&times;</button>
                        <img src="${bannerImage}" alt="${titleText} Banner" class="practice-modal-banner" onerror="this.onerror=null;this.src='https://placehold.co/800x300/cccccc/ffffff?text=Image+Error';">
                        <div class="practice-modal-body">
                            <div class="icon">${iconHTML}</div>
                            <h2>${titleText}</h2>
                            ${detailsHTML}
                        </div>
                    `;
                    
                    practiceModalContent.querySelector('.close-modal-btn').addEventListener('click', closePracticeModal);
                    practiceModal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            });

            practiceModal.addEventListener('click', (e) => {
                if (e.target === practiceModal) {
                    closePracticeModal();
                }
            });
        }
    }

    // --- 8. Contact Form Submission Logic ---
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        const formStatus = document.getElementById('form-status');
        const submitButton = contactForm.querySelector('button[type="submit"]');
        // !!! IMPORTANT !!! 
        // Replace this placeholder with your actual Google Apps Script Web App URL.
        // See instructions.md for details on how to get this URL.
        const googleAppScriptURL = 'https://script.google.com/macros/s/AKfycbwDFF8DouTmkX1iaxCPkxnT11vdbWEkfVO1lqYce-e9V2R3sHQO3g1FO4irE_9gurvM/exec';

        if (googleAppScriptURL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
            console.warn('Google Apps Script URL is not set in main.js. Form submissions will be simulated.');
        }

        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            formStatus.className = '';
            formStatus.textContent = '';

            // Simulate submission if URL is not set, for demonstration purposes.
            if (googleAppScriptURL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
                setTimeout(() => {
                    formStatus.textContent = 'This is a simulation. Set your Google Apps Script URL in main.js to enable live submissions.';
                    formStatus.className = 'success';
                    submitButton.disabled = false;
                    submitButton.innerHTML = 'Send Message';
                    contactForm.reset();
                }, 1500);
                return;
            }

            // Real submission to Google Apps Script
            fetch(googleAppScriptURL, {
                method: 'POST',
                body: new FormData(contactForm),
            })
            .then(response => response.json())
            .then(data => {
                if (data.result === 'success') {
                    formStatus.textContent = 'Thank you! Your message has been sent successfully.';
                    formStatus.className = 'success';
                    contactForm.reset();
                } else {
                    // Handle errors returned by the script
                    throw new Error(data.error || 'An unknown error occurred.');
                }
            })
            .catch(error => {
                formStatus.textContent = 'An error occurred while sending your message. Please try again later.';
                formStatus.className = 'error';
                console.error('Error:', error);
            })
            .finally(() => {
                submitButton.disabled = false;
                submitButton.innerHTML = 'Send Message';
            });
        });
    }

});

