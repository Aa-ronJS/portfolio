import { fixture } from './_fixture.js';
export default async function handler(req, res) {
  const name = String(req.query.name || 'Sam').replace(/[^A-Za-z' -]/g, '').slice(0, 24) || 'Sam';
  const doc = { id: 'demo', subject: { name, pronoun: 'they', city: 'Adelaide' }, occasion: 'birthday', buyer: { name: 'the newsroom' }, photos: [], tips: [] };
  doc.magazine = fixture(doc);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).json(doc);
}
