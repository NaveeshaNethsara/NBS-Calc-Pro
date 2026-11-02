/**
 * History Manager Module
 * Manages calculation history, persistent localStorage synchronization,
 * search/filter, and export (CSV/TXT).
 */

export class HistoryManager {
  constructor(storageKey = 'modern_calculator_history', maxItems = 100) {
    this.storageKey = storageKey;
    this.maxItems = maxItems;
    this.items = this.load();
    this.listeners = [];
  }

  load() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {}
    return [];
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.items));
    } catch {}
    this.notify();
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notify() {
    this.listeners.forEach(cb => {
      try {
        cb(this.items);
      } catch {}
    });
  }

  add(expression, result, mode = 'standard') {
    if (!expression || result === undefined || result === null) return;

    const entry = {
      id: Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      expression: String(expression),
      result: String(result),
      mode,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    this.items.unshift(entry);

    if (this.items.length > this.maxItems) {
      this.items = this.items.slice(0, this.maxItems);
    }

    this.save();
    return entry;
  }

  clear() {
    this.items = [];
    this.save();
  }

  getItems() {
    return [...this.items];
  }

  exportAsText() {
    if (this.items.length === 0) return 'No history records.';
    return this.items
      .map(item => `[${item.timestamp}] ${item.expression} = ${item.result}`)
      .join('\n');
  }

  exportAsCSV() {
    if (this.items.length === 0) return 'Timestamp,Expression,Result,Mode\n';
    const rows = this.items.map(item => {
      const esc = (txt) => `"${String(txt).replace(/"/g, '""')}"`;
      return `${esc(item.timestamp)},${esc(item.expression)},${esc(item.result)},${esc(item.mode)}`;
    });
    return 'Timestamp,Expression,Result,Mode\n' + rows.join('\n');
  }
}

