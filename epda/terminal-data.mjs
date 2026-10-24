import { ROUTES } from './routes.mjs';

// Names printed in the facility column of the Zhoushan pilotage tariff table:
// https://www.zspilot.com.cn/news_viewn.asp?newsid=603&LM=150
// Keep combined facility descriptions intact when the source does not give
// separate official names (for example, the Yushan liquid/oil/multipurpose piers).
const GROUPS = [
  ['route-01', ['宝钢马迹山码头']],
  ['route-03', ['嵊泗浦远绿华山散货减载平台']],
  ['route-04', ['广厦能源黄泽山石油中转储运项目码头', '浙江友联修造船有限公司']],
  ['route-07', ['舟山鼠浪湖码头有限公司矿石中转码头']],
  ['route-09', ['舟山中集长宏船舶修造有限公司', '金海重工股份有限公司', '舟山惠生海洋工程有限公司']],
  ['route-10', ['岱山华丰船舶修造有限公司']],
  ['route-12', ['中东港务码头']],
  ['route-14', ['常石集团(舟山)造船有限公司', '舟山市原野船舶修造有限公司']],
  ['route-16', ['浙江石油化工有限公司液化、油品、多用途码头']],
  ['route-19', ['浙江石油化工有限公司干散货码头']],
  ['route-20', ['舟山长宏国际船舶再生利用有限公司', '太平洋海洋工程（舟山）有限公司', '招商局港口（舟山）滚装码头']],
  ['route-22', ['舟山中天重工有限公司']],
  ['route-24', ['中海石油舟山石化有限公司码头', '世纪太平洋化工品中转基地码头']],
  ['route-26', ['舟山惠群远洋渔业发展有限公司远洋渔业码头']],
  ['route-28', ['综保区新港码头', '舟山华丰船舶修造有限公司']],
  ['route-29', ['新奥（舟山）LNG码头']],
  ['route-31', ['建桥能源西蟹峙码头', '舟山大神洲造船有限公司', '浙江半岛船业有限公司']],
  ['route-34', ['中化兴中石油转运（舟山）有限公司码头', '大鼎油储岙山油品码头']],
  ['route-37', ['舟山市宏洲船舶修造有限责任公司', '舟山隆昇船业有限公司', '舟山市海晨船务工程有限责任公司']],
  ['route-40', ['舟山群岛国际邮轮港有限公司邮轮码头', '台贸物流滚装公用码头']],
  ['route-41', ['舟山普陀长宏船舶修造有限公司', '万邦船舶重工（舟山）有限公司']],
  ['route-44', ['舟山市天元船舶修造有限公司']],
  ['route-47', ['中谷储运液货码头', '海洋石化油品码头', '舟山纳海油污水处理有限公司码头']],
  ['route-51', ['舟山市册子船业有限公司', '舟山南洋之星船业有限公司', '舟山实华原油码头', '外钓油品公共码头', '光汇石油储运（舟山）有限公司码头']],
  ['route-55', ['中海油物流老塘山码头', '浙江和润物流有限公司码头', '舟山中海粮油工业有限公司老塘山码头', '舟山港务老塘山散货码头及减载平台']],
  ['route-60', ['舟山市金舟船厂', '舟山市沥港船舶修造公司']],
  ['route-64', ['浙江舟山武港码头']],
  ['route-67', ['舟山市金润石油转运有限公司码头']],
  ['route-69', ['舟山市龙山船厂有限公司', '舟山中远海运重工有限公司', '舟山市鑫亚船舶修造有限公司']],
  ['route-71', ['浙能港口舟山煤电码头', '浙江海港中奥能源有限责任公司码头']],
  ['route-74', ['舟山亚泰船舶修造工程有限公司']],
];

const routeById = new Map(ROUTES.map((route) => [route.id, route]));

export const TERMINALS = GROUPS.flatMap(([routeId, names]) => {
  const reference = routeById.get(routeId);
  const routeIds = ROUTES.filter((route) => route.port === reference.port
    && route.workArea === reference.workArea
    && route.sites === reference.sites).map((route) => route.id);
  return names.map((name) => ({ name, port: reference.port, workArea: reference.workArea, routeIds }));
});
