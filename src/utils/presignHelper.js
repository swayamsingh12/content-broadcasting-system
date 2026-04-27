const { presignDownload } = require('../config/s3');

// Transforms a stored `file_url` into a downloadable URL for the client.
//   - "/uploads/..."   → returned as-is (legacy local-disk content; served by app.js static handler)
//   - "http..."        → returned as-is (already an absolute URL)
//   - anything else    → treated as an S3 key and presigned with a TTL
const presignFileUrl = async (fileUrl) => {
  if (!fileUrl) return fileUrl;
  if (fileUrl.startsWith('/uploads/')) return fileUrl;
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }
  return presignDownload(fileUrl);
};

const presignContent = async (content) => {
  if (!content) return content;
  return { ...content, file_url: await presignFileUrl(content.file_url) };
};

const presignContentList = (contents) =>
  Promise.all((contents || []).map(presignContent));

module.exports = { presignFileUrl, presignContent, presignContentList };
