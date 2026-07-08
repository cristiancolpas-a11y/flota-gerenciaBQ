import Papa from 'papaparse';

async function checkData() {
  const docId = '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU';
  const url = `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:csv&gid=1929496440`;
  try {
    const res = await fetch(url);
    const text = await res.text();
    Papa.parse(text, {
      header: false,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        const rows = results.data as any[][];
        console.log("Total rows:", rows.length);
        const weeks = new Map<string, number>();
        const plates = new Set<string>();
        const cds = new Set<string>();
        
        // Headers are: cd, CONTRATISTA, SEMANA , FECHA, PLACA, KILOMETRAJE
        // rows[0] is header
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 5) continue;
          const cd = String(row[0]).trim();
          const contractor = String(row[1]).trim();
          const week = String(row[2]).trim();
          const date = String(row[3]).trim();
          const plate = String(row[4]).trim();
          const km = String(row[5]).trim();
          
          cds.add(cd);
          plates.add(plate);
          weeks.set(week, (weeks.get(week) || 0) + 1);
        }
        
        console.log("Distinct CDs:", Array.from(cds));
        console.log("Total distinct plates:", plates.size);
        console.log("Distinct weeks and row counts (sorted by week):");
        const sortedWeeks = Array.from(weeks.entries()).sort((a, b) => {
          const numA = parseInt(a[0]) || 0;
          const numB = parseInt(b[0]) || 0;
          return numA - numB;
        });
        console.log(sortedWeeks);
      }
    });
  } catch (e) {
    console.error("Error:", e);
  }
}

checkData();
