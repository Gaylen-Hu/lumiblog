import LetterPaper from '@/components/study/LetterPaper'

export default async function LettersPage({params}:{params:Promise<{locale:string}>}) {
  const {locale} = await params
  return <LetterPaper locale={locale}/>
}
