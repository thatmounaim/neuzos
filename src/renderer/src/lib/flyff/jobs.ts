// Types for the dynamically-built Flyff skill registry.
// The actual data is fetched from the Flyff Universe API and stored in
// userData/flyff-registry/registry.json, served via the flyff-asset:// protocol.

export type FlyffSkill = {
  id: number;
  name: string;
  icon: string;             // filename, e.g. 'wndlbacksteb.png'
  passive: boolean;
  defaultCastTime: number;  // seconds (last skill level value)
  defaultCooldown: number;  // seconds (last skill level value)
}

export type FlyffClass = {
  id: number;
  name: string;
  icon: string;             // filename, e.g. 'jester.png'
  skills: FlyffSkill[];
}

export type FlyffRegistry = {
  builtAt: number;
  classes: FlyffClass[];
}

/** URL for a skill icon served via the flyff-asset:// protocol. */
export function skillIconUrl(filename: string): string {
  return `flyff-asset://icons/skill/${filename}`;
}

/** URL for a class icon served via the flyff-asset:// protocol. */
export function classIconUrl(filename: string): string {
  return `flyff-asset://icons/class/${filename}`;
}
