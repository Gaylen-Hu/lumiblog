import Logo from '../Logo'
import styles from './imprint.module.css'

export default function RoomImprint({ siteName }: { siteName: string }) {
  return <span className={styles.imprint}>
    <span aria-hidden="true"><Logo height={13} /></span>{siteName}
  </span>
}
