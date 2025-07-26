import type { GameStoreState, StoryState } from '../store/gameStore';

// 模拟的AI响应数据
const mockResponses: Record<string, Partial<StoryState>> = {
  explore_meadow: {
    narrative: '你在草地上发现了一朵闪闪发光的花。它似乎在低声吟唱着一首古老的歌曲。',
    speaker: '旁白',
    choices: [
      { id: 'pick_flower', text: '摘下花朵' },
      { id: 'listen_song', text: '仔细聆听' },
      { id: 'leave_it', text: '不理它，继续前进' },
    ],
  },
  check_mountains: {
    narrative: '通往山脉的路上，你遇到了一个正在打盹的巨大卡比兽，它挡住了唯一的去路。',
    speaker: '旁白',
    choices: [
      { id: 'wake_snorlax', text: '尝试叫醒卡比兽' },
      { id: 'find_another_way', text: '寻找另一条路' },
      { id: 'go_back', text: '返回草地' },
    ],
  },
  pick_flower: {
    narrative: '当你触摸到花朵时，它化作一道光芒，融入了你的手心。你感觉自己充满了奇妙的力量。',
    speaker: '系统',
    choices: [{ id: 'continue_exploring', text: '继续探索' }],
  },
  default: {
    narrative: '你的行动没有产生任何明显的效果，但你感觉周围的空气似乎发生了一丝微妙的变化。',
    speaker: '旁白',
    choices: [{ id: 'continue_exploring', text: '继续观察' }],
  },
};

/**
 * 模拟获取故事后续内容的API调用。
 * @param currentState - 当前的完整游戏状态。
 * @param playerAction - 玩家执行的动作（例如，选择的ID或自定义输入）。
 * @returns 返回一个新的故事状态。
 */
export const fetchStoryContinuation = async (
  currentState: GameStoreState,
  playerAction: { type: 'choice' | 'custom'; value: string }
): Promise<Partial<StoryState>> => {
  console.log('Fetching story continuation for action:', playerAction);
  console.log('Current game state:', currentState);

  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 800));

  if (playerAction.type === 'choice') {
    return mockResponses[playerAction.value] || mockResponses.default;
  }
  
  // 对自定义输入的简单模拟响应
  return {
    narrative: `你决定 "${playerAction.value}"。这是一个有趣的决定。世界似乎对你的行动做出了回应，但具体是什么，还需要你进一步探索。`,
    speaker: '旁白',
    choices: [
        { id: 'look_around', text: '环顾四周' },
        { id: 'think_about_it', text: '深入思考' },
    ],
  };
};