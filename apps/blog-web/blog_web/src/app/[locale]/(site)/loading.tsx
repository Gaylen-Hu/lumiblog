import { getLocale } from 'next-intl/server'
import PaperLoading from '@/components/study/PaperLoading'
export default async function Loading() { return <PaperLoading locale={await getLocale()} /> }
