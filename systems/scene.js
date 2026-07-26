// systems/scene.js - 帧式场景管理（重写版）
class SceneManager {
  constructor() {
    this.currentScene = null;
    this.currentCombat = null;
    this.scenes = this.buildScenes();
    this.enemyData = this.buildEnemyData();
  }

  // ========== 场景数据 ==========
  buildScenes() {
    return {
      // ===== 灰烟村·村口（中心枢纽）=====
      '灰烟村': {
        id: 'greyVillage_hub',
        type: 'safe',
        name: '灰烟村',
        desc: '你长大的地方。炉火噼啪作响，艾琳坐在窗边擦拭她的弓。外面天快黑了。',
        actions: [
          { label: '与艾琳对话', type: 'talk', target: 'ailin' },
        ],
        exits: ['灰烟村_酒馆', '灰烟村_铁匠铺', '灰烟村_荒地', '灰烟村_矿脉', '灰烟村_药草园', '灰烟村_村长家', '灰烟村_鱼塘', '灰烟村_杂货铺', '灰烟村_练功场', '灰烟村_后山小径', '灰烟村_裁缝铺', '灰烟村_皮匠铺', '灰烟村_村医屋', '灰烟村_墓地', '灰烟村_北山古道', '灰烟村_地下城入口'],
      },
      // ===== 灰烟村·酒馆 =====
      '灰烟村_酒馆': {
        id: 'greyVillage_tavern',
        type: 'safe',
        name: '酒馆',
        desc: '温暖的酒馆，飘着麦酒和烤肉的香气。墙上挂着一张旧地图，边角已经泛黄。',
        actions: [
          { label: '休息（恢复HP/MP）', type: 'rest' },
          { label: '查看旧地图', type: 'inspect', target: 'old_map' },
        ],
        exits: ['灰烟村'],
      },
      // ===== 灰烟村·铁匠铺 =====
      '灰烟村_铁匠铺': {
        id: 'greyVillage_blacksmith',
        type: 'safe',
        name: '铁匠铺',
        desc: '叮叮当当的打铁声不绝于耳。铁匠老哈正在炉前锻造，火花四溅。',
        actions: [
          { label: '与铁匠老哈交谈', type: 'talk', target: 'blacksmith' },
        ],
        exits: ['灰烟村'],
      },
      // ===== 灰烟村·村边荒地（战斗帧·6只野狗）=====
      '灰烟村_荒地': {
        id: 'greyVillage_wasteland',
        type: 'wild',
        name: '村边荒地',
        desc: '酒馆后面的荒地。杂草丛生，几块散落的石头露在地表。远处传来野狗低沉的咆哮声——一群野狗正在垃圾堆间游荡，数量不少。',
        actions: [
          { label: '迎战野狗群', type: 'battle', enemies: ['野狗','野狗','野狗','野狗','野狗','野狗'] },
          { label: '探索荒地', type: 'explore' },
        ],
        exits: ['灰烟村'],
      },
      // ===== 灰烟村·石头矿脉（采集帧）=====
      '灰烟村_矿脉': {
        id: 'greyVillage_mine',
        type: 'wild',
        name: '村边矿脉',
        desc: '一小块裸露的岩石层，能看到一些石头矿脉。老奎说这里以前出产过铁矿石，现在只剩些普通石头了。',
        actions: [
          { label: '采集石头', type: 'gather', target: '石头', amount: 3 },
          { label: '挂机采集', type: 'idle_gather', target: '石头' },
          { label: '深入矿脉', type: 'explore' },
        ],
        exits: ['灰烟村'],
      },

      // ===== 灰烟村·药草园（采集帧）=====
      '灰烟村_药草园': {
        id: 'greyVillage_herbGarden',
        type: 'wild',
        name: '药草园',
        desc: '村西头一片用篱笆围起来的小园子，里面种着各种药草。空气中弥漫着苦涩的草药味，几株不知名的野花在角落里顽强地开着。偶尔能看到毒蛇在草丛中穿梭。',
        actions: [
          { label: '采集草药', type: 'gather', target: '草药', amount: 2 },
          { label: '挂机采集', type: 'idle_gather', target: '草药' },
          { label: '驱赶毒蛇', type: 'battle', enemies: ['毒蛇', '毒蛇'] },
          { label: '搜索篱笆角落', type: 'explore' },
        ],
        exits: ['灰烟村'],
      },

      // ===== 灰烟村·村长家（对话帧）=====
      '灰烟村_村长家': {
        id: 'greyVillage_chiefHouse',
        type: 'safe',
        name: '村长家',
        desc: '村中心一栋比其他房屋都宽敞的砖房。门口挂着褪色的匾额，上面依稀写着"济世堂"三个字。村长老奎正坐在堂前的太师椅上，手里捻着一串旧念珠，眉头紧锁。',
        actions: [
          { label: '与村长老奎对话', type: 'talk', target: 'chief_kui' },
          { label: '查看墙上的家谱', type: 'inspect', target: 'family_tree' },
        ],
        exits: ['灰烟村'],
      },

      // ===== 灰烟村·村东鱼塘（采集帧）=====
      '灰烟村_鱼塘': {
        id: 'greyVillage_fishPond',
        type: 'wild',
        name: '村东鱼塘',
        desc: '村子东边的一口天然鱼塘，水面碧绿，倒映着远处灰蒙蒙的山脊。塘边水草丰茂，几只野鸭在水面悠闲地游荡。偶尔能看到螃蟹在浅滩处吐泡泡。',
        actions: [
          { label: '抓螃蟹', type: 'battle', enemies: ['螃蟹', '螃蟹', '螃蟹'] },
          { label: '采集水草', type: 'gather', target: '水草', amount: 2 },
          { label: '挂机采集', type: 'idle_gather', target: '水草' },
        ],
        exits: ['灰烟村'],
      },

      // ===== 灰烟村·杂货铺（对话帧·可触发商店）=====
      '灰烟村_杂货铺': {
        id: 'greyVillage_grocery',
        type: 'safe',
        name: '杂货铺',
        desc: '一间拥挤但收拾得井井有条的小铺子。货架上摆满了日用品、干粮和一些廉价的药水。掌柜是个精明的中年女人，人称"三婶"，据说什么都有货。',
        actions: [
          { label: '与三婶攀谈', type: 'talk', target: 'grocery_sanshen' },
        ],
        exits: ['灰烟村'],
      },

      // ===== 灰烟村·练功场（战斗帧·切磋）=====
      '灰烟村_练功场': {
        id: 'greyVillage_trainingGround',
        type: 'wild',
        name: '练功场',
        desc: '村子北面一块平整的沙地，几根木桩上插着磨损的草靶。几个村中练兵正在这里操练，旁边立着一块木牌，上面写着"擅入切磋，自负伤损"。',
        actions: [
          { label: '向练兵切磋', type: 'battle', enemies: ['练兵'] },
          { label: '挑战全场练兵', type: 'battle', enemies: ['练兵', '练兵', '练兵'] },
        ],
        exits: ['灰烟村'],
      },

      // ===== 灰烟村·后山小径（战斗帧·山贼）=====
      '灰烟村_后山小径': {
        id: 'greyVillage_mountainTrail',
        type: 'wild',
        name: '后山小径',
        desc: '一条通往后山的狭窄土路，两侧灌木丛生，视线受阻。地上散落着几个被丢弃的包袱和碎布条——看来山贼经常在此出没，劫路过往的行人。',
        actions: [
          { label: '清剿山贼', type: 'battle', enemies: ['山贼', '山贼'] },
          { label: '查看丢弃的包袱', type: 'inspect', target: 'abandoned_bag' },
          { label: '采集灌木果子', type: 'gather', target: '野果', amount: 1 },
        ],
        exits: ['灰烟村'],
      },

      // ===== 灰烟村·裁缝铺（对话帧）=====
      '灰烟村_裁缝铺': {
        id: 'greyVillage_tailor',
        type: 'safe',
        name: '裁缝铺',
        desc: '一间充满布料味道的小屋。各色布匹整齐地堆在木架上，缝纫机旁散落着线头和碎布。裁缝玛莎正低头缝着一件斗篷，身旁的学徒小柯在整理线轴。',
        actions: [
          { label: '与裁缝玛莎交谈', type: 'talk', target: 'tailor_masha' },
          { label: '与学徒小柯交谈', type: 'talk', target: 'tailor_ke' },
        ],
        exits: ['灰烟村'],
      },

      // ===== 灰烟村·皮匠铺（对话帧）=====
      '灰烟村_皮匠铺': {
        id: 'greyVillage_leather',
        type: 'safe',
        name: '皮匠铺',
        desc: '浓重的皮革气息扑面而来。墙上挂着几张硝好的兽皮，工作台上摆着各种皮匠工具。皮匠诺恩正在给一双皮靴收边，抬头看了你一眼。',
        actions: [
          { label: '与皮匠诺恩交谈', type: 'talk', target: 'leather_nuen' },
        ],
        exits: ['灰烟村'],
      },

      // ===== 灰烟村·村医屋（对话帧·可恢复）=====
      '灰烟村_村医屋': {
        id: 'greyVillage_doctor',
        type: 'safe',
        name: '村医屋',
        desc: '草药味浓重的小屋。木架上整整齐齐地排列着各种药瓶和草药包，空气中弥漫着苦涩的药香。村医蕾娜正在研钵里研磨着什么，见你进来，头也不抬。',
        actions: [
          { label: '与村医蕾娜交谈', type: 'talk', target: 'doctor_leina' },
          { label: '请蕾娜治疗（恢复50% HP）', type: 'heal_partial' },
        ],
        exits: ['灰烟村'],
      },

      // ===== 灰烟村·墓地（对话帧）=====
      '灰烟村_墓地': {
        id: 'greyVillage_graveyard',
        type: 'safe',
        name: '墓地',
        desc: '村西一片安静的墓地。几座旧坟上长满了青草，石碑上的字迹已被风雨侵蚀得模糊不清。一个佝偻的身影蹲在最远处的一座坟前——那是守墓人老格。',
        actions: [
          { label: '与守墓人老格交谈', type: 'talk', target: 'gravekeeper_ge' },
          { label: '查看墓碑', type: 'inspect', target: 'old_tombstones' },
        ],
        exits: ['灰烟村'],
      },

      // ===== 灰烟村·北山古道（区域传送门·需击败村长后解锁）=====
      '灰烟村_北山古道': {
        id: 'greyVillage_northTrail',
        type: 'wild',
        name: '北山古道',
        desc: '通往灰烬山脉的古道。路面碎石嶙峋，两侧的山崖越来越陡峭。空气中弥漫着一股若有若无的焦糊味——灰烬山脉离此不远了。远处隐约可见一座废弃的哨塔。',
        actions: [
          { label: '搜索路边的破旧马车', type: 'explore' },
        ],
        exits: ['灰烟村'],
        portal: {
          target: 'ashMountains',
          targetScene: '灰烬山脉_入口',
          exitName: '前往灰烬山脉',
          requirement: 'villageChief',
          blockedMsg: '古道前方被浓雾封锁，你感到一股强大的力量在阻止你前进。也许应该先去找村长谈谈......',
        },
      },

      // ===== 灰烟村·地下城入口（副本第1层 Lv.4-6）=====
      '灰烟村_地下城入口': {
        id: 'greyVillage_dungeon_1',
        type: 'wild',
        zone: 'greyVillage_dungeon',
        name: '地下城入口',
        desc: '村外废弃地窖的入口，阴冷的气息从下方涌出。破旧的木门半掩着，里面传来骨头碰撞的咔嗒声。比打野狗体面得多——至少有宝可拿。',
        actions: [
          { label: '清剿前厅骷髅', type: 'battle', enemies: ['骷髅兵','骷髅兵','骷髅兵'] },
          { label: '搜索前厅', type: 'explore' },
        ],
        exits: ['灰烟村', '灰烟村_地下城深处'],
      },
      // ===== 灰烟村·地下城深处（副本第2层 Lv.7-9）=====
      '灰烟村_地下城深处': {
        id: 'greyVillage_dungeon_2',
        type: 'wild',
        zone: 'greyVillage_dungeon',
        name: '地下城深处',
        desc: '幽暗的甬道，墙壁爬满蛛网。远处有幽绿色的光点在闪烁——那不是友好的东西。',
        actions: [
          { label: '迎战深处生物', type: 'battle', enemies: ['地牢蜘蛛','骷髅弓手','地牢蜘蛛'] },
          { label: '探索甬道', type: 'explore' },
        ],
        exits: ['灰烟村_地下城入口', '灰烟村_地下城底层'],
      },
      // ===== 灰烟村·地下城底层（副本第3层 Lv.10-12）=====
      '灰烟村_地下城底层': {
        id: 'greyVillage_dungeon_3',
        type: 'wild',
        zone: 'greyVillage_dungeon',
        name: '地下城底层',
        desc: '地牢的最深处，空气浑浊得令人窒息。一个高大的身影在阴影中伫立，似乎在守护着什么。击败这里能让你离挑战村长更近一步。',
        actions: [
          { label: '挑战底层守卫', type: 'battle', enemies: ['地牢守卫','骷髅法师','地牢食尸鬼'] },
          { label: '搜查底层', type: 'explore' },
        ],
        exits: ['灰烟村_地下城深处'],
      },

      // =============================================
      // ===== 灰烬山脉区域（Lv.21-40）=====
      // =============================================

      // ===== 灰烬山脉·入口（区域安全枢纽）=====
      '灰烬山脉_入口': {
        id: 'ashMountains_entrance',
        type: 'safe',
        name: '灰烬山脉·入口',
        zone: 'ashMountains',
        desc: '你站在灰烬山脉的边缘。灰色的岩石和焦黑的树桩延伸到远方，地面上偶尔能看到被烧焦的骨头。一条蜿蜒的小路分出几条岔道。远处山腰上，一座废弃的哨塔在灰雾中若隐若现。',
        actions: [
          { label: '休息（恢复HP/MP）', type: 'rest' },
          { label: '查看路标', type: 'inspect', target: 'ash_mountain_sign' },
        ],
        exits: ['灰烬山脉_山脚洞', '灰烬山脉_废弃仓库', '灰烬山脉_河岸洞穴', '灰烬山脉_路边坟', '灰烬山脉_旧矿道'],
        // 返回灰烟村的传送门
        portal: {
          target: 'greyVillage',
          targetScene: '灰烟村',
          exitName: '返回灰烟村',
          requirement: null,
          blockedMsg: '',
        },
      },

      // ===== 灰烬山脉·山脚洞（战斗帧）=====
      '灰烬山脉_山脚洞': {
        id: 'ashMountains_cave',
        type: 'wild',
        name: '山脚洞',
        zone: 'ashMountains',
        desc: '灰烬山脉脚下的一处天然洞穴。洞口被枯藤遮掩，里面传来低沉的嘶嘶声。地上散落着白色的骨渣——是某种动物的骨头。洞壁上刻着模糊的符号，像是某种警告。',
        actions: [
          { label: '清理洞穴中的生物', type: 'battle', enemies: ['山洞蝙蝠', '山洞蝙蝠', '山洞蝙蝠', '灰烬狼'] },
          { label: '深入洞穴', type: 'explore' },
          { label: '采集洞穴矿石', type: 'gather', target: '灰烬矿石', amount: 2 },
          { label: '挂机采集', type: 'idle_gather', target: '灰烬矿石' },
        ],
        exits: ['灰烬山脉_入口'],
      },

      // ===== 灰烬山脉·废弃仓库（战斗/采集帧）=====
      '灰烬山脉_废弃仓库': {
        id: 'ashMountains_warehouse',
        type: 'wild',
        name: '废弃仓库',
        zone: 'ashMountains',
        desc: '一座半坍塌的巨大石砌建筑。残破的屋顶下堆满了锈蚀的铁箱和散落的木材。角落里有一口破旧的水缸，上面蒙着厚厚的灰尘。这里似乎曾经是某个组织的物资中转站。',
        actions: [
          { label: '与仓库守卫交战', type: 'battle', enemies: ['灰烬守卫', '灰烬守卫'] },
          { label: '搜索仓库', type: 'explore' },
          { label: '采集旧木材', type: 'gather', target: '旧木材', amount: 3 },
          { label: '与流浪商人阿莫斯交谈', type: 'talk', target: 'ash_merchant_amos' },
        ],
        exits: ['灰烬山脉_入口'],
      },

      // ===== 灰烬山脉·河岸洞穴（战斗帧）=====
      '灰烬山脉_河岸洞穴': {
        id: 'ashMountains_riverCave',
        type: 'wild',
        name: '河岸洞穴',
        zone: 'ashMountains',
        desc: '一条浑浊的河流从灰烬山脉中流出，河岸上有一处被水侵蚀的洞穴。洞穴入口处布满青苔，洞内传来滴答的水声。水面上漂浮着奇怪的黑色油膜。',
        actions: [
          { label: '清剿河岸生物', type: 'battle', enemies: ['石像鬼', '石像鬼', '灰烬猎犬'] },
          { label: '探索洞穴深处', type: 'explore' },
          { label: '采集河岸水草', type: 'gather', target: '灰烬水草', amount: 2 },
          { label: '挂机采集', type: 'idle_gather', target: '灰烬水草' },
        ],
        exits: ['灰烬山脉_入口'],
      },

      // ===== 灰烬山脉·路边坟（对话/战斗帧）=====
      '灰烬山脉_路边坟': {
        id: 'ashMountains_graves',
        type: 'wild',
        name: '路边坟',
        zone: 'ashMountains',
        desc: '古道旁的一片荒坟。几十座无名的土包排列得整整齐齐，每座坟前都插着一根烧焦的木桩。没有墓碑，没有名字——这些人是被匆忙掩埋的。最远处有一座稍大的石棺，上面刻着奇怪的花纹。',
        actions: [
          { label: '与掘墓人幽魂交谈', type: 'talk', target: 'ash_grave_digger' },
          { label: '查看石棺', type: 'inspect', target: 'stone_sarcophagus' },
          { label: '驱赶亡灵', type: 'battle', enemies: ['焦骨战士', '焦骨战士', '幽灵矿工'] },
          { label: '探索荒坟', type: 'explore' },
        ],
        exits: ['灰烬山脉_入口'],
      },

      // ===== 灰烬山脉·旧矿道（战斗/采集帧）=====
      '灰烬山脉_旧矿道': {
        id: 'ashMountains_mine',
        type: 'wild',
        name: '旧矿道',
        zone: 'ashMountains',
        desc: '一条深入山体的旧矿道。轨道上停着锈蚀的矿车，墙壁上的油灯早已熄灭。深处传来金属碰撞的声响——不像是自然形成的。矿道分岔口立着一块木牌，上面写着"禁止通行"，但字迹已经模糊不清。矿道尽头似乎通向更深的地方......',
        actions: [
          { label: '清剿矿道中的生物', type: 'battle', enemies: ['矿道爬虫', '矿道爬虫', '矿道爬虫', '废弃傀儡'] },
          { label: '探索矿道深处', type: 'explore' },
          { label: '采集铁矿', type: 'gather', target: '铁矿', amount: 3 },
          { label: '挂机采集', type: 'idle_gather', target: '铁矿' },
        ],
        exits: ['灰烬山脉_入口'],
        portal: {
          target: 'ashMines',
          targetScene: '灰烬矿场_入口',
          exitName: '深入矿道前往灰烬矿场',
          requirement: 'nightWatcher',
          blockedMsg: '矿道深处的铁门紧锁，上面刻着组织的徽记。你需要先击败守夜人才能通过。',
        },
      },

      // =============================================
      // ===== 灰烬矿场区域（Lv.41-60）=====
      // =============================================

      // ===== 灰烬矿场·入口（区域安全枢纽）=====
      '灰烬矿场_入口': {
        id: 'ashMines_entrance',
        type: 'safe',
        name: '灰烬矿场·入口',
        zone: 'ashMines',
        desc: '穿过厚重的铁门，你踏入了一个巨大的地下空间。高耸的石壁上嵌满了生锈的铁轨和管道，远处隐约可见矿车的灯光在黑暗中移动。空气潮湿而闷热，夹杂着金属摩擦的刺耳声响。一条主通道分出几条岔路，分别通向矿场的不同区域。',
        actions: [
          { label: '休息（恢复HP/MP）', type: 'rest' },
          { label: '查看矿场公告板', type: 'inspect', target: 'mine_notice_board' },
        ],
        exits: ['灰烬矿场_无底洞矿场', '灰烬矿场_旧矿镇', '灰烬矿场_归童坊', '灰烬矿场_铁矿裂隙', '灰烬矿场_机械之守殿堂'],
        portal: {
          target: 'ashMountains',
          targetScene: '灰烬山脉_入口',
          exitName: '返回灰烬山脉',
          requirement: null,
          blockedMsg: '',
        },
      },

      // ===== 灰烬矿场·无底洞矿场（战斗/采集帧·Lv.41-45）=====
      '灰烬矿场_无底洞矿场': {
        id: 'ashMines_abyssMine',
        type: 'wild',
        name: '无底洞矿场',
        zone: 'ashMines',
        desc: '一个直径数十米的巨大竖井向下延伸，看不到底。矿道沿着井壁螺旋而下，每隔一段就有一个开采平台。井壁上布满了密密麻麻的钻孔和炸痕。深处偶尔传来岩石崩落的回响，以及某种昆虫窸窸窣窣的爬行声。',
        actions: [
          { label: '清剿矿道虫群', type: 'battle', enemies: ['矿场虫群', '矿场虫群', '矿场矿工亡灵'] },
          { label: '深入竖井', type: 'explore' },
          { label: '采集精炼矿石', type: 'gather', target: '精炼矿石', amount: 2 },
          { label: '挂机采集', type: 'idle_gather', target: '精炼矿石' },
        ],
        exits: ['灰烬矿场_入口'],
      },

      // ===== 灰烬矿场·旧矿镇（安全/对话帧·Lv.43-48）=====
      '灰烬矿场_旧矿镇': {
        id: 'ashMines_oldTown',
        type: 'safe',
        name: '旧矿镇',
        zone: 'ashMines',
        desc: '矿场中心的一片区域，曾经是矿工们的居住区。残破的石屋沿着矿道两侧排列，有些还亮着微弱的灯光。几个面容憔悴的矿工在巷道里游荡，眼神空洞。一个戴着护目镜的老人坐在一口破锅旁，旁边堆满了各种机械零件。',
        actions: [
          { label: '与机械师老铁交谈', type: 'talk', target: 'mine_mechanic_tie' },
          { label: '与游荡矿工交谈', type: 'talk', target: 'mine_wanderer' },
          { label: '休息（恢复HP/MP）', type: 'rest' },
        ],
        exits: ['灰烬矿场_入口'],
      },

      // ===== 灰烬矿场·归童坊（战斗/剧情帧·Lv.46-52）=====
      '灰烬矿场_归童坊': {
        id: 'ashMines_childWorkshop',
        type: 'wild',
        name: '归童坊',
        zone: 'ashMines',
        desc: '一个被铁栅栏围起来的封闭区域。里面摆满了小型的作业台和工具架——这些工具的尺寸明显是为儿童设计的。墙上钉着泛黄的规章制度，内容让你不寒而栗。几个机械哨兵在栅栏外巡逻，红色的光眼不断扫描着周围。',
        actions: [
          { label: '击毁巡逻哨兵', type: 'battle', enemies: ['机械哨兵', '机械哨兵', '铁链魔像'] },
          { label: '查看规章制度', type: 'inspect', target: 'child_workshop_rules' },
          { label: '搜索作业台', type: 'explore' },
        ],
        exits: ['灰烬矿场_入口'],
      },

      // ===== 灰烬矿场·铁矿裂隙（战斗/采集帧·Lv.48-55）=====
      '灰烬矿场_铁矿裂隙': {
        id: 'ashMines_ironRift',
        type: 'wild',
        name: '铁矿裂隙',
        zone: 'ashMines',
        desc: '一道巨大的裂缝横贯矿场深处，裂缝两侧暴露出丰富的铁矿脉。炽热的蒸汽从裂缝中不断涌出，温度高得令人窒息。裂缝深处传来金属撞击的声响——不是自然形成的。地面散落着破碎的机械零件和不知名的合金碎片。',
        actions: [
          { label: '与矿场守卫交战', type: 'battle', enemies: ['精炼傀儡', '精炼傀儡', '深渊矿蛛'] },
          { label: '采集深渊铁矿', type: 'gather', target: '深渊铁矿', amount: 2 },
          { label: '挂机采集', type: 'idle_gather', target: '深渊铁矿' },
          { label: '探索裂缝深处', type: 'explore' },
        ],
        exits: ['灰烬矿场_入口'],
      },

      // ===== 灰烬矿场·机械之守殿堂（Boss帧）=====
      '灰烬矿场_机械之守殿堂': {
        id: 'ashMines_guardianHall',
        type: 'boss',
        name: '机械之守殿堂',
        zone: 'ashMines',
        desc: '矿场最深处的一座巨大殿堂。穹顶上悬挂着无数齿轮和管道，缓缓转动。殿堂中央矗立着一座三米高的机械巨人，浑身覆盖着厚重的装甲板，双眼散发着冰冷的蓝光。它的胸口嵌着一块脉动的核心——那是一颗被禁锢的心脏。',
        actions: [
          { label: '挑战机械之守', type: 'boss', gatekeeper: 'mechanicalGuard' },
        ],
        exits: ['灰烬矿场_入口'],
      },
    };
  }

