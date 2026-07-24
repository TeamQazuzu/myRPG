// ============================================
// 《寻亲风云录》商店/交易系统
// ============================================

// 商店系统全局对象
var ShopSystem = {

  // ========== 商店数据库 ==========
  // 每个商店包含名称、店主和商品列表
  shops: {
    greyVillage_general: {
      id: 'greyVillage_general',
      name: '灰烟村杂货店',
      owner: '米拉',
      desc: '灰烟村里唯一的杂货铺，米拉总是笑盈盈的。',
      items: [
        {
          id: 'shop_potion_s',
          name: '小型生命药水',
          type: 'consumable',
          price: 30,
          healHp: 40,
          healMp: 0,
          desc: '恢复40点生命',
          key: 'potion_s',
        },
        {
          id: 'shop_potion_m',
          name: '中型生命药水',
          type: 'consumable',
          price: 80,
          healHp: 100,
          healMp: 0,
          desc: '恢复100点生命',
          key: 'potion_m',
        },
        {
          id: 'shop_ether_s',
          name: '小型法力药水',
          type: 'consumable',
          price: 40,
          healHp: 0,
          healMp: 30,
          desc: '恢复30点法力',
          key: 'ether_s',
        },
        {
          id: 'shop_bread',
          name: '面包',
          type: 'consumable',
          price: 10,
          healHp: 20,
          healMp: 0,
          desc: '恢复20点生命',
          key: 'bread',
        },
        {
          id: 'shop_arrow',
          name: '箭矢（一组20支）',
          type: 'material',
          price: 25,
          desc: '一组20支箭矢，游侠的必备消耗品',
        },
        {
          id: 'shop_iron_ore',
          name: '铁矿石x3',
          type: 'material',
          price: 50,
          desc: '三块铁矿石，锻造的基础材料',
        },
      ],
    },
  },

  // ========== 获取商店商品列表 ==========
  getShopItems: function(shopId) {
    var shop = this.shops[shopId];
    if (!shop) {
      console.warn('[商店] 商店不存在:', shopId);
      return [];
    }
    // 返回商品列表的深拷贝，避免外部修改
    return JSON.parse(JSON.stringify(shop.items));
  },

  // ========== 获取商店信息 ==========
  getShopInfo: function(shopId) {
    var shop = this.shops[shopId];
    if (!shop) return null;
    return {
      id: shop.id,
      name: shop.name,
      owner: shop.owner,
      desc: shop.desc,
      itemCount: shop.items.length,
    };
  },

  // ========== 购买商品 ==========
  buy: function(state, shopId, itemIdx) {
    var shop = this.shops[shopId];
    if (!shop) {
      return { ok: false, message: '商店不存在' };
    }
    if (itemIdx < 0 || itemIdx >= shop.items.length) {
      return { ok: false, message: '无效的商品索引' };
    }
    var shopItem = shop.items[itemIdx];
    var price = shopItem.price || 0;

    // 检查金币是否足够
    if (!StateUtils.spendGold(state, price)) {
      return { ok: false, message: '金币不足，需要 ' + price + ' 金' };
    }

    // 检查背包容量
    if (state.inventory.items.length >= state.inventory.capacity) {
      // 退还金币
      StateUtils.addGold(state, price);
      return { ok: false, message: '背包已满' };
    }

    // 构建购买物品
    var boughtItem = {
      id: Utils.uuid(),
      name: shopItem.name,
      type: shopItem.type || 'material',
      price: shopItem.price || 0,
      stack: 1,
    };
    // 消耗品附加效果属性
    if (shopItem.type === 'consumable') {
      boughtItem.healHp = shopItem.healHp || 0;
      boughtItem.healMp = shopItem.healMp || 0;
      if (shopItem.desc) boughtItem.desc = shopItem.desc;
    } else {
      if (shopItem.desc) boughtItem.desc = shopItem.desc;
    }

    // 添加到背包
    var addResult = StateUtils.addToInventory(state, boughtItem);
    if (!addResult.ok) {
      // 退还金币
      StateUtils.addGold(state, price);
      return { ok: false, message: addResult.reason || '无法添加到背包' };
    }

    console.log('[商店] 购买了:', shopItem.name, '价格:', price);
    return { ok: true, message: '购买了 ' + shopItem.name + '，花费 ' + price + ' 金', item: boughtItem };
  },

  // ========== 卖出物品 ==========
  sell: function(state, itemId) {
    if (!state || !state.inventory) {
      return { ok: false, message: '状态数据异常' };
    }
    var items = state.inventory.items || [];
    var idx = -1;
    var targetItem = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === itemId) {
        idx = i;
        targetItem = items[i];
        break;
      }
    }
    if (idx === -1 || !targetItem) {
      return { ok: false, message: '物品不存在于背包中' };
    }

    // 卖出价格为原价的50%，price为0的也卖0
    var sellPrice = Math.floor((targetItem.price || 0) * 0.5);

    // 从背包中移除
    state.inventory.items.splice(idx, 1);

    // 增加金币
    StateUtils.addGold(state, sellPrice);

    console.log('[商店] 卖出了:', targetItem.name, '获得:', sellPrice, '金');
    return { ok: true, message: '卖出了 ' + targetItem.name + '，获得 ' + sellPrice + ' 金', gold: sellPrice };
  },
};

// 导出
try { module.exports = ShopSystem; } catch(e) {}
