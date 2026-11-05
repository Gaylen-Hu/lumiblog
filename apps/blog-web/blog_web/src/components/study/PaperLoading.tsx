export default function PaperLoading({ locale = 'zh' }: { locale?: string }) {
  return <div className="study-loading" role="status" aria-live="polite">
    <div className="study-paper-loader" aria-hidden="true"><i /><i /><i /></div>
    <p>{locale === 'en' ? 'Unfolding a new page…' : '正在翻开新的一页…'}</p>
  </div>
}
