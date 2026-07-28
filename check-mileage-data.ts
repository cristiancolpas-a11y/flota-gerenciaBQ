import Papa from 'papaparse';

async function checkData() {
  const docId = '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU';
  const url = `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:csv&gid=1929496440&t=${Date.now()}`;
  try {
    const res = await fetch(url);
    const text = await res.text();
    Papa.parse(text, {
      header: false,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        const rows = results.data as any[][];
        console.log("Total rows in KILOMETRAJE:", rows.length);
        console.log("Last 5 rows:");
        for (let i = Math.max(0, rows.length - 5); i < rows.length; i++) {
          console.log(`Row ${i}:`, rows[i]);
        }
      }
    });
  } catch (e) {
    console.error("Error:", e);
  }
}

checkData();
