import { HfInference } from "@huggingface/inference";
import Router from 'koa-router';
const router = new Router();

const inference = new HfInference(process.env.HF_API_TOKEN);

async function query(data) {
  let result = ''

  // Set initial role prompt for system and user with page content
  const messages = [
    {
      role: "system",
      content: "You are a helpful assistant who provides information based on the given content from a web page."
    },
    {
      role: "user",
      content: `Here is the content from the web page: ${data.pageContent}`
    },
    {
      role: "user",
      content: `User's question or message: ${data.message}`
    }
  ];

  for await (const chunk of inference.chatCompletionStream({
    model: "meta-llama/Llama-3.2-1B-Instruct",
    messages,
    max_tokens: 500,
  })) {
    result += chunk.choices[0]?.delta?.content || ""
  }
  return result;
}

router.prefix('/chat')

router.post('/', async function (ctx, next) {
  const data = ctx.request.body;
  const response = await query(data)
  ctx.body = response
})

export default router
