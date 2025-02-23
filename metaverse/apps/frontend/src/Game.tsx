import React, { useEffect, useRef, useState } from 'react';

const Arena = () => {
  // Add new state variables
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [playerColor, setPlayerColor] = useState('#' + Math.floor(Math.random()*16777215).toString(16));
  const [powerUps, setPowerUps] = useState<Array<{x: number, y: number, type: 'health' | 'speed' | 'shield'}>>([]);
  const gameState = 'lobby' as const;
  const [effects, setEffects] = useState<{speed?: boolean, shield?: boolean}>({});
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    x?: number;
    y?: number;
    userId?: string;
  }>({});
  const [users, setUsers] = useState(new Map());
// Removed unused params state since it's only used in useEffect

  // Initialize WebSocket connection and handle URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token') || '';
    const spaceId = urlParams.get('spaceId') || '';
// Remove setParams since it's not defined and these values are already used directly

    // Initialize WebSocket
    wsRef.current = new WebSocket('ws://localhost:3001'); // Replace with your WS_URL
    
    wsRef.current.onopen = () => {
      // Join the space once connected
      wsRef.current?.send(JSON.stringify({
        type: 'join',
        payload: {
          spaceId,
          token
        }
      }));
    };

    wsRef.current.onmessage = (event: MessageEvent) => {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleWebSocketMessage = (message: {
    type: 'space-joined' | 'user-joined' | 'movement' | 'movement-rejected' | 'user-left';
    payload: {
      spawn?: { x: number; y: number };
      userId: string;
      users?: Array<{ userId: string; x: number; y: number }>;
      x?: number;
      y?: number;
    };
  }) => {
    switch (message.type) {
      case 'space-joined': {
        setCurrentUser({
          x: message.payload.spawn?.x,
          y: message.payload.spawn?.y,
          userId: message.payload.userId
        });
        
        const userMap = new Map();
        if (message.payload.users) {
          message.payload.users.forEach((user) => {
            userMap.set(user.userId, user);
          });
          setUsers(userMap);
        }
        break;
      }

      case 'user-joined': {
        setUsers(prev => {
          const newUsers = new Map(prev);
          newUsers.set(message.payload.userId, {
            x: message.payload.x,
            y: message.payload.y,
            userId: message.payload.userId
          });
          return newUsers;
        });
        break;
      }

      case 'movement': {
        setUsers(prev => {
          const newUsers = new Map(prev);
          const user = newUsers.get(message.payload.userId);
          if (user) {
            user.x = message.payload.x;
            user.y = message.payload.y;
            newUsers.set(message.payload.userId, user);
          }
          return newUsers;
        });
        break;
      }

      case 'movement-rejected': {
        setCurrentUser(prev => ({
          ...prev,
          x: message.payload.x,
          y: message.payload.y
        }));
        break;
      }

      case 'user-left': {
        setUsers(prev => {
          const newUsers = new Map(prev);
          newUsers.delete(message.payload.userId);
          return newUsers;
        });
        break;
      }
    }
  };

  // Handle user movement
  const handleMovement = (newX: number, newY: number) => {
    if (!currentUser) return;
    
    // Send movement request
    wsRef.current?.send(JSON.stringify({
      type: 'move',
      payload: {
        x: newX,
        y: newY,
        userId: currentUser.userId
      }
    }));
  };

  // Draw the arena
  useEffect(() => {
    console.log("render")
    const canvas = canvasRef.current;
    if (!canvas) return;
    console.log("below render")
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Draw grid
if (ctx) {
  ctx.strokeStyle = '#eee';
}
    for (let i = 0; i < canvas.width; i += 50) {
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
    }
    for (let i = 0; i < canvas.height; i += 50) {
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }
    }

    console.log("before curerntusert")
    console.log(currentUser)
    // Draw current user
    if (currentUser && currentUser.x && currentUser.y && ctx) {
        console.log("drawing myself")
        console.log(currentUser)
      ctx.beginPath();
      ctx.fillStyle = '#FF6B6B';
      ctx.arc(currentUser.x * 50, currentUser.y * 50, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('You', currentUser.x * 50, currentUser.y * 50 + 40);
    }

    // Draw other users
    users.forEach(user => {
    if (!user.x) {
        return
    }
    console.log("drawing other user")
    console.log(user)
      if (ctx) {
        ctx.beginPath();
        ctx.fillStyle = '#4ECDC4';
        ctx.arc(user.x * 50, user.y * 50, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`User ${user.userId}`, user.x * 50, user.y * 50 + 40);
      }
    });
  }, [currentUser, users]);

  const handleKeyDown = (e: KeyboardEvent) => {  // Added proper event type
    if (!currentUser?.x || !currentUser?.y) return;  // Better null check

    const { x, y } = currentUser;
    switch (e.key) {
      case 'ArrowUp':
        handleMove(x, y - 1);
        break;
      case 'ArrowDown':
        handleMove(x, y + 1);
        break;
      case 'ArrowLeft':
        handleMove(x - 1, y);
        break;
      case 'ArrowRight':
        handleMove(x + 1, y);
        break;
    }
  };

  // Add power-up spawning
  useEffect(() => {
if (gameState === 'lobby') return;
    
    const spawnPowerUp = () => {
      const types: Array<'health' | 'speed' | 'shield'> = ['health', 'speed', 'shield'];
      setPowerUps(prev => [...prev, {
        x: Math.floor(Math.random() * 40),
        y: Math.floor(Math.random() * 40),
        type: types[Math.floor(Math.random() * types.length)]
      }]);
    };

    const interval = setInterval(spawnPowerUp, 10000);
    return () => clearInterval(interval);
  }, [gameState]);

  // Modify draw function
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw animated grid
    const time = Date.now() * 0.001;
    ctx.strokeStyle = '#ffffff15';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < canvas.width; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i + Math.sin(time + i * 0.01) * 2, 0);
      ctx.lineTo(i + Math.sin(time + i * 0.01) * 2, canvas.height);
      ctx.stroke();
    }

    // Draw power-ups with effects
    powerUps.forEach(powerUp => {
      ctx.beginPath();
      ctx.shadowBlur = 15;
      ctx.shadowColor = powerUp.type === 'health' ? '#ff4444' : 
                       powerUp.type === 'speed' ? '#44ff44' : '#4444ff';
      ctx.fillStyle = ctx.shadowColor;
      ctx.arc(powerUp.x * 50, powerUp.y * 50, 15, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw power-up icon
      ctx.fillStyle = '#fff';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        powerUp.type === 'health' ? '❤️' : 
        powerUp.type === 'speed' ? '⚡' : '🛡️',
        powerUp.x * 50,
        powerUp.y * 50 + 7
      );
    });

    // Draw current user with effects
    if (currentUser?.x && currentUser?.y) {
      ctx.shadowBlur = effects.shield ? 20 : 10;
      ctx.shadowColor = playerColor;
      
      // Shield effect
      if (effects.shield) {
        ctx.beginPath();
        ctx.strokeStyle = '#4444ff55';
        ctx.lineWidth = 3;
        ctx.arc(currentUser.x * 50, currentUser.y * 50, 25, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Player
      ctx.beginPath();
      ctx.fillStyle = playerColor;
      ctx.arc(currentUser.x * 50, currentUser.y * 50, 20, 0, Math.PI * 2);
      ctx.fill();

      // Health bar
      const healthWidth = 40;
      ctx.fillStyle = '#ff000044';
      ctx.fillRect(currentUser.x * 50 - healthWidth/2, currentUser.y * 50 - 30, healthWidth, 5);
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(currentUser.x * 50 - healthWidth/2, currentUser.y * 50 - 30, healthWidth * (health/100), 5);

      // Name and score
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(`You (${score})`, currentUser.x * 50, currentUser.y * 50 + 40);
    }
  }, [currentUser, users, powerUps, playerColor, health, score, effects]);

  // Modify movement handler
  const handleMove = (newX: number, newY: number) => {
    if (!currentUser?.userId) return;
    
    // Check for power-up collection
    powerUps.forEach((powerUp, index) => {
      if (powerUp.x === newX && powerUp.y === newY) {
        setPowerUps(prev => prev.filter((_, i) => i !== index));
        
        switch (powerUp.type) {
          case 'health':
            setHealth(prev => Math.min(prev + 25, 100));
            break;
          case 'speed':
            setEffects(prev => ({ ...prev, speed: true }));
            setTimeout(() => setEffects(prev => ({ ...prev, speed: false })), 5000);
            break;
          case 'shield':
            setEffects(prev => ({ ...prev, shield: true }));
            setTimeout(() => setEffects(prev => ({ ...prev, shield: false })), 8000);
            break;
        }
        
        setScore(prev => prev + 50);
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4" 
         onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => handleKeyDown(e as unknown as KeyboardEvent)} 
         tabIndex={0}>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-white">Cosmic Arena</h1>
          <div className="flex gap-4 items-center">
            <div className="bg-gray-800 p-3 rounded-lg">
              <p className="text-xl text-white">Score: {score}</p>
              <p className="text-sm text-gray-400">Players: {users.size + 1}</p>
            </div>
            <div className="bg-gray-800 p-3 rounded-lg flex items-center gap-2">
              <div className="w-32 h-4 bg-red-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all duration-300"
                  style={{ width: `${health}%` }}
                />
              </div>
              <span className="text-white">{health}%</span>
            </div>
            <input 
              type="color" 
              value={playerColor}
              onChange={(e) => setPlayerColor(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer"
            />
          </div>
        </div>
        
        <div className="relative border-2 border-gray-800 rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            width={2000}
            height={2000}
            className="bg-gray-900"
          />
        </div>
        
        <div className="mt-4 flex justify-center gap-4">
          <div className="flex items-center gap-2 text-gray-400">
            <span>⚡Speed Boost: {effects.speed ? 'Active' : 'Ready'}</span>
            <span>🛡️Shield: {effects.shield ? 'Active' : 'Ready'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Arena;