<script lang="ts">
  import {getContext} from 'svelte';
  import * as Card from '$lib/components/ui/card';
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import Button from '$lib/components/ui/button/button.svelte';
  import {toast} from 'svelte-sonner';
  import {neuzosBridge} from '$lib/core';
  import {Eye, SquareArrowOutUpRight, TriangleAlert} from '@lucide/svelte';
  import {
    buildExportPayload,
    categoryConfigFields,
    computeCategoryPreview,
    exportCategories,
    getCategoryCountLabel,
    getDefaultCategorySelection,
    getSelectedCategories,
    sanitizeConfigForExport,
  } from '$lib/configExport';
  import type {ConfigImportResult, ExportCategory, NeuzConfig} from '$lib/types';

  const loadConfig = getContext<() => Promise<void>>('loadConfig');
  const neuzosConfig = getContext<NeuzConfig>('neuzosConfig');

  type ValidImportResult = Extract<ConfigImportResult, { valid: true }>;
  type DetailStatus = 'new' | 'existing' | 'existing-critical' | 'changed' | 'critical' | 'neutral';
  type DetailPart = string | {
    label: string;
    status?: DetailStatus;
  };
  type DetailEntry = {
    label: string;
    status: DetailStatus;
    key?: string;
    event?: string;
    prefix?: string;
    actionParts?: DetailPart[];
    sessionActionId?: string;
    iconSlug?: string;
    iconChanged?: boolean;
  };
  type DetailValue = string | DetailEntry[];
  type DetailMode = 'current' | 'import';
  type PreviewBreakdown = {
    newLabel: string;
    existingLabel: string;
    criticalLabel: string;
    changeLabel: string;
    totalLabel: string;
    newTotal: number;
    existingTotal: number;
    criticalTotal: number;
    changeTotal: number;
  };

  const categoryById = new Map(exportCategories.map((category) => [category.id, category]));
  const pluralize = (count: number, singular: string, plural = `${singular}s`) => {
    return `${count} ${count === 1 ? singular : plural}`;
  };
  const formatBackupDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      hour12: true,
    }).format(date);
  };
  const formatValue = (value: unknown) => {
    if (value === undefined) return '-';
    if (value === null) return '-';
    if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled';
    if (typeof value === 'string') return value || '-';
    if (typeof value === 'number') return String(value);
    return JSON.stringify(value);
  };
  const countOrDash = (count: number, singular: string, plural = `${singular}s`) => count > 0 ? pluralize(count, singular, plural) : '-';
  const getPreviewPayload = () => importedPayload as Record<string, any> | null;
  const getDetailPayload = () => {
    if (detailMode === 'current' && detailCategory) {
      return buildExportPayload(neuzosConfig, [detailCategory]) as Record<string, any>;
    }

    return importedPayload as Record<string, any> | null;
  };
  const getImportedSessions = () => Array.isArray(getDetailPayload()?.sessions) ? getDetailPayload()!.sessions : [];
  const getImportedLayouts = () => Array.isArray(getDetailPayload()?.layouts) ? getDetailPayload()!.layouts : [];
  const getImportedSessionActions = () => Array.isArray(getDetailPayload()?.sessionActions) ? getDetailPayload()!.sessionActions : [];
  const isUngroupedGroup = (group: any) => group?.id === 'ungrouped' || group?.id === '__ungrouped__' || group?.type === 'ungrouped';
  const getVisibleSessionGroups = (groups: any[]) => groups.filter((group) => !isUngroupedGroup(group));
  const getSessionLabel = (sessionId: string) => {
    return getImportedSessions().find((session) => session?.id === sessionId)?.label
      ?? neuzosConfig.sessions?.find((session) => session.id === sessionId)?.label
      ?? sessionId;
  };
  const getSessionIconSlug = (sessionId: string) => {
    return getImportedSessions().find((session) => session?.id === sessionId)?.icon?.slug
      ?? neuzosConfig.sessions?.find((session) => session.id === sessionId)?.icon?.slug
      ?? 'misc/browser';
  };
  const getLayoutIconSlug = (layoutId: string, layouts: any[]) => {
    return layouts.find((layout) => layout?.id === layoutId)?.icon?.slug
      ?? neuzosConfig.layouts?.find((layout) => layout.id === layoutId)?.icon?.slug
      ?? 'neuzos_pang';
  };
  const getDetailValueClass = (label: string, value: string) => {
    if (value === '0' || value === '-') {
      return '';
    }
    if (label === 'New') {
      return 'text-green-400';
    }
    if (label === 'Already Existing') {
      return 'text-red-400';
    }
    if (label === 'Critical Conflicts') {
      return 'text-orange-300';
    }
    if (label === 'Changes') {
      return 'text-amber-300';
    }
    return '';
  };
  const formatCountPieces = (counts: Array<[number, string, string?]>) => {
    const visibleCounts = counts.filter(([count]) => count > 0);
    if (visibleCounts.length === 0) {
      return '-';
    }

    return visibleCounts.map(([count, singular, plural]) => pluralize(count, singular, plural)).join(', ');
  };
  const getDetailEntries = <T,>(
    entries: T[],
    getId: (entry: T) => string | undefined,
    getLabel: (entry: T) => string | undefined,
    existingIds: Set<string>,
    fallback: string,
  ): DetailValue => {
    if (entries.length === 0) {
      return fallback;
    }

    return entries.map((entry) => {
      const id = getId(entry);
      return {
        label: getLabel(entry) ?? id ?? 'Unnamed',
        status: detailMode === 'current' ? 'neutral' : id && existingIds.has(id) ? 'existing' : 'new',
      };
    });
  };
  const getNeutralChip = (label: string | null | undefined): DetailValue => {
    return label ? [{label, status: 'neutral'}] : '-';
  };
  const getSessionDetailEntries = (sessions: any[], existingIds: Set<string>, fallback: string): DetailValue => {
    if (sessions.length === 0) {
      return fallback;
    }

    return sessions.map((session) => ({
      label: session?.label ?? session?.id ?? 'Unnamed',
      iconSlug: session?.icon?.slug ?? 'misc/browser',
      status: detailMode === 'current' ? 'neutral' as const : session?.id && existingIds.has(session.id) ? 'existing' as const : 'new' as const,
    }));
  };
  const getLayoutDetailEntries = (layouts: any[], existingIds: Set<string>, fallback: string): DetailValue => {
    if (layouts.length === 0) {
      return fallback;
    }

    return layouts.map((layout) => ({
      label: layout?.label ?? layout?.id ?? 'Unnamed',
      iconSlug: layout?.icon?.slug ?? 'neuzos_pang',
      status: detailMode === 'current' ? 'neutral' as const : layout?.id && existingIds.has(layout.id) ? 'existing' as const : 'new' as const,
    }));
  };
  const getDefaultLayoutDetailEntries = (layoutIds: string[], layouts: any[], existingIds: Set<string>, fallback: string): DetailValue => {
    if (layoutIds.length === 0) {
      return fallback;
    }

    return layoutIds.map((layoutId) => ({
      label: layouts.find((layout) => layout?.id === layoutId)?.label ?? neuzosConfig.layouts?.find((layout) => layout.id === layoutId)?.label ?? layoutId,
      iconSlug: getLayoutIconSlug(layoutId, layouts),
      status: detailMode === 'current' ? 'neutral' as const : existingIds.has(layoutId) ? 'existing' as const : 'new' as const,
    }));
  };
  const getDetailEntryClass = (status: DetailEntry['status']) => {
    if (status === 'critical') {
      return 'border-orange-400/50 bg-orange-400/10 text-orange-300';
    }
    if (status === 'changed') {
      return 'border-orange-300/80 bg-red-400/10 text-red-300';
    }
    if (status === 'existing-critical') {
      return 'border-orange-300/80 bg-red-400/10 text-red-300';
    }
    if (status === 'existing') {
      return 'border-red-400/40 bg-red-400/10 text-red-300';
    }
    if (status === 'new') {
      return 'border-green-400/40 bg-green-400/10 text-green-300';
    }
    return 'border-border bg-background text-foreground';
  };
  const getDetailPartClass = (status?: DetailStatus) => {
    if (status === 'new') {
      return 'text-green-300';
    }
    if (status === 'changed') {
      return 'rounded border border-orange-300/70 bg-orange-400/20 px-1 text-orange-200';
    }
    if (status === 'critical') {
      return 'text-orange-300';
    }
    return '';
  };
  const getProfileKeybindCount = (profiles: any[]) => {
    return profiles.reduce((total, profile) => total + (Array.isArray(profile?.keybinds) ? profile.keybinds.length : 0), 0);
  };
  const uniqueGlobalKeybindEvents = new Set([
    'ui.toggle_quest_log',
    'fullscreen_toggle',
    'close_focus_session',
    'toggle_keybinds',
    'layout_swap',
    'layout_cycle_forward',
    'layout_cycle_backward',
  ]);
  const isUniqueGlobalKeybindEvent = (event: string) => uniqueGlobalKeybindEvents.has(event);
  const getKeybindKey = (keybind: any) => String(keybind?.key ?? '').trim().toLowerCase();
  const getKeybindSignature = (keybind: any) => {
    const key = getKeybindKey(keybind);
    const event = String(keybind?.event ?? '').trim().toLowerCase();
    return key && event ? `${key}::${event}` : '';
  };
  const getProfileKeybindSignature = (profile: any, keybind: any) => `${profile?.id ?? ''}::${getKeybindSignature(keybind)}`;
  const getCriticalGlobalKeybindReason = (keybind: any, existingKeys: Set<string>, existingUniqueEvents: Set<string>) => {
    const key = getKeybindKey(keybind);
    const event = String(keybind?.event ?? '').trim();
    if (key && existingKeys.has(key)) {
      return 'duplicate-key';
    }
    if (isUniqueGlobalKeybindEvent(event) && existingUniqueEvents.has(event)) {
      return 'duplicate-system';
    }
    return null;
  };
  type CriticalGlobalKeybindReason = 'duplicate-key' | 'duplicate-system' | 'existing-unique-system';
  const getCriticalGlobalKeybindEntries = (keybinds: any[], existingKeybinds: any[]) => {
    const existingSignatures = new Set(existingKeybinds.map((bind) => getKeybindSignature(bind)).filter(Boolean));
    const seenKeys = new Set(existingKeybinds.map((bind) => getKeybindKey(bind)).filter(Boolean));
    const seenUniqueEvents = new Set(existingKeybinds.map((bind) => String(bind?.event ?? '').trim()).filter((event) => isUniqueGlobalKeybindEvent(event)));
    const criticalEntries: Array<{ keybind: any; reason: CriticalGlobalKeybindReason }> = [];

    for (const keybind of keybinds) {
      const signature = getKeybindSignature(keybind);
      if (!signature) {
        continue;
      }

      const event = String(keybind?.event ?? '').trim();
      if (existingSignatures.has(signature)) {
        if (isUniqueGlobalKeybindEvent(event) && seenUniqueEvents.has(event)) {
          criticalEntries.push({keybind, reason: 'existing-unique-system'});
        }
        continue;
      }

      const reason = getCriticalGlobalKeybindReason(keybind, seenKeys, seenUniqueEvents);
      if (reason) {
        criticalEntries.push({keybind, reason});
        continue;
      }

      existingSignatures.add(signature);
      const key = getKeybindKey(keybind);
      if (key) {
        seenKeys.add(key);
      }
      if (isUniqueGlobalKeybindEvent(event)) {
        seenUniqueEvents.add(event);
      }
    }

    return criticalEntries;
  };
  const getCriticalProfileKeybindEntries = (profiles: any[], existingProfiles: any[]) => {
    const existingProfileMap = new Map(existingProfiles.map((profile) => [profile?.id, profile]));
    const criticalEntries: Array<{ profile: any; keybind: any }> = [];

    for (const profile of profiles) {
      const existingProfile = existingProfileMap.get(profile?.id);
      const existingSignatures = new Set((existingProfile?.keybinds ?? []).map((bind: any) => getKeybindSignature(bind)).filter(Boolean));
      const seenKeys = new Set((existingProfile?.keybinds ?? []).map((bind: any) => getKeybindKey(bind)).filter(Boolean));
      for (const keybind of (Array.isArray(profile?.keybinds) ? profile.keybinds : [])) {
        const signature = getKeybindSignature(keybind);
        if (!signature || existingSignatures.has(signature)) {
          continue;
        }

        const key = getKeybindKey(keybind);
        if (key && seenKeys.has(key)) {
          criticalEntries.push({profile, keybind});
          continue;
        }

        existingSignatures.add(signature);
        if (key) {
          seenKeys.add(key);
        }
      }
    }

    return criticalEntries;
  };
  const formatKeybindEventLabel = (event: string) => {
    const eventLabels: Record<string, string> = {
      'ui.toggle_quest_log': 'Toggle Quest Log',
      fullscreen_toggle: 'Toggle Fullscreen',
      close_focus_session: 'Close Focus Session',
      toggle_keybinds: 'Enable / Disable Keybinds',
      layout_swap: 'Swap to Previous Layout',
      layout_switch: 'Switch to Layout',
      layout_cycle_forward: 'Cycle Layout Forward',
      layout_cycle_backward: 'Cycle Layout Backward',
      send_session_action: 'Send Action to Session',
      send_to_receiver: 'Send Key to Active Receiver',
      custom_event: 'Custom Event',
    };

    return eventLabels[event] ?? event
      .replace(/^ui\./, '')
      .split(/[_\-.]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };
  const formatKeybindChip = (keybind: any) => {
    const key = (String(keybind?.key ?? '').trim() || 'Unbound').toUpperCase();
    const event = formatKeybindEventLabel(String(keybind?.event ?? 'Unknown Event'));
    return {key, event, label: `${key} ${event}`};
  };
  const getComparableActionValue = (action: any, field: string) => {
    if (field === 'icon') {
      return action?.icon?.slug ?? '';
    }
    if (field === 'ingameKey') {
      return String(action?.ingameKey ?? '').trim().toLowerCase();
    }
    if (field === 'castTime' || field === 'cooldown') {
      return Number(action?.[field] ?? 0);
    }
    if (field === 'pinned') {
      return action?.pinned === true;
    }
    return String(action?.[field] ?? '').trim();
  };
  const getChangedActionFields = (action: any, existingAction: any | undefined) => {
    if (!existingAction) {
      return new Set<string>();
    }

    const fields = ['label', 'ingameKey', 'castTime', 'cooldown', 'cooldownCategory', 'pinned', 'icon'];
    return new Set(fields.filter((field) => getComparableActionValue(action, field) !== getComparableActionValue(existingAction, field)));
  };
  const formatActionChipParts = (action: any, changedFields = new Set<string>()): DetailPart[] => {
    const cooldownCategoryLabels: Record<string, string> = {
      food: 'Food Category',
      pill: 'Pill Category',
      refresher: 'Refresher Category',
      vital: 'Vital Category',
    };
    const parts = [
      {
        label: String(action?.label ?? 'Unnamed Action'),
        status: changedFields.has('label') || changedFields.has('icon') ? 'changed' as const : undefined,
      },
      {
        label: (String(action?.ingameKey ?? '').trim() || 'Unbound').toUpperCase(),
        status: changedFields.has('ingameKey') ? 'changed' as const : undefined,
      },
    ];
    const castTime = Number(action?.castTime ?? 0);
    const cooldown = Number(action?.cooldown ?? 0);
    const cooldownCategory = String(action?.cooldownCategory ?? '').trim();

    if (castTime > 0) {
      parts.push({
        label: `${castTime}s Cast Time`,
        status: changedFields.has('castTime') ? 'changed' as const : undefined,
      });
    }
    if (cooldown > 0) {
      parts.push({
        label: `${cooldown}s Cooldown`,
        status: changedFields.has('cooldown') ? 'changed' as const : undefined,
      });
    }
    if (cooldownCategory) {
      parts.push({
        label: cooldownCategoryLabels[cooldownCategory] ?? cooldownCategory,
        status: changedFields.has('cooldownCategory') ? 'changed' as const : undefined,
      });
    }
    if (action?.pinned === true) {
      parts.push({
        label: 'Pinned',
        status: changedFields.has('pinned') ? 'changed' as const : undefined,
      });
    }

    return parts;
  };
  const getSessionActionEntries = (group: any | undefined): DetailValue => {
    const actions = Array.isArray(group?.actions) ? group.actions : [];
    if (actions.length === 0) {
      return '-';
    }

    const existingGroup = (neuzosConfig.sessionActions ?? []).find((entry) => entry.sessionId === group?.sessionId);
    const existingActionMap = new Map((existingGroup?.actions ?? []).map((action) => [action.id, action]));
    return actions.map((action) => {
      const existingAction = existingActionMap.get(action?.id);
      const changedFields = getChangedActionFields(action, existingAction);
      const parts = formatActionChipParts(action, changedFields);
      const isExisting = action?.id && existingActionMap.has(action.id);
      const isChanged = isExisting && changedFields.size > 0;
      return {
        label: parts.map((part) => typeof part === 'string' ? part : part.label).join(' '),
        actionParts: parts,
        iconSlug: action?.icon?.slug,
        iconChanged: changedFields.has('icon'),
        status: detailMode === 'current' ? 'neutral' : isChanged ? 'changed' : isExisting ? 'existing' : 'new',
      };
    });
  };
  const getSessionActionGroupStatus = (group: any, existingGroup: any | undefined): DetailStatus => {
    if (detailMode === 'current') {
      return 'neutral';
    }
    if (!existingGroup) {
      return 'new';
    }

    const existingActionMap = new Map((existingGroup?.actions ?? []).map((action: any) => [action.id, action]));
    const hasNewOrChangedAction = (Array.isArray(group?.actions) ? group.actions : []).some((action: any) => {
      const existingAction = existingActionMap.get(action?.id);
      if (!existingAction) {
        return true;
      }
      return getChangedActionFields(action, existingAction).size > 0;
    });

    return hasNewOrChangedAction ? 'changed' : 'existing';
  };
  const getSessionZoomLevelEntries = (zoomLevels: Record<string, number>): DetailValue => {
    const entries = Object.entries(zoomLevels ?? {});
    if (entries.length === 0) {
      return '-';
    }

    return entries.map(([sessionId, zoomLevel]) => {
      const sessionLabel = getSessionLabel(sessionId);
      const zoomLabel = `${Math.round(Number(zoomLevel) * 100)}%`;
      return {
        label: `${sessionLabel} ${zoomLabel}`,
        actionParts: [sessionLabel, zoomLabel],
        iconSlug: getSessionIconSlug(sessionId),
        status: 'neutral' as const,
      };
    });
  };
  const getKeybindDetailEntries = (keybinds: any[], existingSignatures: Set<string>, criticalSignatures: Set<string>, fallback: string, existingUniqueSystemSignatures = new Set<string>()): DetailValue => {
    if (keybinds.length === 0) {
      return fallback;
    }

    return keybinds.map((keybind) => {
      const signature = getKeybindSignature(keybind);
      const chip = formatKeybindChip(keybind);
      return {
        label: chip.label,
        key: chip.key,
        event: chip.event,
        status: detailMode === 'current' ? 'neutral' : signature && criticalSignatures.has(signature) ? 'critical' : signature && existingUniqueSystemSignatures.has(signature) ? 'existing-critical' : signature && existingSignatures.has(signature) ? 'existing' : 'new',
      };
    });
  };
  const getProfileKeybindDetailEntries = (profiles: any[], existingProfileKeybinds: Map<string, Set<string>>, criticalProfileSignatures: Set<string>, fallback: string): DetailValue => {
    const entries = profiles.flatMap((profile) => {
      const profileName = profile?.name ?? profile?.label ?? profile?.id ?? 'Profile';
      const existingSignatures = existingProfileKeybinds.get(profile?.id) ?? new Set<string>();
      return (Array.isArray(profile?.keybinds) ? profile.keybinds : []).map((keybind: any) => {
        const signature = getKeybindSignature(keybind);
        const chip = formatKeybindChip(keybind);
        return {
          label: `${profileName}: ${chip.label}`,
          key: chip.key,
          event: chip.event,
          prefix: profileName,
          status: detailMode === 'current' ? 'neutral' : criticalProfileSignatures.has(getProfileKeybindSignature(profile, keybind)) ? 'critical' : signature && existingSignatures.has(signature) ? 'existing' : 'new',
        };
      });
    });

    return entries.length > 0 ? entries : fallback;
  };
  const getPreviewBreakdown = (preview: { category: ExportCategory; newCount?: number; conflictCount?: number; totalCount?: number }): PreviewBreakdown => {
    const payload = getPreviewPayload();
    if (!payload) {
      return {
        newLabel: String(preview.newCount ?? 0),
        existingLabel: String(preview.conflictCount ?? 0),
        criticalLabel: '-',
        changeLabel: '-',
        totalLabel: String(preview.totalCount ?? 0),
        newTotal: preview.newCount ?? 0,
        existingTotal: preview.conflictCount ?? 0,
        criticalTotal: 0,
        changeTotal: 0,
      };
    }

    if (preview.category === 'sessions') {
      const sessions = Array.isArray(payload.sessions) ? payload.sessions : [];
      const groups = getVisibleSessionGroups(Array.isArray(payload.sessionGroups) ? payload.sessionGroups : []);
      const existingSessionIds = new Set((neuzosConfig.sessions ?? []).map((session) => session.id));
      const existingGroupIds = new Set(getVisibleSessionGroups(neuzosConfig.sessionGroups ?? []).map((group) => group.id));
      const newSessions = sessions.filter((session) => !existingSessionIds.has(session?.id)).length;
      const existingSessions = sessions.filter((session) => existingSessionIds.has(session?.id)).length;
      const newGroups = groups.filter((group) => !existingGroupIds.has(group?.id)).length;
      const existingGroups = groups.filter((group) => existingGroupIds.has(group?.id)).length;

      return {
        newLabel: formatCountPieces([[newSessions, 'Session'], [newGroups, 'Group']]),
        existingLabel: formatCountPieces([[existingSessions, 'Session'], [existingGroups, 'Group']]),
        criticalLabel: '-',
        changeLabel: '-',
        totalLabel: formatCountPieces([[sessions.length, 'Session'], [groups.length, 'Group']]),
        newTotal: newSessions + newGroups,
        existingTotal: existingSessions + existingGroups,
        criticalTotal: 0,
        changeTotal: 0,
      };
    }

    if (preview.category === 'layouts') {
      const layouts = Array.isArray(payload.layouts) ? payload.layouts : [];
      const defaultLayouts = Array.isArray(payload.defaultLayouts) ? payload.defaultLayouts : [];
      const existingLayoutIds = new Set((neuzosConfig.layouts ?? []).map((layout) => layout.id));
      const existingDefaultLayoutIds = new Set(neuzosConfig.defaultLayouts ?? []);
      const newLayouts = layouts.filter((layout) => !existingLayoutIds.has(layout?.id)).length;
      const existingLayouts = layouts.filter((layout) => existingLayoutIds.has(layout?.id)).length;
      const newDefaultLayouts = defaultLayouts.filter((layoutId) => !existingDefaultLayoutIds.has(layoutId)).length;
      const existingDefaultLayouts = defaultLayouts.filter((layoutId) => existingDefaultLayoutIds.has(layoutId)).length;

      return {
        newLabel: formatCountPieces([[newLayouts, 'Layout'], [newDefaultLayouts, 'Default Layout']]),
        existingLabel: formatCountPieces([[existingLayouts, 'Layout'], [existingDefaultLayouts, 'Default Layout']]),
        criticalLabel: '-',
        changeLabel: '-',
        totalLabel: formatCountPieces([[layouts.length, 'Layout'], [defaultLayouts.length, 'Default Layout']]),
        newTotal: newLayouts + newDefaultLayouts,
        existingTotal: existingLayouts + existingDefaultLayouts,
        criticalTotal: 0,
        changeTotal: 0,
      };
    }

    if (preview.category === 'keybinds') {
      const keybinds = Array.isArray(payload.keyBinds) ? payload.keyBinds : [];
      const profiles = Array.isArray(payload.keyBindProfiles) ? payload.keyBindProfiles : [];
      const criticalKeybinds = selectedMode === 'merge' ? getCriticalGlobalKeybindEntries(keybinds, neuzosConfig.keyBinds ?? []) : [];
      const criticalProfileKeybinds = selectedMode === 'merge' ? getCriticalProfileKeybindEntries(profiles, neuzosConfig.keyBindProfiles ?? []) : [];
      const criticalTotal = criticalKeybinds.length + criticalProfileKeybinds.length;
      const existingKeybindSignatures = new Set((neuzosConfig.keyBinds ?? []).map((bind) => getKeybindSignature(bind)).filter(Boolean));
      const existingProfileIds = new Set((neuzosConfig.keyBindProfiles ?? []).map((profile) => profile.id));
      const existingProfileKeybinds = new Map((neuzosConfig.keyBindProfiles ?? []).map((profile) => [
        profile.id,
        new Set((profile.keybinds ?? []).map((bind) => getKeybindSignature(bind)).filter(Boolean)),
      ]));
      const getProfileBindCount = (matching: (profile: any) => boolean, existing: boolean) => profiles
        .filter(matching)
        .reduce((total, profile) => {
          const signatures = existingProfileKeybinds.get(profile?.id) ?? new Set<string>();
          return total + (Array.isArray(profile?.keybinds) ? profile.keybinds : []).filter((bind: any) => {
            const signature = getKeybindSignature(bind);
            return existing ? signatures.has(signature) : !signatures.has(signature);
          }).length;
        }, 0);
      const newKeybinds = keybinds.filter((bind) => !existingKeybindSignatures.has(getKeybindSignature(bind))).length
        + getProfileBindCount(() => true, false);
      const existingKeybinds = keybinds.filter((bind) => existingKeybindSignatures.has(getKeybindSignature(bind))).length
        + getProfileBindCount((profile) => existingProfileIds.has(profile?.id), true);
      const newProfiles = profiles.filter((profile) => !existingProfileIds.has(profile?.id)).length;
      const existingProfiles = profiles.filter((profile) => existingProfileIds.has(profile?.id)).length;
      const newCriticalKeybinds = criticalKeybinds.filter(({keybind}) => !existingKeybindSignatures.has(getKeybindSignature(keybind))).length;
      const mergeableNewKeybinds = selectedMode === 'merge' ? Math.max(newKeybinds - newCriticalKeybinds - criticalProfileKeybinds.length, 0) : newKeybinds;

      return {
        newLabel: formatCountPieces([[mergeableNewKeybinds, 'Keybind'], [newProfiles, 'Profile']]),
        existingLabel: formatCountPieces([[existingKeybinds, 'Keybind'], [existingProfiles, 'Profile']]),
        criticalLabel: formatCountPieces([[criticalTotal, 'Keybind']]),
        changeLabel: '-',
        totalLabel: formatCountPieces([[keybinds.length + getProfileKeybindCount(profiles), 'Keybind'], [profiles.length, 'Profile']]),
        newTotal: newKeybinds + newProfiles,
        existingTotal: existingKeybinds + existingProfiles,
        criticalTotal,
        changeTotal: 0,
      };
    }

    if (preview.category === 'session-actions') {
      const sessionActions = Array.isArray(payload.sessionActions) ? payload.sessionActions : [];
      const existingSessionActionMap = new Map((neuzosConfig.sessionActions ?? []).map((group) => [group.sessionId, group]));
      const newGroups = sessionActions.filter((group) => !existingSessionActionMap.has(group?.sessionId));
      const existingGroups = sessionActions.filter((group) => existingSessionActionMap.has(group?.sessionId));
      const countActions = (groups: any[]) => groups.reduce((total, group) => total + (Array.isArray(group?.actions) ? group.actions.length : 0), 0);
      const newActionsInExistingGroups = existingGroups.reduce((total, group) => {
        const existingGroup = existingSessionActionMap.get(group?.sessionId);
        const existingActionIds = new Set((existingGroup?.actions ?? []).map((action: any) => action?.id));
        return total + (Array.isArray(group?.actions) ? group.actions : []).filter((action: any) => action?.id && !existingActionIds.has(action.id)).length;
      }, 0);
      const existingActionsInExistingGroups = existingGroups.reduce((total, group) => {
        const existingGroup = existingSessionActionMap.get(group?.sessionId);
        const existingActionIds = new Set((existingGroup?.actions ?? []).map((action: any) => action?.id));
        return total + (Array.isArray(group?.actions) ? group.actions : []).filter((action: any) => action?.id && existingActionIds.has(action.id)).length;
      }, 0);
      const changedActionsInExistingGroups = existingGroups.reduce((total, group) => {
        const existingGroup = existingSessionActionMap.get(group?.sessionId);
        const existingActionMap = new Map((existingGroup?.actions ?? []).map((action: any) => [action.id, action]));
        return total + (Array.isArray(group?.actions) ? group.actions : []).filter((action: any) => {
          const existingAction = existingActionMap.get(action?.id);
          return existingAction && getChangedActionFields(action, existingAction).size > 0;
        }).length;
      }, 0);
      const newActionCount = countActions(newGroups) + newActionsInExistingGroups;
      const existingActionCount = existingActionsInExistingGroups;

      return {
        newLabel: formatCountPieces([[newGroups.length, 'Session'], [newActionCount, 'Action']]),
        existingLabel: formatCountPieces([[existingGroups.length, 'Session'], [existingActionCount, 'Action']]),
        criticalLabel: '-',
        changeLabel: formatCountPieces([[changedActionsInExistingGroups, 'Action Change']]),
        totalLabel: formatCountPieces([[sessionActions.length, 'Session'], [countActions(sessionActions), 'Action']]),
        newTotal: newGroups.length + newActionCount,
        existingTotal: existingGroups.length + existingActionCount,
        criticalTotal: 0,
        changeTotal: changedActionsInExistingGroups,
      };
    }

    return {
      newLabel: String(preview.newCount ?? 0),
      existingLabel: String(preview.conflictCount ?? 0),
      criticalLabel: '-',
      changeLabel: '-',
      totalLabel: String(preview.totalCount ?? 0),
      newTotal: preview.newCount ?? 0,
      existingTotal: preview.conflictCount ?? 0,
      criticalTotal: 0,
      changeTotal: 0,
    };
  };
  const getDetailPreviewRows = () => {
    if (!detailPreview) {
      return [
        ['New', '-'],
        ['Already Existing', '-'],
      ];
    }

    const breakdown = getPreviewBreakdown(detailPreview);
    const rows = [
      ['New', breakdown.newLabel],
    ];
    rows.push(['Already Existing', breakdown.existingLabel]);
    if (breakdown.changeTotal > 0) {
      rows.push(['Changes', breakdown.changeLabel]);
    }
    if (breakdown.criticalTotal > 0) {
      rows.push(['Critical Conflicts', breakdown.criticalLabel]);
    }
    return rows;
  };

  let previewResult: ValidImportResult | null = $state(null);
  let importedPayload: ValidImportResult['payload'] | null = $state(null);
  let detailCategory: ExportCategory | null = $state(null);
  let detailMode: DetailMode = $state('import');
  let selectedSessionActionId: string | null = $state(null);
  let openTooltipCategory: ExportCategory | null = $state(null);
  let selectedMode: 'replace' | 'merge' = $state('replace');
  let isExporting = $state(false);
  let isImporting = $state(false);
  let isApplying = $state(false);
  let categorySelection = $state(getDefaultCategorySelection());

  const selectedCategories = $derived(getSelectedCategories(categorySelection));
  const selectedCategoryCount = $derived(selectedCategories.length);
  const categoryPreview = $derived(importedPayload ? computeCategoryPreview(importedPayload, selectedCategories, neuzosConfig) : []);
  const listCategoryPreview = $derived(categoryPreview.filter((preview) => preview.category !== 'general-settings' && preview.category !== 'launch-settings'));
  const settingsCategoryPreview = $derived([
    ...categoryPreview.filter((preview) => preview.category === 'general-settings'),
    ...categoryPreview.filter((preview) => preview.category === 'launch-settings'),
  ]);
  const detailPreview = $derived(detailCategory ? categoryPreview.find((preview) => preview.category === detailCategory) : null);
  const detailCategoryLabel = $derived(detailCategory ? categoryById.get(detailCategory)?.label ?? detailCategory : '');
  const detailSections = $derived.by(() => {
    const payload = getDetailPayload();
    if (!payload || !detailCategory) {
      return [];
    }
    const importPreviewSections = detailMode === 'import'
      ? [{
          title: 'Import Preview',
          rows: getDetailPreviewRows(),
        }]
      : [];
    const actionChangeWarningSections = detailMode === 'import' && detailCategory === 'session-actions' && detailPreview && getPreviewBreakdown(detailPreview).changeTotal > 0
      ? [{
          title: 'Action Changes',
          rows: [
            selectedMode === 'replace'
              ? ['Replace Warning', 'The Backup contains changes to existing Session Actions! The current Settings will be replaced with the Values from the Backup.']
              : ['Merge Warning', 'Merge not possible! Current Settings for this Session Action will be kept.'],
          ],
        }]
      : [];

    if (detailCategory === 'general-settings') {
      const titleBarButtons = payload.titleBarButtons ?? {};
      const fullscreen = payload.fullscreen ?? {};
      const windowConfig = payload.window ?? {};
      return [
        {
          title: 'Settings',
          rows: [
            ['Auto Save', formatValue(payload.autoSaveSettings ?? false)],
            ['Clear Cache on Startup', formatValue(payload.autoDeleteAllCachesOnStartup ?? false)],
          ],
        },
        {
          title: 'Window Sizes',
          rows: [
            ['Main Window', windowConfig?.main ? `${windowConfig.main.width ?? '-'} x ${windowConfig.main.height ?? '-'}, Maximized: ${formatValue(windowConfig.main.maximized)}` : '-'],
            ['Settings Window', windowConfig?.settings ? `${windowConfig.settings.width ?? '-'} x ${windowConfig.settings.height ?? '-'}, Maximized: ${formatValue(windowConfig.settings.maximized)}` : '-'],
            ['Session Window', windowConfig?.session ? `${windowConfig.session.width ?? '-'} x ${windowConfig.session.height ?? '-'}, Maximized: ${formatValue(windowConfig.session.maximized)}` : '-'],
          ],
        },
        {
          title: 'Main Bar Buttons',
          rows: Object.entries(titleBarButtons).map(([key, value]) => [key, formatValue(value)]),
        },
        {
          title: 'Fullscreen Behavior',
          rows: Object.entries(fullscreen).map(([key, value]) => [key, formatValue(value)]),
        },
      ];
    }

    if (detailCategory === 'sessions') {
      const sessions = getImportedSessions();
      const groups = getVisibleSessionGroups(Array.isArray(payload.sessionGroups) ? payload.sessionGroups : []);
      const zoomLevels = payload.sessionZoomLevels ?? {};
      const existingSessionIds = new Set((neuzosConfig.sessions ?? []).map((session) => session.id));
      const existingGroupIds = new Set(getVisibleSessionGroups(neuzosConfig.sessionGroups ?? []).map((group) => group.id));
      return [
        ...importPreviewSections,
        {
          title: 'Sessions',
          rows: [
            ['Count', countOrDash(sessions.length, 'Session')],
            ['Names', getSessionDetailEntries(sessions, existingSessionIds, '-')],
          ],
        },
        {
          title: 'Groups and Options',
          rows: [
            ['Groups', countOrDash(groups.length, 'Group')],
            ['Group Names', getDetailEntries(groups, (group) => group?.id, (group) => group?.label ?? group?.id, existingGroupIds, '-')],
            ['Session Zoom Levels', getSessionZoomLevelEntries(zoomLevels)],
          ],
        },
      ];
    }

    if (detailCategory === 'layouts') {
      const layouts = getImportedLayouts();
      const defaultLayoutIds = Array.isArray(payload.defaultLayouts) ? payload.defaultLayouts : [];
      const existingLayoutIds = new Set((neuzosConfig.layouts ?? []).map((layout) => layout.id));
      const existingDefaultLayoutIds = new Set(neuzosConfig.defaultLayouts ?? []);
      return [
        ...importPreviewSections,
        {
          title: 'Layouts',
          rows: [
            ['Count', countOrDash(layouts.length, 'Layout')],
            ['Names', getLayoutDetailEntries(layouts, existingLayoutIds, '-')],
          ],
        },
        {
          title: 'Default Layouts',
          rows: [
            ['Count', countOrDash(defaultLayoutIds.length, 'Default Layout')],
            ['Names', getDefaultLayoutDetailEntries(defaultLayoutIds, layouts, existingDefaultLayoutIds, '-')],
          ],
        },
      ];
    }

    if (detailCategory === 'keybinds') {
      const keybinds = Array.isArray(payload.keyBinds) ? payload.keyBinds : [];
      const profiles = Array.isArray(payload.keyBindProfiles) ? payload.keyBindProfiles : [];
      const profileKeybindCount = profiles.reduce((total, profile) => total + (profile?.keybinds?.length ?? 0), 0);
      const activeProfile = profiles.find((profile) => profile?.id === payload.activeKeyBindProfileId);
      const criticalKeybinds = detailMode === 'import' && selectedMode === 'merge' ? getCriticalGlobalKeybindEntries(keybinds, neuzosConfig.keyBinds ?? []) : [];
      const criticalProfileKeybinds = detailMode === 'import' && selectedMode === 'merge' ? getCriticalProfileKeybindEntries(profiles, neuzosConfig.keyBindProfiles ?? []) : [];
      const existingUniqueSystemSignatures = new Set(criticalKeybinds
        .filter((entry) => entry.reason === 'existing-unique-system')
        .map(({keybind}) => getKeybindSignature(keybind))
        .filter(Boolean));
      const criticalSignatures = new Set(criticalKeybinds
        .filter((entry) => entry.reason !== 'existing-unique-system')
        .map(({keybind}) => getKeybindSignature(keybind))
        .filter(Boolean));
      const criticalProfileSignatures = new Set(criticalProfileKeybinds.map(({profile, keybind}) => getProfileKeybindSignature(profile, keybind)).filter(Boolean));
      const duplicateKeyConflicts = criticalKeybinds.filter((entry) => entry.reason === 'duplicate-key').map(({keybind}) => {
        const chip = formatKeybindChip(keybind);
        return {label: chip.label, key: chip.key, event: chip.event, status: 'critical' as const};
      });
      const duplicateSystemConflicts = criticalKeybinds.filter((entry) => entry.reason === 'duplicate-system').map(({keybind}) => {
        const chip = formatKeybindChip(keybind);
        return {label: chip.label, key: chip.key, event: chip.event, status: 'critical' as const};
      });
      const existingUniqueSystemConflicts = criticalKeybinds.filter((entry) => entry.reason === 'existing-unique-system').map(({keybind}) => {
        const chip = formatKeybindChip(keybind);
        return {label: chip.label, key: chip.key, event: chip.event, status: 'existing-critical' as const};
      });
      const duplicateProfileKeyConflicts = criticalProfileKeybinds.map(({profile, keybind}) => {
        const chip = formatKeybindChip(keybind);
        return {
          label: `${profile?.name ?? profile?.label ?? profile?.id ?? 'Profile'}: ${chip.label}`,
          key: chip.key,
          event: chip.event,
          prefix: profile?.name ?? profile?.label ?? profile?.id ?? 'Profile',
          status: 'critical' as const,
        };
      });
      const duplicateKeyCount = duplicateKeyConflicts.length + duplicateProfileKeyConflicts.length;
      const duplicateSystemCount = duplicateSystemConflicts.length + existingUniqueSystemConflicts.length;
      const mergeWarning = duplicateKeyCount > 0 && duplicateSystemCount > 0
        ? 'Merging not possible! You cannot assign the Same Key to multiple Keybinds and you cannot assign a System Keybind twice. These Keybinds will not be merged.'
        : duplicateKeyCount > 0
          ? 'Merging not possible! You cannot assign the Same Key to multiple Keybinds. This Keybind will not be merged.'
          : duplicateSystemCount > 0
            ? 'Merging not possible! You cannot assign a System Keybind twice. This Keybind will not be merged.'
            : '';
      const criticalConflictRows = [
        ...(duplicateKeyConflicts.length > 0 ? [['Duplicate Keys', duplicateKeyConflicts] as const] : []),
        ...(duplicateProfileKeyConflicts.length > 0 ? [['Duplicate Profile Keys', duplicateProfileKeyConflicts] as const] : []),
        ...(duplicateSystemConflicts.length > 0 ? [['Duplicate System Keybinds', duplicateSystemConflicts] as const] : []),
        ...(existingUniqueSystemConflicts.length > 0 ? [['Existing System Keybinds', existingUniqueSystemConflicts] as const] : []),
        ...(mergeWarning ? [['Merge Warning', mergeWarning] as const] : []),
      ];
      const existingKeybindSignatures = new Set((neuzosConfig.keyBinds ?? []).map((bind) => getKeybindSignature(bind)).filter(Boolean));
      const existingProfileIds = new Set((neuzosConfig.keyBindProfiles ?? []).map((profile) => profile.id));
      const existingProfileKeybinds = new Map((neuzosConfig.keyBindProfiles ?? []).map((profile) => [
        profile.id,
        new Set((profile.keybinds ?? []).map((bind) => getKeybindSignature(bind)).filter(Boolean)),
      ]));
      return [
        ...importPreviewSections,
        ...(detailMode === 'import' && selectedMode === 'merge' && criticalConflictRows.length > 0 ? [{
          title: 'Critical Conflicts',
          rows: criticalConflictRows,
        }] : []),
        {
          title: 'Keybinds',
          rows: [
            ['Global / System Keybinds', countOrDash(keybinds.length, 'Keybind')],
            ['Keybinds', getKeybindDetailEntries(keybinds, existingKeybindSignatures, criticalSignatures, '-', existingUniqueSystemSignatures)],
            ['Profile Keybinds', countOrDash(profileKeybindCount, 'Keybind')],
            ['Keybinds', getProfileKeybindDetailEntries(profiles, existingProfileKeybinds, criticalProfileSignatures, '-')],
          ],
        },
        {
          title: 'Profiles',
          rows: [
            ['Profiles', countOrDash(profiles.length, 'Profile')],
            ['Profile Names', getDetailEntries(profiles, (profile) => profile?.id, (profile) => profile?.name ?? profile?.label ?? profile?.id, existingProfileIds, '-')],
            ['Active Profile', getNeutralChip(activeProfile?.name ?? activeProfile?.label ?? payload.activeKeyBindProfileId)],
          ],
        },
      ];
    }

    if (detailCategory === 'session-actions') {
      const sessionActions = getImportedSessionActions();
      const actionCount = sessionActions.reduce((total, group) => total + (group?.actions?.length ?? 0), 0);
      const existingSessionActionMap = new Map((neuzosConfig.sessionActions ?? []).map((group) => [group.sessionId, group]));
      const selectedSessionActions = sessionActions.find((group) => group?.sessionId === selectedSessionActionId);
      const sessionRows: Array<[string, DetailValue]> = [
        ['Sessions', countOrDash(sessionActions.length, 'Session')],
        ['Actions', countOrDash(actionCount, 'Action')],
      ];

      if (sessionActions.length > 0) {
        sessionRows.push([
          'Session Names',
          sessionActions.map((group) => ({
            label: getSessionLabel(group?.sessionId),
            iconSlug: getSessionIconSlug(group?.sessionId),
            status: getSessionActionGroupStatus(group, existingSessionActionMap.get(group?.sessionId)),
            sessionActionId: group?.sessionId,
          })),
        ]);
        sessionRows.push([
          'Session Actions',
          selectedSessionActions
            ? getSessionActionEntries(selectedSessionActions)
            : 'Select a Session to Show its Session Actions here.',
        ]);
      }

      return [
        ...importPreviewSections,
        ...actionChangeWarningSections,
        {
          title: 'Session Actions',
          rows: sessionRows,
        },
      ];
    }

    if (detailCategory === 'launch-settings') {
      const commandLineSwitches = payload.chromium?.commandLineSwitches ?? [];
      return [
        {
          title: 'Launch Settings',
          rows: [
            ['Default Launch Mode', formatValue(payload.defaultLaunchMode)],
            ['Custom User Agent', payload.userAgent ? payload.userAgent : '-'],
            ['Command Line Switches', commandLineSwitches.length > 0 ? commandLineSwitches.join(', ') : '-'],
          ],
        },
      ];
    }

    return [];
  });

  const setCategorySelection = (category: ExportCategory, checked: boolean) => {
    if (!categoryById.get(category)?.enabled) {
      return;
    }

    categorySelection[category] = checked;
  };

  const exportConfig = async () => {
    if (isExporting || selectedCategoryCount === 0) return;

    isExporting = true;
    try {
      const payload = buildExportPayload(neuzosConfig, selectedCategories);
      const sanitized = sanitizeConfigForExport(payload);
      const result = await neuzosBridge.backup.export(sanitized.payload);
      if (result.success) {
        toast.success(`Backup exported successfully to ${result.filePath}`);
        if (sanitized.sanitized) {
          toast.warning('Some unsafe values were removed from the Backup.');
        }
      } else {
        toast.error(result.error ?? 'Backup Export failed.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Backup Export failed.');
    } finally {
      isExporting = false;
    }
  };

  const importConfig = async () => {
    if (isImporting) return;

    isImporting = true;
    try {
      const result = await neuzosBridge.backup.import();
      if (result.valid === false) {
        previewResult = null;
        importedPayload = null;
        toast.error(result.error);
        return;
      }

      previewResult = result;
      importedPayload = result.payload;
      selectedMode = 'replace';
      toast.success('Import Preview loaded.');
    } catch (error) {
      previewResult = null;
      importedPayload = null;
      toast.error(error instanceof Error ? error.message : 'Backup Import failed.');
    } finally {
      isImporting = false;
    }
  };

  const applyImport = async (mode: 'replace' | 'merge') => {
    if (!previewResult || !importedPayload || isApplying || selectedCategoryCount === 0) return;

    isApplying = true;
    try {
      const result = await neuzosBridge.backup.applyImport($state.snapshot(importedPayload), mode, selectedCategories);
      if (!result.success) {
        toast.error(result.error ?? 'Failed to apply Backup.');
        return;
      }

      await loadConfig?.();
      previewResult = null;
      importedPayload = null;

      if (mode === 'merge') {
        toast.success('Backup merged successfully.');
      } else {
        toast.success('Backup applied successfully.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to apply Backup.');
    } finally {
      isApplying = false;
    }
  };

  const openConfigFolder = async () => {
    const opened = await neuzosBridge.backup.openConfigFolder();
    if (!opened) {
      toast.error('Failed to Open Config Folder.');
    }
  };
  const openCategoryDetails = (category: ExportCategory) => {
    openTooltipCategory = null;
    selectedSessionActionId = null;
    detailMode = 'import';
    detailCategory = category;
  };
  const openCurrentCategoryDetails = (event: MouseEvent, category: ExportCategory) => {
    event.preventDefault();
    event.stopPropagation();
    openTooltipCategory = null;
    selectedSessionActionId = null;
    detailMode = 'current';
    detailCategory = category;
  };
  const openCategoryDetailsFromKey = (event: KeyboardEvent, category: ExportCategory) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    openCategoryDetails(category);
  };
</script>

<Card.Root class="h-full overflow-y-auto">
  <Card.Header>
    <div class="flex items-start justify-between gap-3">
      <div>
        <Card.Title class="text-lg font-semibold">Backup</Card.Title>
        <Card.Description>
          Select the Categories you want to Export or Import.
        </Card.Description>
      </div>
      <Button variant="outline" size="sm" onclick={openConfigFolder} class="shrink-0 gap-2">
        <SquareArrowOutUpRight class="h-4 w-4"/>
        Open Config Folder
      </Button>
    </div>
  </Card.Header>
  <Card.Content class="flex flex-col gap-4">
    <div class="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="font-medium">Export / Import Categories</h3>
          <p class="text-sm text-muted-foreground">
            The selected Categories are used for both Export and Import.
          </p>
        </div>
        <div class="text-right text-xs text-muted-foreground">
          <div>{pluralize(selectedCategoryCount, 'Category', 'Categories')} Selected</div>
        </div>
      </div>

      <div class="grid gap-3">
        {#each exportCategories as category}
          <label class={`flex items-start gap-3 rounded-md border p-3 transition-colors ${category.enabled ? 'bg-background hover:border-primary/40' : 'bg-muted/40 opacity-70'}`}>
            <input
              type="checkbox"
              class="mt-1 h-4 w-4 rounded border-border text-primary"
              checked={categorySelection[category.id]}
              disabled={!category.enabled}
              onchange={(event) => setCategorySelection(category.id, (event.currentTarget as HTMLInputElement).checked)}
            />
            <div class="min-w-0 flex-1 space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium">{category.label}</span>
                {#if !category.enabled}
                  <span class="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Disabled</span>
                {/if}
              </div>
              <p class="text-sm text-muted-foreground">{category.description}</p>
            </div>
            <div class="flex self-stretch shrink-0 flex-col items-end justify-between gap-2 text-right text-xs text-muted-foreground">
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger class="cursor-help">
                    <div>{getCategoryCountLabel(neuzosConfig, category.id)}</div>
                  </Tooltip.Trigger>
                  <Tooltip.Content class="max-w-xs">
                    <div class="space-y-1">
                      <div class="font-medium">Config Values</div>
                      <div class="font-mono text-xs">
                        {(categoryConfigFields[category.id] ?? []).join(', ')}
                      </div>
                    </div>
                  </Tooltip.Content>
                </Tooltip.Root>
              </Tooltip.Provider>
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="h-7 gap-1.5 px-2"
                title="View Details"
                onclick={(event) => openCurrentCategoryDetails(event, category.id)}
                disabled={!category.enabled}
              >
                <Eye class="h-3.5 w-3.5"/>
                View Details
              </Button>
            </div>
          </label>
        {/each}
      </div>
    </div>

    <div class="flex flex-wrap gap-3">
      <Button onclick={exportConfig} disabled={isExporting || selectedCategoryCount === 0}>
        {isExporting ? 'Exporting...' : 'Export Config'}
      </Button>
      <Button variant="outline" onclick={importConfig} disabled={isImporting}>
        {isImporting ? 'Importing...' : 'Import Config'}
      </Button>
    </div>

    {#if previewResult}
      <div class="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 class="font-medium">Import Preview</h3>
            <p class="text-sm text-muted-foreground">
              Exported {formatBackupDate(previewResult.payload.exportedAt)}
            </p>
          </div>
          <div class="text-right text-xs text-muted-foreground">
            <div>{pluralize(selectedCategoryCount, 'Category', 'Categories')} Selected</div>
          </div>
        </div>

        {#if previewResult.warnings.length > 0}
          <div class="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <div class="font-medium text-amber-100">Warnings</div>
            <ul class="mt-2 list-disc space-y-1 pl-5 text-amber-50/90">
              {#each previewResult.warnings as warning}
                <li>{warning}</li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if selectedCategoryCount === 0}
          <div class="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
            Select at least one Category to preview Import Data.
          </div>
        {:else}
          <div class="grid gap-3 lg:grid-cols-2">
            {#each listCategoryPreview as preview}
              <div
                role="button"
                tabindex="0"
                class={`h-full cursor-pointer rounded-md border bg-background p-3 text-left ${preview.foundInFile ? '' : 'opacity-70'}`}
                onclick={() => openCategoryDetails(preview.category)}
                onkeydown={(event) => openCategoryDetailsFromKey(event, preview.category)}
              >
                <div class="flex items-center justify-between gap-2">
                  <Tooltip.Provider>
                    <Tooltip.Root
                      open={detailCategory === null && openTooltipCategory === preview.category}
                      onOpenChange={(open) => { openTooltipCategory = open && detailCategory === null ? preview.category : null; }}
                    >
                      <Tooltip.Trigger class="border-0 bg-transparent p-0 text-left">
                        <div class="cursor-help">
                          <div class="font-medium">{categoryById.get(preview.category)?.label ?? preview.category}</div>
                          <div class="text-xs text-muted-foreground">{categoryById.get(preview.category)?.description}</div>
                        </div>
                      </Tooltip.Trigger>
                      <Tooltip.Content class="max-w-xs">
                        <div class="space-y-1">
                          <div class="font-medium">Imported Config Values</div>
                          <div class="font-mono text-xs">
                            {(categoryConfigFields[preview.category] ?? []).join(', ')}
                          </div>
                        </div>
                      </Tooltip.Content>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                  {#if !preview.foundInFile}
                    <span class="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Not found in Backup</span>
                  {:else if preview.type === 'object'}
                    <span class="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary">Full Replace</span>
                  {:else if selectedMode === 'merge'}
                    <span class="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Merge</span>
                  {:else}
                    <span class="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Replace</span>
                  {/if}
                </div>

                {#if preview.type === 'list' && preview.foundInFile}
                  {@const breakdown = getPreviewBreakdown(preview)}
                  <div class="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div class="rounded border border-border/70 bg-muted/30 p-2">
                      <div class="text-muted-foreground">New</div>
                      <div class="flex flex-wrap items-center gap-1.5 font-semibold">
                        {#if breakdown.newLabel !== '-' || (breakdown.criticalTotal === 0 && breakdown.changeTotal === 0)}
                          <span class={breakdown.newLabel !== '-' ? 'text-green-400' : ''}>{breakdown.newLabel}</span>
                        {/if}
                      </div>
                    </div>
                    <div class="rounded border border-border/70 bg-muted/30 p-2">
                      <div class="text-muted-foreground">Already Existing</div>
                      <div class={`font-semibold ${breakdown.existingTotal > 0 ? 'text-red-400' : ''}`}>{breakdown.existingLabel}</div>
                    </div>
                    <div class="rounded border border-border/70 bg-muted/30 p-2">
                      <div class="text-muted-foreground">Total</div>
                      <div class="font-semibold">{breakdown.totalLabel}</div>
                    </div>
                    {#if breakdown.criticalTotal > 0}
                      <div class="col-span-3 rounded border border-orange-400/40 bg-orange-400/10 p-2">
                        <div class="inline-flex items-center gap-1.5 font-semibold text-orange-300">
                          <TriangleAlert class="h-3.5 w-3.5"/>
                          <span>Critical Conflicts: {breakdown.criticalLabel}</span>
                        </div>
                      </div>
                    {/if}
                    {#if breakdown.changeTotal > 0}
                      <div class="col-span-3 rounded border border-orange-400/40 bg-orange-400/10 p-2">
                        <div class="inline-flex items-center gap-1.5 font-semibold text-orange-300">
                          <TriangleAlert class="h-3.5 w-3.5"/>
                          <span>Action Changes: {pluralize(breakdown.changeTotal, 'Action')}</span>
                        </div>
                      </div>
                    {/if}
                  </div>
                {/if}

                {#if preview.type === 'object' && preview.foundInFile}
                  <div class="mt-3 text-xs text-muted-foreground space-y-1">
                    <p>This Category will fully replace the existing Data.</p>
                    <p>{pluralize(preview.totalCount ?? 0, 'Data Group')} found in the Backup.</p>
                    {#if preview.skippedSessionIds?.length}
                      <p class="text-amber-300">
                        {pluralize(preview.skippedSessionIds.length, 'Session ID')} will be skipped: {preview.skippedSessionIds.join(', ')}
                      </p>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
          {#if settingsCategoryPreview.length > 0}
            <div class="mt-3 grid gap-3 lg:grid-cols-2">
              {#each settingsCategoryPreview as preview}
                <div
                  role="button"
                  tabindex="0"
                  class={`h-full cursor-pointer rounded-md border bg-background p-3 text-left ${preview.foundInFile ? '' : 'opacity-70'}`}
                  onclick={() => openCategoryDetails(preview.category)}
                  onkeydown={(event) => openCategoryDetailsFromKey(event, preview.category)}
                >
                  <div class="flex items-center justify-between gap-2">
                    <Tooltip.Provider>
                      <Tooltip.Root
                        open={detailCategory === null && openTooltipCategory === preview.category}
                        onOpenChange={(open) => { openTooltipCategory = open && detailCategory === null ? preview.category : null; }}
                      >
                        <Tooltip.Trigger class="border-0 bg-transparent p-0 text-left">
                          <div class="cursor-help">
                            <div class="font-medium">{categoryById.get(preview.category)?.label ?? preview.category}</div>
                            <div class="text-xs text-muted-foreground">{categoryById.get(preview.category)?.description}</div>
                          </div>
                        </Tooltip.Trigger>
                        <Tooltip.Content class="max-w-xs">
                          <div class="space-y-1">
                            <div class="font-medium">Imported Config Values</div>
                            <div class="font-mono text-xs">
                              {(categoryConfigFields[preview.category] ?? []).join(', ')}
                            </div>
                          </div>
                        </Tooltip.Content>
                      </Tooltip.Root>
                    </Tooltip.Provider>
                    {#if !preview.foundInFile}
                      <span class="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Not found in Backup</span>
                    {:else if preview.type === 'object'}
                      <span class="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary">Full Replace</span>
                    {:else if selectedMode === 'merge'}
                      <span class="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Merge</span>
                    {:else}
                      <span class="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Replace</span>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        {/if}

        <div class="space-y-1 text-xs text-muted-foreground rounded-md border border-border/50 bg-muted/20 p-3">
          <p><strong class="text-foreground">Replace</strong> - Overwrites selected Categories with the Contents of the Backup.</p>
          <p><strong class="text-foreground">Merge</strong> - Keeps existing List Items and only adds Entries that do not already exist.</p>
          <p><strong class="text-foreground">Full Replace</strong> - General Settings and Launch Settings always behave as Full Replace.</p>
          <p>You can Click on each Category to view a Summary of the imported Backup Values.</p>
        </div>

        <div class="flex flex-wrap gap-2">
          <Button
            variant={selectedMode === 'replace' ? 'default' : 'outline'}
            onclick={() => selectedMode = 'replace'}
            disabled={isApplying}
          >
            Replace
          </Button>
          <Button
            variant={selectedMode === 'merge' ? 'default' : 'outline'}
            onclick={() => selectedMode = 'merge'}
            disabled={isApplying}
          >
            Merge
          </Button>
          <div class="flex-1"></div>
          <Button onclick={() => applyImport(selectedMode)} disabled={isApplying || selectedCategoryCount === 0} class="min-w-28">
            {isApplying ? 'Applying...' : 'Apply'}
          </Button>
        </div>
      </div>
    {/if}
  </Card.Content>
</Card.Root>

<Dialog.Root open={detailCategory !== null} onOpenChange={(open) => { if (!open) { detailCategory = null; selectedSessionActionId = null; openTooltipCategory = null; detailMode = 'import'; } }}>
  <Dialog.Content class="max-h-[85vh] overflow-hidden sm:max-w-2xl">
    <Dialog.Header>
      <Dialog.Title>{detailCategoryLabel} Details</Dialog.Title>
      <Dialog.Description>
        {detailMode === 'current' ? 'Readable Summary of the Backup Values for this Category.' : 'Readable Summary of the imported Backup Values for this Category.'}
      </Dialog.Description>
    </Dialog.Header>

    <div class="max-h-[60vh] overflow-y-auto pr-1 space-y-3">
      {#each detailSections as section}
        <div class="rounded-md border border-border bg-muted/20 p-3">
          <div class="mb-2 inline-flex items-center gap-1.5 text-sm font-medium">
            {#if section.title === 'Critical Conflicts' || section.title === 'Action Changes'}
              <TriangleAlert class="h-4 w-4 text-orange-300"/>
            {/if}
            <span>{section.title}</span>
          </div>
          {#if section.rows.length > 0}
            <div class="space-y-2">
              {#each section.rows as row}
                <div class="grid gap-2 text-sm sm:grid-cols-[180px_1fr]">
                  <div class="inline-flex items-start gap-1.5 text-muted-foreground">
                    <span>{row[0]}</span>
                  </div>
                  {#if Array.isArray(row[1])}
                    <div class={row[0] === 'Session Actions' ? 'flex flex-col items-start gap-1.5 rounded-md border border-border/70 bg-background/40 p-2' : 'flex flex-wrap gap-1.5'}>
                      {#each row[1] as entry}
                        {#if entry.sessionActionId}
                          <button
                            type="button"
                            class={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium transition-colors hover:border-primary/60 ${selectedSessionActionId === entry.sessionActionId ? 'ring-1 ring-primary/70' : ''} ${getDetailEntryClass(entry.status)}`}
                            onclick={() => { selectedSessionActionId = selectedSessionActionId === entry.sessionActionId ? null : entry.sessionActionId ?? null; }}
                          >
                            {#if entry.iconSlug}
                              <span class={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded ${entry.iconChanged ? 'border border-orange-300/80 bg-orange-400/10' : ''}`}>
                                <img class="h-3.5 w-3.5 shrink-0" src={`icons/${entry.iconSlug}.png`} alt=""/>
                              </span>
                            {/if}
                            {entry.label}
                          </button>
                        {:else}
                          <span class={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium ${getDetailEntryClass(entry.status)}`}>
                          {#if entry.prefix}
                            <span>{entry.prefix}</span>
                            <span class="h-3.5 border-l border-current/30"></span>
                          {/if}
                          {#if entry.iconSlug}
                            <span class={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded ${entry.iconChanged ? 'border border-orange-300/80 bg-orange-400/10' : ''}`}>
                              <img class="h-3.5 w-3.5 shrink-0" src={`icons/${entry.iconSlug}.png`} alt=""/>
                            </span>
                          {/if}
                          {#if entry.actionParts}
                            {#each entry.actionParts as part, index}
                              {#if index > 0}
                                <span class="h-3.5 border-l border-current/30"></span>
                              {/if}
                              {@const partLabel = typeof part === 'string' ? part : part.label}
                              {@const partStatus = typeof part === 'string' ? undefined : part.status}
                              <span class={`${index === 1 ? 'font-mono' : ''} ${getDetailPartClass(partStatus)}`}>{partLabel}</span>
                            {/each}
                          {:else if entry.key && entry.event}
                            <span class="font-mono">{entry.key}</span>
                            <span class="h-3.5 border-l border-current/30"></span>
                            <span>{entry.event}</span>
                          {:else}
                            {entry.label}
                          {/if}
                          </span>
                        {/if}
                      {/each}
                    </div>
                  {:else}
                    {#if row[0] === 'Session Actions' && row[1] !== '-'}
                      <div class="rounded-md border border-dashed border-border bg-background/50 px-3 py-2 text-sm text-muted-foreground">
                        {row[1]}
                      </div>
                    {:else}
                      <div class={`break-words whitespace-pre-line font-medium ${getDetailValueClass(row[0], row[1])}`}>{row[1]}</div>
                    {/if}
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <div class="text-sm text-muted-foreground">-</div>
          {/if}
        </div>
      {/each}
    </div>

    <Dialog.Footer>
      <Dialog.Close>
        <Button variant="outline">Close</Button>
      </Dialog.Close>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
