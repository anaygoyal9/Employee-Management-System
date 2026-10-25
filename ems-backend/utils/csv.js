// Safe CSV cell: always quoted, quotes doubled, and formula-trigger characters
// (= + - @ tab CR) neutralised so Excel/Sheets won't execute them.
export const csvCell = (value) => {
    let s = value === undefined || value === null ? "" : String(value);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
};

export const csvRow = (cells) => cells.map(csvCell).join(",") + "\n";
