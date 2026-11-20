import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QrCode({ value, size = 168, label = "Appointment QR code" }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let live = true;
    QRCode.toDataURL(value, { width: size * 2, margin: 1, errorCorrectionLevel: "M" })
      .then(url => { if (live) setSrc(url); })
      .catch(() => { if (live) setSrc(""); });
    return () => { live = false; };
  }, [value, size]);

  if (!src) return <div className="qr-box" style={{ width: size, height: size }} aria-hidden="true" />;
  return <img className="qr-box" src={src} width={size} height={size} alt={label} />;
}