  // ========== 敌人数据 ==========
  buildEnemyData() {
    return {
      '野狗': { name: '野狗', level: 2, hp: 30, maxHp: 30, attack: 5, defense: 2, speed: 10, exp: 30, gold: 6, drop: { name: '狗牙', type: 'material', rarity: 'white' } },
      '野兔': { name: '野兔', level: 1, hp: 15, maxHp: 15, attack: 3, defense: 1, speed: 15, exp: 8, gold: 2 },
      '野鸭': { name: '野鸭', level: 1, hp: 20, maxHp: 20, attack: 5, defense: 1, speed: 12, exp: 10, gold: 3 },
      '螃蟹': { name: '螃蟹', level: 1, hp: 25, maxHp: 25, attack: 6, defense: 5, speed: 5, exp: 12, gold: 4 },
      // ===== 灰烟村扩展敌人 =====
      '毒蛇': { name: '毒蛇', level: 2, hp: 22, maxHp: 22, attack: 8, defense: 2, speed: 13, exp: 25, gold: 5, drop: { name: '蛇皮', type: 'material', rarity: 'white' } },
      '练兵': { name: '村练兵', level: 3, hp: 50, maxHp: 50, attack: 9, defense: 6, speed: 8, exp: 40, gold: 12, drop: { name: '练功牌', type: 'material', rarity: 'green' } },
      '山贼': { name: '山贼', level: 3, hp: 45, maxHp: 45, attack: 11, defense: 4, speed: 9, exp: 45, gold: 18, drop: { name: '山贼令牌', type: 'material', rarity: 'green' } },
      // ===== 灰烟村地下城敌人（Lv.4-12，填补打野狗到村长Lv20的经验缺口）=====
      '骷髅兵': { name: '骷髅兵', level: 4, hp: 60, maxHp: 60, attack: 12, defense: 5, speed: 7, exp: 55, gold: 10, drop: { name: '骷髅碎片', type: 'material', rarity: 'white' } },
      '骷髅弓手': { name: '骷髅弓手', level: 6, hp: 70, maxHp: 70, attack: 16, defense: 6, speed: 11, exp: 80, gold: 15, drop: { name: '断裂的箭矢', type: 'material', rarity: 'white' } },
      '地牢蜘蛛': { name: '地牢蜘蛛', level: 7, hp: 85, maxHp: 85, attack: 18, defense: 8, speed: 14, exp: 95, gold: 18, drop: { name: '蛛丝', type: 'material', rarity: 'green' } },
      '骷髅法师': { name: '骷髅法师', level: 9, hp: 100, maxHp: 100, attack: 24, defense: 8, speed: 10, exp: 130, gold: 25, drop: { name: '法力残渣', type: 'material', rarity: 'green' } },
      '地牢守卫': { name: '地牢守卫', level: 11, hp: 150, maxHp: 150, attack: 30, defense: 18, speed: 8, exp: 180, gold: 40, drop: { name: '守卫铁牌', type: 'material', rarity: 'blue' } },
      '地牢食尸鬼': { name: '地牢食尸鬼', level: 12, hp: 170, maxHp: 170, attack: 34, defense: 14, speed: 12, exp: 210, gold: 50, drop: { name: '腐肉', type: 'material', rarity: 'green' } },
      // ===== 灰烬山脉敌人（Lv.21-40）=====
      '山洞蝙蝠': { name: '山洞蝙蝠', level: 21, hp: 180, maxHp: 180, attack: 35, defense: 15, speed: 18, exp: 80, gold: 25, drop: { name: '蝙蝠翼膜', type: 'material', rarity: 'white' } },
      '灰烬狼': { name: '灰烬狼', level: 23, hp: 250, maxHp: 250, attack: 45, defense: 20, speed: 16, exp: 120, gold: 35, drop: { name: '灰烬狼皮', type: 'material', rarity: 'green' } },
      '灰烬守卫': { name: '灰烬守卫', level: 25, hp: 350, maxHp: 350, attack: 55, defense: 35, speed: 12, exp: 180, gold: 50, drop: { name: '守卫腰牌', type: 'material', rarity: 'green' } },
      '石像鬼': { name: '石像鬼', level: 27, hp: 400, maxHp: 400, attack: 60, defense: 50, speed: 8, exp: 220, gold: 60, drop: { name: '石像碎片', type: 'material', rarity: 'green' } },
      '灰烬猎犬': { name: '灰烬猎犬', level: 24, hp: 220, maxHp: 220, attack: 50, defense: 18, speed: 22, exp: 150, gold: 40, drop: { name: '猎犬獠牙', type: 'material', rarity: 'white' } },
      '焦骨战士': { name: '焦骨战士', level: 28, hp: 450, maxHp: 450, attack: 65, defense: 30, speed: 10, exp: 250, gold: 70, drop: { name: '焦骨碎片', type: 'material', rarity: 'blue' } },
      '幽灵矿工': { name: '幽灵矿工', level: 30, hp: 380, maxHp: 380, attack: 70, defense: 25, speed: 14, exp: 280, gold: 80, drop: { name: '矿工灵魂碎片', type: 'material', rarity: 'blue' } },
      '矿道爬虫': { name: '矿道爬虫', level: 22, hp: 200, maxHp: 200, attack: 40, defense: 25, speed: 15, exp: 100, gold: 30, drop: { name: '虫壳', type: 'material', rarity: 'white' } },
      '废弃傀儡': { name: '废弃傀儡', level: 32, hp: 600, maxHp: 600, attack: 75, defense: 55, speed: 6, exp: 350, gold: 100, drop: { name: '傀儡零件', type: 'material', rarity: 'blue' } },
      // ===== 灰烬矿场敌人（Lv.41-60）=====
      '矿场虫群': { name: '矿场虫群', level: 41, hp: 1200, maxHp: 1200, attack: 130, defense: 55, speed: 20, exp: 500, gold: 150, drop: { name: '矿虫甲壳', type: 'material', rarity: 'green' } },
      '矿场矿工亡灵': { name: '矿工亡灵', level: 43, hp: 1400, maxHp: 1400, attack: 150, defense: 60, speed: 12, exp: 600, gold: 180, drop: { name: '亡灵矿灯', type: 'material', rarity: 'green' } },
      '机械哨兵': { name: '机械哨兵', level: 45, hp: 1800, maxHp: 1800, attack: 170, defense: 100, speed: 16, exp: 750, gold: 220, drop: { name: '哨兵零件', type: 'material', rarity: 'blue' } },
      '铁链魔像': { name: '铁链魔像', level: 48, hp: 2200, maxHp: 2200, attack: 200, defense: 140, speed: 8, exp: 900, gold: 280, drop: { name: '魔像铁链', type: 'material', rarity: 'blue' } },
      '精炼傀儡': { name: '精炼傀儡', level: 50, hp: 2800, maxHp: 2800, attack: 230, defense: 160, speed: 14, exp: 1100, gold: 350, drop: { name: '精炼核心', type: 'material', rarity: 'blue' } },
      '深渊矿蛛': { name: '深渊矿蛛', level: 52, hp: 2500, maxHp: 2500, attack: 260, defense: 120, speed: 24, exp: 1200, gold: 400, drop: { name: '蛛丝合金', type: 'material', rarity: 'purple' } },
      '机械巡逻兵': { name: '机械巡逻兵', level: 55, hp: 3200, maxHp: 3200, attack: 290, defense: 180, speed: 18, exp: 1400, gold: 450, drop: { name: '巡逻兵芯片', type: 'material', rarity: 'purple' } },
      '暴走机甲': { name: '暴走机甲', level: 58, hp: 4000, maxHp: 4000, attack: 340, defense: 220, speed: 10, exp: 1700, gold: 550, drop: { name: '机甲残骸', type: 'material', rarity: 'purple' } },
    };
  }

