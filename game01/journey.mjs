export const CHAPTERS = [
  { id: 'nantian', name: '南天门', host: '老龙王', realm: '天庭·南天门', title: '天庭 · 南天门云阶接单', description: '架空模拟：金色云海托起天庭宫阙，南天门外的老龙王递来筋斗云号委托。大圣可自由往来八个世界，带回四印，也要接稳黑风避台。', encounters: {
    commission: ['老龙王的催命铃', '南天巨门浮在金色云海上。孙悟空刚挂起“齐天船代”招牌，筋斗云号的老龙王船长便敲响传音铃：“贤侄，东海潮水可不等人！”', '你是船代，先核对委托范围、船舶资料和联络人，再协调各方；金箍棒不能替船长签字。'],
    departure: ['第七十三变', '风雨后的云阶重新亮起，老龙王指着四印问：“这回能走了？”悟空展开一路带回的交接簿：避台衔接、现场条件与各方反馈，一项也不能漏。', '完成委托核对、四印和两项避台任务后，才能在这趟架空航次交船；船代仍不代作现场安全判断或承诺放行。'],
  }, decisions: {
    commission: { prompt: '老龙王催着开工，大圣先把哪件事办稳？', options: [
      { text: '先核对委托、资料和联系人，列清待办', correct: true, feedback: '悟空把金箍棒换成笔：职责和资料先对齐，再协调船岸各方；老龙王的催促终于有了回音。' },
      { text: '替船长答应所有时限，靠筋斗云兜底', correct: false, feedback: '筋斗云也兜不住未经确认的承诺；船代应先核对委托与资料，再明确由谁判断、由谁跟进。' },
    ] },
    departure: { prompt: '船岸条件和反馈核对齐全后，怎样完成这趟委托？', options: [
      { text: '确认条件后交船，留下完整记录', correct: true, feedback: '悟空交清已确认事项、避台反馈与后续联络，老龙王终于收起催命铃：第七十三变——变得靠谱，恭喜成为“齐天大代”！本模拟结局不代表真实监管放行或航行安全保证。' },
      { text: '四印一齐就催船强闯黑风', correct: false, feedback: '四印不是避风符；还要完成避台协作、确认现场条件和相关方反馈，船代不能替船长或责任方作安全结论。' },
    ] },
  } },
  { id: 'customs', name: '关天王', host: '关大爷', realm: '阎王殿', title: '阎王殿 · 关天王核籍', description: '架空模拟：幽冥石殿灯火不熄，关大爷借判官长案核对来往卷籍。这一殿查的是仙桃舱单、健康材料与行李，任大圣闹翻账房，事实也不能少一个零。', encounters: {
    manifest: ['七百二十变七十二', '阎王殿的巨籍翻到筋斗云号一页，关天王把两张纸铺上判官长案：“原始货单写720箱仙桃，舱单怎么只剩72箱？”悟空看了看墨池，赶紧收住想拔毫毛的手。', '先向资料提供方核实差异，再按核实结果更正并同步有效版本；变出来的章救不了错数字。'],
    health: ['健康材料对不上', '幽冥石殿两排灯火照着来往簿。关天王把健康材料与最新名单逐行核对，姓名和人数却各有出入；一张旧名单还压在巨籍的封皮下。老龙王的传音螺在安静殿里响个不停。', '材料来源和人员变动还未核实，船代应衔接提供方核对、补正并跟进反馈。'],
    baggage: ['八戒的七包点心', '八戒拎着七包点心，蹑手蹑脚经过阎王殿的石门。关天王敲敲查验案：“行李待查验，天蓬也得慢一步！”八戒望着门外，担心的倒不是判官，只是点心凉了。', '如实说明物品情况，联系船方配合查验并同步等待状态，不能靠变化把行李藏过去。'],
  }, decisions: {
    manifest: { prompt: '720箱写成72箱，怎样补上这少掉的一个零？', options: [
      { text: '核对原始舱单，确认差异后更正', correct: true, feedback: '关天王点头：先核对原始资料与提供方，再更正并同步版本；大圣的本事这次用在认真核对上。' },
      { text: '拔根毫毛变一份盖好章的舱单', correct: false, feedback: '毫毛变不了可信资料，更不能变造文件或印章；保留差异，核对来源后按确认结果更正。' },
    ] },
    health: { prompt: '健康材料与最新名单冲突，怎样回复关天王？', options: [
      { text: '先说都健康，等船开后再补材料', correct: false, feedback: '一句“都健康”不能解释资料冲突；船代应核对来源与人员变化，衔接提供方补正并跟进反馈。' },
      { text: '核对人员和材料来源，衔接补正并跟进', correct: true, feedback: '悟空逐项标出差异，交回提供方核实；把已确认与待补正分清，关天王才知道接着核对什么。' },
    ] },
    baggage: { prompt: '八戒说点心快凉了，你怎样处理待查验行李？', options: [
      { text: '如实说明物品，联系船方配合查验', correct: true, feedback: '点心可以再热，事实不能变形；如实说明并配合查验，把当前状态告诉八戒和船方。' },
      { text: '把七包行李变成芝麻，揣袖里过关', correct: false, feedback: '变化术不能代替查验；应如实说明物品，衔接船方配合并等待相关方反馈。' },
    ] },
  } },
  { id: 'maritime', name: '海天王', host: '海大爷', realm: '东海龙宫', title: '东海龙宫 · 海天王巡检', description: '架空模拟：碧水漫过龙宫穹顶，珊瑚、盘龙柱与水纹照亮殿前。海大爷在海底检查台等候：水晶宝殿再华丽，也得核实PSC整改与证书状态。', encounters: {
    psc: ['金箍棒不管修理', '东海龙宫的盘龙柱间浮着气泡，海天王把PSC检查问题单压在水晶案上：设备状态有疑问，演练记录也缺页。老龙王从殿柱后探头：“当年能借走金箍棒，这次能不能一棒搞定？”', '船代需把问题交给船长、船东及对应责任方，跟踪整改和复查反馈，不替现场宣布安全。'],
    certificate: ['过期的通行宝卷', '海底光纹掠过珊瑚与证书，海天王请悟空看清有效期——已经过了。远处莲灯映着菩萨像，清光照得再亮，也不能把过期的日期照新。', '要如实说明过期状态，衔接船方与签发相关方核实处理路径和反馈，不能改日期或许诺必能放行。'],
  }, decisions: {
    psc: { prompt: 'PSC问题单到手，船代怎样推进下一步？', options: [
      { text: '把问题交给责任方，跟踪整改与复查反馈', correct: true, feedback: '悟空把问题、责任人和待回复列入簿中；船代做好协作，由对应责任方处理并确认结果。' },
      { text: '挥棒宣布设备安全，替现场签个没问题', correct: false, feedback: '金箍棒不是检验工具；应如实传递问题、衔接责任方整改并跟进复查，不代作安全结论。' },
    ] },
    certificate: { prompt: '证书已过期，哪种处理不会让问题越变越大？', options: [
      { text: '借海天王的印，改完日期就交回', correct: false, feedback: '偷印改期会掩盖真实状态；应如实说明，联系船方及签发相关方核实后续处理并记录反馈。' },
      { text: '说明过期状态，协调核实处理并跟进反馈', correct: true, feedback: '悟空收起变化术，联系船方和签发相关方；处理进度如实同步，任何审批结果都不提前保证。' },
    ] },
  } },
  { id: 'border', name: '边天王', host: '边大爷', realm: '花果山', title: '花果山 · 边天王守水帘关', description: '架空模拟：飞瀑从花果山石壁落下，桃林通向水帘洞前的关口。边大爷守着四尊护法石像，笑问大圣：回自家山，也得把停泊经过和有效证件讲清。', encounters: {
    restricted: ['月影湾的那一锚', '花果山瀑声轰鸣，水帘洞外的桃叶被水雾打湿。边天王在护法石像旁展开航迹：“筋斗云号怎么抛在非开放的月影湾？”悟空一听是故乡近海，越发不敢替老龙王含糊过去。', '先如实汇总停泊经过、原因与已有记录，联系船方配合相关方核实处理；不能删航迹或送礼遮掩。'],
    crewbook: ['新证留在枕头下', '水帘洞前的青石案上摆着一本旧证，船员却早已换了新海员证。边天王合上竹简：“大圣认得这山路，资料却不能凭熟人放过；这趟模拟航次暂不能离港。”', '悟空须联系船方核对本人和新旧证件信息，提交有效资料并跟进核验结果，不能把旧证当新证混过去。'],
  }, decisions: {
    restricted: { prompt: '问到非开放月影湾的停泊，大圣怎样说明？', options: [
      { text: '如实说明经过，保留记录并配合核实处理', correct: true, feedback: '边天王要的是完整事实；保留航迹和原因，衔接船方配合核实处理，不能靠一句解释保证结果。' },
      { text: '删掉那段航迹，再送一篮仙桃通融', correct: false, feedback: '删记录和送礼都不能解决已发生的停泊；如实汇总经过与原因，配合相关方核实处理。' },
    ] },
    crewbook: { prompt: '新海员证已换，旧证却交上来了，怎样衔接离港事项？', options: [
      { text: '新旧反正同一个人，催边天王先放船', correct: false, feedback: '同一个人也要核对有效资料；联系船方取得新证，确认人员对应关系并跟进核验，不能催着跳过差异。' },
      { text: '联系船方核对新证，补交资料并跟进核验', correct: true, feedback: '悟空找到枕头下的新证，核对本人和证件信息后衔接补交；离港事项等待相应核验反馈。' },
    ] },
  } },
  { id: 'traffic', name: '交天王', host: '交大爷', realm: '沙海星盘驿站', title: '沙海 · 交天王的星盘驿站', description: '架空模拟：沙丘与商旅帐篷围着金色星盘，暖风扬起细沙。交大爷巡游驿道；ETA与窗口改变时，引航、拖轮都要收到同一版安排。', encounters: {
    arrival: ['筋斗云也会晚点', '星盘上的一颗船灯慢了半格：筋斗云号更新了ETA，老龙王却还按旧时间催引航，交天王的值班板上也挂着上一版。', '先核对船方新消息的来源与时间，再把最新版本和待确认项同步相关协作方；星盘只作故事里的显示，不替各方确认。'],
    window: ['错过午时的云门', '金色云路转过星盘，午时云门的通航窗口已调整。引航与拖轮仍按旧计划准备，交天王敲着刻度问：“谁手里才是最新版？”', '船代需衔接船方、交管、引航和拖轮重新核对安排，窗口变化不等于可以自行强闯。'],
  }, decisions: {
    arrival: { prompt: 'ETA更新后，怎样让大家不用旧时间办新事？', options: [
      { text: '核对新ETA来源，标记版本并同步相关方', correct: true, feedback: '悟空把来源、更新时间和待确认项一并传递；交天王、船方与服务方终于围着同一版时间协调。' },
      { text: '自己心里有数就行，等引航到了再解释', correct: false, feedback: '自己知道不能让岸上安排自动更新；核对新ETA并主动同步，才便于相关方调整衔接。' },
    ] },
    window: { prompt: '通航窗口改变，引航拖轮如何衔接？', options: [
      { text: '让船长按原窗口冲，拖轮边走边追', correct: false, feedback: '原计划不能替代新的确认；应把变化传给船方、交管、引航和拖轮，重新协调并跟进反馈。' },
      { text: '同步窗口变化，协调引航拖轮并核对新安排', correct: true, feedback: '交天王收到了统一的新安排与待确认清单；船代把协作接稳，由对应责任方确认各自条件。' },
    ] },
  } },
  { id: 'anchorage', name: '云海锚地', host: '舟小仙', realm: '烟雨渔村', title: '烟雨渔村 · 舟小仙的渡口', description: '水墨长卷 · 点击岸边漫游。细雨落过舟楫与白墙，舟小仙巡看渡口；村里的交通艇与夜班交接，一样需要清楚的联络。架空模拟，不作为实际申报依据。', encounters: {
    dispatch: ['风火轮不当交通艇', '渔村渡口旁晒着补好的网，哪吒来帮忙的小艇仍系在木桩上等条件确认。老龙王隔着海湾嚷：“让大圣驾云把人送来！”舟小仙从木屋门口抱出登轮名册，提醒大家先把话问全。', '人员登轮要衔接船方、艇方及现场责任人，明确待确认条件与备选安排，不能擅自宣布可以出艇。'],
    handover: ['沙僧的交接簿', '海边渔村的井台旁，沙僧提灯来接夜班，渡口还亮着一盏小灯。交接簿只写着“都差不多了”，两条待回复消息却还夹在悟空袖里；远处渔家已收起晒网。', '把已办事项、待回复内容、联系人和下一步写清并核对，沙僧才能接住这趟委托。'],
  }, decisions: {
    dispatch: { prompt: '交通艇条件还未确认，怎样回复催促的船长？', options: [
      { text: '如实同步待确认条件，协调艇方反馈和备选衔接', correct: true, feedback: '哪吒收好风火轮，回到艇方确认链路；船代说明当前状态并跟进，现场出艇条件由责任方判断。' },
      { text: '替艇方保证能开，先让所有人上艇等着', correct: false, feedback: '催促不能替代条件确认；应同步艇方当前反馈、衔接备选安排，不替现场作安全承诺。' },
    ] },
    handover: { prompt: '夜班要接手，怎样让沙僧知道明早该找谁？', options: [
      { text: '把袖中纸条一塞，说声师弟辛苦就走', correct: false, feedback: '一把纸条不等于明确交接；核对已办、未决、联系人和下一步，再请接班人确认收到。' },
      { text: '核对已办和待办，写清联系人并确认交接', correct: true, feedback: '沙僧这回挑的是清楚的待办担子；记录状态、跟进对象与下一步，夜班才能继续衔接。' },
    ] },
  } },
  { id: 'inspection', name: '安小王', host: '安小王', realm: '雪山炼器坊', title: '雪山 · 安小王的炼器坊', description: '架空模拟：雪落松枝，白色山脊环抱老君炼器坊，铜炉透出暖意。安小王巡看炉台，请大圣分清火眼所见和已核实的结果。', encounters: {
    equipment: ['小神的大问号', '老君炼器坊炉光正暖，安小王却在检查台上标出一处船舶设备疑问。悟空想起八卦炉里炼出的火眼：“俺老孙看着还行！”', '火眼金睛也不能代替现场检查，船代应如实传递观察、衔接船岸责任方并跟进处理；炼器仙炉不替船上设备出结论。'],
    records: ['三个版本的已完成', '铜齿轮转了三圈，安小王也翻出三份记录：船方写已完成、现场写待确认，悟空的本子却还空着。炉前的小铃催着他把依据逐项对上。', '先核对时间、来源与实际反馈，再统一状态并留下差异处理记录，不能挑最好看的一版。'],
  }, decisions: {
    equipment: { prompt: '安小王提出设备疑问，大圣的火眼金睛该怎么用？', options: [
      { text: '如实记录疑问，衔接责任方检查并跟进', correct: true, feedback: '安小王把问号交到了对应责任方手里；船代准确传递和跟进，不代替现场作安全判断。' },
      { text: '凭一眼宣布没问题，让安小王别耽误事', correct: false, feedback: '看一眼不能代替责任方检查；保留具体疑问，联系船岸责任方核实并同步处理状态。' },
    ] },
    records: { prompt: '三份记录状态不同，怎样写回交接簿？', options: [
      { text: '挑“已完成”那份抄上，纸面最省心', correct: false, feedback: '漂亮状态不能解释差异；核对记录时间、来源与责任方反馈，再更新一致状态并保留处理过程。' },
      { text: '核对来源时间和反馈，保留差异处理记录', correct: true, feedback: '悟空逐项对齐了依据，把确认结果与未决项分开记录；安小王终于合上了清单。' },
    ] },
  } },
  { id: 'typhoon', name: '黑风避台', host: '风小仙', realm: '黑风避台', title: '避台 · 黑风与定风珠', description: '架空模拟：台风云墙压向避风崖，风小仙守着定风珠观测台。芭蕉扇与宝珠是神话意象，避台仍须逐项协调确认。', encounters: {
    warning: ['黑风先到一步', '台风云墙卷起雨线，锚地旗子绷得笔直。风小仙的定风珠映出预警，老龙王却喊：“借芭蕉扇一扇，趁黑风没到冲出去！”', '宝珠与扇子只是架空故事意象，不能消除台风风险；应同步预警来源和更新时间，衔接船长、船东及相关责任方协调避台，船代不代作现场安全结论。'],
    shelter: ['避风不是一句收到', '挡风崖外黑风呼啸，崖内莲灯尚明。风小仙把定风珠放回台上：避台安排还有两项回复没到，不能把暂歇的风声当成确认，老龙王的传音螺又亮了。', '跟进避台方案、人员与服务衔接反馈，记录待确认条件；后续行动由相应责任方依据实际条件确认。'],
  }, decisions: {
    warning: { prompt: '黑风预警到了，船代应先怎样衔接？', options: [
      { text: '同步预警并协调避台，交由责任方判断现场条件', correct: true, feedback: '悟空先把预警来源和变化传到位，联系船方与相关责任方协调避台；船代不代作现场安全结论。' },
      { text: '把四印往桅杆一挂，保证黑风吹不到', correct: false, feedback: '四印挡不住黑风；应及时同步预警、衔接避台安排，不以进度或印记替代责任方判断。' },
    ] },
    shelter: { prompt: '避台还有回复未到，怎样把后续事项接稳？', options: [
      { text: '回一句已安排，直接催老龙王开船', correct: false, feedback: '已联系不等于已确认；跟进避台与服务反馈，列清未决条件，再由责任方确认后续行动。' },
      { text: '跟进避台反馈，记录待确认条件和后续联络', correct: true, feedback: '悟空逐项接回反馈，交清避台状态、条件和联络人；游戏中的避台协作已完成，真实行动仍由责任方确认。' },
    ] },
  } },
];

