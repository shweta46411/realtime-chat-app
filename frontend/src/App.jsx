
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
              Incedo Quick Chat
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