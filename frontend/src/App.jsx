// // import { useEffect, useMemo, useRef, useState } from "react";
// // import OnlineList from "./components/OnlineList";

// // function ensureUser() {
// //   let uid = localStorage.getItem("uid");
// //   if (!uid) {
// //     uid = crypto.randomUUID();
// //     localStorage.setItem("uid", uid);
// //   }
// //   let name = localStorage.getItem("name");
// //   if (!name) {
// //     const num = Math.floor(1000 + Math.random() * 9000);
// //     name = `User${num}`;
// //     localStorage.setItem("name", name);
// //   }
// //   return { user_id: uid, name };
// // }

// // export default function App() {
// //   // Current user (persisted via localStorage)
// //   const currentUser = useMemo(() => ensureUser(), []);

// //   const [selectedUser, setSelectedUser] = useState(null);
// //   const [allMessages, setAllMessages] = useState([]);
// //   const [messageInput, setMessageInput] = useState("");
// //   const [chatStatus, setChatStatus] = useState("disconnected");

// //   const chatSocket = useRef(null);
// //   const messagesContainer = useRef(null);

// //   // Chat WebSocket (StrictMode-safe)
// //   useEffect(() => {
// //     // Prevent duplicate sockets in React StrictMode (dev)
// //     if (chatSocket.current) return;

// //     const url = `ws://localhost:8000/ws/chat?me=${encodeURIComponent(
// //       currentUser.user_id
// //     )}`;
// //     const socket = new WebSocket(url);
// //     chatSocket.current = socket;

// //     socket.onopen = () => {
// //       setChatStatus("connected");
// //       console.log("chat: connected");
// //     };

// //     socket.onmessage = (event) => {
// //       try {
// //         const data = JSON.parse(event.data);
// //         if (data.type === "dm") {
// //           setAllMessages((prev) => [
// //             ...prev,
// //             {
// //               from: data.from,
// //               to: data.to,
// //               text: data.text,
// //               timestamp: data.timestamp ?? Date.now(),
// //             },
// //           ]);
// //         } else if (data.type === "error") {
// //           console.warn("chat error:", data);
// //         } else if (data.type === "info") {
// //           console.info("chat info:", data);
// //         }
// //       } catch (e) {
// //         console.warn("chat parse error:", e);
// //       }
// //     };

// //     socket.onclose = () => {
// //       if (chatSocket.current === socket) {
// //         setChatStatus("disconnected");
// //         chatSocket.current = null;
// //       }
// //       console.log("chat: disconnected");
// //     };

// //     socket.onerror = (err) => console.log("chat: error", err);

// //     // Cleanup only the socket created by THIS effect run
// //     return () => {
// //       if (chatSocket.current === socket) {
// //         try {
// //           socket.close();
// //         } catch {}
// //         chatSocket.current = null;
// //       }
// //     };
// //   }, [currentUser.user_id]);

// //   // Auto-scroll to latest message
// //   useEffect(() => {
// //     if (messagesContainer.current) {
// //       messagesContainer.current.scrollTop =
// //         messagesContainer.current.scrollHeight;
// //     }
// //   }, [allMessages, selectedUser]);

// //   const sendMessage = () => {
// //     if (!selectedUser || !messageInput.trim() || !chatSocket.current) return;

// //     // Ensure socket is actually open (prevents first-send drop)
// //     if (chatSocket.current.readyState !== WebSocket.OPEN) {
// //       console.warn("Chat socket not open yet; try again in a moment.");
// //       return;
// //     }

// //     const payload = {
// //       type: "dm",
// //       to: selectedUser.user_id,
// //       text: messageInput.trim(),
// //     };
// //     chatSocket.current.send(JSON.stringify(payload));
// //     setMessageInput(""); // rely on server echo to append locally
// //   };

// //   const handleKeyDown = (e) => {
// //     if (e.key === "Enter") sendMessage();
// //   };

