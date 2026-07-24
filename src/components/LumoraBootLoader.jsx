export function LumoraBootLoader() {
  return (
    <div className="lumora-boot" role="status" aria-live="polite" aria-label="云栖境正在加载">
      <div className="boot-moon-halo" />
      <div className="boot-mark-wrap">
        <img alt="" className="boot-mark" src="/lumora-assets/brand/lumora-mark.png" />
        <span className="boot-gear-backdrop" />
        <span className="boot-gear">
          <i className="boot-clock-hand boot-clock-hour" />
          <i className="boot-clock-hand boot-clock-minute" />
        </span>
        <span className="boot-star boot-star-one" />
        <span className="boot-star boot-star-two" />
        <span className="boot-star boot-star-three" />
        <span className="boot-cloud-curl boot-cloud-curl-left" />
        <span className="boot-cloud-curl boot-cloud-curl-right" />
      </div>
      <div className="boot-copy">
        <strong>云栖境</strong>
        <span>云门正在开启</span>
      </div>
      <div className="boot-progress" aria-hidden="true"><span /></div>
    </div>
  )
}
