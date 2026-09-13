'use strict';
// The compliance self-check: eight questions, a score, and what fixes each gap.
// This is a lead magnet, not legal advice; the copy says so.

const QUESTIONS = [
  { id: 'kits', q: 'Is there a first-aid kit at every workplace, including every work vehicle?',
    gap: 'A work vehicle is a workplace under WHS law. Vehicle kits are the item inspectors and head contractors check first.', fix: 'A compact vehicle kit for each ute or van, registered so you can prove it.' },
  { id: 'checked', q: 'Has every kit been checked in the last six months, and is the check written down?',
    gap: 'The model Code of Practice expects an audit at least every 12 months, six for most workplaces, and an unrecorded check does not exist to an inspector.', fix: 'Scheduled refill packs and a check recorded against each kit.' },
  { id: 'dates', q: 'Are all sterile and dated items (saline, dressings, gel, wipes) in date?',
    gap: 'Expired sterile items are the most common finding in a kit audit.', fix: 'Expiry tracking per item and replacement before the date.' },
  { id: 'owner', q: 'Is one named person responsible for the kits?',
    gap: 'Without a named person, kits drift out of compliance between incidents.', fix: 'Name someone on the compliance record; the reminders go to them.' },
  { id: 'firstaider', q: 'Do you have a trained first aider whose certificate is current (HLTAID011, refreshed every three years, CPR annually)?',
    gap: 'Kits do not replace a trained first aider. This is a training requirement, not a supply one.', fix: 'A nationally accredited course; we can point you to local providers.' },
  { id: 'process', q: 'When something in a kit is used, is there a process that replaces it within days?',
    gap: 'Most kits go non-compliant on the day something is used, and stay that way until the next audit.', fix: 'A QR label on the kit: scan, tap what was used, refill ships the same day.' },
  { id: 'evidence', q: 'If a head contractor, an inspector or your insurer asked today, could you show a record of your kits and checks?',
    gap: 'The question that ends badly is not "do you have a kit" but "show me".', fix: 'A live compliance record and a certificate you can forward.' },
  { id: 'aed', q: 'If you have a defibrillator, are its pads and battery in date? (Answer yes if you have no AED.)',
    gap: 'AED pads expire every two to five years and batteries with them; an expired AED is worse than none because people rely on it.', fix: 'Register the model and serial; pads and batteries replaced before expiry.' },
];

function score(answers) {
  const gaps = QUESTIONS.filter((q) => answers[q.id] !== 'yes');
  return { total: QUESTIONS.length, passed: QUESTIONS.length - gaps.length, gaps };
}

module.exports = { QUESTIONS, score };
