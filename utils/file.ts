
/**
 * Opens a PDF URL in a new tab.
 * Uses a blob URL to bypass 'Content-Disposition: attachment' headers
 * that would otherwise force a download.
 */
export const viewPdf = async (url: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    
    // Create a blob URL with the correct MIME type
    const pdfBlob = new Blob([blob], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(pdfBlob);
    
    // Open in new tab
    const newWindow = window.open(blobUrl, '_blank');
    
    // Cleanup the blob URL after the window is opened
    if (newWindow) {
      // We don't want to revoke it too soon, otherwise the PDF might not load
      // But we should eventually cleanup. 
      // Most browsers handle this well if we just let it be, 
      // or we can try to revoke it on window unload if we had control.
    }
  } catch (error) {
    console.error('Error viewing PDF:', error);
    // Fallback to direct window.open if fetch fails (e.g. CORS)
    window.open(url, '_blank');
  }
};
