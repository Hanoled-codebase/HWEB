import { PaymentVerify } from "./PaymentVerify";

// Return URL for payments started before the school was part of it: there is
// nothing to check against, so the page says so instead of claiming success.
export default function PaymentVerifyPage() {
  return <PaymentVerify />;
}
