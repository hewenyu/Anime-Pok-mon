
import React, { useState, useEffect, useRef } from 'react';
import { PlayerProfile, Pokemon, InventoryItem, CustomizedStartData, PlayerGender, ChatHistoryEntry, AIStoryResponse, AIStoryChoice, AIEventTrigger, PokemonType, AICustomizationScreenActionTag, PokemonMoveInstance, LoadingStatus, FullProfileSuggestionData, UserDateTimeInput, ProfileDataForTimeSuggestion } from '../types';
import PokemonCard from './PokemonCard';
import TypeBadge from './TypeBadge';
import PokemonDetailModal from './PokemonDetailModal';

interface CustomizeRandomStartScreenProps {
  currentProfile: PlayerProfile;
  currentTeam: Pokemon[];
  currentItems: InventoryItem[];
  currentMoney: number;
  currentLocation: string;
  currentObjective: string;
  aiNarrativeFromApp: string;
  onReRollFullProfile: () => void;
  onRequestAddRandomStarterViaMainButton: () => void;
  onRequestNewItemViaMainButton: () => void;
  onRequestGeneratePlayerDescription: () => void;
  onStartAdventure: (customizedData: CustomizedStartData) => void;
  isLoadingAI: boolean; // General flag, now less used directly in this component for UI effects
  initialProfileGenerated: boolean;
  aiSuggestedGameStartTime?: number; // Unix ms timestamp from GameState

  onSendAssistantMessage: (messageText: string, assistantChatHistory: ChatHistoryEntry[], actionTag?: string) => void;
  requestDynamicTimeSuggestion: (profileData: ProfileDataForTimeSuggestion) => void; // New prop
  assistantAIResponse: AIStoryResponse | null;
  sanitizePokemonFn: (aiPokemon: Partial<Pokemon>) => Pokemon;
  sanitizeItemFn: (aiItem: Partial<InventoryItem>) => InventoryItem;
  onUpdateCustomizationDirectly: (
    field: 'teamMemberAdd' | 'teamMemberRemove' | 'itemAdd' | 'itemRemove' | 'itemQtyUpdate' | 'profileFieldUpdate' | 'gameTimeUpdate',
    value: Pokemon | InventoryItem | string | { itemId: string; quantity: number } | { field: keyof PlayerProfile | 'currentObjective' | 'currentLocationDescription' | 'money', value: any } | UserDateTimeInput
  ) => void;
  onRegeneratePokemonImage: (instanceId: string) => void;
  aiLoadingStatus: LoadingStatus;
  onClearAssistantResponse: () => void;
}

// Helper to parse timestamp to UserDateTimeInput (for display)
const parseTimestampToUserDateTimeInput = (timestamp: number): UserDateTimeInput => {
    const date = new Date(timestamp);
    return {
        year: date.getFullYear(),
        month: date.getMonth() + 1, // 1-12 for display
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes(),
    };
};


