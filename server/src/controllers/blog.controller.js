import { prisma } from "../lib/prisma.js";
import { notFound } from "../lib/errors.js";

export async function listPublishedPosts(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Number(req.query.pageSize) || 9);
    const where = { status: "PUBLISHED", ...(req.query.category ? { category: req.query.category } : {}) };

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, title: true, slug: true, excerpt: true, featuredImageUrl: true,
          category: true, publishedAt: true, authorName: true,
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    res.json({ posts, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    next(err);
  }
}

export async function getPublishedPost(req, res, next) {
  try {
    const post = await prisma.blogPost.findFirst({ where: { slug: req.params.slug, status: "PUBLISHED" } });
    if (!post) return next(notFound("Post not found"));
    res.json({ post });
  } catch (err) {
    next(err);
  }
}
