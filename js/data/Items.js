import { Material, Seed, Food, Weapon } from './Item.js';

export const ITEM_DB = {
    'wood': new Material('wood', '나무', '🪵', '기본적인 건축 재료입니다.', 'Normal'),
    'seed_unknown': new Seed('seed_unknown', '정체불명의 씨앗', '🌱', '무엇이 자랄지 알 수 없는 씨앗입니다.', 'Normal', 'carrot'),
    'carrot': new Food('carrot', '우주 당근', '🥕', '영양가가 풍부한 우주 당근입니다.', 'Normal', 20, 5),
    'axe': new Weapon('axe', '돌도끼', '🪓', '나무를 벨 수 있는 도구입니다.', 'Normal', 100, 5, 0.5)
};