  // ========== 进入场景 ==========
  enterScene(sceneName) {
    console.log('[场景] 进入:', sceneName);
    const scene = this.scenes[sceneName];
    if (!scene) {
      console.error('[场景] 场景不存在:', sceneName);
      return;
    }
    this.currentScene = scene;

    // 更新玩家位置
    if (window.gameApp && window.gameApp.state) {
      window.gameApp.state.player.location = scene.name;
    }

    // ===== 守夜人暗杀铺垫事件检查（灰烬山脉场景）=====
    var ambushBlocked = this.checkNightwatcherAmbush(scene);
    if (ambushBlocked) {
      // 暗杀事件已自行派发 scene-change，跳过后续流程
      return;
    }

    // ===== 场景事件钩子 =====
    var eventResult = this.checkSceneEvents(scene);
    if (eventResult && eventResult.blocked) {
      // 事件阻断了正常场景进入（如暗杀事件触发战斗）
      return;
    }

    const evt = new CustomEvent('scene-change', { detail: { scene: scene } });
    document.dispatchEvent(evt);
  }

  // ========== 守夜人暗杀铺垫事件（37级/38级各一次）==========
  // 在灰烬山脉区域触发，让玩家意识到Boss存在
  checkNightwatcherAmbush(scene) {
    if (!window.gameApp || !window.gameApp.state) return;
    var state = window.gameApp.state;
    var player = state.player;
    if (!player || !player.canPlay || player.dead) return;

    // 检查是否在灰烬山脉区域（场景名以 '灰烬山脉' 开头 或 id 以 'ashMountains' 开头）
    var sceneId = scene.id || '';
    var sceneName = scene.name || '';
    var isAshMountains = sceneName.indexOf('灰烬山脉') === 0 || sceneId.indexOf('ashMountains') === 0;
    if (!isAshMountains) return;

    // 检查守夜人是否已被击败
    var nightWatcherDefeated = state.world && state.world.gatekeepers && state.world.gatekeepers.nightWatcher && state.world.gatekeepers.nightWatcher.defeated;
    if (nightWatcherDefeated) return;

    // 确保 state.world.flags 存在
    if (!state.world.flags) state.world.flags = {};

    // 37级触发第一次暗杀
    if (player.level === 37 && !state.world.flags.nightwatcher_ambush_37) {
      this.triggerNightwatcherAmbush(37);
      return true; // 阻断正常场景流程
    }
    // 38级触发第二次暗杀
    else if (player.level === 38 && !state.world.flags.nightwatcher_ambush_38) {
      this.triggerNightwatcherAmbush(38);
      return true; // 阻断正常场景流程
    }

    return false; // 未触发暗杀事件，正常进入场景
  }

