import { load, save } from './_store.js';
import { id, bad, str, publicView } from './_util.js';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const b = req.body || {};
    const name = str(b.name, 40);
    if (!name) return bad(res, 400, 'Who is the issue about?');
    const doc = {
      id: id(10),
      editKey: id(16),
      createdAt: new Date().toISOString(),
      status: 'collecting',
      subject: { name, pronoun: ['he', 'she', 'they'].includes(b.pronoun) ? b.pronoun : 'they', city: str(b.city, 40) },
      occasion: str(b.occasion, 60) || 'birthday',
      buyer: { name: str(b.buyer, 40), relationship: str(b.relationship, 60) },
      tips: [],
      photos: [],
      magazine: null,
      payment: null,
    };
    for (const t of Array.isArray(b.tips) ? b.tips.slice(0, 30) : []) {
      const text = str(t, 400);
      if (text) doc.tips.push({ text, by: doc.buyer.name || 'the editor', at: doc.createdAt });
    }
    await save(doc);
    return res.status(200).json({ id: doc.id, key: doc.editKey });
  }

  if (req.method === 'GET') {
    const doc = await load(String(req.query.id || ''));
    if (!doc) return bad(res, 404, 'No such issue');
    const key = String(req.query.key || '');
    if (key && key === doc.editKey) {
      const { editKey, ...rest } = doc;
      return res.status(200).json(rest);
    }
    return res.status(200).json(publicView(doc));
  }
  return bad(res, 405, 'Method not allowed');
}
