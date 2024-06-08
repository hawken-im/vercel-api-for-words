import type { NextApiRequest, NextApiResponse } from "next";
import Cors from "cors";
import { AzureKeyCredential, OpenAIClient } from "@azure/openai";
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const azureApiKey = process.env.AZURE_OPENAI_KEY;

const openai = new OpenAIClient(endpoint, new AzureKeyCredential(azureApiKey));
//const deploymentId = "text-davinci-003";
//const result = await client.getCompletions(deploymentId, prompt);

// Initializing the cors middleware
// You can read more about the available options here: https://github.com/expressjs/cors#configuration-options
const cors = Cors({
  //origin: ["https://hawken-im.github.io/"],//TODO: add authentication method later, so I can change it to true.
  origin: true,
  methods: ["POST", "GET", "HEAD"],
});

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
        return reject(result);
      }

      return resolve(result);
    });
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Run the middleware
  await runMiddleware(req, res, cors);

  // Extract and validate the API key
  const apiKey =
    req.headers["authorization"]?.split(" ")[1] || req.headers["x-api-key"];
  if (apiKey !== process.env.MY_API_KEY) {
    res.status(401).json({ error: { message: "Unauthorized" } });
    return;
  }

  // // Rest of the API logic
  // res.json({ message: `Hello Everyone!${process.env.TEST_KEY}` })

  if (!openai) {
    res.status(500).json({
      error: {
        message: "Azure OpenAI API key not configured.",
      },
    });
    return;
  }

  const word = req.body.word || "";

  try {
    const client = new OpenAIClient(
      endpoint,
      new AzureKeyCredential(azureApiKey)
    );
    //const deploymentId = "text-davici-003";
    const deploymentId = "HRHgpt35";

    const prompt = generatePrompt(word);

    const result = await client.getChatCompletions(deploymentId, prompt, {
      temperature: 0.1,
    });
    const parsedResult = result.choices[0].message.content.trim();
    res.status(200).json({ result: parsedResult });
  } catch (error) {
    // Consider adjusting the error handling logic for your use case
    if (error.response) {
      console.error(error.response.status, error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error(`Error with OpenAI API request: ${error.message}`);
      res.status(500).json({
        error: {
          message: "An error occurred during your request.",
        },
      });
    }
  }
}

function generatePrompt(word) {
  return [
    {
      role: `system`,
      content: `Given a theme word "${word}", generate an English sentence that originates from a book, movie, song lyric, or a well-known personality. The sentence does not need to include the theme word, but should be related to it. The sentence must NOT be a fabrication. Please provide the source of the sentence. The format of the output should strictly follow the structure: <sentence> - <source>`,
    },
  ];
}