  // ========== 触发守夜人暗杀事件 ==========
  triggerNightwatcherAmbush(level) {
    var self = this;
    var state = window.gameApp.state;

    // 先渲染场景画面
    var scene = this.currentScene;
    var evt = new CustomEvent('scene-change', { detail: { scene: scene } });
    document.dispatchEvent(evt);

    console.log('[场景事件] 守夜人暗杀事件触发！等级:', level);

    // 延迟0.5秒后开始暗杀叙事
    setTimeout(function() {
      // 第一段叙事文本
      var event1 = new CustomEvent('game-log', {
        detail: { message: '一股寒意从背后袭来。你下意识侧身，一道银光擦过你的耳边——有人想暗杀你。' }
      });
      document.dispatchEvent(event1);
    }, 500);

    // 延迟2秒后：低语
    setTimeout(function() {
      var event2 = new CustomEvent('game-log', {
        detail: { message: '黑影中传来低语：\'……还不到时候。\' 然后消失。' }
      });
      document.dispatchEvent(event2);
    }, 2500);

    // 延迟4秒后：触发战斗
    setTimeout(function() {
      var player = self.getPlayerData();
      if (!player) return;
      var allies = self.getAllyUnits();

      // 构建暗影刺客单位（固定属性）
      var assassin = {
        id: 'ambush_shadow_assassin_' + level,
        name: '暗影刺客',
        level: 40,
        hp: 3000,
        maxHp: 3000,
        attack: 450,
        defense: 50,
        speed: 45,
        exp: 0,
        gold: 0,
        type: 'elite',
        critRate: 35,
        aiStrategy: 'aggressive',
        drop: { name: '组织铭牌碎片', type: 'quest', rarity: 'purple' },
      };

      var combat = new CombatEngine();
      combat.maxRounds = 15; // 暗杀战短回合
      window.currentCombat = combat;
      self.currentCombat = combat;

      // 开场日志
      combat.combatLog.push('暗影刺客从暗处现身，手中匕首闪着冷光。');

      // 设置标记（防止重复触发）
      var flagKey = 'nightwatcher_ambush_' + level;
      state.world.flags[flagKey] = true;

      // 战斗结束后显示铺垫叙事（无论胜负）
      var origEndCombat = combat.endCombat.bind(combat);
      combat.endCombat = function(result) {
        origEndCombat(result);
        // 延迟2秒显示战后叙事
        setTimeout(function() {
          self.showLog('那个人……不像是山里的强盗。他身上的铭牌，你从未见过。');
        }, 2000);
      };

      combat.startCombat(player, allies, [assassin]);
    }, 4500);
  }

