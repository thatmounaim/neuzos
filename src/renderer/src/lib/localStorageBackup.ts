export type LocalStorageBackupItem = {
  key: string;
  value: string;
};

export type LocalStorageBackupPayload = {
  type: 'neuzos-local-storage-backup';
  version: 1;
  exportedAt: string;
  items: LocalStorageBackupItem[];
};

export type LocalStorageImportPreviewItem = LocalStorageBackupItem & {
  status: 'new' | 'existing';
};

export type LocalStorageImportResult =
  | {
      valid: true;
      payload: LocalStorageBackupPayload;
      items: LocalStorageImportPreviewItem[];
      warnings: string[];
    }
  | {
      valid: false;
      error: string;
    };

export function getLocalStorageItems(): LocalStorageBackupItem[] {
  return Object.keys(window.localStorage)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => ({
      key,
      value: window.localStorage.getItem(key) ?? '',
    }));
}

export function buildLocalStorageBackupPayload(items: LocalStorageBackupItem[]): LocalStorageBackupPayload {
  return {
    type: 'neuzos-local-storage-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    items: items.map((item) => ({key: item.key, value: item.value})),
  };
}

export function validateLocalStorageBackupPayload(value: unknown): LocalStorageImportResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {valid: false, error: 'Invalid Local Storage Backup: expected a JSON object.'};
  }

  const payload = value as Record<string, unknown>;
  if (payload.type !== 'neuzos-local-storage-backup') {
    return {valid: false, error: 'Invalid Local Storage Backup type.'};
  }

  if (payload.version !== 1) {
    return {valid: false, error: 'Unsupported Local Storage Backup version.'};
  }

  if (typeof payload.exportedAt !== 'string') {
    return {valid: false, error: 'Missing or invalid exportedAt.'};
  }

  if (!Array.isArray(payload.items)) {
    return {valid: false, error: 'Missing or invalid items.'};
  }

  const warnings: string[] = [];
  const seenKeys = new Set<string>();
  const items: LocalStorageBackupItem[] = [];

  for (const item of payload.items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      warnings.push('Skipped invalid Local Storage item.');
      continue;
    }

    const entry = item as Record<string, unknown>;
    if (typeof entry.key !== 'string' || entry.key.trim() === '' || typeof entry.value !== 'string') {
      warnings.push('Skipped invalid Local Storage item.');
      continue;
    }

    if (seenKeys.has(entry.key)) {
      warnings.push(`Skipped duplicate Local Storage key: ${entry.key}`);
      continue;
    }

    seenKeys.add(entry.key);
    items.push({key: entry.key, value: entry.value});
  }

  return {
    valid: true,
    payload: {
      type: 'neuzos-local-storage-backup',
      version: 1,
      exportedAt: payload.exportedAt,
      items,
    },
    items: buildLocalStorageImportPreview(items),
    warnings,
  };
}

export function buildLocalStorageImportPreview(items: LocalStorageBackupItem[]): LocalStorageImportPreviewItem[] {
  return items.map((item) => ({
    ...item,
    status: window.localStorage.getItem(item.key) === null ? 'new' : 'existing',
  }));
}

export function applyLocalStorageBackup(items: LocalStorageBackupItem[], mode: 'replace' | 'merge') {
  let imported = 0;
  let skipped = 0;

  for (const item of items) {
    const exists = window.localStorage.getItem(item.key) !== null;
    if (mode === 'merge' && exists) {
      skipped += 1;
      continue;
    }

    window.localStorage.setItem(item.key, item.value);
    imported += 1;
  }

  return {imported, skipped};
}

export function formatLocalStorageValue(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}
