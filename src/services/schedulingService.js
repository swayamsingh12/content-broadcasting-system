const contentModel = require('../models/contentModel');
const { presignFileUrl } = require('../utils/presignHelper');

const minutesBetween = (later, earlier) =>
  (later.getTime() - earlier.getTime()) / 60000;

const groupBy = (items, key) => {
  const out = {};
  for (const item of items) {
    const k = item[key];
    if (!out[k]) out[k] = [];
    out[k].push(item);
  }
  return out;
};

// Pure function — exposed for unit testing.
const pickActiveForSubject = (items, now) => {
  if (!items || items.length === 0) return null;

  const totalCycle = items.reduce(
    (acc, it) => acc + Math.max(parseInt(it.rotation_duration, 10) || 0, 0),
    0,
  );
  if (totalCycle <= 0) return null;

  // Anchor on the EARLIEST start_time so the cycle phase is stable as items get added later.
  const earliestStart = items.reduce((min, it) => {
    const t = new Date(it.start_time);
    return t < min ? t : min;
  }, new Date(items[0].start_time));

  const elapsed = minutesBetween(now, earliestStart);
  if (elapsed < 0) return null;

  const position = elapsed % totalCycle;

  let cumulative = 0;
  for (const item of items) {
    cumulative += Math.max(parseInt(item.rotation_duration, 10) || 0, 0);
    if (position < cumulative) {
      return item;
    }
  }
  // Floating-point fall-through at exact cycle boundaries.
  return items[items.length - 1];
};

const getLiveContentForTeacher = async ({ teacherId, subject }) => {
  const candidates = await contentModel.findLiveCandidates({
    teacherId,
    subject: subject || null,
  });
  if (candidates.length === 0) return [];

  const now = new Date();
  const bySubject = groupBy(candidates, 'subject');

  const active = [];
  for (const subj of Object.keys(bySubject)) {
    const item = pickActiveForSubject(bySubject[subj], now);
    if (item) {
      active.push({
        id: item.id,
        title: item.title,
        description: item.description,
        subject: item.subject,
        file_url: await presignFileUrl(item.file_url),
        file_type: item.file_type,
        rotation_duration: item.rotation_duration,
        start_time: item.start_time,
        end_time: item.end_time,
      });
    }
  }
  return active;
};

module.exports = {
  getLiveContentForTeacher,
  pickActiveForSubject,
  groupBy,
};
