/**
 * Documentation helpers. Repository documents come from the integration
 * metadata workspace profile (README, AGENTS.md…); workspace documents are
 * user-authored records stored in Firestore.
 */

/** Very small markdown-lite renderer: headings, bold, code blocks, lists, links. */
export const renderMarkdownLite = (content) => {
  const lines = String(content || '').split('\n');
  const blocks = [];
  let listBuffer = [];
  let codeBuffer = null;

  const inline = (text) => text
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');

  const flushList = () => {
    if (listBuffer.length) {
      blocks.push(`<ul>${listBuffer.map((item) => `<li>${item}</li>`).join('')}</ul>`);
      listBuffer = [];
    }
  };

  lines.forEach((rawLine) => {
    const line = rawLine.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    if (line.trim().startsWith('```')) {
      if (codeBuffer === null) {
        flushList();
        codeBuffer = [];
      } else {
        blocks.push(`<pre><code>${codeBuffer.join('\n')}</code></pre>`);
        codeBuffer = null;
      }
      return;
    }
    if (codeBuffer !== null) {
      codeBuffer.push(line);
      return;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushList();
      const level = heading[1].length + 2; // h3..h5 keeps page hierarchy under page h1/h2
      blocks.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      return;
    }

    const listItem = line.match(/^\s*[-*]\s+(.*)$/);
    if (listItem) {
      listBuffer.push(inline(listItem[1]));
      return;
    }

    if (!line.trim()) {
      flushList();
      return;
    }
    flushList();
    blocks.push(`<p>${inline(line)}</p>`);
  });
  flushList();
  if (codeBuffer !== null) blocks.push(`<pre><code>${codeBuffer.join('\n')}</code></pre>`);

  return blocks.join('\n');
};

export const validateDocumentDraft = (draft) => {
  const errors = {};
  if (!String(draft.title || '').trim()) errors.title = 'Document title is required.';
  if (!String(draft.content || '').trim()) errors.content = 'Document content is required.';
  return { valid: Object.keys(errors).length === 0, errors };
};

export const searchDocuments = (documents, query = '') => {
  const term = String(query || '').trim().toLowerCase();
  if (!term) return documents;
  return documents.filter((document) => [document.title, document.path, document.content]
    .map((value) => String(value || '').toLowerCase())
    .join(' ')
    .includes(term));
};
