import { GoogleGenAI } from '@google/genai';
import { Request, Response } from 'express';
import https from 'https';
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

  public async iceServers(req: Request, res: Response): Promise<void> {
    try {
      // Xirsys credentials from environment variables
      const ident = process.env.XIRSYS_IDENT || 'sagarhasan273';
      const secret = process.env.XIRSYS_SECRET || '0fcde8a4-1c27-11f1-8aac-0242ac140002';
      const channel = process.env.XIRSYS_CHANNEL || 'MyFirstApp';
      // Prepare request to Xirsys
      const options = {
        host: "global.xirsys.net",
        path: `/_turn/${channel}`,
        method: "PUT",
        headers: {
          "Authorization": "Basic " + Buffer.from(`${ident}:${secret}`).toString("base64"),
          "Content-Type": "application/json",
        }
      };

      // Create the request
      const httpreq = https.request(options, (httpres) => {
        let data = '';

        httpres.on("data", (chunk) => {
          data += chunk;
        });

        httpres.on("error", (e) => {
          console.error("Xirsys stream error: ", e);
          res.status(500).json({
            status: false,
            error: 'Failed to fetch ICE servers from Xirsys'
          });
        });

        httpres.on("end", () => {
          try {
            const response = JSON.parse(data);

            // Check if Xirsys returned success
            if (response.s !== 'ok') {
              throw new Error('Xirsys returned error status');
            }

            const iceServers = response.v.iceServers;

            // Format for RTCPeerConnection
            const formattedResponse = {
              status: true,
              iceServers: [{
                urls: Array.isArray(iceServers.urls) ? iceServers.urls : [iceServers.urls],
                username: iceServers.username,
                credential: iceServers.credential
              }],
              iceCandidatePoolSize: 10
            };

            res.status(200).json(formattedResponse);
          } catch (error) {
            console.error('Parse error:', error);
            res.status(500).json({
              status: false,
              error: 'Invalid response from Xirsys'
            });
          }
        });
      });

      httpreq.on("error", (e) => {
        console.error("Xirsys request error: ", e);
        res.status(500).json({
          status: false,
          error: 'Request to Xirsys failed'
        });
      });

      // Set timeout for the request
      httpreq.setTimeout(10000, () => {
        httpreq.destroy();
        res.status(504).json({
          status: false,
          error: 'Xirsys request timeout'
        });
      });

      // Send the request body
      const bodyString = JSON.stringify({ format: "urls" });
      httpreq.write(bodyString);
      httpreq.end();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('ICE servers error:', errorMessage);
      res.status(500).json({
        status: false,
        message: errorMessage
      });
    }
  }
}