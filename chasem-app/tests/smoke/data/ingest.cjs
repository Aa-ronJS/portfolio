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

console.log(fails ? '\nFAILURES: ' + fails : '\nALL PASSED');
process.exit(fails ? 1 : 0);
