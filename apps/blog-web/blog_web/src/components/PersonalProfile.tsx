import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import styles from './PersonalProfile.module.css'

export default function PersonalProfile({ name }: { name: string }) {
  const t = useTranslations('about.profile')

  return (
    <header className={styles.note}>
      <h1>{t('greeting', { name: name.trim() })}</h1>
      <p className={styles.birthday}>{t('birthdayLine')}</p>
      <p>{t('intro')}</p>
      <p>{t('study')}</p>
      <p>{t.rich('invitation', {
        letter: (text) => <Link href="/letters" prefetch={false}>{text}</Link>,
      })}</p>
    </header>
  )
}