// //   // Messages for the active conversation
// //   const conversationMessages = selectedUser
// //     ? allMessages.filter(
// //         (m) =>
// //           (m.from === currentUser.user_id && m.to === selectedUser.user_id) ||
// //           (m.from === selectedUser.user_id && m.to === currentUser.user_id)
// //       )
// //     : [];

// //   return (
// //     <div className="min-h-screen bg-gray-50">
// //       <header className="bg-white border-b">
// //         <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
// //           <h1 className="text-xl font-semibold">Real-time Chat</h1>
// //           <div className="flex items-center gap-2 text-sm text-gray-600">
// //             <span
// //               className={`inline-block w-2 h-2 rounded-full ${
// //                 chatStatus === "connected" ? "bg-green-500" : "bg-red-500"
// //               }`}
// //               title={`Chat socket: ${chatStatus}`}
// //             />
// //             <span>
// //               {currentUser.name}{" "}
// //               <span className="text-gray-400">({currentUser.user_id})</span>
// //             </span>
// //           </div>
// //         </div>
// //       </header>

// //       <main className="max-w-6xl mx-auto p-4">
// //         <div className="flex h-[75vh] bg-white rounded-lg shadow border overflow-hidden">
// //           {/* Online users */}
// //           <OnlineList
// //             currentUser={currentUser}
// //             onUserSelect={(user) => {
// //               console.log("selected:", user.name);
// //               setSelectedUser(user);
// //             }}
// //           />

// //           {/* Chat panel */}
// //           <div className="flex-1 flex flex-col">
// //             {/* Chat header */}
// //             <div className="p-4 border-b bg-gray-50">
// //               {selectedUser ? (
// //                 <div>
// //                   <div className="font-medium">
// //                     Chatting with {selectedUser.name}
// //                   </div>
// //                   <div className="text-xs text-gray-500 font-mono">
// //                     {selectedUser.user_id}
// //                   </div>
// //                 </div>
// //               ) : (
// //                 <div className="text-gray-500">
// //                   Choose someone from the online list to start chatting
// //                 </div>
// //               )}
// //             </div>

// //             {/* Messages */}
// //             <div
// //               ref={messagesContainer}
// //               className="flex-1 p-4 overflow-y-auto bg-white"
// //             >
// //               {!selectedUser ? (
// //                 <div className="h-full flex items-center justify-center text-gray-400">
// //                   Select a user to start messaging
// //                 </div>
// //               ) : conversationMessages.length === 0 ? (
// //                 <div className="text-gray-400">
// //                   No messages yet. Start the conversation!
// //                 </div>
// //               ) : (
// //                 <div className="space-y-3">
// //                   {conversationMessages.map((msg, idx) => {
// //                     const mine = msg.from === currentUser.user_id;
// //                     return (
// //                       <div
// //                         key={idx}
// //                         className={`flex ${mine ? "justify-end" : "justify-start"}`}
// //                       >
// //                         <div
// //                           className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
// //                             mine
// //                               ? "bg-blue-500 text-white"
// //                               : "bg-gray-100 text-gray-800 border"
// //                           }`}
// //                         >
// //                           {msg.text}
// //                         </div>
// //                       </div>
// //                     );
// //                   })}
// //                 </div>
// //               )}
// //             </div>

// //             {/* Composer */}
// //             <div className="p-4 border-t bg-gray-50">
// //               <div className="flex gap-2">
// //                 <input
// //                   type="text"
// //                   value={messageInput}
// //                   onChange={(e) => setMessageInput(e.target.value)}
// //                   onKeyDown={handleKeyDown}
// //                   placeholder={
// //                     selectedUser ? "Type your message..." : "Select someone to chat"
// //                   }
// //                   disabled={!selectedUser || chatStatus !== "connected"}
// //                   className="flex-1 px-3 py-2 border rounded focus:outline-none focus:border-blue-400 disabled:bg-gray-100"
// //                 />
// //                 <button
// //                   onClick={sendMessage}
// //                   disabled={
// //                     !selectedUser ||
// //                     !messageInput.trim() ||
// //                     chatStatus !== "connected"
// //                   }
// //                   className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
// //                 >
// //                   Send
// //                 </button>
// //               </div>
// //             </div>
// //           </div>
// //         </div>
// //       </main>
// //     </div>
// //   );
// // }
// import { useEffect, useMemo, useRef, useState } from "react";
// import OnlineList from "./components/OnlineList";

