import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { AiServiceError, runAiCompanionChat } from './src/server/aiCompanion.ts';
import {
  calculateAffiliateCommission,
  calculateBabyAgeMonths,
  calculateOrderTotalWithCoupon,
  isSlotAvailable,
  rankAndDiversifyFeed,
  splitCartIntoSellerOrders,
  validateAndApplyCoupon,
  validateBabyReminderInput,
  validateOrderInput,
  validatePostInput,
} from './src/lib/domain.ts';
import { checkMessageRateLimit, getDb, saveDb } from './src/server/store.ts';
import { IMG } from './src/server/seed.ts';
import type {
  AppointmentItem,
  BabyProfile,
  BabyReminder,
  FeedTab,
  Language,
  OrderItem,
  PostItem,
  ProductItem,
  QuestionItem,
  SupportTicket,
} from './src/types/platform.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  const UPLOADS_VIDEO_DIR = path.resolve(process.cwd(), 'data/uploads/videos');
  fs.mkdirSync(UPLOADS_VIDEO_DIR, { recursive: true });

  app.use('/videos', express.static(path.resolve(process.cwd(), 'public/videos')));
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'data/uploads')));

  app.use(express.json({ limit: '25mb' }));

  // Basic security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  const api = express.Router();

  const getViewerId = (req: express.Request): string => {
    const headerUid = req.header('x-viewer-id');
    const queryUid = typeof req.query.viewerId === 'string' ? req.query.viewerId : undefined;
    return (headerUid || queryUid || 'guest_demo').replace(/[^a-zA-Z0-9_\-]/g, '');
  };

  api.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'mother-and-child-api', version: 'v1' });
  });

  // 1. DISCOVERY FEED & RECOMMENDATIONS (Cursor-based pagination)
  api.get('/feed', (req, res) => {
    const db = getDb();
    const viewerId = getViewerId(req);
    const tab = (typeof req.query.tab === 'string' ? req.query.tab : 'discover') as FeedTab;
    const category = typeof req.query.category === 'string' ? req.query.category : 'all';
    const lang = (req.query.lang === 'en' ? 'en' : 'bn') as Language;
    const search = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const cursor = Math.max(0, Number(req.query.cursor || 0));
    const limit = Math.min(24, Math.max(4, Number(req.query.limit || 12)));

    const followedIds = db.followedIdsByUser[viewerId] ?? [];
    const blockedAuthorIds = db.blockedIdsByUser[viewerId] ?? [];

    let ranked = rankAndDiversifyFeed(db.posts, {
      tab,
      category,
      followedIds,
      interestCategories: ['newborn', 'baby_food', 'baby_care', 'pregnancy'],
      blockedAuthorIds,
      preferredLang: lang,
    });

    if (search) {
      ranked = ranked.filter(
        (p) =>
          p.titleEn.toLowerCase().includes(search) ||
          p.titleBn.toLowerCase().includes(search) ||
          p.captionEn.toLowerCase().includes(search) ||
          p.captionBn.toLowerCase().includes(search) ||
          p.hashtags.some((h) => h.toLowerCase().includes(search))
      );
    }

    const slice = ranked.slice(cursor, cursor + limit);
    const nextCursor = cursor + slice.length < ranked.length ? cursor + slice.length : null;
    const likedSet = new Set(db.likedPostIdsByUser[viewerId] ?? []);
    const savedSet = new Set(db.savedPostIdsByUser[viewerId] ?? []);

    res.json({
      items: slice.map((p) => ({
        ...p,
        isLiked: likedSet.has(p.id),
        isSaved: savedSet.has(p.id),
        isFollowingAuthor: followedIds.includes(p.authorId),
      })),
      nextCursor,
      total: ranked.length,
    });
  });

  // 2. CREATE / EDIT / DELETE POSTS & VIDEO UPLOAD CONTRACT
  api.post('/videos/upload-url', (req, res) => {
    const { filename, sizeBytes, durationSec } = req.body ?? {};
    if (!filename || typeof sizeBytes !== 'number') {
      return res.status(400).json({ error: 'Filename and file size are required.' });
    }
    if (!/\.(mp4|mov|webm)$/i.test(String(filename))) {
      return res.status(400).json({ error: 'Only MP4, MOV, or WebM videos are supported.' });
    }
    if (typeof durationSec === 'number' && durationSec > 180) {
      return res.status(400).json({ error: 'Initial short video limit is 3 minutes (180s).' });
    }

    const hasStreamCreds = Boolean(process.env.VIDEO_PROVIDER_ACCOUNT_ID && process.env.VIDEO_PROVIDER_API_TOKEN);
    const assetId = `vid_${Date.now()}`;
    res.json({
      assetId,
      provider: hasStreamCreds ? 'cloudflare_stream' : 'demo_preview_pipeline',
      integrationPending: !hasStreamCreds,
      uploadUrl: hasStreamCreds ? `https://upload.videodelivery.net/${assetId}` : null,
      status: 'ready',
      message: hasStreamCreds
        ? 'Direct upload authorized.'
        : 'Video provider credentials unset — running in clearly labeled demo preview mode.',
    });
  });

  api.post('/videos/upload', (req, res) => {
    const { filename, base64Data, durationSec } = req.body ?? {};
    if (!filename || typeof base64Data !== 'string' || !base64Data) {
      return res.status(400).json({ error: 'Filename and base64 video payload are required.' });
    }
    const extMatch = String(filename).match(/\.(mp4|mov|webm)$/i);
    if (!extMatch) {
      return res.status(400).json({ error: 'Only MP4, MOV, or WebM videos are supported.' });
    }
    if (typeof durationSec === 'number' && durationSec > 180) {
      return res.status(400).json({ error: 'Initial short video limit is 3 minutes (180s).' });
    }
    const cleaned = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const buffer = Buffer.from(cleaned, 'base64');
    if (buffer.length < 32 || buffer.length > 20 * 1024 * 1024) {
      return res.status(400).json({ error: 'Video file size must be under 20MB.' });
    }
    const ext = extMatch[1].toLowerCase();
    const assetId = `vid_${Date.now()}`;
    const storedName = `${assetId}.${ext}`;
    fs.writeFileSync(path.join(UPLOADS_VIDEO_DIR, storedName), buffer);
    res.status(201).json({
      assetId,
      videoUrl: `/uploads/videos/${storedName}`,
      status: 'ready',
      message: 'Video uploaded and ready for HTML5 playback.',
    });
  });

  api.post('/posts', (req, res) => {
    const db = getDb();
    const viewerId = getViewerId(req);
    const body = req.body ?? {};
    const validationErr = validatePostInput({
      title: body.titleEn || body.titleBn || body.title,
      caption: body.captionEn || body.captionBn || body.caption,
      category: body.category,
      videoDurationSec: body.videoDurationSec,
    });
    if (validationErr) {
      return res.status(400).json({ error: validationErr });
    }

    const user = db.users.find((u) => u.uid === viewerId) ?? db.users[db.users.length - 1];
    const isVideo = body.type === 'short_video' || body.type === 'long_video';
    const fallbackImg =
      body.category === 'baby_food'
        ? IMG.babyFood
        : body.category === 'pregnancy'
          ? IMG.pregnancy
          : body.category === 'product_reviews'
            ? IMG.skincare
            : IMG.motherNewborn;
    const hasRealVideo =
      isVideo &&
      Array.isArray(body.mediaUrls) &&
      body.mediaUrls.some((u: string) => u.startsWith('/videos/') || u.startsWith('/uploads/') || /\.(mp4|mov|webm)$/i.test(u));

    const newPost: PostItem = {
      id: `post_${Date.now()}`,
      authorId: user.uid,
      authorName: user.displayName,
      authorUsername: user.username,
      authorAvatar: user.avatarUrl,
      type: body.type || 'photo',
      category: body.category,
      titleEn: String(body.titleEn || body.title || '').trim(),
      titleBn: String(body.titleBn || body.title || body.titleEn || '').trim(),
      captionEn: String(body.captionEn || body.caption || '').trim(),
      captionBn: String(body.captionBn || body.caption || body.captionEn || '').trim(),
      mediaUrls:
        Array.isArray(body.mediaUrls) && body.mediaUrls.length > 0
          ? body.mediaUrls
          : isVideo
            ? ['/videos/newborn.mp4', fallbackImg]
            : [fallbackImg],
      aspectRatio: body.aspectRatio || (isVideo ? '9:16' : '4:3'),
      isVideo,
      videoDurationSec: isVideo ? Number(body.videoDurationSec || 45) : undefined,
      videoStatus: isVideo ? 'ready' : undefined,
      videoDemoMode: isVideo ? !hasRealVideo : undefined,
      hashtags: Array.isArray(body.hashtags) ? body.hashtags.slice(0, 8) : [],
      taggedProductIds: Array.isArray(body.taggedProductIds) ? body.taggedProductIds.slice(0, 4) : [],
      location: body.location ? String(body.location).slice(0, 60) : user.location,
      isSponsored: Boolean(body.isSponsored),
      language: 'both',
      moderationStatus: 'approved',
      likesCount: 0,
      commentsCount: 0,
      savesCount: 0,
      viewsCount: 1,
      createdAt: new Date().toISOString(),
    };

    db.posts.unshift(newPost);
    db.comments[newPost.id] = [];
    saveDb(db);
    res.status(201).json(newPost);
  });

  api.patch('/posts/:id', (req, res) => {
    const db = getDb();
    const viewerId = getViewerId(req);
    const post = db.posts.find((p) => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    if (post.authorId !== viewerId) return res.status(403).json({ error: 'Only the author can edit this post.' });
    if (req.body.title) {
      post.titleEn = String(req.body.title).trim();
      post.titleBn = String(req.body.title).trim();
    }
    if (req.body.caption) {
      post.captionEn = String(req.body.caption).trim();
      post.captionBn = String(req.body.caption).trim();
    }
    saveDb(db);
    res.json(post);
  });

  api.delete('/posts/:id', (req, res) => {
    const db = getDb();
    const viewerId = getViewerId(req);
    const idx = db.posts.findIndex((p) => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Post not found.' });
    if (db.posts[idx].authorId !== viewerId && viewerId !== 'guest_demo') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    db.posts.splice(idx, 1);
    saveDb(db);
    res.json({ deleted: true });
  });

  api.post('/posts/:id/like', (req, res) => {
    const db = getDb();
    const viewerId = getViewerId(req);
    const post = db.posts.find((p) => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    const list = db.likedPostIdsByUser[viewerId] ?? [];
    const exists = list.includes(post.id);
    if (exists) {
      db.likedPostIdsByUser[viewerId] = list.filter((id) => id !== post.id);
      post.likesCount = Math.max(0, post.likesCount - 1);
    } else {
      db.likedPostIdsByUser[viewerId] = [...list, post.id];
      post.likesCount += 1;
    }
    saveDb(db);
    res.json({ isLiked: !exists, likesCount: post.likesCount });
  });

  api.post('/posts/:id/save', (req, res) => {
    const db = getDb();
    const viewerId = getViewerId(req);
    const post = db.posts.find((p) => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    const list = db.savedPostIdsByUser[viewerId] ?? [];
    const exists = list.includes(post.id);
    if (exists) {
      db.savedPostIdsByUser[viewerId] = list.filter((id) => id !== post.id);
      post.savesCount = Math.max(0, post.savesCount - 1);
    } else {
      db.savedPostIdsByUser[viewerId] = [...list, post.id];
      post.savesCount += 1;
    }
    saveDb(db);
    res.json({ isSaved: !exists, savesCount: post.savesCount });
  });

  api.get('/posts/:id/comments', (req, res) => {
    const db = getDb();
    res.json(db.comments[req.params.id] ?? []);
  });

  api.post('/posts/:id/comments', (req, res) => {
    const db = getDb();
    const viewerId = getViewerId(req);
    const post = db.posts.find((p) => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    const content = String(req.body?.content || '').trim();
    if (content.length < 1 || content.length > 1000) {
      return res.status(400).json({ error: 'Comment must be between 1 and 1000 characters.' });
    }
    const user = db.users.find((u) => u.uid === viewerId) ?? db.users[db.users.length - 1];
    const comment = {
      id: `cmt_${Date.now()}`,
      postId: post.id,
      authorId: user.uid,
      authorName: user.displayName,
      authorAvatar: user.avatarUrl,
      content,
      parentCommentId: req.body?.parentCommentId,
      likesCount: 0,
      createdAt: new Date().toISOString(),
    };
    db.comments[post.id] = [comment, ...(db.comments[post.id] ?? [])];
    post.commentsCount += 1;
    saveDb(db);
    res.status(201).json(comment);
  });

  // 3. FOLLOW, BLOCK, USERS & CREATORS
  api.post('/users/:id/follow', (req, res) => {
    const db = getDb();
    const viewerId = getViewerId(req);
    const targetId = req.params.id;
    const list = db.followedIdsByUser[viewerId] ?? [];
    const targetUser = db.users.find((u) => u.uid === targetId);
    const exists = list.includes(targetId);
    if (exists) {
      db.followedIdsByUser[viewerId] = list.filter((id) => id !== targetId);
      if (targetUser) targetUser.followersCount = Math.max(0, targetUser.followersCount - 1);
    } else {
      db.followedIdsByUser[viewerId] = [...list, targetId];
      if (targetUser) targetUser.followersCount += 1;
    }
    saveDb(db);
    res.json({ isFollowing: !exists, followersCount: targetUser?.followersCount ?? 0 });
  });

  api.post('/users/:id/block', (req, res) => {
    const db = getDb();
    const viewerId = getViewerId(req);
    const list = db.blockedIdsByUser[viewerId] ?? [];
    if (!list.includes(req.params.id)) {
      db.blockedIdsByUser[viewerId] = [...list, req.params.id];
      saveDb(db);
    }
    res.json({ blocked: true });
  });

  api.get('/creators', (req, res) => {
    const db = getDb();
    const viewerId = getViewerId(req);
    const followed = new Set(db.followedIdsByUser[viewerId] ?? []);
    const creators = db.users
      .filter((u) => u.roles.includes('creator') || u.roles.includes('doctor'))
      .map((u) => ({ ...u, isFollowing: followed.has(u.uid) }));
    res.json(creators);
  });

  api.get('/creators/:username', (req, res) => {
    const db = getDb();
    const viewerId = getViewerId(req);
    const user = db.users.find((u) => u.username === req.params.username || u.uid === req.params.username);
    if (!user) return res.status(404).json({ error: 'Profile not found.' });
    const posts = db.posts.filter((p) => p.authorId === user.uid && p.moderationStatus === 'approved');
    const followed = new Set(db.followedIdsByUser[viewerId] ?? []);
    res.json({ user: { ...user, isFollowing: followed.has(user.uid) }, posts });
  });

  // 4. COMMUNITY Q&A & POLLS
  api.get('/questions', (_req, res) => {
    const db = getDb();
    res.json({
      questions: db.questions.filter((q) => q.moderationStatus === 'approved'),
      polls: db.polls,
    });
  });

  api.post('/questions', (req, res) => {
    const db = getDb();
    const viewerId = getViewerId(req);
    const { title, body, category, isAnonymous } = req.body ?? {};
    if (!title || String(title).trim().length < 5 || !body || String(body).trim().length < 8) {
      return res.status(400).json({ error: 'Question title and details are required.' });
    }
    const user = db.users.find((u) => u.uid === viewerId) ?? db.users[db.users.length - 1];
    const newQ: QuestionItem = {
      id: `q_${Date.now()}`,
      authorId: user.uid,
      authorDisplayName: isAnonymous ? 'নাম গোপন রাখা হয়েছে (Anonymous Mother)' : user.displayName,
      isAnonymous: Boolean(isAnonymous),
      category: category || 'pregnancy',
      titleEn: String(title).trim(),
      titleBn: String(title).trim(),
      bodyEn: String(body).trim(),
      bodyBn: String(body).trim(),
      likesCount: 0,
      answersCount: 0,
      moderationStatus: 'approved',
      answers: [],
      createdAt: new Date().toISOString(),
    };
    db.questions.unshift(newQ);
    saveDb(db);
    res.status(201).json(newQ);
  });

  api.post('/questions/:id/like', (req, res) => {
    const db = getDb();
    const q = db.questions.find((item) => item.id === req.params.id);
    if (!q) return res.status(404).json({ error: 'Question not found.' });
    q.likesCount += 1;
    saveDb(db);
    res.json({ likesCount: q.likesCount });
  });

  api.post('/questions/:id/answers', (req, res) => {
    const db = getDb();
    const viewerId = getViewerId(req);
    const q = db.questions.find((item) => item.id === req.params.id);
    if (!q) return res.status(404).json({ error: 'Question not found.' });
    const body = String(req.body?.body || '').trim();
    if (body.length < 3) return res.status(400).json({ error: 'Answer cannot be empty.' });
    const user = db.users.find((u) => u.uid === viewerId) ?? db.users[db.users.length - 1];
    const answer = {
      id: `ans_${Date.now()}`,
      questionId: q.id,
      authorId: user.uid,
      authorName: user.displayName,
      isDoctorVerified: user.roles.includes('doctor'),
      body,
      parentAnswerId: req.body?.parentAnswerId ? String(req.body.parentAnswerId) : undefined,
      likesCount: 0,
      createdAt: new Date().toISOString(),
    };
    q.answers.push(answer);
    q.answersCount = q.answers.length;
    saveDb(db);
    res.status(201).json(answer);
  });

  api.post('/questions/:id/best-answer', (req, res) => {
    const db = getDb();
    const q = db.questions.find((item) => item.id === req.params.id);
    if (!q) return res.status(404).json({ error: 'Question not found.' });
    q.bestAnswerId = req.body?.answerId;
    saveDb(db);
    res.json(q);
  });

  api.post('/polls', (req, res) => {
    const db = getDb();
    const { question, options } = req.body ?? {};
    const cleanQ = String(question || '').trim();
    const cleanOpts = Array.isArray(options)
      ? options.map((o) => String(o || '').trim()).filter(Boolean).slice(0, 4)
      : [];
    if (cleanQ.length < 5 || cleanOpts.length < 2) {
      return res.status(400).json({ error: 'Poll question and at least 2 options are required.' });
    }
    const viewerId = getViewerId(req);
    const viewer = db.users.find((u) => u.uid === viewerId) ?? db.users[db.users.length - 1];
    const created = {
      id: `poll_${Date.now()}`,
      authorId: viewer.uid,
      authorName: viewer.displayName,
      category: String(req.body?.category || 'motherhood'),
      questionEn: cleanQ,
      questionBn: cleanQ,
      options: cleanOpts.map((label, idx) => ({
        id: `opt_${Date.now()}_${idx}`,
        labelEn: label,
        labelBn: label,
        votes: 0,
      })),
      totalVotes: 0,
      createdAt: new Date().toISOString(),
    };
    db.polls.unshift(created);
    saveDb(db);
    res.status(201).json(created);
  });

  api.post('/polls/:id/vote', (req, res) => {
    const db = getDb();
    const poll = db.polls.find((p) => p.id === req.params.id);
    if (!poll) return res.status(404).json({ error: 'Poll not found.' });
    const opt = poll.options.find((o) => o.id === req.body?.optionId);
    if (!opt) return res.status(400).json({ error: 'Invalid poll option.' });
    opt.votes += 1;
    poll.totalVotes += 1;
    saveDb(db);
    res.json(poll);
  });

  // 5. DOCTOR CORNER & ATOMIC APPOINTMENTS
  api.get('/doctors', (_req, res) => {
    const db = getDb();
    res.json(db.doctors);
  });

  api.get('/doctors/:id', (req, res) => {
    const db = getDb();
    const doc = db.doctors.find((d) => d.id === req.params.id);
    if (!doc) return res.status(404).json({ error: 'Doctor not found.' });
    const booked = db.appointments.filter((a) => a.doctorId === doc.id && a.status !== 'cancelled');
    res.json({ doctor: doc, bookedSlots: booked.map((b) => ({ date: b.date, slot: b.slot })) });
  });

  api.get('/appointments', (req, res) => {
    const db = getDb();
    const viewerId = getViewerId(req);
    const items = db.appointments.filter((a) => a.patientId === viewerId || viewerId === 'guest_demo');
    res.json(items);
  });

  api.post('/appointments', (req, res) => {
    const db = getDb();
    const viewerId = getViewerId(req);
    const { doctorId, date, slot, consultationType, paymentMethod, patientName, notes } = req.body ?? {};
    const doctor = db.doctors.find((d) => d.id === doctorId);
    if (!doctor) return res.status(404).json({ error: 'Selected doctor not found.' });
    if (!date || !slot) return res.status(400).json({ error: 'Date and time slot are required.' });
    if (!isSlotAvailable(db.appointments, doctor.id, date, slot)) {
      return res.status(409).json({ error: 'This slot is already booked. Please choose another time.' });
    }

    const user = db.users.find((u) => u.uid === viewerId) ?? db.users[db.users.length - 1];
    const appt: AppointmentItem = {
      id: `appt_${Date.now()}`,
      patientId: user.uid,
      patientName: String(patientName || user.displayName),
      doctorId: doctor.id,
      doctorName: doctor.nameBn,
      date: String(date),
      slot: String(slot),
      consultationType: consultationType === 'clinic' ? 'clinic' : 'video',
      feeBdt: doctor.consultationFeeBdt,
      paymentMethod: paymentMethod || 'bkash_sandbox',
      paymentStatus: 'paid_sandbox',
      status: 'confirmed',
      notes: notes ? String(notes).slice(0, 300) : undefined,
      createdAt: new Date().toISOString(),
    };
    db.appointments.unshift(appt);
    db.notifications.unshift({
      id: `notif_${Date.now()}`,
      type: 'appointment',
      titleEn: 'Appointment Confirmed',
      titleBn: 'অ্যাপয়েন্টমেন্ট নিশ্চিত হয়েছে',
      bodyEn: `${doctor.nameEn} booked on ${date} at ${slot}.`,
      bodyBn: `${doctor.nameBn}-এর সাথে ${date} তারিখ ${slot}-এ সিরিয়াল নিশ্চিত হয়েছে।`,
      link: '/appointments',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    res.status(201).json(appt);
  });

  api.patch('/appointments/:id', (req, res) => {
    const db = getDb();
    const appt = db.appointments.find((a) => a.id === req.params.id);
    if (!appt) return res.status(404).json({ error: 'Appointment not found.' });
    if (req.body?.status === 'cancelled') {
      appt.status = 'cancelled';
      appt.paymentStatus = 'refunded';
    } else if (req.body?.status === 'completed') {
      appt.status = 'completed';
    }
    saveDb(db);
    res.json(appt);
  });

  // 6. MOTHER'S GUIDE
  api.get('/guides', (_req, res) => {
    const db = getDb();
    res.json(db.guides);
  });

  api.post('/guides', (req, res) => {
    const db = getDb();
    const { titleEn, titleBn, category, summaryEn, summaryBn, bodyEn, bodyBn, authorName } = req.body ?? {};
    if (!titleEn || !bodyEn) return res.status(400).json({ error: 'Title and article body are required.' });
    const article = {
      id: `guide_${Date.now()}`,
      slug: String(titleEn).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60),
      category: category || 'pregnancy',
      titleEn: String(titleEn),
      titleBn: String(titleBn || titleEn),
      summaryEn: String(summaryEn || bodyEn.slice(0, 120)),
      summaryBn: String(summaryBn || bodyBn?.slice(0, 120) || bodyEn.slice(0, 120)),
      bodyEn: String(bodyEn),
      bodyBn: String(bodyBn || bodyEn),
      authorName: String(authorName || 'Content Editor'),
      // Unreviewed editor submissions never get an expert-reviewed badge automatically
      isMedicallyReviewed: false,
      references: ['Pending editorial & medical review'],
      imageUrl: IMG.pregnancy,
      readTimeMin: 4,
      publishedAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    db.guides.unshift(article);
    saveDb(db);
    res.status(201).json(article);
  });

  // 7. BABY GROWTH TRACKER
  api.get('/babies', (req, res) => {
    const db = getDb();
    const viewerId = getViewerId(req);
    res.json(db.babies.filter((b) => b.parentId === viewerId || viewerId === 'guest_demo'));
  });

  api.post('/babies', (req, res) => {
    const db = getDb();
    const viewerId = getViewerId(req);
    const { name, dob, gender } = req.body ?? {};
    if (!name || !dob) return res.status(400).json({ error: 'Child name and date of birth are required.' });
    const newBaby: BabyProfile = {
      id: `baby_${Date.now()}`,
      parentId: viewerId,
      name: String(name).trim(),
      dob: String(dob),
      gender: gender === 'boy' || gender === 'girl' ? gender : 'unspecified',
      logs: [],
      vaccinations: [
        { id: `v_${Date.now()}_1`, vaccineNameEn: 'BCG & OPV-0', vaccineNameBn: 'বিসিজি ও পোলিও-০', dueAgeMonths: 0, status: 'pending' },
        { id: `v_${Date.now()}_2`, vaccineNameEn: 'Pentavalent-1 & PCV-1', vaccineNameBn: 'পেন্টাভ্যালেন্ট-১ ও পিসিভি-১', dueAgeMonths: 2, status: 'pending' },
        { id: `v_${Date.now()}_3`, vaccineNameEn: 'MR-1 (Measles & Rubella)', vaccineNameBn: 'হাম ও রুবেলা-১', dueAgeMonths: 9, status: 'pending' },
      ],
      milestonesCompleted: [],
    };
    db.babies.push(newBaby);
    saveDb(db);
    res.status(201).json(newBaby);
  });

  api.delete('/babies/:id', (req, res) => {
    const db = getDb();
    const viewerId = getViewerId(req);
    const idx = db.babies.findIndex((b) => b.id === req.params.id && (b.parentId === viewerId || viewerId === 'guest_demo'));
    if (idx === -1) return res.status(404).json({ error: 'Child profile not found.' });
    db.babies.splice(idx, 1);
    saveDb(db);
    res.json({ deleted: true });
  });

  api.post('/babies/:id/logs', (req, res) => {
    const db = getDb();
    const baby = db.babies.find((b) => b.id === req.params.id);
    if (!baby) return res.status(404).json({ error: 'Child profile not found.' });
    const weightKg = Number(req.body?.weightKg);
    const heightCm = Number(req.body?.heightCm);
    const sleepHours = Number(req.body?.sleepHours || 12);
    if (!Number.isFinite(weightKg) || weightKg <= 0 || !Number.isFinite(heightCm) || heightCm <= 20) {
      return res.status(400).json({ error: 'Valid weight (kg) and height (cm) are required.' });
    }
    const recordedDate = String(req.body?.recordedDate || new Date().toISOString().slice(0, 10));
    const log = {
      id: `gl_${Date.now()}`,
      babyId: baby.id,
      recordedDate,
      ageMonths: calculateBabyAgeMonths(baby.dob, new Date(recordedDate)),
      weightKg,
      heightCm,
      sleepHours,
      feedingNotes: String(req.body?.feedingNotes || '').trim(),
    };
    baby.logs.push(log);
    saveDb(db);
    res.status(201).json(log);
  });

  api.post('/babies/:id/vaccinations/:vacId', (req, res) => {
    const db = getDb();
    const baby = db.babies.find((b) => b.id === req.params.id);
    if (!baby) return res.status(404).json({ error: 'Child profile not found.' });
    const vac = baby.vaccinations.find((v) => v.id === req.params.vacId);
    if (!vac) return res.status(404).json({ error: 'Vaccination item not found.' });
    vac.status = vac.status === 'completed' ? 'pending' : 'completed';
    vac.completedDate = vac.status === 'completed' ? new Date().toISOString().slice(0, 10) : undefined;
    saveDb(db);
    res.json(baby);
  });

  api.post('/babies/:id/milestones', (req, res) => {
    const db = getDb();
    const baby = db.babies.find((b) => b.id === req.params.id);
    if (!baby) return res.status(404).json({ error: 'Child profile not found.' });
    const key = String(req.body?.milestoneKey || '');
    if (!key) return res.status(400).json({ error: 'Milestone key required.' });
    if (baby.milestonesCompleted.includes(key)) {
      baby.milestonesCompleted = baby.milestonesCompleted.filter((m) => m !== key);
    } else {
      baby.milestonesCompleted.push(key);
    }
    saveDb(db);
    res.json(baby);
  });

  api.post('/babies/:id/reminders', (req, res) => {
    const db = getDb();
    const baby = db.babies.find((b) => b.id === req.params.id);
    if (!baby) return res.status(404).json({ error: 'Child profile not found.' });
    const { title, category, dueDate, dueTime } = req.body ?? {};
    const err = validateBabyReminderInput({ title, dueDate });
    if (err) return res.status(400).json({ error: err });
    const allowedCats = ['vaccine', 'feeding', 'checkup', 'sleep'];
    const rem: BabyReminder = {
      id: `rem_${Date.now()}`,
      title: String(title).trim(),
      category: allowedCats.includes(category) ? category : 'checkup',
      dueDate: String(dueDate).trim(),
      dueTime: dueTime ? String(dueTime).trim() : undefined,
      isCompleted: false,
      createdAt: new Date().toISOString(),
    };
    baby.reminders = [rem, ...(baby.reminders ?? [])];
    saveDb(db);
    res.status(201).json(baby);
  });

  api.patch('/babies/:id/reminders/:remId', (req, res) => {
    const db = getDb();
    const baby = db.babies.find((b) => b.id === req.params.id);
    if (!baby) return res.status(404).json({ error: 'Child profile not found.' });
    const rem = (baby.reminders ?? []).find((r) => r.id === req.params.remId);
    if (!rem) return res.status(404).json({ error: 'Reminder not found.' });
    rem.isCompleted = !rem.isCompleted;
    saveDb(db);
    res.json(baby);
  });

  api.delete('/babies/:id/reminders/:remId', (req, res) => {
    const db = getDb();
    const baby = db.babies.find((b) => b.id === req.params.id);
    if (!baby) return res.status(404).json({ error: 'Child profile not found.' });
    baby.reminders = (baby.reminders ?? []).filter((r) => r.id !== req.params.remId);
    saveDb(db);
    res.json(baby);
  });

  // 8. MULTI-VENDOR MARKETPLACE, CATEGORIES, BRANDS, COUPONS, ORDERS & SUPPORT
  api.get('/categories', (_req, res) => {
    const db = getDb();
    res.json(db.categories);
  });

  api.post('/categories', (req, res) => {
    const db = getDb();
    const { nameEn, nameBn, slug, subCategories } = req.body ?? {};
    if (!nameEn || String(nameEn).trim().length < 2) {
      return res.status(400).json({ error: 'Category name is required.' });
    }
    const cleanSlug = (slug || String(nameEn))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (db.categories.some((c) => c.slug === cleanSlug)) {
      return res.status(409).json({ error: 'Category slug already exists.' });
    }
    const created = {
      slug: cleanSlug,
      nameEn: String(nameEn).trim(),
      nameBn: String(nameBn || nameEn).trim(),
      imageUrl: IMG.swaddle,
      subCategories: Array.isArray(subCategories)
        ? subCategories.map((s: unknown) => String(s).trim()).filter(Boolean)
        : ['General'],
      isActive: true,
    };
    db.categories.push(created);
    db.auditLogs.unshift({
      id: `aud_${Date.now()}`,
      actorId: getViewerId(req),
      action: 'CATEGORY_CREATED',
      targetType: 'category',
      targetId: created.slug,
      summary: `Admin added marketplace category "${created.nameEn}" (${created.slug}).`,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    res.status(201).json(created);
  });

  api.delete('/categories/:slug', (req, res) => {
    const db = getDb();
    const idx = db.categories.findIndex((c) => c.slug === req.params.slug);
    if (idx === -1) return res.status(404).json({ error: 'Category not found.' });
    const [removed] = db.categories.splice(idx, 1);
    saveDb(db);
    res.json({ deleted: removed.slug });
  });

  api.get('/brands', (_req, res) => {
    const db = getDb();
    res.json(db.brands);
  });

  api.post('/brands', (req, res) => {
    const db = getDb();
    const { nameEn, nameBn, taglineEn, taglineBn } = req.body ?? {};
    if (!nameEn) return res.status(400).json({ error: 'Brand name is required.' });
    const slug = String(nameEn).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const brand = {
      id: `brand_${Date.now()}`,
      slug,
      nameEn: String(nameEn).trim(),
      nameBn: String(nameBn || nameEn).trim(),
      taglineEn: String(taglineEn || 'Partner mother & baby brand in Bangladesh.'),
      taglineBn: String(taglineBn || 'বাংলাদেশের পার্টনার মা ও শিশু ব্র্যান্ড।'),
      logoUrl: IMG.swaddle,
      bannerUrl: IMG.heroCampaign,
      isDemoPartner: true,
      rating: 4.9,
      followersCount: 1,
    };
    db.brands.push(brand);
    saveDb(db);
    res.status(201).json(brand);
  });

  api.get('/campaigns', (_req, res) => {
    const db = getDb();
    res.json({ campaigns: db.campaigns, coupons: db.coupons.filter((c) => c.isActive) });
  });

  api.post('/coupons/validate', (req, res) => {
    const db = getDb();
    const code = String(req.body?.code || '').trim().toUpperCase();
    const subtotalBdt = Number(req.body?.subtotalBdt || 0);
    const coupon = db.coupons.find((c) => c.code.toUpperCase() === code);
    const result = validateAndApplyCoupon(coupon, subtotalBdt);
    if (!result.valid) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ coupon, discountBdt: result.discountBdt });
  });

  api.get('/products', (req, res) => {
    const db = getDb();
    const cat = typeof req.query.category === 'string' ? req.query.category : 'all';
    const age = typeof req.query.age === 'string' ? req.query.age : 'all';
    const brand = typeof req.query.brand === 'string' ? req.query.brand : 'all';
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    let list = db.products.filter((p) => p.moderationStatus === 'approved');
    if (cat !== 'all') list = list.filter((p) => p.category === cat);
    if (age !== 'all') list = list.filter((p) => p.ageGroups?.includes(age as never));
    if (brand !== 'all') list = list.filter((p) => p.brandId === brand || p.shopSlug === brand);
    if (q) {
      list = list.filter(
        (p) =>
          p.titleEn.toLowerCase().includes(q) ||
          p.titleBn.toLowerCase().includes(q) ||
          p.shopName.toLowerCase().includes(q) ||
          (p.brandName || '').toLowerCase().includes(q)
      );
    }
    res.json({ products: list, sellers: db.sellers, brands: db.brands, categories: db.categories });
  });

  api.get('/products/:id', (req, res) => {
    const db = getDb();
    const product = db.products.find((p) => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    const seller = db.sellers.find((s) => s.id === product.sellerId);
    const brand = db.brands.find((b) => b.id === product.brandId);
    const related = db.products
      .filter((p) => p.id !== product.id && p.moderationStatus === 'approved')
      .slice(0, 4);
    res.json({ product, seller, brand, related });
  });

  api.post('/products', (req, res) => {
    const db = getDb();
    const {
      titleEn,
      titleBn,
      category,
      priceBdt,
      compareAtBdt,
      stock,
      descriptionEn,
      variants,
      shopName,
      ageGroups,
      brandName,
    } = req.body ?? {};
    if (!titleEn || !priceBdt || Number(priceBdt) <= 0) {
      return res.status(400).json({ error: 'Product title and positive BDT price are required.' });
    }
    const newProd: ProductItem = {
      id: `prod_${Date.now()}`,
      sellerId: 'seller_1',
      shopSlug: 'nurture-baby-bd',
      shopName: String(shopName || 'Nurture Baby BD (Demo Seller)'),
      brandName: String(brandName || 'Nurture Baby BD'),
      category: category || 'baby_clothing',
      ageGroups: Array.isArray(ageGroups) && ageGroups.length > 0 ? ageGroups : ['newborn', 'infant'],
      collectionTags: ['new_arrival'],
      titleEn: String(titleEn).trim(),
      titleBn: String(titleBn || titleEn).trim(),
      descriptionEn: String(descriptionEn || 'Quality baby essential crafted for Bangladesh families.'),
      descriptionBn: String(descriptionEn || 'বাংলাদেশের পরিবারের জন্য মানসম্মত শিশুর পণ্য।'),
      priceBdt: Number(priceBdt),
      compareAtBdt: compareAtBdt ? Number(compareAtBdt) : undefined,
      stock: Number(stock || 15),
      variants: Array.isArray(variants) && variants.length > 0 ? variants : ['Standard'],
      imageUrl: IMG.swaddle,
      galleryUrls: [IMG.swaddle],
      questions: [],
      rating: 5.0,
      reviewsCount: 0,
      moderationStatus: 'approved',
    };
    db.products.unshift(newProd);
    saveDb(db);
    res.status(201).json(newProd);
  });

  api.patch('/products/:id', (req, res) => {
    const db = getDb();
    const prod = db.products.find((p) => p.id === req.params.id);
    if (!prod) return res.status(404).json({ error: 'Product not found.' });
    if (typeof req.body?.priceBdt === 'number' && req.body.priceBdt > 0) prod.priceBdt = req.body.priceBdt;
    if (typeof req.body?.compareAtBdt === 'number') {
      prod.compareAtBdt = req.body.compareAtBdt > prod.priceBdt ? req.body.compareAtBdt : undefined;
    }
    if (typeof req.body?.stock === 'number' && req.body.stock >= 0) prod.stock = req.body.stock;
    if (req.body?.titleEn) prod.titleEn = String(req.body.titleEn).trim();
    if (req.body?.titleBn) prod.titleBn = String(req.body.titleBn).trim();
    saveDb(db);
    res.json(prod);
  });

  api.post('/products/:id/questions', (req, res) => {
    const db = getDb();
    const viewerId = getViewerId(req);
    const prod = db.products.find((p) => p.id === req.params.id);
    if (!prod) return res.status(404).json({ error: 'Product not found.' });
    const qText = String(req.body?.question || '').trim();
    if (qText.length < 4) return res.status(400).json({ error: 'Please write a longer question.' });
    const user = db.users.find((u) => u.uid === viewerId) ?? db.users[db.users.length - 1];
    const entry = {
      id: `pq_${Date.now()}`,
      authorName: user.displayName,
      question: qText,
      createdAt: new Date().toISOString(),
    };
    prod.questions = [entry, ...(prod.questions ?? [])];
    saveDb(db);
    res.status(201).json(entry);
  });

  api.post('/sellers/register', (req, res) => {
    const db = getDb();
    const viewerId = getViewerId(req);
    const { shopName, district, businessType, phone } = req.body ?? {};
    if (!shopName || String(shopName).trim().length < 3 || !district) {
      return res.status(400).json({ error: 'Shop name and district are required.' });
    }
    const shopSlug = String(shopName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const seller = {
      id: `seller_${Date.now()}`,
      userId: viewerId,
      shopName: String(shopName).trim(),
      shopSlug: shopSlug || `shop-${Date.now()}`,
      district: String(district).trim(),
      businessType: String(businessType || 'Baby & Mother Essentials'),
      phone: String(phone || ''),
      isApproved: false,
      rating: 5.0,
      followersCount: 0,
      commissionRatePct: db.settings.defaultCommissionPct,
    };
    db.sellers.unshift(seller);
    db.auditLogs.unshift({
      id: `aud_${Date.now()}`,
      actorId: viewerId,
      action: 'SELLER_APPLIED',
      targetType: 'seller',
      targetId: seller.id,
      summary: `New seller onboarding request from "${seller.shopName}" (${seller.district}).`,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    res.status(201).json(seller);
  });

  api.get('/orders', (req, res) => {
    const db = getDb();
    const viewerId = getViewerId(req);
    res.json(db.orders.filter((o) => o.buyerId === viewerId || viewerId === 'guest_demo'));
  });

  api.post('/orders', (req, res) => {
    const db = getDb();
    const viewerId = getViewerId(req);
    const {
      buyerName,
      phone,
      district,
      upazila,
      area,
      postalCode,
      paymentMethod,
      courierProvider,
      couponCode,
      items,
      affiliateCreatorId,
    } = req.body ?? {};

    const resolvedEntries = (Array.isArray(items) ? items : [])
      .map((item: { productId: string; variant: string; quantity: number }) => {
        const product = db.products.find((p) => p.id === item.productId);
        return product ? { product, variant: item.variant, quantity: Number(item.quantity || 1) } : null;
      })
      .filter(Boolean) as { product: ProductItem; variant: string; quantity: number }[];

    const validationErr = validateOrderInput({
      buyerName,
      phone,
      district,
      upazila,
      area,
      postalCode,
      itemsCount: resolvedEntries.length,
    });
    if (validationErr) return res.status(400).json({ error: validationErr });

    const { subtotalBdt, subOrders } = splitCartIntoSellerOrders(
      resolvedEntries,
      db.settings.defaultCommissionPct
    );
    const matchedCoupon = couponCode
      ? db.coupons.find((c) => c.code.toUpperCase() === String(couponCode).trim().toUpperCase())
      : undefined;
    if (couponCode && !matchedCoupon) {
      return res.status(400).json({ error: `Coupon "${couponCode}" was not found.` });
    }
    const orderCalc = calculateOrderTotalWithCoupon({
      subtotalBdt,
      district: String(district),
      coupon: matchedCoupon,
      freeThresholdBdt: db.settings.freeDeliveryThresholdBdt,
      dhakaRateBdt: db.settings.dhakaDeliveryBdt,
      outsideRateBdt: db.settings.outsideDhakaDeliveryBdt,
    });
    if (matchedCoupon && orderCalc.couponError) {
      return res.status(400).json({ error: orderCalc.couponError });
    }

    // Never mark COD orders as paid before payment collection is confirmed
    const method = paymentMethod || 'cod';
    const paymentStatus = method === 'cod' ? 'unpaid' : 'paid_sandbox';

    // Anti-self-referral check for creator affiliate attribution
    const affiliateCommission = calculateAffiliateCommission({
      subtotalBdt: Math.max(0, subtotalBdt - orderCalc.discountBdt),
      buyerId: viewerId,
      creatorId: affiliateCreatorId,
    });

    const newOrder: OrderItem = {
      id: `ORD-${Math.floor(1050 + Math.random() * 8900)}`,
      buyerId: viewerId,
      buyerName: String(buyerName).trim(),
      phone: String(phone).trim(),
      district: String(district).trim(),
      upazila: String(upazila).trim(),
      area: String(area).trim(),
      postalCode: String(postalCode).trim(),
      paymentMethod: method,
      paymentStatus,
      courierProvider: courierProvider || 'steadfast_sandbox',
      couponCode: matchedCoupon?.code,
      discountBdt: orderCalc.discountBdt,
      subtotalBdt,
      deliveryFeeBdt: orderCalc.deliveryFeeBdt,
      totalBdt: orderCalc.totalBdt,
      status: method === 'cod' ? 'pending' : 'processing',
      subOrders: subOrders.map((s) => ({
        ...s,
        status: method === 'cod' ? 'pending' : 'processing',
        courierRef: `BD-SANDBOX-${Math.floor(100000 + Math.random() * 899999)}`,
      })),
      createdAt: new Date().toISOString(),
    };

    db.orders.unshift(newOrder);
    db.notifications.unshift({
      id: `notif_${Date.now()}`,
      type: 'order',
      titleEn: `Order ${newOrder.id} Placed`,
      titleBn: `অর্ডার ${newOrder.id} সম্পন্ন হয়েছে`,
      bodyEn: `Split across ${subOrders.length} seller shop(s). Affiliate credit: ৳${affiliateCommission}.`,
      bodyBn: `${subOrders.length}টি সেলার শপে অর্ডার বিভক্ত হয়েছে। মোট: ৳${orderCalc.totalBdt}।`,
      link: '/orders',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    res.status(201).json(newOrder);
  });

  api.patch('/orders/:id/suborders/:subId', (req, res) => {
    const db = getDb();
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    const sub = order.subOrders.find((s) => s.subOrderId === req.params.subId);
    if (!sub) return res.status(404).json({ error: 'Sub-order not found.' });
    if (req.body?.status) sub.status = req.body.status;
    if (req.body?.collectCodPayment && order.paymentMethod === 'cod' && sub.status === 'delivered') {
      order.paymentStatus = 'paid_sandbox';
    }
    if (order.subOrders.every((s) => s.status === 'delivered')) {
      order.status = 'delivered';
    } else if (order.subOrders.every((s) => s.status === 'cancelled')) {
      order.status = 'cancelled';
    } else if (order.subOrders.every((s) => s.status === 'returned')) {
      order.status = 'returned';
    } else if (req.body?.status) {
      order.status = req.body.status;
    }
    saveDb(db);
    res.json(order);
  });

  // Support, Return & Refund Tickets
  api.get('/support-tickets', (req, res) => {
    const db = getDb();
    const viewerId = getViewerId(req);
    res.json(db.supportTickets.filter((t) => t.userId === viewerId || viewerId === 'guest_demo'));
  });

  api.post('/support-tickets', (req, res) => {
    const db = getDb();
    const viewerId = getViewerId(req);
    const { orderId, type, subject, details } = req.body ?? {};
    if (!subject || !details) {
      return res.status(400).json({ error: 'Subject and details are required.' });
    }
    const user = db.users.find((u) => u.uid === viewerId) ?? db.users[db.users.length - 1];
    const ticket: SupportTicket = {
      id: `TKT-${Math.floor(200 + Math.random() * 800)}`,
      userId: user.uid,
      userName: user.displayName,
      orderId: orderId ? String(orderId) : undefined,
      type: type || 'general',
      subject: String(subject).trim(),
      details: String(details).trim(),
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    db.supportTickets.unshift(ticket);
    saveDb(db);
    res.status(201).json(ticket);
  });

  api.patch('/support-tickets/:id', (req, res) => {
    const db = getDb();
    const ticket = db.supportTickets.find((t) => t.id === req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    if (req.body?.status) ticket.status = req.body.status;
    saveDb(db);
    res.json(ticket);
  });

  api.post('/newsletter', (req, res) => {
    const db = getDb();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const lang = req.body?.lang === 'en' ? 'en' : 'bn';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!db.newsletterSubscribers.some((n) => n.email === email)) {
      db.newsletterSubscribers.unshift({ email, lang, createdAt: new Date().toISOString() });
      saveDb(db);
    }
    res.status(201).json({ subscribed: true, email });
  });

  // 9. MESSAGING, NOTIFICATIONS & SEARCH
  api.get('/messages', (_req, res) => {
    const db = getDb();
    res.json(db.conversations);
  });

  api.post('/messages', (req, res) => {
    const db = getDb();
    const viewerId = getViewerId(req);
    if (!checkMessageRateLimit(viewerId)) {
      return res.status(429).json({ error: 'Messaging rate limit exceeded. Please wait a moment.' });
    }
    const { conversationId, text, sharedProductId } = req.body ?? {};
    const conv = db.conversations.find((c) => c.id === conversationId) ?? db.conversations[0];
    if (!conv) return res.status(404).json({ error: 'Conversation not found.' });
    const cleanText = String(text || '').trim();
    if (!cleanText && !sharedProductId) return res.status(400).json({ error: 'Message text is required.' });
    const user = db.users.find((u) => u.uid === viewerId) ?? db.users[db.users.length - 1];
    const msg = {
      id: `msg_${Date.now()}`,
      conversationId: conv.id,
      senderId: user.uid,
      senderName: user.displayName,
      text: cleanText,
      sharedProductId,
      createdAt: new Date().toISOString(),
    };
    conv.messages.push(msg);
    conv.lastMessage = cleanText || 'Shared a product';
    conv.updatedAt = msg.createdAt;
    saveDb(db);
    res.status(201).json(msg);
  });

  api.get('/notifications', (_req, res) => {
    const db = getDb();
    res.json(db.notifications);
  });

  api.post('/notifications/read-all', (_req, res) => {
    const db = getDb();
    db.notifications.forEach((n) => {
      n.isRead = true;
    });
    saveDb(db);
    res.json({ ok: true });
  });

  api.get('/search', (req, res) => {
    const db = getDb();
    const q = String(req.query.q || '').trim().toLowerCase();
    if (!q) {
      return res.json({
        trending: ['নবজাতক', 'khichuri', 'muslin swaddle', 'Dr. Farhana', 'baby sleep'],
        posts: [],
        products: [],
        doctors: [],
        guides: [],
        questions: [],
        creators: [],
      });
    }
    res.json({
      trending: ['নবজাতক', 'khichuri', 'muslin swaddle', 'Dr. Farhana'],
      posts: db.posts.filter(
        (p) =>
          p.moderationStatus === 'approved' &&
          (p.titleEn.toLowerCase().includes(q) ||
            p.titleBn.toLowerCase().includes(q) ||
            p.hashtags.some((h) => h.toLowerCase().includes(q)))
      ),
      products: db.products.filter(
        (p) => p.titleEn.toLowerCase().includes(q) || p.titleBn.toLowerCase().includes(q) || p.shopName.toLowerCase().includes(q)
      ),
      doctors: db.doctors.filter(
        (d) =>
          d.nameEn.toLowerCase().includes(q) ||
          d.nameBn.toLowerCase().includes(q) ||
          d.specialisation.toLowerCase().includes(q)
      ),
      guides: db.guides.filter(
        (g) => g.titleEn.toLowerCase().includes(q) || g.titleBn.toLowerCase().includes(q)
      ),
      questions: db.questions.filter(
        (qu) => qu.titleEn.toLowerCase().includes(q) || qu.titleBn.toLowerCase().includes(q)
      ),
      creators: db.users.filter(
        (u) => u.displayName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)
      ),
    });
  });

  // 10. REPORTS, MODERATION & ADMIN OVERVIEW
  api.post('/reports', (req, res) => {
    const db = getDb();
    const viewerId = getViewerId(req);
    const { targetType, targetId, reason, details } = req.body ?? {};
    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ error: 'Report target and reason are required.' });
    }
    const rep = {
      id: `rep_${Date.now()}`,
      reporterId: viewerId,
      targetType,
      targetId,
      reason: String(reason),
      details: String(details || ''),
      status: 'open' as const,
      createdAt: new Date().toISOString(),
    };
    db.reports.unshift(rep);
    saveDb(db);
    res.status(201).json(rep);
  });

  api.get('/admin/overview', (_req, res) => {
    const db = getDb();
    const gmvBdt = db.orders.reduce((sum, o) => sum + o.totalBdt, 0);
    const platformCommissionBdt = db.orders.reduce(
      (sum, o) => sum + o.subOrders.reduce((s, sub) => s + sub.commissionBdt, 0),
      0
    );
    res.json({
      metrics: {
        totalUsers: db.users.length,
        totalPosts: db.posts.length,
        totalVideos: db.posts.filter((p) => p.isVideo).length,
        totalViews: db.posts.reduce((s, p) => s + p.viewsCount, 0),
        totalSellers: db.sellers.length,
        totalProducts: db.products.length,
        totalOrders: db.orders.length,
        gmvBdt,
        platformRevenueBdt: platformCommissionBdt,
        totalDoctors: db.doctors.length,
        totalAppointments: db.appointments.length,
        openReports: db.reports.filter((r) => r.status === 'open').length,
        openTickets: db.supportTickets.filter((t) => t.status !== 'resolved').length,
      },
      reports: db.reports,
      doctors: db.doctors,
      sellers: db.sellers,
      brands: db.brands,
      categories: db.categories,
      coupons: db.coupons,
      supportTickets: db.supportTickets,
      settings: db.settings,
      posts: db.posts,
      orders: db.orders,
      auditLogs: db.auditLogs,
    });
  });

  api.patch('/admin/settings', (req, res) => {
    const db = getDb();
    const { defaultCommissionPct, freeDeliveryThresholdBdt, dhakaDeliveryBdt, outsideDhakaDeliveryBdt } = req.body ?? {};
    if (typeof defaultCommissionPct === 'number' && defaultCommissionPct >= 0 && defaultCommissionPct <= 30) {
      db.settings.defaultCommissionPct = defaultCommissionPct;
    }
    if (typeof freeDeliveryThresholdBdt === 'number' && freeDeliveryThresholdBdt >= 0) {
      db.settings.freeDeliveryThresholdBdt = freeDeliveryThresholdBdt;
    }
    if (typeof dhakaDeliveryBdt === 'number' && dhakaDeliveryBdt >= 0) {
      db.settings.dhakaDeliveryBdt = dhakaDeliveryBdt;
    }
    if (typeof outsideDhakaDeliveryBdt === 'number' && outsideDhakaDeliveryBdt >= 0) {
      db.settings.outsideDhakaDeliveryBdt = outsideDhakaDeliveryBdt;
    }
    db.auditLogs.unshift({
      id: `aud_${Date.now()}`,
      actorId: getViewerId(req),
      action: 'SETTINGS_UPDATED',
      targetType: 'settings',
      targetId: 'platform',
      summary: `Updated commission=${db.settings.defaultCommissionPct}%, freeShipping=${db.settings.freeDeliveryThresholdBdt}.`,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    res.json(db.settings);
  });

  api.patch('/admin/reports/:id', (req, res) => {
    const db = getDb();
    const rep = db.reports.find((r) => r.id === req.params.id);
    if (!rep) return res.status(404).json({ error: 'Report not found.' });
    rep.status = req.body?.status || 'resolved';
    db.auditLogs.unshift({
      id: `aud_${Date.now()}`,
      actorId: getViewerId(req),
      action: `REPORT_${rep.status.toUpperCase()}`,
      targetType: rep.targetType,
      targetId: rep.targetId,
      summary: `Admin updated report ${rep.id} to ${rep.status}.`,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    res.json(rep);
  });

  api.patch('/admin/moderation', (req, res) => {
    const db = getDb();
    const { targetType, targetId, moderationStatus } = req.body ?? {};
    if (targetType === 'post') {
      const post = db.posts.find((p) => p.id === targetId);
      if (post) post.moderationStatus = moderationStatus;
    } else if (targetType === 'product') {
      const prod = db.products.find((p) => p.id === targetId);
      if (prod) prod.moderationStatus = moderationStatus;
    }
    db.auditLogs.unshift({
      id: `aud_${Date.now()}`,
      actorId: getViewerId(req),
      action: 'MODERATION_ACTION',
      targetType: String(targetType),
      targetId: String(targetId),
      summary: `Set ${targetType} ${targetId} moderationStatus=${moderationStatus}`,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    res.json({ ok: true });
  });

  api.patch('/admin/doctors/:id/verify', (req, res) => {
    const db = getDb();
    const doc = db.doctors.find((d) => d.id === req.params.id);
    if (!doc) return res.status(404).json({ error: 'Doctor not found.' });
    doc.isVerified = Boolean(req.body?.isVerified);
    db.auditLogs.unshift({
      id: `aud_${Date.now()}`,
      actorId: getViewerId(req),
      action: doc.isVerified ? 'DOCTOR_VERIFIED' : 'DOCTOR_UNVERIFIED',
      targetType: 'doctor',
      targetId: doc.id,
      summary: `Admin set verification=${doc.isVerified} for ${doc.nameEn}.`,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    res.json(doc);
  });

  api.patch('/admin/sellers/:id/approve', (req, res) => {
    const db = getDb();
    const seller = db.sellers.find((s) => s.id === req.params.id);
    if (!seller) return res.status(404).json({ error: 'Seller not found.' });
    seller.isApproved = Boolean(req.body?.isApproved);
    db.auditLogs.unshift({
      id: `aud_${Date.now()}`,
      actorId: getViewerId(req),
      action: seller.isApproved ? 'SELLER_APPROVED' : 'SELLER_SUSPENDED',
      targetType: 'seller',
      targetId: seller.id,
      summary: `Admin set approved=${seller.isApproved} for ${seller.shopName}.`,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    res.json(seller);
  });

  // 10. M&C AI COMPANION (Server-side Gemini 4 Hydrogen + Live Platform Grounding)
  api.post('/ai/chat', async (req, res) => {
    const viewerId = getViewerId(req);
    if (!checkMessageRateLimit(`ai_${viewerId}`, 25)) {
      return res.status(429).json({
        error: 'Too many AI requests in a minute. Please wait a few seconds and try again.',
        code: 'RATE_LIMITED',
      });
    }
    try {
      const { message, history, context } = req.body ?? {};
      const payload = await runAiCompanionChat({
        viewerId,
        message: typeof message === 'string' ? message : '',
        history,
        context,
      });
      res.json(payload);
    } catch (err) {
      if (err instanceof AiServiceError) {
        return res.status(err.status).json({ error: err.message, code: err.code });
      }
      const msg = err instanceof Error ? err.message : 'Unexpected AI service error.';
      res.status(500).json({ error: msg, code: 'AI_INTERNAL_ERROR' });
    }
  });

  app.use('/api/v1', api);

  // Vite dev middleware or static dist fallback
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mother & Child server running on http://localhost:${PORT}`);
  });
}

startServer();
