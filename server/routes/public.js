import express from 'express';
import { queryAll, queryOne } from '../config/db.js';
import { optionalAuthMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Explore public models
router.get('/models', async (req, res) => {
  try {
    const { search, category, industry, sort = 'popular', limit = 50 } = req.query;

    let sql = `
      SELECT m.id, m.title, m.slug, m.description, m.thumbnail_url, m.web_ready_file_url,
             m.original_file_format, m.ar_enabled, m.views_count, m.ar_views_count, m.qr_scans_count,
             m.created_at, b.name as business_name, b.industry as business_industry,
             c.name as category_name, c.slug as category_slug
      FROM models m
      JOIN businesses b ON m.business_id = b.id
      LEFT JOIN categories c ON m.category_id = c.id
      WHERE m.visibility = 'public' AND m.processing_status = 'ready' AND m.deleted_at IS NULL
    `;
    const params = [];

    if (search) {
      sql += ' AND (m.title LIKE ? OR m.description LIKE ? OR b.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category && category !== 'all') {
      sql += ' AND (c.slug = ? OR c.id = ?)';
      params.push(category, category);
    }

    if (industry && industry !== 'all') {
      sql += ' AND b.industry = ?';
      params.push(industry);
    }

    if (sort === 'newest') {
      sql += ' ORDER BY m.created_at DESC';
    } else if (sort === 'views') {
      sql += ' ORDER BY m.views_count DESC';
    } else if (sort === 'ar') {
      sql += ' ORDER BY m.ar_views_count DESC';
    } else {
      sql += ' ORDER BY (m.views_count + m.ar_views_count * 2) DESC'; // Popular
    }

    sql += ' LIMIT ?';
    params.push(parseInt(limit, 10));

    const models = await queryAll(sql, params);
    res.json(models);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Categories list
router.get('/categories', async (req, res) => {
  try {
    const categories = await queryAll(`
      SELECT c.*, COUNT(m.id) as model_count
      FROM categories c
      LEFT JOIN models m ON c.id = m.category_id AND m.visibility = 'public' AND m.deleted_at IS NULL
      GROUP BY c.id, c.name, c.slug, c.icon, c.description, c.sort_order
      ORDER BY c.sort_order ASC
    `);
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Industries list with counts
router.get('/industries', (req, res) => {
  try {
    const industries = [
      {
        id: 'ind-mfg',
        name: 'Industrial & Manufacturing',
        tagline: 'Assembly cells, robotic tooling, jigs, and plant automation components.',
        image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
        count: 24
      },
      {
        id: 'mach-eq',
        name: 'Machinery & Equipment',
        tagline: 'High-pressure pumps, compressors, hydraulic manifolds, and heavy turbines.',
        image: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80',
        count: 18
      },
      {
        id: 'comm-kit',
        name: 'Commercial Kitchens',
        tagline: 'Heavy-duty combi ovens, induction ranges, commercial refrigeration, and prep tables.',
        image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80',
        count: 12
      },
      {
        id: 'food-rest',
        name: 'Food & Restaurant',
        tagline: 'Display warmers, espresso bars, beverage dispensers, and dining room fixtures.',
        image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80',
        count: 15
      },
      {
        id: 'furn-int',
        name: 'Furniture & Interior',
        tagline: 'Contract office seating, height-adjustable workstations, and acoustic pods.',
        image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600&q=80',
        count: 29
      },
      {
        id: 'hosp-hot',
        name: 'Hospitality & Hotels',
        tagline: 'Modular luxury suites, lobby architectural elements, and bespoke guestroom furniture.',
        image: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=600&q=80',
        count: 14
      },
      {
        id: 'arch-con',
        name: 'Architecture & Construction',
        tagline: 'BIM prefab modules, structural steel connectors, HVAC runs, and exterior facades.',
        image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
        count: 22
      },
      {
        id: 'comm-spc',
        name: 'Commercial Spaces',
        tagline: 'Trade show exhibition booths, experiential retail displays, and POP fixtures.',
        image: 'https://images.unsplash.com/photo-1567449303078-57ad995bd301?auto=format&fit=crop&w=600&q=80',
        count: 16
      },
      {
        id: 'auto-eng',
        name: 'Automotive',
        tagline: 'Powertrains, turbocharger assemblies, EV battery packs, and suspension linkages.',
        image: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80',
        count: 20
      }
    ];

    res.json(industries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Curated featured models for Homepage
router.get('/featured', async (req, res) => {
  try {
    const featured = await queryAll(`
      SELECT m.id, m.title, m.slug, m.description, m.thumbnail_url, m.original_file_format,
             m.web_ready_file_url, m.qr_code_url, m.ar_enabled, m.visibility,
             m.views_count, m.ar_views_count, m.qr_scans_count,
             COALESCE(b.name, 'ModelAR Creator') as business_name,
             COALESCE(b.industry, '3D Assets') as business_industry,
             c.name as category_name
      FROM models m
      LEFT JOIN businesses b ON m.business_id = b.id
      LEFT JOIN categories c ON m.category_id = c.id
      WHERE m.visibility = 'public' AND m.processing_status = 'ready' AND m.deleted_at IS NULL
      ORDER BY (m.views_count + m.ar_views_count * 3) DESC, m.created_at DESC
      LIMIT 12
    `);
    res.json(featured);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public gallery showroom by id or slug
router.get('/galleries/:idOrSlug', optionalAuthMiddleware, async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const { token } = req.query;

    let gallery = await queryOne(`
      SELECT g.*, b.name as business_name, b.industry as business_industry,
             COUNT(m.id) as actual_model_count
      FROM galleries g
      JOIN businesses b ON g.business_id = b.id
      LEFT JOIN models m ON g.id = m.gallery_id AND m.deleted_at IS NULL
      WHERE (g.id = ? OR g.slug = ?) AND g.is_archived = 0
      GROUP BY g.id, g.business_id, g.name, g.slug, g.description, g.thumbnail_url, g.is_public, g.share_token, g.is_archived, g.created_at, g.updated_at, b.name, b.industry
    `, [idOrSlug, idOrSlug]);

    if (!gallery && (idOrSlug === 'general-showcase' || idOrSlug.startsWith('general-showcase'))) {
      gallery = await queryOne(`
        SELECT g.*, b.name as business_name, b.industry as business_industry,
               COUNT(m.id) as actual_model_count
        FROM galleries g
        JOIN businesses b ON g.business_id = b.id
        LEFT JOIN models m ON g.id = m.gallery_id AND m.deleted_at IS NULL
        WHERE (g.slug LIKE ? OR g.id LIKE ?) AND g.is_archived = 0
        GROUP BY g.id, g.business_id, g.name, g.slug, g.description, g.thumbnail_url, g.is_public, g.share_token, g.is_archived, g.created_at, g.updated_at, b.name, b.industry
        ORDER BY actual_model_count DESC
        LIMIT 1
      `, [`%${idOrSlug}%`, `%${idOrSlug}%`]);
    }

    if (!gallery) {
      return res.status(404).json({ error: 'Gallery not found or has been archived' });
    }

    // Privacy & Share-Link Authorization Check
    const isPublic = gallery.is_public === 1 || gallery.is_public === true || gallery.is_public === '1';
    const isTokenMatch = Boolean(token && gallery.share_token && token === gallery.share_token);
    const isOwnerOrTeam = Boolean(
      req.user && (
        req.user.role === 'admin' ||
        (req.business && req.business.id === gallery.business_id)
      )
    );

    if (!isPublic && !isTokenMatch && !isOwnerOrTeam) {
      return res.status(403).json({
        is_private: true,
        id: gallery.id,
        name: gallery.name,
        business_name: gallery.business_name,
        error: 'This gallery is private. Only users with the owner\'s shared link can view it.'
      });
    }

    const models = await queryAll(`
      SELECT m.id, m.title, m.slug, m.description, m.thumbnail_url, m.web_ready_file_url,
             m.original_file_format, m.ar_enabled, m.views_count, m.ar_views_count, m.qr_scans_count,
             m.storage_total_bytes, m.original_file_size, m.processing_status,
             c.name as category_name
      FROM models m
      LEFT JOIN categories c ON m.category_id = c.id
      WHERE m.gallery_id = ? AND m.deleted_at IS NULL
      ORDER BY m.created_at DESC
    `, [gallery.id]);

    // Don't leak share_token in response to external viewers unless owner/team
    const sanitizedGallery = { ...gallery };
    if (!isOwnerOrTeam) {
      delete sanitizedGallery.share_token;
    }

    res.json({
      ...sanitizedGallery,
      is_shared_access: !isPublic && isTokenMatch,
      models
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Contact form submission
router.post('/contact', (req, res) => {
  const { name, email, company, industry, message } = req.body;
  res.json({ message: 'Thank you for reaching out to ModelAR. Our enterprise specialist will connect within 24 hours.' });
});

export default router;
