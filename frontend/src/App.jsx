import { useEffect, useRef, useState } from "react";

export default function App() {
 const [status, setStatus] = useState("disconnected");
 const [messages, setMessages] = useState([]);
 const [input, setInput] = useState("");
 const socketRef = useRef(null);

 useEffect(() => {
   const socket = new WebSocket("ws://localhost:8000/ws/test");
   socketRef.current = socket;
   
   socket.onopen = () => {
     console.log("Connected to server"); // debug
     setStatus("connected");
     setMessages(prev => [...prev, "Connected to server"]);
   };
   
   socket.onmessage = (event) => {
     console.log("Received:", event.data);
     setMessages(prev => [...prev, `Received: ${event.data}`]);
   };
   
   socket.onclose = () => {
     console.log("Disconnected");
     setStatus("disconnected");
   };
   
   socket.onerror = (error) => {
     console.error("WebSocket error:", error);
     setMessages(prev => [...prev, "Connection error"]);
   };
   
   return () => socket.close();
 }, []);

 const sendMessage = () => {
   if (!socketRef.current || !input.trim()) return;
   
   console.log("Sending:", input);
   socketRef.current.send(input);
   setMessages(prev => [...prev, `Sent: ${input}`]);
   setInput("");
 };

 // enter key to send
 const handleKeyPress = (e) => {
   if (e.key === 'Enter') {
     sendMessage();
   }
 };

 return (
   <div className="p-6 max-w-4xl mx-auto">
     <h1 className="text-3xl font-bold mb-4">Real-time Chat Test</h1>
     <div className="mb-4">
       Status: <span className={status === 'connected' ? 'text-green-600' : 'text-red-600'}>
         {status}
       </span>
     </div>
     
     <div className="flex gap-3 mb-6">
       <input
         type="text"
         value={input}
         onChange={(e) => setInput(e.target.value)}
         onKeyPress={handleKeyPress}
         placeholder="Type message..."
         className="flex-1 px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
       />
       <button 
         onClick={sendMessage}
         className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
       >
         Send
       </button>
     </div>
     
     <div className="border rounded h-80 overflow-y-auto p-4 bg-gray-50">
       {messages.map((msg, index) => (
         <div key={index} className="mb-1">{msg}</div>
       ))}
     </div>
   </div>
 );
}
