import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p",
  "br",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "u",
  "a",
  "h1",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "code",
  "pre",
  "hr",
];

const ALLOWED_ATTR = ["href", "target", "rel"];

// Force rel=noopener noreferrer on any external `<a target=_blank>` so
// window.opener and Referer cannot leak to the linked origin.
let hookInstalled = false;
function installRelHardeningHook() {
  if (hookInstalled) return;
  hookInstalled = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (
      node.tagName === "A" &&
      node.getAttribute("target") === "_blank"
    ) {
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
}

export function sanitizeRulesHtml(html: string | null | undefined): string {
  if (!html) return "";
  installRelHardeningHook();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
}
