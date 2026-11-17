import { auth } from './firebase';

type CheckoutPayload = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: string, handler: (data: any) => void) => void };
type CheckoutConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global { interface Window { Razorpay?: CheckoutConstructor } }
let checkoutScript: Promise<void> | null = null;
function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (!checkoutScript) checkoutScript = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    let settled = false;
    const timeout = window.setTimeout(() => fail('Razorpay checkout timed out. Please check your connection and retry.'), 15000);
    function fail(message: string) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      script.remove();
      checkoutScript = null;
      reject(new Error(message));
    }
    script.onload = () => {
      if (!window.Razorpay) return fail('Razorpay checkout could not initialize. Please retry.');
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve();
    };
    script.onerror = () => fail('Unable to load the secure payment checkout. Please check browser extensions and retry.');
    document.head.appendChild(script);
  });
  return checkoutScript;
}
async function postPayment<T>(route: string, data: object): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in before paying.');
  const token = await user.getIdToken();
  const res = await fetch('/api/payments/' + route, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify(data)
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error || 'Payment request failed. Please retry.');
  return json as T;
}
export type VerifiedPayment = { verified: boolean; orderId: string; paymentId: string; registration?: Record<string, unknown> };
export async function recoverTestPayment(eventSlug: string): Promise<{ verified: boolean; registration?: Record<string, unknown> }> {
  return postPayment('status', { event_slug: eventSlug });
}
export async function beginTestPayment(eventSlug: string, name: string, email: string, phone: string): Promise<VerifiedPayment> {
  const order = await postPayment<{ success: boolean; order_id: string; key_id: string; amount: number; currency: string }>('create-order', { event_slug: eventSlug });
  if (!order.key_id.startsWith('rzp_test_')) throw new Error('Only Razorpay test payments are supported.');
  await loadRazorpay();
  return await new Promise<VerifiedPayment>((resolve, reject) => {
    let finished = false;
    let verifying = false;
    const finish = (error?: Error, result?: VerifiedPayment) => {
      if (finished) return;
      finished = true;
      if (error) reject(error); else if (result) resolve(result);
    };
    const razorpay = new window.Razorpay!({
      key: order.key_id,
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency,
      name: 'NEXORA',
      description: 'Competition registration — TEST MODE',
      prefill: { name, email, contact: phone },
      theme: { color: '#7C3AED' },
      handler: async (response: CheckoutPayload) => {
        verifying = true;
        try {
          const result = await postPayment<{ verified: boolean; registration?: Record<string, unknown> }>('verify', response);
          if (!result.verified) throw new Error('Payment could not be verified.');
          finish(undefined, { verified: true, orderId: response.razorpay_order_id, paymentId: response.razorpay_payment_id, registration: result.registration });
        } catch (error) { finish(error instanceof Error ? error : new Error('Verification failed.')); }
      },
      modal: { ondismiss: () => {
        // A succeeded checkout can close just before the async verification finishes.
        // Never infer success from dismissal. The student may retry and the server reconciles.
        if (!finished && !verifying) finish(new Error('Checkout closed. Your payment status will be checked before another attempt.'));
      }}
    });
    razorpay.on('payment.failed', () => finish(new Error('Test payment failed. No registration was confirmed.')));
    razorpay.open();
  });
}
