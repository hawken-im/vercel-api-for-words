import type { NextApiRequest, NextApiResponse } from 'next'
import Cors from 'cors'
import { AzureKeyCredential, OpenAIClient } from '@azure/openai';
const endpoint = process.env.AZURE_OPENAI_ENDPOINT
const azureApiKey = process.env.AZURE_OPENAI_KEY


const openai = new OpenAIClient(endpoint, new AzureKeyCredential(azureApiKey));
//const deploymentId = "text-davinci-003";
//const result = await client.getCompletions(deploymentId, prompt);

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

// function getMaxReturn(
//   vocabulary: number
// ) {
//   const result = Math.floor(((vocabulary - 3000) * (-7) / 5000) + 10);
//   if (result < 3) {
//       return 3
//     } else if (result > 10) {
//       return 10
//     } else {
//     return result;
//   }
// }

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

    // // Rest of the API logic
    // res.json({ message: `Hello Everyone!${process.env.TEST_KEY}` })

    if (!openai) {
      res.status(500).json({
        error: {
          message: "Azure OpenAI API key not configured.",
        }
      });
      return;
    }
  
    const text = req.body.text || '';
    const vocabulary = req.body.vocabulary || 3000;
    //const maxreturn = getMaxReturn(vocabulary);
    if (text.trim().length === 0) {
      res.status(400).json({
        error: {
          message: "Input text is not valid",
        }
      });
      return;
    }
  
    try {
      const client = new OpenAIClient(endpoint, new AzureKeyCredential(azureApiKey));
      //const deploymentId = "text-davici-003";
      const deploymentId = "HRHgpt35"

      const prompt = generatePrompt(text,vocabulary);
 
      const result = await client.getChatCompletions(deploymentId, prompt, {
        temperature: 0.1,
      });
      const parsedResult = result.choices[0].message.content.trim();
      res.status(200).json({ result: parsedResult });
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

function generatePrompt(text, vocabulary) {
  return [
    {
      role: `system`,
      content: 
        `You are an English language expert with a deep understanding of vocabulary complexity. This includes knowledge of word usage and frequency. You can analyze a list of words and identify those that may be unfamiliar or challenging to a non-native English speaker who is familiar with an amount of most common English words, or vocabulary level. Keep in mind that a native English speaker has an average vocabulary of 15,000 words, but a non-native English speaker with IELTS test score of 6 has an average vocabulary of 5,000 words. Considering the given vocabulary level, return a list of the unfamiliar words in CSV format. If you really sure that the non-native English speaker knows all the words, return: "none".`,
    },
    {
      role: `user`,
      content: 
        `Given words: {flood,pencil,skirt,stall,carve,ledge,ceiling,meadow,stance,shovel,cute,plank,next,pay,enough,best,flow,clever,shake,sham,rind,weasel,grouse,bury,shrivel,pastiche,discomfit,sully}
        Vocabulary level: {4000}`,
    },
    {
      role: `assistant`,
      content: `stall,ledge,ceiling,stance,sham,rind,weasel,grouse,shrivel,pastiche,discomfit`,
    },
    {
      role: `user`,
      content: 
        `Given words: {flood,pencil,skirt,stall,carve,ledge,ceiling,meadow,stance,shovel,cute,plank,next,pay,enough,best,flow,clever,shake,sham,rind,weasel,grouse,bury,shrivel,pastiche,discomfit,sully}
        Vocabulary level: {8000}`,
    },
    {
      role: `assistant`,
      content: `rind,grouse,shrivel,pastiche,discomfit`,
    },
    {
      role: `user`,
      content: 
        `Given words: {${text}}
        Vocabulary level: {${vocabulary}}`,
    }
  ]
}
