import type { SupabaseClient } from "@supabase/supabase-js";
import { buildReportSnapshot, decideDeliveryMode, decideRefund, isSlaBreached, type NotifyOperator } from "shared";
import { failedPaidEmail, refundedEmail, type MailContent } from "../emails/package-order.js";

type Env = Record<string, string | undefined>;
export interface DeliveryJobContext { attempts: number; maxAttempts: number; jobId?: string }
type Order = {
  id:string; owner_id:string; email:string; package:string; niche_id:string; city?:string|null; job_id:string|null;
  status:string; paid_at:string; amount_rub:number; yukassa_payment_id:string;
  payment_test:boolean|null; payment_shop_id:string|null; payment_verified_at:string|null;
  report:unknown; refund_id:string|null; refund_status:string; notification_status:string;
  notification_attempts:number; notification_next_attempt_at:string|null;
  refund_attempts:number; refund_next_attempt_at:string|null;
  failure_email_sent_at?:string|null; refund_email_sent_at?:string|null;
  failure_reason?:string|null;
  niches?:{name?:string}|null;
};
type Shop = {id:string; key:string; test:boolean};
type Payment = {id:string; status:string; test:boolean; amount:{value:string;currency:string}; metadata:Record<string,string>; recipient?:{account_id:string}};
type Refund = {id:string; status:string; payment_id:string; amount:{value:string;currency:string}};
export interface DeliveryDependencies {
  admin: SupabaseClient;
  sendReady: (email:string, orderId:string) => Promise<void>;
  /** R-01: письма о провале/возврате через SMTP worker'а; без него свип их пропускает. */
  sendMail?: (message:{to:string}&MailContent) => Promise<void>;
  /** R-02: алерты оператору (никогда не бросает); без него — тишина, как раньше. */
  notifyOperator?: NotifyOperator;
  fetch?: typeof fetch;
  env?: Env;
  now?: () => number;
}

