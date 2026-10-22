/** Open first, while the click still has user activation; give the window its own Blob URL. */
export async function openDocumentWindow(document: { name: string; src: string; mime: string }) {
  if (!["application/pdf", "text/plain", "application/octet-stream"].includes(document.mime))
    throw new Error("This document type cannot be previewed.");
  const source = new URL(document.src);
  const localData = new RegExp(`^data:${document.mime};base64,[a-z0-9+/]*={0,2}$`, "i").test(
    document.src,
  );
  const localBlob = source.protocol === "blob:" && source.origin === window.location.origin;
  const remotePDF = source.protocol === "https:" && document.mime === "application/pdf";
  if (!localData && !localBlob && !remotePDF) throw new Error("This document cannot be previewed.");
  const popup = window.open("", "_blank", "popup,width=1000,height=850");
  if (!popup) throw new Error("Allow pop-ups for Lemma to open a separate window.");
  popup.opener = null;
  popup.document.title = document.name;
  popup.document.body.style.cssText =
    "margin:0;height:100vh;display:flex;flex-direction:column;background:#f4f4f2;color:#37352f;font:15px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif";
  const heading = popup.document.createElement("header");
  heading.style.cssText =
    "display:flex;gap:20px;align-items:center;padding:12px 20px;background:white;border-bottom:1px solid #ddd";
  const title = popup.document.createElement("strong");
  title.textContent = document.name;
  title.style.cssText = "flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
  heading.append(title);
  popup.document.body.append(heading);
  try {
    let src = document.src;
    if (!/^https:\/\//i.test(src)) {
      const bytes = await (await fetch(src)).arrayBuffer();
      if (popup.closed) return false;
      const realm = popup as Window & typeof globalThis;
      src = realm.URL.createObjectURL(new realm.Blob([bytes], { type: document.mime }));
      popup.addEventListener("beforeunload", () => realm.URL.revokeObjectURL(src), { once: true });
    }
    const download = popup.document.createElement("a");
    download.href = src;
    download.download = document.name;
    download.textContent = "Download";
    download.style.color = "inherit";
    heading.append(download);
    const frame = popup.document.createElement("iframe");
    frame.title = document.name;
    frame.referrerPolicy = "no-referrer";
    frame.src = src;
    frame.style.cssText = "flex:1;min-height:0;width:100%;border:0";
    popup.document.body.append(frame);
    return true;
  } catch (error) {
    popup.close();
    throw error;
  }
}
