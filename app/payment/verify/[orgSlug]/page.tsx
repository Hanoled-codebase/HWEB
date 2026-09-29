import { PaymentVerify } from "../PaymentVerify";

export default async function SchoolPaymentVerifyPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  return <PaymentVerify orgSlug={orgSlug} />;
}