  // ========== 场景事件系统 ==========
  checkSceneEvents(scene) {
    if (!window.gameApp || !window.gameApp.state) return null;
    var state = window.gameApp.state;
    var player = state.player;
    if (!player || !player.canPlay || player.dead) return null;

    // 暗杀事件已移至独立方法 checkNightwatcherAmbush

    return null;
  }

  // ========== 守夜人暗杀事件（旧版，已废弃，保留空壳兼容）==========
  showAmbushEvent() {
    // 已由 checkNightwatcherAmbush + triggerNightwatcherAmbush 替代
  }

  // ========== 触发战斗（手动）==========
  triggerBattle(enemyNames) {
    console.log('[战斗] 触发战斗，敌人:', enemyNames.join(', '));
    const player = this.getPlayerData();
    if (!player) {
      console.error('[战斗] 没有玩家数据');
      return;
    }

    // 构建敌人单位
    const enemies = enemyNames.map((name, i) => {
      const data = this.enemyData[name];
      if (!data) {
        console.error('[战斗] 找不到敌人数据:', name);
        return null;
      }
      return {
        ...data,
        id: 'enemy_' + Date.now() + '_' + i,
        status: 'normal',
        hp: data.hp,
        maxHp: data.maxHp,
      };
    }).filter(e => e !== null);

    if (enemies.length === 0) {
      console.error('[战斗] 没有有效敌人');
      return;
    }

    // 构建己方队伍（主角 + 随从）
    const allies = this.getAllyUnits();

    const combat = new CombatEngine();
    window.currentCombat = combat;
    this.currentCombat = combat;
    combat.startCombat(player, allies, enemies);
  }