// function getOrCreateUser() {
//   let uid = localStorage.getItem("uid");
//   if (!uid) {
//     uid = crypto.randomUUID();
//     localStorage.setItem("uid", uid);
//   }
//   let name = localStorage.getItem("name");
//   if (!name) {
//     name = `User${Math.floor(1000 + Math.random() * 9000)}`;
//     localStorage.setItem("name", name);
//   }
//   return { user_id: uid, name };
// }

// export default function App() {
//   const me = useMemo(() => getOrCreateUser(), []);
//   const [activeChat, setActiveChat] = useState(null);
//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState("");
//   const [connected, setConnected] = useState(false);
  
//   const socket = useRef();
//   const msgArea = useRef();

//   useEffect(() => {
//     if (socket.current) return;

//     const ws = new WebSocket(`ws://localhost:8000/ws/chat?me=${me.user_id}`);
//     socket.current = ws;

//     ws.onopen = () => setConnected(true);

//     ws.onmessage = (e) => {
//       const msg = JSON.parse(e.data);
//       if (msg.type === "dm") {
//         setMessages(prev => [...prev, {
//           from: msg.from,
//           to: msg.to,
//           text: msg.text,
//           ts: msg.timestamp || Date.now()
//         }]);
//       }
//     };

//     ws.onclose = () => {
//       setConnected(false);
//       socket.current = null;
//     };

//     return () => {
//       ws?.close();
//       socket.current = null;
//     };
//   }, [me.user_id]);

//   useEffect(() => {
//     if (msgArea.current) {
//       msgArea.current.scrollTop = msgArea.current.scrollHeight;
//     }
//   }, [messages]);

//   const sendMsg = () => {
//     if (!activeChat || !input.trim() || !socket.current) return;
    
//     socket.current.send(JSON.stringify({
//       type: "dm",
//       to: activeChat.user_id,
//       text: input.trim()
//     }));
//     setInput("");
//   };

//   const chatMessages = activeChat 
//     ? messages.filter(m => 
//         (m.from === me.user_id && m.to === activeChat.user_id) ||
//         (m.from === activeChat.user_id && m.to === me.user_id)
//       )
//     : [];

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <header className="bg-white border-b px-4 py-3">
//         <div className="max-w-6xl mx-auto flex justify-between items-center">
//           <h1 className="text-xl font-semibold">Chat</h1>
//           <div className="flex items-center gap-2 text-sm">
//             <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
//             {me.name}
//           </div>
//         </div>
//       </header>

//       <main className="max-w-6xl mx-auto p-4">
//         <div className="flex h-[75vh] bg-white rounded-lg shadow overflow-hidden">
//           <OnlineList currentUser={me} onUserSelect={setActiveChat} />

//           <div className="flex-1 flex flex-col">
//             <div className="p-4 border-b bg-gray-50">
//               {activeChat ? (
//                 <div className="font-medium">{activeChat.name}</div>
//               ) : (
//                 <div className="text-gray-500">Select someone to chat</div>
//               )}
//             </div>

//             <div ref={msgArea} className="flex-1 p-4 overflow-y-auto">
//               {!activeChat ? (
//                 <div className="h-full flex items-center justify-center text-gray-400">
//                   Pick someone to message
//                 </div>
//               ) : chatMessages.length === 0 ? (
//                 <div className="text-gray-400">Start chatting!</div>
//               ) : (
//                 <div className="space-y-3">
//                   {chatMessages.map((msg, i) => (
//                     <div key={i} className={`flex ${msg.from === me.user_id ? 'justify-end' : 'justify-start'}`}>
//                       <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
//                         msg.from === me.user_id
//                           ? 'bg-blue-500 text-white'
//                           : 'bg-gray-100 border'
//                       }`}>
//                         {msg.text}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>

