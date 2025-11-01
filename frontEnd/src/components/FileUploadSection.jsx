import { useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function FileUploadSection() {
  const [files, setFiles] = useState([]);
  const [fileObjects, setFileObjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (fileObjects.length === 0) {
      setUploadStatus("Please select files to upload");
      return;
    }

    setLoading(true);
    setUploadStatus("Uploading files...");

    try {
      const formData = new FormData();
      fileObjects.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadStatus(
          `✅ Successfully uploaded ${data.uploaded.length} file(s). Total documents: ${data.total_docs}`
        );
        setFiles([]);
        setFileObjects([]);
      } else {
        setUploadStatus(`❌ Upload failed: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      setUploadStatus(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileInput = (e) => {
    const uploadedFiles = Array.from(e.target.files);
    setFileObjects(uploadedFiles);
    setFiles(uploadedFiles.map((file) => file.name));
    setUploadStatus("");
  };

  return (
    <div className="w-1/2 h-screen flex flex-col items-center justify-center bg-gray-100">
      <form className="flex flex-col items-center justify-center">
        <input
          onChange={handleFileInput}
          type="file"
          name="upload"
          id="upload"
          multiple
          className="border-2 border-gray-300 p-10 rounded-lg cursor-pointer focus:outline-none focus:border-blue-500"
        />

        <div className="w-96 h-48 overflow-y-auto mt-4 p-2 border-2 border-dashed border-gray-300 rounded-lg  ">
          <p className="pl-4 text-md font-bold bg-gray-200 rounded-sm">
            Selected Files:
          </p>
          {files.length > 0 ? (
            <ul className="">
              {files.map((file, index) => (
                <li key={index} className="text-sm  border-gray-500">
                  {file}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {uploadStatus && (
          <div className="mt-4 p-3 bg-gray-100 rounded-lg text-sm max-w-md">
            {uploadStatus}
          </div>
        )}

        <div className="flex w-full mt-4 justify-evenly">
          <button
            type="reset"
            className="bg-blue-300 hover:bg-blue-400 border px-4 py-1 rounded-sm"
            onClick={() => {
              setFiles([]);
              setFileObjects([]);
              setUploadStatus("");
            }}
          >
            Reset
          </button>
          <button
            type="submit"
            className="bg-blue-300 hover:bg-blue-400 border px-4 py-1 rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? "Uploading..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default FileUploadSection;
