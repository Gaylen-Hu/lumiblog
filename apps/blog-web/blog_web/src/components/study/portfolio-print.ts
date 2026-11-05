// Two original edition prints. The laptop texture and the HTML edition use
// exactly the same paths, so the cover artwork survives the camera handoff.
export function editionPrint(index: number) {
  if (index % 2 === 0) {
    const leaves = Array.from({length: 12}, (_, i) => {
      const x = 34 + i * 2.1, y = 56 - i * 2.4
      return `M${x} ${y} Q99 ${y - 12} 150 80 Q207 ${y - 9} ${300-x} ${y}`
    }).join(' ')
    return { ground:'#34574f', ink:'#f1e6c9', accent:'#d0a775',
      shape:'M155 29 a13 13 0 1 0 26 0 a13 13 0 1 0 -26 0', lines:leaves }
  }
  // A letterpress stack of ruled index cards, with a visible fore-edge.
  const sheets = Array.from({length:6}, (_,i) => `M67 ${43+i*3.3} l69 26 97 -33`).join(' ')
  return { ground:'#e2b497', ink:'#7a4839', accent:'#a45c42',
    shape:'M67 59.5 l69 26 97 -33 v-16.5 l-97 33 -69 -26 Z',
    lines:`M67 43 l97 -33 69 26 -97 33 Z ${sheets} M101 43 l46 -16 M113 47 l63 -22 M125 51 l56 -19` }
}

export function paintPortfolioCover(ctx: CanvasRenderingContext2D, titles: readonly string[], en: boolean) {
  ctx.fillStyle = '#f3eee3'; ctx.fillRect(0,0,768,424)
  ctx.fillStyle = '#34574f'; ctx.font = '16px Georgia'; ctx.fillText('LumiBlog',51,35)
  ctx.fillRect(51,47,666,1)
  ctx.font = '48px Georgia, "SimSun", serif'; ctx.fillText(en ? 'Works' : '作品',50,119)
  ctx.font = 'italic 25px Georgia'; ctx.fillText('Selected Works',en ? 198 : 165,116)
  ctx.fillStyle = '#786c5a'; ctx.font = '12px monospace'; ctx.fillText('LUMI WORKSPACE',52,148)
  titles.slice(0,2).forEach((title,index) => {
    const x=51+index*341, y=174, print=editionPrint(index)
    ctx.fillStyle='#fcf9f1'; ctx.fillRect(x,y,325,202)
    ctx.save(); ctx.translate(x+12,y+10); ctx.fillStyle=print.ground; ctx.fillRect(0,0,301,98)
    ctx.fillStyle=print.accent; ctx.fill(new Path2D(print.shape))
    ctx.strokeStyle=print.ink; ctx.lineWidth=1.35; ctx.stroke(new Path2D(print.lines)); ctx.restore()
    ctx.fillStyle='#313d36'; ctx.font='25px Georgia'; ctx.fillText(title,x+16,y+145,290)
    ctx.fillStyle='#c7bfae'; ctx.fillRect(x+16,y+164,195,2); ctx.fillRect(x+16,y+177,155,2)
  })
}
