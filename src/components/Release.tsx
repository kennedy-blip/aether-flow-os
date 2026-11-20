import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, Smartphone, Check } from "lucide-react";
import { download } from "./Kit";
const apk = "/releases/aetherflow-release.apk";
const fallback = "/releases/android-installation-guide.txt";
type Manifest = {
  version: string;
  bytes: number;
  sha256: string;
  commit?: string;
};
export async function fetchRelease(): Promise<Manifest | null> {
  try {
    const r = await fetch("/releases/manifest.json", { cache: "no-store" });
    if (!r.ok) return null;
    const m = await r.json();
    if (
      typeof m.version !== "string" ||
      typeof m.bytes !== "number" ||
      !/^[a-f0-9]{64}$/.test(m.sha256)
    )
      return null;
    const binary = await fetch(apk, { method: "HEAD", cache: "no-store" });
    return binary.ok &&
      !binary.headers.get("content-type")?.includes("text/html")
      ? m
      : null;
  } catch {
    return null;
  }
}
export function saveRelease(m: Manifest | null) {
  download(
    m ? apk : fallback,
    m
      ? "AetherFlow-OS-v1.0.0.apk"
      : "AetherFlow-Android-Installation-Guide.txt",
  );
}
export function Release({
  release,
  loading,
}: {
  release: Manifest | null;
  loading: boolean;
}) {
  const [qr, setQr] = useState("");
  const url = new URL(location.href);
  url.search = "?android=1";
  useEffect(() => {
    void QRCode.toString(url.href, { type: "svg", margin: 2 }).then(setQr);
  }, [url.href]);
  return (
    <div className="stack release">
      <div className="row">
        <Smartphone size={22} />
        <h2>Android Download Center</h2>
      </div>
      <p>
        {loading
          ? "Checking for a published APK…"
          : release
            ? "Take your workspace offline with the native Android build."
            : "The APK is not published on this deployment. Download the installation companion for build and install instructions."}
      </p>
      <button
        className="primary"
        disabled={loading}
        onClick={() => saveRelease(release)}
      >
        <Download size={17} />
        {release ? "Download Android APK" : "Download installation companion"}
      </button>
      <div className="release-details">
        {qr && (
          <img
            alt="QR code for this download center"
            src={`data:image/svg+xml,${encodeURIComponent(qr)}`}
          />
        )}
        <div className="stack">
          <strong>{release?.version ?? "v1.0.0 · not published"}</strong>
          {release && (
            <>
              <span>{(release.bytes / 1048576).toFixed(2)} MB</span>
              <small>SHA-256</small>
              <code>{release.sha256}</code>
            </>
          )}
          <span className="row">
            <Check size={15} /> Bundled offline workspace
          </span>
          <span className="row">
            <Check size={15} /> Local audio and storage
          </span>
        </div>
      </div>
      <p>
        On Android, open the APK and allow your browser or file manager to
        install unknown apps if prompted. Disable that permission again after
        installation.
      </p>
    </div>
  );
}
