<script lang="ts">
  import * as Popover from "$lib/components/ui/popover";
  import {Button} from "$lib/components/ui/button";

  type Props = {
    actionId: string;
    currentKey: string;
    conflictLabel?: string;
    keyboardOnly?: boolean;
    onBind: (key: string) => boolean | void;
    onCancel: () => void;
  };

  let {actionId, currentKey, conflictLabel, keyboardOnly = false, onBind, onCancel}: Props = $props();

  let open = $state(false);
  let isRecording = $state(false);
  let capturedKey = $state("");
  let validationMessage = $state("");
  let gamepadDetected = $state(false);
  let suppressCancel = false;
  let gamepadRafId: number | null = null;
  let pressedGamepadButtons = new Set<string>();

  const modifierKeys = new Set([
    "ControlLeft",
    "ControlRight",
    "AltLeft",
    "AltRight",
    "ShiftLeft",
    "ShiftRight",
    "MetaLeft",
    "MetaRight",
  ]);

  function normalizeModifier(event: KeyboardEvent): string[] {
    const modifiers: string[] = [];
    if (event.ctrlKey || event.metaKey) modifiers.push("commandorcontrol");
    if (event.altKey) modifiers.push("alt");
    if (event.shiftKey) modifiers.push("shift");
    return modifiers;
  }

  function normalizeKeyboardKey(event: KeyboardEvent): string | null {
    const {code} = event;

    if (modifierKeys.has(code)) {
      return null;
    }

    if (code.startsWith("Key")) {
      return code.slice(3).toLowerCase();
    }

    if (code.startsWith("Digit")) {
      return code.slice(5).toLowerCase();
    }

    if (code.startsWith("Numpad")) {
      const numpadMap: Record<string, string> = {
        Numpad0: "num0",
        Numpad1: "num1",
        Numpad2: "num2",
        Numpad3: "num3",
        Numpad4: "num4",
        Numpad5: "num5",
        Numpad6: "num6",
        Numpad7: "num7",
        Numpad8: "num8",
        Numpad9: "num9",
        NumpadDecimal: "numdec",
        NumpadAdd: "numadd",
        NumpadSubtract: "numsub",
        NumpadMultiply: "nummult",
        NumpadDivide: "numdiv",
      };
      return numpadMap[code] ?? null;
    }

    const codeMap: Record<string, string> = {
      Space: "space",
      Tab: "tab",
      CapsLock: "capslock",
      NumLock: "numlock",
      ScrollLock: "scrolllock",
      Backspace: "backspace",
      Delete: "delete",
      Insert: "insert",
      Enter: "enter",
      NumpadEnter: "enter",
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      Home: "home",
      End: "end",
      PageUp: "pageup",
      PageDown: "pagedown",
      Escape: "esc",
      PrintScreen: "printscreen",
      Pause: "pause",
      Minus: "-",
      Equal: "=",
      BracketLeft: "[",
      BracketRight: "]",
      Backslash: "\\",
      Semicolon: ";",
      Quote: "'",
      Comma: ",",
      Period: ".",
      Slash: "/",
      Backquote: "`",
    };

    if (codeMap[code]) {
      return codeMap[code];
    }

    if (code.startsWith("F")) {
      return code.toLowerCase();
    }

    return event.key.length === 1 ? event.key.toLowerCase() : null;
  }

  function normalizeMouseButton(button: number): string | null {
    if (button === 1) return "Middle";
    if (button === 3) return "Mouse4";
    if (button === 4) return "Mouse5";
    return null;
  }

  function buildKeyCombination(event: KeyboardEvent): string | null {
    const key = normalizeKeyboardKey(event);
    if (!key) return null;
    const modifiers = normalizeModifier(event);
    return modifiers.length > 0 ? `${modifiers.join("+")}+${key}` : key;
  }

  function startRecording() {
    validationMessage = "";
    capturedKey = "";
    isRecording = true;
  }

  function cancelRecording() {
    validationMessage = "";
    capturedKey = "";
    isRecording = false;
    suppressCancel = false;
    onCancel();
    open = false;
  }

  function handleOpenChange(nextOpen: boolean) {
    open = nextOpen;
    if (nextOpen) {
      startRecording();
      return;
    }

    if (suppressCancel) {
      suppressCancel = false;
      validationMessage = "";
      capturedKey = "";
      isRecording = false;
      return;
    }

    cancelRecording();
  }

  function confirmBinding() {
    if (!capturedKey) {
      return;
    }

    const result = onBind(capturedKey);
    if (result === false) {
      validationMessage = conflictLabel ? `Conflicts with: ${conflictLabel}` : `Conflicts with: binding already in use`;
      return;
    }

    suppressCancel = true;
    validationMessage = "";
    capturedKey = "";
    isRecording = false;
    open = false;
  }

  function retryRecording() {
    validationMessage = "";
    capturedKey = "";
    isRecording = true;
  }

  function stopGamepadLoop() {
    if (gamepadRafId !== null) {
      cancelAnimationFrame(gamepadRafId);
      gamepadRafId = null;
    }
    pressedGamepadButtons = new Set();
    gamepadDetected = false;
  }

  $effect(() => {
    if (!open || !isRecording) {
      stopGamepadLoop();
      return () => {};
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open || !isRecording) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (event.code === "Escape") {
        cancelRecording();
        return;
      }

      const normalized = buildKeyCombination(event);
      if (!normalized) {
        return;
      }

      capturedKey = normalized;
      validationMessage = "";
      isRecording = false;
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (!open || !isRecording) {
        return;
      }

      const normalized = normalizeMouseButton(event.button);
      if (!normalized) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      capturedKey = normalized;
      validationMessage = "";
      isRecording = false;
    };

    const pollGamepads = () => {
      const gamepads = navigator.getGamepads();
      const activeButtons = new Set<string>();
      gamepadDetected = Array.from(gamepads).some(Boolean);

      for (const gamepad of gamepads) {
        if (!gamepad) continue;

        for (let buttonIndex = 0; buttonIndex < gamepad.buttons.length; buttonIndex++) {
          const button = gamepad.buttons[buttonIndex];
          if (!button?.pressed) continue;

          const key = `Gamepad${gamepad.index}:Button${buttonIndex}`;
          activeButtons.add(key);

          if (pressedGamepadButtons.has(key)) {
            continue;
          }

          capturedKey = key;
          validationMessage = "";
          isRecording = false;
          pressedGamepadButtons.add(key);
          break;
        }
      }

      for (const key of Array.from(pressedGamepadButtons)) {
        if (!activeButtons.has(key)) {
          pressedGamepadButtons.delete(key);
        }
      }

      if (open && isRecording) {
        gamepadRafId = requestAnimationFrame(pollGamepads);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    if (!keyboardOnly) {
      window.addEventListener("mousedown", handleMouseDown, true);
      gamepadRafId = requestAnimationFrame(pollGamepads);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      if (!keyboardOnly) {
        window.removeEventListener("mousedown", handleMouseDown, true);
      }
      stopGamepadLoop();
    };
  });
</script>

<Popover.Root open={open} onOpenChange={handleOpenChange}>
  <Popover.Trigger class="h-9 px-3 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm whitespace-nowrap">
    <span class="truncate {currentKey ? 'text-foreground' : 'text-muted-foreground'}">{currentKey || 'Click to Bind'}</span>
  </Popover.Trigger>

  <Popover.Content class="w-80 space-y-4">
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <span class={`size-2 rounded-full ${isRecording ? 'bg-primary animate-pulse' : 'bg-muted-foreground/40'}`}></span>
        <p class="text-sm font-semibold">{isRecording ? 'Listening…' : 'Record mode ready'}</p>
      </div>
      <p class="text-xs text-muted-foreground">
        Press a key, Mouse 4/5, or middle click. Escape cancels.
      </p>
      {#if isRecording && !gamepadDetected}
        <p class="text-xs text-muted-foreground">No gamepad detected — keyboard and mouse capture still active</p>
      {/if}
      <div class="rounded-md border bg-muted/40 p-3">
        <p class="text-xs text-muted-foreground">Action</p>
        <p class="text-sm font-medium">{actionId}</p>
        <p class="mt-2 text-xs text-muted-foreground">Current binding</p>
        <p class="text-sm font-mono">{currentKey || 'none'}</p>
        {#if capturedKey}
          <p class="mt-2 text-xs text-muted-foreground">Captured</p>
          <p class="text-sm font-mono font-semibold">{capturedKey}</p>
        {/if}
      </div>
      {#if validationMessage}
        <p class="text-xs text-destructive">{validationMessage}</p>
      {/if}
    </div>

    <div class="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" type="button" onclick={retryRecording} disabled={!open}>Listen Again</Button>
      <Button variant="secondary" size="sm" type="button" onclick={confirmBinding} disabled={!capturedKey}>Confirm</Button>
      <Button variant="ghost" size="sm" type="button" onclick={cancelRecording}>Cancel</Button>
    </div>
  </Popover.Content>
</Popover.Root>