import type { NextApiRequest, NextApiResponse } from 'next'
import Cors from 'cors'
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";

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
      // const completion = await openai.createCompletion({
      //   model: "text-davinci-003",
      //   prompt: generatePrompt(text,vocabulary),
      //   max_tokens: 500,
      //   temperature: 0.2,
      //   n: 1,
      // });
      // const parsedResult = completion.data.choices[0].text.trim();
      const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: generatePrompt(text,vocabulary),
        n: 1,
      });
      const parsedResult = completion.data.choices[0].message.content.trim();

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
  
// function generatePrompt(text, vocabulary, maxreturn) {
//   return `As an English language expert, your task is to analyze the words list in CSV format provided within triple quotes and identify words that might be unfamiliar to a non-native English speaker who is familiar with the ${vocabulary} most common English words, or a vocabulary level of ${vocabulary}. Keep in mind that a native English speaker has an average vocabulary of 15,000 words, but a non-native English speaker with IELTS test score of 6 has an average vocabulary of 6,000 words which is almost the same as a 8-year-old child. Considering the given vocabulary level (${vocabulary} words), it is important to only return a list of the ${maxreturn} most unfamiliar words in CSV format, no more than ${maxreturn} words. Include only the words you picked out, nothing else, for example: "word1,word2,word3". If you really sure that the non-native English speaker know all the words, return: "none". Here is the words list:
//   """${text}"""`;
// }

// function generatePrompt(text, vocabulary) {
//   return `As an English language expert, your task is to analyze the given words list in CSV format and identify words that might be unfamiliar to a non-native English speaker who is familiar with an amount of most common English words, or vocabulary level. Keep in mind that a native English speaker has an average vocabulary of 15,000 words, but a non-native English speaker with IELTS test score of 6 has an average vocabulary of 5,000 words. Considering the given vocabulary level, return a list of the unfamiliar words in CSV format. If you really sure that the non-native English speaker knows all the words, return: "none".
//   <Given words list>flood,pencil,skirt,portmanteau,stall,carve,ledge,respite,reproach,offal,rancid,midriff,chivvy,tureen,inveigle,ceiling,meadow,stance,shovel,cute,plank
//   <Vocabulary level>4000
//   <Unfamiliar words list>portmanteau,stall,respite,reproach,offal,rancid,midriff,chivvy,tureen,inveigle,plank
//   <Given words list>hollow,flood,pencil,forbid,stern,ingratiate,plank,eavesdrop,skirt,legerdemain,cute,hamper,gleam,shrill,tickle,uxoricide,accomplish,shaggy,drip,warranty
//   <Vocabulary level>8000
//   <Unfamiliar words list>ingratiate,eavesdrop,legerdemain,uxoricide,hamper
//   <Given words list>${text}
//   <Vocabulary level>${vocabulary}
//   <Unfamiliar words list>`;
// }

// function generatePrompt(text, vocabulary) {
//   return `As an English language expert, your task is to analyze the given words list in CSV format and identify words that might be unfamiliar to a non-native English speaker who is familiar with an amount of most common English words, or vocabulary level. Keep in mind that a native English speaker has an average vocabulary of 15,000 words, but a non-native English speaker with IELTS test score of 6 has an average vocabulary of 5,000 words. Considering the given vocabulary level, return a list of the unfamiliar words in CSV format. If you really sure that the non-native English speaker knows all the words, return: "none".
//   <Given words list>flood,pencil,skirt,stall,carve,ledge,ceiling,meadow,stance,shovel,cute,plank,next,pay,enough,best,flow,clever,shake,sham,rind,weasel,grouse,bury,shrivel,pastiche,discomfit,sully
//   <Vocabulary level>4000
//   <Unfamiliar words list>stall,ledge,ceiling,stance,sham,rind,weasel,grouse,shrivel,pastiche,discomfit
//   <Given words list>flood,pencil,skirt,stall,carve,ledge,ceiling,meadow,stance,shovel,cute,plank,next,pay,enough,best,flow,clever,shake,sham,rind,weasel,grouse,bury,shrivel,pastiche,discomfit,sully
//   <Vocabulary level>8000
//   <Unfamiliar words list>rind,grouse,shrivel,pastiche,discomfit
//   <Given words list>${text}
//   <Vocabulary level>${vocabulary}
//   <Unfamiliar words list>`;
// }
// function generatePrompt(text, vocabulary) {
//   return `As an advanced AI language model, your task is to analyze the given list of words and identify those that may be unfamiliar to a non-native English speaker with a vocabulary level of ${vocabulary} words. For context, a native English speaker has an average vocabulary of 15,000 words, while a non-native English speaker with an IELTS test score of 6 typically knows around 5,000 words. Please return a list of the unfamiliar words in CSV format. If you believe that the non-native English speaker would be familiar with all the words given their vocabulary level, please return "none".

//   Here are some examples to guide you:
//   If the given words are 'flood,pencil,skirt,stall,carve,ledge,ceiling,meadow,stance,shovel,cute,plank,next,pay,enough,best,flow,clever,shake,sham,rind,weasel,grouse,bury,shrivel,pastiche,discomfit,sully' and the vocabulary level is 4000, the unfamiliar words might be 'stall,ledge,ceiling,stance,sham,rind,weasel,grouse,shrivel,pastiche,discomfit'.
//   If the given words are the same and the vocabulary level is 8000, the unfamiliar words might be 'rind,grouse,shrivel,pastiche,discomfit'.

//   Now, here is the list of words for you to analyze:
//   ${text}

//   Based on your expertise, please identify the unfamiliar words for a non-native English speaker with a vocabulary level of ${vocabulary} words. Remember to return the words in CSV format. If all words are likely to be familiar, please return "none".`;
// }

function generatePrompt(text, vocabulary) : ChatCompletionRequestMessage[]{
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
