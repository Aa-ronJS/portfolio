// Reading quotes that were made somewhere else: pasted texts and emails, and spreadsheet exports from the
// tools tradies already use. Runs in node against ingest.js directly; no browser needed.
const path = require('path');
const I = require(path.join(__dirname, '../../../ingest.js'));
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const eq = (a, b, m) => ok(a === b, m + ' (' + JSON.stringify(a) + ')');

// ---- the small readers
eq(I.parseDate('3/9/2026'), '2026-09-03', 'an Australian date is day first');
eq(I.parseDate('2026-09-03'), '2026-09-03', 'an ISO date');
eq(I.parseDate('3 Sep 2026'), '2026-09-03', 'a written date');
eq(I.parseDate('Thursday, 3 September 2026 4:12 pm'), '2026-09-03', 'an email Sent: line');
eq(I.parseDate('Sep 3, 2026'), '2026-09-03', 'a US-style written date');
eq(I.parseDate('46268'), '2026-09-03', 'an Excel date serial');
eq(I.parseDate('31/2/2026'), '', 'the 31st of February is not a date');
eq(I.parseMoney('$4,200.50'), 4200.5, 'dollars with a comma and cents');
eq(I.parseMoney('AUD 12,000'), 12000, 'AUD in front');
eq(I.parseMoney('$4.2k'), 4200, 'k for thousands');
eq(I.parseMoney('(350.00)'), -350, 'brackets mean negative, as accounting exports write it');
eq(I.tidyPhone('+61412345678'), '0412 345 678', 'an international mobile comes back the way he reads it');
eq(I.tidyPhone('0412-345-678'), '0412 345 678', 'dashes');
eq(I.tidyPhone('412345678'), '0412 345 678', 'a mobile a spreadsheet stripped the leading zero from');
eq(I.tidyPhone('(08) 8123 4567'), '08 8123 4567', 'a landline');

// ---- a text he sent
let t = I.parseText("Hi Jane, thanks for having me round. Quote for the deck oil and fence is $2,450 inc GST. Happy to start next week. Cheers Dave 0412 345 678");
eq(t.name, 'Jane', 'text: the name after Hi');
eq(t.amount, 2450, 'text: the amount');
eq(t.what, 'deck oil and fence', 'text: what it was for');
eq(t.kind, 'quote', 'text: a quote');

t = I.parseText("G'day Mick, as discussed the price is $1850 for the bathroom regrout, plus $320 for the silicone. All up $2,170. Let me know!");
eq(t.name, 'Mick', "text: G'day");
eq(t.amount, 2170, 'text: "all up" beats the larger-looking line items');

t = I.parseText('Hey Sam and Lisa, your quote Q-0142 comes to $12,400 including GST');
eq(t.name, 'Sam and Lisa', 'text: a couple');
eq(t.number, 'Q-0142', 'text: the quote number');
eq(t.amount, 12400, 'text: five figures');

// ---- an email he sent, copied from his Sent folder
t = I.parseText([
  'From: Dave Steele <dave@steelesparky.com.au>',
  'Sent: Thursday, 3 September 2026 4:12 PM',
  'To: Jane Mitchell <jane.mitchell@example.com>',
  'Subject: Quote QU-2231 - switchboard upgrade',
  '',
  'Hi Jane,',
  '',
  'Please find attached our quote for the switchboard upgrade and two new circuits.',
  'Labour $1,200.00',
  'Materials $860.00',
  'Total inc GST $2,266.00',
  '',
  'Call me on 0412 345 678 if you have any questions.',
].join('\n'));
eq(t.name, 'Jane Mitchell', 'email: the full name from the To line');
eq(t.email, 'jane.mitchell@example.com', 'email: her address, not his');
eq(t.date, '2026-09-03', 'email: the day it was sent');
eq(t.number, 'QU-2231', 'email: the number from the subject');
eq(t.amount, 2266, 'email: the total line, not the biggest line item and not the sum');
ok(/switchboard upgrade/.test(t.what), 'email: what it was for (' + t.what + ')');

t = I.parseText('Hi Tom, invoice INV-0098 for $540 is now overdue. Bank details below.');
eq(t.kind, 'invoice', 'an overdue invoice is an invoice');
eq(t.number, 'INV-0098', 'invoice number');

t = I.parseText('');
ok(!(t.amount > 0) && t.name === '', 'nothing pasted finds nothing, and does not throw');

