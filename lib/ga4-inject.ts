/**
 * Inject Google Analytics 4 (gtag.js) into generated site HTML.
 * Works identically to `injectMetaPixel` — idempotent, inserts after <head>.
 */
export function injectGA4(html: string, measurementId: string): string {
  if (!html || !measurementId) return html;
  if (html.includes(`'${measurementId}'`) && html.includes('gtag')) return html;

  const snippet = `<!-- Global site tag (gtag.js) - Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>
<script>
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());gtag('config','${measurementId}');
</script>`;

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${snippet}`);
  }
  return `${snippet}${html}`;
}
