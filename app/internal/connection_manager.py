from fastapi import WebSocket


class SingletonMeta(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            instance = super().__call__(*args, **kwargs)
            cls._instances[cls] = instance
        return cls._instances[cls]


class ConnectionManager(metaclass=SingletonMeta):
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.nicknames: dict[WebSocket, str] = {}  # Store websocket -> nickname mapping

    async def connect(self, websocket: WebSocket, client_id: str, nickname: str = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        
        # Store nickname for this connection
        if nickname:
            self.nicknames[websocket] = nickname
            await self.broadcast(f'🎉 {nickname} joined the chat')
        else:
            await self.broadcast(f'Client {client_id} joined the chat')

    async def disconnect(self, websocket: WebSocket, client_id: str):
        nickname = self.nicknames.get(websocket, f'Client {client_id}')
        self.active_connections.remove(websocket)
        
        # Remove nickname mapping
        if websocket in self.nicknames:
            del self.nicknames[websocket]
        
        await self.broadcast(f'👋 {nickname} left the chat')

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)
    
    def is_nickname_taken(self, nickname: str) -> bool:
        """Check if nickname is already in use"""
        return nickname.lower() in [n.lower() for n in self.nicknames.values()]
    
    def get_nickname(self, websocket: WebSocket) -> str:
        """Get nickname for a websocket connection"""
        return self.nicknames.get(websocket, 'Anonymous')
