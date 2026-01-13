<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Delta } from '@typewriter/document';

  let {
    value = { ops: [{ insert: '\n' }] },
    onChange,
    placeholder = 'Start typing...',
    maxLength = 2000,
    minLength = 20
  } = $props<{
    value?: Delta;
    onChange: (delta: Delta, plainText: string) => void;
    placeholder?: string;
    maxLength?: number;
    minLength?: number;
  }>();

  let editor = $state<any>(null);
  let editorRoot: HTMLDivElement;
  let charCount = $state(0);
  let mounted = $state(false);
  let activeFormats = $state<Record<string, any>>({});

  // Extract plain text from Delta for character count and validation
  function getPlainText(delta: Delta): string {
    if (!delta?.ops) return '';
    return delta.ops
      .map(op => (typeof op.insert === 'string' ? op.insert : ''))
      .join('')
      .trim();
  }

  onMount(async () => {
    try {
      // Dynamic import to avoid SSR issues with browser APIs
      const typewriter = await import('typewriter-editor');
      const { Delta } = await import('@typewriter/document');

      editor = new typewriter.Editor();

      // Attach editor to DOM first
      if (editorRoot) {
        editor.setRoot(editorRoot);
      }

      // Set initial content if provided - must convert to proper Delta instance
      if (value?.ops && value.ops.length > 0 && value.ops[0].insert !== '\n') {
        const delta = new Delta(value.ops);
        editor.setDelta(delta);
      }

      // Update character count
      charCount = getPlainText(editor.getDelta()).length;

      // Listen for changes
      editor.on('change', () => {
        const delta = editor.getDelta();
        const plainText = getPlainText(delta);
        charCount = plainText.length;
        onChange(delta, plainText);
      });

      // Track active formats for toolbar highlighting
      editor.on('format', () => {
        activeFormats = editor.getActive() || {};
      });

      mounted = true;
    } catch (e) {
      console.error('Failed to initialize editor:', e);
    }
  });

  onDestroy(() => {
    if (editor) {
      editor.destroy();
    }
  });

  // Toolbar button handlers
  function toggleBold() {
    if (!editor) return;
    editor.toggleTextFormat({ bold: true });
    editor.root.focus();
    activeFormats = editor.getActive() || {};
  }

  function toggleItalic() {
    if (!editor) return;
    editor.toggleTextFormat({ italic: true });
    editor.root.focus();
    activeFormats = editor.getActive() || {};
  }

  function toggleHeading(level: number) {
    if (!editor) return;
    editor.toggleLineFormat({ header: level });
    editor.root.focus();
    activeFormats = editor.getActive() || {};
  }

  function toggleBulletList() {
    if (!editor) return;
    editor.toggleLineFormat({ list: 'bullet' });
    editor.root.focus();
    activeFormats = editor.getActive() || {};
  }

  function toggleNumberedList() {
    if (!editor) return;
    editor.toggleLineFormat({ list: 'ordered' });
    editor.root.focus();
    activeFormats = editor.getActive() || {};
  }
</script>