  // ========== 获取玩家战斗数据 ==========
  getPlayerData() {
    try {
      if (window.gameApp && window.gameApp.state && window.gameApp.state.player) {
        const p = window.gameApp.state.player;
        // 确保战斗属性存在
        p.maxHp = p.maxHp || 100;
        p.hp = p.hp || p.maxHp;
        p.maxMp = p.maxMp || 30;
        p.mp = p.mp || p.maxMp;
        p.speed = p.speed || 10;
        p.attack = p.attack || 10;
        p.defense = p.defense || 5;
        return p;
      }
      return null;
    } catch (e) {
      console.error('[战斗] 获取玩家失败:', e);
      return null;
    }
  }

  // ========== 获取随从战斗数据 ==========
  getAllyUnits() {
    try {
      if (window.gameApp && window.gameApp.state && window.gameApp.state.companions) {
        return window.gameApp.state.companions.filter(c => c.alive !== false).map(c => {
          // 根据职业分配AI策略
          var aiStrategy = c.aiStrategy || 'balanced';
          if (!c.aiStrategy && c.class) {
            if (c.class === 'warrior') aiStrategy = 'aggressive';
            else if (c.class === 'mage') aiStrategy = 'healer';
            else aiStrategy = 'balanced';
          }
          return {
            id: c.id,
            name: c.name,
            level: c.level || 1,
            hp: c.hp || 80,
            maxHp: c.maxHp || 80,
            mp: c.mp || 20,
            maxMp: c.maxMp || 20,
            attack: c.attack || 8,
            defense: c.defense || 3,
            speed: c.speed || 8,
            isCompanion: true,
            status: 'normal',
            aiStrategy: aiStrategy,
          };
        });
      }
      return [];
    } catch (e) {
      console.error('[随从] 获取随从失败:', e);
      return [];
    }
  }

  // ========== 采集资源 ==========
  gather(target, amount) {
    console.log('[采集] 采集:', target, 'x' + amount);
    const item = {
      id: Utils.uuid(),
      name: target,
      type: 'material',
      rarity: 'white',
      level: 1,
      stack: amount,
    };
    if (window.gameApp && window.gameApp.state) {
      const result = StateUtils.addToInventory(window.gameApp.state, item);
      if (result.ok) {
        const msg = `采集获得 ${target} x${amount}`;
        this.showLog(msg);
      } else {
        this.showLog(result.reason || '背包已满');
      }
    }
  }

  // ========== 保存挂机状态到存档（用于离线结算） ==========
  saveIdleGatherState(target) {
    if (window.gameApp && window.gameApp.state) {
      window.gameApp.state.world.idleGather = {
        target: target,
        startTime: new Date().toISOString(),
      };
      // 立即保存存档
      if (window.gameApp.saveGame) {
        window.gameApp.saveGame();
      }
      console.log('[挂机采集] 已保存挂机状态:', target);
    }
  }

