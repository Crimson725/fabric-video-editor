export const getFileMetadata = async (file: File) => {
  const metadata = {
    size: file.size,
    dateAdded: Date.now(),
    duration: 0
  };

  if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
    const duration = await getMediaDuration(file);
    metadata.duration = duration;
  }

  return metadata;
};

const getMediaDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const element = file.type.startsWith('video/') 
      ? document.createElement('video')
      : document.createElement('audio');
    
    element.preload = 'metadata';
    
    element.onloadedmetadata = () => {
      window.URL.revokeObjectURL(element.src);
      resolve(element.duration);
    };

    element.src = URL.createObjectURL(file);
  });
}; 