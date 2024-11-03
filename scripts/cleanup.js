const fs = require('fs-extra');
const { parsePhoneNumberFromString } = require('libphonenumber-js');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const PDFDocument = require('pdfkit');

// Helper function to extract phone number and country
function extractPhoneAndCountry(jid) {
  const phone = jid.split('@')[0];
  const phoneNumber = parsePhoneNumberFromString(`+${phone}`);
  const country = phoneNumber ? phoneNumber.country : null;
  return { phone, country };
}

// Helper function to determine group or person category
function determineCategory(name, description, joinedGroups = []) {
  const keywords = {
    tech: ['tech', 'ai', 'blockchain', 'solana'],
    social: ['family', 'friends', 'party'],
    work: ['work', 'office', 'project'],
  };

  const categories = new Set();

  if (name || description) {
    const text = `${name} ${description}`.toLowerCase();
    for (const [category, words] of Object.entries(keywords)) {
      if (words.some((word) => text.includes(word))) {
        categories.add(category);
      }
    }
  }

  if (joinedGroups.length > 0) {
    joinedGroups.forEach((group) => {
      if (group.toLowerCase().includes('tech')) {
        categories.add('tech');
      }
    });
  }

  return categories.size > 0 ? Array.from(categories).join(', ') : 'unknown';
}

