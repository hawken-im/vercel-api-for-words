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
      res.status(200).json({ result: completion.choices[0].message.content.trim() });
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
        content: `Act as an English to Chinese (Simplified) word translator. You will provide the translation results in the following format, making sure to include the "<>" symbols:
<original form>:
<phonetic notation>:
<meaning>:
<example>:
...
<synonyms>:
Please strictly follow this format for the translation result.`
      },
      {
        role: "user",
        content: `Translate: {advance}`
      },
      {
        role: "assistant",
        content: `<original form>:advance
<phonetic notation>:/ əd'væns /
<meaning>:v. move forward, make progress 前进, 进展  
<example>:The troops are advancing on the capital.\n部队正朝首都前进。
<meaning>:vt. to suggest an idea or theory 提出（想法或理论）
<example>:the theory advanced in this article\n这篇论文提出的理论 
<meaning>:n. development, movement forward 发展, 挺进 
<example>:Nothing could stop the advance of the floodwaters.\n洪水滔滔奔来，势不可挡。
<meaning>:n. money paid before the regular time 预付款 
<example>:She asked for a £300 advance on her salary.\n她要求预付她300英镑薪水。
<synonyms>:advance / advanced / advances / advancing`
      },
      {
        role: "user",
        content: `Translate: {${word}}`
      }
    ]
}