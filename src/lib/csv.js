export function toCsv(headers, rows) {
  const escape = (value) => {
    const str = value == null ? "" : String(value);
    if (/[",\n\r]/.test(str)) {
      return `"${str.replaceAll('"', '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ];

  return lines.join("\r\n");
}

export function downloadCsv(filename, csvContent) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
