const fs = require('fs');
let content = fs.readFileSync('src/components/HistoricalTab.tsx', 'utf8');

// Ensure that for the first row, we show nothing or 0.
// Let's modify the comparison logic slightly to ensure we use null if there's no prior snapshot.
// Wait, currently compareSnapshot is the first snapshot if no prior is found.

