const stages = [
  { className: "br-node-intent", index: "01", label: "Намерение", value: "1 240", note: "поисков" },
  { className: "br-node-proof", index: "02", label: "Доверие", value: "214", note: "переходов" },
  { className: "br-node-contact", index: "03", label: "Контакт", value: "38", note: "обращений" },
  { className: "br-node-sale", index: "04", label: "Запись", value: "13", note: "продаж" },
] as const;

export function BusinessDemandPath() {
  return (
    <div className="br-scene" aria-label="Маршрут спроса от поиска до продажи">
      <SceneHeader />
      <div className="br-route-map">
        <RouteLines />
        {stages.map((stage) => <StageNode key={stage.index} {...stage} />)}
        <div className="br-leak-note">
          <span>РАЗРЫВ / 03</span>
          <strong>17 обращений без ответа</strong>
          <small>потенциал возврата: 6 продаж</small>
        </div>
      </div>
      <div className="br-scene-footer">
        <span>SEARCH</span><i /><span>PROOF</span><i /><span>CONTACT</span><i /><span>REVENUE</span>
      </div>
    </div>
  );
}

function SceneHeader() {
  return (
    <div className="br-scene-header">
      <div><i /><span>DEMAND ROUTE / LIVE</span></div>
      <span>ЕКАТЕРИНБУРГ · 14:32</span>
    </div>
  );
}

function RouteLines() {
  const route = "M54 302 C145 302 166 92 297 92 S418 282 509 266 S600 127 674 127";
  return (
    <svg className="br-route-lines" viewBox="0 0 720 390" role="img" aria-hidden="true">
      <path className="br-route-grid" d={route} />
      <path className="br-route-signal" d={route} />
      <circle className="br-flow-dot" r="6">
        <animateMotion dur="8s" repeatCount="indefinite" path={route} />
      </circle>
    </svg>
  );
}

function StageNode({ className, index, label, value, note }: (typeof stages)[number]) {
  return (
    <div className={`br-stage-node ${className}`}>
      <div className="br-node-marker"><span>{index}</span><i /></div>
      <div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
    </div>
  );
}
