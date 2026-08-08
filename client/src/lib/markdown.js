import { marked } from "marked";
import DOMPurify from "dompurify";

// Admin-authored content is lower risk than public user input, but sanitizing
// before dangerouslySetInnerHTML is cheap insurance against a compromised
// admin account being used as a stored-XSS vector.
export function renderMarkdown(markdown) {
  return DOMPurify.sanitize(marked.parse(markdown || ""));
}
