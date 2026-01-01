# Search Functionality - Quick Reference Guide

## What Changed?

The search system now searches **every page and every piece of content** instead of just media articles.

## What Can You Search For?

| Content Type | Where It's From | What Shows Up | Link Goes To |
|---|---|---|---|
| **Practice Areas** | practices.html | Civil Litigation, Criminal Defense, Property Law, etc. | practices.html#[practice-name] |
| **Partners** | firm.html | Partner names, roles, bios | firm.html#partners-section |
| **Articles** | Database (Supabase) | Articles with dates | media.html?tab=articles |
| **News** | Database (Supabase) | News items with dates | media.html?tab=news |
| **Videos** | Database (Supabase) | Video titles | media.html?tab=videos |
| **Page Content** | Any page you're on | Sections, headings, text | Anchors on current page |

## How to Use the Search

### Basic Search
1. Click the **search icon** in the header
2. Type what you're looking for
3. Results appear automatically
4. Click any result to go there

### Search Examples

```
Query: "civil"
Results: Civil Litigation practice, any articles about civil law

Query: "Prateek"
Results: Partner named Prateek, any mention in articles

Query: "criminal defense"
Results: Criminal Defense practice, articles about criminal law

Query: "family law"
Results: Family Law practice area, related articles

Query: "litigation"
Results: Civil Litigation practice, litigation-related content
```

## How Results Are Ranked

Results are shown in order of **how relevant they are to your search**:

1. **Exact matches** (if your search term appears exactly) = Shown first
2. **Partial matches** (if your search term is part of the content) = Shown next
3. **Mentions** (if content mentions your topic) = Shown last

Within each group, results are ordered by:
- **Type**: Media → Practices → Partners → Content
- **Date**: Newest first (for media articles)

## Result Information

Each result shows:
- **Icon**: Identifies the type (📰 article, ⚖️ practice, 👔 partner, 📄 page)
- **Title**: The main heading or name
- **Type Label**: What kind of content it is
- **Date**: When published (for media only)
- **Preview**: First 100 characters of the content

## Search Tips

✅ **Do this:**
- Type 2+ characters to start searching
- Use single words for broader results
- Use multiple words to narrow down
- Try different keywords

❌ **Don't do this:**
- Search for single character (too broad)
- Use special characters (they're ignored)
- Click outside search to see results (results auto-hide)

## Keyboard Shortcuts

| Key | Action |
|---|---|
| Type | Search in real-time |
| Escape | Close search results |
| Tab | Navigate between results |
| Enter | Open highlighted result |
| Up/Down Arrows | Move through results (if supported) |

## Search Behavior

### Automatic Features
- **Debouncing**: Waits 300ms after you stop typing before searching
- **Auto-hide**: Results hide when you click outside
- **Auto-show**: Results show when search input is focused
- **Smart preview**: Shows relevant text snippet for each result

### What It Searches
- ✅ Page titles
- ✅ Practice area names and descriptions
- ✅ Partner names, roles, and biographies
- ✅ Article and news titles
- ✅ Article and news content
- ✅ All page headings and text
- ❌ Navigation menus (not searchable)
- ❌ HTML formatting (only text content)

## Features

- **Multi-page search**: Search works the same on every page
- **Smart ranking**: Shows most relevant results first
- **Result count**: See how many results found
- **Type indicators**: Know what kind of content you're clicking
- **Fast**: Results appear as you type
- **Mobile friendly**: Works on phones and tablets
- **Dark mode**: Respects your theme preference

## Troubleshooting

### Search not showing results?
- Try a different word
- Make sure you typed at least 2 characters
- Check if the content exists on the website

### Results don't look right?
- Click the search icon to close/reopen
- Refresh the page
- Check the browser console for errors

### Searching for practice area?
- Try the practice name (e.g., "civil litigation")
- Try a keyword (e.g., "litigation")
- Results link directly to the practice

### Searching for a partner?
- Try their name
- Try their role (e.g., "founder", "attorney")
- Results show their full bio

## Performance

- **Search speed**: <100 milliseconds
- **Debounce delay**: 300 milliseconds (feels instant)
- **Results shown**: Top 15 most relevant
- **Update frequency**: Every keystroke (with debounce)

## What's New vs Old

| Feature | Before | After |
|---|---|---|
| Search sources | Media only | Media + practices + partners + all page content |
| Results limit | 10 items | 15 items |
| Scoring algorithm | Basic | Advanced with bonuses |
| Type indicators | Simple | Enhanced with icons |
| Result metadata | Title, type, date | Title, type, date, preview, icon |
| Page content | Not searchable | Fully searchable |
| Practice areas | Not searchable | Fully searchable |
| Partners | Not searchable | Fully searchable |

## Real-World Examples

### Scenario 1: Client looking for practice area
```
User searches: "I need help with property"
Results shown:
1. Property Law (practice area) ⚖️
2. Articles about property law 📰
3. Any mentions on other pages 📄
User clicks → Goes directly to Property Law practice
```

### Scenario 2: Client looking for a specific partner
```
User searches: "Prateek"
Results shown:
1. Prateek Singhal (partner) 👔
2. Any articles by Prateek 📰
3. Any mentions in content 📄
User clicks → Goes to partners section on firm page
```

### Scenario 3: Client looking for information
```
User searches: "litigation"
Results shown:
1. Civil Litigation (practice area) ⚖️
2. Articles about litigation 📰
3. Mentions in other content 📄
4. Related page sections 📄
User gets comprehensive information
```

## Advanced Tips

- **Boolean search**: Not supported (yet)
- **Fuzzy matching**: Not supported (type carefully)
- **Search history**: Not saved (privacy feature)
- **Filters**: Not available (can be added)
- **Sorting**: Not customizable (sorted by relevance)

## Need Help?

- All content is searchable
- Try different keywords
- Results links will take you to the right place
- Check search documentation for technical details
