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

    let withValueNoDateG = 0;
    let withValueNoDateCountG = 0;
    let withValueNoDateA = 0;
    let withValueNoDateCountA = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (!row || row.length < 18) continue;
      
      const cdRaw = row[3] ? row[3].trim().toUpperCase() : '';
      const isGalapa = cdRaw.includes('GALAPA');
      const isArenosa = cdRaw.includes('ARENOSA') || cdRaw.includes('BARRANQUILLA');

      const fecha = row[9] ? row[9].trim() : '';
      const valMmtoRaw = row[17] ? row[17].trim() : '';
      const valMmto = parseFloat(valMmtoRaw.replace(/[^0-9.-]/g, '')) || 0;

      if (!fecha) {
        if (isGalapa && valMmto > 0) {
          withValueNoDateG += valMmto;
          withValueNoDateCountG++;
          console.log(`Galapa Row ${i+1}: Placa=${row[2]}, Val=${valMmto}, Mes=${row[39]}`);
        }
        if (isArenosa && valMmto > 0) {
          withValueNoDateA += valMmto;
          withValueNoDateCountA++;
        }
      }
    }

    console.log(`\nGalapa rows without date but with positive value: ${withValueNoDateCountG}, total value skipped: ${withValueNoDateG}`);
    console.log(`Arenosa rows without date but with positive value: ${withValueNoDateCountA}, total value skipped: ${withValueNoDateA}`);
  } catch (err) {
    console.error(err);
  }
}

run();
