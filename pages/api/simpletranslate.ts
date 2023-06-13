import type { NextApiRequest, NextApiResponse } from 'next'
import Cors from 'cors'
import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

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

    // // Rest of the API logic
    // res.json({ message: `Hello Everyone!${process.env.TEST_KEY}` })

    if (!configuration.apiKey) {
      res.status(500).json({
        error: {
          message: "OpenAI API key not configured.",
        }
      });
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
      const completion = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: generatePrompt(word),
        max_tokens: 1000,
        temperature: 0.3,
      });
      res.status(200).json({ result: completion.data.choices[0].text });
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
    return `Act as a English to Chinese word translator. You will provide the original form of the word (if any), up to 2 meanings in Chinese (including parts of speech). Please strictly follow the format below for the translation result.
    Translate: ${word}.

    <original form>:
    <meaning 1>:
    <meaning 2 (if any)>:
    `;
}