import { createClient } from "@supabase/supabase-js";
import { supabase } from "../supabase.js";
import { createAuditDelivery, type DeliveryJobContext } from "../services/audit-delivery.js";
import { createPaymentReconcile } from "../services/payment-reconcile.js";
import { createMailer } from "../services/mailer.js";
import { createWorkerOperatorNotifier } from "../services/operator-alerts.js";

/** Письмо-ссылка на страницу статуса заказа (magic link через Supabase Auth / SMTP). */
export async function sendStatusLink(email:string,orderId:string):Promise<void> {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key)throw new Error("Notification auth configuration missing");
  const app=(process.env.NEXT_PUBLIC_APP_URL||process.env.APP_URL||"https://neuroexpertise.ru").replace(/\/$/,"");
  const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(30000)})}});
  const {error}=await auth.auth.signInWithOtp({email,options:{shouldCreateUser:false,emailRedirectTo:`${app}/auth/callback?next=/orders/${orderId}`}});
  if(error)throw new Error("Ready notification could not be sent");
}

const mailer=createMailer();
// R-02: единый канал алертов оператору (Telegram админ-чат, дедуп в БД).
export const notifyOperator=createWorkerOperatorNotifier({admin:supabase});
const delivery=createAuditDelivery({admin:supabase,sendReady:sendStatusLink,sendMail:mailer,notifyOperator});
// R-01: сверка pending/expired-заказов с кассой (потерянный webhook, брошенные корзины).
const reconcile=createPaymentReconcile({admin:supabase,sendStatusLink,notifyOperator});
export const handleRunAudit=(payload:Record<string,unknown>,context?:DeliveryJobContext)=>delivery.run(payload,context);
export const sweepAuditDelivery=()=>delivery.sweep();
export const reconcilePayments=()=>reconcile.run();
