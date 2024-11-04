import { HfInference } from "@huggingface/inference";
import Router from 'koa-router';

const router = new Router();
const inference = new HfInference(process.env.HF_API_TOKEN);

async function queryStream(data, ctx) {
  const messages = [
    {
      role: "system",
      content: "You are a helpful assistant who provides information based on web page content and user input."
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

  ctx.set('Content-Type', 'text/plain; charset=utf-8');
  ctx.set('Transfer-Encoding', 'chunked');

  ctx.status = 200;
  ctx.res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Transfer-Encoding': 'chunked'
  });

  for await (const chunk of inference.chatCompletionStream({
    model: "meta-llama/Llama-3.2-1B-Instruct",
    messages,
    max_tokens: 500,
  })) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) {
      ctx.res.write(content);
    }
  }

  ctx.res.end();
}

router.prefix('/chat');

router.post('/', async function (ctx) {
  const data = ctx.request.body;
  await queryStream(data, ctx);
});

export default router;
