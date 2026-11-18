<script lang="ts">
	// The story's methods, written in src/data/methods.md. Only the
	// Markdown that file uses is supported: ## and ### headings, paragraphs,
	// "- " and "1. " lists, **bold**, *italic* and [links](url).
	import methods from "$data/methods.md?raw";

	const escapeHtml = (text: string): string =>
		text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

	const inline = (text: string): string =>
		escapeHtml(text)
			.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
			.replace(/\*(.+?)\*/g, "<em>$1</em>")
			.replace(
				/\[([^\]]+)\]\(([^)\s]+)\)/g,
				'<a href="$2" target="_blank" rel="noopener">$1</a>'
			);

	const LIST_ITEM = { ul: /^- (.*)$/, ol: /^\d+\. (.*)$/ } as const;

	const toHtml = (markdown: string): string => {
		const blocks = markdown.trim().split(/\n\s*\n/);
		return blocks
			.map((block) => {
				const lines = block.split("\n").map((line) => line.trim());
				const heading = lines[0].match(/^(#{2,3}) (.*)$/);
				if (heading && lines.length === 1) {
					const level = heading[1].length;
					return `<h${level}>${inline(heading[2])}</h${level}>`;
				}
				for (const [tag, pattern] of Object.entries(LIST_ITEM)) {
					if (lines.every((line) => pattern.test(line))) {
						const items = lines.map(
							(line) => `<li>${inline(line.match(pattern)![1])}</li>`
						);
						return `<${tag}>${items.join("")}</${tag}>`;
					}
				}
				return `<p>${inline(lines.join(" "))}</p>`;
			})
			.join("\n");
	};

	const html = toHtml(methods);
</script>

<section class="methods" id="methods">
	{@html html}
</section>

<style>
	.methods {
		max-width: 700px;
		margin: 0 auto;
		padding-top: 3rem;
		/* fill the stage so the text scrolls inside it rather than
		   running past the clipped article */
		height: 100%;
		box-sizing: border-box;
		overflow-y: auto;
		overscroll-behavior: contain;
		pointer-events: auto;
		padding-right: 0.5rem;
		font-size: var(--14px, 0.875rem);
		line-height: 1.5;
	}

	.methods :global(h2) {
		font-family: var(--font-serif);
		font-weight: bold;
		margin: 0 0 0.75rem;
	}

	.methods :global(h3) {
		font-family: var(--font-serif);
		font-size: var(--18px, 1.125rem);
		font-weight: bold;
		margin: 1.5rem 0 0.5rem;
	}

	.methods :global(p) {
		margin: 0 0 0.75rem;
	}

	/* The text panel styles lists large and serif for the story's own
	   lists; the methods' lists read like body text. */
	.methods :global(ul),
	.methods :global(ol) {
		font-size: inherit;
		font-family: inherit;
		margin: 0 0 0.75rem;
		padding-left: 1.25rem;
	}

	.methods :global(li) {
		margin-bottom: 0.375rem;
	}

	.methods :global(a) {
		color: inherit;
	}
</style>
