const path = require('path');
const { v4: uuidv4 } = require('uuid');
const contentModel = require('../models/contentModel');
const s3 = require('../config/s3');
const { presignContent, presignContentList } = require('../utils/presignHelper');

const upload = async ({ teacherId, body, file }) => {
  const {
    title,
    description,
    subject,
    start_time,
    end_time,
    rotation_duration,
  } = body;

  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  // S3 key — no leading slash so presignHelper recognises it as an S3 object.
  const key = `content/${uuidv4()}.${ext}`;

  await s3.uploadBuffer({
    key,
    buffer: file.buffer,
    contentType: file.mimetype,
  });

  try {
    const row = await contentModel.insert({
      title: title.trim(),
      description: description ? description.trim() : null,
      // Lowercase subject so "Maths" / "maths" share a slot.
      subject: subject.trim().toLowerCase(),
      fileUrl: key,
      fileType: ext,
      fileSize: file.size,
      uploadedBy: teacherId,
      startTime: start_time,
      endTime: end_time,
      rotationDuration: rotation_duration,
    });
    return presignContent(row);
  } catch (err) {
    // Clean up the orphaned S3 object if the DB insert fails.
    s3.deleteObject(key).catch(() => {});
    throw err;
  }
};

const listForTeacher = async ({ teacherId, query }) => {
  const { page, limit, status, subject } = query;
  const { items, totalItems } = await contentModel.findByTeacher({
    teacherId,
    status: status || null,
    subject: subject || null,
    page,
    limit,
  });
  const totalPages = Math.ceil(totalItems / limit);
  return {
    items: await presignContentList(items),
    pagination: { currentPage: page, totalPages, totalItems, limit },
  };
};

module.exports = { upload, listForTeacher };
