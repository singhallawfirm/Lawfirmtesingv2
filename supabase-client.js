 // supabase-client.js

// Ensure the Supabase SDK CDN is loaded before this file:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

(function() {
    if (window.__supabaseClientInitialized) return;

    const envUrl = typeof window !== 'undefined' && window.__env && window.__env.SUPABASE_URL;
    const envAnon = typeof window !== 'undefined' && window.__env && window.__env.SUPABASE_ANON_KEY;

    const SUPABASE_URL = envUrl || 'https://iepexiwwejqcqbeuelml.supabase.co';
    const SUPABASE_ANON_KEY = envAnon || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllcGV4aXd3ZWpxY3FiZXVlbG1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NjE0NTAsImV4cCI6MjA4MDUzNzQ1MH0.i0kAwGa_WgFkKFCo4eYRqkUmI1Rb7_d0-Zwr2h6OEBg';

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.error('[supabase-client] Missing Supabase URL or Anon Key.');
        return;
    }

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        console.error('[supabase-client] Supabase SDK not loaded. Include the CDN script before this file.');
        return;
    }

    const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    // Expose as both `supabaseClient` and override `window.supabase` for compatibility with existing code
    window.supabaseClient = sbClient;
    window.supabase = sbClient;
    window.__supabaseClientInitialized = true;

    // Helper reads
    window.getGalleryImages = async function() {
        try {
            console.log('[supabase-client] Fetching gallery images from:', SUPABASE_URL);
            const { data, error } = await sbClient
                .from('gallery_images')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) {
                console.error('[supabase-client] Gallery query error:', error);
                throw error;
            }
            console.log('[supabase-client] Gallery query success, rows:', data?.length || 0);
            return data || [];
        } catch (e) {
            console.warn('[supabase-client] Gallery read failed, using localStorage.', e);
            return JSON.parse(localStorage.getItem('galleryImages')) || [];
        }
    };

    window.getMediaContent = async function() {
        try {
            // Fetch from all 4 tables and combine
            const [articlesResult, newsResult, videosResult, documentsResult] = await Promise.all([
                sbClient.from('articles').select('*').order('date', { ascending: false }),
                sbClient.from('news').select('*').order('date', { ascending: false }),
                sbClient.from('videos').select('*').order('date', { ascending: false }),
                sbClient.from('documents').select('*').order('date', { ascending: false })
            ]);

            // Check for errors
            if (articlesResult.error) throw articlesResult.error;
            if (newsResult.error) throw newsResult.error;
            if (videosResult.error) throw videosResult.error;
            if (documentsResult.error) throw documentsResult.error;

            // Add type field to each item and combine
            const articles = (articlesResult.data || []).map(item => ({ ...item, type: 'article' }));
            const news = (newsResult.data || []).map(item => ({ ...item, type: 'news' }));
            const videos = (videosResult.data || []).map(item => ({ ...item, type: 'video' }));
            const documents = (documentsResult.data || []).map(item => ({ ...item, type: 'document' }));

            // Combine and sort by date
            const allMedia = [...articles, ...news, ...videos, ...documents]
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            return allMedia;
        } catch (e) {
            console.warn('[supabase-client] Media read failed, using localStorage.', e);
            return JSON.parse(localStorage.getItem('mediaContent')) || [];
        }
    };
})();
