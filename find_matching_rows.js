import fs from 'fs';

async function run() {
  try {
    const url = 'https://docs.google.com/spreadsheets/d/1Fzi87Ev_CF8PnnKVkvG3RtonLgQiOEoF/export?format=csv&gid=553150040';
    const res = await fetch(url);
    const text = await res.text();
    const lines = text.split('\n').map(line => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current);
      return result;
    });

    const targetVals = [55188, 1280000, 499000, 334182, 997553, 40000, 300000, 66226, 110376, 95400, 120310, 70490, 302100];
    
    console.log("Searching for target rows in the CSV...");
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (!row || row.length < 18) continue;
      const val = parseFloat(row[17].replace(/[^0-9.-]/g, '')) || 0;
      if (targetVals.includes(val)) {
        console.log(`Row ${i+1}: CD="${row[3]}", Placa="${row[2]}", Insumo="${row[16]}", Val=${val}, Col 33="${row[33]}", Mes="${row[39]}"`);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

run();
