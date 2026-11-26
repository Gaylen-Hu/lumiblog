// Literal shortcuts work without an AI connection; prose and negations do not.
const commands = new Map([
  ['开灯', 'ceiling_on'], ['打开顶灯', 'ceiling_on'], ['关灯', 'ceiling_off'], ['关闭顶灯', 'ceiling_off'],
  ['打开台灯', 'lamp_on'], ['开台灯', 'lamp_on'], ['关闭台灯', 'lamp_off'], ['关台灯', 'lamp_off'],
  ['台灯自动', 'lamp_auto'], ['恢复自动台灯', 'lamp_auto'],
  ['打开窗帘', 'curtains_open'], ['拉开窗帘', 'curtains_open'], ['关闭窗帘', 'curtains_close'], ['拉上窗帘', 'curtains_close'],
  ['turn on the light', 'ceiling_on'], ['turn off the light', 'ceiling_off'],
  ['turn on the lamp', 'lamp_on'], ['turn off the lamp', 'lamp_off'],
  ['open the curtains', 'curtains_open'], ['close the curtains', 'curtains_close'],
]);
const replies = {ceiling_on:'顶灯打开啦。',ceiling_off:'顶灯关好了。',lamp_on:'台灯打开啦。',lamp_off:'台灯关好了。',lamp_auto:'台灯会跟着房间的光线变化啦。',curtains_open:'窗帘拉开啦。',curtains_close:'窗帘合上啦。'};
export function matchSiteCommand(text) {
  return commands.get(String(text).trim().replace(/^小灰[，,、\s]*/, '').replace(/[。！!\s]+$/, '').toLowerCase()) || null;
}
export async function runSiteCommand(website, value) {
  if (!website?.getCapabilities?.()?.site?.includes(value)) return {status:'blocked',reason:'这里暂时不能控制书房，请回到有房间的页面再试。'};
  const result = await website.execute(value);
  return {...result, ...(result?.status === 'succeeded' ? {message:replies[value]} : {})};
}
