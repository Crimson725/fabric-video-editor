// "use server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "sk-2mU6aXYX5TWvURv714B24d823dB54a3c88F682D74c918c18",
  baseURL: "https://aihubmix.com/v1",
  dangerouslyAllowBrowser: true
});

const getClipTopic = async (clipContent: string[]): Promise<string> => {
  try {
    const combinedContent = clipContent.join(" ");
    const response = await client.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: `Based on the given content, generate a short topic: ${combinedContent}` }
      ],
      model: "gpt-4o-mini",
      max_tokens: 10,
    });
    return response.choices?.[0]?.message?.content?.trim() ?? '';
  } catch (error) {
    console.error("Error in getClipTopic:", error);
    return "Untitled";
  }
};

// Test function
// const testGetClipTopic = async () => {
//   try {
//     // Test case 1: Single video filename
//     const result1 = await getClipTopic(["cooking_pasta_tutorial.mp4"]);
//     console.log("Test 1 - Single video:", result1);

//     // Test case 2: Multiple related videos
//     const result2 = await getClipTopic([
//       "beach_vacation_2023.mp4",
//       "swimming_in_ocean.mp4",
//       "sunset_beach.mp4"
//     ]);
//     console.log("Test 2 - Multiple related videos:", result2);

//     // Test case 3: Empty array
//     const result3 = await getClipTopic([]);
//     console.log("Test 3 - Empty array:", result3);

//     // Test case 4: Invalid input
//     const result4 = await getClipTopic([""]);
//     console.log("Test 4 - Invalid input:", result4);

//   } catch (error) {
//     console.error("Test failed:", error);
//   }
// };

// testGetClipTopic();


export { getClipTopic };