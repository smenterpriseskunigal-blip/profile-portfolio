import { GoogleGenAI } from '@google/genai';

function createClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface GenerateImageParams {
  prompt: string;
  model: 'gemini-3-pro-image-preview' | 'gemini-nano-banana-2.1';
  aspectRatio: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '9:16' | '16:9' | '21:9';
  imageSize: '1K' | '2K' | '4K';
}

export async function generateStudioImage(params: GenerateImageParams): Promise<{
  dataUrl: string;
  mimeType: string;
  textNote?: string;
}> {
  const ai = createClient();

  const response = await ai.models.generateContent({
    model: params.model,
    contents: {
      parts: [{ text: params.prompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: params.aspectRatio,
        imageSize: params.imageSize,
      },
    },
  });

  let dataUrl = '';
  let mimeType = 'image/png';
  let textNote = '';

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      mimeType = part.inlineData.mimeType ?? 'image/png';
      dataUrl = `data:${mimeType};base64,${part.inlineData.data}`;
    } else if (part.text) {
      textNote += part.text;
    }
  }

  if (!dataUrl) {
    throw new Error('No image payload returned from Gemini image model.');
  }

  return { dataUrl, mimeType, textNote: textNote || undefined };
}

export interface GenerateVideoParams {
  prompt: string;
  aspectRatio: '16:9' | '9:16';
  imageBase64?: string;
  imageMimeType?: string;
}

export async function generateStudioVideo(params: GenerateVideoParams): Promise<{
  videoUrl: string;
  mimeType: string;
}> {
  const ai = createClient();

  const input = params.imageBase64
    ? [
        {
          type: 'image' as const,
          mime_type: params.imageMimeType || 'image/png',
          data: params.imageBase64,
        },
        {
          type: 'text' as const,
          text: params.prompt,
        },
      ]
    : params.prompt;

  const interaction = await ai.interactions.create(
    {
      model: 'gemini-omni-1.2-flash',
      input,
      background: false,
      store: false,
      stream: false,
      response_format: {
        type: 'video',
        aspect_ratio: params.aspectRatio,
      },
    },
    { timeout: 300000 }
  );

  const videoPart = interaction.output_video;
  if (!videoPart) {
    throw new Error('No video output returned from gemini-omni-1.2-flash.');
  }

  const mimeType = videoPart.mime_type || 'video/mp4';
  if (videoPart.data) {
    return {
      videoUrl: `data:${mimeType};base64,${videoPart.data}`,
      mimeType,
    };
  }

  if (videoPart.uri) {
    return {
      videoUrl: videoPart.uri,
      mimeType,
    };
  }

  throw new Error('Video response did not include playable data or URI.');
}
