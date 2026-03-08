import * as fs from 'node:fs';
import * as path from 'node:path';

const FLYFF_API = 'https://api.flyff.com';
const SKILL_ICON_URL = (filename: string) => `${FLYFF_API}/image/skill/colored/${filename}`;
const CLASS_ICON_URL = (filename: string) => `${FLYFF_API}/image/class/colored/${filename}`;

export interface RegistrySkill {
  id: number;
  name: string;
  icon: string; // filename, e.g. 'wndlbacksteb.png'
  passive: boolean;
  defaultCastTime: number;  // seconds
  defaultCooldown: number;  // seconds
}

export interface RegistryClass {
  id: number;
  name: string;
  icon: string; // filename, e.g. 'jester.png'
  skills: RegistrySkill[];
}

export interface FlyffRegistry {
  builtAt: number;
  classes: RegistryClass[];
}

export type ProgressEvent = {
  phase: string;
  message: string;
  current: number;
  total: number;
};

type ProgressCallback = (event: ProgressEvent) => void;

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function downloadFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
}

async function runInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

export async function buildRegistry(
  registryDir: string,
  onProgress: ProgressCallback,
): Promise<FlyffRegistry> {
  const iconsSkillDir = path.join(registryDir, 'icons', 'skill');
  const iconsClassDir = path.join(registryDir, 'icons', 'class');
  fs.mkdirSync(iconsSkillDir, { recursive: true });
  fs.mkdirSync(iconsClassDir, { recursive: true });

  // ── 1. Fetch all class IDs ───────────────────────────────────────────────
  onProgress({ phase: 'classes', message: 'Fetching class list…', current: 0, total: 1 });
  const classIds: number[] = await fetchJson(`${FLYFF_API}/class`);

  // ── 2. Fetch class details ───────────────────────────────────────────────
  onProgress({ phase: 'classes', message: 'Fetching class details…', current: 0, total: classIds.length });
  let classCount = 0;

  const rawClasses = await runInBatches(classIds, 8, async (id) => {
    const data = await fetchJson(`${FLYFF_API}/class/${id}`);
    onProgress({
      phase: 'classes',
      message: `Fetched class: ${data.name?.en ?? id}`,
      current: ++classCount,
      total: classIds.length,
    });
    return data;
  });

  // Build a map for quick lookup
  const classMap = new Map<number, any>(rawClasses.map((c) => [c.id, c]));

  // ── 3. Fetch all skill IDs ───────────────────────────────────────────────
  onProgress({ phase: 'skills', message: 'Fetching skill list…', current: 0, total: 1 });
  const skillIds: number[] = await fetchJson(`${FLYFF_API}/skill`);

  // ── 4. Fetch skill details ───────────────────────────────────────────────
  onProgress({ phase: 'skills', message: 'Fetching skill details…', current: 0, total: skillIds.length });
  let skillCount = 0;

  const rawSkills = await runInBatches(skillIds, 10, async (id) => {
    try {
      const data = await fetchJson(`${FLYFF_API}/skill/${id}`);
      onProgress({
        phase: 'skills',
        message: `Fetched skill: ${data.name?.en ?? id}`,
        current: ++skillCount,
        total: skillIds.length,
      });
      return data;
    } catch {
      onProgress({
        phase: 'skills',
        message: `Skipped skill ${id} (fetch error)`,
        current: ++skillCount,
        total: skillIds.length,
      });
      return null;
    }
  });

  const validSkills = rawSkills.filter(Boolean);

  // Group skills by classId
  const skillsByClass = new Map<number, any[]>();
  for (const skill of validSkills) {
    const classId: number = skill.class;
    if (!classId || !classMap.has(classId)) continue;
    if (!skillsByClass.has(classId)) skillsByClass.set(classId, []);
    skillsByClass.get(classId)!.push(skill);
  }

  // ── 5. Download skill icons ─────────────────────────────────────────────
  const allIconFilenames = [...new Set(validSkills.map((s) => s.icon).filter(Boolean))] as string[];
  onProgress({ phase: 'icons', message: 'Downloading skill icons…', current: 0, total: allIconFilenames.length });
  let iconCount = 0;

  await runInBatches(allIconFilenames, 5, async (filename) => {
    const dest = path.join(iconsSkillDir, filename);
    if (!fs.existsSync(dest)) {
      try {
        await downloadFile(SKILL_ICON_URL(filename), dest);
      } catch {
        // icon not available — skip silently
      }
    }
    onProgress({
      phase: 'icons',
      message: `Downloaded: ${filename}`,
      current: ++iconCount,
      total: allIconFilenames.length,
    });
  });

  // ── 6. Download class icons ─────────────────────────────────────────────
  const classIconFilenames = rawClasses.map((c) => c.icon).filter(Boolean) as string[];
  onProgress({ phase: 'class_icons', message: 'Downloading class icons…', current: 0, total: classIconFilenames.length });
  let classIconCount = 0;

  await runInBatches(classIconFilenames, 5, async (filename) => {
    const dest = path.join(iconsClassDir, filename);
    if (!fs.existsSync(dest)) {
      try {
        await downloadFile(CLASS_ICON_URL(filename), dest);
      } catch {
        // icon not available — skip silently
      }
    }
    onProgress({
      phase: 'class_icons',
      message: `Downloaded: ${filename}`,
      current: ++classIconCount,
      total: classIconFilenames.length,
    });
  });

  // ── 7. Build registry structure ─────────────────────────────────────────
  onProgress({ phase: 'saving', message: 'Building registry…', current: 0, total: 1 });

  function parseSkill(raw: any): RegistrySkill {
    const levels: any[] = raw.levels ?? [];
    const lastLevel = levels[levels.length - 1] ?? {};
    return {
      id: raw.id,
      name: raw.name?.en ?? `Skill ${raw.id}`,
      icon: raw.icon ?? '',
      passive: raw.passive === true,
      defaultCastTime: lastLevel.casting ?? 0,
      defaultCooldown: lastLevel.cooldown ?? 0,
    };
  }

  const classes: RegistryClass[] = rawClasses
    .filter((c) => skillsByClass.has(c.id))
    .map((c) => ({
      id: c.id,
      name: c.name?.en ?? `Class ${c.id}`,
      icon: c.icon ?? '',
      skills: (skillsByClass.get(c.id) ?? []).map(parseSkill),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const registry: FlyffRegistry = {
    builtAt: Date.now(),
    classes,
  };

  const registryPath = path.join(registryDir, 'registry.json');
  fs.writeFileSync(registryPath, JSON.stringify(registry));

  onProgress({ phase: 'done', message: 'Registry built successfully!', current: 1, total: 1 });
  return registry;
}

export function checkRegistry(registryDir: string): boolean {
  return fs.existsSync(path.join(registryDir, 'registry.json'));
}

export function loadRegistry(registryDir: string): FlyffRegistry | null {
  const p = path.join(registryDir, 'registry.json');
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}
