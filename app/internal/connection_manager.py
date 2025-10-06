import re
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
        self.nicknames: dict[WebSocket, str] = {}  # Maps WebSocket to nickname
        self.used_nicknames: set[str] = set()  # Track used nicknames for uniqueness

    def validate_nickname(self, nickname: str) -> tuple[bool, str]:
        """Validate nickname and return (is_valid, error_message)"""
        if not nickname:
            return False, "Nickname cannot be empty"
        
        if len(nickname) < 3:
            return False, "Nickname must be at least 3 characters"
        
        if len(nickname) > 20:
            return False, "Nickname cannot exceed 20 characters"
        
        # Only alphanumeric and underscores allowed
        if not re.match(r'^[a-zA-Z0-9_]+$', nickname):
            return False, "Nickname can only contain letters, numbers, and underscores"
        
        # Check if nickname is already taken (case-insensitive)
        if nickname.lower() in [n.lower() for n in self.used_nicknames]:
            return False, "Nickname is already taken"
        
        return True, ""

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections.append(websocket)
        # Don't broadcast join message yet - wait for nickname

    async def set_nickname(self, websocket: WebSocket, nickname: str) -> bool:
        """Set nickname for a connection. Returns True if successful."""
        is_valid, error = self.validate_nickname(nickname)
        
        if not is_valid:
            await websocket.send_text(f"NICKNAME_ERROR:{error}")
            return False
        
        self.nicknames[websocket] = nickname
        self.used_nicknames.add(nickname)
        await websocket.send_text(f"NICKNAME_ACCEPTED:{nickname}")
        await self.broadcast(f'🎉 {nickname} joined the chat')
        return True

    async def disconnect(self, websocket: WebSocket, client_id: str):
        nickname = self.nicknames.get(websocket, f"Client {client_id}")
        
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        
        if websocket in self.nicknames:
            self.used_nicknames.discard(self.nicknames[websocket])
            del self.nicknames[websocket]
        
        await self.broadcast(f'👋 {nickname} left the chat')

    def get_nickname(self, websocket: WebSocket) -> str:
        """Get nickname for a websocket connection"""
        return self.nicknames.get(websocket, "Unknown")

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)
