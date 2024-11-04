import { validateContent } from './validation';
// ... rest of the imports

private async processRequestWithRetry(
  request: ContentRequest,
  retryCount = 0
): Promise<void> {
  try {
    const content = await generateContent(request);
    
    if (content) {
      const parsedContent = JSON.parse(content);
      
      // Validate generated content
      const validationResult = await validateContent(request.type, parsedContent);
      
      if (!validationResult.isValid) {
        if (retryCount < MAX_RETRIES) {
          console.warn(
            `Content validation failed for ${request.type}. Retrying... `,
            validationResult.errors
          );
          const delay = RETRY_DELAY * Math.pow(2, retryCount);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.processRequestWithRetry(request, retryCount + 1);
        }
        
        throw new ValidationError(
          `Content validation failed after ${MAX_RETRIES} attempts: ${
            validationResult.errors?.join(', ')
          }`
        );
      }

      contentCache.set({
        id: `${request.type}-${request.locale}-${Date.now()}`,
        type: request.type,
        locale: request.locale,
        content: parsedContent,
        metadata: parsedContent.metadata,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
    }
  } catch (error) {
    if (error instanceof ValidationError || !error.retryable || retryCount >= MAX_RETRIES) {
      throw error;
    }

    const delay = RETRY_DELAY * Math.pow(2, retryCount);
    await new Promise(resolve => setTimeout(resolve, delay));
    return this.processRequestWithRetry(request, retryCount + 1);
  }
}