  // ========== 挂机采集系统 ==========
  // 模拟多次采集循环，有概率遇到敌人或发现稀有物品
  idleGather(target, cycles) {
    var totalCycles = cycles || 8;
    var results = {
      target: target,
      cycles: totalCycles,
      itemsGathered: 0,
      goldFound: 0,
      enemiesEncountered: 0,
      enemyDefeated: 0,
      rareFinds: [],
      log: [],
    };

    console.log('[挂机采集] 开始，目标:', target, '循环数:', totalCycles);

    for (var i = 1; i <= totalCycles; i++) {
      var roll = Math.random();
      var cycleLog = '第' + i + '轮：';

      if (roll < 0.70) {
        // 70%：采集成功
        var amount = 1 + Math.floor(Math.random() * 3); // 1-3个
        var item = {
          id: Utils.uuid(),
          name: target,
          type: 'material',
          rarity: 'white',
          level: 1,
          stack: amount,
        };
        if (window.gameApp && window.gameApp.state) {
          var addResult = StateUtils.addToInventory(window.gameApp.state, item);
          if (addResult.ok) {
            results.itemsGathered += amount;
            cycleLog += '采集获得 ' + target + ' x' + amount;
          } else {
            cycleLog += '背包已满，采集中断';
            results.log.push(cycleLog);
            break;
          }
        } else {
          results.itemsGathered += amount;
          cycleLog += '采集获得 ' + target + ' x' + amount;
        }
      } else if (roll < 0.85) {
        // 15%：遇到敌人（自动战斗，简化处理）
        results.enemiesEncountered++;
        var enemyAtk = 5 + Math.floor(Math.random() * 5);
        var enemyHp = 20 + Math.floor(Math.random() * 20);
        var playerAtk = 10;
        if (window.gameApp && window.gameApp.state) {
          playerAtk = window.gameApp.state.player.attack || 10;
        }
        // 简化自动战斗
        var rounds = Math.ceil(enemyHp / Math.max(1, playerAtk));
        var playerDmg = Math.floor(enemyAtk * rounds * 0.6);
        if (window.gameApp && window.gameApp.state) {
          window.gameApp.state.player.hp = Math.max(1, window.gameApp.state.player.hp - playerDmg);
        }
        var goldReward = 3 + Math.floor(Math.random() * 8);
        if (window.gameApp && window.gameApp.state) {
          StateUtils.addGold(window.gameApp.state, goldReward);
        }
        results.goldFound += goldReward;
        results.enemyDefeated++;
        cycleLog += '遇到敌人！战斗胜利，获得 ' + goldReward + ' 金币，损失 ' + playerDmg + ' HP';
      } else if (roll < 0.95) {
        // 10%：发现金币
        var gold = 2 + Math.floor(Math.random() * 6);
        if (window.gameApp && window.gameApp.state) {
          StateUtils.addGold(window.gameApp.state, gold);
        }
        results.goldFound += gold;
        cycleLog += '发现 ' + gold + ' 金币';
      } else {
        // 5%：发现稀有物品
        var rareItem = {
          id: Utils.uuid(),
          name: '精炼' + target,
          type: 'material',
          rarity: 'green',
          level: 1,
          stack: 1,
        };
        if (window.gameApp && window.gameApp.state) {
          var rareResult = StateUtils.addToInventory(window.gameApp.state, rareItem);
          if (rareResult.ok) {
            results.rareFinds.push(rareItem.name);
            cycleLog += '✨ 发现稀有物品：' + rareItem.name;
          } else {
            cycleLog += '背包已满，无法拾取稀有物品';
          }
        } else {
          results.rareFinds.push(rareItem.name);
          cycleLog += '✨ 发现稀有物品：' + rareItem.name;
        }
      }

      results.log.push(cycleLog);
    }

    // 更新玩家信息
    if (window.gameApp && window.gameApp.updatePlayerInfo) {
      window.gameApp.updatePlayerInfo();
    }

    console.log('[挂机采集] 完成', results);
    return results;
  }

  // ========== 与NPC对话（委托给DialogueSystem）==========
  talkTo(npcId) {
    if (DialogueSystem) {
      DialogueSystem.startDialogue(npcId);
    } else {
      console.warn('[场景] DialogueSystem 未加载，无法与NPC对话:', npcId);
      this.showLog('对话系统不可用。');
    }
  }

  // ========== 休息恢复 ==========
  rest() {
    if (window.gameApp && window.gameApp.state) {
      const p = window.gameApp.state.player;
      p.hp = p.maxHp;
      p.mp = p.maxMp;
      this.showLog('你好好休息了一觉，HP和MP已完全恢复。');
      window.gameApp.updatePlayerInfo();
    }
  }

  // ========== 村医部分恢复 ==========
  healPartial() {
    if (window.gameApp && window.gameApp.state) {
      const p = window.gameApp.state.player;
      var beforeHp = p.hp;
      var beforeMp = p.mp;
      p.hp = Math.min(p.maxHp, p.hp + Math.floor(p.maxHp * 0.5));
      p.mp = Math.min(p.maxMp, p.mp + Math.floor(p.maxMp * 0.3));
      var healHp = p.hp - beforeHp;
      var healMp = p.mp - beforeMp;
      var msg = '蕾娜给你敷了草药，';
      if (healHp > 0) msg += '恢复 ' + healHp + ' HP';
      if (healMp > 0) msg += (healHp > 0 ? '，' : '') + '恢复 ' + healMp + ' MP';
      if (healHp === 0 && healMp === 0) msg += '但你已经满血了。';
      this.showLog(msg);
      window.gameApp.updatePlayerInfo();
    }
  }

  // ========== 构建守门员Boss单位数据 ==========
  buildGatekeeperUnit(gkId) {
    var gkData = DATA && DATA.gatekeepers && DATA.gatekeepers[gkId] ? DATA.gatekeepers[gkId] : null;
    if (!gkData) {
      console.error('[场景] 未找到守门员数据:', gkId);
      return null;
    }
    var combat = gkData.combat || {};
    var level = gkData.level || 20;
    // 基础属性按等级缩放（与普通怪一致的公式但使用Boss配置）
    var hp = combat.hp || Math.floor(level * 50 * 5);
    var atk = combat.atk || Math.floor(level * 8 * 2);
    var def = combat.armor || Math.floor(level * 4);
    var spd = Math.floor(level * 2 + 5);
    var critRate = (combat.crit || 0.1) * 100; // 转为百分比
    var unit = {
      id: 'boss_' + gkId,
      name: gkData.name || '守门员',
      level: level,
      hp: hp,
      maxHp: hp,
      attack: atk,
      defense: def,
      speed: spd,
      exp: Math.floor(level * 20 * 10), // Boss经验倍率10x
      gold: Math.floor(level * 5 * 5),
      type: 'boss',
      critRate: critRate,
      critMultiplier: 2.0,
      drop: { name: gkData.reward || '守门员令牌', type: 'quest', rarity: 'orange' },
      aiStrategy: 'aggressive',
      bossRegen: false,
      bossSkillInterval: 0,
      bossSkillTurnCount: 0,
    };
    console.log('[场景] 构建守门员单位:', unit.name, 'Lv', level, 'HP:', hp, 'ATK:', atk, 'DEF:', def);
    return unit;
  }

