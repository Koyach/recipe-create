"use client";

import axios from "axios";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

interface Ingredient {
  id: string;
  name: string;
  amount: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  isIngredientList?: boolean;
}

const BASIC_SEASONINGS = `
調味料・香辛料は以下のものを適宜使用可能とします：
- 基本調味料：塩、砂糖、醤油、味噌、酢、みりん、料理酒
- 油類：サラダ油、ごま油、オリーブオイル
- 薬味・香辛料：胡椒、からし、わさび、生姜、にんにく
- 調味料：マヨネーズ、ケチャップ、ソース、めんつゆ、だし、ポン酢、ドレッシング
- 中華調味料：豆板醤、甜麺醤
`;

const RecipeGenerator = () => {
  const initialIngredients: Ingredient[] = [
    { id: '1', name: '', amount: '' },
    { id: '2', name: '', amount: '' },
    { id: '3', name: '', amount: '' },
  ];

  const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredients);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>("");

  const addIngredient = () => {
    const newId = Date.now().toString();
    setIngredients([...ingredients, { id: newId, name: "", amount: "" }]);
  };

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter(ing => ing.id !== id));
  };

  const updateIngredient = (id: string, field: 'name' | 'amount', value: string) => {
    setIngredients(ingredients.map(ing => 
      ing.id === id ? { ...ing, [field]: value } : ing
    ));
  };

  const resetChat = () => {
    setChatHistory([]);
    setInputText("");
    setIsLoading(false);
  };

  const generateRecipe = async () => {
    if (ingredients.length === 0) return;

    const ingredientsList = ingredients
      .filter(ing => ing.name.trim() !== "")
      .map(ing => `${ing.name} ${ing.amount}g`)
      .join("、");

    const prompt = `以下の食材（グラム単位）を使用した料理のレシピを提案してください：
${ingredientsList}

注意事項：
- できる限り入力された食材のみを使用してレシピを考えてください
- 全ての食材を使い切る必要はありませんが、できるだけ多くの食材を活用してください
- 余った食材は他の料理や保存可能です

${BASIC_SEASONINGS}

以下の形式で出力してください：
1. 料理名
2. 調理時間
3. 実際に使用する食材と量
4. 手順
5. コツやポイント`;

    setIsLoading(true);
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [{ text: prompt }]
          }]
        },
        {
          headers: { "Content-Type": "application/json" }
        }
      );

      const responseContent = response.data.candidates[0].content;
      const recipe = responseContent.parts.map((part: { text: string }) => part.text).join("\n");

      setChatHistory([
        { role: "user", text: `食材：${ingredientsList}`, isIngredientList: true },
        { role: "assistant", text: recipe }
      ]);
    } catch (error) {
      console.error("レシピの生成中にエラーが発生しました:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    
    setIsLoading(true);
    const newHistory: ChatMessage[] = [
      ...chatHistory,
      { role: "user", text: inputText }
    ];

    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          contents: [
            ...newHistory.map(msg => ({
              role: msg.role,
              parts: [{ text: msg.text }]
            }))
          ]
        },
        {
          headers: { "Content-Type": "application/json" }
        }
      );

      const responseContent = response.data.candidates[0].content;
      const responseParts = responseContent.parts.map((part: { text: string }) => part.text).join("\n");

      setChatHistory([...newHistory, { role: "assistant", text: responseParts }]);
      setInputText("");
    } catch (error) {
      console.error("応答の生成中にエラーが発生しました:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-center text-gray-800 mb-8">AI レシピ提案</h1>
      
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">食材リスト</h2>
          <button
            onClick={addIngredient}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            食材を追加
          </button>
        </div>

        <div className="grid grid-cols-12 gap-4 mb-4 px-4 text-sm text-gray-600">
          <div className="col-span-5">食材名</div>
          <div className="col-span-5">分量（g）</div>
          <div className="col-span-2">操作</div>
        </div>

        {ingredients.map((ing) => (
          <div key={ing.id} className="grid grid-cols-12 gap-4 mb-4">
            <input
              type="text"
              value={ing.name}
              onChange={(e) => updateIngredient(ing.id, 'name', e.target.value)}
              placeholder="例：玉ねぎ"
              className="col-span-5 px-4 py-2 border rounded-lg"
            />
            <div className="col-span-5 flex">
              <input
                type="number"
                value={ing.amount}
                onChange={(e) => updateIngredient(ing.id, 'amount', e.target.value)}
                placeholder="例：200"
                className="flex-1 px-4 py-2 border rounded-l-lg"
                min="0"
              />
              <span className="px-3 py-2 bg-gray-100 border-y border-r rounded-r-lg">
                g
              </span>
            </div>
            <button
              onClick={() => removeIngredient(ing.id)}
              className="col-span-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              削除
            </button>
          </div>
        ))}

        <div className="flex gap-4 justify-end mt-4">
          <button
            onClick={generateRecipe}
            disabled={isLoading || ingredients.filter(ing => ing.name.trim() !== "").length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isLoading ? "レシピを生成中..." : "レシピを生成"}
          </button>
          <button
            onClick={resetChat}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            新しいレシピを作る
          </button>
        </div>
      </div>

      <div className="bg-gray-100 rounded-xl p-4 min-h-[400px]">
        {chatHistory.map((msg, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg mb-4 shadow ${
              msg.role === "user" ? "bg-blue-50 ml-8" : "bg-white mr-8"
            }`}
          >
            <div className="text-sm text-gray-600 mb-2">
              {msg.role === "user" 
                ? (msg.isIngredientList ? "選択した食材" : "質問") 
                : "AI回答"}
            </div>
            <div className="prose">
              <ReactMarkdown>{msg.text}</ReactMarkdown>
            </div>
          </div>
        ))}
        
        <div className="flex gap-4 mt-4">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="レシピについて質問する"
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecipeGenerator;

