import FileUploadSection from "./components/FileUploadSection";
import RagChatScreen from "./components/RagChatScreen";

function App() {
  return (
    <>
      <div className="flex w-full max-h-screen min-h-screen">
        <FileUploadSection />
        <RagChatScreen />
      </div>
    </>
  );
}

export default App;