// ---- spreadsheets from the tools tradies use
const tradify = [
  'Quote Number,Customer,Contact Name,Mobile,Email,Status,Created Date,Total (inc GST)',
  'Q-1001,Mitchell Family,Jane Mitchell,0412 111 222,jane@example.com,Sent,03/09/2026,"$4,378.55"',
  'Q-1002,Bob Smith,,0413 333 444,,Draft,04/09/2026,$900.00',
  'Q-1003,Acme Strata,Priya Nair,,priya@acme.com.au,Accepted,05/09/2026,"$12,000.00"',
  'Q-1004,Tom Lee,,0414 555 666,,Declined,06/09/2026,$1500',
  'Q-1005,"Lee, Kim",,+61415777888,kim@example.com,Sent,07/09/2026,2200',
].join('\r\n');
let r = I.readSheet(tradify);
eq(r.items.length, 3, 'Tradify-style: sent and accepted quotes are read; the draft and the declined one are not');
eq(r.items[0].name, 'Jane Mitchell', 'the contact person is who the chase says hello to');
eq(r.items[0].business, 'Mitchell Family', 'and the customer is kept as the business');
eq(r.items[0].amount, 4378.55, 'the total with GST');
eq(r.items[0].date, '2026-09-03', 'the date, day first');
eq(r.items[0].number, 'Q-1001', 'the quote number');
eq(r.items[1].accepted, true, 'an accepted quote is marked accepted');
eq(r.items[2].name, 'Lee, Kim', 'a comma inside quotes stays in the name');
eq(r.items[2].phone, '0415 777 888', 'an international number is tidied');
eq(r.skipped.draft, 1, 'the draft is counted as left out');
eq(r.skipped.closed, 1, 'so is the declined one');

const xero = [
  '﻿"ContactName","EmailAddress","InvoiceNumber","Reference","InvoiceDate","DueDate","Total","InvoiceAmountPaid","InvoiceAmountDue","Status"',
  '"Dennis Ward","dennis@example.com","INV-1999","Whole house, inside","19/08/2026","02/09/2026","8825.19","0.00","8825.19","AUTHORISED"',
  '"Ruth Baker","ruth@example.com","INV-2001","Fence","01/09/2026","08/09/2026","600.00","311.00","289.00","AUTHORISED"',
  '"Alice Png","alice@example.com","INV-2002","Kitchen","01/08/2026","08/08/2026","2672.56","2672.56","0.00","PAID"',
  '"Old Draft","x@example.com","INV-2003","","01/09/2026","08/09/2026","100.00","0.00","100.00","DRAFT"',
].join('\n');
r = I.readSheet(xero);
eq(r.items.length, 2, 'Xero invoices: the two owing are read; the paid one and the draft are not');
eq(r.items[0].kind, 'invoice', 'an invoices export is invoices');
eq(r.items[0].due, '2026-09-02', 'the due date');
eq(r.items[0].amount, 8825.19, 'the invoice total');
eq(r.items[1].paid, 311, 'a part-paid invoice keeps what was paid');
eq(r.items[0].what, 'Whole house, inside', "Xero's Reference is what the job was");
eq(r.skipped.paid, 1, 'paid is left out');

const servicem8 = [
  'Job Number;Company Name;Contact First;Contact Last;Mobile;Email;Status;Job Date;Total',
  '1043;;Kate;Caller;0412 000 111;;Quote;12/09/2026;1250',
  '1044;Bay Cafe;Sione;Tui;0412 000 222;sione@bay.cafe;Work Order;13/09/2026;3885.20',
].join('\n');
r = I.readSheet(servicem8);
eq(r.items.length, 2, 'ServiceM8-style semicolon file: both read');
eq(r.items[0].name, 'Kate Caller', 'first and last names are joined when there is no name column');
eq(r.items[1].name, 'Sione Tui', 'the person at a business is who the chase greets');
eq(r.items[1].business, 'Bay Cafe', 'with the business kept');
eq(r.items[1].accepted, true, 'a work order is an accepted quote');

const handmade = [
  'Some notes at the top',
  '',
  'Client,Phone,Amount,Date',
  'Jo Bloggs,0412999888,$3.2k,1 Sep 2026',
].join('\n');
r = I.readSheet(handmade);
eq(r.items.length, 1, 'a hand-kept sheet with notes above the headings');
eq(r.items[0].amount, 3200, 'and $3.2k');

r = I.readSheet('');
ok(r.items.length === 0, 'an empty file reads as nothing, and does not throw');
r = I.readSheet('just,some,words\nno,money,here');
ok(r.items.length === 0, 'a file that is not quotes reads as nothing');

