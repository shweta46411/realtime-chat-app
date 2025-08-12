// import { useEffect, useRef, useState } from "react";

// const API_URL = "http://localhost:8000";

// export default function OnlineList({ currentUser, onUserSelect }) {
//   const [users, setUsers] = useState([]);
//   const wsRef = useRef();
//   const heartbeat = useRef();

//   useEffect(() => {
//     if (wsRef.current) return; // avoid double connection

//     // Register online
//     fetch(`${API_URL}/presence/register`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         user_id: currentUser.user_id,
//         name: currentUser.name,
//       }),
//     });

//     const ws = new WebSocket(
//       `ws://localhost:8000/presence/ws?user_id=${currentUser.user_id}`
//     );
//     wsRef.current = ws;

//     ws.onopen = () => {
//       heartbeat.current = setInterval(() => {
//         if (ws.readyState === 1) {
//           ws.send(JSON.stringify({ type: "ping" }));
//         }
//       }, 15000);
//     };

//     ws.onmessage = (e) => {
//       const data = JSON.parse(e.data);
//       if (data.type === "presence") {
//         setUsers(data.users.filter(u => u.user_id !== currentUser.user_id));
//       }
//     };

//     ws.onclose = () => {
//       clearInterval(heartbeat.current);
//       wsRef.current = null;
//     };

//     const handleUnload = () => {
//       ws.close();
//       fetch(`${API_URL}/presence/logout`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           user_id: currentUser.user_id,
//           name: currentUser.name,
//         }),
//       });
//     };

//     window.addEventListener("beforeunload", handleUnload);

//     return () => {
//       window.removeEventListener("beforeunload", handleUnload);
//       clearInterval(heartbeat.current);
//       ws?.close();
//       wsRef.current = null;
//     };
//   }, [currentUser.user_id]);

//   return (
//     <div className="w-60 border-r p-4 bg-gray-50">
//       <div className="flex justify-between items-center mb-3">
//         <h3 className="font-medium">Online</h3>
//         <span className="text-sm text-gray-500">({users.length})</span>
//       </div>

//       {users.length === 0 ? (
//         <p className="text-gray-500 text-sm">Nobody online</p>
//       ) : (
//         <div className="space-y-1">
//           {users.map(user => (
//             <div
//               key={user.user_id}
//               onClick={() => onUserSelect?.(user)}
//               className="p-2 rounded hover:bg-white cursor-pointer"
//             >
//               <div className="flex items-center gap-2">
//                 <div className="w-2 h-2 bg-green-500 rounded-full" />
//                 <span className="text-sm">{user.name}</span>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }
import { useEffect, useRef, useState } from "react";

// Move to environment variables in production
const API_BASE = "http://localhost:8000";
const HEARTBEAT_INTERVAL = 30000; // 30s - more reasonable than 15s
const RECONNECT_DELAY = 3000; // 3s delay before reconnection attempt

