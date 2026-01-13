<script lang="ts">
  import { isRichText, type Delta } from '../../types/listing';

  let { content } = $props<{
    content: string | Delta;
  }>();

  // Convert Delta to HTML
  function deltaToHtml(delta: Delta): string {
    if (!delta?.ops) return '';

    let html = '';
    let currentLine = '';
    let listType: string | null = null;
    let inList = false;

    for (const op of delta.ops) {
      if (typeof op.insert === 'string') {
        const text = op.insert;
        const attrs = op.attributes || {};

        // Check if this is a newline
        if (text === '\n') {
          // Apply line-level formatting
          if (attrs.header) {
            html += `<h${attrs.header}>${currentLine}</h${attrs.header}>`;
          } else if (attrs.list) {
            // Handle list items
            if (!inList || listType !== attrs.list) {
              if (inList) {
                html += listType === 'bullet' ? '</ul>' : '</ol>';
              }
              html += attrs.list === 'bullet' ? '<ul>' : '<ol>';
              listType = attrs.list;
              inList = true;
            }
            html += `<li>${currentLine}</li>`;
          } else {
            // Close any open list
            if (inList) {
              html += listType === 'bullet' ? '</ul>' : '</ol>';
              inList = false;
              listType = null;
            }
            html += currentLine ? `<p>${currentLine}</p>` : '<br>';
          }
          currentLine = '';
        } else {
          // Apply inline formatting
          let formatted = escapeHtml(text);
          if (attrs.bold) formatted = `<strong>${formatted}</strong>`;
          if (attrs.italic) formatted = `<em>${formatted}</em>`;
          if (attrs.code) formatted = `<code>${formatted}</code>`;
          if (attrs.link) formatted = `<a href="${escapeHtml(attrs.link)}" target="_blank" rel="noopener">${formatted}</a>`;
          currentLine += formatted;
        }
      }
    }

    // Close any remaining list
    if (inList) {
      html += listType === 'bullet' ? '</ul>' : '</ol>';
    }

    // Add any remaining content
    if (currentLine) {
      html += `<p>${currentLine}</p>`;
    }

    return html;
  }

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  const displayHtml = $derived(
    isRichText(content) ? deltaToHtml(content) : null
  );
</script>

{#if displayHtml}
  <!-- Rich text (Delta) -->
  <div class="prose prose-sm max-w-none rich-text-content">
    {@html displayHtml}
  </div>
{:else}
  <!-- Plain text (legacy) -->
  <p class="text-gray-600 text-sm whitespace-pre-wrap">{content}</p>
{/if}

<style>
  .rich-text-content :global(h1) {
    font-size: 1.5em;
    font-weight: 700;
    margin: 0.5em 0;
  }
  .rich-text-content :global(h2) {
    font-size: 1.25em;
    font-weight: 600;
    margin: 0.5em 0;
  }
  .rich-text-content :global(ul) {
    list-style-type: disc;
    padding-left: 1.5em;
    margin: 0.5em 0;
  }
  .rich-text-content :global(ol) {
    list-style-type: decimal;
    padding-left: 1.5em;
    margin: 0.5em 0;
  }
  .rich-text-content :global(li) {
    margin: 0.25em 0;
  }
  .rich-text-content :global(p) {
    margin: 0.5em 0;
  }
  .rich-text-content :global(strong) {
    font-weight: 700;
  }
  .rich-text-content :global(em) {
    font-style: italic;
  }
  .rich-text-content :global(a) {
    color: #4b9aaa;
    text-decoration: underline;
  }
</style>
