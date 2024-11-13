import { HfInference } from "@huggingface/inference";
import Router from 'koa-router';

const router = new Router();
const inference = new HfInference(process.env.HF_API_TOKEN);

const contentMainTypeImage = 'Image'
const contentMainTypeVideo = 'Video'
const contentMainTypeText = 'Text'

async function queryStream(data, ctx) {
  const contentMainType = data.contentMainType ?? contentMainTypeText;
  let stream = '';

  switch (contentMainType) {
    case contentMainTypeImage:
      stream = inference.chatCompletionStream({
        model: "meta-llama/Llama-3.2-11B-Vision-Instruct",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant who provides information based on web page content, images and user input. User's question or message: ${data.message}`
          },
          {
            role: "user",
            content: `Here is the content from the web page: ${data.pageContent}`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "These are images from the web page: "
              },
              ...data?.images?.map(url => ({
                type: "image_url",
                image_url: {
                  url
                }
              }))
            ]
          }
        ],
        max_tokens: 8000
      });
      break;
    case contentMainTypeText:
    default:
      stream = inference.chatCompletionStream({
        model: "meta-llama/Llama-3.2-1B-Instruct",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant who provides information based on web page content and user input. The main content type of this page is  ${contentMainType}`
          },
          {
            role: "user",
            content: `User's question or message: ${data.message}`
          },
          {
            role: "user",
            content: `Here is the content from the web page: ${data.pageContent}`
          }],
        max_tokens: 500
      });
  }

  ctx.set('Content-Type', 'text/plain; charset=utf-8');
  ctx.set('Transfer-Encoding', 'chunked');

  ctx.status = 200;
  ctx.res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Transfer-Encoding': 'chunked'
  });


  for await (const chunk of stream) {
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