export default function OnlineList({
  currentUser,
  onUserSelect,
  onPresenceUpdate,
  unreadCounts = {},
  selectedId,
}) {
  const [users, setUsers] = useState([]);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const websocketRef = useRef(null);
  const heartbeatTimer = useRef(null);
  const reconnectTimer = useRef(null);

  useEffect(() => {
    // Prevent duplicate connections in StrictMode
    if (websocketRef.current?.readyState === WebSocket.CONNECTING || 
        websocketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    initializePresence();
    
    return cleanup;
  }, [currentUser.user_id, currentUser.name]);

  const initializePresence = async () => {
    try {
      await registerUserPresence();
      connectToPresenceSocket();
    } catch (error) {
      console.error('Failed to initialize presence:', error);
      setConnectionState('error');
      scheduleReconnect();
    }
  };

  const registerUserPresence = async () => {
    const response = await fetch(`${API_BASE}/presence/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: currentUser.user_id,
        name: currentUser.name,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Registration failed: ${response.status}`);
    }
  };

  const connectToPresenceSocket = () => {
    setConnectionState('connecting');
    
    const wsUrl = `ws://localhost:8000/presence/ws?user_id=${encodeURIComponent(currentUser.user_id)}`;
    const socket = new WebSocket(wsUrl);
    websocketRef.current = socket;

    socket.onopen = handleSocketOpen;
    socket.onmessage = handleSocketMessage;
    socket.onclose = handleSocketClose;
    socket.onerror = handleSocketError;
  };

  const handleSocketOpen = () => {
    setConnectionState('connected');
    setReconnectAttempts(0);
    startHeartbeat();
  };

  const handleSocketMessage = (event) => {
    try {
      const presenceMessage = JSON.parse(event.data);
      
      if (presenceMessage.type === "presence") {
        const otherUsers = presenceMessage.users.filter(
          user => user.user_id !== currentUser.user_id
        );
        setUsers(otherUsers);
        
        if (onPresenceUpdate) {
          onPresenceUpdate(otherUsers);
        }
      }
    } catch (error) {
      console.warn('Failed to parse presence message:', error);
    }
  };

  const handleSocketClose = (event) => {
    setConnectionState('disconnected');
    stopHeartbeat();
    
    // Only attempt reconnection if it wasn't a clean close
    if (event.code !== 1000 && reconnectAttempts < 5) {
      scheduleReconnect();
    }
  };

  const handleSocketError = (error) => {
    console.error('WebSocket error:', error);
    setConnectionState('error');
  };

  const startHeartbeat = () => {
    heartbeatTimer.current = setInterval(() => {
      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, HEARTBEAT_INTERVAL);
  };

  const stopHeartbeat = () => {
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimer.current) return;
    
    setReconnectAttempts(prev => prev + 1);
    
    reconnectTimer.current = setTimeout(() => {
      reconnectTimer.current = null;
      initializePresence();
    }, RECONNECT_DELAY);
  };

  const cleanup = () => {
    // Clear timers
    stopHeartbeat();
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }

    // Graceful logout
    if (websocketRef.current) {
      logoutUser();
      websocketRef.current.close(1000, 'Component unmounting');
      websocketRef.current = null;
    }

    // Remove event listeners
    window.removeEventListener("beforeunload", handleBeforeUnload);
  };

  const logoutUser = async () => {
    try {
      await fetch(`${API_BASE}/presence/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          user_id: currentUser.user_id,
          name: currentUser.name,
        }),
      });
    } catch (error) {
      // Log but don't throw - this is cleanup
      console.warn('Failed to logout user:', error);
    }
  };

  const handleBeforeUnload = () => {
    logoutUser();
  };

  // Add beforeunload listener
  useEffect(() => {
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [currentUser.user_id, currentUser.name]);

  const getInitials = (name) => {
    if (!name?.trim()) return "?";
    
    return name
      .trim()
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getConnectionMessage = () => {
    switch (connectionState) {
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return `Connection error (retrying ${reconnectAttempts}/5)`;
      case 'disconnected':
        return 'Disconnected';
      default:
        return users.length === 0 ? 'Nobody else online' : null;
    }
  };

  const handleUserClick = (user) => {
    if (onUserSelect && connectionState === 'connected') {
      onUserSelect(user);
    }
  };

  return (
    <aside className="w-72 border-l bg-gray-50/60 p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-800">Online</h3>
          {/* Connection status indicator */}
          <div className={`w-2 h-2 rounded-full ${
            connectionState === 'connected' ? 'bg-green-500' :
            connectionState === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            'bg-red-500'
          }`} />
        </div>
        <span className="text-xs text-gray-500">({users.length})</span>
      </div>

      {connectionState !== 'connected' ? (
        <p className="text-gray-500 text-sm">{getConnectionMessage()}</p>
      ) : users.length === 0 ? (
        <p className="text-gray-500 text-sm">Nobody else online</p>
      ) : (
        <div className="space-y-2">
          {users.map((user) => {
            const isSelected = selectedId === user.user_id;
            const unreadCount = unreadCounts[user.user_id] || 0;

            return (
              <button
                key={user.user_id}
                onClick={() => handleUserClick(user)}
                disabled={connectionState !== 'connected'}
                className={`w-full flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all duration-200 ${
                  isSelected
                    ? "bg-white border-blue-200 shadow-sm ring-1 ring-blue-100"
                    : "bg-white/70 hover:bg-white border-transparent hover:shadow-sm"
                } ${connectionState !== 'connected' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-medium">
                      {getInitials(user.name)}
                    </div>
                    <span className="absolute -bottom-0 -right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {user.name}
                    </div>
                    <div className="text-xs text-gray-400 font-mono truncate">
                      {user.user_id}
                    </div>
                  </div>
                </div>

                {unreadCount > 0 && (
                  <span className="shrink-0 inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-blue-600 text-white text-xs font-medium">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </aside>
  );
}