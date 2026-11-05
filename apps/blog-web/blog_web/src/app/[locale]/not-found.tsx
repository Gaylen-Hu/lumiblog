import { getLocale } from 'next-intl/server'
export default async function NotFound() {
  const en = await getLocale() === 'en'
  return <div className="magazine-error">
    <p className="study-imprint">404 / A MISSING PAGE</p>
    <h1>{en ? 'This page is not on the shelf.' : '这页纸，暂时不在书架上。'}</h1>
    <p>{en ? 'The link may have changed. You can return to the study and choose another book.' : '也许链接已变更。回到书房，再选一本书吧。'}</p>
  </div>
}