<div class="rich-text-editor">
  <!-- Toolbar -->
  <div class="flex items-center gap-1 p-2 border border-[#aca89f]/30 bg-gray-50 rounded-t-xl {!mounted ? 'opacity-50 pointer-events-none' : ''}">
    <!-- Bold -->
    <button
      type="button"
      onclick={toggleBold}
      class="p-2 rounded hover:bg-gray-200 transition-colors {activeFormats.bold ? 'bg-[#4b9aaa]/20 text-[#4b9aaa]' : 'text-gray-600'}"
      title="Bold (Ctrl+B)"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
        <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
      </svg>
    </button>

    <!-- Italic -->
    <button
      type="button"
      onclick={toggleItalic}
      class="p-2 rounded hover:bg-gray-200 transition-colors {activeFormats.italic ? 'bg-[#4b9aaa]/20 text-[#4b9aaa]' : 'text-gray-600'}"
      title="Italic (Ctrl+I)"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <line x1="19" y1="4" x2="10" y2="4"/>
        <line x1="14" y1="20" x2="5" y2="20"/>
        <line x1="15" y1="4" x2="9" y2="20"/>
      </svg>
    </button>

    <div class="w-px h-5 bg-gray-300 mx-1"></div>

    <!-- Heading 1 -->
    <button
      type="button"
      onclick={() => toggleHeading(1)}
      class="p-2 rounded hover:bg-gray-200 transition-colors text-sm font-bold {activeFormats.header === 1 ? 'bg-[#4b9aaa]/20 text-[#4b9aaa]' : 'text-gray-600'}"
      title="Heading 1"
    >
      H1
    </button>

    <!-- Heading 2 -->
    <button
      type="button"
      onclick={() => toggleHeading(2)}
      class="p-2 rounded hover:bg-gray-200 transition-colors text-sm font-bold {activeFormats.header === 2 ? 'bg-[#4b9aaa]/20 text-[#4b9aaa]' : 'text-gray-600'}"
      title="Heading 2"
    >
      H2
    </button>

    <div class="w-px h-5 bg-gray-300 mx-1"></div>

    <!-- Bullet List -->
    <button
      type="button"
      onclick={toggleBulletList}
      class="p-2 rounded hover:bg-gray-200 transition-colors {activeFormats.list === 'bullet' ? 'bg-[#4b9aaa]/20 text-[#4b9aaa]' : 'text-gray-600'}"
      title="Bullet List"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <line x1="9" y1="6" x2="20" y2="6"/>
        <line x1="9" y1="12" x2="20" y2="12"/>
        <line x1="9" y1="18" x2="20" y2="18"/>
        <circle cx="4" cy="6" r="1.5" fill="currentColor"/>
        <circle cx="4" cy="12" r="1.5" fill="currentColor"/>
        <circle cx="4" cy="18" r="1.5" fill="currentColor"/>
      </svg>
    </button>

    <!-- Numbered List -->
    <button
      type="button"
      onclick={toggleNumberedList}
      class="p-2 rounded hover:bg-gray-200 transition-colors {activeFormats.list === 'ordered' ? 'bg-[#4b9aaa]/20 text-[#4b9aaa]' : 'text-gray-600'}"
      title="Numbered List"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="10" y1="6" x2="20" y2="6"/>
        <line x1="10" y1="12" x2="20" y2="12"/>
        <line x1="10" y1="18" x2="20" y2="18"/>
        <text x="3" y="8" font-size="7" fill="currentColor" stroke="none">1</text>
        <text x="3" y="14" font-size="7" fill="currentColor" stroke="none">2</text>
        <text x="3" y="20" font-size="7" fill="currentColor" stroke="none">3</text>
      </svg>
    </button>
  </div>

  <!-- Editor Content - always rendered so we can bind to it -->
  <div
    bind:this={editorRoot}
    class="min-h-[150px] max-h-[300px] overflow-y-auto px-4 py-3 border border-t-0 border-[#aca89f]/30 rounded-b-xl focus-within:ring-2 focus-within:ring-[#4b9aaa] focus-within:border-transparent prose prose-sm max-w-none editor-content bg-white"
  >
    {#if !mounted}
      <div class="animate-pulse">
        <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div class="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    {/if}
  </div>

  <!-- Character Count -->
  <div class="flex justify-between items-center mt-1 text-xs">
    <span class="text-gray-400">
      {charCount}/{maxLength} characters (min {minLength})
    </span>
    {#if charCount > 0 && charCount < minLength}
      <span class="text-amber-500">Need {minLength - charCount} more characters</span>
    {:else if charCount > maxLength}
      <span class="text-red-500">{charCount - maxLength} characters over limit</span>
    {/if}
  </div>
</div>

<style>
  /* Prose styling for rich text content */
  :global(.editor-content h1) {
    font-size: 1.5em;
    font-weight: 700;
    margin: 0.5em 0;
  }
  :global(.editor-content h2) {
    font-size: 1.25em;
    font-weight: 600;
    margin: 0.5em 0;
  }
  :global(.editor-content ul) {
    list-style-type: disc;
    padding-left: 1.5em;
    margin: 0.5em 0;
  }
  :global(.editor-content ol) {
    list-style-type: decimal;
    padding-left: 1.5em;
    margin: 0.5em 0;
  }
  :global(.editor-content li) {
    margin: 0.25em 0;
  }
  :global(.editor-content strong) {
    font-weight: 700;
  }
  :global(.editor-content em) {
    font-style: italic;
  }
  :global(.editor-content p) {
    margin: 0.25em 0;
  }
  :global(.editor-content:focus) {
    outline: none;
  }
</style>
