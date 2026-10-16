import { GoogleGenAI } from '@google/genai';
import { Request, Response } from 'express';
import { cloudinaryInstance, CloudinaryUploadResult } from 'src/config';

export class InventoryController {
  public async uploadImage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No image file provided' });
        return;
      }
      // Convert buffer to base64 string
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;

      // Upload to Cloudinary
      const result = (await cloudinaryInstance.uploader.upload(dataURI, {
        folder: 'user_profile',
        resource_type: 'auto',
        format: 'jpg',
      })) as CloudinaryUploadResult;

      res.status(200).json({
        status: true,
        imageUrl: result.secure_url,
        publicId: result.public_id,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ message: errorMessage });
    }
  }

  public async askAi(req: Request, res: Response): Promise<void> {
    try {
      const { prompt, context } = req.body;
      if (!prompt) {
        res.status(400).json({ status: false, message: 'Prompt is required' });
        return;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const systemInstruction = context
        ? `You are a helpful language room assistant. The room topic is: "${context}". Keep responses brief, conversational, and under 3 sentences.`
        : 'You are a helpful AI assistant in a voice chatroom. Keep responses concise and under 3 sentences.';

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
        },
      });

      res.status(200).json({
        status: true,
        answer: response.text,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'AI request failed';
      res.status(500).json({ status: false, message: msg });
    }
  }
}