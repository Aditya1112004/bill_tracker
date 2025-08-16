const fs = require('fs');
const path = require('path');

function readJsonUtf8(filePath, fallbackValue) {
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const cleaned = (raw || '').replace(/^\uFEFF/, '').trim();
        if (cleaned.length === 0) return fallbackValue;
        return JSON.parse(cleaned);
    } catch (err) {
        console.error(`Failed to read JSON ${path.basename(filePath)}:`, err);
        return fallbackValue;
    }
}

module.exports = { readJsonUtf8 };