// Read the JSON file
fs.readFile('data.json', 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading the file:', err);
    return;
  }

  const jsonData = JSON.parse(data);

  const groups = jsonData.chats
    .filter((chat) => chat.createdBy)
    .map((chat) => {
      const participants = chat.participant || [];
      const adminParticipants = participants.filter((p) => p.rank === 'ADMIN');
      const normalParticipants = participants.filter((p) => p.rank !== 'ADMIN');

      const groupCategory = determineCategory(chat.name, chat.description);

      return {
        'Group Name': chat.name || null,
        description: chat.description || null,
        createdBy: extractPhoneAndCountry(chat.createdBy).phone || null,
        participant: [...adminParticipants, ...normalParticipants].map((p) => {
          const { phone, country } = extractPhoneAndCountry(p.userJid);
          return { phone, country, rank: p.rank || null };
        }),
        admin: adminParticipants.map(
          (p) => extractPhoneAndCountry(p.userJid).phone
        ),
        category: groupCategory,
      };
    });

  const contacts = Object.values(jsonData.contacts)
    .filter((contact) => !contact.id.includes('@g.us'))
    .map((contact) => {
      const { phone, country } = extractPhoneAndCountry(contact.id);
      const groupNames = groups
        .filter((group) => group.participant.some((p) => p.phone === phone))
        .map((group) => group['Group Name'])
        .join(', ');

      const personCategory = determineCategory(
        null,
        null,
        groupNames.split(', ')
      );

      return {
        phone,
        country,
        'LOCAL Name': contact.name || null,
        'WA Name': contact.notify || null,
        groups: groupNames || null,
        category: personCategory,
      };
    });

  // Combine all contact data from contacts and group participants
  const combinedContacts = new Map();

  contacts.forEach((contact) => {
    combinedContacts.set(contact.phone, contact);
  });

  groups.forEach((group) => {
    group.participant.forEach((participant) => {
      if (!combinedContacts.has(participant.phone)) {
        combinedContacts.set(participant.phone, {
          phone: participant.phone,
          country: participant.country,
          'LOCAL Name': '',
          'WA Name': '',
          groups: group['Group Name'],
          category: determineCategory(null, null, [group['Group Name']]),
        });
      } else {
        const existingContact = combinedContacts.get(participant.phone);
        existingContact.groups = existingContact.groups
          ? `${existingContact.groups}, ${group['Group Name']}`
          : group['Group Name'];
      }
    });
  });

  const combinedContactArray = Array.from(combinedContacts.values());

  fs.ensureDirSync('clean-data/JSON');
  fs.ensureDirSync('clean-data/CSV');
  fs.ensureDirSync('clean-data/PDF');

  fs.writeFileSync(
    'clean-data/JSON/cleaned_data.json',
    JSON.stringify({ groups, contacts }, null, 4)
  );
  fs.writeFileSync(
    'clean-data/JSON/deep_cleaned_data.json',
    JSON.stringify({ groups, contacts }, null, 4)
  );
  fs.writeFileSync(
    'clean-data/JSON/data-set.json',
    JSON.stringify(combinedContactArray, null, 4)
  );

  const groupCsvWriter = createCsvWriter({
    path: 'clean-data/CSV/Groups.csv',
    header: [
      { id: 'groupName', title: 'Group Name' },
      { id: 'description', title: 'Group Description' },
      { id: 'category', title: 'Group Category' },
      { id: 'totalMembers', title: 'Total Members' },
      { id: 'admins', title: 'Admins' },
      { id: 'sr', title: 'SR' },
      { id: 'country', title: 'Country' },
      { id: 'phone', title: 'Phone' },
      { id: 'isAdmin', title: 'Admin' },
      { id: 'waName', title: 'WA Name' },
      { id: 'localName', title: 'Local Name' },
    ],
  });

  const contactCsvWriter = createCsvWriter({
    path: 'clean-data/CSV/Contacts.csv',
    header: [
      { id: 'sr', title: 'SR' },
      { id: 'country', title: 'Country' },
      { id: 'phone', title: 'Phone' },
      { id: 'waName', title: 'WA Name' },
      { id: 'localName', title: 'Local Name' },
      { id: 'groups', title: 'Groups' },
      { id: 'category', title: 'Person Category' },
    ],
  });

  const dataSetCsvWriter = createCsvWriter({
    path: 'clean-data/CSV/data-set.csv',
    header: [
      { id: 'sr', title: 'SR' },
      { id: 'country', title: 'Country' },
      { id: 'phone', title: 'Phone' },
      { id: 'waName', title: 'WA Name' },
      { id: 'localName', title: 'Local Name' },
      { id: 'groups', title: 'Groups' },
      { id: 'category', title: 'Person Category' },
    ],
  });

  const groupCsvData = [];
  groups.forEach((group, index) => {
    group.participant.forEach((participant, pIndex) => {
      groupCsvData.push({
        groupName: pIndex === 0 ? group['Group Name'] : '',
        description: pIndex === 0 ? group.description : '',
        category: pIndex === 0 ? group.category : '',
        totalMembers: pIndex === 0 ? group.participant.length : '',
        admins: pIndex === 0 ? group.admin.join(', ') : '',
        sr: pIndex + 1,
        country: participant.country || '',
        phone: participant.phone || '',
        isAdmin: participant.rank === 'ADMIN' ? 'TRUE' : 'FALSE',
        waName: '',
        localName: '',
      });
    });
  });

  const contactCsvData = contacts.map((contact, index) => ({
    sr: index + 1,
    country: contact.country || '',
    phone: contact.phone || '',
    waName: contact['WA Name'] || '',
    localName: contact['LOCAL Name'] || '',
    groups: contact.groups || '',
    category: contact.category || '',
  }));

  const dataSetCsvData = combinedContactArray.map((contact, index) => ({
    sr: index + 1,
    country: contact.country || '',
    phone: contact.phone || '',
    waName: contact['WA Name'] || '',
    localName: contact['LOCAL Name'] || '',
    groups: contact.groups || '',
    category: contact.category || '',
  }));

  groupCsvWriter
    .writeRecords(groupCsvData)
    .then(() => console.log('Groups CSV file written successfully'));

  contactCsvWriter
    .writeRecords(contactCsvData)
    .then(() => console.log('Contacts CSV file written successfully'));

  dataSetCsvWriter
    .writeRecords(dataSetCsvData)
    .then(() => console.log('Data Set CSV file written successfully'));

  function generatePdfFromCsv(csvFilePath, pdfFilePath) {
    const doc = new PDFDocument({ margin: 30 });
    const stream = fs.createWriteStream(pdfFilePath);
    doc.pipe(stream);

    fs.readFile(csvFilePath, 'utf8', (err, csvData) => {
      if (err) {
        console.error('Error reading CSV file:', err);
        return;
      }

      const rows = csvData.split('\n').map((row) => row.split(','));

      const table = {
        headers: rows[0],
        rows: rows.slice(1),
      };

      doc
        .fontSize(12)
        .text(`Data from ${csvFilePath}`, { align: 'center' })
        .moveDown();

      const startX = 30;
      let startY = 60;

      table.headers.forEach((header, i) => {
        doc.fontSize(10).text(header, startX + i * 100, startY, {
          width: 100,
          align: 'left',
        });
      });

      startY += 20;

      table.rows.forEach((row) => {
        row.forEach((cell, i) => {
          doc.fontSize(10).text(cell, startX + i * 100, startY, {
            width: 100,
            align: 'left',
          });
        });
        startY += 20;
      });

      doc.end();
    });
  }

  generatePdfFromCsv('clean-data/CSV/Groups.csv', 'clean-data/PDF/Groups.pdf');
  generatePdfFromCsv(
    'clean-data/CSV/Contacts.csv',
    'clean-data/PDF/Contacts.pdf'
  );
  generatePdfFromCsv(
    'clean-data/CSV/data-set.csv',
    'clean-data/PDF/data-set.pdf'
  );
});
