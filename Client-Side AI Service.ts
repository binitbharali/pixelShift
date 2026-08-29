/**
 * PixelShift AI Client Service
 * Calls server-side Gemini endpoints to analyze images and run generative transforms.
 */

export interface AIAnalysisResult {
  suggestedFileName: string;
  altText: string;
  recommendedFormat: 'png' | 'jpeg' | 'webp' | 'svg' | 'avif';
  formatReason: string;
  tags: string[];
  dominantColors?: string[];
}

/**
 * Helper to convert any image URL or Blob URL into a Base64 data string.
 */
export async function urlToBase64(url: string): Promise<string> {
  if (url.startsWith('data:')) {
    return url;
  }
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Requests multimodal AI inspection for smart metadata, naming, and format recommendations.
 */
export async function analyzeImageWithAI(
  imageSrc: string,
  mimeType: string = 'image/png'
): Promise<AIAnalysisResult> {
  const base64 = await urlToBase64(imageSrc);

  const response = await fetch('/api/ai/analyze-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: base64,
      mimeType,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.details || data.error || 'Failed to analyze image with AI');
  }

  return data.data as AIAnalysisResult;
}

/**
 * Requests generative AI image edits (e.g. background removal prompt, lighting adjustment).
 */
export async function editImageWithAI(
  imageSrc: string,
  prompt: string,
  mimeType: string = 'image/png'
): Promise<{ imageUrl: string; text?: string }> {
  const base64 = await urlToBase64(imageSrc);

  const response = await fetch('/api/ai/edit-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: base64,
      prompt,
      mimeType,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.details || data.error || 'Failed to edit image with AI');
  }

  return {
    imageUrl: data.imageUrl,
    text: data.text,
  };
}