/** Durable effects are retried from DB, independently of the job's terminal state. */
export function createAuditDelivery(deps: DeliveryDependencies) {
  const {admin} = deps, env = deps.env ?? process.env, http = deps.fetch ?? fetch, now = deps.now ?? Date.now;
  const iso = () => new Date(now()).toISOString();
  const checked = <T>(result:{data:T;error:{message:string}|null}):T => {
    if(result.error) throw new Error(`audit database: ${result.error.message}`);
    return result.data;
  };
  async function load(id:string):Promise<Order|null> {
    return checked(await admin.from("package_orders").select("*").eq("id",id).maybeSingle()) as Order|null;
  }
  function shops():Shop[] {
    return [
      {id:env.YUKASSA_TEST_SHOP_ID,key:env.YUKASSA_TEST_SECRET_KEY,test:true},
      {id:env.YUKASSA_SHOP_ID,key:env.YUKASSA_SECRET_KEY,test:false},
    ].filter(s=>s.id&&s.key) as Shop[];
  }
  async function kass<T>(shop:Shop, path:string, body?:unknown, key?:string):Promise<T> {
    const res=await http(`https://api.yookassa.ru/v3/${path}`,{
      method:body ? "POST":"GET", redirect:"error", signal:AbortSignal.timeout(30000),
      headers:{"Content-Type":"application/json",Authorization:`Basic ${Buffer.from(`${shop.id}:${shop.key}`).toString("base64")}`,...(key?{"Idempotence-Key":key}:{})},
      ...(body?{body:JSON.stringify(body)}:{}),
    });
    if(!res.ok) throw new Error(`yukassa HTTP ${res.status}`);
    return await res.json() as T;
  }
  async function verifyPayment(order:Order):Promise<Shop> {
    const available=shops().filter(s=>(order.payment_shop_id===null||s.id===order.payment_shop_id)&&(order.payment_test===null||s.test===order.payment_test));
    for(const shop of available) {
      let payment:Payment;
      try {payment=await kass<Payment>(shop,`payments/${encodeURIComponent(order.yukassa_payment_id)}`);}
      catch(e) {if(available.length>1 && e instanceof Error && e.message==='yukassa HTTP 404') continue;throw e;}
      if(payment.id!==order.yukassa_payment_id || payment.status!=="succeeded" || payment.test!==shop.test ||
         payment.amount?.currency!=="RUB" || Number(payment.amount.value)!==order.amount_rub ||
         payment.metadata?.order_id!==order.id || payment.metadata?.user_id!==order.owner_id ||
         payment.metadata?.type!=="package" || payment.metadata?.package!==order.package ||
         (payment.recipient?.account_id && payment.recipient.account_id!==shop.id)) throw new Error("Payment identity mismatch");
      if(!order.payment_verified_at) {
        checked(await admin.from("package_orders").update({payment_test:shop.test,payment_shop_id:shop.id,payment_verified_at:iso()})
          .eq("id",order.id).is("payment_verified_at",null));
      }
      return shop;
    }
    throw new Error("Payment shop unavailable; checkout flag cannot select legacy shop");
  }
  async function fail(id:string,reason:string,slaOnly=false) {
    return checked(await admin.rpc("fail_package_audit",{p_order_id:id,p_reason:reason,p_only_if_sla_breached:slaOnly}));
  }
  // The next-attempt timestamp doubles as a lease; it expires after a process crash.
  async function claim(order:Order,kind:"notification"|"refund"):Promise<number|null> {
    const old=order[`${kind}_next_attempt_at`], attempts=order[`${kind}_attempts`];
    if(!old||Date.parse(old)>now()) return null;
    const claimed=checked(await admin.from("package_orders").update({
      [`${kind}_attempts`]:attempts+1,[`${kind}_next_attempt_at`]:new Date(now()+5*60000).toISOString(),
    }).eq("id",order.id).eq(`${kind}_attempts`,attempts).eq(`${kind}_next_attempt_at`,old)
      .in(`${kind}_status`,kind==="refund"?["pending","submitted"]:["pending"]).select("id"));
    return claimed?.length ? attempts+1:null;
  }
  async function effectError(order:Order,kind:"notification"|"refund",attempt:number,error:unknown) {
    // Never persist provider response bodies, credentials or email addresses.
    const reason=error instanceof Error ? error.message.slice(0,200):"external effect failed";
    checked(await admin.from("package_orders").update({[`${kind}_last_error`]:reason})
      .eq("id",order.id).eq(`${kind}_attempts`,attempt));
  }
  async function notify(order:Order) {
    if(order.status!=="delivered"||!order.report||order.notification_status!=="pending") return;
    const attempt=await claim(order,"notification"); if(attempt===null)return;
    try {
      await deps.sendReady(order.email,order.id); // signInWithOtp is supplied by the runtime adapter.
      checked(await admin.from("package_orders").update({notification_status:"sent",notification_sent_at:iso(),notification_next_attempt_at:null,notification_last_error:null})
        .eq("id",order.id).eq("notification_attempts",attempt).eq("notification_status","pending"));
    } catch(e) {await effectError(order,"notification",attempt,e);}
  }
  async function refund(order:Order) {
    if(order.status!=="failed"||!order.paid_at||!["pending","submitted"].includes(order.refund_status))return;
    const attempt=await claim(order,"refund");if(attempt===null)return;
    try {
      const shop=await verifyPayment(order);
      const result=order.refund_id
        ? await kass<Refund>(shop,`refunds/${encodeURIComponent(order.refund_id)}`)
        : await kass<Refund>(shop,"refunds",{payment_id:order.yukassa_payment_id,amount:{value:order.amount_rub.toFixed(2),currency:"RUB"}},`refund-${order.id}`);
      if(!result.id||result.payment_id!==order.yukassa_payment_id||result.amount?.currency!=="RUB"||Number(result.amount.value)!==order.amount_rub) throw new Error("Refund identity mismatch");
      if(!["pending","succeeded"].includes(result.status))throw new Error(`Refund ${result.status}; requires attention`);
      // Verified API reconciliation also recovers a lost refund.succeeded webhook.
      checked(await admin.from("package_orders").update({refund_id:result.id,
        refund_status:result.status==="succeeded"?"succeeded":"submitted",refund_last_error:null,
        ...(result.status==="succeeded"?{status:"refunded",refunded_at:iso(),refund_next_attempt_at:null}:{}),
      }).eq("id",order.id).eq("status","failed").eq("refund_attempts",attempt));
      // R-02: оператор видит каждый подтверждённый возврат (деньги ушли клиенту).
      if(result.status==="succeeded")await deps.notifyOperator?.("order_refunded",order.id,{заказ:order.id,сумма:order.amount_rub,причина:order.failure_reason??null,refund:result.id});
    } catch(e) {await effectError(order,"refund",attempt,e);}
  }
  async function run(payload:Record<string,unknown>,context:DeliveryJobContext={attempts:1,maxAttempts:3}) {
    if(typeof payload.order_id!=="string"||!/^[0-9a-f-]{36}$/i.test(payload.order_id))throw new Error("Invalid audit order id");
    const order=await load(payload.order_id);
    if(!order)throw new Error("Audit order missing");
    if(order.status==="delivered"){await notify(order);return {status:"already_delivered"};}
    if(order.status!=="paid"){await refund(order);return {status:order.status};}
    if(context.jobId && order.job_id!==context.jobId)throw new Error("Audit job not attached to order");
    try {
      if(isSlaBreached(order.paid_at,now())) {await fail(order.id,"audit_sla_breached",true);}
      else {
        const shop=await verifyPayment(order);
        // A canary flag cannot force failure/refund for a real payment.
        if(payload.simulate==="fail" && shop.test)await fail(order.id,"test_simulated_failure");
        else {
          const token=env.AUDIT_INTERNAL_TOKEN;
          if(!token)throw new Error("AUDIT_INTERNAL_TOKEN is missing");
          const url=new URL("/api/audit",env.AUDIT_INTERNAL_URL||"http://web:3000");
          if(!["http:","https:"].includes(url.protocol)||url.username||url.password)throw new Error("Invalid internal audit URL");
          const response=await http(url,{method:"POST",redirect:"error",signal:AbortSignal.timeout(Math.max(1,Math.min(12*60000,Date.parse(order.paid_at)+60*60000-now()))),
            headers:{"Content-Type":"application/json","x-audit-internal":token},body:JSON.stringify({niche_id:order.niche_id,type:"paid"})});
          if(!response.ok)throw new Error(`Audit engine HTTP ${response.status}`);
          const raw:unknown=await response.json();
          const mode=decideDeliveryMode(raw);
          // R-01: решение «провал -> возврат» — из shared (decideRefund), не зашито здесь.
          // Причина сохраняет прежнюю семантику: контентный провал (mode=failed) всегда
          // audit_below_delivery_threshold, даже у границы SLA; SLA-провал — только если SLA реально
          // истёк (guard p_only_if_sla_breached), как раньше делал complete_package_audit.
          const sla=isSlaBreached(order.paid_at,now());
          if(decideRefund(mode,sla))await fail(order.id,mode==="failed"?"audit_below_delivery_threshold":"audit_sla_breached",mode!=="failed");
          else checked(await admin.rpc("complete_package_audit",{p_order_id:order.id,p_report:buildReportSnapshot(raw),p_mode:mode}));
        }
      }
    } catch(e) {
      if(context.attempts>=context.maxAttempts||isSlaBreached(order.paid_at,now()))await fail(order.id,"audit_attempts_exhausted");
      else throw e;
    }
    const final=await load(order.id);
    // R-02: провал оплаченного замера — алерт оператору (возврат при этом уже запущен автоматически).
    if(final&&final.status==="failed"&&order.status==="paid")await deps.notifyOperator?.("order_failed",order.id,{заказ:order.id,причина:final.failure_reason??null,сумма:order.amount_rub,возврат:final.refund_status});
    if(final){await notify(final);await refund(final);}
    return {status:final?.status??"missing"};
  }
  async function sweep() {
    const due=checked(await admin.from("package_orders").select("id").eq("status","paid").lte("sla_deadline_at",iso()).limit(100));
    // Алерты в свипе — fire-and-forget: notifyOperator никогда не бросает, а ожидание до 100 таймаутов
    // Telegram (20 с каждый) растянуло бы свип и задержало возвраты/письма того же прохода.
    for(const row of due??[]){await fail(row.id,"audit_sla_breached",true);void deps.notifyOperator?.("sla_breached",row.id,{заказ:row.id,причина:"audit_sla_breached (60 минут)"});}
    const orphaned=checked(await admin.from("package_orders").select("id").eq("status","paid").is("job_id",null).limit(100));
    for(const row of orphaned??[])checked(await admin.rpc("ensure_package_audit_job",{p_order_id:row.id}));
    // Separate limits prevent a slow/broken refund queue starving ready emails.
    for(const kind of ["notification","refund"] as const) {
      const rows=checked(await admin.from("package_orders").select("*")
        .in(`${kind}_status`,kind==="notification"?["pending"]:["pending","submitted"])
        .lte(`${kind}_next_attempt_at`,iso()).order(`${kind}_next_attempt_at`).limit(25));
      // Bound concurrency and wall time so a slow provider cannot starve the next SLA scan.
      const budgetEnd=now()+120000;
      for(let offset=0;offset<(rows??[]).length&&now()<budgetEnd;offset+=5) {
        await Promise.all((rows??[]).slice(offset,offset+5).map(row=>kind==="notification"?notify(row as Order):refund(row as Order)));
      }
    }
    await clientMail("failure");
    await clientMail("refund");
  }
  /**
   * R-01: письма клиенту о провале (failed при списанной оплате) и о возврате (refunded).
   * Идемпотентность — колонки *_email_sent_at (миграция 029); ошибка SMTP пишется в
   * *_email_last_error и повторяется на следующем свипе, возвраты от неё не зависят.
   */
  async function clientMail(kind:"failure"|"refund") {
    if(!deps.sendMail)return;
    const sentCol=`${kind}_email_sent_at`, errCol=`${kind}_email_last_error`;
    const rows=checked(await admin.from("package_orders").select("*, niches(name)")
      .eq("status",kind==="failure"?"failed":"refunded").is(sentCol,null).order("created_at").limit(5)) as Order[]|null;
    for(const order of rows??[]) {
      if(kind==="failure"&&!order.paid_at)continue; // провал оплаты без списания — письмо не нужно
      const app=(env.NEXT_PUBLIC_APP_URL||env.APP_URL||"https://neuroexpertise.ru").replace(/\/$/,"");
      const input={orderId:order.id,amountRub:order.amount_rub,statusUrl:`${app}/orders/${order.id}`,nicheName:order.niches?.name,city:order.city??undefined};
      // Claim-then-send: отметка ставится ДО отправки (guard IS NULL), чтобы параллельный свип
      // (вторая реплика worker'а) не отправил письмо дважды; при ошибке SMTP отметка снимается
      // и письмо повторяется на следующем свипе.
      const claimed=checked(await admin.from("package_orders").update({[sentCol]:iso(),[errCol]:null}).eq("id",order.id).is(sentCol,null).select("id")) as {id:string}[]|null;
      if(!claimed||claimed.length===0)continue;
      try {
        await deps.sendMail({to:order.email,...(kind==="failure"?failedPaidEmail(input):refundedEmail(input))});
      } catch(e) {
        const msg=(e instanceof Error?e.message:String(e)).slice(0,500);
        checked(await admin.from("package_orders").update({[sentCol]:null,[errCol]:msg}).eq("id",order.id));
        void deps.notifyOperator?.("email_failed",`${order.id}:${kind}`,{заказ:order.id,письмо:kind,ошибка:msg});
      }
    }
  }
  return {run,sweep};
}
