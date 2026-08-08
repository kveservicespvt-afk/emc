import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { badRequest, notFound } from "../../lib/errors.js";
import { slugify } from "../../lib/slugify.js";

export async function listPostsAdmin(_req, res, next) {
  try {
    const posts = await prisma.blogPost.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ posts });
  } catch (err) {
    next(err);
  }
}

export async function getPostAdmin(req, res, next) {
  try {
    const post = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
    if (!post) return next(notFound("Post not found"));
    res.json({ post });
  } catch (err) {
    next(err);
  }
}

const postSchema = z.object({
  title: z.string().min(2),
  // The editor always sends a `slug` key (empty string for a new/blank post),
  // not `undefined` — treat "" the same as "not provided" so the auto-slugify
  // fallback in createPost actually kicks in instead of failing validation.
  slug: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(2).optional()),
  excerpt: z.string().optional(),
  content: z.string().min(1),
  category: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  authorName: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

async function uniqueSlug(base, excludeId) {
  let slug = base;
  let n = 1;
  // Small collision-avoidance loop — blog volume is low, this is cheap.
  while (await prisma.blogPost.findFirst({ where: { slug, id: excludeId ? { not: excludeId } : undefined } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

export async function createPost(req, res, next) {
  try {
    const data = postSchema.parse(req.body);
    const baseSlug = slugify(data.slug || data.title);
    const slug = await uniqueSlug(baseSlug);

    const post = await prisma.blogPost.create({
      data: {
        ...data,
        slug,
        publishedAt: data.status === "PUBLISHED" ? new Date() : null,
      },
    });
    res.status(201).json({ post });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid post payload", err.issues));
    next(err);
  }
}

export async function updatePost(req, res, next) {
  try {
    const data = postSchema.partial().parse(req.body);
    const existing = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
    if (!existing) return next(notFound("Post not found"));

    let slug = existing.slug;
    if (data.slug && data.slug !== existing.slug) {
      slug = await uniqueSlug(slugify(data.slug), existing.id);
    }

    const wasPublished = existing.status === "PUBLISHED";
    const willBePublished = (data.status ?? existing.status) === "PUBLISHED";

    const post = await prisma.blogPost.update({
      where: { id: req.params.id },
      data: {
        ...data,
        slug,
        ...(willBePublished && !wasPublished ? { publishedAt: new Date() } : {}),
      },
    });
    res.json({ post });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid post payload", err.issues));
    next(err);
  }
}

export async function deletePost(req, res, next) {
  try {
    await prisma.blogPost.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    if (err.code === "P2025") return next(notFound("Post not found"));
    next(err);
  }
}

export async function uploadPostImage(req, res, next) {
  try {
    if (!req.file) return next(badRequest("No image file was uploaded"));
    const post = await prisma.blogPost.update({
      where: { id: req.params.id },
      data: { featuredImageUrl: `/uploads/blog/${req.params.id}/${req.file.filename}` },
    });
    res.json({ post });
  } catch (err) {
    if (err.code === "P2025") return next(notFound("Post not found"));
    next(err);
  }
}
