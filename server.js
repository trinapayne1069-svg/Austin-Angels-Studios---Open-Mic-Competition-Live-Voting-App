const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public')); // Serves the HTML file above

// In-memory data store for live event tracking
// (For production, swap these arrays out for a database like Redis or Supabase)
const voteTallies = { "Act 1": 0, "Act 2": 0 };
const recordedTokens = new Set();
const recordedIPs = new Set();

// ENDPOINT: Submitting a vote
app.post('/api/vote', (req, res) => {
    const { voteSelection, voterToken } = req.body;
    
    // Extract client IP address (taking proxy headers into account)
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // 1. Validation: Ensure choice is valid
    if (voteSelection !== "Act 1" && voteSelection !== "Act 2") {
        return res.status(400).json({ error: "Invalid competition entry selection." });
    }

    // 2. Anti-Corruption Check A: Token Check
    if (recordedTokens.has(voterToken)) {
        return res.status(403).json({ error: "Security Exception: Ballot already submitted from this device identity." });
    }

    // 3. Anti-Corruption Check B: Heavy IP Spam Prevention 
    // Note: On venue Wi-Fi, multiple legitimate voters share one public IP. 
    // Use this strictly to catch bot traffic (e.g. 50 votes from same IP within seconds).
    /* 
    if (recordedIPs.has(clientIP)) {
        return res.status(403).json({ error: "Security Exception: Ballot already recorded from this network address." });
    } 
    */

    // 4. Log voter data to prevent reuse
    recordedTokens.add(voterToken);
    recordedIPs.add(clientIP);

    // 5. Register Vote
    voteTallies[voteSelection]++;
    console.log(`[VOTE LOGGER] Saved vote for ${voteSelection}. Live Count:`, voteTallies);

    return res.status(200).json({ message: "Vote successfully cast." });
});

// ENDPOINT: Private dashboard metrics for the producer panel
app.get('/api/results-dashboard', (req, res) => {
    // secure this route behind an admin password layer in production
    res.json(voteTallies);
});

app.listen(PORT, () => {
    console.log(`Austin Angels Studios voting architecture running on port ${PORT}`);
});
