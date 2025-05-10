/**
 * Utilities for handling video URLs across the application
 */

/**
 * Validates if a string is a valid YouTube URL or video ID
 * @param url The URL or video ID to validate
 * @returns boolean indicating if the URL is valid
 */
export const isValidYoutubeUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Check if it's a YouTube URL
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  
  // Check if it's just a video ID (11 characters)
  const videoIdRegex = /^[a-zA-Z0-9_-]{11}$/;
  
  return youtubeRegex.test(url) || videoIdRegex.test(url);
};

/**
 * Converts a YouTube URL to the embed format
 * @param url The YouTube URL to convert
 * @returns The properly formatted embed URL
 */
export const formatYoutubeUrl = (url: string): string => {
  if (!url) return '';
  
  try {
    // Check if it's already an embed URL
    if (url.includes('youtube.com/embed/')) {
      return url;
    }
    
    // Extract video ID using regex for multiple YouTube URL formats
    let videoId = '';
    
    // Handle youtube.com/watch?v= URLs
    if (url.includes('youtube.com/watch')) {
      try {
        const urlObj = new URL(url);
        videoId = urlObj.searchParams.get('v') || '';
      } catch (e) {
        // If URL parsing fails, try regex extraction
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/);
        videoId = match?.[1] || '';
      }
    }
    // Handle youtu.be/ shortened URLs
    else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0]?.split('/')[0] || '';
    }
    // If it's just a video ID
    else if (url.match(/^[a-zA-Z0-9_-]{11}$/)) {
      videoId = url;
    }
    
    // If we have a video ID, create the embed URL
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    // Fallback: Try to create an embed URL even if it doesn't match known patterns
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      // Convert youtu.be/ID to youtube.com/embed/ID
      if (url.includes('youtu.be/')) {
        return url.replace('youtu.be/', 'youtube.com/embed/');
      }
      // Convert youtube.com/watch?v=ID to youtube.com/embed/ID
      return url.replace('watch?v=', 'embed/').split('&')[0];
    }
    
    return url;
  } catch (error) {
    console.error('Error formatting YouTube URL:', error);
    // If there's any error in processing, return a safe fallback
    return url;
  }
};

/**
 * Extracts the YouTube video ID from a URL
 * @param url The YouTube URL
 * @returns The video ID or empty string if not found
 */
export const extractYoutubeVideoId = (url: string): string => {
  if (!url) return '';
  
  try {
    // Handle youtube.com/watch?v= URLs
    if (url.includes('youtube.com/watch')) {
      try {
        const urlObj = new URL(url);
        return urlObj.searchParams.get('v') || '';
      } catch {
        const match = url.match(/v=([^&]+)/);
        return match?.[1] || '';
      }
    }
    
    // Handle youtu.be/ shortened URLs
    if (url.includes('youtu.be/')) {
      return url.split('youtu.be/')[1]?.split('?')[0]?.split('/')[0] || '';
    }
    
    // Handle embed URLs
    if (url.includes('youtube.com/embed/')) {
      return url.split('youtube.com/embed/')[1]?.split('?')[0]?.split('/')[0] || '';
    }
    
    // If it's just a video ID (11 characters)
    if (url.match(/^[a-zA-Z0-9_-]{11}$/)) {
      return url;
    }
    
    return '';
  } catch (error) {
    console.error('Error extracting YouTube video ID:', error);
    return '';
  }
};
