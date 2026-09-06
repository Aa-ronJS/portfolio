import { load, save, savePhoto } from './_store.js';
import { bad, str, publicView } from './_util.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return bad(res, 405, 'Method not allowed');
  const b = req.body || {};
  const doc = await load(String(b.id || ''));
  if (!doc) return bad(res, 404, 'No such issue');
  if (doc.status !== 'collecting') return bad(res, 409, 'This issue has gone to print. Tips are closed.');
  if (doc.tips.length >= 80) return bad(res, 409, 'The tip line is full. Eighty is plenty.');

  const text = str(b.text, 400);
  const by = str(b.by, 30) || 'a source';
  const caption = str(b.caption, 120);
  if (!text && !b.photo) return bad(res, 400, 'Say something, or send a photo');

  if (text) doc.tips.push({ text, by, at: new Date().toISOString() });
  if (b.photo && doc.photos.length < 12) {
    try {
      const url = await savePhoto(doc.id, String(b.photo));
      doc.photos.push({ url, caption: caption || text.slice(0, 120), by });
    } catch (e) {
      return bad(res, 400, 'That photo could not be saved. Try a smaller one.');
    }
  }
  await save(doc);
  return res.status(200).json(publicView(doc));
}
