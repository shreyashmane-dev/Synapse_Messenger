import { OpenAI } from 'openai';
import { dbAdmin } from './_firebaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { threadId, prompt, userId, senderName } = req.body;

  if (!prompt || !threadId) {
    return res.status(400).json({ error: 'Missing prompt or threadId' });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const isOpenRouter = apiKey && apiKey.startsWith('sk-or-');
    
    // 1. Initialize OpenAI (auto-route to OpenRouter if key is an OpenRouter key)
    const openai = new OpenAI({ 
       apiKey: apiKey,
       ...(isOpenRouter && { baseURL: 'https://openrouter.ai/api/v1' })
    });
    
    // 2. Fetch AI Response
    const response = await openai.chat.completions.create({
      model: isOpenRouter ? "openai/gpt-3.5-turbo" : "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    const aiText = response.choices[0].message.content;

    // 3. Save AI prompt and Response context to ai_history explicitly
    // using dbAdmin. Avoid crashing if Admin is unconfigured while testing.
    if (dbAdmin) {
       await dbAdmin.collection('ai_history').add({
         userId: userId || 'unknown',
         threadId,
         prompt,
         response: aiText,
         createdAt: new Date().toISOString()
       });

       // 4. Save the AI response directly into the messages collection
       await dbAdmin.collection('messages').add({
         threadId,
         senderId: 'ai',
         senderName: 'Synapse AI',
         content: aiText,
         createdAt: new Date().toISOString()
       });
    }

    // 5. Return success natively to client just in case Realtime fails
    return res.status(200).json({ success: true, text: aiText });

  } catch (error) {
    console.error('AI Error:', error);
    
    // In case of error, write the error message to the chat
    if (dbAdmin) {
       await dbAdmin.collection('messages').add({
         threadId,
         senderId: 'ai',
         senderName: 'Synapse AI',
         content: `System Error: ${error.message || 'OpenAI failed.'}`,
         createdAt: new Date().toISOString()
       });
    }

    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
