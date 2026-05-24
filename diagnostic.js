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

    console.log(`Analyzing ${lines.length} lines.`);

    // Let's count how many rows are GALAPA and LA ARENOSA
    let countG = 0;
    let countA = 0;
    let countOther = 0;
    let sumG = 0;
    let sumA = 0;
    let sumOther = 0;

    const cdCounts = {};

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (!row || row.length < 18) continue;
      
      const cdRaw = row[3] ? row[3].trim().toUpperCase() : '';
      const valMmtoRaw = row[17] ? row[17].trim() : '';
      const valMmto = parseFloat(valMmtoRaw.replace(/[^0-9.-]/g, '')) || 0;

      cdCounts[cdRaw] = (cdCounts[cdRaw] || 0) + valMmto;

      if (cdRaw.includes('GALAPA')) {
        countG++;
        sumG += valMmto;
      } else if (cdRaw.includes('ARENOSA') || cdRaw.includes('BARRANQUILLA')) {
        countA++;
        sumA += valMmto;
      } else {
        countOther++;
        sumOther += valMmto;
      }
    }

    console.log("CD raw sums:", cdCounts);
    console.log(`- GALAPA: count=${countG}, sum=${sumG}`);
    console.log(`- LA ARENOSA: count=${countA}, sum=${sumA}`);
    console.log(`- OTHER: count=${countOther}, sum=${sumOther}`);

    // Let's see what is grouped by mes (Col 39) vs fecha (Col 9)
    // Let's check if there are empty/invalid "Valor" (Col 17) or parsing discrepancies.
    // Let's look at row 33 "Texto explicativo xq Bavaria" which might be the "Empresa que asume"
    // Let's check unique values in Col 33:
    const asumeCounts = {};
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (row && row[33]) {
        const asume = row[33].trim().toUpperCase();
        asumeCounts[asume] = (asumeCounts[asume] || 0) + (parseFloat(row[17].replace(/[^0-9.-]/g, '')) || 0);
      }
    }
    console.log("Asume company sums:", asumeCounts);

  } catch (err) {
    console.error(err);
  }
}

run();
