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
        content: `Act as a English to Chinese (Simplified) word translator. You will provide the original form of the word, the phonetic notation, all meanings (including part of speech) in both English and Chinese with bilingual examples, synonyms(if any). Please strictly follow the format below for the translation result.
        <original form>:
        <phonetic notation>:
        <meaning>:
        <example>:
        ...
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
        <meaning>:v. 前进, 进展 move forward, make progress 
        <example>:部队正朝首都前进。 The troops are advancing on the capital.
        <meaning>:vt. 提出（想法或理论） to suggest an idea or theory 
        <example>:这篇论文提出的理论 the theory advanced in this article
        <meaning>:n. 发展, 挺进 development, movement forward
        <example>:洪水滔滔奔来，势不可挡。 Nothing could stop the advance of the floodwaters.
        <meaning>:n. 预付款 money paid before the regular time
        <example>:她要求预付她300英镑薪水。 She asked for a £300 advance on her salary.
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
        <meaning>:n. 成长, 发育 the process in which someone or something grows
        <example>:健康的成长发育 healthy growth and development
        <meaning>:n. 动态, 进展 a recent event
        <example>:如果有什么新动态就给我打电话。 Call me if there are any new developments.
        <synonyms>:development / developments`
      },
      {
        role: "user",
        content: `Translate: {${word}}`
      }
    ]
}