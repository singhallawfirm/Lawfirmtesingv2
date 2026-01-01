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
        // Apply saved theme on load, default to dark if no preference saved
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            // Only use light theme if explicitly saved
            body.classList.remove('dark-theme');
            themeIcon.className = 'fa-solid fa-sun';
        } else {
            // Default to dark theme (when no saved preference or saved as 'dark')
            body.classList.add('dark-theme');
            themeIcon.className = 'fa-solid fa-moon';
            if (!savedTheme) {
                localStorage.setItem('theme', 'dark');
            }
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
        let pageContentIndex = []; // Index of all page content

        // Build comprehensive search index from page content
        const buildPageContentIndex = () => {
            const index = [];

            // 1. Extract practice areas from practices.html if on that page
            const serviceCards = document.querySelectorAll('.service-card');
            if (serviceCards.length > 0) {
                serviceCards.forEach(card => {
                    const title = card.querySelector('h3')?.textContent?.trim() || '';
                    const description = card.querySelector('p:not(.practice-details p)')?.textContent?.trim() || '';
                    const details = card.querySelector('.practice-details')?.textContent?.trim() || '';
                    const id = card.id || '';
                    
                    if (title) {
                        index.push({
                            type: 'practice',
                            title: title,
                            description: description,
                            content: details,
                            link: `practices.html#${id}`,
                            searchText: `${title} ${description} ${details}`.toLowerCase()
                        });
                    }
                });
            }

            // 2. Extract partner information from firm.html if on that page
            const partnerCards = document.querySelectorAll('.partner-card');
            if (partnerCards.length > 0) {
                partnerCards.forEach((card, idx) => {
                    const name = card.querySelector('h3')?.textContent?.trim() || '';
                    const role = card.querySelector('.title')?.textContent?.trim() || '';
                    const details = card.querySelector('.partner-full-details')?.textContent?.trim() || '';
                    const quote = card.querySelector('.quote')?.textContent?.trim() || '';
                    
                    if (name) {
                        index.push({
                            type: 'partner',
                            title: name,
                            description: `${role} - ${quote}`.trim(),
                            content: details,
                            link: `firm.html#partners-section`,
                            searchText: `${name} ${role} ${quote} ${details}`.toLowerCase()
                        });
                    }
                });
            }

            // 3. Extract main content sections from current page
            const sections = document.querySelectorAll('section, [role="main"] > div');
            sections.forEach(section => {
                const heading = section.querySelector('h1, h2, h3');
                if (heading) {
                    const title = heading.textContent.trim();
                    const paragraphs = Array.from(section.querySelectorAll('p'))
                        .map(p => p.textContent.trim())
                        .filter(text => text && !text.includes('Click') && text.length > 10)
                        .slice(0, 3)
                        .join(' ');
                    
                    if (title && title.length > 3) {
                        index.push({
                            type: 'page',
                            title: title,
                            description: paragraphs.substring(0, 150),
                            content: paragraphs,
                            link: window.location.pathname,
                            searchText: `${title} ${paragraphs}`.toLowerCase()
                        });
                    }
                }
            });

            // 4. Extract all headings and their associated content as searchable items
            const allHeadings = document.querySelectorAll('h2, h3, h4');
            allHeadings.forEach(heading => {
                const text = heading.textContent.trim();
                if (text && text.length > 3 && text.length < 100 && !text.includes('Click')) {
                    // Get the next paragraph or content
                    let nextContent = '';
                    let current = heading.nextElementSibling;
                    for (let i = 0; i < 2 && current; i++) {
                        if (current.tagName.match(/^(P|DIV|SPAN)$/i)) {
                            const contentText = current.textContent.trim();
                            if (contentText.length > 10) {
                                nextContent += contentText + ' ';
                            }
                        }
                        current = current.nextElementSibling;
                    }

                    if (nextContent.length > 10 && !nextContent.includes('Click')) {
                        index.push({
                            type: 'content',
                            title: text,
                            description: nextContent.substring(0, 150),
                            content: nextContent,
                            link: window.location.pathname + '#' + (heading.id || ''),
                            searchText: `${text} ${nextContent}`.toLowerCase()
                        });
                    }
                }
            });

            return index;
        };

        // Build initial index
        pageContentIndex = buildPageContentIndex();
        console.log('[main.js] Page content index built:', pageContentIndex.length, 'items');

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

        // Enhanced scoring algorithm - improved for numbers and special characters
        const scoreMatch = (searchTerms, normalizedQuery, text = '') => {
            let score = 0;
            let matchingTerms = 0;

            // Exact phrase match (highest priority)
            if (text.includes(normalizedQuery)) score += 100;

            // Individual term scoring
            searchTerms.forEach(term => {
                let termScore = 0;
                
                // Try word boundary matching first (for regular words)
                try {
                    // Escape special regex characters
                    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const wordRegex = new RegExp(`\\b${escapedTerm}\\b`, 'i');
                    
                    if (wordRegex.test(text)) {
                        termScore += 30; // Whole word match
                    }
                } catch (e) {
                    // If regex fails, skip word boundary matching
                }
                
                // Always check for substring match as fallback
                if (termScore === 0 && text.includes(term)) {
                    termScore += 15; // Partial match
                }
                
                // Boost score for substring match if not already scored
                if (termScore === 0) {
                    // Check if term appears at word boundaries (simple check for numbers)
                    const regex = new RegExp(`(^|\\s|-)${term}(\\s|$|[^a-z0-9])`, 'i');
                    if (regex.test(text)) {
                        termScore += 25; // Strong match for numbers/special content
                    } else if (text.toLowerCase().includes(term.toLowerCase())) {
                        termScore += 10; // Partial text match
                    }
                }

                if (termScore > 0) {
                    matchingTerms++;
                    score += termScore;
                }
            });

            // Bonus for matching multiple terms
            if (matchingTerms > 1) score += matchingTerms * 10;
            if (matchingTerms === searchTerms.length) score += 50;

            return { score, matchingTerms };
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

            // 1. Search through media content (Articles, News, Videos)
            mediaData.forEach(item => {
                const title = (item.title || '').toLowerCase();
                const description = (item.description || '').toLowerCase();
                const content = (item.content || '').toLowerCase().replace(/<[^>]*>/g, '');
                const meta = (item.meta || '').toLowerCase();
                const fullText = `${title} ${description} ${content} ${meta}`.toLowerCase();

                const { score, matchingTerms } = scoreMatch(searchTerms, normalizedQuery, fullText);

                // Extra scoring boost for media items in title
                let titleBonus = 0;
                if (title.includes(normalizedQuery)) {
                    titleBonus += 50; // Boost for exact phrase in title
                }
                
                // Boost for each search term found in title
                searchTerms.forEach(term => {
                    if (title.includes(term)) {
                        titleBonus += 20; // Boost for each term in title
                    }
                });
                
                const finalScore = score + titleBonus;

                if (finalScore > 0) {
                    results.push({
                        type: 'media',
                        title: item.title,
                        description: item.description,
                        content: item.content,
                        date: item.date,
                        mediaType: item.type,
                        link: `media.html?tab=${item.type}s&open_id=${item.id}`,
                        score: finalScore,
                        matchingTerms,
                        relevance: finalScore
                    });
                }
            });

            // 2. Search through page content index
            pageContentIndex.forEach(item => {
                const { score, matchingTerms } = scoreMatch(searchTerms, normalizedQuery, item.searchText);

                if (score > 0) {
                    results.push({
                        ...item,
                        score,
                        matchingTerms,
                        relevance: score
                    });
                }
            });

            // Sort by relevance score (highest first), then by type priority
            const typePriority = { media: 0, practice: 1, partner: 2, content: 3, page: 4 };
            results.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return (typePriority[a.type] || 5) - (typePriority[b.type] || 5);
            });

            displaySearchResults(results.slice(0, 15)); // Show top 15 results
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
                max-height: 600px !important;
                display: block !important;
            `;
            
            if (results.length === 0) {
                container.innerHTML = '<div class="search-no-results">No results found</div>';
                return;
            }

            let resultsHTML = '<div class="search-results-header">Search Results (' + results.length + ')</div>';
            
            results.forEach(item => {
                let typeIcon = 'fa-file-alt';
                let typeLabel = 'Content';
                let date = '';

                // Determine icon and label based on type
                if (item.type === 'media') {
                    typeIcon = item.mediaType === 'article' ? 'fa-newspaper' : 
                               item.mediaType === 'news' ? 'fa-bullhorn' : 'fa-video';
                    typeLabel = item.mediaType.charAt(0).toUpperCase() + item.mediaType.slice(1);
                    date = new Date(item.date).toLocaleDateString();
                } else if (item.type === 'practice') {
                    typeIcon = 'fa-gavel';
                    typeLabel = 'Practice Area';
                } else if (item.type === 'partner') {
                    typeIcon = 'fa-user-tie';
                    typeLabel = 'Partner';
                } else if (item.type === 'page') {
                    typeIcon = 'fa-file-lines';
                    typeLabel = 'Page';
                } else if (item.type === 'content') {
                    typeIcon = 'fa-paragraph';
                    typeLabel = 'Section';
                }

                const description = item.description || item.content?.substring(0, 100) || '';
                const dateDisplay = date ? `<span class="search-result-date">${date}</span>` : '';
                
                resultsHTML += `
                    <div class="search-result-item" data-link="${item.link}">
                        <div class="search-result-icon">
                            <i class="fa-solid ${typeIcon}"></i>
                        </div>
                        <div class="search-result-content">
                            <div class="search-result-title">${item.title}</div>
                            <div class="search-result-meta">
                                <span class="search-result-type">${typeLabel}</span>
                                ${dateDisplay}
                            </div>
                            <div class="search-result-description">${description.substring(0, 100)}${description.length > 100 ? '...' : ''}</div>
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
                // Extract video ID from regular YouTube URL or Shorts URL
                let videoId = (item.videourl.match(/[?&]v=([^&]+)/) || [])[1];
                if (!videoId) {
                    // Try to match YouTube Shorts URL pattern: youtube.com/shorts/VIDEO_ID
                    videoId = (item.videourl.match(/\/shorts\/([^?&\/]+)/) || [])[1];
                }
                if (!videoId) {
                    // Try to match youtu.be/VIDEO_ID pattern
                    videoId = (item.videourl.match(/youtu\.be\/([^?&\/]+)/) || [])[1];
                }
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
            
            // Highlight the card in the grid
            const gridContainerId = `${type}s-grid`;
            const gridContainer = document.getElementById(gridContainerId);
            if (gridContainer) {
                // Remove highlight from all cards
                gridContainer.querySelectorAll('.media-card.clickable').forEach(card => {
                    card.classList.remove('highlight-active');
                });
                // Add highlight to the current card
                const cardElement = gridContainer.querySelector(`[data-id="${id}"]`);
                if (cardElement) {
                    cardElement.classList.add('highlight-active');
                    // Scroll to the highlighted card
                    cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
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
            // Set search input value
            if (searchInput) {
                searchInput.value = searchQuery;
            }
            
            // Display search results immediately if data is already loaded, 
            // otherwise wait for db-data-loaded event
            if (mediaData.length > 0) {
                displaySearchResultsOnPage(searchQuery);
            }
        } else {
            let linkToActivate = document.querySelector(`.tab-link[data-tab="${tabToActivate}"]`);
            if (!linkToActivate) {
                linkToActivate = document.querySelector('.tab-link');
            }

            if (linkToActivate) {
                linkToActivate.click();
            }

            // Helper function to open content if it exists
            const attemptOpenContent = () => {
                if (openId) {
                    const itemToOpen = mediaData.find(i => i.id == openId); // Use == for loose comparison
                    if (itemToOpen) {
                        console.log('[main.js] Opening content with ID:', openId, 'Type:', itemToOpen.type);
                        // Open immediately on next tick to ensure DOM is ready
                        setTimeout(() => {
                            loadContent(itemToOpen.type, itemToOpen.id);
                            openModal(modals[itemToOpen.type]);
                        }, 200);
                    } else {
                        console.warn('[main.js] Could not find item with openId:', openId, 'Available IDs:', mediaData.map(i => i.id));
                    }
                }
            };

            // Re-apply tab content when DB data loads
            document.addEventListener('db-data-loaded', (e) => {
                // Update local mediaData with the fetched data
                if (e.detail && e.detail.mediaData) {
                    mediaData = e.detail.mediaData;
                    console.log('[main.js] Media page updated with DB data:', mediaData.length, 'items');
                    updateModalKeys(); // Update modal navigation keys
                    
                    // If there's a pending search query, display results now that data is loaded
                    if (searchQuery && mediaData.length > 0) {
                        console.log('[main.js] Displaying search results after DB load for query:', searchQuery);
                        displaySearchResultsOnPage(searchQuery);
                    }
                }
                if (linkToActivate && !searchQuery) {
                    linkToActivate.click();
                }
                // Try to open content after DB data loads
                attemptOpenContent();
            });

            // Try to open content if data is already loaded
            if (openId && mediaData.length > 0) {
                attemptOpenContent();
            }
        }

        // Handle db-data-loaded event for both search and normal tab modes
        document.addEventListener('db-data-loaded', (e) => {
            // Update local mediaData with the fetched data
            if (e.detail && e.detail.mediaData) {
                mediaData = e.detail.mediaData;
                console.log('[main.js] Media page updated with DB data:', mediaData.length, 'items');
                updateModalKeys(); // Update modal navigation keys
                
                // If there's a pending search query, display results now that data is loaded
                if (searchQuery && mediaData.length > 0) {
                    console.log('[main.js] Displaying search results after DB load for query:', searchQuery);
                    displaySearchResultsOnPage(searchQuery);
                }
            }
        });

        // Function to display search results on the media page
        function displaySearchResultsOnPage(query) {
            const results = [];
            const normalizedQuery = query.toLowerCase().trim();
            const searchTerms = normalizedQuery.split(/\s+/).filter(term => term.length > 0);

            console.log('[main.js] Search page: Processing search for:', query, 'with terms:', searchTerms);
            console.log('[main.js] Search page: Available media items:', mediaData.length);

            // Search through all media content with enhanced scoring
            mediaData.forEach(item => {
                const title = (item.title || '').toLowerCase();
                const description = (item.description || '').toLowerCase();
                const content = (item.content || '').toLowerCase().replace(/<[^>]*>/g, '');
                const meta = (item.meta || '').toLowerCase();
                const fullText = `${title} ${description} ${content} ${meta}`.toLowerCase();

                let score = 0;
                let matchingTerms = 0;

                // Exact phrase match (highest priority)
                if (title.includes(normalizedQuery)) score += 100;
                if (description.includes(normalizedQuery)) score += 50;
                if (content.includes(normalizedQuery)) score += 20;

                // Individual term scoring
                searchTerms.forEach(term => {
                    let termScore = 0;
                    
                    // Try word boundary matching first (for regular words)
                    try {
                        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const wordRegex = new RegExp(`\\b${escapedTerm}\\b`, 'i');
                        
                        if (wordRegex.test(title)) {
                            termScore += 40; // Strong match in title
                        }
                    } catch (e) {
                        // If regex fails, skip word boundary matching
                    }
                    
                    // Always check for substring match as fallback
                    if (termScore === 0) {
                        // Check if term appears at word boundaries (simple check for numbers)
                        const regex = new RegExp(`(^|\\s|-)${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$|[^a-z0-9])`, 'i');
                        if (regex.test(fullText)) {
                            termScore += 35; // Strong match for numbers/special content
                        } else if (title.includes(term)) {
                            termScore += 30; // Partial match in title
                        } else if (description.includes(term)) {
                            termScore += 15; // Match in description
                        } else if (content.includes(term)) {
                            termScore += 5; // Match in content
                        }
                    }

                    if (termScore > 0) {
                        matchingTerms++;
                        score += termScore;
                    }
                });

                // Bonus for matching multiple terms
                if (matchingTerms > 1) score += matchingTerms * 10;
                if (matchingTerms === searchTerms.length) score += 50;

                if (score > 0) {
                    results.push({
                        ...item,
                        score,
                        matchingTerms,
                        relevance: score
                    });
                }
            });

            console.log('[main.js] Search page: Found', results.length, 'matching items');

            // Sort by relevance
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
                const mediaSection = document.querySelector('.media-section');
                if (mediaSection) {
                    mediaSection.appendChild(searchResultsSection);
                }
            } else {
                searchResultsSection.classList.add('active');
            }

            // Display search results header
            let headerHTML = `
                <div class="search-results-page-header">
                    <h2>Search Results for "<strong>${query}</strong>"</h2>
                    <p>Found <strong>${results.length}</strong> result${results.length !== 1 ? 's' : ''}</p>
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
                searchResultsSection.innerHTML = headerHTML + `
                    <div class="media-grid" id="search-results-grid"></div>
                    <div id="search-results-pagination"></div>
                `;
                
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
        const googleAppScriptURL = 'https://script.google.com/macros/s/AKfycbwxuc5qtI4zJayp2T7BInHbYUbXFAdXsvaYH5W0dSHGp8qMK8ERRtTHYy74EC6lKBJL/exec';

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

