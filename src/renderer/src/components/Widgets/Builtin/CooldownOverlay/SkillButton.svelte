<script lang="ts">
  import { getCooldownsContext } from '$lib/contexts/cooldownsContext';
  import { skillIconUrl } from '$lib/flyff/jobs';
  import { Swords } from '@lucide/svelte';

  interface Props {
    sessionId: string;
    skillId: string;       // numeric ID as string, used as cooldown key
    icon: string;          // filename, e.g. 'wndlbacksteb.png'
    name: string;
    ingameKey: string;
    castTime: number;
    cooldown: number;
    onTrigger?: () => void;
  }

  let { sessionId, skillId, icon, name, ingameKey, castTime, cooldown, onTrigger }: Props = $props();

  const cooldownsContext = getCooldownsContext();

  let cooldownTrigger = $state(0);
  $effect(() => {
    const unsub = cooldownsContext.subscribe(() => { cooldownTrigger++; });
    return unsub;
  });

  function getState() {
    cooldownTrigger;
    return cooldownsContext.getActionState(sessionId, skillId);
  }

  function canUse() {
    cooldownTrigger;
    return cooldownsContext.canUseAction(sessionId, skillId);
  }

  function formatTime(endTime: number): string {
    const remaining = Math.max(0, endTime - Date.now());
    const totalSeconds = Math.ceil(remaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    return `${seconds}s`;
  }

  const state = $derived(getState());
  const isOnCooldown = $derived(state.cooldownProgress > 0 || state.isCasting);
  const cooldownAngle = $derived((1 - state.cooldownProgress) * 360);
  const isReady = $derived(!isOnCooldown);
</script>

<button
  class="relative w-12 h-12 p-0 rounded-md border-2 overflow-hidden transition-all cursor-pointer
    {isReady
      ? 'border-green-400/70 shadow-lg shadow-green-400/50 animate-pulse'
      : 'border-border hover:border-primary'}
  "
  onclick={() => { if (canUse()) onTrigger?.(); }}
  disabled={isOnCooldown}
  title="{name}\nKey: {ingameKey || 'Not set'}\nCast: {castTime}s | CD: {cooldown}s"
  style="background-color: hsl(var(--background));"
>
  {#if icon}
    <img
      src={skillIconUrl(icon)}
      alt={name}
      class="w-full h-full object-contain p-1 {state.isCasting ? 'brightness-150' : ''}"
      onerror={(e) => {
        const img = e.currentTarget as HTMLImageElement;
        img.style.display = 'none';
        img.nextElementSibling?.classList.remove('hidden');
      }}
    />
    <div class="hidden absolute inset-0 flex items-center justify-center pointer-events-none">
      <Swords class="h-8 w-8 text-muted-foreground" />
    </div>
  {:else}
    <div class="w-full h-full flex items-center justify-center">
      <Swords class="h-8 w-8 {state.isCasting ? 'brightness-150' : ''}" />
    </div>
  {/if}

  <!-- Radial cooldown sweep -->
  {#if state.cooldownProgress > 0}
    <div class="absolute inset-0 pointer-events-none">
      <svg class="w-full h-full" viewBox="0 0 48 48">
        <defs>
          <mask id="cd-mask-{skillId}">
            <rect width="48" height="48" fill="white" />
            <path
              d="M24,24 L24,0 A24,24 0 {cooldownAngle > 180 ? '1' : '0'},1 {24 + 24 * Math.sin(cooldownAngle * Math.PI / 180)},{24 - 24 * Math.cos(cooldownAngle * Math.PI / 180)} Z"
              fill="black"
            />
          </mask>
        </defs>
        <rect width="48" height="48" fill="rgba(0,0,0,0.6)" mask="url(#cd-mask-{skillId})" />
      </svg>
    </div>
  {/if}

  <!-- Casting flash -->
  {#if state.isCasting}
    <div class="absolute inset-0 bg-white/30 pointer-events-none"></div>
  {/if}

  <!-- Countdown timer -->
  {#if state.cooldownProgress > 0 && state.cooldownEndTime > 0}
    <div class="absolute bottom-0 left-0 right-0 text-center text-[9px] font-bold text-white bg-black/60 px-0.5 pointer-events-none leading-tight z-10">
      {formatTime(state.cooldownEndTime)}
    </div>
  {/if}

  <!-- Ingame key badge (shown when ready) -->
  {#if ingameKey && isReady}
    <div class="absolute top-0 right-0 text-[8px] font-bold text-white bg-black/50 px-0.5 rounded-bl pointer-events-none leading-tight z-10">
      {ingameKey}
    </div>
  {/if}
</button>
