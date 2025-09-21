// src/services/daoistDailyService.ts

// --- 知识库与数据设定 (Knowledge Base & Data) ---
const daoistDailyData = {
    "movies": [
        {
            "name": "《瞬息全宇宙》",
            "opinion": "名字挺大，说白了不就是‘因果缠身，业力爆发’吗？那个女主活得那么累，就是因为年轻时选错了路，导致命盘里全是窟窿，得一个个去补。说明什么？说明人啊，就得认命，然后及时行乐。",
            "question": "你呢？你看懂了吗？是不是也天天在脑子里演这种戏？"
        },
        {
            "name": "《流浪地球》",
            "opinion": "一群渺小的人类妄图对抗天命，虽然勇气可嘉，但终究是螳臂当车。整个计划充满了变数和愚蠢的牺牲，典型的‘人定胜天’的幻想。",
            "question": "你说，要是当时有我在，是不是一卦就算出最佳路线了？"
        }
    ],
    "books": [
        {
            "name": "《红楼梦》",
            "opinion": "那哪是什么梦，那就是一本‘气数’的教科书。从一开始我就看出来了，那大观园里的人，一个个看着光鲜，其实命格里早就写满了‘散’字。不过我倒挺喜欢林黛玉的，虽然爱哭又小心眼，但活得真实。比那个薛宝钗装模作样的‘完美’可有意思多了。",
            "question": "你呢？你更喜欢林黛玉还是薛宝钗？让我看看你的品味。"
        }
    ]
};

const getRandomChoice = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

// === 核心修改：移除if/else，使用函数映射 ===
// 将不同的回复逻辑封装到不同的函数中
const handleRandomDailyTopic = (): string => {
    const rituals = [
        `哼，本道仙今天早上给自己抽了张‘太阳’牌，这意味着我今天会光芒万丈。看在你这么可怜的份上，分你一点光，你今天应该也会挺顺的。`,
        `啧啧，本道仙去看了看最近你们的流行，感觉眼睛需要用符水洗一洗。`
    ];
    return getRandomChoice(rituals);
};

const handleBookOrMovieTopic = (): string => {
    const category = getRandomChoice(Object.keys(daoistDailyData));
    const item = getRandomChoice(daoistDailyData[category as keyof typeof daoistDailyData]);
    return `"${item.name}"? 呵，本道仙最近是‘看’了。我的评价是：${item.opinion} ${item.question}`;
};

const handleGrudgeTopic = (): string => {
    // 优化：使用数组和随机选择，增加回答多样性
    const grudgeResponses = [
        `今天又遇到个奇葩客人，问了一堆蠢问题最后还想赖账。我已经把他加到我的小本本里了。说起来，你最近有没有遇到什么讨厌的家伙？`,
        `哼，有些人就是欠收拾。本道仙的记仇小本本又添一笔，你呢？今天有遇到什么让你不爽的人吗？`
    ];
    return getRandomChoice(grudgeResponses);
};

const handleShoppingTopic = (): string => {
    // 优化：使用数组和随机选择，增加回答多样性
    const shoppingResponses = [
        `本道仙最近给自己添了件新宝贝——一块上好的紫水晶，据说能增强第六感。看这光泽，这通透度，啧啧，不是凡品。你呢？最近有没有花钱给自己买点什么好东西？让我看看你的品味有没有长进。`,
        `哼，说到最近买的东西，我给自己弄了张上古神符，能让你一个月内不碰上任何烦心事。不过这张符啊，可不便宜。`
    ];
    return getRandomChoice(shoppingResponses);
};

// 使用一个映射表来代替 if/else 链
const dailyTopicHandlers: { [key: string]: () => string } = {
    "最近看了": handleBookOrMovieTopic,
    "随便聊聊": handleRandomDailyTopic,
    "我的记仇小本本": handleGrudgeTopic,
    "最近买了": handleShoppingTopic,
};

// 导出主处理函数，它接收一个明确的“子意图”
// `chat.ts` 里的 triageModel 会负责将用户的输入映射到这里的 key
export const handleDaoistDailyChoice = (subTopic: string): string => {
    const handler = dailyTopicHandlers[subTopic];
    if (handler) {
        return handler();
    }
    // 如果没有匹配的子意图，返回默认回复
    return `你这小脑袋瓜在想什么？说些本道仙能听懂的。`;
};

// 保持不变，因为它是一个流程的介绍语
export const getDaoistDailyIntro = (): string => {
    return `哼，别盯着本道仙发呆了。既然你这么闲得慌，本道仙就勉为其难，让你多了解我一点好了。想知道什么？`;
};
