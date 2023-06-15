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
        content: `
  Please act as a professional English-Chinese dictionary,
  and list the original form of the word (if any),
  the corresponding phonetic notation,
  all meanings with parts of speech and bilingual sentence examples.
  Finally provide the synonyms (if any).
  If you think there is a spelling mistake,
  please tell user the most possible correct word otherwise reply in the following format:
  <word> (<original form>)
  <phonetic notation>
  <index>. [<part of speech>] <meaning in source language> <translated meaning>\n- <example sentence> <sentence translation>
  (Synonyms: <synonyms>)`
      },
      {
        role: "user",
        content: `Please translate the English word: ${word}`
      }
    ]
}

//  Finally provide the etymology.