const CustomizeRandomStartScreen: React.FC<CustomizeRandomStartScreenProps> = ({
  currentProfile, currentTeam, currentItems, currentMoney, currentLocation, currentObjective,
  aiNarrativeFromApp, onReRollFullProfile, onRequestAddRandomStarterViaMainButton, onRequestNewItemViaMainButton,
  onRequestGeneratePlayerDescription,
  onStartAdventure,
  initialProfileGenerated,
  aiSuggestedGameStartTime, // from GameState
  onSendAssistantMessage,
  requestDynamicTimeSuggestion, // New prop
  assistantAIResponse, sanitizePokemonFn, sanitizeItemFn,
  onUpdateCustomizationDirectly,
  onRegeneratePokemonImage,
  aiLoadingStatus,
  onClearAssistantResponse
}) => {
  const [editableProfileName, setEditableProfileName] = useState<string>(currentProfile.name || '');
  const [editableGender, setEditableGender] = useState<PlayerGender>(currentProfile.gender || '男');
  const [editableAge, setEditableAge] = useState<number | undefined>(currentProfile.age);
  const [editableDescription, setEditableDescription] = useState<string>(currentProfile.description || '');
  const [editableStamina, setEditableStamina] = useState<number | undefined>(currentProfile.stamina);
  const [editableMaxStamina, setEditableMaxStamina] = useState<number | undefined>(currentProfile.maxStamina);
  const [editableEnergy, setEditableEnergy] = useState<number | undefined>(currentProfile.energy);
  const [editableMaxEnergy, setEditableMaxEnergy] = useState<number | undefined>(currentProfile.maxEnergy);
  const [editableHealthStatus, setEditableHealthStatus] = useState<string>(currentProfile.healthStatus || '');
  const [editableMoney, setEditableMoney] = useState<number>(currentMoney);
  const [editableLocation, setEditableLocation] = useState<string>(currentLocation);
  const [editableObjective, setEditableObjective] = useState<string>(currentObjective);

  // State for time inputs
  const [editableYear, setEditableYear] = useState<string>(""); // Store as string to allow "-"
  const [editableMonth, setEditableMonth] = useState<number>(1);
  const [editableDay, setEditableDay] = useState<number>(1);
  const [editableHour, setEditableHour] = useState<number>(9);
  const [editableMinute, setEditableMinute] = useState<number>(0);

  const [localEditableItems, setLocalEditableItems] = useState<InventoryItem[]>([...currentItems]);
  const [expandedInitialItemId, setExpandedInitialItemId] = useState<string | null>(null);

  const [pokemonToViewInModal, setPokemonToViewInModal] = useState<Pokemon | null>(null);

  const [assistantChatHistory, setAssistantChatHistory] = useState<ChatHistoryEntry[]>([]);
  const [assistantInput, setAssistantInput] = useState<string>('');
  const assistantChatBodyRef = useRef<HTMLDivElement>(null);

  const isLoadingMainAIForInitialScreen = aiLoadingStatus.status !== 'idle' && aiLoadingStatus.message !== '助手思考中...' && aiLoadingStatus.message !== '助手理解中...';
  const isAssistantLoading = aiLoadingStatus.status !== 'idle' && !!aiLoadingStatus.message?.startsWith('助手');
  const isMainFormLoading = aiLoadingStatus.status !== 'idle' && !aiLoadingStatus.message?.startsWith('助手');


  const updateTimeFieldsFromTimestamp = (timestamp: number | undefined) => {
    const timeToParse = timestamp || new Date().getTime();
    const parsed = parseTimestampToUserDateTimeInput(timeToParse);
    setEditableYear(parsed.year.toString());
    setEditableMonth(parsed.month);
    setEditableDay(parsed.day);
    setEditableHour(parsed.hour);
    setEditableMinute(parsed.minute);
  };

  const updateTimeFieldsFromUserDateTime = (timeInput: UserDateTimeInput) => {
    setEditableYear(timeInput.year.toString());
    setEditableMonth(timeInput.month); // 1-12
    setEditableDay(timeInput.day);
    setEditableHour(timeInput.hour);
    setEditableMinute(timeInput.minute);
  };

  // Effect for initializing or updating time fields from AI suggestion or profile changes
  useEffect(() => {
    if (initialProfileGenerated && aiSuggestedGameStartTime) {
        updateTimeFieldsFromTimestamp(aiSuggestedGameStartTime);
    } else if (!aiSuggestedGameStartTime && !initialProfileGenerated) { // Only default to current time if no AI suggestion and profile not yet generated
        updateTimeFieldsFromTimestamp(new Date().getTime());
    }
  }, [initialProfileGenerated, aiSuggestedGameStartTime]);


  useEffect(() => { setEditableProfileName(currentProfile.name || ''); }, [currentProfile.name]);
  useEffect(() => { setEditableGender(currentProfile.gender || '男'); }, [currentProfile.gender]);
  useEffect(() => { setEditableAge(currentProfile.age); }, [currentProfile.age]);
  useEffect(() => { setEditableDescription(currentProfile.description || ''); }, [currentProfile.description]);
  useEffect(() => { setEditableStamina(currentProfile.stamina); }, [currentProfile.stamina]);
  useEffect(() => { setEditableMaxStamina(currentProfile.maxStamina); }, [currentProfile.maxStamina]);
  useEffect(() => { setEditableEnergy(currentProfile.energy); }, [currentProfile.energy]);
  useEffect(() => { setEditableMaxEnergy(currentProfile.maxEnergy); }, [currentProfile.maxEnergy]);
  useEffect(() => { setEditableHealthStatus(currentProfile.healthStatus || ''); }, [currentProfile.healthStatus]);

  useEffect(() => { setLocalEditableItems([...currentItems]); }, [currentItems]);
  useEffect(() => { setEditableMoney(currentMoney); }, [currentMoney]);
  useEffect(() => { setEditableLocation(currentLocation); }, [currentLocation]);
  useEffect(() => { setEditableObjective(currentObjective); }, [currentObjective]);

  useEffect(() => {
    if (assistantAIResponse) {
      const mainAiNarrative = assistantAIResponse.narrative || "这是为你定制的档案建议：";
      let newEntry: ChatHistoryEntry;

      if (assistantAIResponse.choices && assistantAIResponse.choices.some(c => c.actionTag?.startsWith("ASSIST_PROFILE_CUSTOMIZATION_SET_GAME_TIME:"))) {
         // This is a response from the dynamic time suggester or game time advisor
         newEntry = {
            id: `assist-ai-time-suggest-${Date.now()}`,
            timestamp: Date.now(),
            speaker: assistantAIResponse.speaker || "定制助手AI",
            narrative: mainAiNarrative,
            type: 'ai',
            confirmationChoices: assistantAIResponse.choices,
         };
      } else if (assistantAIResponse.suggestedFullProfileData && assistantAIResponse.events) {
        if (assistantAIResponse.suggestedFullProfileData.suggestedGameStartTime) {
            updateTimeFieldsFromTimestamp(assistantAIResponse.suggestedFullProfileData.suggestedGameStartTime);
        }
        newEntry = {
          id: `assist-ai-fullprofile-${Date.now()}`,
          timestamp: Date.now(),
          speaker: assistantAIResponse.speaker || "定制助手AI",
          narrative: mainAiNarrative,
          type: 'assistant_suggestion',
          suggestedFullProfileData: assistantAIResponse.suggestedFullProfileData,
          events: assistantAIResponse.events,
          confirmationChoices: assistantAIResponse.choices,
          isClickableSuggestion: false,
        };
      } else {
        newEntry = {
            id: `assist-ai-single-${Date.now()}`,
            timestamp: Date.now(),
            speaker: assistantAIResponse.speaker || "定制助手AI",
            narrative: mainAiNarrative,
            type: 'ai',
            confirmationChoices: assistantAIResponse.choices,
        };

        if (assistantAIResponse.events && assistantAIResponse.events.length > 0) {
            const firstEvent = assistantAIResponse.events[0];
            if (firstEvent.type === 'PRESENT_SUGGESTED_POKEMON_DETAILS' && firstEvent.pokemonDetails) {
                const suggestedPokemon = sanitizePokemonFn(firstEvent.pokemonDetails);
                newEntry.narrative = mainAiNarrative || `我为你找到了这只宝可梦：`;
                newEntry.type = 'assistant_suggestion';
                newEntry.suggestedPokemonForConfirmation = suggestedPokemon;
                newEntry.isClickableSuggestion = true;
                newEntry.confirmationChoices = assistantAIResponse.choices?.filter(c => c.actionTag !== "ACCEPT_ASSISTANT_FULL_PROFILE_SUGGESTION") || [
                    { text: "确认添加这只宝可梦", actionTag: `ASSIST_PROFILE_CUSTOMIZATION_CONFIRM_ADD_POKEMON`},
                    { text: "换一只其他的", actionTag: `ASSIST_PROFILE_CUSTOMIZATION_REQUEST_NEW_POKEMON`},
                    { text: "不用了，谢谢", actionTag: `ASSIST_PROFILE_CUSTOMIZATION_CANCEL_SUGGESTION`}
                ];
            } else if (firstEvent.type === 'PRESENT_SUGGESTED_ITEM_DETAILS' && firstEvent.itemDetails) {
                const suggestedItem = sanitizeItemFn(firstEvent.itemDetails);
                newEntry.narrative = mainAiNarrative || `我为你找到了这个道具：`;
                newEntry.type = 'assistant_suggestion';
                newEntry.suggestedItemForConfirmation = {...suggestedItem, quantity: firstEvent.quantity || suggestedItem.quantity || 1};
                newEntry.confirmationChoices = assistantAIResponse.choices?.filter(c => c.actionTag !== "ACCEPT_ASSISTANT_FULL_PROFILE_SUGGESTION") || [
                    { text: "确认添加这些道具", actionTag: `ASSIST_PROFILE_CUSTOMIZATION_CONFIRM_ADD_ITEM`},
                    { text: "换一些其他的", actionTag: `ASSIST_PROFILE_CUSTOMIZATION_REQUEST_NEW_ITEM`},
                    { text: "不用了，谢谢", actionTag: `ASSIST_PROFILE_CUSTOMIZATION_CANCEL_SUGGESTION`}
                ];
            } else if (firstEvent.type === 'PRESENT_SUGGESTED_LOCATION_DETAILS' && firstEvent.suggestedLocationDetails) {
                newEntry.narrative = mainAiNarrative || `建议将初始位置设为：${firstEvent.suggestedLocationDetails.newLocation}`;
                newEntry.type = 'assistant_suggestion';
                newEntry.suggestedLocationDetails = firstEvent.suggestedLocationDetails;
                newEntry.confirmationChoices = assistantAIResponse.choices?.filter(c => c.actionTag !== "ACCEPT_ASSISTANT_FULL_PROFILE_SUGGESTION") || [
                    { text: `确认设为 ${firstEvent.suggestedLocationDetails.newLocation}`, actionTag: `ASSIST_PROFILE_CUSTOMIZATION_SET_LOCATION:${firstEvent.suggestedLocationDetails.newLocation}`},
                    { text: "换一个地方", actionTag: `ASSIST_PROFILE_CUSTOMIZATION_REQUEST_NEW_LOCATION`},
                    { text: "不用了，谢谢", actionTag: `ASSIST_PROFILE_CUSTOMIZATION_CANCEL_SUGGESTION`}
                ];
            }
            if (newEntry.type === 'ai' && assistantAIResponse.events) {
                newEntry.events = assistantAIResponse.events;
            }
        }
      }
      setAssistantChatHistory(prev => [...prev, newEntry]);
    }
  }, [assistantAIResponse, sanitizePokemonFn, sanitizeItemFn]);

  useEffect(() => {
    if (assistantChatBodyRef.current) {
      assistantChatBodyRef.current.scrollTop = assistantChatBodyRef.current.scrollHeight;
    }
  }, [assistantChatHistory]);


  const handleNumericProfileChange = (setter: React.Dispatch<React.SetStateAction<number | undefined>>, value: string, fieldName: keyof PlayerProfile) => {
    const numValue = parseInt(value, 10);
    const finalValue = !isNaN(numValue) && numValue >= 0 ? numValue : undefined;
    setter(finalValue);
    onUpdateCustomizationDirectly('profileFieldUpdate', { field: fieldName, value: finalValue });
  };

  const handleStringProfileChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string, fieldName: keyof PlayerProfile) => {
    setter(value);
    onUpdateCustomizationDirectly('profileFieldUpdate', { field: fieldName, value });
  };

  const handleGenderProfileChange = (value: PlayerGender) => {
    setEditableGender(value);
    onUpdateCustomizationDirectly('profileFieldUpdate', { field: 'gender', value });
  }


  const handleItemQuantityChangeInForm = (itemId: string, quantityStr: string) => {
    const quantity = parseInt(quantityStr, 10);
    const validQuantity = isNaN(quantity) || quantity < 0 ? 0 : quantity;
    setLocalEditableItems(prevItems => prevItems.map(item =>
        item.id === itemId ? { ...item, quantity: validQuantity } : item
    ));
    onUpdateCustomizationDirectly('itemQtyUpdate', { itemId, quantity: validQuantity });
  };

  const handleRemoveItemFromForm = (itemId: string) => {
    setLocalEditableItems(prevItems => prevItems.filter(item => item.id !== itemId));
    onUpdateCustomizationDirectly('itemRemove', itemId);
  };

  const handleRemoveFromTeamViaForm = (pokemonInstanceId?: string) => {
    if (pokemonInstanceId) {
      onUpdateCustomizationDirectly('teamMemberRemove', pokemonInstanceId);
    }
  };


  const handleSubmitForm = () => {
    if (isMainFormLoading && !aiNarrativeFromApp.includes("生成")) return;
    const finalProfile: PlayerProfile = {
        name: editableProfileName.trim() || "冒险者",
        gender: editableGender || "男",
        age: editableAge,
        description: editableDescription.trim() || "一位普通的冒险者。",
        stamina: editableStamina ?? 100, maxStamina: editableMaxStamina ?? 100,
        energy: editableEnergy ?? 100, maxEnergy: editableMaxEnergy ?? 100,
        healthStatus: editableHealthStatus.trim() || "健康",
    };
    const finalItems = currentItems.filter(item => item.quantity > 0);

    const yearNum = parseInt(editableYear, 10);
    const userDateTime: UserDateTimeInput = {
        year: isNaN(yearNum) ? new Date().getFullYear() : yearNum,
        month: editableMonth, // 1-12
        day: editableDay,
        hour: editableHour,
        minute: editableMinute,
    };

    onStartAdventure({
      playerProfile: finalProfile,
      startingTeam: currentTeam,
      inventory: finalItems,
      money: editableMoney >= 0 ? editableMoney : 0,
      currentLocationDescription: editableLocation.trim() || "未知之地",
      currentObjective: editableObjective.trim() || "探索这个世界",
      userDateTimeInput: userDateTime,
    });
  };

  const handleSendAssistantChatMessage = (text?: string, actionTag?: string) => {
    const messageToSend = text || assistantInput.trim();
    if (!messageToSend && !actionTag) return;

    if (!isAssistantLoading) {
      const playerEntry: ChatHistoryEntry = {
        id: `assist-player-${Date.now()}`, timestamp: Date.now(), speaker: editableProfileName || "你",
        narrative: messageToSend, type: 'player_input',
      };
      const newChatHistory = [...assistantChatHistory, playerEntry];
      setAssistantChatHistory(newChatHistory);
      onSendAssistantMessage(messageToSend, newChatHistory, actionTag);
      setAssistantInput('');
    }
  };

  const handleAssistantSuggestionConfirmation = (
      choice: AIStoryChoice,
      suggestionMessage: ChatHistoryEntry & { events?: AIEventTrigger[], suggestedFullProfileData?: FullProfileSuggestionData }
  ) => {
      if (isAssistantLoading) return;

      setAssistantChatHistory(prev => prev.map(msg =>
          msg.id === suggestionMessage.id ? {...msg, confirmationChoices: undefined, isClickableSuggestion: false} : msg
      ));

      let systemMessageText: string | null = null;

      if (choice.actionTag === "ACCEPT_ASSISTANT_FULL_PROFILE_SUGGESTION") {
        currentTeam.forEach(p => {
            if(p.instanceId) onUpdateCustomizationDirectly('teamMemberRemove', p.instanceId);
        });
        currentItems.forEach(i => onUpdateCustomizationDirectly('itemRemove', i.id));
        onUpdateCustomizationDirectly('profileFieldUpdate', { field: 'money' as any, value: 0 });

        let profileUpdateMessages: string[] = [];
        if (suggestionMessage.suggestedFullProfileData) {
            const data = suggestionMessage.suggestedFullProfileData;
            if (data.name !== undefined) { setEditableProfileName(data.name); onUpdateCustomizationDirectly('profileFieldUpdate', { field: 'name', value: data.name }); profileUpdateMessages.push(`姓名: ${data.name}`);}
            if (data.gender !== undefined) { setEditableGender(data.gender); onUpdateCustomizationDirectly('profileFieldUpdate', { field: 'gender', value: data.gender }); profileUpdateMessages.push(`性别: ${data.gender}`);}
            if (data.age !== undefined) { setEditableAge(data.age); onUpdateCustomizationDirectly('profileFieldUpdate', { field: 'age', value: data.age }); profileUpdateMessages.push(`年龄: ${data.age}`);}
            if (data.description !== undefined) { setEditableDescription(data.description); onUpdateCustomizationDirectly('profileFieldUpdate', { field: 'description', value: data.description }); profileUpdateMessages.push(`说明已更新`);}
            if (data.stamina !== undefined) { setEditableStamina(data.stamina); onUpdateCustomizationDirectly('profileFieldUpdate', { field: 'stamina', value: data.stamina }); }
            if (data.maxStamina !== undefined) { setEditableMaxStamina(data.maxStamina); onUpdateCustomizationDirectly('profileFieldUpdate', { field: 'maxStamina', value: data.maxStamina }); }
            if (data.energy !== undefined) { setEditableEnergy(data.energy); onUpdateCustomizationDirectly('profileFieldUpdate', { field: 'energy', value: data.energy }); }
            if (data.maxEnergy !== undefined) { setEditableMaxEnergy(data.maxEnergy); onUpdateCustomizationDirectly('profileFieldUpdate', { field: 'maxEnergy', value: data.maxEnergy }); }
            if (data.healthStatus !== undefined) { setEditableHealthStatus(data.healthStatus); onUpdateCustomizationDirectly('profileFieldUpdate', { field: 'healthStatus', value: data.healthStatus }); }
            if (data.objective !== undefined) {
                setEditableObjective(data.objective);
                onUpdateCustomizationDirectly('profileFieldUpdate', { field: 'currentObjective' as any, value: data.objective });
                profileUpdateMessages.push(`目标: ${data.objective}`);
            }
            if (data.location !== undefined) {
                setEditableLocation(data.location);
                onUpdateCustomizationDirectly('profileFieldUpdate', { field: 'currentLocationDescription' as any, value: data.location });
                profileUpdateMessages.push(`地点: ${data.location}`);
            }
            if (data.money !== undefined) {
                setEditableMoney(data.money);
                onUpdateCustomizationDirectly('profileFieldUpdate', { field: 'money' as any, value: data.money });
                profileUpdateMessages.push(`金钱: ${data.money}`);
            }
            if (data.suggestedGameStartTime) {
                updateTimeFieldsFromTimestamp(data.suggestedGameStartTime);
                onUpdateCustomizationDirectly('gameTimeUpdate', parseTimestampToUserDateTimeInput(data.suggestedGameStartTime));
                profileUpdateMessages.push(`开始时间已更新 (AI建议)`);
            }
        }

        if (suggestionMessage.events) {
            suggestionMessage.events.forEach(event => {
                if (event.type === 'PRESENT_SUGGESTED_POKEMON_DETAILS' && event.pokemonDetails) {
                    const pokemon = sanitizePokemonFn(event.pokemonDetails);
                    onUpdateCustomizationDirectly('teamMemberAdd', pokemon);
                    profileUpdateMessages.push(`宝可梦: ${pokemon.name}`);
                } else if (event.type === 'PRESENT_SUGGESTED_ITEM_DETAILS' && event.itemDetails) {
                    const item = sanitizeItemFn(event.itemDetails);
                    const itemWithQty = {...item, quantity: event.quantity || item.quantity || 1};
                    onUpdateCustomizationDirectly('itemAdd', itemWithQty);
                    profileUpdateMessages.push(`道具: ${item.name} x${itemWithQty.quantity}`);
                }
            });
        }
        systemMessageText = "完整档案建议已采纳并替换当前设定。";

      } else if (choice.actionTag === 'ASSIST_PROFILE_CUSTOMIZATION_CONFIRM_ADD_POKEMON' && suggestionMessage.suggestedPokemonForConfirmation) {
          onUpdateCustomizationDirectly('teamMemberAdd', suggestionMessage.suggestedPokemonForConfirmation);
          systemMessageText = `${suggestionMessage.suggestedPokemonForConfirmation.name} 已添加到你的初始宝可梦选项中。`;
      } else if (choice.actionTag === 'ASSIST_PROFILE_CUSTOMIZATION_CONFIRM_ADD_ITEM' && suggestionMessage.suggestedItemForConfirmation) {
          onUpdateCustomizationDirectly('itemAdd', suggestionMessage.suggestedItemForConfirmation);
          systemMessageText = `${suggestionMessage.suggestedItemForConfirmation.name} x${suggestionMessage.suggestedItemForConfirmation.quantity} 已添加到你的道具。`;
      } else if (choice.actionTag?.startsWith('ASSIST_PROFILE_CUSTOMIZATION_SET_PROFILE_FIELD:')) {
          const parts = choice.actionTag.split(':');
          const fieldName = parts[1] as keyof PlayerProfile;
          const value = parts.slice(2).join(':');

          if (fieldName === 'name' || fieldName === 'description' || fieldName === 'healthStatus') {
            handleStringProfileChange(
                fieldName === 'name' ? setEditableProfileName :
                fieldName === 'description' ? setEditableDescription : setEditableHealthStatus,
                value, fieldName
            );
            systemMessageText = `"${fieldName}" 已更新为 "${value}"。`;
          } else if (fieldName === 'gender') {
            handleGenderProfileChange(value as PlayerGender);
            systemMessageText = `性别已更新为 "${value}"。`;
          } else if (fieldName === 'age' || fieldName === 'stamina' || fieldName === 'maxStamina' || fieldName === 'energy' || fieldName === 'maxEnergy') {
            const numValue = parseInt(value, 10);
            if (!isNaN(numValue)) {
                handleNumericProfileChange(
                    fieldName === 'age' ? setEditableAge :
                    fieldName === 'stamina' ? setEditableStamina :
                    fieldName === 'maxStamina' ? setEditableMaxStamina :
                    fieldName === 'energy' ? setEditableEnergy : setEditableMaxEnergy,
                    value, fieldName
                );
                 systemMessageText = `"${fieldName}" 已更新为 ${numValue}。`;
            } else {
                systemMessageText = `无法将 "${fieldName}" 更新为 "${value}" (无效数值)。`;
            }
          }
      } else if (choice.actionTag?.startsWith('ASSIST_PROFILE_CUSTOMIZATION_SET_MONEY:')) {
          const amountStr = choice.actionTag.substring('ASSIST_PROFILE_CUSTOMIZATION_SET_MONEY:'.length);
          const amount = parseInt(amountStr, 10);
          if (!isNaN(amount) && amount >= 0) {
              setEditableMoney(amount);
              onUpdateCustomizationDirectly('profileFieldUpdate', { field: 'money' as any, value: amount });
              systemMessageText = `初始金钱已更新为 ${amount}。`;
          } else {
              systemMessageText = `无法将初始金钱更新为 "${amountStr}" (无效数值)。`;
          }
      } else if (choice.actionTag?.startsWith('ASSIST_PROFILE_CUSTOMIZATION_SET_LOCATION:')) {
          const locationName = choice.actionTag.substring('ASSIST_PROFILE_CUSTOMIZATION_SET_LOCATION:'.length);
          setEditableLocation(locationName);
          onUpdateCustomizationDirectly('profileFieldUpdate', { field: 'currentLocationDescription' as any, value: locationName });
          systemMessageText = `初始位置已更新为 "${locationName}"。`;
           if (suggestionMessage.suggestedLocationDetails?.mapData) {
             systemMessageText += " (地图信息已记录)";
           }
      } else if (choice.actionTag?.startsWith('ASSIST_PROFILE_CUSTOMIZATION_SET_OBJECTIVE:')) {
          const objectiveText = choice.actionTag.substring('ASSIST_PROFILE_CUSTOMIZATION_SET_OBJECTIVE:'.length);
          setEditableObjective(objectiveText);
          onUpdateCustomizationDirectly('profileFieldUpdate', { field: 'currentObjective' as any, value: objectiveText });
          systemMessageText = `初始目标已更新为 "${objectiveText}"。`;
      } else if (choice.actionTag?.startsWith('ASSIST_PROFILE_CUSTOMIZATION_SET_GAME_TIME:')) {
          const parts = choice.actionTag.split(':'); // YYYY:MM(0-11):DD:HH:MM
          if (parts.length === 6) {
              const year = parseInt(parts[1], 10);
              const monthJs = parseInt(parts[2], 10); // 0-11 for JS Date
              const day = parseInt(parts[3], 10);
              const hour = parseInt(parts[4], 10);
              const minute = parseInt(parts[5], 10);
              if (![year, monthJs, day, hour, minute].some(isNaN)) {
                  const userTimeInput: UserDateTimeInput = { year, month: monthJs + 1, day, hour, minute }; // month +1 for display
                  updateTimeFieldsFromUserDateTime(userTimeInput);
                  // gameTimeUpdate expects UserDateTimeInput with month 1-12
                  onUpdateCustomizationDirectly('gameTimeUpdate', userTimeInput);
                  systemMessageText = `游戏开始时间已更新为 公元${year < 0 ? `前${Math.abs(year)}` : year}年${monthJs+1}月${day}日 ${hour.toString().padStart(2,'0')}:${minute.toString().padStart(2,'0')}。`;
              } else {
                  systemMessageText = `助手提供的时间格式有误，无法更新。`;
              }
          } else {
              systemMessageText = `助手提供的时间数据不完整，无法更新。`;
          }
      } else {
          // For other actionTags (like requesting new suggestions), send them to the assistant.
          handleSendAssistantChatMessage(choice.text, choice.actionTag);
      }

      if (systemMessageText) {
        const confirmMsg: ChatHistoryEntry = { id: `assist-sys-${Date.now()}`, timestamp: Date.now(), speaker: "系统", narrative: systemMessageText, type: 'system'};
        setAssistantChatHistory(prev => [...prev, confirmMsg]);
      }
  };

  const handleRefreshAssistantChat = () => {
    setAssistantChatHistory([]);
    onClearAssistantResponse();
  };

  const handleTriggerDynamicTimeSuggestion = () => {
    if (isAssistantLoading || isMainFormLoading) return;

    const profileData: ProfileDataForTimeSuggestion = {
      name: editableProfileName,
      description: editableDescription,
      objective: editableObjective,
      location: editableLocation,
      pokemonNames: currentTeam.map(p => p.name),
      itemNames: localEditableItems.map(i => i.name),
    };
    const playerEntry: ChatHistoryEntry = {
      id: `assist-player-${Date.now()}`, timestamp: Date.now(), speaker: editableProfileName || "你",
      narrative: "(点击按钮：让AI根据当前设定建议时间)", type: 'player_input',
    };
    setAssistantChatHistory(prev => [...prev, playerEntry]);
    requestDynamicTimeSuggestion(profileData);
  };


  const renderFormLoadingOverlay = () => (
    <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-lg">
        <p className="text-purple-600 text-lg italic animate-pulse">{aiLoadingStatus.message || "处理中..."}</p>
    </div>
  );

  if (!initialProfileGenerated && isLoadingMainAIForInitialScreen && !assistantAIResponse) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="adventure-text-box w-full max-w-2xl mb-6 text-center">
          <h1 className="text-2xl font-bold mb-3 text-pink-600">准备开始你的冒险...</h1>
          <p className="text-sky-600 italic animate-pulse py-3 text-lg">
            {aiLoadingStatus.message || "首次生成初始身份信息，请稍候..."}
          </p>
        </div>
      </div>
    );
  }


  const handleItemImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>, itemName: string) => {
    const target = event.currentTarget;
    target.onerror = null;
    target.src = `https://placehold.co/48x48/E0D8F0/4A3F66?text=${encodeURIComponent(itemName.substring(0, 1))}`;
  };

  const toggleInitialItemExpansion = (itemId: string) => {
    setExpandedInitialItemId(prevId => (prevId === itemId ? null : itemId));
  };

  return (
    <>
    <div className="min-h-screen flex flex-col items-center justify-start p-4 overflow-y-auto">
      <div className="adventure-text-box w-full max-w-6xl mt-2 mb-3 relative">
        <h1 className="text-2xl font-bold mb-1 text-pink-600 text-center">自定义你的冒险启程</h1>
        {aiNarrativeFromApp && !isMainFormLoading && !isAssistantLoading && (
            <p className="text-center text-gray-600 mb-2 text-sm italic p-1.5 bg-purple-50/70 rounded-md">
                {aiNarrativeFromApp}
            </p>
        )}
      </div>

      <div className="flex flex-col md:flex-row w-full max-w-6xl gap-3 flex-grow">
        <div className="sidebar-panel md:w-3/5 lg:w-2/3 p-3 md:p-4 custom-scrollbar overflow-y-auto relative">
           {isMainFormLoading && renderFormLoadingOverlay()}

            <h3 className="text-lg font-semibold text-sky-700 border-b border-purple-300/70 pb-1 mb-1.5">角色信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2.5 mb-3">
              <div>
                <label htmlFor="randName" className="label-text text-sm">姓名:</label>
                <input type="text" id="randName" value={editableProfileName} onChange={e => handleStringProfileChange(setEditableProfileName, e.target.value, 'name')} className="input-field w-full mt-0.5 text-sm p-1.5" disabled={isMainFormLoading} maxLength={15} />
              </div>
              <div>
                <label htmlFor="randGender" className="label-text text-sm">性别:</label>
                <select id="randGender" value={editableGender} onChange={e => handleGenderProfileChange(e.target.value as PlayerGender)} className="input-field w-full mt-0.5 text-sm p-1.5" disabled={isMainFormLoading}>
                  <option value="男">男</option><option value="女">女</option>
                </select>
              </div>
              <div>
                <label htmlFor="randAge" className="label-text text-sm">年龄:</label>
                <input type="number" id="randAge" value={editableAge ?? ''} onChange={e => handleNumericProfileChange(setEditableAge, e.target.value, 'age')} className="input-field w-full mt-0.5 text-sm p-1.5" disabled={isMainFormLoading} min="10" max="70" />
              </div>
            </div>

            <div className="mb-2">
              <label htmlFor="randDescription" className="label-text text-sm">人物说明 (性格/背景):</label>
              <textarea id="randDescription" value={editableDescription} onChange={e => handleStringProfileChange(setEditableDescription, e.target.value, 'description')} className="input-field w-full mt-0.5 text-sm p-1.5 h-20 custom-scrollbar" disabled={isMainFormLoading} maxLength={150} placeholder="例如：一个充满好奇心，梦想成为宝可梦大师的少年。"></textarea>
              <button onClick={onRequestGeneratePlayerDescription} className="choice-button secondary text-xs w-full py-1 mt-1" disabled={isMainFormLoading}>AI 生成说明</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2.5 mb-2">
              <div>
                <label htmlFor="randStamina" className="label-text text-sm">体力:</label>
                <input type="number" id="randStamina" value={editableStamina ?? ''} onChange={e => handleNumericProfileChange(setEditableStamina, e.target.value, 'stamina')} className="input-field w-full mt-0.5 text-sm p-1.5" disabled={isMainFormLoading} />
              </div>
              <div>
                <label htmlFor="randMaxStamina" className="label-text text-sm">最大体力:</label>
                <input type="number" id="randMaxStamina" value={editableMaxStamina ?? ''} onChange={e => handleNumericProfileChange(setEditableMaxStamina, e.target.value, 'maxStamina')} className="input-field w-full mt-0.5 text-sm p-1.5" disabled={isMainFormLoading} />
              </div>
              <div>
                <label htmlFor="randEnergy" className="label-text text-sm">精力:</label>
                <input type="number" id="randEnergy" value={editableEnergy ?? ''} onChange={e => handleNumericProfileChange(setEditableEnergy, e.target.value, 'energy')} className="input-field w-full mt-0.5 text-sm p-1.5" disabled={isMainFormLoading} />
              </div>
              <div>
                <label htmlFor="randMaxEnergy" className="label-text text-sm">最大精力:</label>
                <input type="number" id="randMaxEnergy" value={editableMaxEnergy ?? ''} onChange={e => handleNumericProfileChange(setEditableMaxEnergy, e.target.value, 'maxEnergy')} className="input-field w-full mt-0.5 text-sm p-1.5" disabled={isMainFormLoading} />
              </div>
            </div>
            <div className="mb-2">
              <label htmlFor="randHealth" className="label-text text-sm">健康状况:</label>
              <input type="text" id="randHealth" value={editableHealthStatus} onChange={e => handleStringProfileChange(setEditableHealthStatus, e.target.value, 'healthStatus')} className="input-field w-full mt-0.5 text-sm p-1.5" disabled={isMainFormLoading} maxLength={20}/>
            </div>

            <h3 className="text-lg font-semibold text-sky-700 border-b border-purple-300/70 pb-1 mb-1.5 mt-2">冒险设定</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-x-4 gap-y-2.5">
                <div className="col-span-full md:col-span-1">
                    <label htmlFor="randLocation" className="label-text text-sm">初始位置:</label>
                    <input type="text" id="randLocation" value={editableLocation} onChange={e => setEditableLocation(e.target.value)} className="input-field w-full mt-0.5 text-sm p-1.5" disabled={isMainFormLoading} maxLength={50} />
                </div>
                <div className="col-span-full md:col-span-1">
                    <label htmlFor="randMoney" className="label-text text-sm">初始金钱:</label>
                    <input type="number" id="randMoney" value={editableMoney} onChange={e => setEditableMoney(parseInt(e.target.value,10) || 0)} className="input-field w-full mt-0.5 text-sm p-1.5" disabled={isMainFormLoading} />
                </div>
                <div className="col-span-full">
                    <label htmlFor="randObjective" className="label-text text-sm">初始目标:</label>
                    <input type="text" id="randObjective" value={editableObjective} onChange={e => setEditableObjective(e.target.value)} className="input-field w-full mt-0.5 text-sm p-1.5" disabled={isMainFormLoading} maxLength={100} />
                </div>
            </div>

            {/* Game Start Time Inputs */}
            <div className="mt-2 pt-2 border-t border-purple-300/60">
                <label className="label-text text-sm mb-1 block">游戏开始时间 (年请填公元，负数表示公元前):</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-2 gap-y-1.5 items-end">
                    <input type="text" placeholder="年 (如 2024, -100)" value={editableYear} onChange={e => setEditableYear(e.target.value)} className="input-field text-xs p-1 col-span-2 sm:col-span-2" disabled={isMainFormLoading || isAssistantLoading}/>
                    <input type="number" placeholder="月 (1-12)" value={editableMonth} onChange={e => setEditableMonth(parseInt(e.target.value))} min="1" max="12" className="input-field text-xs p-1" disabled={isMainFormLoading || isAssistantLoading}/>
                    <input type="number" placeholder="日 (1-31)" value={editableDay} onChange={e => setEditableDay(parseInt(e.target.value))} min="1" max="31" className="input-field text-xs p-1" disabled={isMainFormLoading || isAssistantLoading}/>
                    <input type="number" placeholder="时 (0-23)" value={editableHour} onChange={e => setEditableHour(parseInt(e.target.value))} min="0" max="23" className="input-field text-xs p-1" disabled={isMainFormLoading || isAssistantLoading}/>
                    <input type="number" placeholder="分 (0-59)" value={editableMinute} onChange={e => setEditableMinute(parseInt(e.target.value))} min="0" max="59" className="input-field text-xs p-1" disabled={isMainFormLoading || isAssistantLoading}/>
                </div>
                <button
                    onClick={handleTriggerDynamicTimeSuggestion}
                    className="choice-button secondary text-xs w-full py-1 mt-1.5"
                    disabled={isMainFormLoading || isAssistantLoading}
                    title="让AI根据当前表单中的角色名、描述、地点、目标等信息，建议一个合适的游戏开始时间。"
                >
                    让AI根据当前设定建议时间
                </button>
            </div>

            <div className="mt-3">
              <h3 className="text-lg font-semibold text-sky-700 border-b border-purple-300/70 pb-1 mb-1.5">初始宝可梦</h3>
              {currentTeam.length > 0 ? (
                <div className="space-y-2">
                  {currentTeam.map(pokemon => (
                    <div key={pokemon.instanceId || pokemon.id} className="p-1.5 bg-purple-50/50 rounded">
                      <div onClick={() => setPokemonToViewInModal(pokemon)} className="pokemon-sidebar-card-clickable cursor-pointer">
                        <PokemonCard pokemon={pokemon} isBattleCard={false} onRegenerateImage={onRegeneratePokemonImage} />
                      </div>
                      <button onClick={() => handleRemoveFromTeamViaForm(pokemon.instanceId)} className="choice-button text-xs w-full mt-1 py-1" disabled={isMainFormLoading}>移除这只</button>
                    </div>
                  ))}
                </div>
              ) : (!isMainFormLoading && <p className="text-gray-500 my-1.5 text-sm">沒有初始宝可梦。</p>)}
              <button onClick={onRequestAddRandomStarterViaMainButton} className="choice-button secondary text-xs sm:text-sm w-full py-1.5 mt-1" disabled={isMainFormLoading}>随机添加宝可梦</button>
            </div>
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-sky-700 border-b border-purple-300/70 pb-1 mb-1.5">初始道具</h3>
              {localEditableItems.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {localEditableItems.map(item => (
                    <li
                      key={item.id}
                      className={`p-2 bg-purple-50/60 rounded-lg shadow-sm border border-purple-200/50 transition-all ${item.description ? 'cursor-pointer hover:bg-purple-100/80' : ''}`}
                      onClick={() => item.description && toggleInitialItemExpansion(item.id)}
                      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && item.description) toggleInitialItemExpansion(item.id);}}
                      tabIndex={item.description ? 0 : -1}
                      role={item.description ? "button" : undefined}
                      aria-expanded={item.description ? expandedInitialItemId === item.id : undefined}
                      aria-controls={item.description ? `initial-item-desc-${item.id}` : undefined}
                    >
                      <div className="flex items-start gap-3">
                        {item.imageUrl && (
                            <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-10 h-10 object-contain rounded bg-white/50 p-0.5 border border-purple-200/70 shadow-sm flex-shrink-0 mt-0.5"
                                onError={(e) => handleItemImageError(e, item.name)}
                            />
                        )}
                        <div className="flex-grow">
                          <span className="font-semibold text-gray-700 block">{item.name}</span>
                          {item.effectText && (
                            <p className="text-xs text-indigo-700 font-medium mt-0.5">{item.effectText}</p>
                          )}
                          {expandedInitialItemId !== item.id && item.description && !item.effectText && (
                            <p className="text-xs text-slate-500 italic mt-1">点击查看描述</p>
                          )}
                          {expandedInitialItemId !== item.id && item.description && item.effectText && (
                            <p className="text-xs text-slate-500 italic mt-1">点击查看详细介绍</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 ml-2 flex-shrink-0">
                            <div className="flex items-center gap-1">
                                <label htmlFor={`item-qty-${item.id}`} className="text-xs text-gray-600">数量:</label>
                                <input type="number" id={`item-qty-${item.id}`} value={item.quantity} onChange={e => handleItemQuantityChangeInForm(item.id, e.target.value)} className="input-field w-14 text-xs py-0.5 px-1" disabled={isMainFormLoading}/>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemoveItemFromForm(item.id); }}
                              className="choice-button text-xs px-1.5 py-0.5"
                              disabled={isMainFormLoading}
                              aria-label={`移除 ${item.name}`}
                            >
                              移除
                            </button>
                        </div>
                      </div>
                      {expandedInitialItemId === item.id && item.description && (
                        <div id={`initial-item-desc-${item.id}`} className="mt-2 pt-2 border-t border-purple-300/50 ml-0 md:ml-12">
                          <p className="text-sm text-slate-600 italic">{item.description}</p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                ) : (!isMainFormLoading && <p className="text-gray-500 my-1.5 text-sm">沒有初始道具。</p>)}
              <button onClick={onRequestNewItemViaMainButton} className="choice-button secondary text-xs sm:text-sm w-full py-1.5 mt-2" disabled={isMainFormLoading}>随机添加道具</button>
            </div>
        </div>

        <div className="sidebar-panel md:w-2/5 lg:w-1/3 p-2 md:p-3 flex flex-col h-full">
            <div className="flex justify-between items-center mb-2">
                 <h3 className="text-md font-semibold text-cyan-700">AI 定制助手</h3>
                 <button onClick={handleRefreshAssistantChat} className="choice-button secondary text-xs px-2 py-1" disabled={isAssistantLoading} title="刷新对话记录">刷新对话</button>
            </div>
            <div
              ref={assistantChatBodyRef}
              className="overflow-y-auto custom-scrollbar bg-gray-100/70 rounded p-2 mb-2 space-y-2 text-sm max-h-[30rem] flex-grow"
            >
                {assistantChatHistory.map(entry => (
                    <div key={entry.id} className={`p-1.5 rounded-md ${entry.type === 'player_input' ? 'bg-sky-200/80 self-end ml-4' : 'bg-indigo-200/70 self-start mr-4'}`}>
                        <span className="font-bold block text-xs text-gray-600">{entry.speaker}:</span>
                        <p className="whitespace-pre-wrap text-gray-800 text-xs leading-snug">{entry.narrative}</p>

                        {entry.type === 'assistant_suggestion' && entry.suggestedFullProfileData && entry.events && (
                            <div className="mt-1 pt-1 border-t border-indigo-300/50">
                                <strong className="text-xs text-indigo-700 block mb-0.5">建议的完整档案详情:</strong>
                                <ul className="list-disc list-inside pl-1 space-y-0.5 text-xs text-gray-700 mb-1.5">
                                    {entry.suggestedFullProfileData.name && <li>姓名: {entry.suggestedFullProfileData.name}</li>}
                                    {entry.suggestedFullProfileData.gender && <li>性别: {entry.suggestedFullProfileData.gender}</li>}
                                    {entry.suggestedFullProfileData.age !== undefined && <li>年龄: {entry.suggestedFullProfileData.age}</li>}
                                    {entry.suggestedFullProfileData.description && <li>说明: {entry.suggestedFullProfileData.description}</li>}
                                    {entry.suggestedFullProfileData.objective && <li>目标: {entry.suggestedFullProfileData.objective}</li>}
                                    {entry.suggestedFullProfileData.location && <li>地点: {entry.suggestedFullProfileData.location}</li>}
                                    {entry.suggestedFullProfileData.money !== undefined && <li>金钱: {entry.suggestedFullProfileData.money}</li>}
                                    {entry.suggestedFullProfileData.suggestedGameStartTime &&
                                      <li>开始时间: {new Date(entry.suggestedFullProfileData.suggestedGameStartTime).toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} (AI建议)</li>
                                    }
                                </ul>
                                {entry.events.filter(e => e.type === 'PRESENT_SUGGESTED_POKEMON_DETAILS' && e.pokemonDetails).map((pokemonEvent, idx) => {
                                    const suggestedPokemon = sanitizePokemonFn(pokemonEvent.pokemonDetails!);
                                    return (
                                        <div key={`fullprof-poke-${idx}`} className="my-1 p-1.5 bg-white/50 rounded cursor-pointer hover:bg-white/80 transition-colors"
                                             onClick={() => setPokemonToViewInModal(suggestedPokemon)} role="button" tabIndex={0}
                                             onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setPokemonToViewInModal(suggestedPokemon);}}
                                             aria-label={`查看 ${suggestedPokemon.name} 详情`}
                                        >
                                          <p className="text-xs text-purple-700 font-semibold mb-0.5">建议宝可梦:</p>
                                          <PokemonCard
                                            pokemon={suggestedPokemon}
                                            isBattleCard={false}
                                            onRegenerateImage={onRegeneratePokemonImage}
                                          />
                                        </div>
                                    );
                                })}
                                {entry.events.filter(e => e.type === 'PRESENT_SUGGESTED_ITEM_DETAILS' && e.itemDetails).map((itemEvent, idx) => {
                                    const suggestedItem = sanitizeItemFn(itemEvent.itemDetails!);
                                    const itemWithQty = {...suggestedItem, quantity: itemEvent.quantity || suggestedItem.quantity || 1};
                                    return (
                                        <div key={`fullprof-item-${idx}`} className="my-1 p-1.5 bg-white/50 rounded text-xs flex items-center gap-2">
                                            {itemWithQty.imageUrl && (
                                                <img
                                                    src={itemWithQty.imageUrl} alt={itemWithQty.name}
                                                    className="w-8 h-8 object-contain rounded bg-gray-200/70 p-0.5 border border-gray-300"
                                                    onError={(e) => handleItemImageError(e, itemWithQty.name)}
                                                />
                                            )}
                                            <div className="flex-grow">
                                                <span className="text-purple-700 font-semibold">{itemWithQty.name}</span> x {itemWithQty.quantity}
                                                {itemWithQty.effectText && <span className="block text-indigo-700 font-medium text-[0.7rem] leading-tight mt-0.5">{itemWithQty.effectText}</span>}
                                                {itemWithQty.description && itemWithQty.description !== itemWithQty.effectText && <span className="block text-gray-600 italic text-[0.7rem] leading-tight mt-0.5">{itemWithQty.description}</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {entry.type === 'assistant_suggestion' && !entry.suggestedFullProfileData && entry.suggestedLocationDetails && (
                            <div className="my-1 p-1.5 bg-white/50 rounded text-xs">
                                <p className="text-purple-700 font-semibold">建议地点: {entry.suggestedLocationDetails.newLocation}</p>
                                {entry.suggestedLocationDetails.mapData && (
                                    <pre className="mt-1 text-xs font-mono bg-gray-200/50 p-1 rounded overflow-x-auto">{entry.suggestedLocationDetails.mapData}</pre>
                                )}
                            </div>
                        )}
                        {entry.type === 'assistant_suggestion' && !entry.suggestedFullProfileData && entry.suggestedPokemonForConfirmation && (
                            <div
                              className="my-1 p-1.5 bg-white/50 rounded cursor-pointer hover:bg-white/80 transition-colors"
                              onClick={() => entry.isClickableSuggestion && setPokemonToViewInModal(entry.suggestedPokemonForConfirmation!)}
                              role="button" tabIndex={0}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') entry.isClickableSuggestion && setPokemonToViewInModal(entry.suggestedPokemonForConfirmation!)}}
                              aria-label={`查看 ${entry.suggestedPokemonForConfirmation.name} 详情`}
                            >
                               <PokemonCard
                                  pokemon={entry.suggestedPokemonForConfirmation}
                                  isBattleCard={false}
                                  onRegenerateImage={onRegeneratePokemonImage}
                                />
                                {entry.isClickableSuggestion && <p className="text-xs text-cyan-600 italic mt-0.5 text-center">点击宝可梦卡片查看详情</p>}
                            </div>
                        )}
                        {entry.type === 'assistant_suggestion' && !entry.suggestedFullProfileData && entry.suggestedItemForConfirmation && (
                             <div className="my-1 p-1.5 bg-white/50 rounded text-xs flex items-center gap-2">
                                {entry.suggestedItemForConfirmation.imageUrl && (
                                    <img
                                        src={entry.suggestedItemForConfirmation.imageUrl}
                                        alt={entry.suggestedItemForConfirmation.name}
                                        className="w-8 h-8 object-contain rounded bg-gray-200/70 p-0.5 border border-gray-300"
                                        onError={(e) => handleItemImageError(e, entry.suggestedItemForConfirmation!.name)}
                                    />
                                )}
                                <div className="flex-grow">
                                    <span className="text-purple-700 font-semibold">{entry.suggestedItemForConfirmation.name}</span> x {entry.suggestedItemForConfirmation.quantity}
                                    {entry.suggestedItemForConfirmation.effectText &&
                                        <span className="block text-indigo-700 font-medium text-[0.7rem] leading-tight mt-0.5">{entry.suggestedItemForConfirmation.effectText}</span>
                                    }
                                    {entry.suggestedItemForConfirmation.description && entry.suggestedItemForConfirmation.description !== entry.suggestedItemForConfirmation.effectText &&
                                        <span className="block text-gray-600 italic text-[0.7rem] leading-tight mt-0.5">{entry.suggestedItemForConfirmation.description}</span>
                                    }
                                </div>
                            </div>
                        )}

                        {entry.confirmationChoices && entry.confirmationChoices.length > 0 && (
                            <div className="mt-1.5 space-y-1">
                                {entry.confirmationChoices.map(choice => (
                                    <button key={choice.actionTag} onClick={() => handleAssistantSuggestionConfirmation(choice, entry as ChatHistoryEntry & { events?: AIEventTrigger[], suggestedFullProfileData?: FullProfileSuggestionData })}
                                            className="choice-button secondary w-full text-xs py-1 px-1.5" disabled={isAssistantLoading}>
                                        {choice.text}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                {isAssistantLoading && <p className="text-sky-600 italic text-xs animate-pulse">{aiLoadingStatus.message || "助手处理中..."}</p>}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSendAssistantChatMessage(); }} className="flex gap-1.5 mt-auto">
                <input type="text" value={assistantInput} onChange={e => setAssistantInput(e.target.value)} placeholder="和AI聊聊你的想法..." className="input-field flex-grow text-sm p-1.5" disabled={isAssistantLoading} />
                <button type="submit" className="choice-button px-3 py-1.5 text-sm" disabled={isAssistantLoading || !assistantInput.trim()}>发送</button>
            </form>
        </div>
      </div>

      <div className="w-full max-w-6xl mt-3 mb-2 flex flex-col sm:flex-row gap-3">
        <button onClick={onReRollFullProfile} className="choice-button secondary w-full py-2" disabled={isMainFormLoading}>
          {isMainFormLoading ? (aiLoadingStatus.message || "处理中...") : "重新生成主要档案"}
        </button>
        <button onClick={handleSubmitForm} className="choice-button w-full py-2" disabled={isMainFormLoading || !initialProfileGenerated || isAssistantLoading}>
          {isMainFormLoading ? (aiLoadingStatus.message || "处理中...") : (isAssistantLoading ? "助手思考中..." : "开始冒险")}
        </button>
      </div>
    </div>
    {pokemonToViewInModal && (
        <PokemonDetailModal
          pokemon={pokemonToViewInModal}
          isOpen={!!pokemonToViewInModal}
          onClose={() => setPokemonToViewInModal(null)}
          onRegenerateImage={onRegeneratePokemonImage}
        />
    )}
    </>
  );
};

export default CustomizeRandomStartScreen;