// ---- every text he sent, from a backup (Android: SMS Backup & Restore XML)
const NOW = Date.UTC(2026, 8, 26), ago = (d) => String(NOW - d * 86400000);
const esc = (t) => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '&#10;');
const sms = (addr, name, type, d, body) => '<sms protocol="0" address="' + addr + '" date="' + ago(d) + '" type="' + type + '" subject="null" body="' + esc(body) + '" toa="null" sc_toa="null" service_center="null" read="1" status="-1" locked="0" date_sent="0" readable_date="x" contact_name="' + name + '" />\n';
const photo = 'A'.repeat(300000);
const xml = '<?xml version=\'1.0\' encoding=\'UTF-8\' standalone=\'yes\' ?>\n<!--File Created By SMS Backup & Restore v10.20.002-->\n<smses count="12" backup_set="x" backup_date="1">\n' +
  sms('+61412111222', 'Jane Mitchell', '1', 20, 'Hi mate can you quote the deck?') +
  sms('+61412111222', 'Jane Mitchell', '2', 18, 'Hi Jane, quote for the deck is $2,450 inc GST. Q-2041. Let me know!') +
  sms('+61412111222', 'Jane Mitchell', '2', 12, 'Hi Jane, sorry revised: $2,300 inc GST all up') +
  sms('0413 222 333', '(Unknown)', '2', 9, 'Hi Tom, price for the downlights is $880 including GST') +
  sms('0413222333', '(Unknown)', '1', 8, 'Yep go ahead, when can you start?') +
  sms('+61414333444', 'Ray Cole', '2', 30, 'Ray, invoice INV-1006 for the rewire, total $3,885.20 due on the 15th') +
  sms('+61414333444', 'Ray Cole', '1', 25, 'Paid it this morning thanks') +
  sms('+61415444555', 'Lee Park', '2', 40, 'Lee, quote for the fence $4,100 inc gst') +
  sms('+61415444555', 'Lee Park', '1', 35, 'Thanks but we have gone with someone else') +
  sms('+61416555666', 'Mum', '2', 3, 'Running late, be there at 6') +
  sms('+61417666777', 'Sam Old', '2', 400, 'Quote for the roof $9,000') +
  sms('TELSTRA', 'TELSTRA', '1', 2, 'Your bill of $95 is due') +
  sms('+61412999888~+61412999777', '', '2', 5, 'Quote for you both $500') +
  '<mms date="' + ago(6) + '" msg_box="2" address="+61418777888" contact_name="Kim Vo" m_type="128"><parts>' +
  '<part seq="-1" ct="application/smil" name="null" text="&lt;smil&gt;&lt;/smil&gt;" />' +
  '<part seq="0" ct="image/jpeg" name="IMG_1.jpg" cl="IMG_1.jpg" data="' + photo + '" />' +
  '<part seq="0" ct="text/plain" name="null" chset="106" text="Hi Kim, here&apos;s the quote for the bathroom regrout: $1,150 inc GST &#128512;" />' +
  '</parts><addrs><addr address="+61418777888" type="151" charset="106" /></addrs></mms>\n</smses>\n';
r = I.readTexts(xml, { now: NOW });
const by = Object.fromEntries(r.items.map(i => [i.name, i]));
ok(r.items.length === 3, 'from 15 texts to 9 people, three are quotes to chase: ' + r.items.map(i => i.name).join(', '));
eq(by['Jane Mitchell'] && by['Jane Mitchell'].amount, 2300, 'a revised price replaces the first: the latest one sent is what gets chased');
eq(by['Jane Mitchell'] && by['Jane Mitchell'].phone, '0412 111 222', 'the mobile is the one it was sent to, tidied');
eq(by['Jane Mitchell'] && by['Jane Mitchell'].date, '2026-09-14', 'the date is the day that text went');
eq(by['Tom'] && by['Tom'].accepted, true, 'Tom said "Yep go ahead": it comes in as won, to book, not to chase (named from "Hi Tom" as he is not in contacts)');
eq(by['Kim Vo'] && by['Kim Vo'].amount, 1150, 'a picture message with a photo in it is read for its words, and the photo stepped over');
ok(!by['Ray Cole'] && r.skipped.paid === 1, 'an invoice the customer said they paid is left out, and counted as paid');
ok(!by['Lee Park'] && r.skipped.closed === 1, 'a quote they turned down is left out, and counted');
ok(!by['Mum'] && !by['Sam Old'] && !r.items.some(i => /TELSTRA/.test(i.name)), 'no price, over six months old, a company short code: none of them');
ok(!r.items.some(i => i.amount === 500), 'a group text is not a customer quote');
// fed in small pieces, as a big file is, it finds the same
const rd = I.textsReader({ now: NOW }); for (let i = 0; i < xml.length; i += 4096) rd.push(xml.slice(i, i + 4096));
const r2 = rd.done();
ok(JSON.stringify(r2.items) === JSON.stringify(r.items), 'read in 4 KB pieces, the answer is the same (' + r2.items.length + ')');

