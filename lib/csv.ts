type CsvValue = string | number | boolean | null | undefined;

export function downloadCsv(filename: string, rows: Record<string, CsvValue>[]) {
  const csv = toCsv(rows);
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function toCsv(rows: Record<string, CsvValue>[]) {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCell).join(";"),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(";"))
  ];

  return lines.join("\n");
}

function escapeCell(value: CsvValue) {
  const text = String(value ?? "");
  const escaped = text.replace(/"/g, '""');

  if (/[;"\n\r]/.test(escaped)) {
    return `"${escaped}"`;
  }

  return escaped;
}
