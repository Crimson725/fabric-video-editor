export type UploadButtonProps = {
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  accept: string;
};
export const UploadButton = (props: UploadButtonProps) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileNames = Array.from(files).map(file => file.name);
      // Store file names in sessionStorage
      window.sessionStorage.setItem('uploadedFileNames', JSON.stringify(fileNames));
    }
    props.onChange(event);
  };

  return (
    <label htmlFor="fileInput" className={props.className}>
      <input
        id="fileInput"
        type="file"
        accept={props.accept}
        className="hidden"
        multiple
        onChange={handleChange}
      />
      Upload
    </label>
  );
};