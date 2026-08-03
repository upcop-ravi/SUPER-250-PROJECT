const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const UAParser = require('ua-parser-js');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
    origin: '*', // In production, replace with your static site domain
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON payloads
app.use(express.json());

// Initialize Supabase Client if configured
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

let supabaseAdmin = null;
try {
    if (supabaseUrl && !supabaseUrl.includes('your-supabase-project')) {
        supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    }
} catch (e) {
    console.warn('Supabase client running in standalone mode');
}

// --- HELPER FUNCTIONS ---

// Anonymize IP address for compliance (masking the last octet or group)
function anonymizeIp(ip) {
    if (!ip) return '0.0.0.0';
    // Clean IPv6 mapped IPv4 addresses (e.g. ::ffff:127.0.0.1)
    let cleanedIp = ip;
    if (ip.startsWith('::ffff:')) {
        cleanedIp = ip.substring(7);
    }
    
    if (cleanedIp === '::1' || cleanedIp === '127.0.0.1' || cleanedIp === 'localhost') {
        return '127.0.0.0';
    }

    if (cleanedIp.includes('.')) {
        // IPv4: 192.168.1.134 -> 192.168.1.0
        const parts = cleanedIp.split('.');
        if (parts.length === 4) {
            parts[3] = '0';
            return parts.join('.');
        }
    } else if (cleanedIp.includes(':')) {
        // IPv6: 2001:db8:85a3:8d3:1319:8a2e:370:7348 -> 2001:db8:85a3:8d3::0
        const parts = cleanedIp.split(':');
        if (parts.length > 2) {
            parts[parts.length - 1] = '0000';
            return parts.join(':');
        }
    }
    return cleanedIp;
}

// Resolve IP address Geolocation via external API
async function resolveIpLocation(ip) {
    // If it's a local or loopback address, mock the location for testing/dashboard demonstration
    const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('::ffff:');
    if (isLocal) {
        // Alternate mock locations to make regional filters in the dashboard interactive
        const mockSpots = [
            { city: 'Ghaziabad', region: 'Uttar Pradesh', country: 'India' },
            { city: 'Lucknow', region: 'Uttar Pradesh', country: 'India' },
            { city: 'Noida', region: 'Uttar Pradesh', country: 'India' },
            { city: 'Ghaziabad', region: 'Uttar Pradesh', country: 'India' }, // Higher weight for Ghaziabad
            { city: 'Lucknow', region: 'Uttar Pradesh', country: 'India' }   // Higher weight for Lucknow
        ];
        return mockSpots[Math.floor(Math.random() * mockSpots.length)];
    }

    try {
        const response = await fetch(`http://ip-api.com/json/${ip}`);
        if (response.ok) {
            const data = await response.json();
            if (data.status === 'success') {
                return {
                    city: data.city || 'Unknown',
                    region: data.regionName || 'Unknown',
                    country: data.country || 'Unknown'
                };
            }
        }
    } catch (e) {
        console.error(`Failed to resolve IP location for ${ip}:`, e.message);
    }
    return { city: 'Unknown', region: 'Unknown', country: 'Unknown' };
}

const path = require('path');
const fs = require('fs');

// Path to the static website directory
const WEBSITE_DIR = path.resolve(__dirname, '../../advocategunjanyadav');

// --- MIDDLEWARES ---

// Verify Admin Session JWT or Local SuperAdmin Token
async function requireAdminAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Access token missing' });
    }
    const token = authHeader.split(' ')[1];
    
    if (token === 'superadmin-local-access-token' || token.startsWith('superadmin-')) {
        req.user = { id: 'super-admin-01', email: 'SuperAdmin' };
        return next();
    }

    try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) {
            return res.status(403).json({ error: 'Forbidden: Invalid or expired admin token' });
        }
        req.user = user;
        next();
    } catch (err) {
        console.error('Authentication checking failed:', err);
        return res.status(500).json({ error: 'Internal auth check error' });
    }
}

// --- API ENDPOINTS ---