  // ========== 触发守门员Boss战 ==========
  triggerBossBattle(gkId) {
    console.log('[Boss战] 触发守门员Boss战:', gkId);

    var state = window.gameApp && window.gameApp.state ? window.gameApp.state : null;
    if (!state) {
      console.error('[Boss战] 无法获取state');
      return;
    }

    // 检查守门员是否已被击败
    var gkState = state.world && state.world.gatekeepers && state.world.gatekeepers[gkId] ? state.world.gatekeepers[gkId] : null;
    if (gkState && gkState.defeated) {
      this.showLog('这位守门员已经被你击败了。');
      return;
    }

    // 等级锁：村长随时可挑战（挑战失败回酒馆 + 北山古道传送门锁定 = “出不了村”）；
    // 其他守门员仍需达到当前等级上限才能挑战。
    if (gkId !== 'villageChief') {
      if (!StateUtils || !StateUtils.isExpLocked || !StateUtils.isExpLocked(state)) {
        var cap = StateUtils && StateUtils.getLevelCap ? StateUtils.getLevelCap(state) : 20;
        this.showLog('你还不够强。达到 ' + cap + ' 级后才能挑战这位守门员。（当前等级：' + state.player.level + '）');
        return;
      }
    }

    // 构建Boss单位
    var bossUnit = this.buildGatekeeperUnit(gkId);
    if (!bossUnit) {
      this.showLog('出错了，无法生成守门员。');
      return;
    }

    // 构建玩家和随从数据
    var player = this.getPlayerData();
    if (!player) {
      console.error('[Boss战] 无法获取玩家数据');
      return;
    }
    var allies = this.getAllyUnits();

    // 【Bug3修复】原代码引用了未在 triggerBossBattle 作用域内定义的 gkData（gkData 仅在
    // buildGatekeeperUnit 内部定义），导致多波次分支执行 gkData.waves 时抛 ReferenceError，
    // 守门员（如 hermit / finalBoss）配置了 waves 时无法进入多波次战斗。
    // 修复：在此处显式取出 gkData，并将 gkData 透传给 MultiWaveBossCombatEngine，
    // 使其通过 super(bossId, gkData) 正确初始化 this.gkData（用于战斗风格、阶段、自愈等逻辑）。
    var gkData = DATA && DATA.gatekeepers && DATA.gatekeepers[gkId] ? DATA.gatekeepers[gkId] : null;

    // 创建Boss战斗引擎（支持多波次）
    var gkWaves = gkData && gkData.waves ? gkData.waves : null;
    var bossCombat;
    if (gkWaves && gkWaves.length > 1) {
      console.log('[Boss战] 多波次Boss战，波数:', gkWaves.length);
      bossCombat = new MultiWaveBossCombatEngine(gkId, gkData, gkWaves);
    } else {
      bossCombat = new BossCombatEngine(gkId);
    }

    // 设置击败回调
    bossCombat.setDefeatCallback(function(combat) {
      console.log('[Boss战] 守门员被击败！:', gkId);
      // 标记守门员为已击败
      if (StateUtils && StateUtils.defeatGatekeeper) {
        StateUtils.defeatGatekeeper(state, gkId);
      }
      // 设置叙事标记
      if (state.narrative && state.narrative.flags) {
        state.narrative.flags['gatekeeper_' + gkId] = true;
      }
      // 任务事件标记
      if (state.quests && state.quests.events) {
        state.quests.events['gatekeeper_' + gkId] = true;
      }
      // 日志
      var gkName = combat.gkData && combat.gkData.name ? combat.gkData.name : '守门员';
      var unlockMsg = gkName + ' 被击败！你感到一股力量在体内涌动——等级上限已经提升！';
      combat.combatLog.push(unlockMsg);
      console.log('[Boss战]', unlockMsg);
    });

    // 存储引用
    window.currentCombat = bossCombat;
    this.currentCombat = bossCombat;

    // 启动Boss战
    bossCombat.startCombat(player, allies, [bossUnit]);

    // 显示Boss战开场日志
    var gkStance = bossCombat.gkData && bossCombat.gkData.stance ? bossCombat.gkData.stance : '';
    if (gkStance) {
      setTimeout(function() {
        var stanceMsg = bossUnit.name + '：「' + gkStance + '」';
        bossCombat.combatLog.push(stanceMsg);
        bossCombat.dispatchUpdate(stanceMsg);
      }, 800);
    }
  }

  // ========== 场景探索系统 ==========
  // 在野外场景中，探索有概率发现隐藏物品、额外资源或触发敌人
  exploreScene() {
    if (!window.gameApp || !window.gameApp.state) return;
    var state = window.gameApp.state;
    var scene = this.currentScene;
    if (!scene || scene.type !== 'wild') {
      this.showLog('这里没什么可探索的。');
      return;
    }

    var playerLevel = state.player.level || 1;
    var roll = Math.random();
    var self = this;

    // 根据区域确定探索结果池
    var zone = this.currentScene && this.currentScene.zone ? this.currentScene.zone : 'greyVillage';
    var resources, rareResources, exploreEnemies;
    if (zone === 'ashMines') {
      resources = ['精炼矿石', '深渊铁矿', '矿虫甲壳', '机械零件', '合金碎片', '旧矿灯'];
      rareResources = ['纯净矿晶', '机械齿轮', '禁锢之心碎片'];
      exploreEnemies = ['矿场虫群', '矿场矿工亡灵', '机械哨兵'];
    } else if (zone === 'ashMountains') {
      resources = ['灰烬矿石', '铁矿', '蝙蝠翼膜', '焦骨碎片', '矿工灵魂碎片'];
      rareResources = ['精炼灰烬矿', '古老符文石', '守卫铠甲片'];
      exploreEnemies = ['山洞蝙蝠', '灰烬狼', '石像鬼'];
    } else if (zone === 'greyVillage_dungeon') {
      resources = ['骷髅碎片', '断裂的箭矢', '蛛丝', '法力残渣', '古旧铜币', '锈蚀铁件'];
      rareResources = ['守卫铁牌', '幽绿宝石', '古老钥匙碎片'];
      exploreEnemies = ['骷髅兵', '骷髅弓手', '地牢蜘蛛', '骷髅法师'];
    } else {
      resources = ['草药', '石头', '水草', '野果', '矿石碎片', '兽皮'];
      rareResources = ['精炼草药', '优质矿石', '坚硬兽皮', '古旧碎片'];
      exploreEnemies = ['野狗', '毒蛇', '山贼'];
    }

    if (roll < 0.40) {
      // 40%：发现额外资源
      var found = resources[Math.floor(Math.random() * resources.length)];
      var amount = 1 + Math.floor(Math.random() * 2);
      var item = {
        id: Utils.uuid(),
        name: found,
        type: 'material',
        rarity: 'white',
        level: 1,
        stack: amount,
      };
      StateUtils.addToInventory(state, item);
      this.showLog('你仔细搜索了周围，发现了 ' + found + ' x' + amount + '！');
    }
    else if (roll < 0.60) {
      // 20%：发现少量金币
      var gold = 3 + Math.floor(Math.random() * playerLevel * 2);
      StateUtils.addGold(state, gold);
      this.showLog('你在角落里找到了 ' + gold + ' 金币。');
    }
    else if (roll < 0.75) {
      // 15%：发现绿色品质材料
      var rareFound = rareResources[Math.floor(Math.random() * rareResources.length)];
      var rareItem = {
        id: Utils.uuid(),
        name: rareFound,
        type: 'material',
        rarity: 'green',
        level: 1,
        stack: 1,
      };
      var addResult = StateUtils.addToInventory(state, rareItem);
      if (addResult.ok) {
        this.showLog('你发现了一些不寻常的东西——' + rareFound + '！');
      } else {
        this.showLog('你发现了什么，但背包满了...');
      }
    }
    else if (roll < 0.90) {
      // 15%：遭遇敌人
      this.showLog('你仔细搜索时，遭到了伏击！');
      var enemy = exploreEnemies[Math.floor(Math.random() * exploreEnemies.length)];
      this.triggerBattle([enemy]);
    }
    else {
      // 10%：什么也没找到（但消耗了一点体力）
      var flavour = [
        '你翻遍了每个角落，一无所获。',
        '这里已经被搜索过很多次了。',
        '你仔细查看了周围，没什么特别的。',
        '风声呼啸，你的搜索毫无收获。',
      ];
      this.showLog(flavour[Math.floor(Math.random() * flavour.length)]);
    }

    // 更新玩家信息
    if (window.gameApp && window.gameApp.updatePlayerInfo) {
      window.gameApp.updatePlayerInfo();
    }
  }

  // ========== 显示日志 ==========
  showLog(message) {
    const event = new CustomEvent('game-log', { detail: { message } });
    document.dispatchEvent(event);
  }

  // ========== Getters ==========
  getCurrentScene() { return this.currentScene; }
  getScenes() { return this.scenes; }
  getExits() { return this.currentScene ? this.currentScene.exits || [] : []; }
}