// ---- an iPhone export via a computer: a CSV with the message text in it
const csv = '"Chat Session","Message Date","Delivered Date","Read Date","Edited Date","Service","Type","Sender ID","Sender Name","Status","Replying to","Subject","Text","Attachment","Attachment type"\n' +
  '"Priya Shah","2026-09-01 09:10:00","","","","iMessage","Incoming","+61419888999","Priya Shah","Read","","","Can you quote the fence painting?","",""\n' +
  '"Priya Shah","2026-09-02 17:40:00","","","","iMessage","Outgoing","","","Delivered","","","Hi Priya, quote for the fence painting is $1,980 inc GST","",""\n' +
  '"0420 111 000","2026-09-05 08:00:00","","","","SMS","Outgoing","","","Sent","","","Price for the gate $640 all up","",""\n' +
  '"Priya Shah","2026-09-03 07:00:00","","","","iMessage","Incoming","+61419888999","Priya Shah","Read","","","Thanks, will let you know","",""\n';
r = I.readTexts(csv, { now: NOW });
const byc = Object.fromEntries(r.items.map(i => [i.name, i]));
eq(byc['Priya Shah'] && byc['Priya Shah'].phone, '0419 888 999', 'iPhone CSV: the quote to Priya, her mobile taken from her own messages');
eq(byc['Priya Shah'] && byc['Priya Shah'].amount, 1980, 'and the amount');
ok(r.items.some(i => i.phone === '0420 111 000' && i.amount === 640), 'a chat named by its number works too');
eq(I.readTexts('not,a,messages,file\n1,2,3,4').items.length, 0, 'a CSV that is not messages reads as nothing');
eq(I.readTexts('<html><body>hello</body></html>').items.length, 0, 'an XML file that is not a backup reads as nothing');

// ---- a quote or invoice document: his own details never taken for the customer's
const own = { trading_name: 'Steele Electrical', owner_name: 'Dave Steele', phone: '0412 345 678', email: 'dave@steele.com.au' };
let d = I.parseDoc(['Steele Electrical', 'ABN 12 345 678 901', 'Ph 0412 345 678 dave@steele.com.au', 'QUOTE', 'Quote Number: QU-0042', 'Quote Date: 03/09/2026', 'Valid Until: 03/10/2026', 'Prepared For:', 'Jane Mitchell', '0412 111 222 jane.m@example.com', 'Description: Switchboard upgrade', 'Subtotal $2,227.27', 'GST $222.73', 'Total (inc GST) $2,450.00'].join('\n'), own);
ok(d.name === 'Jane Mitchell' && d.amount === 2450 && d.number === 'QU-0042' && d.kind === 'quote', 'a quote document: Jane Mitchell, $2,450, QU-0042 (' + JSON.stringify(d) + ')');
ok(d.phone === '0412 111 222' && d.email === 'jane.m@example.com', 'her phone and email, never his own at the top');
ok(d.date === '2026-09-03' && d.due === '' && d.what === 'Switchboard upgrade', 'the quote date, not the valid-until date, and what it is for');
d = I.parseDoc('TAX INVOICE\nSteele Electrical ABN 12 345 678 901\nBill To: Bay Cafe Pty Ltd, 3 Jetty Rd\nInvoice # INV-1006   Date 1 September 2026   Due Date 15 September 2026\nAmount Due $3,885.20', own);
ok(d.kind === 'invoice' && d.name === 'Bay Cafe Pty Ltd' && d.number === 'INV-1006' && d.date === '2026-09-01' && d.due === '2026-09-15' && d.amount === 3885.2, 'an invoice: bill-to, number, issue and due dates on one line, amount due');
d = I.parseDoc('Dave Steele\nSteele Electrical\nQuote for: Dave Steele\nTo: Mick Jones\nTotal $500', own);
ok(d.name === 'Mick Jones', 'his own name on a "for" line is skipped for the real customer (' + d.name + ')');
eq(I.parseDoc('', own).name, '', 'an empty document reads as nothing, and does not throw');

console.log(fails ? '\nFAILURES: ' + fails : '\nALL PASSED');
process.exit(fails ? 1 : 0);