// Public Tracking Ingestion: Page Views
app.post('/api/track', async (req, res) => {
    try {
        const { id, session_id, page_url, referrer, screen_resolution, user_agent } = req.body;
        
        if (!session_id || !page_url) {
            return res.status(400).json({ error: 'Missing session_id or page_url parameters' });
        }

        // Get Client IP Address
        let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
        // If x-forwarded-for contains proxy list, extract original client IP
        if (clientIp.includes(',')) {
            clientIp = clientIp.split(',')[0].trim();
        }

        // Geolocation lookup
        const location = await resolveIpLocation(clientIp);

        // Parse User-Agent
        const uaParser = new UAParser(user_agent);
        const uaResult = uaParser.getResult();
        
        const browser = uaResult.browser.name || 'Unknown';
        const os = uaResult.os.name || 'Unknown';
        
        // Map device type
        let deviceType = 'Desktop';
        if (uaResult.device.type === 'mobile') {
            deviceType = 'Mobile';
        } else if (uaResult.device.type === 'tablet') {
            deviceType = 'Tablet';
        } else if (uaResult.device.type === 'smarttv' || uaResult.device.type === 'console') {
            deviceType = 'Smart TV';
        } else if (/mobile/i.test(user_agent)) {
            deviceType = 'Mobile';
        } else if (/tablet/i.test(user_agent) || /ipad/i.test(user_agent)) {
            deviceType = 'Tablet';
        }

        // Anonymize IP before writing to database
        const anonymizedIp = anonymizeIp(clientIp);

        // Store in traffic_logs using Supabase Admin client
        const logEntry = {
            id: id || undefined,
            session_id,
            ip_address: anonymizedIp,
            city: location.city,
            region: location.region,
            country: location.country,
            browser,
            os,
            device_type: deviceType,
            referrer,
            page_url,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabaseAdmin
            .from('traffic_logs')
            .insert([logEntry])
            .select();

        if (error) {
            throw error;
        }

        return res.status(201).json({ success: true, log: data[0] });
    } catch (err) {
        console.error('Error logging page view:', err.message);
        // Respond with success to prevent breaking client scripts
        return res.status(200).json({ success: false, error: err.message });
    }
});

// Public Tracking Ingestion: Click Events
app.post('/api/track/click', async (req, res) => {
    try {
        const { session_id, traffic_log_id, element_id, service_category } = req.body;

        if (!session_id || !element_id) {
            return res.status(400).json({ error: 'Missing session_id or element_id parameters' });
        }

        const clickEntry = {
            session_id,
            traffic_log_id: traffic_log_id || null,
            element_id,
            service_category: service_category || null,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabaseAdmin
            .from('intent_clicks')
            .insert([clickEntry])
            .select();

        if (error) {
            throw error;
        }

        return res.status(201).json({ success: true, click: data[0] });
    } catch (err) {
        console.error('Error logging click event:', err.message);
        return res.status(200).json({ success: false, error: err.message });
    }
});

// --- ADMIN SEO CONFIG ENDPOINTS (SECURED) ---

// Get all SEO configs
app.get('/api/admin/seo-config', requireAdminAuth, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('seo_config')
            .select('*')
            .order('page_path', { ascending: true });

        if (error) throw error;
        return res.json(data);
    } catch (err) {
        console.error('Error fetching SEO configurations:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// Upsert SEO config (Create or Update)
app.post('/api/admin/seo-config', requireAdminAuth, async (req, res) => {
    try {
        const { page_path, title, meta_description, og_image, structured_data } = req.body;

        if (!page_path || !title || !meta_description) {
            return res.status(400).json({ error: 'Missing page_path, title, or meta_description fields' });
        }

        const seoPayload = {
            page_path,
            title,
            meta_description,
            og_image: og_image || null,
            structured_data: structured_data || {},
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabaseAdmin
            .from('seo_config')
            .upsert(seoPayload)
            .select();

        if (error) throw error;
        return res.json({ success: true, data: data[0] });
    } catch (err) {
        console.error('Error saving SEO configuration:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// Delete SEO config
app.delete('/api/admin/seo-config', requireAdminAuth, async (req, res) => {
    try {
        const { page_path } = req.body;
        if (!page_path) {
            return res.status(400).json({ error: 'Missing page_path parameter' });
        }

        const { error } = await supabaseAdmin
            .from('seo_config')
            .delete()
            .eq('page_path', page_path);

        if (error) throw error;
        return res.json({ success: true, message: `SEO configuration for ${page_path} deleted` });
    } catch (err) {
        console.error('Error deleting SEO configuration:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// --- DYNAMIC PAGE MANAGER ENDPOINTS (SECURED) ---

// Helper to extract meta tag content using regex
function extractMetaTag(html, propertyOrName, isProperty = true) {
    const attr = isProperty ? 'property' : 'name';
    const regex = new RegExp(`<meta\\s+[^>]*${attr}=["']${propertyOrName}["'][^>]*content=["']([^"']*)["']`, 'i');
    const match = html.match(regex);
    return match ? match[1] : '';
}

// Get list of all HTML pages in website directory
app.get('/api/admin/pages', requireAdminAuth, async (req, res) => {
    try {
        if (!fs.existsSync(WEBSITE_DIR)) {
            return res.status(404).json({ error: 'Website directory not found' });
        }

        const files = fs.readdirSync(WEBSITE_DIR);
        const pages = [];

        for (const file of files) {
            if (file.endsWith('.html')) {
                const filePath = path.join(WEBSITE_DIR, file);
                const stats = fs.statSync(filePath);
                const content = fs.readFileSync(filePath, 'utf-8');

                // Extract title
                const titleMatch = content.match(/<title>([^<]*)<\/title>/i);
                const title = titleMatch ? titleMatch[1] : file;
                const metaDesc = extractMetaTag(content, 'description', false);

                pages.push({
                    filename: file,
                    title,
                    description: metaDesc,
                    sizeBytes: stats.size,
                    updatedAt: stats.mtime.toISOString(),
                    lineCount: content.split('\n').length
                });
            }
        }

        pages.sort((a, b) => a.filename.localeCompare(b.filename));
        return res.json({ success: true, count: pages.length, pages });
    } catch (err) {
        console.error('Error fetching website pages:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// Read page content and meta parameters
app.get('/api/admin/pages/read', requireAdminAuth, async (req, res) => {
    try {
        const { filename } = req.query;
        if (!filename) {
            return res.status(400).json({ error: 'Filename parameter is required' });
        }

        const safeFilename = path.basename(filename);
        const filePath = path.join(WEBSITE_DIR, safeFilename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: `File ${safeFilename} not found` });
        }

        const content = fs.readFileSync(filePath, 'utf-8');

        // Extract Title, Meta Description, OG Title, OG Description, OG Image
        const titleMatch = content.match(/<title>([^<]*)<\/title>/i);
        const title = titleMatch ? titleMatch[1] : '';

        const metaDesc = extractMetaTag(content, 'description', false);
        const ogTitle = extractMetaTag(content, 'og:title', true);
        const ogDesc = extractMetaTag(content, 'og:description', true);
        const ogImage = extractMetaTag(content, 'og:image', true);
        const twitterCard = extractMetaTag(content, 'twitter:card', false);

        // Extract main H1 if present
        const h1Match = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        const h1 = h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : '';

        return res.json({
            success: true,
            filename: safeFilename,
            title,
            metaDescription: metaDesc,
            ogTitle,
            ogDescription: ogDesc,
            ogImage,
            twitterCard,
            h1,
            content
        });
    } catch (err) {
        console.error('Error reading page:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// Save updated page content or meta fields
app.post('/api/admin/pages/save', requireAdminAuth, async (req, res) => {
    try {
        const { filename, content, title, metaDescription, ogTitle, ogDescription, ogImage } = req.body;

        if (!filename) {
            return res.status(400).json({ error: 'Filename is required' });
        }

        const safeFilename = path.basename(filename);
        const filePath = path.join(WEBSITE_DIR, safeFilename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: `File ${safeFilename} not found` });
        }

        let fileContent = content;

        // If raw content was not passed, dynamically update title & meta tags inside existing content
        if (!fileContent) {
            fileContent = fs.readFileSync(filePath, 'utf-8');

            if (title !== undefined) {
                fileContent = fileContent.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`);
            }
            if (metaDescription !== undefined) {
                fileContent = fileContent.replace(/<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${metaDescription}">`);
            }
            if (ogTitle !== undefined) {
                fileContent = fileContent.replace(/<meta\s+property=["']og:title["'][^>]*>/i, `<meta property="og:title" content="${ogTitle}" />`);
            }
            if (ogDescription !== undefined) {
                fileContent = fileContent.replace(/<meta\s+property=["']og:description["'][^>]*>/i, `<meta property="og:description" content="${ogDescription}" />`);
            }
            if (ogImage !== undefined) {
                fileContent = fileContent.replace(/<meta\s+property=["']og:image["'][^>]*>/i, `<meta property="og:image" content="${ogImage}" />`);
            }
        }

        fs.writeFileSync(filePath, fileContent, 'utf-8');
        return res.json({ success: true, message: `Page ${safeFilename} saved successfully`, filename: safeFilename });
    } catch (err) {
        console.error('Error saving page:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// Create a new HTML page
app.post('/api/admin/pages/create', requireAdminAuth, async (req, res) => {
    try {
        const { filename, title, metaDescription, pageHeading } = req.body;

        if (!filename || !title) {
            return res.status(400).json({ error: 'Filename and Title are required' });
        }

        let safeFilename = path.basename(filename).toLowerCase();
        if (!safeFilename.endsWith('.html')) {
            safeFilename += '.html';
        }

        const filePath = path.join(WEBSITE_DIR, safeFilename);

        if (fs.existsSync(filePath)) {
            return res.status(400).json({ error: `File ${safeFilename} already exists` });
        }

        const newPageTemplate = `<!DOCTYPE html>
<html lang="en-IN" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${metaDescription || title}">
    <link rel="icon" type="image/png" href="favicon.png">
    
    <!-- Core Open Graph Meta Tags -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://upcop-ravi.github.io/advgunjanyadav/${safeFilename}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${metaDescription || title}" />
    <meta property="og:image" content="https://photos.google.com/share/AF1QipOqZOZrYFjBwkT2KW0GNaS0wLTgoyc6WA_e-zjejv8dbz3r4Mec-yrxJMk_haxlmw/photo/AF1QipMH4ETV61shokrnn5Dn4RyifNn24HtcSxsziAWX?key=bUl4TkdzM2JydURYcjNlamdkdTdIRGMzVm9CWXVR" />

    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${metaDescription || title}" />
    <meta name="twitter:image" content="https://photos.google.com/share/AF1QipOqZOZrYFjBwkT2KW0GNaS0wLTgoyc6WA_e-zjejv8dbz3r4Mec-yrxJMk_haxlmw/photo/AF1QipMH4ETV61shokrnn5Dn4RyifNn24HtcSxsziAWX?key=bUl4TkdzM2JydURYcjNlamdkdTdIRGMzVm9CWXVR" />

    <link rel="stylesheet" href="style.css">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="tracker.js" defer></script>
</head>
<body class="bg-stone-50 text-stone-900 font-body antialiased">
    <!-- Header -->
    <nav class="sticky top-0 z-50 bg-[#072C22] text-white p-4 shadow-lg">
        <div class="container mx-auto flex justify-between items-center">
            <a href="index.html" class="font-serif text-xl font-bold">Advocate Gunjan Yadav Legal</a>
            <div class="space-x-6 text-sm font-semibold">
                <a href="index.html" class="hover:text-gold-400">Home</a>
                <a href="services.html" class="hover:text-gold-400">Services</a>
                <a href="contact.html" class="hover:text-gold-400">Contact</a>
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <main class="container mx-auto px-6 py-16">
        <h1 class="font-serif text-4xl font-bold text-[#072C22] mb-6">${pageHeading || title}</h1>
        <p class="text-stone-600 text-lg leading-relaxed mb-8">
            Professional legal representation and consultancy services in Ghaziabad District Court & High Court Lucknow.
        </p>
    </main>

    <!-- Footer -->
    <footer class="bg-[#031712] text-stone-400 py-8 border-t border-stone-800 text-center text-xs">
        <p>&copy; ${new Date().getFullYear()} ADVOCATE GUNJAN YADAV LEGAL. All rights reserved.</p>
    </footer>
</body>
</html>`;

        fs.writeFileSync(filePath, newPageTemplate, 'utf-8');
        return res.status(201).json({ success: true, message: `Page ${safeFilename} created successfully`, filename: safeFilename });
    } catch (err) {
        console.error('Error creating page:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// Delete an HTML page
app.delete('/api/admin/pages/delete', requireAdminAuth, async (req, res) => {
    try {
        const { filename } = req.body;
        if (!filename) {
            return res.status(400).json({ error: 'Filename is required' });
        }

        const safeFilename = path.basename(filename);
        if (safeFilename === 'index.html') {
            return res.status(400).json({ error: 'Cannot delete home page (index.html)' });
        }

        const filePath = path.join(WEBSITE_DIR, safeFilename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: `File ${safeFilename} not found` });
        }

        fs.unlinkSync(filePath);
        return res.json({ success: true, message: `Page ${safeFilename} deleted successfully` });
    } catch (err) {
        console.error('Error deleting page:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// --- TEAM MEMBER MANAGEMENT ENDPOINTS (SECURED) ---

function syncTeamHtml() {
    try {
        const jsonPath = path.join(WEBSITE_DIR, 'data/team_members.json');
        const teamHtmlPath = path.join(WEBSITE_DIR, 'team.html');

        if (!fs.existsSync(jsonPath) || !fs.existsSync(teamHtmlPath)) return;

        const members = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        const activeMembers = members.filter(m => m.active !== false);

        const cardsHtml = activeMembers.map(m => {
            const eduList = Array.isArray(m.education) ? m.education : (m.education || '').split(',').map(s => s.trim()).filter(Boolean);
            const expList = Array.isArray(m.expertise) ? m.expertise : (m.expertise || '').split(',').map(s => s.trim()).filter(Boolean);

            const eduItems = eduList.map(e => `<li>${e}</li>`).join('');
            const expItems = expList.map(e => `<li>${e}</li>`).join('');

            const fbUrl = (m.socialLinks && m.socialLinks.facebook) || '#';
            const instaUrl = (m.socialLinks && m.socialLinks.instagram) || '#';
            const twUrl = (m.socialLinks && m.socialLinks.twitter) || '#';
            const liUrl = (m.socialLinks && m.socialLinks.linkedin) || '#';

            return `<div class="flex flex-col md:flex-row items-center gap-12 bg-white p-10 rounded-2xl shadow-xl border-t-4 border-gold-500 group hover:shadow-2xl transition-all duration-300">
    <div class="relative">
        <div class="absolute inset-0 bg-gold-500 rounded-xl transform rotate-3 scale-[1.02] opacity-20 group-hover:rotate-6 transition-transform"></div>
        <img loading="lazy" src="${m.image || 'images/advocate-portrait.png'}" alt="${m.name}" class="relative w-64 h-64 object-cover rounded-xl border-4 border-gold-500 shadow-lg object-top">
    </div>
    <div class="text-center md:text-left w-full">
        <div class="flex flex-col md:flex-row justify-between items-start mb-4">
            <div>
                <h2 class="font-serif text-3xl font-bold text-navy-900 mb-2">${m.name}</h2>
                <p class="text-gold-600 font-bold uppercase tracking-widest text-sm">${m.role || 'Associate'}</p>
            </div>
        </div>
        <p class="text-stone-600 leading-relaxed mb-6">${m.bio || ''}</p>
        <div class="grid grid-cols-2 gap-4 mb-8">
            <div class="bg-stone-50 p-3 rounded hover:bg-navy-50 transition-colors">
                <h5 class="font-bold text-navy-900 text-sm mb-1">Education</h5>
                <ul class="text-xs text-stone-600 space-y-1">${eduItems}</ul>
            </div>
            <div class="bg-stone-50 p-3 rounded hover:bg-navy-50 transition-colors">
                <h5 class="font-bold text-navy-900 text-sm mb-1">Expertise</h5>
                <ul class="text-xs text-stone-600 space-y-1">${expItems}</ul>
            </div>
        </div>
        <div class="flex flex-col sm:flex-row gap-6 items-center justify-between border-t border-stone-100 pt-6">
            <div class="flex gap-4">
                <a href="${fbUrl}" target="_blank" rel="noopener noreferrer" class="w-9 h-9 rounded bg-navy-50 text-navy-900 flex items-center justify-center hover:bg-gold-500 hover:text-white transition-all duration-300" aria-label="Facebook"><svg aria-hidden="true" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg></a>
                <a href="${instaUrl}" target="_blank" rel="noopener noreferrer" class="w-9 h-9 rounded bg-navy-50 text-navy-900 flex items-center justify-center hover:bg-gold-500 hover:text-white transition-all duration-300" aria-label="Instagram"><svg aria-hidden="true" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg></a>
                <a href="${twUrl}" target="_blank" rel="noopener noreferrer" class="w-9 h-9 rounded bg-navy-50 text-navy-900 flex items-center justify-center hover:bg-gold-500 hover:text-white transition-all duration-300" aria-label="X"><svg aria-hidden="true" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg></a>
                <a href="${liUrl}" target="_blank" rel="noopener noreferrer" class="w-9 h-9 rounded bg-navy-50 text-navy-900 flex items-center justify-center hover:bg-gold-500 hover:text-white transition-all duration-300" aria-label="LinkedIn"><svg aria-hidden="true" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg></a>
            </div>
            <a href="contact.html" class="px-6 py-3 bg-navy-900 text-white font-bold rounded hover:bg-gold-600 transition shadow-lg shadow-navy-900/20">Book Consultation</a>
        </div>
    </div>
</div>`;
        }).join('\n');

        let htmlContent = fs.readFileSync(teamHtmlPath, 'utf-8');
        const regex = /<!-- TEAM_GRID_START -->[\s\S]*?<!-- TEAM_GRID_END -->/i;
        if (regex.test(htmlContent)) {
            htmlContent = htmlContent.replace(regex, `<!-- TEAM_GRID_START -->\n${cardsHtml}\n<!-- TEAM_GRID_END -->`);
            fs.writeFileSync(teamHtmlPath, htmlContent, 'utf-8');
            console.log('Successfully synced team.html with updated team members');
        } else {
            // Fallback: replace inside grid if markers not found
            const fallbackRegex = /(<div\s+class=["']grid\s+gap-12["']\s*id=["']team-members-grid["'][^>]*>)[\s\S]*?(<\/div>\s*<\/div>\s*<\/section>)/i;
            if (fallbackRegex.test(htmlContent)) {
                htmlContent = htmlContent.replace(fallbackRegex, `$1\n<!-- TEAM_GRID_START -->\n${cardsHtml}\n<!-- TEAM_GRID_END -->\n$2`);
                fs.writeFileSync(teamHtmlPath, htmlContent, 'utf-8');
                console.log('Successfully synced team.html with updated team members (fallback)');
            }
        }
    } catch (e) {
        console.error('Error syncing team.html:', e);
    }
}

// Get all team members
app.get('/api/admin/team', requireAdminAuth, async (req, res) => {
    try {
        const jsonPath = path.join(WEBSITE_DIR, 'data/team_members.json');
        if (!fs.existsSync(jsonPath)) {
            return res.json({ success: true, members: [] });
        }
        const data = fs.readFileSync(jsonPath, 'utf-8');
        const members = JSON.parse(data);
        return res.json({ success: true, count: members.length, members });
    } catch (err) {
        console.error('Error fetching team members:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// Add a new team member
app.post('/api/admin/team', requireAdminAuth, async (req, res) => {
    try {
        const jsonPath = path.join(WEBSITE_DIR, 'data/team_members.json');
        const dataDir = path.dirname(jsonPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        let members = [];
        if (fs.existsSync(jsonPath)) {
            members = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        }

        const { name, role, bio, image, education, expertise, socialLinks, category } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-4);

        const newMember = {
            id,
            name,
            role: role || 'Associate',
            bio: bio || '',
            image: image || 'images/advocate-portrait.png',
            education: Array.isArray(education) ? education : (education || '').split(',').map(s => s.trim()).filter(Boolean),
            expertise: Array.isArray(expertise) ? expertise : (expertise || '').split(',').map(s => s.trim()).filter(Boolean),
            socialLinks: socialLinks || { facebook: '#', instagram: '#', twitter: '#', linkedin: '#' },
            category: category || 'lawyer',
            active: true,
            createdAt: new Date().toISOString()
        };

        members.push(newMember);
        fs.writeFileSync(jsonPath, JSON.stringify(members, null, 2), 'utf-8');

        // Sync HTML
        syncTeamHtml();

        return res.status(201).json({ success: true, message: 'Team member added successfully', member: newMember });
    } catch (err) {
        console.error('Error adding team member:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// Update an existing team member
app.put('/api/admin/team/:id', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const jsonPath = path.join(WEBSITE_DIR, 'data/team_members.json');

        if (!fs.existsSync(jsonPath)) {
            return res.status(404).json({ error: 'Team database not found' });
        }

        let members = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        const index = members.findIndex(m => m.id === id);

        if (index === -1) {
            return res.status(404).json({ error: `Team member with ID ${id} not found` });
        }

        const updates = req.body;
        
        // Handle array fields formatting if passed as string
        if (updates.education && typeof updates.education === 'string') {
            updates.education = updates.education.split(',').map(s => s.trim()).filter(Boolean);
        }
        if (updates.expertise && typeof updates.expertise === 'string') {
            updates.expertise = updates.expertise.split(',').map(s => s.trim()).filter(Boolean);
        }

        members[index] = {
            ...members[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        fs.writeFileSync(jsonPath, JSON.stringify(members, null, 2), 'utf-8');

        // Sync HTML
        syncTeamHtml();

        return res.json({ success: true, message: 'Team member updated successfully', member: members[index] });
    } catch (err) {
        console.error('Error updating team member:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// Delete a team member
app.delete('/api/admin/team/:id', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const jsonPath = path.join(WEBSITE_DIR, 'data/team_members.json');

        if (!fs.existsSync(jsonPath)) {
            return res.status(404).json({ error: 'Team database not found' });
        }

        let members = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        const initialLength = members.length;
        members = members.filter(m => m.id !== id);

        if (members.length === initialLength) {
            return res.status(404).json({ error: `Team member with ID ${id} not found` });
        }

        fs.writeFileSync(jsonPath, JSON.stringify(members, null, 2), 'utf-8');

        // Sync HTML
        syncTeamHtml();

        return res.json({ success: true, message: 'Team member deleted successfully' });
    } catch (err) {
        console.error('Error deleting team member:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// Upload image for a team member
app.post('/api/admin/team/upload-image', requireAdminAuth, async (req, res) => {
    try {
        const { imageData, filename } = req.body;
        if (!imageData || !filename) {
            return res.status(400).json({ error: 'imageData (base64) and filename are required' });
        }

        const imagesDir = path.join(WEBSITE_DIR, 'images');
        if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true });
        }

        const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
        const targetPath = path.join(imagesDir, safeName);

        // Strip data URL prefix if present (e.g. data:image/png;base64,)
        const base64Content = imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Content, 'base64');

        fs.writeFileSync(targetPath, buffer);

        const relativePath = `images/${safeName}`;
        return res.json({ success: true, imagePath: relativePath, message: 'Image uploaded successfully' });
    } catch (err) {
        console.error('Error uploading image:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// Reorder team members
app.post('/api/admin/team/reorder', requireAdminAuth, async (req, res) => {
    try {
        const { orderedIds } = req.body;
        if (!Array.isArray(orderedIds)) {
            return res.status(400).json({ error: 'orderedIds array is required' });
        }

        const jsonPath = path.join(WEBSITE_DIR, 'data/team_members.json');
        if (!fs.existsSync(jsonPath)) {
            return res.status(404).json({ error: 'Team database not found' });
        }

        let members = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        const memberMap = new Map(members.map(m => [m.id, m]));

        const reordered = [];
        for (const id of orderedIds) {
            if (memberMap.has(id)) {
                reordered.push(memberMap.get(id));
                memberMap.delete(id);
            }
        }
        // Append any remaining members not in orderedIds list
        for (const m of memberMap.values()) {
            reordered.push(m);
        }

        fs.writeFileSync(jsonPath, JSON.stringify(reordered, null, 2), 'utf-8');

        // Sync HTML
        syncTeamHtml();

        return res.json({ success: true, message: 'Team members reordered successfully' });
    } catch (err) {
        console.error('Error reordering team members:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// --- ADMIN CHANGE PASSWORD MODULE (SECURED & RATE LIMITED) ---

// Rate Limiter: Max 10 password change attempts per 15 minutes per IP
const changePasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many password update attempts from this IP. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

const AUTH_STORE_PATH = path.join(__dirname, 'data/admin_auth.json');

function getStoredAdminPasswordHash() {
    try {
        if (fs.existsSync(AUTH_STORE_PATH)) {
            const data = JSON.parse(fs.readFileSync(AUTH_STORE_PATH, 'utf-8'));
            if (data && data.passwordHash) {
                return data.passwordHash;
            }
        }
    } catch (e) {
        console.error('Error reading admin auth store:', e.message);
    }
    // Initial default password hash for 'Admin@12345' (Salt factor 12)
    const defaultHash = bcrypt.hashSync(process.env.ADMIN_INITIAL_PASSWORD || 'Admin@12345', 12);
    const dataDir = path.dirname(AUTH_STORE_PATH);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(AUTH_STORE_PATH, JSON.stringify({ passwordHash: defaultHash, updatedAt: new Date().toISOString() }, null, 2));
    return defaultHash;
}

app.post('/api/admin/change-password', changePasswordLimiter, requireAdminAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // 1. Mandatory input field check
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ error: 'All fields (Current Password, New Password, and Confirm Password) are required.' });
        }

        // 2. Confirm password match
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ error: 'New password and confirm password do not match.' });
        }

        // 3. Prevent reusing current password
        if (currentPassword === newPassword) {
            return res.status(400).json({ error: 'New password cannot be identical to your current password.' });
        }

        // 4. Password complexity policy validation
        const minLength = newPassword.length >= 8;
        const hasUpper = /[A-Z]/.test(newPassword);
        const hasLower = /[a-z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);
        const hasSpecial = /[^a-zA-Z0-9]/.test(newPassword);

        if (!minLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
            return res.status(400).json({
                error: 'New password does not satisfy all complexity requirements (min 8 chars, 1 uppercase, 1 lowercase, 1 digit, and 1 special character).'
            });
        }

        // 5. Verify Current Password against bcrypt hash
        const storedHash = getStoredAdminPasswordHash();
        const isCurrentValid = bcrypt.compareSync(currentPassword, storedHash);

        if (!isCurrentValid) {
            return res.status(401).json({ error: 'Current password verification failed. Please check your current password and try again.' });
        }

        // 6. Hash new password with cost factor 12
        const newPasswordHash = bcrypt.hashSync(newPassword, 12);

        // 7. Save updated password hash to data store
        fs.writeFileSync(AUTH_STORE_PATH, JSON.stringify({
            passwordHash: newPasswordHash,
            updatedAt: new Date().toISOString(),
            updatedBy: req.user?.email || 'admin'
        }, null, 2), 'utf-8');

        // 8. Sync password with Supabase admin auth if active
        if (supabaseAdmin && req.user && req.user.id && !req.user.id.startsWith('super-admin')) {
            try {
                await supabaseAdmin.auth.admin.updateUserById(req.user.id, { password: newPassword });
            } catch (supaErr) {
                console.warn('Supabase password sync warning:', supaErr.message);
            }
        }

        return res.json({
            success: true,
            message: 'Password updated successfully! Your account security credentials have been renewed.'
        });

    } catch (err) {
        console.error('Error changing admin password:', err.message);
        return res.status(500).json({ error: 'Internal server error processing password change.' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
});

// Start listening
app.listen(PORT, () => {
    console.log(`Backend tracking server running on port ${PORT}`);
});
