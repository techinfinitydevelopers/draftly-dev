/**
 * Builds HTML for the 3D Builder live preview iframe.
 * Blob URL documents cannot read window.parent (cross-origin), so frames are inlined as __FRAME_DATA_URLS.
 */

export type BuilderPreviewAsset = { id: string; name: string; dataUrl: string };

export function buildBuilderPreviewHtml(
  siteCode: string,
  opts: {
    siteRenderMode: 'frame-scroll' | 'video-hero';
    videoBase64: string | null;
    webpFrames?: string[];
  },
): string {
  const { siteRenderMode, videoBase64, webpFrames } = opts;

  const inlineFrames =
    siteRenderMode === 'frame-scroll' && webpFrames && webpFrames.length > 0
      ? `<script id="draftly-preview-frames-inline">window.__FRAME_DATA_URLS=${JSON.stringify(webpFrames)};</script>`
      : '';

  const previewSync = `<script id="draftly-preview-sync">
(function(){
  function pull(){
    try {
      if (window.parent && window.parent !== window) {
        var F = window.parent.__DRAFTLY_PREVIEW_FRAMES;
        if (F && F.length && (!window.__FRAME_DATA_URLS || !window.__FRAME_DATA_URLS.length)) {
          window.__FRAME_DATA_URLS = F;
        }
        var V = window.parent.__DRAFTLY_PREVIEW_VIDEO;
        if (V && !window.__VIDEO_DATA_URL) window.__VIDEO_DATA_URL = V;
        var U = window.parent.__DRAFTLY_PREVIEW_USER_ASSETS;
        if (U && typeof U === 'object' && !window.__USER_ASSETS) window.__USER_ASSETS = U;
      }
    } catch (e) {}
  }
  pull();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pull, { once: true });
  }
})();
</script>`;

  const previewStyle = `<style id="draftly-preview-guard">
html{height:auto!important;min-height:100%!important;overflow-x:hidden!important;overflow-y:auto!important;background:transparent!important}
body{min-height:100%!important;height:auto!important;margin:0!important;overflow-x:hidden!important;overflow-y:auto!important;background:transparent!important;touch-action:auto!important}
#bgWrap{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;min-height:100vh!important;z-index:0!important;overflow:hidden!important;pointer-events:none!important}
#bgCanvas{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;display:block!important;image-rendering:auto!important}
#bgWrap,#bgCanvas,#bgWrap *{filter:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
#overlay{-webkit-backdrop-filter:none!important;backdrop-filter:none!important;filter:none!important}
#pageRoot{background:transparent!important}
#postFrameBackdrop{opacity:0!important;pointer-events:none!important}
/* Keep top chrome above hero/section copy that uses high z-index (preview-only injection) */
body>nav,body>header,#pageRoot>nav:first-of-type,#pageRoot>header:first-of-type,nav[role="navigation"],header[role="banner"]{z-index:8000!important}
</style>`;

  const parts: string[] = [];
  if (siteRenderMode === 'video-hero' && videoBase64) {
    parts.push(`<script>window.__VIDEO_DATA_URL=${JSON.stringify(videoBase64)};</script>`);
  }

  const frameFallback =
    siteRenderMode === 'frame-scroll' && webpFrames && webpFrames.length > 0
      ? `<script id="draftly-frame-fallback">
(function(){
  var urls=window.__FRAME_DATA_URLS;
  if(!urls||!urls.length)return;
  var TOTAL=urls.length;
  var canvas=document.getElementById('bgCanvas');
  if(!canvas)return;
  var ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:false});
  if(!ctx)return;
  var imgs=[];
  var curF=0,tgtF=0;
  var lastGood=null;
  var RADIUS=22;
  function resize(){
    var w=window.innerWidth||1920,h=window.innerHeight||1080;
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  }
  window.addEventListener('resize',resize);resize();
  function draw(img){
    if(!img||!img.naturalWidth)return;
    var cw=canvas.width,ch=canvas.height;
    ctx.clearRect(0,0,cw,ch);
    var s=Math.max(cw/img.naturalWidth,ch/img.naturalHeight);
    var w=img.naturalWidth*s,h=img.naturalHeight*s;
    ctx.drawImage(img,(cw-w)/2,(ch-h)/2,w,h);
  }
  function scrollP(){
    var el=document.documentElement,bd=document.body;
    var sh=Math.max(el.scrollHeight||0,bd.scrollHeight||0);
    var vh=window.innerHeight||el.clientHeight||1;
    var mx=Math.max(sh-vh,1);
    var y=window.scrollY!=null?window.scrollY:el.scrollTop;
    return Math.min(Math.max(y/mx,0),1);
  }
  function getImg(i){
    if(i<0||i>=TOTAL)return null;
    var x=imgs[i];
    if(!x){
      x=new Image();
      x.decoding='async';
      x.src=urls[i];
      imgs[i]=x;
    }
    return x;
  }
  function prefetch(center){
    var a=Math.max(0,center-RADIUS),b=Math.min(TOTAL-1,center+RADIUS);
    for(var j=a;j<=b;j++)getImg(j);
  }
  function tick(){
    tgtF=scrollP()*(TOTAL-1);
    curF+=(tgtF-curF)*0.2;
    var idx=Math.round(curF);
    if(idx<0)idx=0;if(idx>=TOTAL)idx=TOTAL-1;
    prefetch(idx);
    var img=getImg(idx);
    if(img&&img.complete&&img.naturalWidth){
      draw(img);
      lastGood=img;
    }else if(lastGood){
      draw(lastGood);
    }
    requestAnimationFrame(tick);
  }
  prefetch(0);
  getImg(0);
  requestAnimationFrame(tick);
})();
</script>`
      : '';

  const headInjection = `${inlineFrames}${previewSync}${previewStyle}${parts.join('')}`;
  let html = siteCode;
  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, `<head$1>${headInjection}`);
  } else {
    html = `${headInjection}${html}`;
  }
  if (frameFallback) {
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${frameFallback}</body>`);
    } else {
      html = `${html}${frameFallback}`;
    }
  }
  return html;
}
