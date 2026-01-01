# Enhanced Search Functionality Documentation

## Overview
The search system has been significantly improved to provide comprehensive results from all pages and content types. The search now indexes and searches through media content, practice areas, partner information, and all page content.

## What's Searchable

### 1. **Media Content** (Articles, News, Videos)
- Titles
- Descriptions
- Full article content
- Metadata

### 2. **Practice Areas** (From practices.html)
- Practice area names (e.g., "Civil Litigation", "Criminal Defense")
- Practice descriptions
- Detailed practice information
- Results link directly to practice sections

### 3. **Partner Information** (From firm.html)
- Partner names
- Partner titles/roles
- Partner biographies
- Results link to partners section

### 4. **Page Content** (From all pages)
- All headings (H1, H2, H3, H4)
- Section content
- Main content blocks
- Contextual paragraphs

## Search Algorithm

### Scoring System
The search uses an intelligent scoring algorithm that ranks results by relevance:

1. **Exact Phrase Match**: +100 points
   - If your search query appears exactly in the content

2. **Whole Word Match**: +30 points per term
   - Matches complete words with word boundaries

3. **Partial Match**: +15 points per term
   - Matches partial text within words

4. **Multi-term Bonuses**:
   - Matching 2+ search terms: +10 points per matching term
   - Matching all search terms: +50 additional points

5. **Content Type Weighting**:
   - Media content: Highest priority (most recent first)
   - Practice areas: High priority
   - Partner information: Medium priority
   - Page content: Lower priority

### Result Ranking
Results are sorted by:
1. **Relevance Score** (highest first)
2. **Content Type Priority** (media → practice → partner → content → page)
3. **Date** (newest first, for media content)

## Features

✅ **Comprehensive Indexing**: Automatically indexes all page content on page load  
✅ **Smart Scoring**: Intelligent algorithm prioritizes the most relevant results  
✅ **Multi-page Search**: Search works across all pages simultaneously  
✅ **Type-based Icons**: Different icons for different result types  
✅ **Detailed Metadata**: Shows content type, date (for media), and preview text  
✅ **Live Preview**: Shows first 100 characters of matching content  
✅ **Debounced Search**: Searches as you type (300ms debounce)  
✅ **Keyboard Navigation**: Full keyboard support for accessibility  
✅ **Responsive Design**: Works on all screen sizes  
✅ **Dark Mode Support**: Search results respect theme preference  

## Implementation Details

### File Modified
- **main.js**: Enhanced search functionality (lines 100-420)

### Key Functions

#### `buildPageContentIndex()`
Automatically builds a comprehensive index of all page content:
- Extracts practice areas from service cards
- Pulls partner information from partner cards
- Indexes all main content sections
- Creates searchable text for quick lookup

#### `scoreMatch(searchTerms, normalizedQuery, text)`
Calculates relevance score for a given text:
- Returns object with `score` and `matchingTerms`
- Uses word boundary regex for accuracy
- Considers both exact and partial matches

#### `performSearch(query)`
Main search function that:
1. Normalizes the search query
2. Searches media data
3. Searches page content index
4. Scores and ranks all results
5. Displays top 15 results

#### `displaySearchResults(results)`
Renders search results with:
- Type-specific icons and labels
- Content preview text
- Relevant metadata (date for media)
- Click handlers for navigation

### Data Structure
Each result item contains:
```javascript
{
    type: 'media|practice|partner|content|page',
    title: string,
    description: string,
    content: string,
    link: string,
    score: number,
    matchingTerms: number,
    relevance: number
}
```

## Usage Examples

### Search for Practice Areas
- Query: "litigation" → Returns "Civil Litigation" practice
- Query: "criminal defense" → Returns criminal practice details
- Query: "property law" → Returns property practice information

### Search for Partners
- Query: "partner name" → Returns partner info from firm page
- Query: "attorney" → Returns all partner results

### Search for Media Content
- Query: "article title" → Returns matching articles
- Query: "news keyword" → Returns matching news items
- Query: "video topic" → Returns matching videos

### Search for Page Content
- Query: "about firm" → Returns firm page sections
- Query: "legal services" → Returns services information
- Query: "contact" → Returns contact-related content

## Performance Optimizations

1. **Index Built Once**: Page content is indexed only once on page load
2. **Debounced Input**: Search waits 300ms after user stops typing
3. **Efficient Scoring**: Uses word boundary regex for accuracy
4. **Capped Results**: Returns top 15 results (not all matches)
5. **Lazy DOM Queries**: Queries only run on DOM changes

## Browser Compatibility

✅ Chrome/Edge 90+  
✅ Firefox 88+  
✅ Safari 14+  
✅ Mobile browsers (iOS Safari, Chrome Mobile)  

## Accessibility Features

- Keyboard navigation with Tab and Enter
- Proper ARIA labels on all elements
- Screen reader support for result types
- Focus management for dropdown
- Escape key to close results

## Future Enhancements

Potential improvements for future versions:
- Category filtering (Media, Practice Areas, Partners)
- Search suggestions/autocomplete
- Advanced search with boolean operators
- Search analytics/popular searches
- Full-text indexing service
- Search within results
- Saved searches
