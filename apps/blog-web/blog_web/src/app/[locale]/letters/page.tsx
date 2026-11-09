import { StandaloneLetterPaper } from '@/components/study/LetterPaper'

export default async function LettersPage({params}:{params:Promise<{locale:string}>}) {
  const {locale} = await params
  return <StandaloneLetterPaper locale={locale}/>
}