//             <div className="p-4 border-t flex gap-2">
//               <input
//                 value={input}
//                 onChange={e => setInput(e.target.value)}
//                 onKeyDown={e => e.key === 'Enter' && sendMsg()}
//                 placeholder={activeChat ? "Message..." : "Select someone first"}
//                 disabled={!activeChat || !connected}
//                 className="flex-1 px-3 py-2 border rounded focus:outline-none focus:border-blue-400 disabled:bg-gray-100"
//               />
//               <button
//                 onClick={sendMsg}
//                 disabled={!activeChat || !input.trim() || !connected}
//                 className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
//               >
//                 Send
//               </button>
//             </div>
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// }
import { useEffect, useMemo, useRef, useState } from "react";
import OnlineList from "./components/OnlineList";

function generateUser() {
  let userId = localStorage.getItem("user_id");
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem("user_id", userId);
  }
  
  let userName = localStorage.getItem("user_name");
  if (!userName) {
    // random number for username
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    userName = `User${randomNum}`;
    localStorage.setItem("user_name", userName);
  }
  
  return { user_id: userId, name: userName };
}

export default function App() {
  const user = useMemo(() => generateUser(), []);

  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [userNames, setUserNames] = useState({});
  const [unreadMessages, setUnreadMessages] = useState({}); // track unread per user
  
  const socketRef = useRef(null);
  const messageContainer = useRef(null);

  // setup chat websocket connection
  useEffect(() => {
    if (socketRef.current) return; // prevent double connection in dev mode

    console.log("Connecting to chat server...");
    const wsUrl = `ws://localhost:8000/ws/chat?me=${encodeURIComponent(user.user_id)}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("Chat connected successfully");
      setConnectionStatus("connected");
    };

    ws.onmessage = (event) => {
      try {
        const messageData = JSON.parse(event.data);
        console.log("Incoming message:", messageData);
        
        if (messageData.type === "dm") {
          // add new message to list
          const newMessage = {
            from: messageData.from,
            to: messageData.to,
            text: messageData.text,
            timestamp: messageData.timestamp || Date.now(),
          };
          setMessages(prev => [...prev, newMessage]);

          // update unread count if not currently viewing this conversation
          const senderId = messageData.from === user.user_id ? messageData.to : messageData.from;
          setUnreadMessages(prev => {
            if (activeUser && activeUser.user_id === senderId) {
              return prev; // don't increment if we're viewing this chat
            }
            return { ...prev, [senderId]: (prev[senderId] || 0) + 1 };
          });

          // auto-open first conversation (commented out for now)
          // if (!activeUser) {
          //   const senderName = userNames[senderId] || senderId;
          //   setActiveUser({ user_id: senderId, name: senderName });
          // }
        } else if (messageData.type === "error") {
          console.error("Chat error received:", messageData);
        } else if (messageData.type === "info") {
          console.log("Chat info:", messageData);
        }
      } catch (error) {
        console.warn("Failed to parse websocket message:", error);
      }
    };

    ws.onclose = () => {
      console.log("Chat connection closed");
      if (socketRef.current === ws) {
        setConnectionStatus("disconnected");
        socketRef.current = null;
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    // cleanup function
    return () => {
      console.log("Cleaning up websocket connection");
      if (socketRef.current === ws) {
        try {
          ws.close();
        } catch (e) {
          console.log("Error closing socket:", e);
        }
        socketRef.current = null;
      }
    };
  }, [user.user_id, activeUser, userNames]);

  // scroll to bottom when new messages come in
  useEffect(() => {
    if (messageContainer.current) {
      messageContainer.current.scrollTop = messageContainer.current.scrollHeight;
    }
  }, [messages, activeUser]);

  const handleSendMessage = () => {
    if (!activeUser || !inputText.trim() || !socketRef.current) {
      console.log("Cannot send message - missing data");
      return;
    }
    
    if (socketRef.current.readyState !== WebSocket.OPEN) {
      console.log("Socket not ready, cannot send");
      return;
    }

    console.log(`Sending message to ${activeUser.name}: ${inputText}`);
    
    const messagePayload = {
      type: "dm",
      to: activeUser.user_id,
      text: inputText.trim(),
    };
    
    socketRef.current.send(JSON.stringify(messagePayload));
    setInputText(""); // clear input - server will echo back the message
  };

  const handleInputKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  // get messages for current conversation
  const currentConversation = activeUser
    ? messages.filter(msg =>
        (msg.from === user.user_id && msg.to === activeUser.user_id) ||
        (msg.from === activeUser.user_id && msg.to === user.user_id)
      )
    : [];

  // when user selects someone to chat with, clear their unread count
  const handleUserSelection = (selectedUser) => {
    console.log("Selected user for chat:", selectedUser.name);
    setActiveUser(selectedUser);
    
    // clear unread count for this user
    setUnreadMessages(prev => {
      if (!prev[selectedUser.user_id]) return prev;
      const updated = { ...prev };
      delete updated[selectedUser.user_id];
      return updated;
    });
  };

  // simple avatar generator
  const getAvatar = (name) => {
    return name?.trim()?.[0]?.toUpperCase() || "?";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* header bar */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-2xl bg-blue-500 text-white grid place-items-center font-semibold shadow-sm">
              💬
            </div>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-800">
              Real-time Chat
            </h1>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                connectionStatus === "connected" ? "bg-emerald-500" : "bg-rose-500"
              }`}
              title={`Chat status: ${connectionStatus}`}
            />
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-gray-200 grid place-items-center text-gray-700 text-xs">
                {getAvatar(user.name)}
              </div>
              <div className="hidden sm:block">
                <div className="font-medium -mb-1 leading-none">
                  {user.name}
                </div>
                <div className="text-[10px] text-gray-400 leading-none">
                  {user.user_id}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* main chat layout */}
      <main className="max-w-6xl mx-auto p-4">
        <div className="flex h-[78vh] rounded-2xl border bg-white shadow-sm overflow-hidden">
          {/* chat area */}
          <div className="flex-1 flex flex-col">
            {/* chat header */}
            <div className="p-4 border-b bg-gray-50/70">
              {activeUser ? (
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 grid place-items-center text-sm">
                    {getAvatar(activeUser.name)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">
                      {activeUser.name}
                    </div>
                    <div className="text-[11px] text-gray-400 font-mono">
                      {activeUser.user_id}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500">
                  Pick someone from the online list to start chatting
                </div>
              )}
            </div>

            {/* message display area */}
            <div
              ref={messageContainer}
              className="flex-1 p-4 space-y-3 overflow-y-auto bg-white"
            >
              {!activeUser ? (
                <div className="h-full flex items-center justify-center text-gray-400">
                  Select a user to start messaging
                </div>
              ) : currentConversation.length === 0 ? (
                <div className="text-gray-400">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                currentConversation.map((msg, index) => {
                  const isMyMessage = msg.from === user.user_id;
                  return (
                    <div
                      key={index}
                      className={`flex ${isMyMessage ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm shadow ${
                          isMyMessage
                            ? "bg-blue-500 text-white rounded-br-sm"
                            : "bg-gray-100 text-gray-800 border rounded-bl-sm"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* message input area */}
            <div className="p-3 sm:p-4 border-t bg-gray-50/70">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleInputKeyPress}
                  placeholder={
                    activeUser ? "Type your message…" : "Select someone to chat"
                  }
                  disabled={!activeUser || connectionStatus !== "connected"}
                  className="flex-1 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={
                    !activeUser || !inputText.trim() || connectionStatus !== "connected"
                  }
                  className="px-4 py-3 rounded-xl bg-blue-600 text-white shadow hover:shadow-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* online users sidebar */}
          <OnlineList
            currentUser={user}
            selectedId={activeUser?.user_id}
            unreadCounts={unreadMessages}
            onPresenceUpdate={(userList) => {
              console.log("Online users updated:", userList.length);
              setUserNames(Object.fromEntries(userList.map(u => [u.user_id, u.name])));
            }}
            onUserSelect={handleUserSelection}
          />
        </div>
      </main>
    </div>
  );
}