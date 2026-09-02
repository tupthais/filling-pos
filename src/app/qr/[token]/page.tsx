import QrOrderClient from "./qr-order-client";

export default async function CustomerQrPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <QrOrderClient token={token} />;
}