const chapterFor = id => {
  const chapter = CHAPTERS.find(item => item.id === id);
  if (!chapter) throw new Error(`Unknown chapter: ${id}`);
  return chapter;
};

export const freshJourney = () => ({ version: 1, selected: 'nantian', encounters: {}, settings: { volume: 0.35, sensitivity: 1 } });
export const selectChapter = (state, id) => { chapterFor(id); return { ...state, selected: id }; };
export function resolveDecision(chapterId, nodeId, index) {
  const chapter = chapterFor(chapterId);
  if (!Object.hasOwn(chapter.encounters, nodeId)) throw new Error(`Unknown encounter: ${chapterId}/${nodeId}`);
  const options = chapter.decisions[nodeId].options;
  if (!Number.isInteger(index) || index < 0 || index >= options.length) throw new RangeError(`Invalid decision index: ${index}`);
  const { correct, feedback } = options[index];
  return { correct, feedback };
}
export function recordEncounter(state, chapterId, nodeId) {
  if (!Object.hasOwn(chapterFor(chapterId).encounters, nodeId)) throw new Error(`Unknown encounter: ${chapterId}/${nodeId}`);
  if (chapterId === 'nantian' && nodeId === 'departure' && !voyageStatus(state).canDepart) throw new Error('交船条件未齐，请先完成委托、四印与避台协作');
  return { ...state, encounters: { ...state.encounters, [chapterId]: [...new Set([...(state.encounters[chapterId] || []), nodeId])] } };
}
export function chapterProgress(state, id) {
  const total = Object.keys(chapterFor(id).encounters).length;
  const count = (state.encounters[id] || []).length;
  return { count, total, complete: count === total };
}
export const completedChapters = state => CHAPTERS.filter(chapter => chapterProgress(state, chapter.id).complete).length;
export function voyageStatus(state) {
  const seals = [['customs', '海关印'], ['maritime', '海事印'], ['border', '边防印'], ['traffic', '交管印']].map(([id, name]) => ({ id, name, complete: chapterProgress(state, id).complete }));
  const stormReady = chapterProgress(state, 'typhoon').complete;
  const commissioned = (state.encounters.nantian || []).includes('commission');
  const missing = [...(!commissioned ? ['委托核对'] : []), ...seals.filter(seal => !seal.complete).map(seal => seal.name), ...(!stormReady ? ['避台协作'] : [])];
  return { seals, stormReady, canDepart: missing.length === 0, finished: (state.encounters.nantian || []).includes('departure'), missing };
}
export function updateSettings(state, changes) {
  const settings = { ...state.settings };
  for (const [key, min, max] of [['volume', 0, 1], ['sensitivity', 0.3, 2]]) {
    if (Number.isFinite(changes[key])) settings[key] = Math.max(min, Math.min(max, changes[key]));
  }
  return { ...state, settings };
}
export function restoreJourney(json) {
  const state = freshJourney();
  let saved;
  try { saved = JSON.parse(json); } catch { return state; }
  if (!saved || Array.isArray(saved) || saved.version !== 1) return state;
  if (CHAPTERS.some(chapter => chapter.id === saved.selected)) state.selected = saved.selected;
  if (saved.encounters && typeof saved.encounters === 'object') for (const chapter of CHAPTERS) {
    const nodes = saved.encounters[chapter.id];
    if (Array.isArray(nodes)) {
      const valid = [...new Set(nodes.filter(id => typeof id === 'string' && Object.hasOwn(chapter.encounters, id)))];
      if (valid.length) state.encounters[chapter.id] = valid;
    }
  }
  if (state.encounters.nantian?.includes('departure') && !voyageStatus(state).canDepart) {
    state.encounters.nantian = state.encounters.nantian.filter(id => id !== 'departure');
    if (!state.encounters.nantian.length) delete state.encounters.nantian;
  }
  return updateSettings(state, saved.settings || {});
}
