import QRCode from "qrcode";

/**
 * Calculates CRC-16 (CCITT-FALSE) with polynomial 0x1021 and initial value 0xFFFF.
 */
function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function tag(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function formatTarget(target: string): { subtag: string; value: string } {
  const digits = target.replace(/[^0-9]/g, "");
  if (digits.length === 13) {
    // Tax ID / National ID
    return { subtag: "02", value: digits };
  }
  if (digits.length === 10 && digits.startsWith("0")) {
    // Thai Mobile 08x-xxx-xxxx -> 00668xxxxxxxx
    return { subtag: "01", value: `0066${digits.slice(1)}` };
  }
  if (digits.length === 15) {
    // E-Wallet ID
    return { subtag: "03", value: digits };
  }
  // Default to 13-digit pad or raw
  return { subtag: "02", value: digits.padStart(13, "0") };
}

/**
 * Generates an official EMVCo Thai QR PromptPay payload string.
 * @param target PromptPay ID (Mobile e.g. "081-234-5678" or Tax ID e.g. "0105558000000")
 * @param amountSatang Optional amount in Satang. If provided, generates Dynamic QR (Tag 01 = 12).
 */
export function generatePromptPayPayload(target: string, amountSatang?: number): string {
  const targetFormatted = formatTarget(target);
  const merchantInfo = tag("00", "A000000677010111") + tag(targetFormatted.subtag, targetFormatted.value);

  const hasAmount = typeof amountSatang === "number" && amountSatang > 0;
  const isDynamic = hasAmount;

  let payload = "";
  payload += tag("00", "01"); // Version
  payload += tag("01", isDynamic ? "12" : "11"); // 11 = Static, 12 = Dynamic
  payload += tag("29", merchantInfo); // Merchant info PromptPay
  payload += tag("53", "764"); // Currency THB
  if (hasAmount) {
    const thb = (amountSatang / 100).toFixed(2);
    payload += tag("54", thb);
  }
  payload += tag("58", "TH"); // Country

  const rawForCrc = payload + "6304";
  const checksum = crc16(rawForCrc);
  return payload + tag("63", checksum);
}

/**
 * Generates a base64 Data URL for a PromptPay QR code.
 */
export async function generatePromptPayQrDataUrl(target: string, amountSatang?: number): Promise<string> {
  const payload = generatePromptPayPayload(target, amountSatang);
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 280,
    color: {
      dark: "#0b261f",
      light: "#ffffff",
    },
  });
}

/**
 * Generates a standard base64 Data URL for any arbitrary text or URL (e.g. table ordering URLs).
 */
export async function generateQrCodeDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 280,
    color: {
      dark: "#0b261f",
      light: "#ffffff",
    },
  });
}

