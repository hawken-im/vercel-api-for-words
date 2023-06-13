import type { NextApiRequest, NextApiResponse } from 'next'
import Cors from 'cors'
import { AzureKeyCredential, OpenAIClient } from '@azure/openai';
const endpoint = process.env.AZURE_OPENAI_ENDPOINT
const azureApiKey = process.env.AZURE_OPENAI_KEY

// Initializing the cors middleware
// You can read more about the available options here: https://github.com/expressjs/cors#configuration-options
const cors = Cors({
    //origin: ["https://hawken-im.github.io/"],//TODO: add authentication method later, so I can change it to true.
    origin: true,
    methods: ['POST', 'GET', 'HEAD'],
})

// Helper method to wait for a middleware to execute before continuing
// And to throw an error when an error happens in a middleware
function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  fn: Function
) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result)
      }

      return resolve(result)
    })
  })
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Run the middleware
    await runMiddleware(req, res, cors)

    // Extract and validate the API key
    const apiKey = req.headers['authorization']?.split(' ')[1] || req.headers['x-api-key'];
    if (apiKey !== process.env.MY_API_KEY) {
      res.status(401).json({ error: { message: 'Unauthorized' } });
      return;
    }
  
    const word = req.body.word || '';
    if (word.trim().length === 0) {
      res.status(400).json({
        error: {
          message: "Input word invalid",
        }
      });
      return;
    }
  
    try {
      const client = new OpenAIClient(endpoint, new AzureKeyCredential(azureApiKey));
      const deploymentId = "HRHgpt35"
      const prompt = generatePrompt(word);
      const completion = await client.getChatCompletions(deploymentId, prompt); 
      res.status(200).json({ result: completion.choices[0].message.content });
    } catch(error) {
      // Consider adjusting the error handling logic for your use case
      if (error.response) {
        console.error(error.response.status, error.response.data);
        res.status(error.response.status).json(error.response.data);
      } else {
        console.error(`Error with OpenAI API request: ${error.message}`);
        res.status(500).json({
          error: {
            message: 'An error occurred during your request.',
          }
        });
      }
    }
}
  
function generatePrompt(word) {
    return [
      {
        role: "system",
        content: `Act as a English to Chinese (Simplified) word translator. You will provide the original form of the word (if any), the corresponding phonetic notation (if any), all meanings (including parts of speech) in both English and Chinese with bilingual examples, synonyms(if any). Please strictly follow the format below for the translation result.
        <original form>:
        <phonetic notation>:
        <meaning>:
        <example>:
        <meaning>:
        <example>:
        ...
        <meaning>:
        <example>:
        <synonyms>:`
      },
      {
        role: "user",
        content: `Look up: {advance}`
      },
      {
        role: "assistant",
        content: `<original form>:advance
        <phonetic notation>:əd'væns
        <meaning>:v. move forward, make progress 前进, 进展 
        <example>:The troops are advancing on the capital. 部队正朝首都挺进。
        <meaning>:vt. to suggest an idea or theory 提出（想法或理论）
        <example>:the theory advanced in this article 这篇论文提出的理论
        <meaning>:n. development, movement forward 发展, 挺进
        <example>:Nothing could stop the advance of the floodwaters. 洪水滔滔奔来，势不可挡。
        <meaning>:n. money paid before the regular time 预付款
        <example>:She asked for a £300 advance on her salary. 她要求预付她300英镑薪水。
        <synonyms>:advance / advanced / advances / advancing`
      },
      {
        role: "user",
        content: `Look up: {development}`
      },
      {
        role: "assistant",
        content: `
        <original form>:development
        <phonetic notation>:dɪ'veləpmənt
        <meaning>:the process in which someone or something grows 成长, 发育
        <example>:healthy growth and development 健康的成长发育
        <meaning>:a recent event 动态, 进展
        <example>:Call me if there are any new developments. 如果有什么新动态就给我打电话。
        <meaning>:the process of developing something new 开发, 研制
        <example>:the development of new drugs 新药的研制
        <synonyms>:development / developments`
      },
      {
        role: "user",
        content: `Translate: {${word}}`
      }
    ]
    //  `Act as a English to Chinese (Simplified) word translator. You will provide the original form of the word (if any), the corresponding phonetic notation (if any), all meanings (including parts of speech) in both English and Chinese, a bilingual example. Please strictly follow the format below for the translation result.
    // Translate: ${word}.

    // <original form>:
    // <phonetic notation>:
    // <meaning 1>:
    // <meaning 2>:
    // ...
    // <meaning n>:
    // <bilingual example>:
    // `;
}